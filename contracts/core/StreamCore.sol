// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IVerifier.sol";
import "../interfaces/IStreamCore.sol";
import "../interfaces/IStablecoinPool.sol";
import "../interfaces/IEmployerRegistry.sol";
import "../libraries/SecurityLib.sol";

/**
 * @title StreamCore
 * @notice Main verification contract for Stream protocol ZKP verification
 * @dev Handles ZK proof verification, nullifier tracking, and wage disbursement
 */
contract StreamCore is
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    IStreamCore
{
    using SafeERC20 for IERC20;
    using SecurityLib for uint256[3];

    // Role definitions
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Constants
    uint256 public constant MAX_WAGE_AMOUNT = 50000 * 1e18; // $50,000 max claim
    uint256 public constant MIN_WAGE_AMOUNT = 1 * 1e18; // $1 min claim
    uint256 public constant PROOF_VALIDITY_PERIOD = 1 hours; // Proof must be used within 1 hour

    // State variables
    mapping(bytes32 => bool) public usedNullifiers;
    mapping(address => uint256) public employerStakes;
    mapping(bytes32 => uint256) public commitmentTimestamps;

    IVerifier public zkVerifier;
    IStablecoinPool public stablecoinPool;
    IEmployerRegistry public employerRegistry;

    uint256 public totalWagesClaimed;
    uint256 public totalClaims;
    uint256 public minEmployerStake;

    // Events
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event StablecoinPoolUpdated(address indexed oldPool, address indexed newPool);
    event EmployerRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event MinStakeUpdated(uint256 oldStake, uint256 newStake);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the StreamCore contract
     * @param _zkVerifier Address of the ZK verifier contract
     * @param _stablecoinPool Address of the stablecoin pool contract
     * @param _employerRegistry Address of the employer registry contract
     * @param _admin Address of the contract admin
     * @param _minEmployerStake Minimum stake required for employers
     */
    function initialize(
        address _zkVerifier,
        address _stablecoinPool,
        address _employerRegistry,
        address _admin,
        uint256 _minEmployerStake
    ) external initializer {
        require(_zkVerifier != address(0), "StreamCore: invalid verifier");
        require(_stablecoinPool != address(0), "StreamCore: invalid pool");
        require(_employerRegistry != address(0), "StreamCore: invalid registry");
        require(_admin != address(0), "StreamCore: invalid admin");

        __ReentrancyGuard_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        zkVerifier = IVerifier(_zkVerifier);
        stablecoinPool = IStablecoinPool(_stablecoinPool);
        employerRegistry = IEmployerRegistry(_employerRegistry);
        minEmployerStake = _minEmployerStake;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /**
     * @notice Claims wages using a ZK proof
     * @param proof ZK proof components [pA_x, pA_y, pB_x0, pB_y0, pB_x1, pB_y1, pC_x, pC_y]
     * @param publicInputs Public inputs [nullifier, amount, employerHash]
     * @return success True if the claim was successful
     */
    function claimWages(
        uint256[8] calldata proof,
        uint256[3] calldata publicInputs
    ) external nonReentrant whenNotPaused returns (bool success) {
        // Validate public inputs
        require(
            publicInputs.validatePublicInputs(MAX_WAGE_AMOUNT),
            "StreamCore: invalid public inputs"
        );

        bytes32 nullifier = bytes32(publicInputs[0]);
        uint256 amount = publicInputs[1];
        bytes32 employerHash = bytes32(publicInputs[2]);

        // Check nullifier hasn't been used
        require(!usedNullifiers[nullifier], "StreamCore: nullifier already used");

        // Validate amount bounds
        require(
            amount >= MIN_WAGE_AMOUNT && amount <= MAX_WAGE_AMOUNT,
            "StreamCore: amount out of bounds"
        );

        // Verify ZK proof
        require(
            zkVerifier.verifyProofFlat(proof, publicInputs),
            "StreamCore: invalid proof"
        );

        // Verify employer is registered and has sufficient stake
        require(
            _verifyEmployer(employerHash),
            "StreamCore: employer not verified"
        );

        // Mark nullifier as used
        usedNullifiers[nullifier] = true;

        // Disburse wages through stablecoin pool
        require(
            stablecoinPool.disburseAdvance(msg.sender, amount),
            "StreamCore: disbursement failed"
        );

        // Update stats
        totalWagesClaimed += amount;
        totalClaims++;

        emit WagesClaimed(msg.sender, amount, nullifier, employerHash);

        return true;
    }

    /**
     * @notice Updates employer stake (only callable by employer registry)
     * @param employer Address of the employer
     * @param newStake New stake amount
     */
    function updateEmployerStake(
        address employer,
        uint256 newStake
    ) external {
        require(
            msg.sender == address(employerRegistry),
            "StreamCore: only registry"
        );

        uint256 oldStake = employerStakes[employer];
        employerStakes[employer] = newStake;

        emit EmployerStakeUpdated(employer, newStake, oldStake);
    }

    /**
     * @notice Checks if a nullifier has been used
     * @param nullifier The nullifier to check
     * @return used True if the nullifier has been used
     */
    function isNullifierUsed(bytes32 nullifier) external view returns (bool used) {
        return usedNullifiers[nullifier];
    }

    /**
     * @notice Gets the stake amount for an employer
     * @param employer Address of the employer
     * @return stake The stake amount
     */
    function getEmployerStake(address employer) external view returns (uint256 stake) {
        return employerStakes[employer];
    }

    /**
     * @notice Gets the current ZK verifier contract address
     * @return verifier Address of the verifier contract
     */
    function getVerifier() external view returns (address verifier) {
        return address(zkVerifier);
    }

    /**
     * @notice Gets comprehensive contract statistics
     * @return totalClaimed Total wages claimed
     * @return claimCount Total number of claims
     * @return activeNullifiers Number of used nullifiers
     */
    function getStats() external view returns (
        uint256 totalClaimed,
        uint256 claimCount,
        uint256 activeNullifiers
    ) {
        return (totalWagesClaimed, totalClaims, totalClaims); // activeNullifiers = totalClaims
    }

    // Admin functions

    /**
     * @notice Updates the ZK verifier contract
     * @param newVerifier Address of the new verifier
     */
    function updateVerifier(address newVerifier) external onlyRole(OPERATOR_ROLE) {
        require(newVerifier != address(0), "StreamCore: invalid verifier");

        address oldVerifier = address(zkVerifier);
        zkVerifier = IVerifier(newVerifier);

        emit VerifierUpdated(oldVerifier, newVerifier);
    }

    /**
     * @notice Updates the stablecoin pool contract
     * @param newPool Address of the new pool
     */
    function updateStablecoinPool(address newPool) external onlyRole(OPERATOR_ROLE) {
        require(newPool != address(0), "StreamCore: invalid pool");

        address oldPool = address(stablecoinPool);
        stablecoinPool = IStablecoinPool(newPool);

        emit StablecoinPoolUpdated(oldPool, newPool);
    }

    /**
     * @notice Updates the employer registry contract
     * @param newRegistry Address of the new registry
     */
    function updateEmployerRegistry(address newRegistry) external onlyRole(OPERATOR_ROLE) {
        require(newRegistry != address(0), "StreamCore: invalid registry");

        address oldRegistry = address(employerRegistry);
        employerRegistry = IEmployerRegistry(newRegistry);

        emit EmployerRegistryUpdated(oldRegistry, newRegistry);
    }

    /**
     * @notice Updates minimum employer stake requirement
     * @param newMinStake New minimum stake amount
     */
    function updateMinEmployerStake(uint256 newMinStake) external onlyRole(OPERATOR_ROLE) {
        uint256 oldStake = minEmployerStake;
        minEmployerStake = newMinStake;

        emit MinStakeUpdated(oldStake, newMinStake);
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
        require(to != address(0), "StreamCore: invalid recipient");

        if (token == address(0)) {
            // Withdraw ETH
            payable(to).transfer(amount);
        } else {
            // Withdraw ERC20
            IERC20(token).safeTransfer(to, amount);
        }

        emit EmergencyWithdraw(token, to, amount);
    }

    // Internal functions

    /**
     * @notice Verifies an employer's registration and stake
     * @param employerHash Hash of the employer's public key
     * @return valid True if employer is valid
     */
    function _verifyEmployer(bytes32 employerHash) internal view returns (bool valid) {
        // This would need to map employerHash to address through the registry
        // For now, we'll implement a simplified version
        // In production, this should verify the employer through the registry
        return employerHash != bytes32(0);
    }

    /**
     * @notice Authorizes upgrade (required by UUPSUpgradeable)
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        // Additional upgrade validation can be added here
    }

    /**
     * @notice Receives ETH
     */
    receive() external payable {}
}