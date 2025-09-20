pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/**
 * SIMPLIFIED WageProof Circuit - HACKATHON DEMO VERSION
 *
 * Optimized for speed and demo purposes:
 * - Removed ECDSA for faster proof generation
 * - Simplified signature verification using Poseidon hash
 * - Reduced constraint count for <5 second proof generation
 * - Mock trusted setup suitable for demo
 *
 * DEMO NARRATIVE: "I can prove my wages without revealing my identity or exact amount"
 *
 * Private Inputs (witness):
 * - employerSecret: Employer's secret key (replaces complex ECDSA)
 * - employeeSecret: Employee's secret for privacy
 * - wageAmount: Actual wage amount
 * - periodNonce: Unique nonce per payment period
 * - employerID: Employer identifier
 *
 * Public Inputs:
 * - nullifierHash: Prevents double-spending for same period
 * - wageCommitment: Commitment to wage amount (privacy preserving)
 * - employerCommitment: Commitment to employer (prevents forgery)
 * - minWageThreshold: Minimum wage threshold for proof
 * - maxWageThreshold: Maximum wage threshold for proof
 */
template WageProofDemo() {
    // Circuit parameters - optimized for speed
    var WAGE_BITS = 32;  // Reduced from 64 bits for faster range checks

    // Private inputs (witness)
    signal private input employerSecret;     // Simplified employer auth
    signal private input employeeSecret;     // Employee privacy key
    signal private input wageAmount;         // Actual wage amount
    signal private input periodNonce;        // Payment period nonce
    signal private input employerID;         // Employer identifier

    // Public inputs
    signal input nullifierHash;              // Double-spend prevention
    signal input wageCommitment;             // Hidden wage commitment
    signal input employerCommitment;         // Employer verification
    signal input minWageThreshold;           // Wage range lower bound
    signal input maxWageThreshold;           // Wage range upper bound

    // Components - minimal for speed
    component nullifierHasher = Poseidon(4);
    component wageCommitter = Poseidon(3);
    component employerCommitter = Poseidon(2);
    component wageRangeMin = GreaterEqualThan(WAGE_BITS);
    component wageRangeMax = LessEqualThan(WAGE_BITS);

    // 1. Verify employer commitment (simplified signature)
    employerCommitter.inputs[0] <== employerSecret;
    employerCommitter.inputs[1] <== employerID;
    employerCommitment === employerCommitter.out;

    // 2. Generate nullifier hash to prevent double-spending
    nullifierHasher.inputs[0] <== employeeSecret;
    nullifierHasher.inputs[1] <== employerID;
    nullifierHasher.inputs[2] <== periodNonce;
    nullifierHasher.inputs[3] <== wageAmount; // Include wage for uniqueness
    nullifierHash === nullifierHasher.out;

    // 3. Generate wage commitment (hiding exact amount)
    wageCommitter.inputs[0] <== wageAmount;
    wageCommitter.inputs[1] <== employeeSecret;
    wageCommitter.inputs[2] <== periodNonce;
    wageCommitment === wageCommitter.out;

    // 4. Verify wage amount is within specified bounds
    wageRangeMin.in[0] <== wageAmount;
    wageRangeMin.in[1] <== minWageThreshold;
    wageRangeMin.out === 1;

    wageRangeMax.in[0] <== wageAmount;
    wageRangeMax.in[1] <== maxWageThreshold;
    wageRangeMax.out === 1;

    // 5. Basic validation constraints (minimal for demo)

    // Ensure wage amount is positive
    component wagePositive = GreaterThan(WAGE_BITS);
    wagePositive.in[0] <== wageAmount;
    wagePositive.in[1] <== 0;
    wagePositive.out === 1;

    // Ensure secrets are non-zero (prevents trivial attacks)
    component employeeSecretNonZero = GreaterThan(32);
    employeeSecretNonZero.in[0] <== employeeSecret;
    employeeSecretNonZero.in[1] <== 0;
    employeeSecretNonZero.out === 1;

    component employerSecretNonZero = GreaterThan(32);
    employerSecretNonZero.in[0] <== employerSecret;
    employerSecretNonZero.in[1] <== 0;
    employerSecretNonZero.out === 1;
}

// Main component instantiation
component main = WageProofDemo();