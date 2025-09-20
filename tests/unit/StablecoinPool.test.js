const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  setupTestEnvironment,
  TEST_CONSTANTS,
  expectRevert,
  expectEvent,
  timeHelpers,
  gasHelpers,
} = require("../fixtures/testData");

describe("StablecoinPool", function () {
  let env;

  beforeEach(async function () {
    env = await setupTestEnvironment();
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await env.stablecoinPool.stablecoin()).to.equal(env.tokens.usdc.address);
      expect(await env.stablecoinPool.name()).to.equal("Stream USDC Pool");
      expect(await env.stablecoinPool.symbol()).to.equal("sUSDC");
      expect(await env.stablecoinPool.minimumLockPeriod()).to.equal(TEST_CONSTANTS.MINIMUM_LOCK_PERIOD);
      expect(await env.stablecoinPool.withdrawalFee()).to.equal(TEST_CONSTANTS.WITHDRAWAL_FEE);
      expect(await env.stablecoinPool.performanceFee()).to.equal(TEST_CONSTANTS.PERFORMANCE_FEE);
    });

    it("Should set up roles correctly", async function () {
      const DEFAULT_ADMIN_ROLE = await env.stablecoinPool.DEFAULT_ADMIN_ROLE();
      const DISBURSER_ROLE = await env.stablecoinPool.DISBURSER_ROLE();

      expect(await env.stablecoinPool.hasRole(DEFAULT_ADMIN_ROLE, env.accounts.admin.address)).to.be.true;
      expect(await env.stablecoinPool.hasRole(DISBURSER_ROLE, env.streamCore.address)).to.be.true;
    });

    it("Should start with zero liquidity", async function () {
      expect(await env.stablecoinPool.getTotalLiquidity()).to.equal(0);
      expect(await env.stablecoinPool.getAvailableLiquidity()).to.equal(0);
      expect(await env.stablecoinPool.getUtilizationRatio()).to.equal(0);
    });
  });

  describe("Liquidity Management", function () {
    describe("Adding Liquidity", function () {
      it("Should add liquidity and mint LP tokens", async function () {
        const liquidityAmount = ethers.utils.parseUnits("10000", 6);

        await env.tokens.usdc
          .connect(env.accounts.liquidityProvider1)
          .approve(env.stablecoinPool.address, liquidityAmount);

        const tx = await env.stablecoinPool
          .connect(env.accounts.liquidityProvider1)
          .addLiquidity(liquidityAmount);

        const receipt = await tx.wait();

        // Check event emission
        expectEvent(receipt, "LiquidityAdded", {
          provider: env.accounts.liquidityProvider1.address,
          amount: liquidityAmount,
          shares: liquidityAmount, // First provider gets 1:1 shares
        });

        // Check balances
        expect(await env.stablecoinPool.balanceOf(env.accounts.liquidityProvider1.address)).to.equal(liquidityAmount);
        expect(await env.stablecoinPool.getTotalLiquidity()).to.equal(liquidityAmount);
        expect(await env.stablecoinPool.getAvailableLiquidity()).to.equal(liquidityAmount);
      });

      it("Should calculate shares correctly for subsequent providers", async function () {
        const firstAmount = ethers.utils.parseUnits("10000", 6);
        const secondAmount = ethers.utils.parseUnits("5000", 6);

        // First provider
        await env.tokens.usdc
          .connect(env.accounts.liquidityProvider1)
          .approve(env.stablecoinPool.address, firstAmount);

        await env.stablecoinPool
          .connect(env.accounts.liquidityProvider1)
          .addLiquidity(firstAmount);

        // Second provider
        await env.tokens.usdc
          .connect(env.accounts.liquidityProvider2)
          .approve(env.stablecoinPool.address, secondAmount);

        await env.stablecoinPool
          .connect(env.accounts.liquidityProvider2)
          .addLiquidity(secondAmount);

        // Check share distribution
        const expectedShares = secondAmount; // Should get proportional shares
        expect(await env.stablecoinPool.balanceOf(env.accounts.liquidityProvider2.address)).to.equal(expectedShares);

        // Check total liquidity
        expect(await env.stablecoinPool.getTotalLiquidity()).to.equal(firstAmount.add(secondAmount));
      });

      it("Should reject zero amount", async function () {
        await expectRevert(
          env.stablecoinPool.connect(env.accounts.liquidityProvider1).addLiquidity(0),
          "StablecoinPool: amount must be positive"
        );
      });

      it("Should reject insufficient allowance", async function () {
        const liquidityAmount = ethers.utils.parseUnits("10000", 6);

        await expectRevert(
          env.stablecoinPool
            .connect(env.accounts.liquidityProvider1)
            .addLiquidity(liquidityAmount),
          "ERC20: transfer amount exceeds allowance"
        );
      });
    });

    describe("Removing Liquidity", function () {
      beforeEach(async function () {
        // Setup initial liquidity
        const liquidityAmount = ethers.utils.parseUnits("10000", 6);

        await env.tokens.usdc
          .connect(env.accounts.liquidityProvider1)
          .approve(env.stablecoinPool.address, liquidityAmount);

        await env.stablecoinPool
          .connect(env.accounts.liquidityProvider1)
          .addLiquidity(liquidityAmount);
      });

      it("Should remove liquidity and burn LP tokens", async function () {
        const sharesToBurn = ethers.utils.parseUnits("5000", 6);
        const expectedAmount = sharesToBurn; // 1:1 ratio for single provider

        const tx = await env.stablecoinPool
          .connect(env.accounts.liquidityProvider1)
          .removeLiquidity(sharesToBurn);

        const receipt = await tx.wait();

        // Check event emission
        expectEvent(receipt, "LiquidityRemoved", {
          provider: env.accounts.liquidityProvider1.address,
          amount: expectedAmount,
          shares: sharesToBurn,
        });

        // Check balances
        const remainingShares = ethers.utils.parseUnits("5000", 6);
        expect(await env.stablecoinPool.balanceOf(env.accounts.liquidityProvider1.address)).to.equal(remainingShares);
        expect(await env.stablecoinPool.getTotalLiquidity()).to.equal(remainingShares);
      });

      it("Should apply early withdrawal fee when within lock period", async function () {
        const sharesToBurn = ethers.utils.parseUnits("1000", 6);
        const expectedGrossAmount = sharesToBurn;
        const expectedFee = expectedGrossAmount.mul(TEST_CONSTANTS.WITHDRAWAL_FEE).div(10000);
        const expectedNetAmount = expectedGrossAmount.sub(expectedFee);

        const tx = await env.stablecoinPool
          .connect(env.accounts.liquidityProvider1)
          .removeLiquidity(sharesToBurn);

        const receipt = await tx.wait();

        // Check that net amount is reduced by fee
        expectEvent(receipt, "LiquidityRemoved", {
          provider: env.accounts.liquidityProvider1.address,
          amount: expectedNetAmount,
          shares: sharesToBurn,
        });
      });

      it("Should not apply withdrawal fee after lock period", async function () {
        // Fast forward past lock period
        await timeHelpers.increase(TEST_CONSTANTS.MINIMUM_LOCK_PERIOD + 1);

        const sharesToBurn = ethers.utils.parseUnits("1000", 6);
        const expectedAmount = sharesToBurn;

        const tx = await env.stablecoinPool
          .connect(env.accounts.liquidityProvider1)
          .removeLiquidity(sharesToBurn);

        const receipt = await tx.wait();

        // Should get full amount without fee
        expectEvent(receipt, "LiquidityRemoved", {
          provider: env.accounts.liquidityProvider1.address,
          amount: expectedAmount,
          shares: sharesToBurn,
        });
      });

      it("Should reject removal with insufficient shares", async function () {
        const excessiveShares = ethers.utils.parseUnits("20000", 6);

        await expectRevert(
          env.stablecoinPool
            .connect(env.accounts.liquidityProvider1)
            .removeLiquidity(excessiveShares),
          "StablecoinPool: insufficient shares"
        );
      });

      it("Should reject removal when insufficient pool liquidity", async function () {
        // Simulate borrowing most of the liquidity
        const borrowAmount = ethers.utils.parseUnits("9000", 6);

        await env.stablecoinPool
          .connect(env.accounts.admin)
          .disburseAdvance(env.accounts.worker1.address, borrowAmount);

        const sharesToBurn = ethers.utils.parseUnits("5000", 6);

        await expectRevert(
          env.stablecoinPool
            .connect(env.accounts.liquidityProvider1)
            .removeLiquidity(sharesToBurn),
          "StablecoinPool: insufficient liquidity"
        );
      });
    });
  });

  describe("Advance Disbursement", function () {
    beforeEach(async function () {
      // Setup liquidity
      const liquidityAmount = ethers.utils.parseUnits("50000", 6);

      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, liquidityAmount);

      await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(liquidityAmount);
    });

    it("Should disburse advance with correct fee", async function () {
      const advanceAmount = ethers.utils.parseUnits("1000", 6);
      const expectedFee = await env.stablecoinPool.calculateFee(advanceAmount);
      const expectedNetAmount = advanceAmount.sub(expectedFee);

      const initialBalance = await env.tokens.usdc.balanceOf(env.accounts.worker1.address);

      const tx = await env.stablecoinPool
        .connect(env.accounts.admin)
        .disburseAdvance(env.accounts.worker1.address, advanceAmount);

      const receipt = await tx.wait();

      // Check event emission
      expectEvent(receipt, "AdvanceDisbursed", {
        recipient: env.accounts.worker1.address,
        amount: expectedNetAmount,
        fee: expectedFee,
      });

      // Check balances
      const finalBalance = await env.tokens.usdc.balanceOf(env.accounts.worker1.address);
      expect(finalBalance.sub(initialBalance)).to.equal(expectedNetAmount);

      // Check pool state
      expect(await env.stablecoinPool.totalBorrowed()).to.equal(advanceAmount);
      expect(await env.stablecoinPool.totalFeesCollected()).to.equal(expectedFee);
    });

    it("Should calculate dynamic fees based on utilization", async function () {
      const smallAdvance = ethers.utils.parseUnits("1000", 6);
      const largeAdvance = ethers.utils.parseUnits("40000", 6);

      const smallFee = await env.stablecoinPool.calculateFee(smallAdvance);

      // Make a large advance to increase utilization
      await env.stablecoinPool
        .connect(env.accounts.admin)
        .disburseAdvance(env.accounts.worker1.address, largeAdvance);

      const largeFee = await env.stablecoinPool.calculateFee(smallAdvance);

      // Fee should be higher with higher utilization
      expect(largeFee).to.be.gt(smallFee);
    });

    it("Should reject advance exceeding utilization limit", async function () {
      const excessiveAdvance = ethers.utils.parseUnits("48000", 6); // >95% utilization

      await expectRevert(
        env.stablecoinPool
          .connect(env.accounts.admin)
          .disburseAdvance(env.accounts.worker1.address, excessiveAdvance),
        "StablecoinPool: utilization too high"
      );
    });

    it("Should reject advance from unauthorized caller", async function () {
      const advanceAmount = ethers.utils.parseUnits("1000", 6);

      await expectRevert(
        env.stablecoinPool
          .connect(env.accounts.worker1)
          .disburseAdvance(env.accounts.worker1.address, advanceAmount),
        "AccessControl:"
      );
    });

    it("Should reject advance with zero amount", async function () {
      await expectRevert(
        env.stablecoinPool
          .connect(env.accounts.admin)
          .disburseAdvance(env.accounts.worker1.address, 0),
        "StablecoinPool: amount must be positive"
      );
    });

    it("Should reject advance to zero address", async function () {
      const advanceAmount = ethers.utils.parseUnits("1000", 6);

      await expectRevert(
        env.stablecoinPool
          .connect(env.accounts.admin)
          .disburseAdvance(ethers.constants.AddressZero, advanceAmount),
        "StablecoinPool: invalid recipient"
      );
    });
  });

  describe("Fee Management", function () {
    beforeEach(async function () {
      // Setup liquidity and generate some fees
      const liquidityAmount = ethers.utils.parseUnits("50000", 6);

      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, liquidityAmount);

      await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(liquidityAmount);

      // Generate fees through advances
      const advanceAmount = ethers.utils.parseUnits("10000", 6);
      await env.stablecoinPool
        .connect(env.accounts.admin)
        .disburseAdvance(env.accounts.worker1.address, advanceAmount);
    });

    it("Should distribute fees correctly", async function () {
      const feesCollected = await env.stablecoinPool.totalFeesCollected();
      const performanceFeeAmount = feesCollected.mul(TEST_CONSTANTS.PERFORMANCE_FEE).div(10000);
      const lpFeeAmount = feesCollected.sub(performanceFeeAmount);

      const initialLiquidity = await env.stablecoinPool.getTotalLiquidity();
      const initialAdminBalance = await env.tokens.usdc.balanceOf(env.accounts.admin.address);

      const tx = await env.stablecoinPool
        .connect(env.accounts.admin)
        .distributeFees();

      const receipt = await tx.wait();

      // Check event emission
      expectEvent(receipt, "FeesCollected");

      // Check that LP fees were added to liquidity
      const finalLiquidity = await env.stablecoinPool.getTotalLiquidity();
      expect(finalLiquidity.sub(initialLiquidity)).to.equal(lpFeeAmount);

      // Check that performance fee was sent to admin
      const finalAdminBalance = await env.tokens.usdc.balanceOf(env.accounts.admin.address);
      expect(finalAdminBalance.sub(initialAdminBalance)).to.equal(performanceFeeAmount);

      // Check that fees are reset
      expect(await env.stablecoinPool.totalFeesCollected()).to.equal(0);
    });

    it("Should reject fee distribution when no fees", async function () {
      // First distribute existing fees
      await env.stablecoinPool.connect(env.accounts.admin).distributeFees();

      // Try to distribute again
      await expectRevert(
        env.stablecoinPool.connect(env.accounts.admin).distributeFees(),
        "StablecoinPool: no fees to distribute"
      );
    });
  });

  describe("Yield Generation", function () {
    beforeEach(async function () {
      // Setup liquidity
      const liquidityAmount = ethers.utils.parseUnits("100000", 6);

      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, liquidityAmount);

      await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(liquidityAmount);
    });

    it("Should generate yield over time", async function () {
      const initialLiquidity = await env.stablecoinPool.getTotalLiquidity();

      // Fast forward 30 days
      await timeHelpers.increase(30 * 24 * 60 * 60);

      // Trigger yield update
      await env.stablecoinPool.connect(env.accounts.admin).updateYield();

      const finalLiquidity = await env.stablecoinPool.getTotalLiquidity();

      // Should have generated some yield
      expect(finalLiquidity).to.be.gt(initialLiquidity);
    });

    it("Should update yield automatically on token transfers", async function () {
      const initialLiquidity = await env.stablecoinPool.getTotalLiquidity();

      // Fast forward time
      await timeHelpers.increase(7 * 24 * 60 * 60);

      // Add more liquidity (triggers yield update)
      const additionalLiquidity = ethers.utils.parseUnits("10000", 6);

      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, additionalLiquidity);

      await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(additionalLiquidity);

      const finalLiquidity = await env.stablecoinPool.getTotalLiquidity();

      // Should include both additional liquidity and yield
      expect(finalLiquidity).to.be.gt(initialLiquidity.add(additionalLiquidity));
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update parameters", async function () {
      const newWithdrawalFee = 300; // 3%

      const tx = await env.stablecoinPool
        .connect(env.accounts.admin)
        .updateParameter("withdrawalFee", newWithdrawalFee);

      const receipt = await tx.wait();

      expectEvent(receipt, "ParametersUpdated", {
        parameter: "withdrawalFee",
        oldValue: TEST_CONSTANTS.WITHDRAWAL_FEE,
        newValue: newWithdrawalFee,
      });

      expect(await env.stablecoinPool.withdrawalFee()).to.equal(newWithdrawalFee);
    });

    it("Should reject invalid parameter updates", async function () {
      await expectRevert(
        env.stablecoinPool
          .connect(env.accounts.admin)
          .updateParameter("invalidParameter", 100),
        "StablecoinPool: invalid parameter"
      );

      await expectRevert(
        env.stablecoinPool
          .connect(env.accounts.admin)
          .updateParameter("withdrawalFee", 1500), // >10%
        "StablecoinPool: fee too high"
      );
    });

    it("Should allow pause and unpause", async function () {
      await env.stablecoinPool.connect(env.accounts.admin).pause();
      expect(await env.stablecoinPool.paused()).to.be.true;

      await expectRevert(
        env.stablecoinPool
          .connect(env.accounts.liquidityProvider1)
          .addLiquidity(ethers.utils.parseUnits("1000", 6)),
        "Pausable: paused"
      );

      await env.stablecoinPool.connect(env.accounts.admin).unpause();
      expect(await env.stablecoinPool.paused()).to.be.false;
    });
  });

  describe("Gas Optimization", function () {
    it("Should efficiently handle liquidity operations", async function () {
      const liquidityAmount = ethers.utils.parseUnits("10000", 6);

      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, liquidityAmount);

      const tx = await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(liquidityAmount);

      const gasUsed = await gasHelpers.calculate(tx);
      expect(gasUsed).to.be.lt(200000); // Reasonable gas limit for liquidity operations
    });

    it("Should efficiently handle advance disbursement", async function () {
      // Setup liquidity first
      const liquidityAmount = ethers.utils.parseUnits("50000", 6);

      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, liquidityAmount);

      await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(liquidityAmount);

      // Test disbursement gas usage
      const advanceAmount = ethers.utils.parseUnits("1000", 6);

      const tx = await env.stablecoinPool
        .connect(env.accounts.admin)
        .disburseAdvance(env.accounts.worker1.address, advanceAmount);

      const gasUsed = await gasHelpers.calculate(tx);
      expect(gasUsed).to.be.lt(150000); // Should be efficient
    });
  });

  describe("Integration with StreamCore", function () {
    it("Should work seamlessly with wage claims", async function () {
      // This test would involve setting up the full system
      // and testing end-to-end wage claim flow

      // Setup liquidity
      const liquidityAmount = ethers.utils.parseUnits("50000", 6);

      await env.tokens.usdc
        .connect(env.accounts.liquidityProvider1)
        .approve(env.stablecoinPool.address, liquidityAmount);

      await env.stablecoinPool
        .connect(env.accounts.liquidityProvider1)
        .addLiquidity(liquidityAmount);

      // Verify disburser role
      const DISBURSER_ROLE = await env.stablecoinPool.DISBURSER_ROLE();
      expect(await env.stablecoinPool.hasRole(DISBURSER_ROLE, env.streamCore.address)).to.be.true;

      // Test that StreamCore can call disburseAdvance
      const advanceAmount = ethers.utils.parseUnits("1000", 6);
      const tx = await env.stablecoinPool
        .connect(env.streamCore.address)
        .disburseAdvance(env.accounts.worker1.address, advanceAmount);

      // Should succeed without reverting
      await expect(tx).to.not.be.reverted;
    });
  });
});