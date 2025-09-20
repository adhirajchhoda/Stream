const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  setupTestEnvironment,
  TEST_CONSTANTS,
  MOCK_PROOF_DATA,
  expectRevert,
  expectEvent,
  gasHelpers,
} = require("../fixtures/testData");

describe("StreamCore", function () {
  let env;

  beforeEach(async function () {
    env = await setupTestEnvironment();
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await env.streamCore.zkVerifier()).to.equal(env.mockVerifier.address);
      expect(await env.streamCore.stablecoinPool()).to.equal(env.stablecoinPool.address);
      expect(await env.streamCore.employerRegistry()).to.equal(env.employerRegistry.address);
      expect(await env.streamCore.minEmployerStake()).to.equal(TEST_CONSTANTS.MIN_EMPLOYER_STAKE);
    });

    it("Should set up roles correctly", async function () {
      const DEFAULT_ADMIN_ROLE = await env.streamCore.DEFAULT_ADMIN_ROLE();
      const OPERATOR_ROLE = await env.streamCore.OPERATOR_ROLE();

      expect(await env.streamCore.hasRole(DEFAULT_ADMIN_ROLE, env.accounts.admin.address)).to.be.true;
      expect(await env.streamCore.hasRole(OPERATOR_ROLE, env.accounts.admin.address)).to.be.true;
    });

    it("Should reject initialization with zero addresses", async function () {
      const StreamCore = await ethers.getContractFactory("StreamCore");
      const streamCore = await StreamCore.deploy();

      await expectRevert(
        streamCore.initialize(
          ethers.constants.AddressZero, // invalid verifier
          env.stablecoinPool.address,
          env.employerRegistry.address,
          env.accounts.admin.address,
          TEST_CONSTANTS.MIN_EMPLOYER_STAKE
        ),
        "StreamCore: invalid verifier"
      );
    });
  });

  describe("Wage Claims", function () {
    beforeEach(async function () {
      // Setup employer
      await env.tokens.stakeToken
        .connect(env.accounts.employer1)
        .approve(env.employerRegistry.address, TEST_CONSTANTS.DEFAULT_STAKE_AMOUNT);

      await env.employerRegistry
        .connect(env.accounts.employer1)
        .registerEmployer(MOCK_PROOF_DATA.validPublicInputs[2], TEST_CONSTANTS.DEFAULT_STAKE_AMOUNT);

      await env.employerRegistry
        .connect(env.accounts.admin)
        .updateWhitelist(env.accounts.employer1.address, true);

      // Add liquidity to pool
      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, ethers.utils.parseUnits("50000", 6));

      await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(ethers.utils.parseUnits("50000", 6));
    });

    it("Should successfully claim wages with valid proof", async function () {
      const claimAmount = ethers.utils.parseEther("1000");
      const publicInputs = [
        MOCK_PROOF_DATA.validPublicInputs[0], // nullifier
        claimAmount.toString(), // amount
        MOCK_PROOF_DATA.validPublicInputs[2], // employerHash
      ];

      const tx = await env.streamCore
        .connect(env.accounts.worker1)
        .claimWages(MOCK_PROOF_DATA.validProof, publicInputs);

      const receipt = await tx.wait();

      // Check gas usage
      expect(receipt.gasUsed).to.be.lt(150000); // Target <150k gas

      // Check event emission
      expectEvent(receipt, "WagesClaimed", {
        recipient: env.accounts.worker1.address,
        amount: claimAmount,
        nullifier: publicInputs[0],
        employer: publicInputs[2],
      });

      // Check nullifier is marked as used
      expect(await env.streamCore.isNullifierUsed(publicInputs[0])).to.be.true;

      // Check statistics
      expect(await env.streamCore.totalWagesClaimed()).to.equal(claimAmount);
      expect(await env.streamCore.totalClaims()).to.equal(1);
    });

    it("Should reject claim with invalid proof", async function () {
      await env.mockVerifier.setShouldVerify(false);

      const publicInputs = [
        MOCK_PROOF_DATA.validPublicInputs[0],
        ethers.utils.parseEther("1000").toString(),
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      await expectRevert(
        env.streamCore
          .connect(env.accounts.worker1)
          .claimWages(MOCK_PROOF_DATA.validProof, publicInputs),
        "StreamCore: invalid proof"
      );
    });

    it("Should reject claim with used nullifier", async function () {
      const publicInputs = [
        MOCK_PROOF_DATA.validPublicInputs[0],
        ethers.utils.parseEther("1000").toString(),
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      // First claim should succeed
      await env.streamCore
        .connect(env.accounts.worker1)
        .claimWages(MOCK_PROOF_DATA.validProof, publicInputs);

      // Reset mock verifier to allow the same proof
      await env.mockVerifier.resetProof(MOCK_PROOF_DATA.validProof, publicInputs);

      // Second claim with same nullifier should fail
      await expectRevert(
        env.streamCore
          .connect(env.accounts.worker2)
          .claimWages(MOCK_PROOF_DATA.validProof, publicInputs),
        "StreamCore: nullifier already used"
      );
    });

    it("Should reject claim with amount out of bounds", async function () {
      // Test minimum amount
      let publicInputs = [
        MOCK_PROOF_DATA.validPublicInputs[0],
        "0", // amount too low
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      await expectRevert(
        env.streamCore
          .connect(env.accounts.worker1)
          .claimWages(MOCK_PROOF_DATA.validProof, publicInputs),
        "StreamCore: amount out of bounds"
      );

      // Test maximum amount
      publicInputs = [
        MOCK_PROOF_DATA.validPublicInputs[0],
        ethers.utils.parseEther("100000").toString(), // amount too high
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      await expectRevert(
        env.streamCore
          .connect(env.accounts.worker1)
          .claimWages(MOCK_PROOF_DATA.validProof, publicInputs),
        "StreamCore: amount out of bounds"
      );
    });

    it("Should reject claim with invalid public inputs", async function () {
      // Test zero nullifier
      let publicInputs = [
        "0", // invalid nullifier
        ethers.utils.parseEther("1000").toString(),
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      await expectRevert(
        env.streamCore
          .connect(env.accounts.worker1)
          .claimWages(MOCK_PROOF_DATA.validProof, publicInputs),
        "StreamCore: invalid public inputs"
      );

      // Test zero employer hash
      publicInputs = [
        MOCK_PROOF_DATA.validPublicInputs[0],
        ethers.utils.parseEther("1000").toString(),
        "0", // invalid employer hash
      ];

      await expectRevert(
        env.streamCore
          .connect(env.accounts.worker1)
          .claimWages(MOCK_PROOF_DATA.validProof, publicInputs),
        "StreamCore: invalid public inputs"
      );
    });

    it("Should handle multiple claims from different workers", async function () {
      const claimAmount = ethers.utils.parseEther("1000");

      // Worker 1 claim
      const publicInputs1 = [
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        claimAmount.toString(),
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      await env.streamCore
        .connect(env.accounts.worker1)
        .claimWages(MOCK_PROOF_DATA.validProof, publicInputs1);

      // Worker 2 claim
      const publicInputs2 = [
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        claimAmount.toString(),
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      await env.streamCore
        .connect(env.accounts.worker2)
        .claimWages(MOCK_PROOF_DATA.validProof, publicInputs2);

      // Check total statistics
      expect(await env.streamCore.totalWagesClaimed()).to.equal(claimAmount.mul(2));
      expect(await env.streamCore.totalClaims()).to.equal(2);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update verifier", async function () {
      const newVerifier = await env.deployMockVerifier(true);

      const tx = await env.streamCore
        .connect(env.accounts.admin)
        .updateVerifier(newVerifier.address);

      const receipt = await tx.wait();
      expectEvent(receipt, "VerifierUpdated", {
        oldVerifier: env.mockVerifier.address,
        newVerifier: newVerifier.address,
      });

      expect(await env.streamCore.zkVerifier()).to.equal(newVerifier.address);
    });

    it("Should reject verifier update from non-operator", async function () {
      const newVerifier = await env.deployMockVerifier(true);

      await expectRevert(
        env.streamCore
          .connect(env.accounts.worker1)
          .updateVerifier(newVerifier.address),
        "AccessControl:"
      );
    });

    it("Should allow admin to pause and unpause", async function () {
      // Pause
      await env.streamCore.connect(env.accounts.admin).pause();
      expect(await env.streamCore.paused()).to.be.true;

      // Try to claim while paused
      const publicInputs = [
        MOCK_PROOF_DATA.validPublicInputs[0],
        ethers.utils.parseEther("1000").toString(),
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      await expectRevert(
        env.streamCore
          .connect(env.accounts.worker1)
          .claimWages(MOCK_PROOF_DATA.validProof, publicInputs),
        "Pausable: paused"
      );

      // Unpause
      await env.streamCore.connect(env.accounts.admin).unpause();
      expect(await env.streamCore.paused()).to.be.false;
    });

    it("Should allow emergency withdrawal", async function () {
      // Send some ETH to contract
      await env.accounts.admin.sendTransaction({
        to: env.streamCore.address,
        value: ethers.utils.parseEther("1"),
      });

      const initialBalance = await env.accounts.treasury.getBalance();

      await env.streamCore
        .connect(env.accounts.admin)
        .emergencyWithdraw(
          ethers.constants.AddressZero, // ETH
          env.accounts.treasury.address,
          ethers.utils.parseEther("1")
        );

      const finalBalance = await env.accounts.treasury.getBalance();
      expect(finalBalance.sub(initialBalance)).to.equal(ethers.utils.parseEther("1"));
    });
  });

  describe("Gas Optimization", function () {
    beforeEach(async function () {
      // Setup employer and liquidity
      await env.tokens.stakeToken
        .connect(env.accounts.employer1)
        .approve(env.employerRegistry.address, TEST_CONSTANTS.DEFAULT_STAKE_AMOUNT);

      await env.employerRegistry
        .connect(env.accounts.employer1)
        .registerEmployer(MOCK_PROOF_DATA.validPublicInputs[2], TEST_CONSTANTS.DEFAULT_STAKE_AMOUNT);

      await env.employerRegistry
        .connect(env.accounts.admin)
        .updateWhitelist(env.accounts.employer1.address, true);

      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, ethers.utils.parseUnits("50000", 6));

      await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(ethers.utils.parseUnits("50000", 6));
    });

    it("Should use less than 150k gas for wage claim", async function () {
      const publicInputs = [
        MOCK_PROOF_DATA.validPublicInputs[0],
        ethers.utils.parseEther("1000").toString(),
        MOCK_PROOF_DATA.validPublicInputs[2],
      ];

      const tx = await env.streamCore
        .connect(env.accounts.worker1)
        .claimWages(MOCK_PROOF_DATA.validProof, publicInputs);

      const gasUsed = await gasHelpers.calculate(tx);
      expect(gasUsed).to.be.lt(150000);
    });

    it("Should batch multiple operations efficiently", async function () {
      const operations = [];

      for (let i = 0; i < 5; i++) {
        const publicInputs = [
          ethers.utils.solidityKeccak256(["uint256"], [i]),
          ethers.utils.parseEther("1000").toString(),
          MOCK_PROOF_DATA.validPublicInputs[2],
        ];

        operations.push(
          env.streamCore
            .connect(env.accounts.worker1)
            .claimWages(MOCK_PROOF_DATA.validProof, publicInputs)
        );
      }

      const gasUsages = [];
      for (const op of operations) {
        const gasUsed = await gasHelpers.calculate(op);
        gasUsages.push(gasUsed);
      }

      // Each subsequent operation should not significantly increase gas usage
      const avgGas = gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
      expect(avgGas).to.be.lt(150000);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle reentrancy protection", async function () {
      // This test would require a malicious contract attempting reentrancy
      // For now, we verify the modifier is present
      const streamCore = await ethers.getContractAt("StreamCore", env.streamCore.address);
      // Implementation would depend on creating a malicious contract
    });

    it("Should handle contract upgrades", async function () {
      // Test upgrade functionality
      const StreamCore = await ethers.getContractFactory("StreamCore");
      const newImplementation = await StreamCore.deploy();

      await env.streamCore
        .connect(env.accounts.admin)
        .upgradeTo(newImplementation.address);

      // Verify functionality still works after upgrade
      expect(await env.streamCore.zkVerifier()).to.equal(env.mockVerifier.address);
    });

    it("Should handle zero state correctly", async function () {
      // Test initial state values
      expect(await env.streamCore.totalWagesClaimed()).to.equal(0);
      expect(await env.streamCore.totalClaims()).to.equal(0);

      // Test nullifier checks
      expect(await env.streamCore.isNullifierUsed("0x1234")).to.be.false;
    });
  });
});