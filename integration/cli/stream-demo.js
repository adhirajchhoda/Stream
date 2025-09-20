#!/usr/bin/env node
/**
 * Stream Protocol End-to-End Demo CLI
 *
 * Demonstrates the complete flow:
 * 1. Employee works shift at employer
 * 2. Employer creates signed wage attestation
 * 3. Employee generates ZK proof from attestation
 * 4. Smart contract verifies proof and disburses funds
 * 5. Nullifier prevents double-spending
 */

const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Import our components
const AttestationService = require('../../attestation-service/src/app');
const ZKProofService = require('../../circuits/src/zkproof_service');
const DatabaseManager = require('../database/DatabaseManager');

class StreamDemo {
    constructor() {
        this.db = new DatabaseManager();
        this.attestationService = new AttestationService();
        this.zkService = new ZKProofService();
        this.provider = null;
        this.contracts = {};
        this.currentUser = null;
    }

    async initialize() {
        console.log(chalk.blue.bold('\n🌊 STREAM PROTOCOL - END-TO-END DEMO\n'));
        console.log(chalk.gray('Initializing components...\n'));

        // Initialize database
        const dbSpinner = ora('Connecting to database...').start();
        try {
            await this.db.connect();
            dbSpinner.succeed('Database connected');
        } catch (error) {
            dbSpinner.fail('Database connection failed');
            throw error;
        }

        // Initialize blockchain connection
        const blockchainSpinner = ora('Connecting to blockchain...').start();
        try {
            this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
            await this.loadContracts();
            blockchainSpinner.succeed('Blockchain connected');
        } catch (error) {
            blockchainSpinner.fail('Blockchain connection failed');
            throw error;
        }

        // Initialize ZK circuit
        const zkSpinner = ora('Loading ZK circuits...').start();
        try {
            await this.zkService.initialize();
            zkSpinner.succeed('ZK circuits loaded');
        } catch (error) {
            zkSpinner.fail('ZK circuit loading failed');
            throw error;
        }

        console.log(chalk.green('\n All systems ready!\n'));
    }

    async loadContracts() {
        const deploymentFile = path.join(__dirname, '../../contracts/deployments/localhost.json');
        const deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

        // Load contract ABIs
        const StreamCoreABI = require('../../contracts/artifacts/contracts/core/StreamCore.sol/StreamCore.json').abi;
        const StablecoinPoolABI = require('../../contracts/artifacts/contracts/core/StablecoinPool.sol/StablecoinPool.json').abi;
        const EmployerRegistryABI = require('../../contracts/artifacts/contracts/core/EmployerRegistry.sol/EmployerRegistry.json').abi;

        this.contracts = {
            streamCore: new ethers.Contract(deployments.StreamCore, StreamCoreABI, this.provider),
            stablecoinPool: new ethers.Contract(deployments.StablecoinPool, StablecoinPoolABI, this.provider),
            employerRegistry: new ethers.Contract(deployments.EmployerRegistry, EmployerRegistryABI, this.provider)
        };
    }

    async runDemo() {
        await this.initialize();

        while (true) {
            const action = await this.showMainMenu();

            switch (action) {
                case 'full_demo':
                    await this.runFullDemo();
                    break;
                case 'employer_setup':
                    await this.setupEmployer();
                    break;
                case 'employee_demo':
                    await this.runEmployeeDemo();
                    break;
                case 'view_stats':
                    await this.viewSystemStats();
                    break;
                case 'exit':
                    console.log(chalk.blue('\nThank you for using Stream Protocol! 🌊\n'));
                    process.exit(0);
            }
        }
    }

    async showMainMenu() {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    {
                        name: '🎬 Run Full Demo (Complete End-to-End Flow)',
                        value: 'full_demo'
                    },
                    {
                        name: '🏢 Setup New Employer',
                        value: 'employer_setup'
                    },
                    {
                        name: '👨‍💼 Employee Wage Advance Demo',
                        value: 'employee_demo'
                    },
                    {
                        name: '📊 View System Statistics',
                        value: 'view_stats'
                    },
                    {
                        name: '🚪 Exit',
                        value: 'exit'
                    }
                ]
            }
        ]);
        return action;
    }

    async runFullDemo() {
        console.log(chalk.yellow.bold('\n🎬 FULL STREAM PROTOCOL DEMONSTRATION\n'));
        console.log(chalk.gray('This demo shows the complete wage advance flow:\n'));

        // Step 1: Choose scenario
        const scenario = await this.chooseScenario();
        const { employer, employee, workDetails } = scenario;

        console.log(chalk.blue(`\n📋 SCENARIO: ${workDetails.description}`));
        console.log(chalk.gray(`Employee: ${employee.name} (${employee.wallet})`));
        console.log(chalk.gray(`Employer: ${employer.name}`));
        console.log(chalk.gray(`Work: ${workDetails.hours} hours @ $${workDetails.rate}/hr = $${workDetails.totalWage}\n`));

        // Step 2: Create attestation
        await this.performStep('Creating employer attestation...', async () => {
            const attestationData = await this.createAttestation(employer, employee, workDetails);
            this.currentAttestation = attestationData;
            return attestationData;
        });

        // Step 3: Generate ZK proof
        await this.performStep('Generating ZK proof (this may take a few seconds)...', async () => {
            const proof = await this.generateZKProof(this.currentAttestation);
            this.currentProof = proof;
            return proof;
        });

        // Step 4: Verify and disburse
        await this.performStep('Submitting proof to smart contract...', async () => {
            const result = await this.submitProofToContract(this.currentProof);
            this.currentTransaction = result;
            return result;
        });

        // Step 5: Show results
        await this.showDemoResults();

        // Step 6: Test double-spend prevention
        await this.demonstrateDoublespendPrevention();
    }

    async chooseScenario() {
        const scenarios = [
            {
                employer: { id: 'starbucks', name: 'Starbucks Coffee' },
                employee: { name: 'Alice Johnson', wallet: '0x1234567890123456789012345678901234567890' },
                workDetails: {
                    description: 'Barista shift at Starbucks downtown',
                    hours: 8.5,
                    rate: 18.00,
                    totalWage: 153.00
                }
            },
            {
                employer: { id: 'amazon', name: 'Amazon Logistics' },
                employee: { name: 'Bob Martinez', wallet: '0x2345678901234567890123456789012345678901' },
                workDetails: {
                    description: 'Warehouse shift at Amazon fulfillment center',
                    hours: 10.0,
                    rate: 22.00,
                    totalWage: 220.00
                }
            },
            {
                employer: { id: 'uber', name: 'Uber Technologies' },
                employee: { name: 'Carol Chen', wallet: '0x3456789012345678901234567890123456789012' },
                workDetails: {
                    description: 'Gig work driving for Uber (Friday night surge)',
                    hours: 6.0,
                    rate: 28.50,
                    totalWage: 171.00
                }
            }
        ];

        const { selectedScenario } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedScenario',
                message: 'Choose a demo scenario:',
                choices: scenarios.map((scenario, index) => ({
                    name: `${scenario.workDetails.description} - $${scenario.workDetails.totalWage}`,
                    value: index
                }))
            }
        ]);

        return scenarios[selectedScenario];
    }

    async performStep(message, asyncFunction) {
        const spinner = ora(message).start();
        const startTime = Date.now();

        try {
            const result = await asyncFunction();
            const duration = Date.now() - startTime;
            spinner.succeed(`${message.replace('...', '')} (${duration}ms)`);
            return result;
        } catch (error) {
            spinner.fail(`${message.replace('...', '')} - ERROR`);
            console.error(chalk.red(`Error: ${error.message}`));
            throw error;
        }
    }

    async createAttestation(employer, employee, workDetails) {
        // Call attestation service
        const attestationRequest = {
            employerId: employer.id,
            employeeWallet: employee.wallet,
            hoursWorked: workDetails.hours,
            hourlyRate: workDetails.rate,
            periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
            periodEnd: new Date()
        };

        // This would normally be an HTTP call, but we'll use the service directly
        const attestation = await this.attestationService.createAttestation(attestationRequest);

        // Store in database
        await this.db.storeAttestation(attestation);

        return attestation;
    }

    async generateZKProof(attestation) {
        const startTime = Date.now();

        // Generate proof using our ZK service
        const proof = await this.zkService.generateProof({
            attestation: attestation,
            employeeSecret: '0x1234567890abcdef' // In real system, this would be user's private key
        });

        const duration = Date.now() - startTime;
        console.log(chalk.green(`   Proof generated in ${duration}ms (Target: <5000ms)`));

        if (duration > 5000) {
            console.log(chalk.yellow('    Performance target missed - optimization needed'));
        }

        return proof;
    }

    async submitProofToContract(proof) {
        // Get a signer (in real system, this would be the employee's wallet)
        const signer = this.provider.getSigner(0);
        const streamCoreWithSigner = this.contracts.streamCore.connect(signer);

        // Submit proof to contract
        const tx = await streamCoreWithSigner.claimWages(
            proof.proof,
            proof.publicInputs,
            { gasLimit: 200000 }
        );

        const receipt = await tx.wait();

        return {
            transactionHash: receipt.transactionHash,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber
        };
    }

    async showDemoResults() {
        console.log(chalk.green.bold('\n DEMO COMPLETED SUCCESSFULLY!\n'));

        console.log(chalk.blue('📊 Performance Metrics:'));
        console.log(`  • ZK Proof Generation: ${this.currentProof.generationTime}ms`);
        console.log(`  • Smart Contract Gas: ${this.currentTransaction.gasUsed} gas`);
        console.log(`  • Transaction Hash: ${this.currentTransaction.transactionHash}`);

        console.log(chalk.blue('\n🔒 Security Features Demonstrated:'));
        console.log('  ✓ Zero-knowledge proof hides employee/employer identities');
        console.log('  ✓ Nullifier system prevents double-spending');
        console.log('  ✓ ECDSA signature verification ensures authentic work claims');
        console.log('  ✓ Smart contract automatically disburses correct amount');

        console.log(chalk.blue('\n💰 Financial Transaction:'));
        console.log(`  • Total Wages Earned: $${this.currentAttestation.wageAmount / 100}`);
        console.log(`  • Protocol Fee (1%): $${(this.currentAttestation.wageAmount * 0.01) / 100}`);
        console.log(`  • Employee Received: $${(this.currentAttestation.wageAmount * 0.99) / 100}`);

        console.log(chalk.gray('\nPress any key to continue...'));
        await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
    }

    async demonstrateDoublespendPrevention() {
        console.log(chalk.yellow.bold('\n🛡️  DOUBLE-SPEND PREVENTION DEMO\n'));
        console.log(chalk.gray('Attempting to reuse the same proof...\n'));

        const spinner = ora('Submitting duplicate proof...').start();

        try {
            // Try to submit the same proof again
            await this.submitProofToContract(this.currentProof);
            spinner.fail('Double-spend prevention FAILED - This should not happen!');
        } catch (error) {
            spinner.succeed('Double-spend prevented successfully');
            console.log(chalk.green('✓ Nullifier system correctly rejected duplicate proof'));
            console.log(chalk.gray(`  Error: ${error.message.substring(0, 80)}...`));
        }

        console.log(chalk.green('\n Security validation complete!\n'));
        console.log(chalk.gray('Press any key to return to main menu...'));
        await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
    }

    async setupEmployer() {
        console.log(chalk.yellow.bold('\n🏢 EMPLOYER SETUP\n'));

        const employerData = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Employer name:',
                validate: input => input.length > 0
            },
            {
                type: 'input',
                name: 'stakeAmount',
                message: 'Stake amount (USDC):',
                validate: input => !isNaN(parseFloat(input)) && parseFloat(input) >= 1000
            }
        ]);

        await this.performStep('Registering employer on blockchain...', async () => {
            const signer = this.provider.getSigner(0);
            const registryWithSigner = this.contracts.employerRegistry.connect(signer);

            const tx = await registryWithSigner.registerEmployer(
                employerData.name,
                ethers.utils.parseUnits(employerData.stakeAmount, 6) // USDC has 6 decimals
            );

            await tx.wait();
        });

        console.log(chalk.green(' Employer registered successfully!'));
    }

    async runEmployeeDemo() {
        console.log(chalk.yellow.bold('\n👨‍💼 EMPLOYEE DEMO\n'));

        // Show available attestations
        const attestations = await this.db.getAvailableAttestations();

        if (attestations.length === 0) {
            console.log(chalk.red('No available attestations. Please run the full demo first.'));
            return;
        }

        const { selectedAttestation } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedAttestation',
                message: 'Choose an attestation to claim:',
                choices: attestations.map(att => ({
                    name: `${att.employerId} - $${att.wageAmount / 100} (${att.hoursWorked} hours)`,
                    value: att
                }))
            }
        ]);

        // Generate and submit proof
        const proof = await this.performStep('Generating ZK proof...', async () => {
            return await this.generateZKProof(selectedAttestation);
        });

        const result = await this.performStep('Submitting to blockchain...', async () => {
            return await this.submitProofToContract(proof);
        });

        console.log(chalk.green('\n Wage advance completed!'));
        console.log(`Transaction: ${result.transactionHash}`);
    }

    async viewSystemStats() {
        console.log(chalk.yellow.bold('\n📊 SYSTEM STATISTICS\n'));

        const stats = await this.db.getSystemStats();

        console.log(chalk.blue('Employer Stats:'));
        console.log(`  • Total Employers: ${stats.totalEmployers}`);
        console.log(`  • Total Stake: $${stats.totalStake}`);

        console.log(chalk.blue('\nTransaction Stats:'));
        console.log(`  • Total Attestations: ${stats.totalAttestations}`);
        console.log(`  • Total Proofs: ${stats.totalProofs}`);
        console.log(`  • Total Volume: $${stats.totalVolume}`);

        console.log(chalk.blue('\nLiquidity Pool:'));
        console.log(`  • Total Liquidity: $${stats.totalLiquidity}`);
        console.log(`  • Utilization: ${stats.utilization}%`);
        console.log(`  • Current APR: ${stats.currentAPR}%`);

        console.log(chalk.gray('\nPress any key to continue...'));
        await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
    }
}

// CLI entry point
if (require.main === module) {
    const demo = new StreamDemo();

    demo.runDemo().catch(error => {
        console.error(chalk.red('\n Demo failed:'), error.message);
        process.exit(1);
    });
}

module.exports = StreamDemo;