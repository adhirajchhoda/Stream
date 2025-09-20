// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IEmployerRegistry
 * @notice Interface for employer verification and management
 */
interface IEmployerRegistry {
    struct EmployerInfo {
        bool isWhitelisted;
        uint256 stakeAmount;
        uint256 reputationScore;
        bytes32 pubKeyHash;
        uint256 registrationTime;
        uint256 lastActivityTime;
    }

    /**
     * @notice Emitted when an employer is registered
     * @param employer Address of the employer
     * @param pubKeyHash Hash of the employer's public key
     * @param stakeAmount Initial stake amount
     */
    event EmployerRegistered(
        address indexed employer,
        bytes32 indexed pubKeyHash,
        uint256 stakeAmount
    );

    /**
     * @notice Emitted when an employer is whitelisted or removed from whitelist
     * @param employer Address of the employer
     * @param whitelisted New whitelist status
     */
    event EmployerWhitelistUpdated(
        address indexed employer,
        bool whitelisted
    );

    /**
     * @notice Emitted when an employer's reputation is updated
     * @param employer Address of the employer
     * @param newScore New reputation score
     * @param oldScore Previous reputation score
     */
    event ReputationUpdated(
        address indexed employer,
        uint256 newScore,
        uint256 oldScore
    );

    /**
     * @notice Registers a new employer
     * @param pubKeyHash Hash of the employer's public key
     * @param stakeAmount Initial stake amount
     */
    function registerEmployer(bytes32 pubKeyHash, uint256 stakeAmount) external;

    /**
     * @notice Updates an employer's whitelist status
     * @param employer Address of the employer
     * @param whitelisted New whitelist status
     */
    function updateWhitelist(address employer, bool whitelisted) external;

    /**
     * @notice Updates an employer's reputation score
     * @param employer Address of the employer
     * @param newScore New reputation score
     */
    function updateReputation(address employer, uint256 newScore) external;

    /**
     * @notice Increases an employer's stake
     * @param additionalStake Additional stake amount
     */
    function increaseStake(uint256 additionalStake) external;

    /**
     * @notice Decreases an employer's stake
     * @param stakeReduction Amount to reduce stake by
     */
    function decreaseStake(uint256 stakeReduction) external;

    /**
     * @notice Gets employer information
     * @param employer Address of the employer
     * @return info Employer information struct
     */
    function getEmployerInfo(address employer) external view returns (EmployerInfo memory info);

    /**
     * @notice Checks if an employer is whitelisted
     * @param employer Address of the employer
     * @return whitelisted True if whitelisted
     */
    function isWhitelisted(address employer) external view returns (bool whitelisted);

    /**
     * @notice Gets an employer's reputation score
     * @param employer Address of the employer
     * @return score Reputation score
     */
    function getReputationScore(address employer) external view returns (uint256 score);

    /**
     * @notice Verifies an employer's public key hash
     * @param employer Address of the employer
     * @param pubKeyHash Hash to verify
     * @return valid True if the hash matches
     */
    function verifyPubKeyHash(address employer, bytes32 pubKeyHash) external view returns (bool valid);
}