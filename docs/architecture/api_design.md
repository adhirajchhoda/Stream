# Stream Protocol API Design
## Multi-Rail Payment System with Stablecoin Priority

### Base URL
```
Production: https://api.stream-protocol.io/v1
Testnet: https://testnet-api.stream-protocol.io/v1
```

### Authentication
- **Wallet-based authentication** using signed messages
- **Employer API keys** for institutional integrations
- **Rate limiting** by wallet address and API key

---

## CORE PAYMENT RAIL ENDPOINTS

### 1. Payment Rails Management

#### GET /payment-rails
Get available payment rails and their current status
```json
{
  "rails": [
    {
      "id": "usdc-ethereum",
      "name": "USDC",
      "type": "CRYPTO",
      "network": "ethereum",
      "contract_address": "0xA0b86a33E6441FEA85a6c6de387d67BF6F372c25",
      "is_active": true,
      "min_amount": "1.00",
      "max_amount": "5000.00",
      "settlement_time_seconds": 15,
      "current_liquidity": "125000.50",
      "utilization_rate": "0.67",
      "current_apr": "0.085",
      "fee_structure": {
        "type": "flat",
        "amount": "2.00"
      }
    }
  ]
}
```

#### GET /payment-rails/{rail_id}/status
Get detailed status for specific payment rail
```json
{
  "rail_id": "usdc-ethereum",
  "is_operational": true,
  "current_gas_price": "25000000000",
  "estimated_settlement_time": 18,
  "liquidity_status": "HIGH",
  "recent_volume_24h": "85000.00",
  "success_rate_24h": "0.998"
}
```

### 2. Wage Advance Core Flow

#### POST /advances/request
Request a wage advance using ZKP proof
```json
// Request
{
  "employee_wallet": "0x742d35Cc6634C0532925a3b8D000B45f5c964C12",
  "requested_amount": "500.00",
  "preferred_rail": "usdc-ethereum",
  "fallback_rails": ["usdc-polygon", "usdt-ethereum"],
  "zkp_proof": "0x1a2b3c...", // Base64 encoded zk-SNARK
  "public_inputs": {
    "wage_amount": "500.00",
    "employer_commitment": "0x789abc...",
    "nullifier": "0xdef456..."
  },
  "attestation_hash": "0x456def..."
}

// Response
{
  "advance_id": "adv_1234567890",
  "status": "PENDING_VERIFICATION",
  "requested_amount": "500.00",
  "estimated_fee": "2.00",
  "estimated_net": "498.00",
  "selected_rail": "usdc-ethereum",
  "estimated_settlement": "2024-01-15T10:25:30Z",
  "verification_eta": 30
}
```

#### GET /advances/{advance_id}
Get advance status and details
```json
{
  "advance_id": "adv_1234567890",
  "status": "DISBURSED",
  "employee_wallet": "0x742d35Cc6634C0532925a3b8D000B45f5c964C12",
  "requested_amount": "500.00",
  "fee_amount": "2.00",
  "net_amount": "498.00",
  "payment_rail": "usdc-ethereum",
  "transaction_hash": "0xabc123...",
  "block_number": 18995234,
  "created_at": "2024-01-15T10:20:00Z",
  "disbursed_at": "2024-01-15T10:20:45Z",
  "due_date": "2024-01-29T17:00:00Z",
  "repayment_status": "PENDING"
}
```

### 3. ZKP Verification

#### POST /zkp/verify
Verify zero-knowledge proof (internal/admin endpoint)
```json
// Request
{
  "proof": "0x1a2b3c...",
  "public_inputs": {
    "wage_amount": "500.00",
    "employer_commitment": "0x789abc...",
    "nullifier": "0xdef456..."
  },
  "verification_key": "vk_default_v1"
}

// Response
{
  "is_valid": true,
  "verification_time_ms": 45,
  "nullifier_hash": "0xdef456...",
  "employer_verified": true,
  "amount_verified": true
}
```

#### GET /zkp/circuit-parameters
Get current ZKP circuit parameters
```json
{
  "circuit_version": "v1.2.0",
  "verification_key_hash": "0x789abc...",
  "max_wage_amount": "10000.00",
  "supported_signature_schemes": ["RSA-2048", "ECDSA-secp256k1"],
  "proving_time_estimate_ms": 1500
}
```

### 4. Liquidity Pool Management

#### GET /pools/{rail_id}
Get liquidity pool statistics
```json
{
  "pool_id": "pool_usdc_eth",
  "payment_rail": "usdc-ethereum",
  "total_liquidity": "1250000.50",
  "available_liquidity": "825000.25",
  "utilization_rate": "0.340",
  "current_apr": "0.089",
  "total_lps": 156,
  "avg_advance_size": "425.80",
  "default_rate_30d": "0.002",
  "volume_24h": "89500.00"
}
```

#### POST /pools/{rail_id}/deposit
Deposit liquidity (requires wallet signature)
```json
// Request
{
  "provider_wallet": "0x123abc...",
  "amount": "10000.00",
  "signature": "0x789def...",
  "message": "Deposit 10000.00 USDC to Stream LP Pool",
  "timestamp": 1705315200
}

// Response
{
  "deposit_id": "dep_987654321",
  "provider_wallet": "0x123abc...",
  "amount": "10000.00",
  "estimated_apr": "0.089",
  "transaction_hash": "0xfed321...",
  "position_value": "10000.00",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /pools/{rail_id}/withdraw
Withdraw liquidity
```json
// Request
{
  "provider_wallet": "0x123abc...",
  "amount": "5000.00", // Optional: partial withdrawal
  "signature": "0x789def...",
  "message": "Withdraw from Stream LP Pool"
}

// Response
{
  "withdrawal_id": "with_456789123",
  "amount_withdrawn": "5000.00",
  "yield_earned": "125.50",
  "total_received": "5125.50",
  "transaction_hash": "0x321fed...",
  "remaining_position": "5125.50"
}
```

### 5. Repayment System

#### POST /repayments/authorize
Authorize automatic repayment routing
```json
// Request
{
  "employee_wallet": "0x742d35Cc6634C0532925a3b8D000B45f5c964C12",
  "advance_id": "adv_1234567890",
  "repayment_source": {
    "type": "DIRECT_DEPOSIT_INTERCEPT",
    "bank_routing": "021000021",
    "bank_account": "****5678",
    "employer_payroll_id": "emp_789"
  },
  "signature": "0x789def..."
}

// Response
{
  "authorization_id": "auth_321654987",
  "status": "ACTIVE",
  "next_expected_payment": "2024-01-29T17:00:00Z",
  "monitoring_active": true
}
```

#### GET /repayments/{advance_id}/status
Check repayment status
```json
{
  "advance_id": "adv_1234567890",
  "principal_amount": "500.00",
  "interest_amount": "8.50",
  "total_due": "508.50",
  "due_date": "2024-01-29T17:00:00Z",
  "status": "ON_TIME",
  "days_until_due": 14,
  "automated_collection_enabled": true,
  "payment_method": "DIRECT_DEPOSIT_INTERCEPT"
}
```

---

## ADVANCED FEATURES

### 6. Multi-Rail Routing

#### POST /routing/optimize
Get optimal payment rail routing
```json
// Request
{
  "employee_wallet": "0x742d35Cc6634C0532925a3b8D000B45f5c964C12",
  "amount": "750.00",
  "priority": "COST", // "COST", "SPEED", "RELIABILITY"
  "max_acceptable_fee": "5.00",
  "max_settlement_time": 300 // seconds
}

// Response
{
  "recommended_route": {
    "primary_rail": "usdc-polygon",
    "fallback_rails": ["usdc-ethereum", "usdt-ethereum"],
    "estimated_total_fee": "0.10",
    "estimated_settlement_time": 2,
    "success_probability": "0.995",
    "reasoning": "Polygon offers lowest fees while maintaining fast settlement"
  },
  "alternative_routes": [
    {
      "primary_rail": "usdc-ethereum",
      "estimated_fee": "2.00",
      "settlement_time": 15,
      "trade_off": "Higher fee but more liquidity"
    }
  ]
}
```

### 7. Risk Management

#### GET /risk/employee/{wallet_address}
Get employee risk assessment
```json
{
  "wallet_address": "0x742d35Cc6634C0532925a3b8D000B45f5c964C12",
  "risk_score": "1.25", // 1.0 = baseline, higher = riskier
  "risk_factors": {
    "repayment_history": "EXCELLENT",
    "employer_tier": "VERIFIED",
    "advance_frequency": "NORMAL",
    "amount_patterns": "CONSISTENT"
  },
  "max_advance_amount": "2500.00",
  "current_exposure": "500.00",
  "available_credit": "2000.00"
}
```

#### GET /risk/pools/overview
Get system-wide risk metrics
```json
{
  "total_advances_outstanding": "2500000.00",
  "global_default_rate": "0.018",
  "reserves_ratio": "0.15",
  "liquidity_stress_test": "PASS",
  "risk_alerts": [
    {
      "type": "HIGH_UTILIZATION",
      "rail": "usdc-ethereum",
      "current_utilization": "0.89",
      "threshold": "0.85"
    }
  ]
}
```

### 8. Employer Integration

#### POST /employers/register
Register employer for wage attestations
```json
// Request
{
  "company_name": "TechCorp Inc",
  "domain": "techcorp.com",
  "public_key": "0x04a1b2c3...", // secp256k1 public key
  "employee_count": 250,
  "payroll_frequency": "BIWEEKLY",
  "integration_type": "API", // "API", "SFTP", "WEBHOOK"
  "contact_email": "payroll@techcorp.com"
}

// Response
{
  "employer_id": "emp_789",
  "verification_status": "PENDING",
  "api_key": "sk_test_789abc...",
  "webhook_secret": "whsec_456def...",
  "verification_steps": [
    "domain_verification",
    "business_license_check",
    "bank_account_verification"
  ]
}
```

#### POST /employers/{employer_id}/attest
Create wage attestation for employee
```json
// Request
{
  "employee_wallet": "0x742d35Cc6634C0532925a3b8D000B45f5c964C12",
  "wage_amount": "1200.00",
  "work_period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-14T23:59:59Z"
  },
  "signature": "0x789abc..." // RSA signature over attestation data
}

// Response
{
  "attestation_id": "att_456789",
  "attestation_hash": "0x123def...",
  "expires_at": "2024-01-29T23:59:59Z",
  "zkp_eligible": true,
  "max_advance_percentage": "0.80" // Can advance up to 80% of earned wages
}
```

---

## WEBHOOK SYSTEM

### Webhook Events
```json
// advance.created
{
  "event": "advance.created",
  "advance_id": "adv_1234567890",
  "employee_wallet": "0x742d35Cc6634C0532925a3b8D000B45f5c964C12",
  "amount": "500.00",
  "rail": "usdc-ethereum"
}

// advance.disbursed
{
  "event": "advance.disbursed",
  "advance_id": "adv_1234567890",
  "transaction_hash": "0xabc123...",
  "block_number": 18995234,
  "net_amount": "498.00"
}

// repayment.received
{
  "event": "repayment.received",
  "advance_id": "adv_1234567890",
  "amount": "508.50",
  "transaction_hash": "0xdef456...",
  "status": "COMPLETE"
}

// liquidity.low
{
  "event": "liquidity.low",
  "pool_id": "pool_usdc_eth",
  "current_liquidity": "25000.00",
  "threshold": "50000.00",
  "utilization_rate": "0.92"
}
```

---

## ERROR HANDLING

### Standard Error Response
```json
{
  "error": {
    "code": "INSUFFICIENT_LIQUIDITY",
    "message": "Not enough liquidity available in the selected payment rail",
    "details": {
      "requested_amount": "5000.00",
      "available_liquidity": "3250.00",
      "suggested_rails": ["usdc-polygon", "usdt-ethereum"]
    },
    "request_id": "req_123456789"
  }
}
```

### Common Error Codes
- `INVALID_ZKP_PROOF` - Zero-knowledge proof verification failed
- `ATTESTATION_EXPIRED` - Wage attestation is past expiration
- `INSUFFICIENT_LIQUIDITY` - Not enough funds in liquidity pool
- `ADVANCE_LIMIT_EXCEEDED` - Request exceeds maximum advance amount
- `NULLIFIER_ALREADY_USED` - Attempt to reuse spent attestation
- `RAIL_UNAVAILABLE` - Selected payment rail is offline
- `INVALID_SIGNATURE` - Wallet signature verification failed
- `EMPLOYER_NOT_VERIFIED` - Employer not in whitelist
- `REPAYMENT_OVERDUE` - Outstanding advance payment overdue

---

## RATE LIMITING

- **Employee requests**: 10 requests per minute per wallet
- **Employer API**: 1000 requests per minute per API key
- **Public endpoints**: 100 requests per minute per IP
- **ZKP verification**: 5 requests per minute per wallet (computationally expensive)

---

## STABLECOIN-FIRST IMPLEMENTATION PRIORITY

For the 48-hour hackathon, implement endpoints in this order:

1. **Core Flow** (Hour 0-12):
   - `POST /advances/request` (USDC only)
   - `GET /advances/{advance_id}`
   - `POST /zkp/verify`

2. **Liquidity Management** (Hour 12-24):
   - `GET /pools/usdc-ethereum`
   - `POST /pools/usdc-ethereum/deposit`
   - Basic LP management

3. **Employer Integration** (Hour 24-36):
   - `POST /employers/register`
   - `POST /employers/{id}/attest`
   - Simple attestation flow

4. **Polish & Monitoring** (Hour 36-48):
   - Error handling
   - Basic webhooks
   - Status endpoints

This API design prioritizes stablecoins while maintaining extensibility for future payment rails.