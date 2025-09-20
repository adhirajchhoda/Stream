# Stream Protocol Integration Guide

## Overview

This guide provides comprehensive instructions for integrating with the Stream Protocol smart contract suite. It covers deployment, configuration, and interaction patterns for all protocol components.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Contract Architecture](#contract-architecture)
3. [Deployment Guide](#deployment-guide)
4. [Integration Patterns](#integration-patterns)
5. [API Reference](#api-reference)
6. [Error Handling](#error-handling)
7. [Gas Optimization](#gas-optimization)
8. [Security Considerations](#security-considerations)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Local Development Setup

```bash
# Start local blockchain
npx hardhat node

# Deploy contracts
npm run deploy:local

# Run tests
npm test

# Generate gas report
npm run gas-report
```

---

## Contract Architecture

### Core Contracts

```
StreamCore (Main Entry Point)
├── ZK Proof Verification
├── Nullifier Management
├── Wage Disbursement
└── Employer Validation

StablecoinPool (Liquidity Management)
├── Liquidity Provision
├── Dynamic Fee Calculation
├── Yield Generation
└── Advance Disbursement

EmployerRegistry (Employer Management)
├── Registration & KYC
├── Stake Management
├── Reputation Tracking
└── Whitelist Control

StreamFactory (Deployment)
├── Contract Deployment
├── Proxy Management
└── Upgrade Coordination
```

### Contract Addresses

After deployment, contract addresses will be saved to `deployments/{network}.json`:

```json
{
  "network": "polygon",
  "contracts": {
    "factory": "0x...",
    "streamCore": {
      "proxy": "0x...",
      "implementation": "0x..."
    },
    "stablecoinPool": {
      "proxy": "0x...",
      "implementation": "0x..."
    },
    "employerRegistry": {
      "proxy": "0x...",
      "implementation": "0x..."
    }
  }
}
```

---

## Deployment Guide

### Network Configuration

Update `hardhat.config.js` with your network settings:

```javascript
networks: {
  polygon: {
    url: `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`,
    accounts: [PRIVATE_KEY],
    gasPrice: 30000000000,
  },
  // Add other networks...
}
```

### Deployment Steps

1. **Deploy to Testnet First**
```bash
# Deploy to Mumbai testnet
npm run deploy:mumbai

# Verify contracts
npm run verify:mumbai
```

2. **Test Integration**
```bash
# Run integration tests
npm run test:integration

# Perform gas analysis
npm run gas-analysis
```

3. **Deploy to Mainnet**
```bash
# Deploy to Polygon mainnet
npm run deploy:polygon

# Verify contracts
npm run verify:polygon
```

### Custom Deployment

For custom deployments, modify `scripts/deploy/deploy.js`:

```javascript
const deploymentParams = {
  zkVerifier: "0x...", // Your ZK verifier address
  stablecoin: "0x...", // USDC/USDT address
  stakeToken: "0x...", // Your stake token
  admin: "0x...", // Admin address
  minEmployerStake: ethers.utils.parseEther("5000"),
  stakeLockPeriod: 7 * 24 * 60 * 60, // 7 days
  // ... other parameters
};
```

---

## Integration Patterns

### 1. Wage Claiming Integration

```javascript
// Frontend integration for wage claims
class WageClaimIntegration {
  constructor(streamCoreAddress, provider) {
    this.streamCore = new ethers.Contract(
      streamCoreAddress,
      StreamCoreABI,
      provider
    );
  }

  async claimWages(proof, publicInputs, signer) {
    try {
      // Validate inputs
      this.validateClaimInputs(proof, publicInputs);

      // Estimate gas
      const gasEstimate = await this.streamCore
        .connect(signer)
        .estimateGas.claimWages(proof, publicInputs);

      // Submit transaction
      const tx = await this.streamCore
        .connect(signer)
        .claimWages(proof, publicInputs, {
          gasLimit: gasEstimate.mul(110).div(100), // 10% buffer
        });

      // Wait for confirmation
      const receipt = await tx.wait();
      return this.parseClaimEvents(receipt);

    } catch (error) {
      throw this.handleClaimError(error);
    }
  }

  validateClaimInputs(proof, publicInputs) {
    // Validate proof format
    if (!Array.isArray(proof) || proof.length !== 8) {
      throw new Error("Invalid proof format");
    }

    // Validate public inputs
    if (!Array.isArray(publicInputs) || publicInputs.length !== 3) {
      throw new Error("Invalid public inputs format");
    }

    // Validate nullifier
    if (publicInputs[0] === "0x0") {
      throw new Error("Invalid nullifier");
    }

    // Validate amount
    const amount = ethers.BigNumber.from(publicInputs[1]);
    if (amount.lte(0)) {
      throw new Error("Invalid amount");
    }
  }

  parseClaimEvents(receipt) {
    const claimEvent = receipt.events.find(e => e.event === "WagesClaimed");
    if (!claimEvent) {
      throw new Error("Claim event not found");
    }

    return {
      recipient: claimEvent.args.recipient,
      amount: claimEvent.args.amount,
      nullifier: claimEvent.args.nullifier,
      employer: claimEvent.args.employer,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
    };
  }
}
```

### 2. Liquidity Provider Integration

```javascript
class LiquidityProviderIntegration {
  constructor(stablecoinPoolAddress, provider) {
    this.pool = new ethers.Contract(
      stablecoinPoolAddress,
      StablecoinPoolABI,
      provider
    );
  }

  async addLiquidity(amount, signer) {
    try {
      // Check allowance
      const stablecoin = await this.getStablecoin();
      const allowance = await stablecoin.allowance(
        await signer.getAddress(),
        this.pool.address
      );

      if (allowance.lt(amount)) {
        // Approve tokens
        const approveTx = await stablecoin
          .connect(signer)
          .approve(this.pool.address, amount);
        await approveTx.wait();
      }

      // Add liquidity
      const tx = await this.pool
        .connect(signer)
        .addLiquidity(amount);

      const receipt = await tx.wait();
      return this.parseLiquidityEvents(receipt);

    } catch (error) {
      throw this.handleLiquidityError(error);
    }
  }

  async calculateShares(amount) {
    const totalSupply = await this.pool.totalSupply();
    const totalLiquidity = await this.pool.getTotalLiquidity();

    if (totalSupply.eq(0) || totalLiquidity.eq(0)) {
      return amount; // First provider gets 1:1 shares
    }

    return amount.mul(totalSupply).div(totalLiquidity);
  }

  async getPoolStats() {
    const stats = await this.pool.getPoolStats();
    return {
      totalLiquidity: stats[0],
      totalBorrowed: stats[1],
      totalFees: stats[2],
      utilization: stats[3],
      availableLiquidity: stats[4],
    };
  }
}
```

### 3. Employer Registration Integration

```javascript
class EmployerIntegration {
  constructor(employerRegistryAddress, provider) {
    this.registry = new ethers.Contract(
      employerRegistryAddress,
      EmployerRegistryABI,
      provider
    );
  }

  async registerEmployer(pubKeyHash, stakeAmount, signer) {
    try {
      // Validate inputs
      this.validateRegistrationInputs(pubKeyHash, stakeAmount);

      // Check and approve stake tokens
      await this.approveStakeTokens(stakeAmount, signer);

      // Register employer
      const tx = await this.registry
        .connect(signer)
        .registerEmployer(pubKeyHash, stakeAmount);

      const receipt = await tx.wait();
      return this.parseRegistrationEvents(receipt);

    } catch (error) {
      throw this.handleRegistrationError(error);
    }
  }

  async getEmployerStatus(employerAddress) {
    const info = await this.registry.getEmployerInfo(employerAddress);
    return {
      isRegistered: info.registrationTime.gt(0),
      isWhitelisted: info.isWhitelisted,
      stakeAmount: info.stakeAmount,
      reputationScore: info.reputationScore,
      registrationTime: info.registrationTime,
      lastActivityTime: info.lastActivityTime,
    };
  }
}
```

---

## API Reference

### StreamCore Interface

```solidity
interface IStreamCore {
    function claimWages(
        uint256[8] calldata proof,
        uint256[3] calldata publicInputs
    ) external returns (bool success);

    function isNullifierUsed(bytes32 nullifier) external view returns (bool);
    function getEmployerStake(address employer) external view returns (uint256);
    function getVerifier() external view returns (address);
}
```

### StablecoinPool Interface

```solidity
interface IStablecoinPool {
    function addLiquidity(uint256 amount) external returns (uint256 shares);
    function removeLiquidity(uint256 shares) external returns (uint256 amount);
    function calculateFee(uint256 amount) external view returns (uint256 fee);
    function getUtilizationRatio() external view returns (uint256);
    function getTotalLiquidity() external view returns (uint256);
    function getAvailableLiquidity() external view returns (uint256);
}
```

### EmployerRegistry Interface

```solidity
interface IEmployerRegistry {
    function registerEmployer(bytes32 pubKeyHash, uint256 stakeAmount) external;
    function updateWhitelist(address employer, bool whitelisted) external;
    function increaseStake(uint256 additionalStake) external;
    function decreaseStake(uint256 stakeReduction) external;
    function getEmployerInfo(address employer) external view returns (EmployerInfo memory);
    function isWhitelisted(address employer) external view returns (bool);
}
```

---

## Error Handling

### Common Error Codes

```javascript
const ERROR_CODES = {
  // StreamCore errors
  INVALID_PROOF: "StreamCore: invalid proof",
  NULLIFIER_USED: "StreamCore: nullifier already used",
  AMOUNT_OUT_OF_BOUNDS: "StreamCore: amount out of bounds",
  EMPLOYER_NOT_VERIFIED: "StreamCore: employer not verified",

  // StablecoinPool errors
  INSUFFICIENT_LIQUIDITY: "StablecoinPool: insufficient liquidity",
  UTILIZATION_TOO_HIGH: "StablecoinPool: utilization too high",
  INSUFFICIENT_SHARES: "StablecoinPool: insufficient shares",

  // EmployerRegistry errors
  ALREADY_REGISTERED: "EmployerRegistry: already registered",
  INSUFFICIENT_STAKE: "EmployerRegistry: insufficient stake",
  STAKE_LOCKED: "EmployerRegistry: stake still locked",

  // Access control errors
  ACCESS_DENIED: "AccessControl: account is missing role",
};

function handleContractError(error) {
  const message = error.message || error.reason || "";

  if (message.includes("invalid proof")) {
    return {
      code: "INVALID_PROOF",
      message: "The provided ZK proof is invalid",
      userMessage: "Proof verification failed. Please try again.",
    };
  }

  if (message.includes("nullifier already used")) {
    return {
      code: "NULLIFIER_USED",
      message: "This wage claim has already been processed",
      userMessage: "This claim has already been submitted.",
    };
  }

  // Add more error handling...

  return {
    code: "UNKNOWN_ERROR",
    message: message,
    userMessage: "An unexpected error occurred. Please try again.",
  };
}
```

---

## Gas Optimization

### Gas Estimation

```javascript
class GasEstimator {
  constructor(contracts) {
    this.contracts = contracts;
  }

  async estimateClaimWages(proof, publicInputs, signer) {
    try {
      const gasEstimate = await this.contracts.streamCore
        .connect(signer)
        .estimateGas.claimWages(proof, publicInputs);

      return {
        estimated: gasEstimate,
        recommended: gasEstimate.mul(110).div(100), // 10% buffer
        maxGas: 150000, // Protocol target
      };
    } catch (error) {
      // Handle estimation errors
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  async estimateLiquidityOperation(operation, amount, signer) {
    const gasEstimates = {
      addLiquidity: await this.contracts.stablecoinPool
        .connect(signer)
        .estimateGas.addLiquidity(amount),

      removeLiquidity: await this.contracts.stablecoinPool
        .connect(signer)
        .estimateGas.removeLiquidity(amount),
    };

    return gasEstimates[operation];
  }
}
```

### Gas Price Optimization

```javascript
async function getOptimalGasPrice(provider, priority = "standard") {
  const feeData = await provider.getFeeData();

  const gasPrices = {
    slow: feeData.gasPrice.mul(90).div(100), // 10% below market
    standard: feeData.gasPrice,
    fast: feeData.gasPrice.mul(110).div(100), // 10% above market
  };

  return gasPrices[priority] || gasPrices.standard;
}
```

---

## Security Considerations

### Input Validation

```javascript
function validateZKProof(proof, publicInputs) {
  // Validate proof structure
  if (!Array.isArray(proof) || proof.length !== 8) {
    throw new Error("Invalid proof format");
  }

  // Validate each proof element
  proof.forEach((element, index) => {
    if (!ethers.utils.isHexString(element, 32)) {
      throw new Error(`Invalid proof element at index ${index}`);
    }
  });

  // Validate public inputs
  if (!Array.isArray(publicInputs) || publicInputs.length !== 3) {
    throw new Error("Invalid public inputs format");
  }

  // Validate nullifier
  const nullifier = publicInputs[0];
  if (!ethers.utils.isHexString(nullifier, 32) || nullifier === "0x" + "0".repeat(64)) {
    throw new Error("Invalid nullifier");
  }

  // Validate amount
  try {
    const amount = ethers.BigNumber.from(publicInputs[1]);
    if (amount.lte(0)) {
      throw new Error("Amount must be positive");
    }
  } catch {
    throw new Error("Invalid amount format");
  }

  // Validate employer hash
  const employerHash = publicInputs[2];
  if (!ethers.utils.isHexString(employerHash, 32) || employerHash === "0x" + "0".repeat(64)) {
    throw new Error("Invalid employer hash");
  }
}
```

### Transaction Safety

```javascript
async function safeTransaction(contract, method, args, options = {}) {
  const {
    gasLimit,
    gasPrice,
    retries = 3,
    retryDelay = 1000,
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Estimate gas if not provided
      const estimatedGas = gasLimit || await contract.estimateGas[method](...args);

      // Execute transaction
      const tx = await contract[method](...args, {
        gasLimit: estimatedGas.mul(110).div(100), // 10% buffer
        gasPrice,
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        return receipt;
      } else {
        throw new Error("Transaction failed");
      }

    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      console.warn(`Transaction attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}
```

---

## Testing

### Integration Test Example

```javascript
describe("Stream Protocol Integration", function() {
  let contracts, accounts;

  beforeEach(async function() {
    const setup = await setupTestEnvironment();
    contracts = setup.contracts;
    accounts = setup.accounts;
  });

  describe("End-to-end Wage Claim Flow", function() {
    it("Should complete full wage claim process", async function() {
      // 1. Register employer
      await contracts.employerRegistry
        .connect(accounts.employer1)
        .registerEmployer(mockPubKeyHash, stakeAmount);

      // 2. Whitelist employer
      await contracts.employerRegistry
        .connect(accounts.admin)
        .updateWhitelist(accounts.employer1.address, true);

      // 3. Add liquidity
      await contracts.stablecoinPool
        .connect(accounts.liquidityProvider1)
        .addLiquidity(liquidityAmount);

      // 4. Claim wages
      const tx = await contracts.streamCore
        .connect(accounts.worker1)
        .claimWages(mockProof, mockPublicInputs);

      // 5. Verify results
      expect(tx).to.emit(contracts.streamCore, "WagesClaimed");

      const workerBalance = await contracts.usdc.balanceOf(accounts.worker1.address);
      expect(workerBalance).to.be.gt(0);
    });
  });
});
```

### Load Testing

```javascript
describe("Load Testing", function() {
  it("Should handle multiple concurrent claims", async function() {
    const claimPromises = [];

    for (let i = 0; i < 10; i++) {
      const uniquePublicInputs = [
        ethers.utils.solidityKeccak256(["uint256"], [i]),
        mockAmount.toString(),
        mockEmployerHash,
      ];

      claimPromises.push(
        contracts.streamCore
          .connect(accounts.worker1)
          .claimWages(mockProof, uniquePublicInputs)
      );
    }

    const results = await Promise.allSettled(claimPromises);
    const successful = results.filter(r => r.status === "fulfilled");

    expect(successful.length).to.equal(10);
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Transaction Reverts

**Symptom:** Transaction fails with generic revert message
**Solutions:**
- Check contract state (paused, sufficient liquidity, etc.)
- Validate input parameters
- Ensure proper allowances for token transfers
- Check gas limits

#### 2. High Gas Costs

**Symptom:** Transactions consuming excessive gas
**Solutions:**
- Use gas estimation before transactions
- Check for inefficient operations in custom code
- Consider transaction batching
- Review network congestion

#### 3. Proof Verification Failures

**Symptom:** ZK proof verification consistently fails
**Solutions:**
- Verify proof generation circuit matches deployed verifier
- Check public input formatting
- Ensure nullifier uniqueness
- Validate employer registration

### Debug Tools

```javascript
// Contract state inspection
async function debugContractState(contracts, address) {
  const streamCore = contracts.streamCore;

  console.log("StreamCore State:");
  console.log("- Verifier:", await streamCore.zkVerifier());
  console.log("- Pool:", await streamCore.stablecoinPool());
  console.log("- Registry:", await streamCore.employerRegistry());
  console.log("- Total Claims:", await streamCore.totalClaims());
  console.log("- Total Wages:", ethers.utils.formatEther(await streamCore.totalWagesClaimed()));

  if (address) {
    console.log(`\nEmployer ${address}:`);
    const stake = await streamCore.getEmployerStake(address);
    console.log("- Stake:", ethers.utils.formatEther(stake));
  }
}

// Transaction analysis
async function analyzeTransaction(provider, txHash) {
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);

  console.log("Transaction Analysis:");
  console.log("- Gas Used:", receipt.gasUsed.toString());
  console.log("- Gas Price:", ethers.utils.formatUnits(tx.gasPrice, "gwei"), "gwei");
  console.log("- Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("- Events:", receipt.events?.length || 0);
}
```

---

## Support and Resources

### Documentation
- [Technical Architecture](./technical_architecture.md)
- [API Design](./api_design.md)
- [Security Audit Checklist](./SECURITY_AUDIT_CHECKLIST.md)

### Community
- [GitHub Issues](https://github.com/stream-protocol/issues)
- [Discord Community](https://discord.gg/stream-protocol)
- [Developer Forum](https://forum.stream-protocol.com)

### Professional Services
- Integration support: dev@stream-protocol.com
- Security consulting: security@stream-protocol.com
- Partnership inquiries: partnerships@stream-protocol.com

---

*This integration guide is regularly updated. Please check for the latest version before implementing.*