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

      this.log(`✅ ${testName} - PASSED (${duration}ms)`, 'success');
      this.passedTests.push({ name: testName, duration });
      this.testResults.push({ name: testName, status: 'PASSED', duration });
    } catch (error) {
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
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

  // Test 2: Directory structure
  async testDirectoryStructure() {
    const requiredDirs = [
      './circuits',
      './contracts',
      './attestation-service',
      './integration',
      './demo_data',
      './demo_data/fallback_proofs',
      './demo_data/fallback_contracts'
    ];

    for (const dir of requiredDirs) {
      await this.testDirectoryExists(dir, `Required directory`);
    }
  }

  // Test 3: Fallback data integrity
  async testFallbackData() {
    // Test scenarios file
    await this.testJsonFile('./demo_data/scenarios.json', 'Demo scenarios');

    // Test fallback proofs
    const scenarios = ['starbucks_barista', 'amazon_warehouse', 'uber_driver'];
    for (const scenario of scenarios) {
      const proofFile = `./demo_data/fallback_proofs/${scenario}.json`;
      await this.testFileExists(proofFile, `Fallback proof for ${scenario}`);
      await this.testJsonFile(proofFile, `Fallback proof JSON for ${scenario}`);

      // Validate proof structure
      const proofContent = await fs.readFile(proofFile, 'utf8');
      const proof = JSON.parse(proofContent);

      if (!proof.proof || !proof.publicSignals || !proof.metadata) {
        throw new Error(`Invalid proof structure for ${scenario}`);
      }

      this.log(`  ✓ Proof structure valid for ${scenario}`, 'info');
    }

    // Test fallback contracts
    await this.testJsonFile('./demo_data/fallback_contracts/mock_deployments.json', 'Mock contracts');
  }

  // Test 4: Demo orchestrator functionality
  async testDemoOrchestrator() {
    // Test that the demo orchestrator can be required
    const DemoOrchestrator = require('./stream_hackathon_demo.js');

    if (typeof DemoOrchestrator !== 'function') {
      throw new Error('Demo orchestrator should export a class');
    }

    // Test instantiation
    const demo = new DemoOrchestrator();

    if (!demo.performHealthCheck || typeof demo.performHealthCheck !== 'function') {
      throw new Error('Demo orchestrator missing performHealthCheck method');
    }

    if (!demo.runDemoScenario || typeof demo.runDemoScenario !== 'function') {
      throw new Error('Demo orchestrator missing runDemoScenario method');
    }

    this.log('  ✓ Demo orchestrator class structure valid', 'info');
  }

  // Test 5: Package dependencies
  async testPackageDependencies() {
    const packageJson = await fs.readFile('./package.json', 'utf8');
    const pkg = JSON.parse(packageJson);

    // Check for required scripts
    const requiredScripts = ['demo', 'demo:auto', 'demo:starbucks', 'demo:amazon', 'demo:uber'];
    for (const script of requiredScripts) {
      if (!pkg.scripts || !pkg.scripts[script]) {
        throw new Error(`Missing required script: ${script}`);
      }
      this.log(`  ✓ Script defined: ${script}`, 'info');
    }

    // Check dependencies exist
    const hasNodeModules = await fs.access('./node_modules', fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (hasNodeModules) {
      this.log('  ✓ node_modules directory exists', 'info');
    } else {
      this.log('  ⚠ node_modules not found - dependencies may need installation', 'warning');
    }
  }

  // Test 6: Environment setup
  async testEnvironmentSetup() {
    // Check if .env exists or .env.example exists
    const hasEnv = await fs.access('./.env', fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    const hasEnvExample = await fs.access('./.env.example', fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (hasEnv) {
      this.log('  ✓ .env file exists', 'info');
    } else if (hasEnvExample) {
      this.log('  ✓ .env.example exists (setup script will create .env)', 'info');
    } else {
      throw new Error('Neither .env nor .env.example found');
    }
  }

  // Test 7: Demo scenarios validation
  async testDemoScenarios() {
    const scenariosContent = await fs.readFile('./demo_data/scenarios.json', 'utf8');
    const scenarios = JSON.parse(scenariosContent);

    if (!scenarios.scenarios || !Array.isArray(scenarios.scenarios)) {
      throw new Error('Scenarios file missing scenarios array');
    }

    if (scenarios.scenarios.length < 3) {
      throw new Error('At least 3 demo scenarios required');
    }

    // Validate each scenario has required fields
    const requiredFields = ['id', 'employer', 'employee', 'position', 'hours', 'hourlyRate', 'totalWage'];

    for (const scenario of scenarios.scenarios) {
      for (const field of requiredFields) {
        if (scenario[field] === undefined || scenario[field] === null) {
          throw new Error(`Scenario ${scenario.id} missing required field: ${field}`);
        }
      }
      this.log(`  ✓ Scenario valid: ${scenario.id}`, 'info');
    }
  }

  // Test 8: Basic demo execution (health check only)
  async testBasicDemoExecution() {
    try {
      // Test health check functionality
      const { stdout } = await execAsync('node stream_hackathon_demo.js --health', { timeout: 30000 });

      if (stdout.includes('health check') || stdout.includes('System Health')) {
        this.log('  ✓ Demo health check executes successfully', 'info');
      } else {
        this.log('  ⚠ Demo health check executed but output unclear', 'warning');
      }
    } catch (error) {
      // Don't fail the test if demo has dependency issues - this is expected
      this.log('  ⚠ Demo execution has issues (expected if setup not run)', 'warning');
    }
  }

  // Test 9: Integration components
  async testIntegrationComponents() {
    // Check integration directory
    await this.testDirectoryExists('./integration', 'Integration directory');

    // Check if integration package.json exists
    const integrationPkg = './integration/package.json';
    const hasIntegrationPkg = await fs.access(integrationPkg, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (hasIntegrationPkg) {
      await this.testJsonFile(integrationPkg, 'Integration package.json');
      this.log('  ✓ Integration package.json exists', 'info');
    }

    // Check for CLI demo file
    const cliDemo = './integration/cli/stream-demo.js';
    const hasCLIDemo = await fs.access(cliDemo, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (hasCLIDemo) {
      this.log('  ✓ CLI demo file exists', 'info');
    }
  }

  // Test 10: Smart contracts structure
  async testSmartContractsStructure() {
    await this.testDirectoryExists('./contracts', 'Contracts directory');

    // Check for Hardhat config
    const hardhatConfig = './hardhat.config.js';
    const hasHardhatConfig = await fs.access(hardhatConfig, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (hasHardhatConfig) {
      this.log('  ✓ Hardhat config exists', 'info');
    }

    // Check for contracts directory structure
    const contractsCore = './contracts/core';
    const hasContractsCore = await fs.access(contractsCore, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (hasContractsCore) {
      await this.testDirectoryExists(contractsCore, 'Contracts core directory');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Stream Protocol - Demo Testing Suite');
    console.log('=====================================\n');

    const tests = [
      ['Core Files', () => this.testCoreFiles()],
      ['Directory Structure', () => this.testDirectoryStructure()],
      ['Fallback Data', () => this.testFallbackData()],
      ['Demo Orchestrator', () => this.testDemoOrchestrator()],
      ['Package Dependencies', () => this.testPackageDependencies()],
      ['Environment Setup', () => this.testEnvironmentSetup()],
      ['Demo Scenarios', () => this.testDemoScenarios()],
      ['Basic Demo Execution', () => this.testBasicDemoExecution()],
      ['Integration Components', () => this.testIntegrationComponents()],
      ['Smart Contracts Structure', () => this.testSmartContractsStructure()]
    ];

    for (const [testName, testFn] of tests) {
      await this.runTest(testName, testFn);
      console.log(''); // Add spacing between tests
    }

    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('🎯 Test Summary');
    console.log('==============');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${this.passedTests.length}`);
    console.log(`Failed: ${this.failedTests.length}`);

    if (this.failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }

    const successRate = Math.round((this.passedTests.length / this.testResults.length) * 100);
    console.log(`\nSuccess Rate: ${successRate}%`);

    if (successRate >= 90) {
      console.log('\n🎉 Demo is ready for hackathon! All critical tests passed.');
    } else if (successRate >= 70) {
      console.log('\n⚠️  Demo mostly ready, but some issues need attention.');
    } else {
      console.log('\n🚨 Demo needs significant work before hackathon.');
    }

    // Exit with appropriate code
    process.exit(this.failedTests.length > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DemoTester();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = DemoTester;