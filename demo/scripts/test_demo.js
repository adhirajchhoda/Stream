#!/usr/bin/env node

/**
 * Stream Protocol - Demo Testing & Validation
 *
 * Comprehensive testing suite to validate all demo components
 * work correctly before the hackathon presentation.
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DemoTester {
  constructor() {
    this.testResults = [];
    this.failedTests = [];
    this.passedTests = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runTest(testName, testFn) {
    this.log(`Running test: ${testName}`, 'info');

    try {
      const startTime = Date.now();
      await testFn();
      const duration = Date.now() - startTime;

      this.log(` ${testName} - PASSED (${duration}ms)`, 'success');
      this.passedTests.push({ name: testName, duration });
      this.testResults.push({ name: testName, status: 'PASSED', duration });
    } catch (error) {
      this.log(` ${testName} - FAILED: ${error.message}`, 'error');
      this.failedTests.push({ name: testName, error: error.message });
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async testFileExists(filePath, description) {
    await fs.access(filePath, fs.constants.F_OK);
    this.log(`  ✓ ${description}: ${filePath}`, 'info');
  }

  async testDirectoryExists(dirPath, description) {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`${dirPath} is not a directory`);
    }
    this.log(`  ✓ ${description}: ${dirPath}`, 'info');
  }

  async testJsonFile(filePath, description) {
    const content = await fs.readFile(filePath, 'utf8');
    JSON.parse(content); // Will throw if invalid JSON
    this.log(`  ✓ ${description}: Valid JSON`, 'info');
  }

  async testExecutable(filePath, description) {
    await fs.access(filePath, fs.constants.F_OK | fs.constants.X_OK);
    this.log(`  ✓ ${description}: Executable`, 'info');
  }

  // Test 1: Core files existence
  async testCoreFiles() {
    await this.testFileExists('./package.json', 'Main package.json');
    await this.testFileExists('./setup_demo.sh', 'Setup script');
    await this.testFileExists('./stream_hackathon_demo.js', 'Demo orchestrator');
    await this.testFileExists('./.env.example', 'Environment template');

    await this.testExecutable('./setup_demo.sh', 'Setup script');
    await this.testExecutable('./stream_hackathon_demo.js', 'Demo script');
  }
        {
            name: 'Figlet ASCII art',
            test: () => {
                const figlet = require('figlet');
                const ascii = figlet.textSync('TEST', { font: 'Big' });
                console.log('✓ ASCII art generation working');
                return ascii.length > 0;
            }
        },
        {
            name: 'Progress bars',
            test: async () => {
                const cliProgress = require('cli-progress');
                const progress = new cliProgress.SingleBar({
                    format: 'Test |{bar}| {percentage}%',
                    barCompleteChar: '\u2588',
                    barIncompleteChar: '\u2591',
                    hideCursor: true
                });

                progress.start(100, 0);
                for (let i = 0; i <= 100; i += 20) {
                    progress.update(i);
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                progress.stop();
                console.log('✓ Progress bars working');
                return true;
            }
        },
        {
            name: 'Spinner animations',
            test: async () => {
                const ora = require('ora');
                const spinner = ora('Testing spinner').start();
                await new Promise(resolve => setTimeout(resolve, 1000));
                spinner.succeed('Spinner working');
                return true;
            }
        },
        {
            name: 'Boxen formatting',
            test: () => {
                const boxen = require('boxen');
                const box = boxen('Test box', {
                    padding: 1,
                    borderStyle: 'round',
                    borderColor: 'green'
                });
                console.log(box);
                console.log('✓ Boxen formatting working');
                return true;
            }
        },
        {
            name: 'Gradient text',
            test: () => {
                const gradient = require('gradient-string');
                console.log(gradient.rainbow('✓ Gradient text working'));
                return true;
            }
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(chalk.cyan(`\nTesting ${test.name}...`));
            const result = await test.test();
            if (result) {
                passed++;
                console.log(chalk.green(` ${test.name} - PASSED`));
            } else {
                failed++;
                console.log(chalk.red(` ${test.name} - FAILED`));
            }
        } catch (error) {
            failed++;
            console.log(chalk.red(` ${test.name} - ERROR: ${error.message}`));
        }
    }

    console.log(chalk.blue.bold(`\n📊 TEST RESULTS:`));
    console.log(chalk.green(` Passed: ${passed}`));
    console.log(chalk.red(` Failed: ${failed}`));

    if (failed === 0) {
        console.log(chalk.green.bold('\n🎉 ALL TESTS PASSED! Demo is ready for judges.\n'));
        return true;
    } else {
        console.log(chalk.yellow.bold('\n  Some tests failed. Check dependencies with: npm install\n'));
        return false;
    }
}

// Test demo scenarios
async function testScenarios() {
    console.log(chalk.blue.bold('🎭 TESTING DEMO SCENARIOS\n'));

    const StreamHackathonDemo = require('./stream_hackathon_demo');
    const demo = new StreamHackathonDemo({ auto: true });

    try {
        // Test scenario data
        const scenarios = ['starbucks', 'amazon', 'uber'];

        for (const scenarioId of scenarios) {
            console.log(chalk.cyan(`Testing ${scenarioId} scenario...`));

            if (demo.scenarios[scenarioId]) {
                const scenario = demo.scenarios[scenarioId];
                console.log(chalk.green(` ${scenario.name} - Data complete`));
                console.log(chalk.gray(`   Employee: ${scenario.employee.name}`));
                console.log(chalk.gray(`   Work: ${scenario.work.hours}h @ $${scenario.work.rate}/hr`));
            } else {
                console.log(chalk.red(` ${scenarioId} - Missing data`));
            }
        }

        // Test fallback data
        console.log(chalk.cyan('\nTesting fallback data...'));
        if (demo.fallbackData.proofs.starbucks && demo.fallbackData.transactions.starbucks) {
            console.log(chalk.green(' Fallback data complete'));
        } else {
            console.log(chalk.red(' Fallback data incomplete'));
        }

    } catch (error) {
        console.log(chalk.red(` Scenario test failed: ${error.message}`));
    }
}

async function main() {
    try {
        const componentsOk = await testDemoComponents();
        await testScenarios();

        console.log(chalk.magenta.bold('🚀 DEMO VALIDATION COMPLETE!\n'));

        if (componentsOk) {
            console.log(chalk.green('Ready to run:'));
            console.log(chalk.white('  npm run demo        ') + chalk.gray('# Interactive demo'));
            console.log(chalk.white('  npm run demo:auto   ') + chalk.gray('# Fast auto demo'));
            console.log(chalk.white('  npm run demo:starbucks') + chalk.gray('# Starbucks scenario'));
        }

    } catch (error) {
        console.error(chalk.red('Validation failed:'), error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { testDemoComponents, testScenarios };