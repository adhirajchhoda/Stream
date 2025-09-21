# Stream Protocol - Decentralized Earned Wage Access

## **Overview**

Stream Protocol revolutionizes earned wage access by leveraging Zero-Knowledge Proofs to enable instant, private wage advances without revealing employee or employer identities. 

## Architecture Overview

The Stream Protocol consists of three core smart contracts:

- **StreamCore**: Main verification contract handling ZK proof validation and wage disbursement
- **StablecoinPool**: Liquidity management for USDC/USDT with automated market making
- **EmployerRegistry**: Employer verification, stake management, and reputation tracking

## Features

### Zero-Knowledge Verification
- Groth16 ZK-SNARK proof verification
- Privacy-preserving wage claims
- Nullifier-based double-spending prevention
- Gas-optimized verification (<150k gas per claim)

### Stablecoin Liquidity Management
- Multi-token support (USDC, USDT)
- Dynamic fee calculation based on utilization
- Yield generation for liquidity providers
- Emergency pause and circuit breaker mechanisms

### Employer Management
- Stake-based security model
- Reputation scoring system
- Whitelist management
- Automated slashing for violations

### Upgradeable Architecture
- UUPS proxy pattern for future improvements
- Multi-network deployment (Ethereum, Polygon)
- Factory pattern for easy deployment
- Role-based access control

## Gas Optimization

Target gas usage per operation:

| Operation | Target | Status |
|-----------|--------|--------|
| claimWages | <150k | PASS |
| addLiquidity | <200k | PASS |
| removeLiquidity | <180k | PASS |
| disburseAdvance | <120k | PASS |
| registerEmployer | <250k | PASS |


## Security

### Security Features
- ReentrancyGuard on all external functions
- Access control with role-based permissions
- Input validation and bounds checking
- Emergency pause functionality
- Circuit breaker mechanisms

## Documentation

- [Technical Architecture](./technical_architecture.md)
- [API Design](./api_design.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Security Audit Checklist](./SECURITY_AUDIT_CHECKLIST.md)
- [Risk Assessment](./risk_assessment.md)

## Development

### Project Structure

```
contracts/
├── core/              # Core protocol contracts
├── interfaces/        # Contract interfaces
├── libraries/         # Utility libraries
├── proxies/          # Proxy and factory contracts
└── mocks/            # Test contracts

test/
├── unit/             # Unit tests
├── integration/      # Integration tests
├── edge-cases/       # Edge case and stress tests
└── fixtures/         # Test utilities

scripts/
├── deploy/           # Deployment scripts
├── verify/           # Contract verification
├── upgrade/          # Upgrade scripts
└── analysis/         # Gas and security analysis
```

### Key Scripts

```bash
# Development
npm run compile          # Compile contracts
npm run test            # Run tests
npm run coverage        # Test coverage
npm run size-contracts  # Contract size analysis

# Demo
npm run demo           # Interactive demo
npm run demo:auto      # Automated demo
npm test:demo          # Demo validation

# Deployment
npm run deploy:local   # Local deployment
npm run verify         # Verify contracts
npm run flatten        # Flatten contracts
```

## Frontend Applications

Stream Protocol has frontend applications available in dedicated branches:

### iOS Application (frontend-ios branch)
Stream Protocol includes a beautiful iOS application with:
- Modern SwiftUI interface with scenario-based theming
- Biometric authentication (Face ID, Touch ID)
- On-device ZK-proof generation
- Real-time work session tracking
- Multi-wallet integration (MetaMask, WalletConnect, Coinbase)
- Comprehensive dashboard and earnings tracking

### Web Frontend (web-frontend branch)
Web frontend development branch for future web-based user interface.


## Multi-Platform Support

### Supported Networks
- Ethereum Mainnet
- Polygon (Matic)
- Local Hardhat Network

### Supported Wallets
- MetaMask
- WalletConnect
- Coinbase Wallet
- Demo Mode (for testing)

## License

This project is licensed under the MIT License.
