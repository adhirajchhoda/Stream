const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Gas analysis targets
const GAS_TARGETS = {
  claimWages: 150000, // Target: <150k gas
  addLiquidity: 200000, // Target: <200k gas
  removeLiquidity: 180000, // Target: <180k gas
  disburseAdvance: 120000, // Target: <120k gas
  registerEmployer: 250000, // Target: <250k gas
  deployment: {
    streamCore: 3000000, // Target: <3M gas
    stablecoinPool: 2500000, // Target: <2.5M gas
    employerRegistry: 2000000, // Target: <2M gas
    factory: 1500000, // Target: <1.5M gas
  }
};

// Test scenarios for gas analysis
const TEST_SCENARIOS = {
  singleClaim: {
    description: "Single wage claim",
    operations: ["claimWages"],
  },
  batchClaims: {
    description: "Multiple wage claims",
    operations: ["claimWages", "claimWages", "claimWages"],
  },
  liquidityOperations: {
    description: "Liquidity add/remove cycle",
    operations: ["addLiquidity", "removeLiquidity"],
  },
  employerLifecycle: {
    description: "Complete employer lifecycle",
    operations: ["registerEmployer", "updateWhitelist", "increaseStake"],
  },
};

class GasAnalyzer {
  constructor() {
    this.results = {};
    this.contracts = {};
    this.accounts = {};
  }

  async initialize() {
    console.log("🔧 Initializing Gas Analyzer...");

    // Get accounts
    const signers = await ethers.getSigners();
    this.accounts = {
      deployer: signers[0],
      admin: signers[1],
      employer1: signers[2],
      worker1: signers[3],
      liquidityProvider1: signers[4],
    };

    // Deploy contracts for analysis
    await this.deployContractsForAnalysis();

    console.log(" Gas Analyzer initialized");
  }

  async deployContractsForAnalysis() {
    console.log("📦 Deploying contracts for gas analysis...");

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6, ethers.utils.parseUnits("1000000", 6));
    const stakeToken = await MockERC20.deploy("Stream Token", "STREAM", 18, ethers.utils.parseEther("10000000"));

    // Deploy mock verifier
    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    const verifier = await MockVerifier.deploy(true);

    // Deploy factory
    const StreamFactory = await ethers.getContractFactory("StreamFactory");
    const factory = await StreamFactory.deploy();

    // Record deployment gas costs
    this.results.deployment = {
      factory: await this.getDeploymentGas(factory),
    };

    // Deploy protocol through factory
    const deploymentParams = {
      zkVerifier: verifier.address,
      stablecoin: usdc.address,
      stakeToken: stakeToken.address,
      admin: this.accounts.admin.address,
      minEmployerStake: ethers.utils.parseEther("5000"),
      stakeLockPeriod: 7 * 24 * 60 * 60,
      minimumLockPeriod: 24 * 60 * 60,
      withdrawalFee: 250,
      performanceFee: 1000,
      poolName: "Stream USDC Pool",
      poolSymbol: "sUSDC",
    };

    const tx = await factory.deployStreamProtocol(deploymentParams);
    const receipt = await tx.wait();

    const deployment = await factory.getDeployment(this.accounts.admin.address);

    // Get contract instances
    const StreamCore = await ethers.getContractFactory("StreamCore");
    const StablecoinPool = await ethers.getContractFactory("StablecoinPool");
    const EmployerRegistry = await ethers.getContractFactory("EmployerRegistry");

    this.contracts = {
      factory,
      verifier,
      usdc,
      stakeToken,
      streamCore: StreamCore.attach(deployment.streamCoreProxy),
      stablecoinPool: StablecoinPool.attach(deployment.stablecoinPoolProxy),
      employerRegistry: EmployerRegistry.attach(deployment.employerRegistryProxy),
    };

    // Setup test data
    await this.setupTestData();

    console.log(" Contracts deployed for analysis");
  }

  async setupTestData() {
    // Mint tokens
    await this.contracts.usdc.mint(this.accounts.liquidityProvider1.address, ethers.utils.parseUnits("100000", 6));
    await this.contracts.stakeToken.mint(this.accounts.employer1.address, ethers.utils.parseEther("20000"));

    // Add initial liquidity
    await this.contracts.usdc
      .connect(this.accounts.liquidityProvider1)
      .approve(this.contracts.stablecoinPool.address, ethers.utils.parseUnits("50000", 6));

    await this.contracts.stablecoinPool
      .connect(this.accounts.liquidityProvider1)
      .addLiquidity(ethers.utils.parseUnits("50000", 6));
  }

  async getDeploymentGas(contract) {
    const receipt = contract.deployTransaction.wait ? await contract.deployTransaction.wait() : contract.deployTransaction;
    return receipt.gasUsed ? receipt.gasUsed.toNumber() : 0;
  }

  async measureGas(tx) {
    const receipt = await tx.wait();
    return receipt.gasUsed.toNumber();
  }

  async analyzeClaimWages() {
    console.log("📊 Analyzing claimWages gas usage...");

    // Setup employer
    await this.contracts.stakeToken
      .connect(this.accounts.employer1)
      .approve(this.contracts.employerRegistry.address, ethers.utils.parseEther("10000"));

    await this.contracts.employerRegistry
      .connect(this.accounts.employer1)
      .registerEmployer(
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        ethers.utils.parseEther("10000")
      );

    await this.contracts.employerRegistry
      .connect(this.accounts.admin)
      .updateWhitelist(this.accounts.employer1.address, true);

    // Test different claim amounts
    const testAmounts = [
      ethers.utils.parseEther("100"),   // Small claim
      ethers.utils.parseEther("1000"),  // Medium claim
      ethers.utils.parseEther("5000"),  // Large claim
    ];

    const gasResults = [];

    for (let i = 0; i < testAmounts.length; i++) {
      const mockProof = [
        "0x1234567890123456789012345678901234567890123456789012345678901234",
        "0x2345678901234567890123456789012345678901234567890123456789012345",
        "0x3456789012345678901234567890123456789012345678901234567890123456",
        "0x4567890123456789012345678901234567890123456789012345678901234567",
        "0x5678901234567890123456789012345678901234567890123456789012345678",
        "0x6789012345678901234567890123456789012345678901234567890123456789",
        "0x789012345678901234567890123456789012345678901234567890123456789a",
        "0x89012345678901234567890123456789012345678901234567890123456789ab",
      ];

      const publicInputs = [
        ethers.utils.solidityKeccak256(["uint256"], [i]), // unique nullifier
        testAmounts[i].toString(),
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      ];

      const tx = await this.contracts.streamCore
        .connect(this.accounts.worker1)
        .claimWages(mockProof, publicInputs);

      const gasUsed = await this.measureGas(tx);
      gasResults.push({
        amount: ethers.utils.formatEther(testAmounts[i]),
        gasUsed,
        withinTarget: gasUsed <= GAS_TARGETS.claimWages,
      });
    }

    this.results.claimWages = gasResults;
    return gasResults;
  }

  async analyzeLiquidityOperations() {
    console.log("📊 Analyzing liquidity operations gas usage...");

    const testAmounts = [
      ethers.utils.parseUnits("1000", 6),   // Small liquidity
      ethers.utils.parseUnits("10000", 6),  // Medium liquidity
      ethers.utils.parseUnits("50000", 6),  // Large liquidity
    ];

    const addResults = [];
    const removeResults = [];

    for (let i = 0; i < testAmounts.length; i++) {
      // Test add liquidity
      await this.contracts.usdc.mint(this.accounts.liquidityProvider1.address, testAmounts[i]);
      await this.contracts.usdc
        .connect(this.accounts.liquidityProvider1)
        .approve(this.contracts.stablecoinPool.address, testAmounts[i]);

      const addTx = await this.contracts.stablecoinPool
        .connect(this.accounts.liquidityProvider1)
        .addLiquidity(testAmounts[i]);

      const addGas = await this.measureGas(addTx);
      addResults.push({
        amount: ethers.utils.formatUnits(testAmounts[i], 6),
        gasUsed: addGas,
        withinTarget: addGas <= GAS_TARGETS.addLiquidity,
      });

      // Test remove liquidity (remove half)
      const sharesToRemove = testAmounts[i].div(2);
      const removeTx = await this.contracts.stablecoinPool
        .connect(this.accounts.liquidityProvider1)
        .removeLiquidity(sharesToRemove);

      const removeGas = await this.measureGas(removeTx);
      removeResults.push({
        shares: ethers.utils.formatUnits(sharesToRemove, 6),
        gasUsed: removeGas,
        withinTarget: removeGas <= GAS_TARGETS.removeLiquidity,
      });
    }

    this.results.liquidityOperations = {
      addLiquidity: addResults,
      removeLiquidity: removeResults,
    };

    return { addResults, removeResults };
  }

  async analyzeAdvanceDisbursement() {
    console.log("📊 Analyzing advance disbursement gas usage...");

    const testAmounts = [
      ethers.utils.parseUnits("500", 6),    // Small advance
      ethers.utils.parseUnits("2000", 6),   // Medium advance
      ethers.utils.parseUnits("10000", 6),  // Large advance
    ];

    const gasResults = [];

    for (let i = 0; i < testAmounts.length; i++) {
      const tx = await this.contracts.stablecoinPool
        .connect(this.accounts.admin)
        .disburseAdvance(this.accounts.worker1.address, testAmounts[i]);

      const gasUsed = await this.measureGas(tx);
      gasResults.push({
        amount: ethers.utils.formatUnits(testAmounts[i], 6),
        gasUsed,
        withinTarget: gasUsed <= GAS_TARGETS.disburseAdvance,
      });
    }

    this.results.disburseAdvance = gasResults;
    return gasResults;
  }

  async analyzeEmployerOperations() {
    console.log("📊 Analyzing employer operations gas usage...");

    // Test employer registration
    await this.contracts.stakeToken.mint(this.accounts.employer1.address, ethers.utils.parseEther("15000"));
    await this.contracts.stakeToken
      .connect(this.accounts.employer1)
      .approve(this.contracts.employerRegistry.address, ethers.utils.parseEther("15000"));

    const registerTx = await this.contracts.employerRegistry
      .connect(this.accounts.employer1)
      .registerEmployer(
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        ethers.utils.parseEther("10000")
      );

    const registerGas = await this.measureGas(registerTx);

    // Test stake increase
    const increaseStakeTx = await this.contracts.employerRegistry
      .connect(this.accounts.employer1)
      .increaseStake(ethers.utils.parseEther("5000"));

    const increaseStakeGas = await this.measureGas(increaseStakeTx);

    // Test whitelist update
    const whitelistTx = await this.contracts.employerRegistry
      .connect(this.accounts.admin)
      .updateWhitelist(this.accounts.employer1.address, true);

    const whitelistGas = await this.measureGas(whitelistTx);

    this.results.employerOperations = {
      registerEmployer: {
        gasUsed: registerGas,
        withinTarget: registerGas <= GAS_TARGETS.registerEmployer,
      },
      increaseStake: {
        gasUsed: increaseStakeGas,
        withinTarget: increaseStakeGas <= 150000, // Reasonable target
      },
      updateWhitelist: {
        gasUsed: whitelistGas,
        withinTarget: whitelistGas <= 100000, // Reasonable target
      },
    };

    return this.results.employerOperations;
  }

  async runScenarioAnalysis() {
    console.log("📊 Running scenario-based gas analysis...");

    const scenarioResults = {};

    for (const [scenarioName, scenario] of Object.entries(TEST_SCENARIOS)) {
      console.log(`\n📋 Analyzing scenario: ${scenario.description}`);

      const operationGas = [];
      let totalGas = 0;

      for (const operation of scenario.operations) {
        let gas = 0;

        switch (operation) {
          case "claimWages":
            // Use first result from previous analysis
            gas = this.results.claimWages?.[0]?.gasUsed || 0;
            break;
          case "addLiquidity":
            gas = this.results.liquidityOperations?.addLiquidity?.[0]?.gasUsed || 0;
            break;
          case "removeLiquidity":
            gas = this.results.liquidityOperations?.removeLiquidity?.[0]?.gasUsed || 0;
            break;
          case "registerEmployer":
            gas = this.results.employerOperations?.registerEmployer?.gasUsed || 0;
            break;
          default:
            gas = 0;
        }

        operationGas.push({ operation, gas });
        totalGas += gas;
      }

      scenarioResults[scenarioName] = {
        description: scenario.description,
        operations: operationGas,
        totalGas,
        averageGasPerOperation: Math.round(totalGas / scenario.operations.length),
      };
    }

    this.results.scenarios = scenarioResults;
    return scenarioResults;
  }

  generateReport() {
    console.log("\n📊 Generating Gas Analysis Report...");

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      detailed: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Save report to file
    const reportPath = path.join(__dirname, "..", "..", "gas-analysis-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📁 Gas analysis report saved to: ${reportPath}`);
    return report;
  }

  generateSummary() {
    const summary = {
      totalOperationsAnalyzed: 0,
      operationsWithinTarget: 0,
      criticalIssues: [],
      averageGasUsage: {},
    };

    // Analyze claim wages
    if (this.results.claimWages) {
      const avgClaimGas = this.results.claimWages.reduce((sum, result) => sum + result.gasUsed, 0) / this.results.claimWages.length;
      summary.averageGasUsage.claimWages = Math.round(avgClaimGas);
      summary.totalOperationsAnalyzed += this.results.claimWages.length;
      summary.operationsWithinTarget += this.results.claimWages.filter(r => r.withinTarget).length;

      if (avgClaimGas > GAS_TARGETS.claimWages) {
        summary.criticalIssues.push(`claimWages average (${Math.round(avgClaimGas)}) exceeds target (${GAS_TARGETS.claimWages})`);
      }
    }

    // Add other operation summaries...

    summary.successRate = summary.totalOperationsAnalyzed > 0
      ? Math.round((summary.operationsWithinTarget / summary.totalOperationsAnalyzed) * 100)
      : 0;

    return summary;
  }

  generateRecommendations() {
    const recommendations = [];

    // Check claim wages performance
    if (this.results.claimWages) {
      const maxClaimGas = Math.max(...this.results.claimWages.map(r => r.gasUsed));
      if (maxClaimGas > GAS_TARGETS.claimWages) {
        recommendations.push({
          category: "claimWages",
          priority: "high",
          issue: `Maximum gas usage (${maxClaimGas}) exceeds target (${GAS_TARGETS.claimWages})`,
          suggestions: [
            "Optimize ZK proof verification logic",
            "Reduce storage reads/writes in claim flow",
            "Consider batching operations where possible",
            "Review nullifier storage pattern"
          ]
        });
      }
    }

    // Check liquidity operations
    if (this.results.liquidityOperations) {
      const maxAddGas = Math.max(...this.results.liquidityOperations.addLiquidity.map(r => r.gasUsed));
      if (maxAddGas > GAS_TARGETS.addLiquidity) {
        recommendations.push({
          category: "liquidityOperations",
          priority: "medium",
          issue: `Add liquidity gas usage (${maxAddGas}) exceeds target (${GAS_TARGETS.addLiquidity})`,
          suggestions: [
            "Optimize share calculation logic",
            "Reduce redundant storage operations",
            "Consider using assembly for mathematical operations"
          ]
        });
      }
    }

    // General recommendations
    recommendations.push({
      category: "general",
      priority: "low",
      issue: "Continuous optimization opportunities",
      suggestions: [
        "Regular gas optimization reviews",
        "Monitor gas usage on different networks",
        "Consider EIP-2930 access lists for complex transactions",
        "Implement gas estimation functions for user interfaces"
      ]
    });

    return recommendations;
  }

  printSummary() {
    const summary = this.generateSummary();

    console.log("\n" + "=".repeat(50));
    console.log("           GAS ANALYSIS SUMMARY");
    console.log("=".repeat(50));

    console.log(`\n📊 Overall Performance:`);
    console.log(`   Operations Analyzed: ${summary.totalOperationsAnalyzed}`);
    console.log(`   Within Target: ${summary.operationsWithinTarget}`);
    console.log(`   Success Rate: ${summary.successRate}%`);

    console.log(`\n Average Gas Usage:`);
    for (const [operation, gas] of Object.entries(summary.averageGasUsage)) {
      const target = GAS_TARGETS[operation] || "N/A";
      const status = gas <= target ? "" : "";
      console.log(`   ${operation}: ${gas} gas ${status} (target: ${target})`);
    }

    if (summary.criticalIssues.length > 0) {
      console.log(`\n🚨 Critical Issues:`);
      summary.criticalIssues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    } else {
      console.log(`\n No critical gas issues found!`);
    }

    console.log("\n" + "=".repeat(50));
  }
}

async function main() {
  console.log("🔍 Starting Comprehensive Gas Analysis");

  const analyzer = new GasAnalyzer();

  try {
    await analyzer.initialize();

    // Run all analyses
    await analyzer.analyzeClaimWages();
    await analyzer.analyzeLiquidityOperations();
    await analyzer.analyzeAdvanceDisbursement();
    await analyzer.analyzeEmployerOperations();
    await analyzer.runScenarioAnalysis();

    // Generate and save report
    const report = analyzer.generateReport();

    // Print summary
    analyzer.printSummary();

    console.log("\n Gas analysis completed successfully!");

  } catch (error) {
    console.error(" Gas analysis failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { GasAnalyzer, GAS_TARGETS };