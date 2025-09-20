# Stream Protocol Attestation Service

A robust, secure employer attestation system for Stream Protocol wage verification that bridges traditional payroll systems with decentralized zero-knowledge proof generation.

## 🎯 Overview

The Stream Protocol Attestation Service enables employers to digitally sign wage attestations that employees can use to generate zero-knowledge proofs for wage advances. This service provides the critical bridge between traditional payroll systems and decentralized finance.

## ✨ Features

- **🔐 ECDSA Signature Generation**: Secure employer key management with HSM simulation
- **🛡️ Attestation Validation**: Comprehensive validation with anti-replay protection
- **⚡ ZKP Circuit Compatibility**: Direct integration with zero-knowledge proof circuits
- **🏭 Mock Employer Simulation**: Realistic testing with major employer profiles
- **🔒 Security Features**: Rate limiting, input sanitization, and audit logging
- **📊 JSON Canonicalization**: Consistent data representation for reliable signatures
- **🚀 RESTful API**: Complete CRUD operations with comprehensive error handling

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Stream Attestation Service               │
├─────────────────────────────────────────────────────────────┤
│  Controllers  │  Services   │  Models    │  Middleware     │
│  ────────────│  ─────────  │  ───────   │  ─────────      │
│  • Attestation│  • Key Mgmt │  • Wage    │  • Rate Limit   │
│  • Employer   │  • Validator│  Attestation│  • Auth        │
│              │  • Simulator │            │  • Validation   │
├─────────────────────────────────────────────────────────────┤
│                     Express.js API Layer                   │
├─────────────────────────────────────────────────────────────┤
│     Security    │    Utils     │    Tests    │   Config     │
│     ─────────   │    ─────     │    ─────    │   ──────     │
│     • HSM Sim   │    • JSON    │    • Unit   │   • Env      │
│     • Anti-Rep  │    Canonical │    • Integ  │   • Logging  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Employer Registration → Key Generation → Attestation Creation → Signature → ZKP Input
                ↓              ↓               ↓              ↓         ↓
           Public Key    Private Key HSM   Validation    ECDSA Sign  Circuit Ready
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone and setup
git clone <repository>
cd attestation-service

# Install dependencies
npm install

# Start development server
npm run dev
```

### Basic Usage

1. **Register an Employer**
```bash
curl -X POST http://localhost:3001/api/v1/employers/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Example Corp",
    "domain": "example.com",
    "employeeCount": 100,
    "payrollFrequency": "BIWEEKLY",
    "contactEmail": "payroll@example.com"
  }'
```

2. **Create Wage Attestation**
```bash
curl -X POST http://localhost:3001/api/v1/attestations \
  -H "Content-Type: application/json" \
  -H "X-Employer-Id: <employer_id>" \
  -d '{
    "employerId": "<employer_id>",
    "employeeWallet": "0x742d35Cc6634C0532925a3b8D000B45f5c964C12",
    "wageAmount": 50000,
    "periodStart": "2024-01-01T09:00:00Z",
    "periodEnd": "2024-01-01T17:00:00Z",
    "hoursWorked": 8,
    "hourlyRate": 6250
  }'
```

3. **Get ZKP-Ready Data**
```bash
curl http://localhost:3001/api/v1/attestations/<attestation_id>/zkp
```

## 📋 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/employers/register` | Register new employer |
| `GET` | `/api/v1/employers` | List all employers |
| `GET` | `/api/v1/employers/:id` | Get employer details |
| `POST` | `/api/v1/attestations` | Create wage attestation |
| `GET` | `/api/v1/attestations/:id` | Get attestation details |
| `POST` | `/api/v1/attestations/:id/verify` | Verify signature |
| `GET` | `/api/v1/attestations/:id/zkp` | Get ZKP-formatted data |

### Authentication

The service uses header-based authentication:

```bash
# Employer operations
X-Employer-Id: <16-character-hex-string>

# API key (production)
X-Api-Key: sk_<api_key>
```

### Rate Limits

- **Standard endpoints**: 100 req/15min per IP
- **Attestation creation**: 10 req/min per employer
- **Verification**: 50 req/min
- **Batch operations**: 10 req/5min

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Models, utilities, and individual components
- **Integration Tests**: Full API workflow testing
- **Performance Tests**: Load testing and benchmarks
- **Security Tests**: Authentication and validation testing

## 🔧 Development

### Project Structure

```
attestation-service/
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── routes/          # API route definitions
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── setup.js         # Test configuration
├── config/              # Configuration files
└── docs/                # Documentation
```

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Security
ALLOWED_ORIGINS=*
ADMIN_KEY=your_admin_key

# Logging
LOG_LEVEL=info
```

## 🏭 Mock Employer Simulation

The service includes realistic employer profiles for testing:

### Available Employers

- **Starbucks**: Food service, $18/hr average, biweekly pay
- **Amazon**: E-commerce/logistics, $22/hr, weekly pay
- **McDonald's**: Fast food, $16/hr, biweekly pay
- **Uber**: Gig economy, $25/hr equivalent, weekly pay
- **Target**: Retail, $19/hr, biweekly pay
- **TechCorp**: Technology, $50/hr, monthly pay

### Generate Test Data

```javascript
const { EmployerSimulator } = require('./src/services/EmployerSimulator');

const simulator = new EmployerSimulator();
await simulator.initializeEmployers();

// Generate realistic scenarios
const scenarios = simulator.generateAttestationScenarios('starbucks', 10, {
  errorRate: 0.1,
  timeRange: 30
});

// Create comprehensive test suite
const testSuite = await simulator.generateTestSuite({
  attestationsPerEmployer: 20,
  errorRate: 0.1
});
```

## 🔐 Security Features

### Key Management
- **ECDSA secp256k1** signatures
- **HSM simulation** for key protection
- **Audit logging** of all key operations
- **Rate limiting** per employer

### Anti-Replay Protection
- **Period nonces** prevent duplicate attestations
- **Nullifier hashes** for double-spend prevention
- **Timestamp validation** (5-minute window)
- **Signature verification** before storage

### Input Validation
- **Comprehensive data validation**
- **Business rule enforcement**
- **Pattern analysis** for fraud detection
- **Sanitization** of all inputs

## 🔗 ZKP Integration

### Circuit Compatibility

The service generates data compatible with zero-knowledge proof circuits:

```json
{
  "zkpInputs": {
    "employerId": "string",
    "employeeWallet": "address",
    "wageAmount": "string",
    "hoursWorked": "string",
    "hourlyRate": "string",
    "periodNonce": "string",
    "signature": "hex",
    "attestationHash": "hex"
  },
  "publicInputs": {
    "nullifierHash": "hex",
    "wageAmount": "string",
    "employerCommitment": "hex"
  },
  "circuitCompatibility": {
    "version": "v1.0.0",
    "maxWageAmount": "1000000",
    "supportedCurves": ["BN254"]
  }
}
```

### JSON Canonicalization

Ensures consistent data representation:

- **Deterministic key ordering**
- **Unicode normalization**
- **Number precision handling**
- **Date format standardization**

## 📊 Monitoring & Analytics

### Health Check
```bash
GET /health
GET /status
```

### Statistics
```bash
GET /api/v1/attestations/stats
GET /api/v1/employers/:id/stats
GET /api/v1/employers/:id/audit
```

### Metrics Tracked
- Attestation creation rate
- Signature verification success rate
- Employer activity patterns
- Error rates by type
- Performance metrics

## 🚧 Production Considerations

### Database Integration
Replace in-memory storage with persistent database:

```javascript
// PostgreSQL integration
const attestations = await db.query(
  'SELECT * FROM wage_attestations WHERE id = $1',
  [attestationId]
);
```

### HSM Integration
Replace mock HSM with actual hardware security module:

```javascript
// AWS CloudHSM example
const signature = await cloudHSM.sign({
  keyId: employerKeyId,
  message: attestationHash,
  algorithm: 'ECDSA_SHA_256'
});
```

### Scaling Considerations
- **Load balancing** for multiple instances
- **Redis caching** for frequently accessed data
- **Message queues** for async processing
- **Monitoring & alerting** for production issues

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation for API changes
- Ensure security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Stream Protocol Documentation](https://docs.stream-protocol.io)
- [ZKP Circuit Repository](https://github.com/stream-protocol/circuits)
- [API Specification](./docs/api-spec.md)
- [Security Audit Report](./docs/security-audit.md)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/stream-protocol/attestation-service/issues)
- **Discussions**: [GitHub Discussions](https://github.com/stream-protocol/attestation-service/discussions)
- **Email**: support@stream-protocol.io

---

Built with ❤️ by the Stream Protocol Team