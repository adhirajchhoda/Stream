/**
 * Stream Protocol Performance Benchmark Tool
 *
 * Comprehensive performance testing for all system components
 */

const chalk = require('chalk');
const ora = require('ora');
const { table } = require('table');
const { ethers } = require('ethers');
const DatabaseManager = require('../database/DatabaseManager');

class StreamBenchmark {
    constructor() {
        this.results = {
            zkProofGeneration: [],
            smartContractVerification: [],
            databaseOperations: [],
            endToEndFlow: []
        };
    }

    async run() {
        console.log(chalk.blue.bold('\n🚀 STREAM PROTOCOL PERFORMANCE BENCHMARK\n'));

        await this.initializeComponents();

        // Run all benchmark suites
        await this.benchmarkZKProofGeneration();
        await this.benchmarkSmartContractVerification();
        await this.benchmarkDatabaseOperations();
        await this.benchmarkEndToEndFlow();

        // Generate comprehensive report
        this.generateReport();
    }

    async initializeComponents() {
        const spinner = ora('Initializing benchmark environment...').start();

        try {
            // Initialize database
            this.db = new DatabaseManager();
            await this.db.connect();

            // Initialize blockchain connection
            this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

            // Load contracts
            const deployments = require('../../contracts/deployments/localhost.json');
            this.contracts = {
                streamCore: new ethers.Contract(
                    deployments.StreamCore,
                    require('../../contracts/artifacts/contracts/core/StreamCore.sol/StreamCore.json').abi,
                    this.provider
                )
            };

            // Initialize ZK service
            const ZKProofService = require('../../circuits/src/zkproof_service');
            this.zkService = new ZKProofService();
            await this.zkService.initialize();

            // Initialize attestation service
            const AttestationService = require('../../attestation-service/src/app');
            this.attestationService = new AttestationService();

            spinner.succeed('Benchmark environment initialized');
        } catch (error) {
            spinner.fail('Initialization failed');
            throw error;
        }
    }

    async benchmarkZKProofGeneration() {
        console.log(chalk.yellow('\n📊 ZK Proof Generation Benchmark'));

        const testCases = [
            { hours: 4, rate: 15, description: 'Small wage ($60)' },
            { hours: 8, rate: 18, description: 'Standard shift ($144)' },
            { hours: 12, rate: 25, description: 'Long shift ($300)' },
            { hours: 6, rate: 45, description: 'High-rate work ($270)' }
        ];

        for (const testCase of testCases) {
            const spinner = ora(`Testing ${testCase.description}...`).start();

            try {
                // Create test attestation
                const attestation = await this.createTestAttestation(testCase.hours, testCase.rate);

                // Benchmark proof generation (multiple runs)
                const runs = 5;
                const durations = [];

                for (let i = 0; i < runs; i++) {
                    const startTime = Date.now();
                    await this.zkService.generateProof({
                        attestation: attestation,
                        employeeSecret: '0x1234567890abcdef'
                    });
                    const duration = Date.now() - startTime;
                    durations.push(duration);
                }

                const avgDuration = durations.reduce((sum, d) => sum + d, 0) / runs;
                const minDuration = Math.min(...durations);
                const maxDuration = Math.max(...durations);

                this.results.zkProofGeneration.push({
                    testCase: testCase.description,
                    avgTime: avgDuration,
                    minTime: minDuration,
                    maxTime: maxDuration,
                    targetMet: avgDuration < 5000
                });

                const status = avgDuration < 5000 ? '✅' : '❌';
                spinner.succeed(`${testCase.description}: ${avgDuration.toFixed(0)}ms avg ${status}`);

            } catch (error) {
                spinner.fail(`${testCase.description}: ERROR`);
                console.error(chalk.red(`  ${error.message}`));
            }
        }
    }

    async benchmarkSmartContractVerification() {
        console.log(chalk.yellow('\n⛓️  Smart Contract Verification Benchmark'));

        const testCases = [
            { description: 'Valid proof verification' },
            { description: 'Batch proof verification (5 proofs)' },
            { description: 'Gas optimization analysis' }
        ];

        for (const testCase of testCases) {
            const spinner = ora(`Testing ${testCase.description}...`).start();

            try {
                if (testCase.description.includes('Batch')) {
                    await this.benchmarkBatchVerification();
                } else {
                    await this.benchmarkSingleVerification();
                }

                spinner.succeed(testCase.description);
            } catch (error) {
                spinner.fail(`${testCase.description}: ERROR`);
                console.error(chalk.red(`  ${error.message}`));
            }
        }
    }

    async benchmarkSingleVerification() {
        const attestation = await this.createTestAttestation(8, 20);
        const proof = await this.zkService.generateProof({
            attestation: attestation,
            employeeSecret: '0x1234567890abcdef'
        });

        const signer = this.provider.getSigner(0);
        const streamCoreWithSigner = this.contracts.streamCore.connect(signer);

        const runs = 3;
        const results = [];

        for (let i = 0; i < runs; i++) {
            const startTime = Date.now();

            // Estimate gas first
            const gasEstimate = await streamCoreWithSigner.estimateGas.claimWages(
                proof.proof,
                proof.publicInputs
            );

            const tx = await streamCoreWithSigner.claimWages(
                proof.proof,
                proof.publicInputs,
                { gasLimit: gasEstimate.mul(120).div(100) } // 20% buffer
            );

            const receipt = await tx.wait();
            const duration = Date.now() - startTime;

            results.push({
                duration,
                gasUsed: receipt.gasUsed.toNumber(),
                gasEstimate: gasEstimate.toNumber()
            });

            // Mark nullifier as unused for next test
            await this.resetNullifier(proof.publicInputs[0]);
        }

        const avgResult = {
            duration: results.reduce((sum, r) => sum + r.duration, 0) / runs,
            gasUsed: results.reduce((sum, r) => sum + r.gasUsed, 0) / runs,
            gasEstimate: results.reduce((sum, r) => sum + r.gasEstimate, 0) / runs
        };

        this.results.smartContractVerification.push({
            testCase: 'Single verification',
            avgTime: avgResult.duration,
            avgGas: avgResult.gasUsed,
            targetMet: avgResult.gasUsed < 150000
        });
    }

    async benchmarkBatchVerification() {
        // This would test multiple proofs in sequence
        const batchSize = 5;
        const totalStartTime = Date.now();

        for (let i = 0; i < batchSize; i++) {
            const attestation = await this.createTestAttestation(8, 20);
            const proof = await this.zkService.generateProof({
                attestation: attestation,
                employeeSecret: `0x123456789${i}abcdef`
            });

            const signer = this.provider.getSigner(0);
            const streamCoreWithSigner = this.contracts.streamCore.connect(signer);

            await streamCoreWithSigner.claimWages(
                proof.proof,
                proof.publicInputs,
                { gasLimit: 200000 }
            );
        }

        const totalDuration = Date.now() - totalStartTime;

        this.results.smartContractVerification.push({
            testCase: `Batch verification (${batchSize})`,
            avgTime: totalDuration / batchSize,
            totalTime: totalDuration,
            targetMet: (totalDuration / batchSize) < 30000
        });
    }

    async benchmarkDatabaseOperations() {
        console.log(chalk.yellow('\n💾 Database Operations Benchmark'));

        const operations = [
            { name: 'Store attestation', count: 100 },
            { name: 'Retrieve attestation', count: 200 },
            { name: 'Check nullifier', count: 500 },
            { name: 'Store proof submission', count: 100 }
        ];

        for (const operation of operations) {
            const spinner = ora(`Testing ${operation.name} (${operation.count} ops)...`).start();

            try {
                const startTime = Date.now();

                for (let i = 0; i < operation.count; i++) {
                    await this.performDatabaseOperation(operation.name, i);
                }

                const totalDuration = Date.now() - startTime;
                const avgDuration = totalDuration / operation.count;

                this.results.databaseOperations.push({
                    operation: operation.name,
                    totalTime: totalDuration,
                    avgTime: avgDuration,
                    count: operation.count,
                    targetMet: avgDuration < 50 // 50ms target
                });

                const status = avgDuration < 50 ? '✅' : '❌';
                spinner.succeed(`${operation.name}: ${avgDuration.toFixed(2)}ms avg ${status}`);

            } catch (error) {
                spinner.fail(`${operation.name}: ERROR`);
                console.error(chalk.red(`  ${error.message}`));
            }
        }
    }

    async performDatabaseOperation(operationName, index) {
        switch (operationName) {
            case 'Store attestation':
                const testAttestation = {
                    id: `bench-attestation-${index}`,
                    employerId: 'bench-employer',
                    employeeWallet: `0x${index.toString(16).padStart(40, '0')}`,
                    wageAmount: 1800,
                    periodStart: new Date(),
                    periodEnd: new Date(),
                    hoursWorked: 8,
                    hourlyRate: 18,
                    periodNonce: `bench-nonce-${index}`,
                    signature: `0xbench-signature-${index}`,
                    nullifier: `0xbench-nullifier-${index}`
                };
                await this.db.storeAttestation(testAttestation);
                break;

            case 'Retrieve attestation':
                const retrieveId = `bench-attestation-${index % 100}`; // Cycle through stored attestations
                await this.db.getAttestation(retrieveId);
                break;

            case 'Check nullifier':
                const nullifierHash = `0xbench-nullifier-${index}`;
                await this.db.checkNullifier(nullifierHash);
                break;

            case 'Store proof submission':
                const proofData = {
                    id: `bench-proof-${index}`,
                    attestationId: `bench-attestation-${index % 100}`,
                    proofHash: `0xbench-proof-hash-${index}`,
                    publicInputs: [index, 1800, index + 1000],
                    transactionHash: `0xbench-tx-${index}`,
                    claimedAmount: 1800,
                    gasUsed: 120000
                };
                await this.db.storeProofSubmission(proofData);
                break;
        }
    }

    async benchmarkEndToEndFlow() {
        console.log(chalk.yellow('\n🔄 End-to-End Flow Benchmark'));

        const scenarios = [
            { hours: 8, rate: 18, description: 'Standard flow' },
            { hours: 4, rate: 25, description: 'Quick shift' }
        ];

        for (const scenario of scenarios) {
            const spinner = ora(`Testing ${scenario.description}...`).start();

            try {
                const overallStartTime = Date.now();

                // Step 1: Create attestation
                const attestationStartTime = Date.now();
                const attestation = await this.createTestAttestation(scenario.hours, scenario.rate);
                await this.db.storeAttestation(attestation);
                const attestationDuration = Date.now() - attestationStartTime;

                // Step 2: Generate ZK proof
                const proofStartTime = Date.now();
                const proof = await this.zkService.generateProof({
                    attestation: attestation,
                    employeeSecret: '0x1234567890abcdef'
                });
                const proofDuration = Date.now() - proofStartTime;

                // Step 3: Submit to contract
                const contractStartTime = Date.now();
                const signer = this.provider.getSigner(0);
                const streamCoreWithSigner = this.contracts.streamCore.connect(signer);

                const tx = await streamCoreWithSigner.claimWages(
                    proof.proof,
                    proof.publicInputs,
                    { gasLimit: 200000 }
                );
                await tx.wait();
                const contractDuration = Date.now() - contractStartTime;

                const totalDuration = Date.now() - overallStartTime;

                this.results.endToEndFlow.push({
                    scenario: scenario.description,
                    totalTime: totalDuration,
                    attestationTime: attestationDuration,
                    proofTime: proofDuration,
                    contractTime: contractDuration,
                    targetMet: totalDuration < 60000 // 60 seconds target
                });

                const status = totalDuration < 60000 ? '✅' : '❌';
                spinner.succeed(`${scenario.description}: ${totalDuration.toFixed(0)}ms total ${status}`);

                // Reset for next test
                await this.resetNullifier(proof.publicInputs[0]);

            } catch (error) {
                spinner.fail(`${scenario.description}: ERROR`);
                console.error(chalk.red(`  ${error.message}`));
            }
        }
    }

    generateReport() {
        console.log(chalk.green.bold('\n📋 COMPREHENSIVE PERFORMANCE REPORT\n'));

        // ZK Proof Generation Report
        console.log(chalk.blue('🔐 ZK Proof Generation Performance:'));
        const zkTableData = [
            ['Test Case', 'Avg Time (ms)', 'Min Time (ms)', 'Max Time (ms)', 'Target Met']
        ];

        this.results.zkProofGeneration.forEach(result => {
            zkTableData.push([
                result.testCase,
                result.avgTime.toFixed(0),
                result.minTime.toFixed(0),
                result.maxTime.toFixed(0),
                result.targetMet ? '✅' : '❌'
            ]);
        });

        console.log(table(zkTableData));

        // Smart Contract Report
        console.log(chalk.blue('⛓️  Smart Contract Performance:'));
        const contractTableData = [
            ['Test Case', 'Avg Time (ms)', 'Avg Gas', 'Target Met']
        ];

        this.results.smartContractVerification.forEach(result => {
            contractTableData.push([
                result.testCase,
                result.avgTime ? result.avgTime.toFixed(0) : 'N/A',
                result.avgGas ? result.avgGas.toFixed(0) : 'N/A',
                result.targetMet ? '✅' : '❌'
            ]);
        });

        console.log(table(contractTableData));

        // Database Report
        console.log(chalk.blue('💾 Database Performance:'));
        const dbTableData = [
            ['Operation', 'Operations', 'Total Time (ms)', 'Avg Time (ms)', 'Target Met']
        ];

        this.results.databaseOperations.forEach(result => {
            dbTableData.push([
                result.operation,
                result.count.toString(),
                result.totalTime.toFixed(0),
                result.avgTime.toFixed(2),
                result.targetMet ? '✅' : '❌'
            ]);
        });

        console.log(table(dbTableData));

        // End-to-End Report
        console.log(chalk.blue('🔄 End-to-End Flow Performance:'));
        const e2eTableData = [
            ['Scenario', 'Total (ms)', 'Attestation (ms)', 'Proof (ms)', 'Contract (ms)', 'Target Met']
        ];

        this.results.endToEndFlow.forEach(result => {
            e2eTableData.push([
                result.scenario,
                result.totalTime.toFixed(0),
                result.attestationTime.toFixed(0),
                result.proofTime.toFixed(0),
                result.contractTime.toFixed(0),
                result.targetMet ? '✅' : '❌'
            ]);
        });

        console.log(table(e2eTableData));

        // Overall Assessment
        this.generateOverallAssessment();
    }

    generateOverallAssessment() {
        console.log(chalk.green.bold('\n🎯 OVERALL PERFORMANCE ASSESSMENT\n'));

        const assessments = [];

        // Check ZK proof generation
        const zkPassed = this.results.zkProofGeneration.every(r => r.targetMet);
        assessments.push({
            component: 'ZK Proof Generation',
            target: '<5 seconds',
            status: zkPassed ? 'PASS' : 'FAIL',
            color: zkPassed ? 'green' : 'red'
        });

        // Check smart contract verification
        const contractPassed = this.results.smartContractVerification.every(r => r.targetMet);
        assessments.push({
            component: 'Smart Contract Verification',
            target: '<150k gas',
            status: contractPassed ? 'PASS' : 'FAIL',
            color: contractPassed ? 'green' : 'red'
        });

        // Check database operations
        const dbPassed = this.results.databaseOperations.every(r => r.targetMet);
        assessments.push({
            component: 'Database Operations',
            target: '<50ms avg',
            status: dbPassed ? 'PASS' : 'FAIL',
            color: dbPassed ? 'green' : 'red'
        });

        // Check end-to-end flow
        const e2ePassed = this.results.endToEndFlow.every(r => r.targetMet);
        assessments.push({
            component: 'End-to-End Flow',
            target: '<60 seconds',
            status: e2ePassed ? 'PASS' : 'FAIL',
            color: e2ePassed ? 'green' : 'red'
        });

        assessments.forEach(assessment => {
            const statusColor = assessment.color === 'green' ? chalk.green : chalk.red;
            console.log(`${assessment.component}: ${statusColor(assessment.status)} (${assessment.target})`);
        });

        const overallPassed = assessments.every(a => a.status === 'PASS');
        const overallStatus = overallPassed ? '✅ ALL TARGETS MET' : '❌ SOME TARGETS MISSED';
        const overallColor = overallPassed ? chalk.green.bold : chalk.red.bold;

        console.log(`\n${overallColor(overallStatus)}\n`);

        if (overallPassed) {
            console.log(chalk.green('🎉 Stream Protocol is ready for production deployment!'));
        } else {
            console.log(chalk.yellow('⚠️  Some performance optimizations needed before production.'));
        }
    }

    // Helper methods
    async createTestAttestation(hours, rate) {
        const attestationRequest = {
            employerId: 'benchmark-employer',
            employeeWallet: '0x' + Math.random().toString(16).substr(2, 40),
            hoursWorked: hours,
            hourlyRate: rate,
            periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
            periodEnd: new Date()
        };

        return await this.attestationService.createAttestation(attestationRequest);
    }

    async resetNullifier(nullifierHash) {
        // In a real system, this would be handled by using different attestations
        // For benchmarking, we simulate by clearing the nullifier from our test contract
        try {
            await this.db.redis.del(`nullifier:${nullifierHash}`);
        } catch (error) {
            // Ignore errors for benchmark
        }
    }
}

// CLI execution
if (require.main === module) {
    const benchmark = new StreamBenchmark();

    benchmark.run().catch(error => {
        console.error(chalk.red('\n❌ Benchmark failed:'), error.message);
        process.exit(1);
    });
}

module.exports = StreamBenchmark;