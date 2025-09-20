// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IStreamCore
 * @notice Interface for the main Stream protocol verification contract
 */
interface IStreamCore {
    /**
     * @notice Emitted when wages are successfully claimed
     * @param recipient Address receiving the wage payment
     * @param amount Amount of wages claimed
     * @param nullifier Unique nullifier to prevent double-spending
     * @param employer Hash of the employer's public key
     */
    event WagesClaimed(
        address indexed recipient,
        uint256 amount,
        bytes32 indexed nullifier,
        bytes32 indexed employer
    );

    /**
     * @notice Emitted when an employer's stake is updated
     * @param employer Address of the employer
     * @param newStake New stake amount
     * @param oldStake Previous stake amount
     */
    event EmployerStakeUpdated(
        address indexed employer,
        uint256 newStake,
        uint256 oldStake
    );

    /**
     * @notice Emitted when the ZK verifier is updated
     * @param oldVerifier Previous verifier address
     * @param newVerifier New verifier address
     */
    event VerifierUpdated(address oldVerifier, address newVerifier);

    /**
     * @notice Claims wages using a ZK proof
     * @param proof ZK proof components [pA_x, pA_y, pB_x0, pB_y0, pB_x1, pB_y1, pC_x, pC_y]
     * @param publicInputs Public inputs [nullifier, amount, employerHash]
     * @return success True if the claim was successful
     */
    function claimWages(
        uint256[8] calldata proof,
        uint256[3] calldata publicInputs
    ) external returns (bool success);

    /**
     * @notice Checks if a nullifier has been used
     * @param nullifier The nullifier to check
     * @return used True if the nullifier has been used
     */
    function isNullifierUsed(bytes32 nullifier) external view returns (bool used);

    /**
     * @notice Gets the stake amount for an employer
     * @param employer Address of the employer
     * @return stake The stake amount
     */
    function getEmployerStake(address employer) external view returns (uint256 stake);

    /**
     * @notice Gets the current ZK verifier contract address
     * @return verifier Address of the verifier contract
     */
    function getVerifier() external view returns (address verifier);
}