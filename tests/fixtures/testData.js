const { ethers } = require("hardhat");

// Test constants
const TEST_CONSTANTS = {
  MIN_WAGE_AMOUNT: ethers.utils.parseEther("1"),
  MAX_WAGE_AMOUNT: ethers.utils.parseEther("50000"),
  DEFAULT_STAKE_AMOUNT: ethers.utils.parseEther("10000"),
  MIN_EMPLOYER_STAKE: ethers.utils.parseEther("5000"),
  STAKE_LOCK_PERIOD: 7 * 24 * 60 * 60, // 7 days
  MINIMUM_LOCK_PERIOD: 24 * 60 * 60, // 1 day
  WITHDRAWAL_FEE: 250, // 2.5%
  PERFORMANCE_FEE: 1000, // 10%
  INITIAL_SUPPLY: ethers.utils.parseEther("1000000"),
  DEFAULT_REPUTATION: 500,
  PRECISION: ethers.utils.parseEther("1"),
};

// Mock proof data for testing
const MOCK_PROOF_DATA = {
  validProof: [
    "0x1234567890123456789012345678901234567890123456789012345678901234",
    "0x2345678901234567890123456789012345678901234567890123456789012345",
    "0x3456789012345678901234567890123456789012345678901234567890123456",
    "0x4567890123456789012345678901234567890123456789012345678901234567",
    "0x5678901234567890123456789012345678901234567890123456789012345678",
    "0x6789012345678901234567890123456789012345678901234567890123456789",
    "0x789012345678901234567890123456789012345678901234567890123456789a",
    "0x89012345678901234567890123456789012345678901234567890123456789ab",
  ],
  validPublicInputs: [
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890", // nullifier
    ethers.utils.parseEther("1000").toString(), // amount
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // employerHash
  ],
};

// Test accounts setup
const getTestAccounts = async () => {
  const [
    deployer,
    admin,
    operator,
    employer1,
    employer2,
    worker1,
    worker2,
    liquidityProvider1,
    liquidityProvider2,
    treasury,
    ...others
  ] = await ethers.getSigners();

  return {
    deployer,
    admin,
    operator,
    employer1,
    employer2,
    worker1,
    worker2,
    liquidityProvider1,
    liquidityProvider2,
    treasury,
    others,
  };
};

// Deploy mock tokens
const deployMockTokens = async (deployer) => {
  const MockERC20 = await ethers.getContractFactory("MockERC20");

  const usdc = await MockERC20.deploy(
    "USD Coin",
    "USDC",
    6,
    TEST_CONSTANTS.INITIAL_SUPPLY.div(ethers.utils.parseUnits("1", 12)) // Adjust for 6 decimals
  );

  const usdt = await MockERC20.deploy(
    "Tether USD",
    "USDT",
    6,
    TEST_CONSTANTS.INITIAL_SUPPLY.div(ethers.utils.parseUnits("1", 12)) // Adjust for 6 decimals
  );

  const stakeToken = await MockERC20.deploy(
    "Stream Token",
    "STREAM",
    18,
    TEST_CONSTANTS.INITIAL_SUPPLY
  );

  return { usdc, usdt, stakeToken };
};

// Deploy mock verifier
const deployMockVerifier = async (shouldVerify = true) => {
  const MockVerifier = await ethers.getContractFactory("MockVerifier");
  return await MockVerifier.deploy(shouldVerify);
};

// Deploy complete Stream protocol
const deployStreamProtocol = async (admin, zkVerifier, stablecoin, stakeToken) => {
  const StreamFactory = await ethers.getContractFactory("StreamFactory");
  const factory = await StreamFactory.deploy();

  const deploymentParams = {
    zkVerifier: zkVerifier.address,
    stablecoin: stablecoin.address,
    stakeToken: stakeToken.address,
    admin: admin.address,
    minEmployerStake: TEST_CONSTANTS.MIN_EMPLOYER_STAKE,
    stakeLockPeriod: TEST_CONSTANTS.STAKE_LOCK_PERIOD,
    minimumLockPeriod: TEST_CONSTANTS.MINIMUM_LOCK_PERIOD,
    withdrawalFee: TEST_CONSTANTS.WITHDRAWAL_FEE,
    performanceFee: TEST_CONSTANTS.PERFORMANCE_FEE,
    poolName: "Stream USDC Pool",
    poolSymbol: "sUSDC",
  };

  await factory.deployStreamProtocol(deploymentParams);
  const deployment = await factory.getDeployment(admin.address);

  const StreamCore = await ethers.getContractFactory("StreamCore");
  const StablecoinPool = await ethers.getContractFactory("StablecoinPool");
  const EmployerRegistry = await ethers.getContractFactory("EmployerRegistry");

  const streamCore = StreamCore.attach(deployment.streamCoreProxy);
  const stablecoinPool = StablecoinPool.attach(deployment.stablecoinPoolProxy);
  const employerRegistry = EmployerRegistry.attach(deployment.employerRegistryProxy);

  return {
    factory,
    streamCore,
    stablecoinPool,
    employerRegistry,
    deployment,
  };
};

// Helper functions for test setup
const setupTestEnvironment = async () => {
  const accounts = await getTestAccounts();
  const tokens = await deployMockTokens(accounts.deployer);
  const mockVerifier = await deployMockVerifier(true);

  const protocol = await deployStreamProtocol(
    accounts.admin,
    mockVerifier,
    tokens.usdc,
    tokens.stakeToken
  );

  // Setup initial token balances
  await tokens.usdc.mint(accounts.liquidityProvider1.address, ethers.utils.parseUnits("100000", 6));
  await tokens.usdc.mint(accounts.liquidityProvider2.address, ethers.utils.parseUnits("100000", 6));
  await tokens.stakeToken.mint(accounts.employer1.address, TEST_CONSTANTS.DEFAULT_STAKE_AMOUNT);
  await tokens.stakeToken.mint(accounts.employer2.address, TEST_CONSTANTS.DEFAULT_STAKE_AMOUNT);

  return {
    accounts,
    tokens,
    mockVerifier,
    ...protocol,
  };
};

// Time manipulation helpers
const timeHelpers = {
  increase: async (seconds) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  },

  increaseTo: async (timestamp) => {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await ethers.provider.send("evm_mine");
  },

  latest: async () => {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  },
};

// Expectation helpers
const expectRevert = async (promise, reason) => {
  try {
    await promise;
    throw new Error("Expected transaction to revert");
  } catch (error) {
    if (reason) {
      expect(error.message).to.include(reason);
    }
  }
};

const expectEvent = (receipt, eventName, args = {}) => {
  const event = receipt.events?.find(e => e.event === eventName);
  expect(event).to.not.be.undefined;

  if (Object.keys(args).length > 0) {
    for (const [key, value] of Object.entries(args)) {
      expect(event.args[key]).to.equal(value);
    }
  }

  return event;
};

// Gas calculation helpers
const gasHelpers = {
  calculate: async (tx) => {
    const receipt = await tx.wait();
    return receipt.gasUsed;
  },

  profile: async (name, tx) => {
    const receipt = await tx.wait();
    console.log(`Gas used for ${name}: ${receipt.gasUsed.toString()}`);
    return receipt.gasUsed;
  },
};

module.exports = {
  TEST_CONSTANTS,
  MOCK_PROOF_DATA,
  getTestAccounts,
  deployMockTokens,
  deployMockVerifier,
  deployStreamProtocol,
  setupTestEnvironment,
  timeHelpers,
  expectRevert,
  expectEvent,
  gasHelpers,
};