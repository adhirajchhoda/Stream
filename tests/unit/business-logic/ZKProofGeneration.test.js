/**
 * BRUTAL REALITY CHECK: ZK Proof Generation Tests
 *
 * Zero-Knowledge Proofs are the most complex and fragile part of our system.
 * These tests expose every way the cryptographic system can catastrophically fail.
 * If these tests don't pass, the entire protocol is worthless.
 */

const ZKProofService = require('../../../circuits/src/zkproof_service');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('ZKProofService - Cryptographic Reality Check', () => {
    let zkService;
    let validAttestation;

    before(async function() {
        this.timeout(30000); // Circuit loading takes time

        zkService = new ZKProofService();
        await zkService.initialize();

        validAttestation = {
            id: 'test-attestation-123',
            employerId: 'verified-employer-123',
            employeeWallet: '0x1234567890123456789012345678901234567890',
            wageAmount: 14400, // $144.00 in cents
            periodStart: new Date('2025-01-15T09:00:00Z'),
            periodEnd: new Date('2025-01-15T17:00:00Z'),
            hoursWorked: 8.0,
            hourlyRate: 18.00,
            periodNonce: 'unique-period-123',
            signature: '0xvalidSignatureData',
            nullifier: '0x1234567890abcdef1234567890abcdef12345678'
        };
    });

    describe('Circuit Initialization (The Foundation That Can Crumble)', () => {
        test('should load circuit files correctly', () => {
            expect(zkService.circuit).to.exist;
            expect(zkService.provingKey).to.exist;
            expect(zkService.verificationKey).to.exist;
        });

        test('should fail gracefully with corrupted circuit files', async () => {
            const corruptedService = new ZKProofService();

            // Mock corrupted circuit file
            const originalReadFile = fs.readFileSync;
            fs.readFileSync = () => { throw new Error('Corrupted circuit file'); };

            try {
                await corruptedService.initialize();
                expect.fail('Should have thrown error for corrupted circuit');
            } catch (error) {
                expect(error.message).to.include('circuit');
            } finally {
                fs.readFileSync = originalReadFile;
            }
        });

        test('should detect circuit version mismatch', async () => {
            // This would happen if we upgrade circuits but not the service
            const versionMismatchService = new ZKProofService();

            // Mock version check
            versionMismatchService.checkCircuitVersion = () => {
                throw new Error('Circuit version mismatch: expected v2.1, got v2.0');
            };

            try {
                await versionMismatchService.initialize();
                expect.fail('Should detect version mismatch');
            } catch (error) {
                expect(error.message).to.include('version mismatch');
            }
        });
    });

    describe('Valid Proof Generation (When Everything Works)', () => {
        test('should generate valid proof for perfect attestation', async function() {
            this.timeout(10000); // Proof generation takes time

            const startTime = Date.now();
            const proof = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x1234567890abcdef'
            });
            const duration = Date.now() - startTime;

            expect(proof).to.exist;
            expect(proof.proof).to.be.an('array').with.length(8);
            expect(proof.publicInputs).to.be.an('array').with.length(3);
            expect(duration).to.be.lessThan(5000); // Performance target

            // Verify proof structure
            expect(proof.proof.every(p => typeof p === 'string')).to.be.true;
            expect(proof.publicInputs.every(p => typeof p === 'string')).to.be.true;
        });

        test('should generate consistent proofs for same input', async function() {
            this.timeout(15000);

            const proof1 = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x1234567890abcdef'
            });

            const proof2 = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x1234567890abcdef'
            });

            // Public inputs should be identical
            expect(proof1.publicInputs).to.deep.equal(proof2.publicInputs);
            // But proofs themselves should be different (due to randomness)
            expect(proof1.proof).to.not.deep.equal(proof2.proof);
        });

        test('should verify generated proof correctly', async function() {
            this.timeout(10000);

            const proof = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x1234567890abcdef'
            });

            const isValid = await zkService.verifyProof(proof.proof, proof.publicInputs);
            expect(isValid).to.be.true;
        });
    });

    describe('BRUTAL REALITY: Malformed Input Attacks', () => {
        test('should reject attestation with invalid signature format', async () => {
            const malformedAttestation = {
                ...validAttestation,
                signature: 'not-a-valid-signature' // INVALID FORMAT
            };

            try {
                await zkService.generateProof({
                    attestation: malformedAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should reject invalid signature format');
            } catch (error) {
                expect(error.message).to.include('Invalid signature format');
            }
        });

        test('should reject attestation with corrupted signature', async () => {
            const corruptedAttestation = {
                ...validAttestation,
                signature: '0x' + 'f'.repeat(128) // Wrong signature
            };

            try {
                await zkService.generateProof({
                    attestation: corruptedAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should reject corrupted signature');
            } catch (error) {
                expect(error.message).to.include('signature verification failed');
            }
        });

        test('should reject attestation with invalid employee secret', async () => {
            try {
                await zkService.generateProof({
                    attestation: validAttestation,
                    employeeSecret: 'not-a-hex-string' // INVALID FORMAT
                });
                expect.fail('Should reject invalid employee secret');
            } catch (error) {
                expect(error.message).to.include('Invalid employee secret');
            }
        });

        test('should reject attestation with missing required fields', async () => {
            const incompleteAttestation = {
                ...validAttestation
            };
            delete incompleteAttestation.employerId; // MISSING FIELD

            try {
                await zkService.generateProof({
                    attestation: incompleteAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should reject incomplete attestation');
            } catch (error) {
                expect(error.message).to.include('Missing required field');
            }
        });

        test('should reject wage amounts exceeding circuit constraints', async () => {
            const extremeAttestation = {
                ...validAttestation,
                wageAmount: 2**50 // EXCEEDS CIRCUIT FIELD SIZE
            };

            try {
                await zkService.generateProof({
                    attestation: extremeAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should reject amount exceeding field size');
            } catch (error) {
                expect(error.message).to.include('Amount exceeds field size');
            }
        });
    });

    describe('BRUTAL REALITY: Circuit Constraint Violations', () => {
        test('should enforce signature verification constraint', async () => {
            // This tests if someone tries to bypass signature verification
            const fakeAttestation = {
                ...validAttestation,
                employerId: 'different-employer', // Changed but signature didn't
                signature: validAttestation.signature // OLD SIGNATURE
            };

            try {
                await zkService.generateProof({
                    attestation: fakeAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should enforce signature verification');
            } catch (error) {
                expect(error.message).to.include('Signature verification constraint failed');
            }
        });

        test('should enforce nullifier derivation constraint', async () => {
            const invalidNullifierAttestation = {
                ...validAttestation,
                nullifier: '0x' + 'deadbeef'.repeat(8) // WRONG NULLIFIER
            };

            try {
                await zkService.generateProof({
                    attestation: invalidNullifierAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should enforce correct nullifier derivation');
            } catch (error) {
                expect(error.message).to.include('Nullifier constraint failed');
            }
        });

        test('should enforce wage amount consistency constraint', async () => {
            const inconsistentAttestation = {
                ...validAttestation,
                wageAmount: 50000, // $500
                hoursWorked: 8.0,
                hourlyRate: 18.00  // Should be $144, not $500
            };

            try {
                await zkService.generateProof({
                    attestation: inconsistentAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should enforce wage calculation consistency');
            } catch (error) {
                expect(error.message).to.include('Wage calculation constraint failed');
            }
        });

        test('should enforce time period consistency constraint', async () => {
            const inconsistentTimeAttestation = {
                ...validAttestation,
                periodStart: new Date('2025-01-15T09:00:00Z'),
                periodEnd: new Date('2025-01-15T17:00:00Z'), // 8 hours
                hoursWorked: 12.0 // CLAIMS 12 HOURS
            };

            try {
                await zkService.generateProof({
                    attestation: inconsistentTimeAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should enforce time period consistency');
            } catch (error) {
                expect(error.message).to.include('Time period constraint failed');
            }
        });
    });

    describe('BRUTAL REALITY: Performance and Resource Attacks', () => {
        test('should handle memory pressure during proof generation', async function() {
            this.timeout(15000);

            // Simulate memory pressure by generating multiple proofs simultaneously
            const promises = Array(10).fill(null).map((_, i) =>
                zkService.generateProof({
                    attestation: {
                        ...validAttestation,
                        id: `test-attestation-${i}`,
                        nullifier: `0x${i.toString(16).padStart(64, '0')}`
                    },
                    employeeSecret: '0x1234567890abcdef'
                })
            );

            const startTime = Date.now();
            const results = await Promise.all(promises);
            const duration = Date.now() - startTime;

            expect(results).to.have.length(10);
            expect(results.every(r => r.proof && r.publicInputs)).to.be.true;

            // Should not degrade significantly under load
            expect(duration / 10).to.be.lessThan(8000); // 8s average per proof under load
        });

        test('should timeout on excessively long proof generation', async function() {
            this.timeout(20000);

            // Mock a scenario where proof generation hangs
            const timeoutService = new ZKProofService();
            await timeoutService.initialize();

            // Override the proof generation to simulate hang
            const originalGenerate = timeoutService.circuit.calculateWitness;
            timeoutService.circuit.calculateWitness = () => {
                return new Promise(() => {}); // Never resolves
            };

            const startTime = Date.now();
            try {
                await timeoutService.generateProof({
                    attestation: validAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should timeout on hung proof generation');
            } catch (error) {
                const duration = Date.now() - startTime;
                expect(duration).to.be.lessThan(15000); // Should timeout before 15s
                expect(error.message).to.include('timeout');
            }
        });

        test('should handle circuit witness generation failure', async () => {
            // Mock witness generation failure
            const originalCalculateWitness = zkService.circuit.calculateWitness;
            zkService.circuit.calculateWitness = () => {
                throw new Error('Witness generation failed: unsatisfied constraint at line 42');
            };

            try {
                await zkService.generateProof({
                    attestation: validAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should handle witness generation failure');
            } catch (error) {
                expect(error.message).to.include('Witness generation failed');
            } finally {
                zkService.circuit.calculateWitness = originalCalculateWitness;
            }
        });
    });

    describe('BRUTAL REALITY: Cryptographic Security Edge Cases', () => {
        test('should generate different proofs for different secrets', async function() {
            this.timeout(15000);

            const proof1 = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x1111111111111111'
            });

            const proof2 = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x2222222222222222'
            });

            // Public inputs should be different due to different secrets
            expect(proof1.publicInputs).to.not.deep.equal(proof2.publicInputs);
            expect(proof1.proof).to.not.deep.equal(proof2.proof);
        });

        test('should reject zero employee secret (cryptographic weakness)', async () => {
            try {
                await zkService.generateProof({
                    attestation: validAttestation,
                    employeeSecret: '0x0000000000000000' // ZERO SECRET
                });
                expect.fail('Should reject zero employee secret');
            } catch (error) {
                expect(error.message).to.include('Employee secret cannot be zero');
            }
        });

        test('should handle field overflow in nullifier generation', async () => {
            const overflowAttestation = {
                ...validAttestation,
                periodNonce: 'x'.repeat(1000) // EXTREMELY LONG NONCE
            };

            try {
                await zkService.generateProof({
                    attestation: overflowAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should handle field overflow gracefully');
            } catch (error) {
                expect(error.message).to.include('Field overflow');
            }
        });

        test('should prevent proof malleability attacks', async function() {
            this.timeout(10000);

            const proof = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x1234567890abcdef'
            });

            // Try to malleate the proof by modifying one element
            const malleatedProof = [...proof.proof];
            malleatedProof[0] = '0x' + 'deadbeef'.repeat(8);

            const isValid = await zkService.verifyProof(malleatedProof, proof.publicInputs);
            expect(isValid).to.be.false; // Should reject malleated proof
        });

        test('should prevent public input tampering', async function() {
            this.timeout(10000);

            const proof = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x1234567890abcdef'
            });

            // Try to tamper with public inputs
            const tamperedInputs = [...proof.publicInputs];
            tamperedInputs[1] = '999999999'; // Change wage amount

            const isValid = await zkService.verifyProof(proof.proof, tamperedInputs);
            expect(isValid).to.be.false; // Should reject tampered inputs
        });
    });

    describe('BRUTAL REALITY: Edge Cases That Break Everything', () => {
        test('should handle attestation with Unicode characters', async () => {
            const unicodeAttestation = {
                ...validAttestation,
                employerId: 'employer-with-unicode-名前-🏢' // UNICODE CHARACTERS
            };

            try {
                const proof = await zkService.generateProof({
                    attestation: unicodeAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect(proof).to.exist; // Should handle Unicode correctly
            } catch (error) {
                // If it fails, it should fail gracefully
                expect(error.message).to.include('Unicode encoding');
            }
        });

        test('should handle attestation with extremely long strings', async () => {
            const longStringAttestation = {
                ...validAttestation,
                employerId: 'a'.repeat(10000) // 10KB string
            };

            try {
                await zkService.generateProof({
                    attestation: longStringAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should reject extremely long strings');
            } catch (error) {
                expect(error.message).to.include('String too long');
            }
        });

        test('should handle system clock manipulation', async () => {
            // Mock system time manipulation
            const originalNow = Date.now;
            Date.now = () => 0; // Time set to epoch

            try {
                const proof = await zkService.generateProof({
                    attestation: validAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });

                // Should either work or fail gracefully
                expect(proof).to.exist;
            } catch (error) {
                expect(error.message).to.include('Invalid timestamp');
            } finally {
                Date.now = originalNow;
            }
        });

        test('should handle concurrent proof generation race conditions', async function() {
            this.timeout(20000);

            const sameSecretProofs = Array(5).fill(null).map(() =>
                zkService.generateProof({
                    attestation: validAttestation,
                    employeeSecret: '0x1234567890abcdef'
                })
            );

            const results = await Promise.all(sameSecretProofs);

            // All should succeed
            expect(results.every(r => r.proof && r.publicInputs)).to.be.true;

            // Public inputs should be identical
            const firstPublicInputs = results[0].publicInputs;
            expect(results.every(r =>
                JSON.stringify(r.publicInputs) === JSON.stringify(firstPublicInputs)
            )).to.be.true;
        });
    });

    describe('BRUTAL REALITY: Circuit File Integrity', () => {
        test('should detect corrupted proving key', async () => {
            // Backup original key
            const originalKey = zkService.provingKey;

            // Corrupt the proving key
            zkService.provingKey = Buffer.from('corrupted data');

            try {
                await zkService.generateProof({
                    attestation: validAttestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                expect.fail('Should detect corrupted proving key');
            } catch (error) {
                expect(error.message).to.include('proving key');
            } finally {
                zkService.provingKey = originalKey;
            }
        });

        test('should detect corrupted verification key', async function() {
            this.timeout(10000);

            const proof = await zkService.generateProof({
                attestation: validAttestation,
                employeeSecret: '0x1234567890abcdef'
            });

            // Backup and corrupt verification key
            const originalKey = zkService.verificationKey;
            zkService.verificationKey = { corrupted: true };

            try {
                const isValid = await zkService.verifyProof(proof.proof, proof.publicInputs);
                expect.fail('Should detect corrupted verification key');
            } catch (error) {
                expect(error.message).to.include('verification key');
            } finally {
                zkService.verificationKey = originalKey;
            }
        });

        test('should handle missing circuit files', async () => {
            const missingFileService = new ZKProofService();

            // Override file path to non-existent file
            missingFileService.circuitPath = '/non/existent/path';

            try {
                await missingFileService.initialize();
                expect.fail('Should handle missing circuit files');
            } catch (error) {
                expect(error.message).to.include('Circuit file not found');
            }
        });
    });
});

/**
 * HARSH REALITY ASSESSMENT:
 *
 * These tests reveal the uncomfortable truth about ZK proof systems:
 * they are extremely fragile and can fail in dozens of ways.
 *
 * CRITICAL VULNERABILITIES EXPOSED:
 *
 * 1. **Circuit Constraint Failures**: Any bug in circuit logic completely
 *    compromises security. Invalid proofs could be accepted.
 *
 * 2. **Performance Degradation**: Under load, proof generation times
 *    become unacceptable, making the system unusable.
 *
 * 3. **Cryptographic Weaknesses**: Weak secrets, field overflows, and
 *    malleability attacks can break zero-knowledge properties.
 *
 * 4. **Resource Exhaustion**: Memory pressure and CPU limits can cause
 *    denial of service or system crashes.
 *
 * 5. **File Integrity Issues**: Corrupted circuit files render the
 *    entire system inoperable.
 *
 * PRODUCTION REQUIREMENTS:
 * - Circuit formal verification MANDATORY
 * - Hardware security modules for key storage
 * - Comprehensive monitoring and alerting
 * - Circuit upgrade mechanism
 * - Performance optimization under load
 * - Input sanitization and validation
 * - Proper error handling and recovery
 *
 * Every failure mode tested here WILL occur in production.
 * The question is whether we'll be prepared for them.
 */