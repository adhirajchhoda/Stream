// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IStablecoinPool.sol";
import "../libraries/MathLib.sol";
import "../libraries/SecurityLib.sol";

/**
 * @title StablecoinPool
 * @notice Liquidity pool for USDC/USDT with automated market making
 * @dev Manages liquidity provision, fee collection, and advance disbursement
 */
contract StablecoinPool is
    Initializable,
    UUPSUpgradeable,
    ERC20Upgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    IStablecoinPool
{
    using SafeERC20 for IERC20;
    using MathLib for uint256;
    using SecurityLib for uint256;

    // Role definitions
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant DISBURSER_ROLE = keccak256("DISBURSER_ROLE");

    // Constants
    uint256 public constant MIN_LIQUIDITY = 1000; // Minimum liquidity to prevent zero-division
    uint256 public constant MAX_UTILIZATION_RATE = 9500; // 95% maximum utilization
    uint256 public constant FEE_PRECISION = 10000; // Fee precision (100% = 10000)
    uint256 public constant YIELD_RATE = 500; // 5% annual yield rate

    // State variables
    IERC20 public immutable stablecoin;

    uint256 public totalLiquidity; // Total assets in the pool
    uint256 public totalBorrowed; // Total amount currently borrowed
    uint256 public totalFeesCollected; // Accumulated fees
    uint256 public lastYieldUpdate; // Last time yield was calculated

    mapping(address => uint256) public liquidityProviderShares;
    mapping(address => uint256) public lastDepositTime;

    uint256 public minimumLockPeriod; // Minimum time before withdrawal
    uint256 public withdrawalFee; // Fee for early withdrawal
    uint256 public performanceFee; // Fee taken from yield

    // Events
    event YieldDistributed(uint256 amount, uint256 timestamp);
    event ParametersUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(IERC20 _stablecoin) {
        stablecoin = _stablecoin;
        _disableInitializers();
    }

    /**
     * @notice Initializes the StablecoinPool contract
     * @param _name Name of the LP token
     * @param _symbol Symbol of the LP token
     * @param _admin Address of the contract admin
     * @param _minimumLockPeriod Minimum lock period for liquidity
     * @param _withdrawalFee Fee for early withdrawal (basis points)
     * @param _performanceFee Fee taken from yield (basis points)
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        address _admin,
        uint256 _minimumLockPeriod,
        uint256 _withdrawalFee,
        uint256 _performanceFee
    ) external initializer {
        require(_admin != address(0), "StablecoinPool: invalid admin");
        require(_withdrawalFee <= 1000, "StablecoinPool: withdrawal fee too high"); // Max 10%
        require(_performanceFee <= 2000, "StablecoinPool: performance fee too high"); // Max 20%

        __ERC20_init(_name, _symbol);
        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        minimumLockPeriod = _minimumLockPeriod;
        withdrawalFee = _withdrawalFee;
        performanceFee = _performanceFee;
        lastYieldUpdate = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(DISBURSER_ROLE, _admin);
    }

    /**
     * @notice Adds liquidity to the pool
     * @param amount Amount of stablecoin to add
     * @return shares Number of LP tokens minted
     */
    function addLiquidity(uint256 amount) external nonReentrant whenNotPaused returns (uint256 shares) {
        require(amount > 0, "StablecoinPool: amount must be positive");

        // Update yield before calculating shares
        _updateYield();

        // Calculate shares to mint
        uint256 currentTotalSupply = totalSupply();
        if (currentTotalSupply == 0 || totalLiquidity == 0) {
            shares = amount;
        } else {
            shares = MathLib.calculateSharesForLiquidity(amount, currentTotalSupply, totalLiquidity);
        }

        require(shares > 0, "StablecoinPool: insufficient shares");

        // Transfer tokens from user
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        totalLiquidity += amount;
        lastDepositTime[msg.sender] = block.timestamp;

        // Mint LP tokens
        _mint(msg.sender, shares);

        emit LiquidityAdded(msg.sender, amount, shares);

        return shares;
    }

    /**
     * @notice Removes liquidity from the pool
     * @param shares Number of LP tokens to burn
     * @return amount Amount of stablecoin withdrawn
     */
    function removeLiquidity(uint256 shares) external nonReentrant whenNotPaused returns (uint256 amount) {
        require(shares > 0, "StablecoinPool: shares must be positive");
        require(balanceOf(msg.sender) >= shares, "StablecoinPool: insufficient shares");

        // Update yield before calculating withdrawal
        _updateYield();

        // Calculate withdrawal amount
        amount = MathLib.calculateTokensForShares(shares, totalSupply(), totalLiquidity);
        require(amount > 0, "StablecoinPool: insufficient amount");

        // Check if early withdrawal fee applies
        uint256 finalAmount = amount;
        if (block.timestamp < lastDepositTime[msg.sender] + minimumLockPeriod) {
            uint256 fee = MathLib.percentage(amount, withdrawalFee);
            finalAmount = amount - fee;
            totalFeesCollected += fee;
        }

        // Ensure pool has enough liquidity
        uint256 availableLiquidity = getAvailableLiquidity();
        require(finalAmount <= availableLiquidity, "StablecoinPool: insufficient liquidity");

        // Update state
        totalLiquidity -= amount;

        // Burn LP tokens
        _burn(msg.sender, shares);

        // Transfer tokens to user
        stablecoin.safeTransfer(msg.sender, finalAmount);

        emit LiquidityRemoved(msg.sender, finalAmount, shares);

        return finalAmount;
    }

    /**
     * @notice Disburses an advance to a recipient
     * @param recipient Address to receive the advance
     * @param amount Amount to disburse
     * @return success True if disbursement was successful
     */
    function disburseAdvance(address recipient, uint256 amount) external onlyRole(DISBURSER_ROLE) nonReentrant returns (bool success) {
        require(recipient != address(0), "StablecoinPool: invalid recipient");
        require(amount > 0, "StablecoinPool: amount must be positive");

        // Check utilization limits
        uint256 newTotalBorrowed = totalBorrowed + amount;
        uint256 newUtilization = MathLib.calculateUtilization(newTotalBorrowed, totalLiquidity);
        require(newUtilization <= MAX_UTILIZATION_RATE.percentage(MathLib.PRECISION), "StablecoinPool: utilization too high");

        // Calculate fee
        uint256 fee = calculateFee(amount);
        uint256 netAmount = amount - fee;

        // Ensure pool has enough liquidity
        require(amount <= getAvailableLiquidity(), "StablecoinPool: insufficient liquidity");

        // Update state
        totalBorrowed += amount;
        totalFeesCollected += fee;

        // Transfer tokens
        stablecoin.safeTransfer(recipient, netAmount);

        emit AdvanceDisbursed(recipient, netAmount, fee);

        return true;
    }

    /**
     * @notice Repays an advance (callable by authorized contracts)
     * @param amount Amount to repay
     */
    function repayAdvance(uint256 amount) external onlyRole(DISBURSER_ROLE) nonReentrant {
        require(amount > 0, "StablecoinPool: amount must be positive");
        require(amount <= totalBorrowed, "StablecoinPool: repay exceeds borrowed");

        // Transfer tokens from caller
        stablecoin.safeTransferFrom(msg.sender, address(this), amount);

        // Update state
        totalBorrowed -= amount;
        totalLiquidity += amount;
    }

    /**
     * @notice Calculates the current fee for an advance
     * @param amount Amount of the advance
     * @return fee Fee amount
     */
    function calculateFee(uint256 amount) public view returns (uint256 fee) {
        uint256 utilization = getUtilizationRatio();
        uint256 feeRate = MathLib.calculateDynamicFee(utilization);
        fee = MathLib.percentage(amount, feeRate);
    }

    /**
     * @notice Gets the current pool utilization ratio
     * @return utilization Utilization ratio (scaled by 1e18)
     */
    function getUtilizationRatio() public view returns (uint256 utilization) {
        return MathLib.calculateUtilization(totalBorrowed, totalLiquidity);
    }

    /**
     * @notice Gets the total liquidity in the pool
     * @return liquidity Total liquidity amount
     */
    function getTotalLiquidity() external view returns (uint256 liquidity) {
        return totalLiquidity;
    }

    /**
     * @notice Gets the available liquidity for advances
     * @return available Available liquidity amount
     */
    function getAvailableLiquidity() public view returns (uint256 available) {
        if (totalLiquidity <= totalBorrowed) {
            return 0;
        }
        return totalLiquidity - totalBorrowed;
    }

    /**
     * @notice Gets comprehensive pool statistics
     * @return stats Array containing [totalLiquidity, totalBorrowed, totalFees, utilization, availableLiquidity]
     */
    function getPoolStats() external view returns (uint256[5] memory stats) {
        stats[0] = totalLiquidity;
        stats[1] = totalBorrowed;
        stats[2] = totalFeesCollected;
        stats[3] = getUtilizationRatio();
        stats[4] = getAvailableLiquidity();
    }

    // Admin functions

    /**
     * @notice Updates pool parameters
     * @param parameter Parameter name to update
     * @param newValue New parameter value
     */
    function updateParameter(string calldata parameter, uint256 newValue) external onlyRole(OPERATOR_ROLE) {
        bytes32 paramHash = keccak256(abi.encodePacked(parameter));
        uint256 oldValue;

        if (paramHash == keccak256("minimumLockPeriod")) {
            oldValue = minimumLockPeriod;
            minimumLockPeriod = newValue;
        } else if (paramHash == keccak256("withdrawalFee")) {
            require(newValue <= 1000, "StablecoinPool: fee too high");
            oldValue = withdrawalFee;
            withdrawalFee = newValue;
        } else if (paramHash == keccak256("performanceFee")) {
            require(newValue <= 2000, "StablecoinPool: fee too high");
            oldValue = performanceFee;
            performanceFee = newValue;
        } else {
            revert("StablecoinPool: invalid parameter");
        }

        emit ParametersUpdated(parameter, oldValue, newValue);
    }

    /**
     * @notice Distributes collected fees to liquidity providers
     */
    function distributeFees() external onlyRole(OPERATOR_ROLE) {
        require(totalFeesCollected > 0, "StablecoinPool: no fees to distribute");

        uint256 feesToDistribute = totalFeesCollected;
        uint256 performanceFeeAmount = MathLib.percentage(feesToDistribute, performanceFee);
        uint256 lpFeeAmount = feesToDistribute - performanceFeeAmount;

        // Add LP fees to total liquidity (auto-compounds)
        totalLiquidity += lpFeeAmount;

        // Transfer performance fee to treasury (admin)
        if (performanceFeeAmount > 0) {
            stablecoin.safeTransfer(getRoleMember(DEFAULT_ADMIN_ROLE, 0), performanceFeeAmount);
        }

        totalFeesCollected = 0;

        emit FeesCollected(feesToDistribute, totalFeesCollected);
    }

    /**
     * @notice Updates yield for liquidity providers
     */
    function updateYield() external onlyRole(OPERATOR_ROLE) {
        _updateYield();
    }

    /**
     * @notice Pauses the contract
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal function
     * @param token Token address to withdraw
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "StablecoinPool: invalid recipient");

        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        emit EmergencyWithdraw(token, to, amount);
    }

    // Internal functions

    /**
     * @notice Updates yield calculation
     */
    function _updateYield() internal {
        if (totalLiquidity == 0) return;

        uint256 timeElapsed = block.timestamp - lastYieldUpdate;
        if (timeElapsed == 0) return;

        // Calculate yield based on time elapsed
        uint256 yieldAmount = MathLib.calculateCompoundInterest(
            totalLiquidity,
            YIELD_RATE.percentage(MathLib.PRECISION),
            timeElapsed
        );

        if (yieldAmount > 0) {
            totalLiquidity += yieldAmount;
            lastYieldUpdate = block.timestamp;

            emit YieldDistributed(yieldAmount, block.timestamp);
        }
    }

    /**
     * @notice Authorizes upgrade (required by UUPSUpgradeable)
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        // Additional upgrade validation can be added here
    }

    /**
     * @notice Override _beforeTokenTransfer to update yield
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        _updateYield();
    }
}