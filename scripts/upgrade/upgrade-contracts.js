const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment
function loadDeployment(networkName) {
  const deploymentPath = path.join(__dirname, "..", "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found for ${networkName}`);
  }
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

// Save updated deployment
function saveDeployment(networkName, deployment) {
  const deploymentPath = path.join(__dirname, "..", "..", "deployments", `${networkName}.json`);
  deployment.lastUpgrade = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
}

async function upgradeContract(proxyAddress, contractName, currentImplAddress) {
  console.log(`\n📦 Upgrading ${contractName}...`);
  console.log(`Current implementation: ${currentImplAddress}`);
  console.log(`Proxy address: ${proxyAddress}`);

  try {
    // Deploy new implementation
    const ContractFactory = await ethers.getContractFactory(contractName);
    const newImplementation = await ContractFactory.deploy();
    await newImplementation.deployed();

    console.log(`New implementation deployed: ${newImplementation.address}`);

    // Upgrade using UUPS pattern
    const proxy = await ethers.getContractAt(contractName, proxyAddress);
    const tx = await proxy.upgradeTo(newImplementation.address);
    await tx.wait();

    console.log(`✅ ${contractName} upgraded successfully`);
    console.log(`Transaction hash: ${tx.hash}`);

    return newImplementation.address;
  } catch (error) {
    console.error(`❌ Failed to upgrade ${contractName}:`, error.message);
    throw error;
  }
}

async function upgradeStreamCore(deployment) {
  const newImplAddress = await upgradeContract(
    deployment.contracts.streamCore.proxy,
    "StreamCore",
    deployment.contracts.streamCore.implementation
  );

  deployment.contracts.streamCore.implementation = newImplAddress;
  return deployment;
}

async function upgradeStablecoinPool(deployment) {
  // Note: StablecoinPool constructor requires stablecoin address
  console.log(`\n📦 Upgrading StablecoinPool...`);
  console.log(`Current implementation: ${deployment.contracts.stablecoinPool.implementation}`);
  console.log(`Proxy address: ${deployment.contracts.stablecoinPool.proxy}`);

  try {
    // Deploy new implementation with stablecoin parameter
    const StablecoinPool = await ethers.getContractFactory("StablecoinPool");
    const newImplementation = await StablecoinPool.deploy(deployment.contracts.tokens.usdc);
    await newImplementation.deployed();

    console.log(`New implementation deployed: ${newImplementation.address}`);

    // Upgrade using UUPS pattern
    const proxy = await ethers.getContractAt("StablecoinPool", deployment.contracts.stablecoinPool.proxy);
    const tx = await proxy.upgradeTo(newImplementation.address);
    await tx.wait();

    console.log(`✅ StablecoinPool upgraded successfully`);
    console.log(`Transaction hash: ${tx.hash}`);

    deployment.contracts.stablecoinPool.implementation = newImplementation.address;
    return deployment;
  } catch (error) {
    console.error(`❌ Failed to upgrade StablecoinPool:`, error.message);
    throw error;
  }
}

async function upgradeEmployerRegistry(deployment) {
  const newImplAddress = await upgradeContract(
    deployment.contracts.employerRegistry.proxy,
    "EmployerRegistry",
    deployment.contracts.employerRegistry.implementation
  );

  deployment.contracts.employerRegistry.implementation = newImplAddress;
  return deployment;
}

async function validateUpgrade(deployment) {
  console.log("\n🔍 Validating upgrade...");

  try {
    // Test basic functionality of each contract
    const streamCore = await ethers.getContractAt("StreamCore", deployment.contracts.streamCore.proxy);
    const stablecoinPool = await ethers.getContractAt("StablecoinPool", deployment.contracts.stablecoinPool.proxy);
    const employerRegistry = await ethers.getContractAt("EmployerRegistry", deployment.contracts.employerRegistry.proxy);

    // Check that contracts are still properly initialized
    const verifier = await streamCore.zkVerifier();
    const poolName = await stablecoinPool.name();
    const minStake = await employerRegistry.minStakeAmount();

    console.log(`StreamCore verifier: ${verifier}`);
    console.log(`StablecoinPool name: ${poolName}`);
    console.log(`EmployerRegistry min stake: ${ethers.utils.formatEther(minStake)} ETH`);

    // Verify cross-contract references
    const poolAddress = await streamCore.stablecoinPool();
    const registryAddress = await streamCore.employerRegistry();

    if (poolAddress !== deployment.contracts.stablecoinPool.proxy) {
      throw new Error("StreamCore -> StablecoinPool reference mismatch");
    }

    if (registryAddress !== deployment.contracts.employerRegistry.proxy) {
      throw new Error("StreamCore -> EmployerRegistry reference mismatch");
    }

    console.log("✅ Upgrade validation passed");
  } catch (error) {
    console.error("❌ Upgrade validation failed:", error.message);
    throw error;
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = hre.network.name;

  console.log(`\n🔄 Upgrading Stream Protocol contracts on ${networkName}`);
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Deployer balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);

  // Load existing deployment
  let deployment = loadDeployment(networkName);

  console.log("\n📋 Current deployment:");
  console.log(`StreamCore: ${deployment.contracts.streamCore.proxy}`);
  console.log(`StablecoinPool: ${deployment.contracts.stablecoinPool.proxy}`);
  console.log(`EmployerRegistry: ${deployment.contracts.employerRegistry.proxy}`);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const upgradeAll = args.includes("--all");
  const upgradeStreamCore = args.includes("--stream-core") || upgradeAll;
  const upgradePool = args.includes("--pool") || upgradeAll;
  const upgradeRegistry = args.includes("--registry") || upgradeAll;

  if (!upgradeStreamCore && !upgradePool && !upgradeRegistry) {
    console.log("\n❌ No contracts specified for upgrade");
    console.log("Usage: npm run upgrade -- [--all|--stream-core|--pool|--registry]");
    return;
  }

  try {
    // Perform upgrades
    if (upgradeStreamCore) {
      deployment = await upgradeStreamCore(deployment);
    }

    if (upgradePool) {
      deployment = await upgradeStablecoinPool(deployment);
    }

    if (upgradeRegistry) {
      deployment = await upgradeEmployerRegistry(deployment);
    }

    // Validate that everything still works
    await validateUpgrade(deployment);

    // Save updated deployment info
    saveDeployment(networkName, deployment);

    console.log("\n✅ All upgrades completed successfully!");

    // Summary
    console.log("\n📋 Updated implementations:");
    if (upgradeStreamCore) {
      console.log(`StreamCore: ${deployment.contracts.streamCore.implementation}`);
    }
    if (upgradePool) {
      console.log(`StablecoinPool: ${deployment.contracts.stablecoinPool.implementation}`);
    }
    if (upgradeRegistry) {
      console.log(`EmployerRegistry: ${deployment.contracts.employerRegistry.implementation}`);
    }

  } catch (error) {
    console.error("\n❌ Upgrade failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade script failed:", error);
    process.exit(1);
  });