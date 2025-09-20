// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IEmployerRegistry.sol";
import "../interfaces/IStreamCore.sol";
import "../libraries/SecurityLib.sol";

/**
 * @title EmployerRegistry
 * @notice Registry for employer verification and stake management
 * @dev Manages employer registration, whitelist, reputation, and stake requirements
 */
contract EmployerRegistry is
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    IEmployerRegistry
{
    using SafeERC20 for IERC20;
    using SecurityLib for uint256;

    // Role definitions
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant WHITELIST_MANAGER_ROLE = keccak256("WHITELIST_MANAGER_ROLE");
    bytes32 public constant REPUTATION_MANAGER_ROLE = keccak256("REPUTATION_MANAGER_ROLE");

    // Constants
    uint256 public constant MIN_REPUTATION_SCORE = 0;
    uint256 public constant MAX_REPUTATION_SCORE = 1000;
    uint256 public constant DEFAULT_REPUTATION_SCORE = 500;
    uint256 public constant STAKE_SLASH_PERCENTAGE = 1000; // 10% slash for violations

    // State variables
    mapping(address => EmployerInfo) public employers;
    mapping(bytes32 => address) public pubKeyHashToEmployer;
    mapping(address => uint256) public stakeLockTime;

    IERC20 public stakeToken; // Token used for staking
    IStreamCore public streamCore; // Reference to StreamCore contract

    uint256 public minStakeAmount;
    uint256 public stakeLockPeriod;
    uint256 public reputationDecayRate; // Per day decay rate
    uint256 public lastGlobalUpdate;

    address[] public employerList;
    mapping(address => uint256) public employerIndex;

    // Events
    event StakeSlashed(address indexed employer, uint256 amount, string reason);
    event StakeRestored(address indexed employer, uint256 amount);
    event ParametersUpdated(string parameter, uint256 oldValue, uint256 newValue);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the EmployerRegistry contract
     * @param _stakeToken Address of the token used for staking
     * @param _admin Address of the contract admin
     * @param _minStakeAmount Minimum stake amount required
     * @param _stakeLockPeriod Lock period for stakes in seconds
     */
    function initialize(
        address _stakeToken,
        address _admin,
        uint256 _minStakeAmount,
        uint256 _stakeLockPeriod
    ) external initializer {
        require(_stakeToken != address(0), "EmployerRegistry: invalid stake token");
        require(_admin != address(0), "EmployerRegistry: invalid admin");
        require(_minStakeAmount > 0, "EmployerRegistry: invalid min stake");

        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        stakeToken = IERC20(_stakeToken);
        minStakeAmount = _minStakeAmount;
        stakeLockPeriod = _stakeLockPeriod;
        reputationDecayRate = 1; // 1 point per day
        lastGlobalUpdate = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(WHITELIST_MANAGER_ROLE, _admin);
        _grantRole(REPUTATION_MANAGER_ROLE, _admin);
    }

    /**
     * @notice Registers a new employer
     * @param pubKeyHash Hash of the employer's public key
     * @param stakeAmount Initial stake amount
     */
    function registerEmployer(bytes32 pubKeyHash, uint256 stakeAmount) external nonReentrant whenNotPaused {
        require(pubKeyHash != bytes32(0), "EmployerRegistry: invalid pubkey hash");
        require(stakeAmount >= minStakeAmount, "EmployerRegistry: insufficient stake");
        require(!employers[msg.sender].isWhitelisted, "EmployerRegistry: already registered");
        require(pubKeyHashToEmployer[pubKeyHash] == address(0), "EmployerRegistry: pubkey already used");

        // Transfer stake tokens
        stakeToken.safeTransferFrom(msg.sender, address(this), stakeAmount);

        // Create employer record
        employers[msg.sender] = EmployerInfo({
            isWhitelisted: false, // Requires manual whitelisting
            stakeAmount: stakeAmount,
            reputationScore: DEFAULT_REPUTATION_SCORE,
            pubKeyHash: pubKeyHash,
            registrationTime: block.timestamp,
            lastActivityTime: block.timestamp
        });

        // Map pubkey hash to employer
        pubKeyHashToEmployer[pubKeyHash] = msg.sender;

        // Add to employer list
        employerIndex[msg.sender] = employerList.length;
        employerList.push(msg.sender);

        // Set stake lock time
        stakeLockTime[msg.sender] = block.timestamp + stakeLockPeriod;

        emit EmployerRegistered(msg.sender, pubKeyHash, stakeAmount);
    }

    /**
     * @notice Updates an employer's whitelist status
     * @param employer Address of the employer
     * @param whitelisted New whitelist status
     */
    function updateWhitelist(address employer, bool whitelisted) external onlyRole(WHITELIST_MANAGER_ROLE) {
        require(employer != address(0), "EmployerRegistry: invalid employer");
        require(employers[employer].registrationTime > 0, "EmployerRegistry: employer not registered");

        employers[employer].isWhitelisted = whitelisted;
        employers[employer].lastActivityTime = block.timestamp;

        // Update StreamCore if connected
        if (address(streamCore) != address(0)) {
            streamCore.updateEmployerStake(employer, whitelisted ? employers[employer].stakeAmount : 0);
        }

        emit EmployerWhitelistUpdated(employer, whitelisted);
    }

    /**
     * @notice Updates an employer's reputation score
     * @param employer Address of the employer
     * @param newScore New reputation score
     */
    function updateReputation(address employer, uint256 newScore) external onlyRole(REPUTATION_MANAGER_ROLE) {
        require(employer != address(0), "EmployerRegistry: invalid employer");
        require(employers[employer].registrationTime > 0, "EmployerRegistry: employer not registered");
        require(newScore >= MIN_REPUTATION_SCORE && newScore <= MAX_REPUTATION_SCORE, "EmployerRegistry: invalid score");

        uint256 oldScore = employers[employer].reputationScore;
        employers[employer].reputationScore = newScore;
        employers[employer].lastActivityTime = block.timestamp;

        emit ReputationUpdated(employer, newScore, oldScore);
    }

    /**
     * @notice Increases an employer's stake
     * @param additionalStake Additional stake amount
     */
    function increaseStake(uint256 additionalStake) external nonReentrant whenNotPaused {
        require(additionalStake > 0, "EmployerRegistry: invalid amount");
        require(employers[msg.sender].registrationTime > 0, "EmployerRegistry: not registered");

        // Transfer additional stake tokens
        stakeToken.safeTransferFrom(msg.sender, address(this), additionalStake);

        // Update stake amount
        uint256 oldStake = employers[msg.sender].stakeAmount;
        employers[msg.sender].stakeAmount += additionalStake;
        employers[msg.sender].lastActivityTime = block.timestamp;

        // Update StreamCore if connected and whitelisted
        if (address(streamCore) != address(0) && employers[msg.sender].isWhitelisted) {
            streamCore.updateEmployerStake(msg.sender, employers[msg.sender].stakeAmount);
        }

        emit EmployerStakeUpdated(msg.sender, employers[msg.sender].stakeAmount, oldStake);
    }

    /**
     * @notice Decreases an employer's stake
     * @param stakeReduction Amount to reduce stake by
     */
    function decreaseStake(uint256 stakeReduction) external nonReentrant whenNotPaused {
        require(stakeReduction > 0, "EmployerRegistry: invalid amount");
        require(employers[msg.sender].registrationTime > 0, "EmployerRegistry: not registered");
        require(block.timestamp >= stakeLockTime[msg.sender], "EmployerRegistry: stake still locked");

        uint256 currentStake = employers[msg.sender].stakeAmount;
        require(stakeReduction <= currentStake, "EmployerRegistry: insufficient stake");

        uint256 newStake = currentStake - stakeReduction;
        require(newStake >= minStakeAmount || newStake == 0, "EmployerRegistry: below minimum stake");

        // Update stake amount
        employers[msg.sender].stakeAmount = newStake;
        employers[msg.sender].lastActivityTime = block.timestamp;

        // If stake falls below minimum, remove from whitelist
        if (newStake < minStakeAmount) {
            employers[msg.sender].isWhitelisted = false;
        }

        // Transfer stake tokens back
        stakeToken.safeTransfer(msg.sender, stakeReduction);

        // Update StreamCore if connected
        if (address(streamCore) != address(0)) {
            streamCore.updateEmployerStake(
                msg.sender,
                employers[msg.sender].isWhitelisted ? newStake : 0
            );
        }

        emit EmployerStakeUpdated(msg.sender, newStake, currentStake);
    }

    /**
     * @notice Slashes an employer's stake for violations
     * @param employer Address of the employer
     * @param slashAmount Amount to slash
     * @param reason Reason for slashing
     */
    function slashStake(
        address employer,
        uint256 slashAmount,
        string calldata reason
    ) external onlyRole(OPERATOR_ROLE) {
        require(employer != address(0), "EmployerRegistry: invalid employer");
        require(employers[employer].registrationTime > 0, "EmployerRegistry: employer not registered");
        require(slashAmount > 0, "EmployerRegistry: invalid slash amount");

        uint256 currentStake = employers[employer].stakeAmount;
        require(slashAmount <= currentStake, "EmployerRegistry: slash exceeds stake");

        // Update stake
        uint256 newStake = currentStake - slashAmount;
        employers[employer].stakeAmount = newStake;

        // Remove from whitelist if stake falls below minimum
        if (newStake < minStakeAmount) {
            employers[employer].isWhitelisted = false;
            emit EmployerWhitelistUpdated(employer, false);
        }

        // Update reputation (significant penalty)
        uint256 reputationPenalty = (slashAmount * 100) / currentStake; // Proportional penalty
        if (employers[employer].reputationScore > reputationPenalty) {
            employers[employer].reputationScore -= reputationPenalty;
        } else {
            employers[employer].reputationScore = 0;
        }

        // Update StreamCore if connected
        if (address(streamCore) != address(0)) {
            streamCore.updateEmployerStake(
                employer,
                employers[employer].isWhitelisted ? newStake : 0
            );
        }

        emit StakeSlashed(employer, slashAmount, reason);
        emit EmployerStakeUpdated(employer, newStake, currentStake);
    }

    /**
     * @notice Gets employer information
     * @param employer Address of the employer
     * @return info Employer information struct
     */
    function getEmployerInfo(address employer) external view returns (EmployerInfo memory info) {
        return employers[employer];
    }

    /**
     * @notice Checks if an employer is whitelisted
     * @param employer Address of the employer
     * @return whitelisted True if whitelisted
     */
    function isWhitelisted(address employer) external view returns (bool whitelisted) {
        return employers[employer].isWhitelisted;
    }

    /**
     * @notice Gets an employer's reputation score
     * @param employer Address of the employer
     * @return score Reputation score
     */
    function getReputationScore(address employer) external view returns (uint256 score) {
        return _calculateCurrentReputation(employer);
    }

    /**
     * @notice Verifies an employer's public key hash
     * @param employer Address of the employer
     * @param pubKeyHash Hash to verify
     * @return valid True if the hash matches
     */
    function verifyPubKeyHash(address employer, bytes32 pubKeyHash) external view returns (bool valid) {
        return employers[employer].pubKeyHash == pubKeyHash;
    }

    /**
     * @notice Gets the total number of registered employers
     * @return count Number of employers
     */
    function getEmployerCount() external view returns (uint256 count) {
        return employerList.length;
    }

    /**
     * @notice Gets a list of whitelisted employers
     * @return whitelistedEmployers Array of whitelisted employer addresses
     */
    function getWhitelistedEmployers() external view returns (address[] memory whitelistedEmployers) {
        uint256 count = 0;

        // First pass: count whitelisted employers
        for (uint256 i = 0; i < employerList.length; i++) {
            if (employers[employerList[i]].isWhitelisted) {
                count++;
            }
        }

        // Second pass: populate array
        whitelistedEmployers = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < employerList.length; i++) {
            if (employers[employerList[i]].isWhitelisted) {
                whitelistedEmployers[index] = employerList[i];
                index++;
            }
        }
    }

    // Admin functions

    /**
     * @notice Sets the StreamCore contract reference
     * @param _streamCore Address of the StreamCore contract
     */
    function setStreamCore(address _streamCore) external onlyRole(OPERATOR_ROLE) {
        require(_streamCore != address(0), "EmployerRegistry: invalid stream core");
        streamCore = IStreamCore(_streamCore);
    }

    /**
     * @notice Updates registry parameters
     * @param parameter Parameter name
     * @param newValue New parameter value
     */
    function updateParameter(string calldata parameter, uint256 newValue) external onlyRole(OPERATOR_ROLE) {
        bytes32 paramHash = keccak256(abi.encodePacked(parameter));
        uint256 oldValue;

        if (paramHash == keccak256("minStakeAmount")) {
            require(newValue > 0, "EmployerRegistry: invalid min stake");
            oldValue = minStakeAmount;
            minStakeAmount = newValue;
        } else if (paramHash == keccak256("stakeLockPeriod")) {
            oldValue = stakeLockPeriod;
            stakeLockPeriod = newValue;
        } else if (paramHash == keccak256("reputationDecayRate")) {
            require(newValue <= 10, "EmployerRegistry: decay rate too high");
            oldValue = reputationDecayRate;
            reputationDecayRate = newValue;
        } else {
            revert("EmployerRegistry: invalid parameter");
        }

        emit ParametersUpdated(parameter, oldValue, newValue);
    }

    /**
     * @notice Batch updates reputation decay for all employers
     */
    function updateGlobalReputation() external onlyRole(OPERATOR_ROLE) {
        uint256 daysPassed = (block.timestamp - lastGlobalUpdate) / 1 days;
        if (daysPassed == 0) return;

        for (uint256 i = 0; i < employerList.length; i++) {
            address employer = employerList[i];
            uint256 decay = daysPassed * reputationDecayRate;

            if (employers[employer].reputationScore > decay) {
                employers[employer].reputationScore -= decay;
            } else {
                employers[employer].reputationScore = MIN_REPUTATION_SCORE;
            }
        }

        lastGlobalUpdate = block.timestamp;
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
        require(to != address(0), "EmployerRegistry: invalid recipient");

        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        emit EmergencyWithdraw(token, to, amount);
    }

    // Internal functions

    /**
     * @notice Calculates current reputation with decay
     * @param employer Address of the employer
     * @return currentReputation Current reputation score
     */
    function _calculateCurrentReputation(address employer) internal view returns (uint256 currentReputation) {
        if (employers[employer].registrationTime == 0) return 0;

        uint256 daysSinceLastActivity = (block.timestamp - employers[employer].lastActivityTime) / 1 days;
        uint256 decay = daysSinceLastActivity * reputationDecayRate;

        if (employers[employer].reputationScore > decay) {
            currentReputation = employers[employer].reputationScore - decay;
        } else {
            currentReputation = MIN_REPUTATION_SCORE;
        }
    }

    /**
     * @notice Authorizes upgrade (required by UUPSUpgradeable)
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        // Additional upgrade validation can be added here
    }
}