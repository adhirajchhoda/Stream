const path = require('path');
const wasm_tester = require('circom_tester').wasm;
const crypto = require('crypto');
const { poseidon } = require('circomlib');

/**
 * Comprehensive Test Suite for WageProof Circuit
 *
 * Tests all constraints and edge cases for the wage attestation ZK circuit
 */

describe('WageProof Circuit', () => {
    let circuit;
    const CIRCUIT_PATH = path.join(__dirname, '../src/wage_proof.circom');

    // Test data constants
    const TEST_EMPLOYER_PRIV_KEY = '12345';
    const TEST_EMPLOYEE_SECRET = '54321';
    const TEST_WAGE_AMOUNT = '1000000000000000000'; // 1 ETH in wei
    const TEST_PERIOD_NONCE = '1';
    const TEST_EMPLOYER_ID = '1001';
    const TEST_EMPLOYEE_WALLET = '0x742d35Cc6644C7532905C2D2C0f6E88F4c1C7E3C';
    const TEST_PERIOD_ID = '202409';
    const TEST_TIMESTAMP = '1726790400';
    const MIN_WAGE_THRESHOLD = '500000000000000000'; // 0.5 ETH
    const MAX_WAGE_THRESHOLD = '5000000000000000000'; // 5 ETH

    before(async () => {
        circuit = await wasm_tester(CIRCUIT_PATH);
    });

    /**
     * Helper function to generate valid circuit inputs
     */
    function generateValidInputs() {
        // Generate nullifier hash
        const nullifierHash = poseidon([
            TEST_EMPLOYEE_SECRET,
            TEST_EMPLOYER_ID,
            TEST_PERIOD_ID,
            TEST_PERIOD_NONCE
        ]);

        // Generate wage commitment
        const wageCommitment = poseidon([
            TEST_WAGE_AMOUNT,
            TEST_EMPLOYEE_SECRET,
            TEST_PERIOD_NONCE
        ]);

        // Generate employer public key hash (simplified)
        const employerPubKeyX = BigInt(TEST_EMPLOYER_PRIV_KEY) * BigInt(TEST_EMPLOYER_PRIV_KEY);
        const employerPubKeyY = BigInt(TEST_EMPLOYER_PRIV_KEY) + BigInt(1);
        const employerPubKeyHash = poseidon([employerPubKeyX, employerPubKeyY]);

        return {
            // Private inputs
            employerPrivKey: TEST_EMPLOYER_PRIV_KEY,
            r: '123456789', // Mock ECDSA signature components
            s: '987654321',
            employeeSecret: TEST_EMPLOYEE_SECRET,
            wageAmount: TEST_WAGE_AMOUNT,
            periodNonce: TEST_PERIOD_NONCE,
            employerID: TEST_EMPLOYER_ID,
            employeeWallet: TEST_EMPLOYEE_WALLET,
            periodID: TEST_PERIOD_ID,
            timestamp: TEST_TIMESTAMP,

            // Public inputs
            nullifierHash: nullifierHash.toString(),
            wageCommitment: wageCommitment.toString(),
            employerPubKeyHash: employerPubKeyHash.toString(),
            minWageThreshold: MIN_WAGE_THRESHOLD,
            maxWageThreshold: MAX_WAGE_THRESHOLD
        };
    }

    describe('Valid Proof Generation', () => {
        it('should generate a valid proof with correct inputs', async () => {
            const inputs = generateValidInputs();

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });

        it('should produce consistent outputs for same inputs', async () => {
            const inputs = generateValidInputs();

            const witness1 = await circuit.calculateWitness(inputs);
            const witness2 = await circuit.calculateWitness(inputs);

            expect(witness1).to.deep.equal(witness2);
        });
    });

    describe('Nullifier Hash Validation', () => {
        it('should generate different nullifiers for different periods', async () => {
            const inputs1 = generateValidInputs();
            const inputs2 = { ...inputs1, periodID: '202410' };

            // Recalculate nullifier for inputs2
            inputs2.nullifierHash = poseidon([
                TEST_EMPLOYEE_SECRET,
                TEST_EMPLOYER_ID,
                '202410',
                TEST_PERIOD_NONCE
            ]).toString();

            const witness1 = await circuit.calculateWitness(inputs1);
            const witness2 = await circuit.calculateWitness(inputs2);

            expect(witness1[1]).to.not.equal(witness2[1]); // Different nullifiers
        });

        it('should generate different nullifiers for different employees', async () => {
            const inputs1 = generateValidInputs();
            const inputs2 = { ...inputs1, employeeSecret: '99999' };

            // Recalculate nullifier and commitment for inputs2
            inputs2.nullifierHash = poseidon([
                '99999',
                TEST_EMPLOYER_ID,
                TEST_PERIOD_ID,
                TEST_PERIOD_NONCE
            ]).toString();

            inputs2.wageCommitment = poseidon([
                TEST_WAGE_AMOUNT,
                '99999',
                TEST_PERIOD_NONCE
            ]).toString();

            const witness1 = await circuit.calculateWitness(inputs1);
            const witness2 = await circuit.calculateWitness(inputs2);

            expect(witness1[1]).to.not.equal(witness2[1]); // Different nullifiers
        });

        it('should reject incorrect nullifier hash', async () => {
            const inputs = generateValidInputs();
            inputs.nullifierHash = '999999999'; // Wrong nullifier

            try {
                await circuit.calculateWitness(inputs);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });
    });

    describe('Wage Commitment Validation', () => {
        it('should reject incorrect wage commitment', async () => {
            const inputs = generateValidInputs();
            inputs.wageCommitment = '888888888'; // Wrong commitment

            try {
                await circuit.calculateWitness(inputs);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });

        it('should accept valid wage commitment', async () => {
            const inputs = generateValidInputs();

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });
    });

    describe('Wage Range Validation', () => {
        it('should reject wage below minimum threshold', async () => {
            const inputs = generateValidInputs();
            inputs.wageAmount = '100000000000000000'; // 0.1 ETH (below 0.5 ETH min)

            // Recalculate commitment with new wage
            inputs.wageCommitment = poseidon([
                inputs.wageAmount,
                TEST_EMPLOYEE_SECRET,
                TEST_PERIOD_NONCE
            ]).toString();

            try {
                await circuit.calculateWitness(inputs);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });

        it('should reject wage above maximum threshold', async () => {
            const inputs = generateValidInputs();
            inputs.wageAmount = '10000000000000000000'; // 10 ETH (above 5 ETH max)

            // Recalculate commitment with new wage
            inputs.wageCommitment = poseidon([
                inputs.wageAmount,
                TEST_EMPLOYEE_SECRET,
                TEST_PERIOD_NONCE
            ]).toString();

            try {
                await circuit.calculateWitness(inputs);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });

        it('should accept wage within valid range', async () => {
            const inputs = generateValidInputs();
            inputs.wageAmount = '2000000000000000000'; // 2 ETH (within range)

            // Recalculate commitment with new wage
            inputs.wageCommitment = poseidon([
                inputs.wageAmount,
                TEST_EMPLOYEE_SECRET,
                TEST_PERIOD_NONCE
            ]).toString();

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });

        it('should reject zero wage amount', async () => {
            const inputs = generateValidInputs();
            inputs.wageAmount = '0';

            // Recalculate commitment with new wage
            inputs.wageCommitment = poseidon([
                inputs.wageAmount,
                TEST_EMPLOYEE_SECRET,
                TEST_PERIOD_NONCE
            ]).toString();

            try {
                await circuit.calculateWitness(inputs);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });
    });

    describe('Employer Key Validation', () => {
        it('should reject incorrect employer public key hash', async () => {
            const inputs = generateValidInputs();
            inputs.employerPubKeyHash = '777777777'; // Wrong hash

            try {
                await circuit.calculateWitness(inputs);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });

        it('should accept correct employer public key hash', async () => {
            const inputs = generateValidInputs();

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });
    });

    describe('Timestamp Validation', () => {
        it('should reject timestamp too far in future', async () => {
            const inputs = generateValidInputs();
            inputs.timestamp = '3000000000'; // Year 2065

            try {
                await circuit.calculateWitness(inputs);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });

        it('should accept reasonable timestamp', async () => {
            const inputs = generateValidInputs();
            inputs.timestamp = '1726790400'; // Sept 2024

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });
    });

    describe('Security Constraints', () => {
        it('should reject zero employee secret', async () => {
            const inputs = generateValidInputs();
            inputs.employeeSecret = '0';

            // Recalculate dependent values
            inputs.nullifierHash = poseidon([
                '0',
                TEST_EMPLOYER_ID,
                TEST_PERIOD_ID,
                TEST_PERIOD_NONCE
            ]).toString();

            inputs.wageCommitment = poseidon([
                TEST_WAGE_AMOUNT,
                '0',
                TEST_PERIOD_NONCE
            ]).toString();

            try {
                await circuit.calculateWitness(inputs);
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.message).to.include('Assert Failed');
            }
        });

        it('should accept non-zero employee secret', async () => {
            const inputs = generateValidInputs();

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });
    });

    describe('Edge Cases', () => {
        it('should handle minimum valid wage amount', async () => {
            const inputs = generateValidInputs();
            inputs.wageAmount = MIN_WAGE_THRESHOLD; // Exactly at minimum

            // Recalculate commitment with new wage
            inputs.wageCommitment = poseidon([
                inputs.wageAmount,
                TEST_EMPLOYEE_SECRET,
                TEST_PERIOD_NONCE
            ]).toString();

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });

        it('should handle maximum valid wage amount', async () => {
            const inputs = generateValidInputs();
            inputs.wageAmount = MAX_WAGE_THRESHOLD; // Exactly at maximum

            // Recalculate commitment with new wage
            inputs.wageCommitment = poseidon([
                inputs.wageAmount,
                TEST_EMPLOYEE_SECRET,
                TEST_PERIOD_NONCE
            ]).toString();

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });

        it('should handle large employee secret', async () => {
            const inputs = generateValidInputs();
            const largeSecret = '999999999999999999999999999999';
            inputs.employeeSecret = largeSecret;

            // Recalculate dependent values
            inputs.nullifierHash = poseidon([
                largeSecret,
                TEST_EMPLOYER_ID,
                TEST_PERIOD_ID,
                TEST_PERIOD_NONCE
            ]).toString();

            inputs.wageCommitment = poseidon([
                TEST_WAGE_AMOUNT,
                largeSecret,
                TEST_PERIOD_NONCE
            ]).toString();

            const witness = await circuit.calculateWitness(inputs);
            await circuit.checkConstraints(witness);
        });
    });

    describe('Performance Tests', () => {
        it('should generate witness within reasonable time', async function() {
            this.timeout(10000); // 10 second timeout

            const inputs = generateValidInputs();

            const startTime = Date.now();
            const witness = await circuit.calculateWitness(inputs);
            const endTime = Date.now();

            const generationTime = endTime - startTime;
            console.log(`Witness generation time: ${generationTime}ms`);

            expect(generationTime).to.be.lessThan(5000); // Should be under 5 seconds
            await circuit.checkConstraints(witness);
        });

        it('should report circuit statistics', async () => {
            const stats = await circuit.getConstraints();
            console.log(`Circuit statistics:`);
            console.log(`  - Number of constraints: ${stats.length}`);
            console.log(`  - Circuit compilation successful`);

            // Ensure circuit is not too large (performance consideration)
            expect(stats.length).to.be.lessThan(100000); // Reasonable constraint limit
        });
    });
});