const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Network configurations
const NETWORK_CONFIGS = {
  localhost: {
    usdc: null, // Will deploy mock
    usdt: null, // Will deploy mock
    verifier: null, // Will deploy mock
  },
  sepolia: {
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
    usdt: "0x6175a8471C2122f778445e7E07A164250a19E661", // Sepolia USDT (mock)
    verifier: null, // Will need to deploy actual verifier
  },
  polygon: {
    usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    verifier: null, // Will need to deploy actual verifier
  },
  mainnet: {
    usdc: "0xA0b86a33E6441E2c5C3e93e0F85c5C9C0A5f5A0A",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    verifier: null, // Will need to deploy actual verifier
  },
};

// Deployment parameters
const DEPLOYMENT_PARAMS = {
  minEmployerStake: ethers.utils.parseEther("5000"),
  stakeLockPeriod: 7 * 24 * 60 * 60, // 7 days
  minimumLockPeriod: 24 * 60 * 60, // 1 day
  withdrawalFee: 250, // 2.5%
  performanceFee: 1000, // 10%
  poolNames: {
    usdc: "Stream USDC Pool",
    usdt: "Stream USDT Pool",
  },
  poolSymbols: {
    usdc: "sUSDC",
    usdt: "sUSDT",
  },
};

async function deployMockTokens() {
  console.log("Deploying mock tokens...");

  const MockERC20 = await ethers.getContractFactory("MockERC20");

  const usdc = await MockERC20.deploy(
    "USD Coin",
    "USDC",
    6,
    ethers.utils.parseUnits("1000000", 6)
  );
  await usdc.deployed();
  console.log(`Mock USDC deployed to: ${usdc.address}`);

  const usdt = await MockERC20.deploy(
    "Tether USD",
    "USDT",
    6,
    ethers.utils.parseUnits("1000000", 6)
  );
  await usdt.deployed();
  console.log(`Mock USDT deployed to: ${usdt.address}`);

  const stakeToken = await MockERC20.deploy(
    "Stream Token",
    "STREAM",
    18,
    ethers.utils.parseEther("10000000")
  );
  await stakeToken.deployed();
  console.log(`Mock STREAM token deployed to: ${stakeToken.address}`);

  return { usdc, usdt, stakeToken };
}

async function deployMockVerifier() {
  console.log("Deploying mock verifier...");

  const MockVerifier = await ethers.getContractFactory("MockVerifier");
  const verifier = await MockVerifier.deploy(true);
  await verifier.deployed();

  console.log(`Mock Verifier deployed to: ${verifier.address}`);
  return verifier;
}

async function deployStreamFactory() {
  console.log("Deploying StreamFactory...");

  const StreamFactory = await ethers.getContractFactory("StreamFactory");
  const factory = await StreamFactory.deploy();
  await factory.deployed();

  console.log(`StreamFactory deployed to: ${factory.address}`);
  return factory;
}

async function deployStreamProtocol(factory, params) {
  console.log("Deploying Stream Protocol through factory...");

  const tx = await factory.deployStreamProtocol(params);
  const receipt = await tx.wait();

  // Extract deployment event
  const deploymentEvent = receipt.events.find(e => e.event === "StreamProtocolDeployed");
  if (!deploymentEvent) {
    throw new Error("Deployment event not found");
  }

  const deployment = await factory.getDeployment(params.admin);

  console.log("Stream Protocol deployed successfully:");
  console.log(`  StreamCore Proxy: ${deployment.streamCoreProxy}`);
  console.log(`  StablecoinPool Proxy: ${deployment.stablecoinPoolProxy}`);
  console.log(`  EmployerRegistry Proxy: ${deployment.employerRegistryProxy}`);

  return deployment;
}

async function setupInitialState(deployment, tokens, accounts) {
  console.log("Setting up initial state...");

  const StablecoinPool = await ethers.getContractFactory("StablecoinPool");
  const EmployerRegistry = await ethers.getContractFactory("EmployerRegistry");

  const stablecoinPool = StablecoinPool.attach(deployment.stablecoinPoolProxy);
  const employerRegistry = EmployerRegistry.attach(deployment.employerRegistryProxy);

  // Mint tokens to test accounts
  if (tokens.usdc.mint) {
    console.log("Minting test tokens...");

    // Mint USDC to accounts
    for (let i = 1; i < Math.min(accounts.length, 5); i++) {
      await tokens.usdc.mint(accounts[i].address, ethers.utils.parseUnits("10000", 6));
    }

    // Mint STREAM tokens to potential employers
    for (let i = 1; i < Math.min(accounts.length, 3); i++) {
      await tokens.stakeToken.mint(accounts[i].address, ethers.utils.parseEther("20000"));
    }
  }

  console.log("Initial state setup complete");
}

async function saveDeploymentInfo(networkName, deployment, addresses) {
  const deploymentInfo = {
    network: networkName,
    timestamp: new Date().toISOString(),
    contracts: {
      factory: addresses.factory,
      verifier: addresses.verifier,
      tokens: addresses.tokens,
      streamCore: {
        implementation: deployment.streamCore,
        proxy: deployment.streamCoreProxy,
      },
      stablecoinPool: {
        implementation: deployment.stablecoinPool,
        proxy: deployment.stablecoinPoolProxy,
      },
      employerRegistry: {
        implementation: deployment.employerRegistry,
        proxy: deployment.employerRegistryProxy,
      },
    },
    parameters: DEPLOYMENT_PARAMS,
  };

  const deploymentDir = path.join(__dirname, "..", "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const filePath = path.join(deploymentDir, `${networkName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`Deployment info saved to: ${filePath}`);
}

async function verifyContracts(deployment, addresses, networkName) {
  if (networkName === "localhost" || networkName === "hardhat") {
    console.log("Skipping verification on local network");
    return;
  }

  console.log("Starting contract verification...");

  try {
    // Verify factory
    await hre.run("verify:verify", {
      address: addresses.factory,
      constructorArguments: [],
    });

    // Verify mock verifier if deployed
    if (addresses.verifier && addresses.tokens.usdc) {
      await hre.run("verify:verify", {
        address: addresses.verifier,
        constructorArguments: [true],
      });
    }

    // Verify implementation contracts
    await hre.run("verify:verify", {
      address: deployment.streamCore,
      constructorArguments: [],
    });

    await hre.run("verify:verify", {
      address: deployment.stablecoinPool,
      constructorArguments: [addresses.tokens.usdc],
    });

    await hre.run("verify:verify", {
      address: deployment.employerRegistry,
      constructorArguments: [],
    });

    console.log("Contract verification completed");
  } catch (error) {
    console.error("Verification failed:", error.message);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = hre.network.name;

  console.log(`\n🚀 Deploying Stream Protocol to ${networkName}`);
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);

  const networkConfig = NETWORK_CONFIGS[networkName] || NETWORK_CONFIGS.localhost;

  // Deploy or get token addresses
  let tokens = {};
  if (networkName === "localhost" || networkName === "hardhat" || !networkConfig.usdc) {
    const mockTokens = await deployMockTokens();
    tokens = {
      usdc: mockTokens.usdc.address,
      usdt: mockTokens.usdt.address,
      stakeToken: mockTokens.stakeToken.address,
    };
  } else {
    tokens = {
      usdc: networkConfig.usdc,
      usdt: networkConfig.usdt,
      stakeToken: networkConfig.stakeToken || (await deployMockTokens()).stakeToken.address,
    };
  }

  // Deploy verifier
  let verifier;
  if (!networkConfig.verifier) {
    verifier = await deployMockVerifier();
  } else {
    verifier = { address: networkConfig.verifier };
  }

  // Deploy factory
  const factory = await deployStreamFactory();

  // Prepare deployment parameters
  const deploymentParams = {
    zkVerifier: verifier.address,
    stablecoin: tokens.usdc,
    stakeToken: tokens.stakeToken,
    admin: deployer.address,
    minEmployerStake: DEPLOYMENT_PARAMS.minEmployerStake,
    stakeLockPeriod: DEPLOYMENT_PARAMS.stakeLockPeriod,
    minimumLockPeriod: DEPLOYMENT_PARAMS.minimumLockPeriod,
    withdrawalFee: DEPLOYMENT_PARAMS.withdrawalFee,
    performanceFee: DEPLOYMENT_PARAMS.performanceFee,
    poolName: DEPLOYMENT_PARAMS.poolNames.usdc,
    poolSymbol: DEPLOYMENT_PARAMS.poolSymbols.usdc,
  };

  // Deploy Stream Protocol
  const deployment = await deployStreamProtocol(factory, deploymentParams);

  // Setup initial state
  const accounts = await ethers.getSigners();
  await setupInitialState(deployment, {
    usdc: await ethers.getContractAt("MockERC20", tokens.usdc),
    stakeToken: await ethers.getContractAt("MockERC20", tokens.stakeToken),
  }, accounts);

  // Save deployment information
  const addresses = {
    factory: factory.address,
    verifier: verifier.address,
    tokens,
  };

  await saveDeploymentInfo(networkName, deployment, addresses);

  // Verify contracts on testnets/mainnet
  await verifyContracts(deployment, addresses, networkName);

  console.log("\n✅ Deployment completed successfully!");
  console.log("\n📋 Deployment Summary:");
  console.log(`Factory: ${factory.address}`);
  console.log(`StreamCore: ${deployment.streamCoreProxy}`);
  console.log(`StablecoinPool: ${deployment.stablecoinPoolProxy}`);
  console.log(`EmployerRegistry: ${deployment.employerRegistryProxy}`);
  console.log(`Verifier: ${verifier.address}`);
  console.log(`USDC: ${tokens.usdc}`);
  console.log(`STREAM: ${tokens.stakeToken}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });