// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IVerifier.sol";

/**
 * @title MockVerifier
 * @notice Mock ZK verifier for testing purposes
 * @dev This contract simulates a Groth16 verifier for development and testing
 */
contract MockVerifier is IVerifier {
    bool public shouldVerify;
    mapping(bytes32 => bool) public usedProofs;

    event ProofVerified(uint256[8] proof, uint256[3] publicInputs, bool result);

    constructor(bool _shouldVerify) {
        shouldVerify = _shouldVerify;
    }

    /**
     * @notice Verifies a zk-SNARK proof (mock implementation)
     * @param _pA The A component of the proof
     * @param _pB The B component of the proof
     * @param _pC The C component of the proof
     * @param _pubSignals Public signals/inputs to the circuit
     * @return verified True if the proof is valid (based on mock settings)
     */
    function verifyProof(
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[3] memory _pubSignals
    ) external view override returns (bool verified) {
        // Basic validation
        if (_pA[0] == 0 && _pA[1] == 0) return false;
        if (_pC[0] == 0 && _pC[1] == 0) return false;
        if (_pubSignals[0] == 0) return false; // nullifier cannot be zero

        return shouldVerify;
    }

    /**
     * @notice Alternative verification function with flattened proof array
     * @param proof Flattened proof array [pA_x, pA_y, pB_x0, pB_y0, pB_x1, pB_y1, pC_x, pC_y]
     * @param publicInputs Public inputs [nullifier, amount, employerHash]
     * @return verified True if the proof is valid
     */
    function verifyProofFlat(
        uint256[8] memory proof,
        uint256[3] memory publicInputs
    ) external override returns (bool verified) {
        // Create proof hash to prevent replay
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));

        // Check if proof was already used
        if (usedProofs[proofHash]) {
            return false;
        }

        // Basic validation
        if (proof[0] == 0 && proof[1] == 0) return false; // pA cannot be zero
        if (proof[6] == 0 && proof[7] == 0) return false; // pC cannot be zero
        if (publicInputs[0] == 0) return false; // nullifier cannot be zero
        if (publicInputs[1] == 0) return false; // amount cannot be zero
        if (publicInputs[2] == 0) return false; // employerHash cannot be zero

        // Mark proof as used
        usedProofs[proofHash] = true;

        emit ProofVerified(proof, publicInputs, shouldVerify);

        return shouldVerify;
    }

    /**
     * @notice Sets whether proofs should verify successfully
     * @param _shouldVerify New verification result
     */
    function setShouldVerify(bool _shouldVerify) external {
        shouldVerify = _shouldVerify;
    }

    /**
     * @notice Resets a proof to allow reuse (for testing)
     * @param proof Proof array
     * @param publicInputs Public inputs
     */
    function resetProof(uint256[8] memory proof, uint256[3] memory publicInputs) external {
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));
        usedProofs[proofHash] = false;
    }

    /**
     * @notice Checks if a proof has been used
     * @param proof Proof array
     * @param publicInputs Public inputs
     * @return used True if proof has been used
     */
    function isProofUsed(uint256[8] memory proof, uint256[3] memory publicInputs) external view returns (bool used) {
        bytes32 proofHash = keccak256(abi.encodePacked(proof, publicInputs));
        return usedProofs[proofHash];
    }
}