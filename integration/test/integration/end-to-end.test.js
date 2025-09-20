/**
 * Stream Protocol End-to-End Integration Tests
 *
 * Tests the complete flow from attestation creation to proof verification
 */

const { ethers } = require('ethers');
const DatabaseManager = require('../../database/DatabaseManager');
const StreamDemo = require('../../cli/stream-demo');

describe('Stream Protocol End-to-End Integration', () => {
    let db;
    let provider;
    let contracts;
    let testAttestation;

    beforeAll(async () => {
        // Setup test environment
        db = new DatabaseManager({
            database: 'stream_protocol_test',
            user: 'test_user',
            password: 'test_password'
        });

        await db.connect();

        // Connect to local blockchain
        provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

        // Load deployed contracts
        const deployments = require('../../contracts/deployments/localhost.json');
        contracts = {
            streamCore: new ethers.Contract(
                deployments.StreamCore,
                require('../../contracts/artifacts/contracts/core/StreamCore.sol/StreamCore.json').abi,
                provider
            ),
            stablecoinPool: new ethers.Contract(
                deployments.StablecoinPool,
                require('../../contracts/artifacts/contracts/core/StablecoinPool.sol/StablecoinPool.json').abi,
                provider
            ),
            employerRegistry: new ethers.Contract(
                deployments.EmployerRegistry,
                require('../../contracts/artifacts/contracts/core/EmployerRegistry.sol/EmployerRegistry.json').abi,
                provider
            )
        };
    }, 30000);

    afterAll(async () => {
        if (db) {
            await db.disconnect();
        }
    });

    describe('Complete Wage Advance Flow', () => {
        test('should create valid employer attestation', async () => {
            const AttestationService = require('../../../attestation-service/src/app');
            const attestationService = new AttestationService();

            const attestationRequest = {
                employerId: 'test-starbucks',
                employeeWallet: '0x1234567890123456789012345678901234567890',
                hoursWorked: 8.0,
                hourlyRate: 18.00,
                periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
                periodEnd: new Date()
            };

            const attestation = await attestationService.createAttestation(attestationRequest);

            expect(attestation).toBeDefined();
            expect(attestation.employerId).toBe('test-starbucks');
            expect(attestation.wageAmount).toBe(1440); // 8 hours * $18.00 * 100 cents
            expect(attestation.signature).toBeDefined();
            expect(attestation.nullifier).toBeDefined();

            // Store for later tests
            testAttestation = attestation;
            await db.storeAttestation(attestation);
        }, 10000);

        test('should generate valid ZK proof from attestation', async () => {
            expect(testAttestation).toBeDefined();

            const ZKProofService = require('../../../circuits/src/zkproof_service');
            const zkService = new ZKProofService();

            await zkService.initialize();

            const startTime = Date.now();
            const proof = await zkService.generateProof({
                attestation: testAttestation,
                employeeSecret: '0x1234567890abcdef'
            });
            const duration = Date.now() - startTime;

            expect(proof).toBeDefined();
            expect(proof.proof).toBeDefined();
            expect(proof.publicInputs).toBeDefined();
            expect(proof.publicInputs).toHaveLength(3); // [nullifier, amount, employerHash]

            // Performance check
            expect(duration).toBeLessThan(5000); // Must be under 5 seconds

            console.log(` ZK Proof generated in ${duration}ms (Target: <5000ms)`);

            // Store proof for contract test
            testAttestation.proof = proof;

            // Log performance metric
            await db.logPerformanceMetric('zk_proof_generation', duration, {
                attestationId: testAttestation.id,
                employerId: testAttestation.employerId
            });
        }, 15000);

        test('should verify proof on smart contract', async () => {
            expect(testAttestation.proof).toBeDefined();

            const signer = provider.getSigner(0);
            const streamCoreWithSigner = contracts.streamCore.connect(signer);

            // Check initial nullifier state
            const nullifierUsed = await contracts.streamCore.usedNullifiers(
                testAttestation.proof.publicInputs[0]
            );
            expect(nullifierUsed).toBe(false);

            // Submit proof
            const startTime = Date.now();
            const tx = await streamCoreWithSigner.claimWages(
                testAttestation.proof.proof,
                testAttestation.proof.publicInputs,
                { gasLimit: 200000 }
            );

            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.toNumber();
            const duration = Date.now() - startTime;

            expect(receipt.status).toBe(1); // Success
            expect(gasUsed).toBeLessThan(150000); // Gas target

            console.log(` Smart contract verification: ${gasUsed} gas (Target: <150k)`);

            // Check nullifier is now used
            const nullifierNowUsed = await contracts.streamCore.usedNullifiers(
                testAttestation.proof.publicInputs[0]
            );
            expect(nullifierNowUsed).toBe(true);

            // Store transaction data
            await db.storeProofSubmission({
                id: `proof_${testAttestation.id}`,
                attestationId: testAttestation.id,
                proofHash: ethers.utils.keccak256(ethers.utils.arrayify(testAttestation.proof.proof[0])),
                publicInputs: testAttestation.proof.publicInputs,
                transactionHash: receipt.transactionHash,
                claimedAmount: testAttestation.wageAmount,
                gasUsed: gasUsed
            });

            // Mark attestation as claimed
            await db.markAttestationClaimed(testAttestation.id, receipt.transactionHash);

            // Log performance metric
            await db.logPerformanceMetric('smart_contract_verification', duration, {
                gasUsed,
                transactionHash: receipt.transactionHash
            });
        }, 30000);

        test('should prevent double-spending with nullifier', async () => {
            expect(testAttestation.proof).toBeDefined();

            const signer = provider.getSigner(0);
            const streamCoreWithSigner = contracts.streamCore.connect(signer);

            // Try to submit the same proof again
            await expect(
                streamCoreWithSigner.claimWages(
                    testAttestation.proof.proof,
                    testAttestation.proof.publicInputs,
                    { gasLimit: 200000 }
                )
            ).rejects.toThrow();

            console.log(' Double-spend prevention working correctly');
        }, 10000);
    });

    describe('Database Integration', () => {
        test('should store and retrieve attestations correctly', async () => {
            const testData = {
                id: 'test-attestation-123',
                employerId: 'test-employer',
                employeeWallet: '0x9876543210987654321098765432109876543210',
                wageAmount: 2000,
                periodStart: new Date(),
                periodEnd: new Date(),
                hoursWorked: 10,
                hourlyRate: 20,
                periodNonce: 'test-nonce-123',
                signature: '0xtest-signature',
                nullifier: '0xtest-nullifier'
            };

            // Store attestation
            const id = await db.storeAttestation(testData);
            expect(id).toBe(testData.id);

            // Retrieve attestation
            const retrieved = await db.getAttestation(testData.id);
            expect(retrieved).toBeDefined();
            expect(retrieved.employerId).toBe(testData.employerId);
            expect(retrieved.wageAmount).toBe(testData.wageAmount);

            // Test nullifier checking
            const nullifierExists = await db.checkNullifier(testData.nullifier);
            expect(nullifierExists).toBe(false); // Not claimed yet

            await db.markNullifierUsed(testData.nullifier);
            const nullifierNowExists = await db.checkNullifier(testData.nullifier);
            expect(nullifierNowExists).toBe(true);
        });

        test('should handle caching correctly', async () => {
            const testEmployer = {
                id: 'cache-test-employer',
                name: 'Cache Test Corp',
                publicKey: '0xtest-public-key',
                stakeAmount: 5000
            };

            // Register employer
            await db.registerEmployer(testEmployer);

            // First retrieval (database)
            const startTime1 = Date.now();
            const employer1 = await db.getEmployer(testEmployer.id);
            const duration1 = Date.now() - startTime1;

            // Second retrieval (cache)
            const startTime2 = Date.now();
            const employer2 = await db.getEmployer(testEmployer.id);
            const duration2 = Date.now() - startTime2;

            expect(employer1).toEqual(employer2);
            expect(duration2).toBeLessThan(duration1); // Cache should be faster

            console.log(`Database: ${duration1}ms, Cache: ${duration2}ms`);
        });
    });

    describe('Performance Metrics', () => {
        test('should meet performance targets', async () => {
            const metrics = await db.getPerformanceMetrics();

            // Find ZK proof generation metrics
            const zkMetrics = metrics.filter(m => m.operation === 'zk_proof_generation');
            if (zkMetrics.length > 0) {
                const avgDuration = zkMetrics.reduce((sum, m) => sum + m.duration, 0) / zkMetrics.length;
                expect(avgDuration).toBeLessThan(5000);
                console.log(` Average ZK proof generation: ${avgDuration.toFixed(0)}ms`);
            }

            // Find smart contract verification metrics
            const contractMetrics = metrics.filter(m => m.operation === 'smart_contract_verification');
            if (contractMetrics.length > 0) {
                const avgDuration = contractMetrics.reduce((sum, m) => sum + m.duration, 0) / contractMetrics.length;
                expect(avgDuration).toBeLessThan(30000); // 30 seconds including network
                console.log(` Average contract verification: ${avgDuration.toFixed(0)}ms`);
            }
        });

        test('should generate system statistics', async () => {
            const stats = await db.getSystemStats();

            expect(stats).toBeDefined();
            expect(typeof stats.totalEmployers).toBe('number');
            expect(typeof stats.totalAttestations).toBe('number');
            expect(typeof stats.totalProofs).toBe('number');
            expect(typeof stats.totalVolume).toBe('number');

            console.log('📊 System Statistics:');
            console.log(`  Employers: ${stats.totalEmployers}`);
            console.log(`  Attestations: ${stats.totalAttestations}`);
            console.log(`  Proofs: ${stats.totalProofs}`);
            console.log(`  Volume: $${stats.totalVolume}`);
        });
    });

    describe('Rate Limiting', () => {
        test('should enforce rate limits', async () => {
            const identifier = 'test-user-123';
            const limit = 5;
            const window = 60;

            // Test within limits
            for (let i = 0; i < limit; i++) {
                const result = await db.checkRateLimit(identifier, limit, window);
                expect(result.allowed).toBe(true);
                expect(result.current).toBe(i + 1);
            }

            // Test exceeding limits
            const exceededResult = await db.checkRateLimit(identifier, limit, window);
            expect(exceededResult.allowed).toBe(false);
            expect(exceededResult.current).toBe(limit + 1);

            console.log(' Rate limiting working correctly');
        });
    });

    describe('Health Checks', () => {
        test('should report system health', async () => {
            const health = await db.healthCheck();

            expect(health).toBeDefined();
            expect(health.postgresql).toBe(true);
            expect(health.redis).toBe(true);
            expect(health.timestamp).toBeDefined();

            console.log(' All systems healthy');
        });
    });
});