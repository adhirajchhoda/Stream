# Stream Protocol - Decentralized Earned Wage Access

## **Overview**

Stream Protocol revolutionizes earned wage access by leveraging Zero-Knowledge Proofs to enable instant, private wage advances without revealing employee or employer identities. Built for PennApps hackathon.

## **Security First**

**IMPORTANT: This repository implements comprehensive security measures. All developers must read the [Security Guide](SECURITY.md) before contributing.**

### **Quick Security Check**

```bash
# Run security scan before any commit
./scripts/security/secret-scan.sh

# All CI/CD pipelines include automatic secret detection
# No secrets are allowed in git history
```

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

## Installation

```bash
# Clone the repository
git clone https://github.com/adhirajchhoda/Stream.git
cd Stream

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

## Quick Start

### Demo Mode
```bash
# Run the interactive demo
npm run demo

# Run specific scenarios
npm run demo:starbucks
npm run demo:amazon
npm run demo:uber

# Run automated demo
npm run demo:auto
```

### Docker Setup
```bash
# Start complete demo environment
docker-compose -f deployment/docker/docker-compose.demo.yml up -d

# Access services:
# - Demo App: http://localhost:3000
# - Monitoring: http://localhost:3002
# - Database: localhost:5432
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run coverage

# Run gas analysis
npm run gas-report

# Run specific test files
npx hardhat test test/unit/StreamCore.test.js
```

## Deployment

### Local Development

```bash
# Start local blockchain
npm run node

# Deploy contracts
npm run deploy:local
```

### Testnet Deployment

```bash
# Deploy to Polygon Mumbai
npm run deploy:polygon

# Deploy to Ethereum Sepolia
npm run deploy:ethereum
```

### Mainnet Deployment

```bash
# Deploy to Polygon Mainnet
npm run deploy:polygon

# Deploy to Ethereum Mainnet
npm run deploy:ethereum
```

## Gas Optimization

Target gas usage per operation:

| Operation | Target | Status |
|-----------|--------|--------|
| claimWages | <150k | PASS |
| addLiquidity | <200k | PASS |
| removeLiquidity | <180k | PASS |
| disburseAdvance | <120k | PASS |
| registerEmployer | <250k | PASS |

Run gas analysis:
```bash
npm run gas-report
```

## Security

### Security Features
- ReentrancyGuard on all external functions
- Access control with role-based permissions
- Input validation and bounds checking
- Emergency pause functionality
- Circuit breaker mechanisms

### Audit Status
- PASS: 0 critical vulnerabilities
- PASS: 0 high-severity vulnerabilities
- WARNING: 15 low-severity dev dependencies (acceptable for hackathon)

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

ios/                  # iOS Application
├── StreamApp/        # Main iOS app
├── ViewModels/       # Business logic
├── Services/         # Core services
└── Views/           # SwiftUI interfaces
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

## iOS Application

Stream Protocol includes a beautiful iOS application with:

- Modern SwiftUI interface with scenario-based theming
- Biometric authentication (Face ID, Touch ID)
- On-device ZK-proof generation
- Real-time work session tracking
- Multi-wallet integration (MetaMask, WalletConnect, Coinbase)
- Comprehensive dashboard and earnings tracking

### iOS Setup
```bash
cd ios/StreamApp
open StreamApp.xcodeproj
```

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

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Run security scans before commits
- Maintain test coverage above 90%
- Follow Solidity style guide
- Document all public functions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Hackathon

Built for **PennApps** hackathon with focus on:
- Zero-knowledge privacy
- DeFi innovation
- Mobile-first experience
- Enterprise-ready security

---

**WARNING - Disclaimer**: This software is in active development. Use at your own risk. Please conduct thorough testing before deploying to mainnet.