// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SecurityLib
 * @notice Library for security utilities and validations
 */
library SecurityLib {
    /**
     * @notice Validates that an amount is within reasonable bounds
     * @param amount Amount to validate
     * @param maxAmount Maximum allowed amount
     * @return valid True if amount is valid
     */
    function validateAmount(uint256 amount, uint256 maxAmount) internal pure returns (bool valid) {
        return amount > 0 && amount <= maxAmount;
    }

    /**
     * @notice Validates a nullifier format
     * @param nullifier Nullifier to validate
     * @return valid True if nullifier is valid
     */
    function validateNullifier(bytes32 nullifier) internal pure returns (bool valid) {
        return nullifier != bytes32(0);
    }

    /**
     * @notice Validates an employer hash
     * @param employerHash Employer hash to validate
     * @return valid True if employer hash is valid
     */
    function validateEmployerHash(bytes32 employerHash) internal pure returns (bool valid) {
        return employerHash != bytes32(0);
    }

    /**
     * @notice Validates public inputs for ZK proof
     * @param publicInputs Array of public inputs [nullifier, amount, employerHash]
     * @param maxAmount Maximum allowed amount
     * @return valid True if all inputs are valid
     */
    function validatePublicInputs(
        uint256[3] memory publicInputs,
        uint256 maxAmount
    ) internal pure returns (bool valid) {
        bytes32 nullifier = bytes32(publicInputs[0]);
        uint256 amount = publicInputs[1];
        bytes32 employerHash = bytes32(publicInputs[2]);

        return validateNullifier(nullifier) &&
               validateAmount(amount, maxAmount) &&
               validateEmployerHash(employerHash);
    }

    /**
     * @notice Computes a commitment hash for replay protection
     * @param recipient Address of the recipient
     * @param amount Amount being claimed
     * @param nullifier Unique nullifier
     * @param timestamp Current timestamp
     * @return commitment Commitment hash
     */
    function computeCommitment(
        address recipient,
        uint256 amount,
        bytes32 nullifier,
        uint256 timestamp
    ) internal pure returns (bytes32 commitment) {
        return keccak256(abi.encodePacked(recipient, amount, nullifier, timestamp));
    }

    /**
     * @notice Validates that a timestamp is within an acceptable range
     * @param timestamp Timestamp to validate
     * @param maxAge Maximum age in seconds
     * @return valid True if timestamp is valid
     */
    function validateTimestamp(uint256 timestamp, uint256 maxAge) internal view returns (bool valid) {
        return timestamp <= block.timestamp &&
               (block.timestamp - timestamp) <= maxAge;
    }

    /**
     * @notice Safe percentage calculation to avoid overflow
     * @param amount Base amount
     * @param percentage Percentage (scaled by 10000, e.g., 250 = 2.5%)
     * @return result Calculated percentage
     */
    function calculatePercentage(uint256 amount, uint256 percentage) internal pure returns (uint256 result) {
        require(percentage <= 10000, "SecurityLib: percentage too high");
        return (amount * percentage) / 10000;
    }

    /**
     * @notice Validates an address is not zero
     * @param addr Address to validate
     * @return valid True if address is valid
     */
    function validateAddress(address addr) internal pure returns (bool valid) {
        return addr != address(0);
    }
}