const { ethers } = require("hardhat");
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

async function verifyContract(address, constructorArgs = [], contractName = "") {
  try {
    console.log(`Verifying ${contractName} at ${address}...`);

    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });

    console.log(` ${contractName} verified successfully`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(` ${contractName} already verified`);
    } else {
      console.error(` Failed to verify ${contractName}:`, error.message);
    }
  }
}

async function main() {
  const networkName = hre.network.name;

  if (networkName === "localhost" || networkName === "hardhat") {
    console.log(" Cannot verify contracts on local network");
    return;
  }

  console.log(`\n🔍 Verifying contracts on ${networkName}`);

  // Load deployment
  const deployment = loadDeployment(networkName);

  // Verify Factory
  await verifyContract(
    deployment.contracts.factory,
    [],
    "StreamFactory"
  );

  // Verify MockVerifier if it exists
  if (deployment.contracts.verifier) {
    await verifyContract(
      deployment.contracts.verifier,
      [true], // shouldVerify = true
      "MockVerifier"
    );
  }

  // Verify Mock Tokens if they exist
  if (deployment.contracts.tokens.usdc) {
    await verifyContract(
      deployment.contracts.tokens.usdc,
      [
        "USD Coin",
        "USDC",
        6,
        ethers.utils.parseUnits("1000000", 6).toString()
      ],
      "MockERC20 (USDC)"
    );
  }

  if (deployment.contracts.tokens.stakeToken) {
    await verifyContract(
      deployment.contracts.tokens.stakeToken,
      [
        "Stream Token",
        "STREAM",
        18,
        ethers.utils.parseEther("10000000").toString()
      ],
      "MockERC20 (STREAM)"
    );
  }

  // Verify Implementation Contracts
  await verifyContract(
    deployment.contracts.streamCore.implementation,
    [],
    "StreamCore Implementation"
  );

  await verifyContract(
    deployment.contracts.stablecoinPool.implementation,
    [deployment.contracts.tokens.usdc],
    "StablecoinPool Implementation"
  );

  await verifyContract(
    deployment.contracts.employerRegistry.implementation,
    [],
    "EmployerRegistry Implementation"
  );

  // Verify Proxy Contracts
  await verifyContract(
    deployment.contracts.streamCore.proxy,
    [
      deployment.contracts.streamCore.implementation,
      "0x" // Empty initialization data
    ],
    "StreamCore Proxy"
  );

  await verifyContract(
    deployment.contracts.stablecoinPool.proxy,
    [
      deployment.contracts.stablecoinPool.implementation,
      "0x" // Empty initialization data
    ],
    "StablecoinPool Proxy"
  );

  await verifyContract(
    deployment.contracts.employerRegistry.proxy,
    [
      deployment.contracts.employerRegistry.implementation,
      "0x" // Empty initialization data
    ],
    "EmployerRegistry Proxy"
  );

  console.log("\n Contract verification completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(" Verification failed:", error);
    process.exit(1);
  });