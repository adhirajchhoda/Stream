const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load existing deployment
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
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
}

async function deployAdditionalPool(factory, stablecoin, poolConfig) {
  console.log(`Deploying ${poolConfig.name} pool...`);

  const tx = await factory.deployStablecoinPool(
    stablecoin,
    poolConfig.name,
    poolConfig.symbol,
    poolConfig.admin,
    poolConfig.minimumLockPeriod,
    poolConfig.withdrawalFee,
    poolConfig.performanceFee
  );

  const receipt = await tx.wait();

  // Extract the pool address from transaction logs
  // This would need to be refined based on actual event structure
  console.log(`${poolConfig.name} deployed successfully`);

  return receipt;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = hre.network.name;

  console.log(`\n🏊 Deploying additional pools to ${networkName}`);
  console.log(`Deployer address: ${deployer.address}`);

  // Load existing deployment
  const deployment = loadDeployment(networkName);

  // Get factory contract
  const factory = await ethers.getContractAt("StreamFactory", deployment.contracts.factory);

  // Deploy USDT pool if USDT address is available
  if (deployment.contracts.tokens.usdt) {
    const usdtPoolConfig = {
      name: "Stream USDT Pool",
      symbol: "sUSDT",
      admin: deployer.address,
      minimumLockPeriod: 24 * 60 * 60, // 1 day
      withdrawalFee: 250, // 2.5%
      performanceFee: 1000, // 10%
    };

    try {
      const usdtPoolAddress = await deployAdditionalPool(
        factory,
        deployment.contracts.tokens.usdt,
        usdtPoolConfig
      );

      // Update deployment file
      deployment.contracts.usdtPool = usdtPoolAddress;
      deployment.timestamp = new Date().toISOString();

      saveDeployment(networkName, deployment);

      console.log(`✅ USDT Pool deployed to: ${usdtPoolAddress}`);
    } catch (error) {
      console.error("❌ USDT Pool deployment failed:", error.message);
    }
  }

  console.log("\n✅ Additional pool deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Additional pool deployment failed:", error);
    process.exit(1);
  });