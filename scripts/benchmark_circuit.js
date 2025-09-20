#!/usr/bin/env node

/**
 * Performance Benchmarking Suite for WageProof ZK Circuit
 *
 * This script measures and reports detailed performance metrics for the
 * wage proof circuit to ensure it meets the <5 second proof generation target.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CONFIG = {
    circuitName: 'wage_proof',
    buildDir: path.join(__dirname, '../circuits/build'),
    iterations: 10,
    targetProofTime: 5000, // 5 seconds target
    warmupRuns: 2
};

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class PerformanceBenchmark {
    constructor() {
        this.results = {
            witnessGeneration: [],
            proofGeneration: [],
            proofVerification: [],
            memoryUsage: [],
            circuitStats: null
        };
    }

    log(message, color = colors.reset) {
        console.log(`${color}${message}${colors.reset}`);
    }

    async checkSetup() {
        this.log('🔍 Checking circuit build setup...', colors.cyan);

        const requiredFiles = [
            `${CONFIG.buildDir}/${CONFIG.circuitName}.r1cs`,
            `${CONFIG.buildDir}/${CONFIG.circuitName}_js/${CONFIG.circuitName}.wasm`,
            `${CONFIG.buildDir}/${CONFIG.circuitName}_final.zkey`,
            `${CONFIG.buildDir}/verification_key.json`
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file not found: ${file}\nPlease run build_circuit.sh first.`);
            }
        }

        this.log(' All required files found', colors.green);
    }

    generateTestInput() {
        // Generate randomized test inputs for more realistic benchmarking
        const randomSeed = Math.floor(Math.random() * 1000000);

        return {
            employerPrivKey: (12345 + randomSeed).toString(),
            r: (123456789 + randomSeed).toString(),
            s: (987654321 + randomSeed).toString(),
            employeeSecret: (54321 + randomSeed).toString(),
            wageAmount: (1000000000000000000 + randomSeed * 1000).toString(),
            periodNonce: randomSeed.toString(),
            employerID: (1001 + (randomSeed % 100)).toString(),
            employeeWallet: `0x742d35Cc6644C7532905C2D2C0f6E88F4c1C7E${randomSeed.toString(16).slice(-2)}`,
            periodID: (202409 + (randomSeed % 12)).toString(),
            timestamp: (1726790400 + randomSeed * 86400).toString(),
            nullifierHash: (789456123 + randomSeed).toString(),
            wageCommitment: (456789123 + randomSeed).toString(),
            employerPubKeyHash: (159753486 + randomSeed).toString(),
            minWageThreshold: "500000000000000000",
            maxWageThreshold: "5000000000000000000"
        };
    }

    async measureWitnessGeneration() {
        this.log('🧮 Benchmarking witness generation...', colors.yellow);

        for (let i = 0; i < CONFIG.iterations + CONFIG.warmupRuns; i++) {
            const input = this.generateTestInput();
            const inputFile = `${CONFIG.buildDir}/bench_input_${i}.json`;

            // Write input file
            fs.writeFileSync(inputFile, JSON.stringify(input, null, 2));

            const startTime = process.hrtime.bigint();
            const startMem = process.memoryUsage();

            try {
                await execAsync(
                    `node ${CONFIG.buildDir}/${CONFIG.circuitName}_js/generate_witness.js ` +
                    `${CONFIG.buildDir}/${CONFIG.circuitName}_js/${CONFIG.circuitName}.wasm ` +
                    `${inputFile} ${CONFIG.buildDir}/bench_witness_${i}.wtns`,
                    { timeout: 30000 }
                );

                const endTime = process.hrtime.bigint();
                const endMem = process.memoryUsage();

                const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                const memoryDelta = endMem.heapUsed - startMem.heapUsed;

                // Skip warmup runs
                if (i >= CONFIG.warmupRuns) {
                    this.results.witnessGeneration.push(duration);
                    this.results.memoryUsage.push(memoryDelta);
                }

                this.log(`  Run ${i + 1}: ${duration.toFixed(2)}ms`, colors.dim);

            } catch (error) {
                this.log(` Witness generation failed on run ${i + 1}: ${error.message}`, colors.red);
                throw error;
            } finally {
                // Cleanup temp files
                if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
                const witnessFile = `${CONFIG.buildDir}/bench_witness_${i}.wtns`;
                if (fs.existsSync(witnessFile)) fs.unlinkSync(witnessFile);
            }
        }
    }

    async measureProofGeneration() {
        this.log('🔐 Benchmarking proof generation...', colors.yellow);

        // Use a consistent witness for proof generation benchmarks
        const input = this.generateTestInput();
        const inputFile = `${CONFIG.buildDir}/bench_input_proof.json`;
        const witnessFile = `${CONFIG.buildDir}/bench_witness_proof.wtns`;

        fs.writeFileSync(inputFile, JSON.stringify(input, null, 2));

        // Generate witness once
        await execAsync(
            `node ${CONFIG.buildDir}/${CONFIG.circuitName}_js/generate_witness.js ` +
            `${CONFIG.buildDir}/${CONFIG.circuitName}_js/${CONFIG.circuitName}.wasm ` +
            `${inputFile} ${witnessFile}`
        );

        for (let i = 0; i < CONFIG.iterations + CONFIG.warmupRuns; i++) {
            const proofFile = `${CONFIG.buildDir}/bench_proof_${i}.json`;
            const publicFile = `${CONFIG.buildDir}/bench_public_${i}.json`;

            const startTime = process.hrtime.bigint();

            try {
                await execAsync(
                    `snarkjs groth16 prove ${CONFIG.buildDir}/${CONFIG.circuitName}_final.zkey ` +
                    `${witnessFile} ${proofFile} ${publicFile}`,
                    { timeout: 60000 }
                );

                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

                // Skip warmup runs
                if (i >= CONFIG.warmupRuns) {
                    this.results.proofGeneration.push(duration);
                }

                this.log(`  Run ${i + 1}: ${duration.toFixed(2)}ms`, colors.dim);

            } catch (error) {
                this.log(` Proof generation failed on run ${i + 1}: ${error.message}`, colors.red);
                throw error;
            } finally {
                // Cleanup temp files
                if (fs.existsSync(proofFile)) fs.unlinkSync(proofFile);
                if (fs.existsSync(publicFile)) fs.unlinkSync(publicFile);
            }
        }

        // Cleanup
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(witnessFile)) fs.unlinkSync(witnessFile);
    }

    async measureProofVerification() {
        this.log(' Benchmarking proof verification...', colors.yellow);

        // Generate one proof for verification benchmarks
        const input = this.generateTestInput();
        const inputFile = `${CONFIG.buildDir}/bench_input_verify.json`;
        const witnessFile = `${CONFIG.buildDir}/bench_witness_verify.wtns`;
        const proofFile = `${CONFIG.buildDir}/bench_proof_verify.json`;
        const publicFile = `${CONFIG.buildDir}/bench_public_verify.json`;

        fs.writeFileSync(inputFile, JSON.stringify(input, null, 2));

        await execAsync(
            `node ${CONFIG.buildDir}/${CONFIG.circuitName}_js/generate_witness.js ` +
            `${CONFIG.buildDir}/${CONFIG.circuitName}_js/${CONFIG.circuitName}.wasm ` +
            `${inputFile} ${witnessFile}`
        );

        await execAsync(
            `snarkjs groth16 prove ${CONFIG.buildDir}/${CONFIG.circuitName}_final.zkey ` +
            `${witnessFile} ${proofFile} ${publicFile}`
        );

        for (let i = 0; i < CONFIG.iterations + CONFIG.warmupRuns; i++) {
            const startTime = process.hrtime.bigint();

            try {
                await execAsync(
                    `snarkjs groth16 verify ${CONFIG.buildDir}/verification_key.json ` +
                    `${publicFile} ${proofFile}`,
                    { timeout: 10000 }
                );

                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

                // Skip warmup runs
                if (i >= CONFIG.warmupRuns) {
                    this.results.proofVerification.push(duration);
                }

                this.log(`  Run ${i + 1}: ${duration.toFixed(2)}ms`, colors.dim);

            } catch (error) {
                this.log(` Proof verification failed on run ${i + 1}: ${error.message}`, colors.red);
                throw error;
            }
        }

        // Cleanup
        [inputFile, witnessFile, proofFile, publicFile].forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });
    }

    async getCircuitStatistics() {
        this.log('📊 Gathering circuit statistics...', colors.cyan);

        try {
            const { stdout } = await execAsync(
                `snarkjs r1cs info ${CONFIG.buildDir}/${CONFIG.circuitName}.r1cs`
            );

            const lines = stdout.split('\n');
            const stats = {};

            lines.forEach(line => {
                if (line.includes('Number of wires:')) {
                    stats.wires = parseInt(line.split(':')[1].trim());
                }
                if (line.includes('Number of constraints:')) {
                    stats.constraints = parseInt(line.split(':')[1].trim());
                }
                if (line.includes('Number of private inputs:')) {
                    stats.privateInputs = parseInt(line.split(':')[1].trim());
                }
                if (line.includes('Number of public inputs:')) {
                    stats.publicInputs = parseInt(line.split(':')[1].trim());
                }
            });

            this.results.circuitStats = stats;

        } catch (error) {
            this.log(` Failed to get circuit statistics: ${error.message}`, colors.red);
        }
    }

    calculateStatistics(data) {
        if (data.length === 0) return { mean: 0, median: 0, min: 0, max: 0, std: 0 };

        const sorted = [...data].sort((a, b) => a - b);
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        const std = Math.sqrt(variance);

        return {
            mean: mean,
            median: median,
            min: Math.min(...data),
            max: Math.max(...data),
            std: std
        };
    }

    generateReport() {
        this.log('\n📈 PERFORMANCE BENCHMARK REPORT', colors.bright + colors.cyan);
        this.log('=' * 60, colors.cyan);

        // Circuit Statistics
        if (this.results.circuitStats) {
            this.log('\n🔧 Circuit Statistics:', colors.bright);
            this.log(`  Constraints: ${this.results.circuitStats.constraints?.toLocaleString() || 'N/A'}`);
            this.log(`  Wires: ${this.results.circuitStats.wires?.toLocaleString() || 'N/A'}`);
            this.log(`  Private Inputs: ${this.results.circuitStats.privateInputs || 'N/A'}`);
            this.log(`  Public Inputs: ${this.results.circuitStats.publicInputs || 'N/A'}`);
        }

        // Witness Generation
        const witnessStats = this.calculateStatistics(this.results.witnessGeneration);
        this.log('\n🧮 Witness Generation Performance:', colors.bright);
        this.log(`  Mean: ${witnessStats.mean.toFixed(2)}ms`);
        this.log(`  Median: ${witnessStats.median.toFixed(2)}ms`);
        this.log(`  Min: ${witnessStats.min.toFixed(2)}ms`);
        this.log(`  Max: ${witnessStats.max.toFixed(2)}ms`);
        this.log(`  Std Dev: ${witnessStats.std.toFixed(2)}ms`);

        // Proof Generation
        const proofStats = this.calculateStatistics(this.results.proofGeneration);
        this.log('\n🔐 Proof Generation Performance:', colors.bright);
        this.log(`  Mean: ${proofStats.mean.toFixed(2)}ms`);
        this.log(`  Median: ${proofStats.median.toFixed(2)}ms`);
        this.log(`  Min: ${proofStats.min.toFixed(2)}ms`);
        this.log(`  Max: ${proofStats.max.toFixed(2)}ms`);
        this.log(`  Std Dev: ${proofStats.std.toFixed(2)}ms`);

        // Target Analysis
        const targetMet = proofStats.mean < CONFIG.targetProofTime;
        const targetColor = targetMet ? colors.green : colors.red;
        const targetStatus = targetMet ? ' PASSED' : ' FAILED';

        this.log(`\n🎯 Target Analysis (${CONFIG.targetProofTime}ms):`, colors.bright);
        this.log(`  Status: ${targetStatus}`, targetColor);
        this.log(`  Performance: ${((proofStats.mean / CONFIG.targetProofTime) * 100).toFixed(1)}% of target`);

        // Proof Verification
        const verifyStats = this.calculateStatistics(this.results.proofVerification);
        this.log('\n Proof Verification Performance:', colors.bright);
        this.log(`  Mean: ${verifyStats.mean.toFixed(2)}ms`);
        this.log(`  Median: ${verifyStats.median.toFixed(2)}ms`);
        this.log(`  Min: ${verifyStats.min.toFixed(2)}ms`);
        this.log(`  Max: ${verifyStats.max.toFixed(2)}ms`);

        // Memory Usage
        const memoryStats = this.calculateStatistics(this.results.memoryUsage);
        this.log('\n💾 Memory Usage (Witness Generation):', colors.bright);
        this.log(`  Mean: ${(memoryStats.mean / 1024 / 1024).toFixed(2)}MB`);
        this.log(`  Peak: ${(memoryStats.max / 1024 / 1024).toFixed(2)}MB`);

        // Recommendations
        this.log('\n💡 Recommendations:', colors.bright + colors.yellow);
        if (!targetMet) {
            this.log(`    Proof generation exceeds ${CONFIG.targetProofTime}ms target`);
            this.log(`  🔧 Consider optimizing circuit constraints`);
            this.log(`  🔧 Review ECDSA implementation for efficiency`);
        } else {
            this.log(`   Performance target met!`);
        }

        if (this.results.circuitStats?.constraints > 50000) {
            this.log(`    High constraint count (${this.results.circuitStats.constraints})`);
            this.log(`  🔧 Consider simplifying circuit logic`);
        }

        this.log('\n' + '=' * 60, colors.cyan);

        return {
            targetMet,
            witnessGeneration: witnessStats,
            proofGeneration: proofStats,
            proofVerification: verifyStats,
            memoryUsage: memoryStats,
            circuitStats: this.results.circuitStats
        };
    }

    async run() {
        try {
            this.log('🚀 Starting ZK Circuit Performance Benchmark', colors.bright + colors.green);
            this.log(`Iterations: ${CONFIG.iterations} (+ ${CONFIG.warmupRuns} warmup)`, colors.dim);

            await this.checkSetup();
            await this.getCircuitStatistics();
            await this.measureWitnessGeneration();
            await this.measureProofGeneration();
            await this.measureProofVerification();

            const report = this.generateReport();

            // Save detailed results
            const resultsFile = `${CONFIG.buildDir}/benchmark_results.json`;
            fs.writeFileSync(resultsFile, JSON.stringify({
                timestamp: new Date().toISOString(),
                config: CONFIG,
                results: this.results,
                summary: report
            }, null, 2));

            this.log(`\n📁 Detailed results saved to: ${resultsFile}`, colors.dim);

            return report;

        } catch (error) {
            this.log(`\n Benchmark failed: ${error.message}`, colors.red);
            process.exit(1);
        }
    }
}

// Run benchmark if called directly
if (require.main === module) {
    const benchmark = new PerformanceBenchmark();
    benchmark.run().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Benchmark failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceBenchmark;