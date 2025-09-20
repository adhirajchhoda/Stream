# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stream is a decentralized protocol for earned wage access using Zero-Knowledge Proofs. The protocol allows employees to instantly access their earned wages by submitting cryptographic proofs, completely decoupling their liquidity from their employer's pay schedule.

**Core Innovation**: Uses zk-SNARKs to prove "I have earned X wages from a verified employer" without revealing personal information, enabling trustless access to a global liquidity pool.

## Architecture

```
Employee → Employer Attestation → ZKP Generation → Smart Contract Verification → Liquidity Pool
```

### Key Components

1. **ZKP Circuit (`circuits/`)**
   - Circom circuit for wage proof verification
   - Verifies employer signature without revealing identity
   - Generates nullifiers to prevent double-spending

2. **Smart Contracts (`contracts/`)**
   - `StreamLiquidityPool.sol`: Main pool for wage advances
   - `ZKVerifier.sol`: Auto-generated proof verifier
   - `EmployerRegistry.sol`: Whitelisted employer management

3. **Backend Services (`backend/`)**
   - Attestation API for employer wage signing
   - Proof generation service (SnarkJS integration)
   - Database layer (PostgreSQL + Redis)

4. **Testing Infrastructure (`test/`)**
   - Circuit constraint testing
   - Smart contract security testing
   - Integration testing for full flow

## Development Commands

### Environment Setup
```bash
# Install dependencies
npm install

# Setup local blockchain
npx hardhat node

# Setup PostgreSQL and Redis
docker-compose up -d db redis

# Generate circuit artifacts
npm run circuit:build
```

### Core Development
```bash
# Build ZKP circuits
npm run circuit:compile
npm run circuit:setup          # Trusted setup ceremony
npm run circuit:verify         # Test proof generation

# Smart contract development
npm run contracts:compile
npm run contracts:test
npm run contracts:deploy:local

# Backend services
npm run backend:dev
npm run backend:test
npm run backend:migrate        # Database migrations

# End-to-end testing
npm run test:integration
npm run test:load             # Performance testing
```

### Demo Commands
```bash
# Simulate employer creating attestation
npm run demo:employer -- --amount=136 --employee=0x1a2b...

# Generate proof from attestation
npm run demo:proof -- --attestation=0xaf3b...

# Submit proof to contract
npm run demo:claim -- --proof=proof.json
```

## Critical Implementation Notes

### ZKP Requirements
- **Performance Target**: Proof generation < 5 seconds on mobile devices
- **Circuit Complexity**: Keep constraints minimal for speed
- **Security**: Use established libraries (Circom, SnarkJS) - never implement crypto primitives from scratch
- **Setup**: Requires trusted setup ceremony for production

### Security Architecture
1. **Employer Verification**: Multi-sig whitelist with staking requirements
2. **Nullifier System**: Prevents double-spending of same wage attestation
3. **Rate Limiting**: Per-address limits to prevent abuse
4. **Circuit Auditing**: Formal verification of constraint logic required

### Database Schema
- `employers`: Verified employer registry with reputation scoring
- `wage_attestations`: Signed work confirmations with nullifiers
- `proof_submissions`: On-chain verification tracking
- Redis: Caching for performance, rate limiting, session management

### Performance Considerations
- **ZKP Generation**: CPU-intensive, consider WebAssembly optimization
- **Gas Optimization**: Target < 150k gas per claim transaction
- **Database**: Index on nullifiers, employee addresses for fast lookups
- **API Response**: < 200ms p95 for attestation endpoints

### Testing Strategy
1. **Circuit Testing**: Constraint satisfaction, edge cases, invalid inputs
2. **Contract Testing**: Security (reentrancy, overflow), access control, gas costs
3. **Integration Testing**: Full flow from attestation to liquidity claim
4. **Load Testing**: Concurrent proof submissions, database performance

## Key Dependencies

### Core Technology Stack
- **Circom**: ZKP circuit definition language
- **SnarkJS**: JavaScript proof generation library
- **Hardhat**: Ethereum development environment
- **Express/Fastify**: Backend API framework
- **PostgreSQL**: Primary data persistence
- **Redis**: Caching and session management

### Critical Security Libraries
- **OpenZeppelin**: Battle-tested smart contract primitives
- **Ethers.js**: Ethereum interaction library
- **jose**: JWT and signature verification

## Development Constraints

### Hackathon Timeline (48 hours)
- **Hour 0-8**: Circuit development (CRITICAL - requires ZKP expertise)
- **Hour 8-16**: Smart contract implementation
- **Hour 16-24**: Backend service development
- **Hour 24-32**: Integration and testing
- **Hour 32-40**: Performance optimization
- **Hour 40-48**: Demo preparation

### Risk Mitigation
- **No ZKP Expert**: Pivot to simplified cryptographic attestation
- **Performance Issues**: Reduce circuit complexity, optimize constraints
- **Integration Problems**: Focus on individual component demos
- **Time Pressure**: Prioritize core proof-of-concept over edge cases

## Research Context

See `Deep_Research.md` for comprehensive analysis including:
- Market positioning vs. existing EWA solutions (DailyPay, Earnin)
- Technical feasibility assessment of ZKP implementation
- Intellectual property landscape and novelty analysis
- Detailed security threat modeling

The research establishes this as a genuinely novel application of Zero-Knowledge Proofs to create a new financial primitive: decentralized, privacy-preserving wage liquidity.