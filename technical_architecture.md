# Stream Protocol Technical Architecture
## Multi-Rail Payment System Design

### EXECUTIVE SUMMARY

Stream Protocol implements a decentralized earned wage access system using Zero-Knowledge Proofs and multiple payment rails. The architecture prioritizes **stablecoins (USDC/USDT)** for initial deployment while supporting future integration of ACH, card networks, and digital wallets.

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Employee     │    │    Employer      │    │ Liquidity Pool  │
│   (ZKP Proof)   │    │  (Attestation)   │    │   Providers     │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          │ 1. Request Advance   │ 2. Issue Attestation  │ 3. Provide Capital
          │                      │                       │
          └──────────────────────┼───────────────────────┼───────────
                                 │                       │
                          ┌──────▼───────────────────────▼──────┐
                          │        Stream Protocol Core         │
                          │    (Smart Contracts + API)         │
                          └──────┬───────────────────────┬──────┘
                                 │                       │
                   ┌─────────────▼─────────────┐        │
                   │    Payment Rail Router    │        │
                   │   (Multi-Rail Manager)    │        │
                   └─────────────┬─────────────┘        │
                                 │                       │
        ┌────────────────────────┼───────────────────────┼────────────────────────┐
        │                        │                       │                        │
   ┌────▼────┐            ┌─────▼─────┐          ┌─────▼─────┐             ┌─────▼─────┐
   │  USDC   │            │    ACH    │          │   Card    │             │  Digital  │
   │ (Primary)│            │(Future)   │          │ Networks  │             │  Wallets  │
   │Ethereum │            │           │          │ (Future)  │             │ (Future)  │
   │Polygon  │            │           │          │           │             │           │
   └─────────┘            └───────────┘          └───────────┘             └───────────┘
```

---

## CORE COMPONENTS

### 1. ZKP Verification Engine

**Purpose**: Verify zero-knowledge proofs of wage attestations without revealing sensitive data.

**Architecture**:
```typescript
interface ZKPVerificationEngine {
  verifyProof(proof: ZKProof, publicInputs: PublicInputs): Promise<VerificationResult>
  validateNullifier(nullifier: string): Promise<boolean>
  updateCircuitParameters(newVK: VerificationKey): Promise<void>
}

interface ZKProof {
  proof: string          // zk-SNARK proof data
  publicInputs: {
    wageAmount: string
    employerCommitment: string
    nullifierHash: string
  }
}
```

**Technology Stack**:
- **Primary**: Circom + snarkjs for circuit definition
- **Performance**: rapidsnark (C++) for mobile proof generation
- **Verification**: Groth16 on-chain verification
- **Circuit**: Poseidon hash, EdDSA signature verification

### 2. Payment Rail Router

**Purpose**: Intelligently route transactions across multiple payment rails based on cost, speed, and availability.

**Architecture**:
```typescript
interface PaymentRailRouter {
  selectOptimalRail(request: AdvanceRequest): Promise<RailSelection>
  executePayment(advance: WageAdvance, rail: PaymentRail): Promise<TransactionResult>
  handleFailover(failedAdvance: WageAdvance): Promise<TransactionResult>
}

interface RailSelection {
  primaryRail: PaymentRail
  fallbackRails: PaymentRail[]
  estimatedCost: string
  estimatedTime: number
  reasoning: string
}
```

**Routing Logic**:
1. **Cost Optimization**: Calculate total fees including gas, processing, and slippage
2. **Speed Requirements**: Match user preferences with rail settlement times
3. **Liquidity Availability**: Check real-time pool balances
4. **Success Probability**: Historical reliability metrics per rail

### 3. Smart Contract Architecture

**Core Contracts**:

```solidity
// Primary coordination contract
contract StreamCore {
    mapping(bytes32 => bool) public nullifiers;
    mapping(address => uint256) public advanceLimits;

    function requestAdvance(
        ZKProof memory proof,
        uint256 amount,
        address paymentRail,
        bytes32 nullifier
    ) external returns (bytes32 advanceId);

    function verifyProof(ZKProof memory proof) internal returns (bool);
}

// Individual payment rail implementations
contract StablecoinRail is IPaymentRail {
    IERC20 public stablecoin;
    ILiquidityPool public liquidityPool;

    function disburse(address recipient, uint256 amount) external override;
    function repay(bytes32 advanceId, uint256 amount) external override;
}

// Automated repayment system
contract RepaymentRouter {
    function interceptDirectDeposit(
        address employee,
        uint256 amount,
        bytes32[] calldata advanceIds
    ) external;
}
```

---

## PAYMENT RAIL IMPLEMENTATIONS

### 1. STABLECOIN RAILS (PRIMARY - HACKATHON FOCUS)

**USDC on Ethereum**:
```typescript
class USDCEthereumRail implements PaymentRail {
  async disburse(advance: WageAdvance): Promise<TransactionResult> {
    // 1. Check liquidity pool balance
    const poolBalance = await this.liquidityPool.getBalance()
    if (poolBalance < advance.amount) throw new InsufficientLiquidityError()

    // 2. Calculate gas fees
    const gasPrice = await this.getOptimalGasPrice()
    const gasLimit = 65000 // Standard ERC20 transfer

    // 3. Execute transfer from pool to employee
    const tx = await this.liquidityPool.transfer(advance.employeeWallet, advance.netAmount)

    // 4. Update pool accounting
    await this.updatePoolUtilization(advance.amount)

    return {
      transactionHash: tx.hash,
      blockNumber: tx.blockNumber,
      settlementTime: tx.timestamp,
      actualCost: gasPrice * gasLimit
    }
  }
}
```

**USDC on Polygon** (Lower cost alternative):
```typescript
class USDCPolygonRail implements PaymentRail {
  // Similar implementation but:
  // - Lower gas costs (~$0.01 vs $2-5)
  // - Faster finality (2-3 seconds vs 12-15 seconds)
  // - Same USDC backing and liquidity
  // - Bridge considerations for cross-chain liquidity
}
```

**Advantages for Hackathon**:
- ✅ **No external APIs required** - Direct smart contract interaction
- ✅ **Instant settlement** - 15 seconds on Ethereum, 2 seconds on Polygon
- ✅ **Global accessibility** - No geographic restrictions
- ✅ **Low operational overhead** - No compliance integrations needed
- ✅ **Perfect DeFi integration** - Native liquidity pool support

### 2. ACH RAILS (FUTURE IMPLEMENTATION)

**Technical Integration**:
```typescript
class ACHRail implements PaymentRail {
  private plaidClient: PlaidApi
  private dwollaClient: DwollaApi

  async disburse(advance: WageAdvance): Promise<TransactionResult> {
    // 1. Validate bank account via Plaid
    const accountValid = await this.plaidClient.validateAccount(advance.bankAccount)

    // 2. Initiate ACH transfer via Dwolla
    const transfer = await this.dwollaClient.initiateTransfer({
      source: this.liquidityPoolBankAccount,
      destination: advance.bankAccount,
      amount: advance.netAmount
    })

    // 3. Setup monitoring for settlement (1-3 days)
    await this.scheduleSettlementCheck(transfer.id, advance.id)

    return {
      transferId: transfer.id,
      estimatedSettlement: Date.now() + (3 * 24 * 60 * 60 * 1000), // 3 days
      status: 'PENDING'
    }
  }
}
```

**Integration Requirements**:
- **Banking Partner**: Dwolla, Stripe Treasury, or direct bank relationships
- **Account Verification**: Plaid or similar for instant bank verification
- **Compliance Infrastructure**: KYC/AML, BSA reporting, state money transmitter licenses
- **Settlement Reconciliation**: Track 1-3 day settlement cycles

### 3. CARD NETWORK RAILS (FUTURE IMPLEMENTATION)

**Technical Integration**:
```typescript
class CardRail implements PaymentRail {
  private stripeClient: Stripe

  async disburse(advance: WageAdvance): Promise<TransactionResult> {
    // Option A: Virtual Card Issuance
    const virtualCard = await this.stripeClient.issuing.cards.create({
      type: 'virtual',
      currency: 'usd',
      spending_controls: {
        spending_limits: [{ amount: advance.amount * 100, interval: 'per_authorization' }]
      }
    })

    // Option B: Direct Push-to-Card
    const transfer = await this.stripeClient.transfers.create({
      amount: advance.amount * 100,
      currency: 'usd',
      destination: advance.cardToken,
      source_type: 'card'
    })

    return {
      cardNumber: virtualCard.number, // If virtual card
      transferId: transfer.id,        // If push-to-card
      settlementTime: Date.now(),     // Instant
      fees: advance.amount * 0.029 + 30 // 2.9% + $0.30
    }
  }
}
```

**Integration Requirements**:
- **Card Issuer Partnership**: Stripe Issuing, Marqeta, or bank partnerships
- **PCI DSS Compliance**: Secure card data handling infrastructure
- **Dispute Handling**: Chargeback and dispute resolution processes
- **High Fee Management**: 2.9% + $0.30 per transaction economics

---

## LIQUIDITY POOL ARCHITECTURE

### Multi-Rail Pool Design

```typescript
interface LiquidityPoolManager {
  // Core pool operations
  deposit(rail: PaymentRail, amount: string, provider: string): Promise<DepositResult>
  withdraw(rail: PaymentRail, amount: string, provider: string): Promise<WithdrawResult>

  // Cross-rail liquidity management
  rebalancePools(): Promise<RebalanceResult>
  calculateYield(rail: PaymentRail, utilization: number): Promise<number>

  // Risk management
  assessAdvanceRisk(advance: WageAdvance): Promise<RiskScore>
  updatePoolParameters(rail: PaymentRail, params: PoolParams): Promise<void>
}
```

### Yield Calculation Model

```typescript
// Dynamic yield based on utilization and risk
function calculateYield(poolState: PoolState): number {
  const baseYield = 0.08 // 8% base APR
  const utilizationBonus = poolState.utilization * 0.15 // Up to 15% bonus at 100% utilization
  const riskPremium = poolState.averageRiskScore * 0.05 // Risk-adjusted premium

  return baseYield + utilizationBonus + riskPremium
}

// Rail-specific yield adjustments
const railMultipliers = {
  'USDC_ETHEREUM': 1.0,    // Baseline
  'USDC_POLYGON': 0.95,    // Lower cost, slightly lower yield
  'ACH': 1.2,              // Higher risk, higher yield
  'CARD': 1.5              // Highest risk (chargebacks), highest yield
}
```

---

## MULTI-RAIL MIGRATION STRATEGY

### Phase 1: Stablecoin Foundation (Hackathon - Week 1)
```typescript
// Initial implementation priorities
const phase1Rails = [
  'USDC_ETHEREUM',   // Primary rail
  'USDT_ETHEREUM',   // Backup stablecoin
  'USDC_POLYGON'     // Low-cost alternative
]

// Core features
- ZKP verification system
- Basic liquidity pools
- Simple advance/repayment flow
- Employer attestation system
```

### Phase 2: Traditional Finance Bridge (Week 2-4)
```typescript
// Add traditional rails
const phase2Rails = [
  ...phase1Rails,
  'ACH',             // Traditional banking
  'DEBIT_CARD'       // Push-to-debit functionality
]

// Enhanced features
- Bank account verification
- KYC/AML compliance framework
- Multi-day settlement tracking
- Fiat on/off ramps
```

### Phase 3: Full Multi-Rail Ecosystem (Month 2+)
```typescript
// Complete rail ecosystem
const phase3Rails = [
  ...phase2Rails,
  'CREDIT_CARD',     // Virtual card issuance
  'PAYPAL',          // Digital wallet integration
  'VENMO',           // P2P payment integration
  'ZELLE',           // Bank-to-bank instant
  'WIRE_TRANSFER'    // Large amounts, same-day
]

// Advanced features
- AI-powered rail optimization
- Cross-border payments
- Regulatory compliance automation
- Advanced risk modeling
```

### Migration Architecture

```typescript
class RailMigrationManager {
  async migrateUserToNewRail(
    user: string,
    fromRail: PaymentRail,
    toRail: PaymentRail
  ): Promise<MigrationResult> {
    // 1. Verify user eligibility for new rail
    const eligible = await this.checkRailEligibility(user, toRail)
    if (!eligible) throw new MigrationError('User not eligible for target rail')

    // 2. Migrate outstanding advances
    const outstandingAdvances = await this.getOutstandingAdvances(user, fromRail)
    for (const advance of outstandingAdvances) {
      await this.transferAdvanceToNewRail(advance, toRail)
    }

    // 3. Update user preferences
    await this.updateUserPreferences(user, { primaryRail: toRail })

    // 4. Notify user of migration completion
    await this.notifyUser(user, `Migration to ${toRail} completed`)

    return { success: true, migratedAdvances: outstandingAdvances.length }
  }
}
```

---

## RISK ASSESSMENT FRAMEWORK

### Multi-Rail Risk Factors

```typescript
interface RiskAssessment {
  // Employee-specific risks
  employeeRisk: {
    repaymentHistory: number    // 0.5-2.0 multiplier
    advanceFrequency: number    // Frequency pattern analysis
    employerStability: number   // Employer verification tier
    advanceAmount: number       // Size relative to wages
  }

  // Rail-specific risks
  railRisk: {
    'USDC': 0.02,              // Very low - smart contract risk only
    'ACH': 0.05,               // Low - bank failure/account closure
    'CARD': 0.15,              // Medium - chargebacks possible
    'DIGITAL_WALLET': 0.08     // Low-medium - account freezing
  }

  // Systemic risks
  systemRisk: {
    liquidityStress: number     // Pool utilization stress
    marketVolatility: number    // Crypto market conditions
    regulatoryRisk: number      // Changing regulatory landscape
  }
}
```

### Dynamic Risk Pricing

```typescript
function calculateAdvanceFee(advance: WageAdvance, risk: RiskAssessment): number {
  const baseFee = advance.rail.baseFee
  const riskMultiplier = risk.employeeRisk * risk.railRisk * risk.systemRisk
  const dynamicFee = baseFee * riskMultiplier

  // Cap fees at reasonable levels
  const maxFeePercentage = 0.05 // 5% max fee
  const cappedFee = Math.min(dynamicFee, advance.amount * maxFeePercentage)

  return cappedFee
}
```

---

## TECHNICAL IMPLEMENTATION TIMELINE

### Hackathon 48-Hour Sprint

**Hour 0-12: Core Infrastructure**
- [ ] Deploy basic smart contracts (StreamCore, USDCRail)
- [ ] Implement ZKP verification endpoint
- [ ] Create simple liquidity pool
- [ ] Basic advance request/disbursement flow

**Hour 12-24: Employee Experience**
- [ ] Build frontend for advance requests
- [ ] Implement wallet connection (MetaMask/WalletConnect)
- [ ] Create ZKP proof generation (mobile-optimized)
- [ ] Add real-time transaction status

**Hour 24-36: Employer Integration**
- [ ] Employer registration and verification
- [ ] Wage attestation API
- [ ] Demo payroll integration
- [ ] Attestation signing workflow

**Hour 36-48: Demo Polish**
- [ ] End-to-end testing
- [ ] Error handling and edge cases
- [ ] Demo data and scenarios
- [ ] Presentation preparation

### Post-Hackathon Development

**Week 1-2: Production Hardening**
- Security audits and testing
- Gas optimization
- Performance monitoring
- Multi-rail router implementation

**Week 3-4: Traditional Finance Integration**
- Banking partner negotiations
- KYC/AML framework
- ACH rail implementation
- Compliance documentation

**Month 2+: Ecosystem Expansion**
- Additional rail integrations
- Advanced risk modeling
- International expansion
- Enterprise partnerships

---

## CONCLUSION

The Stream Protocol's multi-rail architecture provides a robust foundation for decentralized earned wage access. By starting with stablecoins for the hackathon demo, the system can deliver immediate value while maintaining the flexibility to integrate traditional payment rails as the ecosystem matures.

The modular design ensures that each payment rail can be optimized independently while sharing common infrastructure for ZKP verification, risk assessment, and liquidity management. This approach balances the need for rapid hackathon development with long-term scalability and production readiness.