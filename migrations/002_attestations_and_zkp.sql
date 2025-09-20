-- Migration 002: Wage Attestations and ZKP System
-- Description: Zero-knowledge proof infrastructure and wage attestation system
-- Version: 1.0.0
-- Date: 2024-09-20

BEGIN;

-- =============================================================================
-- WAGE ATTESTATIONS: Signed work confirmations with ZKP integration
-- =============================================================================

-- Enhanced wage attestations with comprehensive ZKP support
CREATE TABLE wage_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core attestation data
    employer_id UUID REFERENCES employers(id) NOT NULL,
    employee_wallet VARCHAR(42) NOT NULL,
    wage_amount DECIMAL(18,6) NOT NULL,
    work_period_start TIMESTAMP NOT NULL,
    work_period_end TIMESTAMP NOT NULL,

    -- Digital signature and verification
    attestation_hash VARCHAR(66) NOT NULL, -- Keccak256 hash of signed attestation
    employer_signature VARCHAR(132) NOT NULL, -- EdDSA signature
    signature_algorithm VARCHAR(20) DEFAULT 'EdDSA', -- Signature type

    -- ZKP integration
    commitment_hash VARCHAR(66) NOT NULL, -- Poseidon commitment
    merkle_root VARCHAR(66), -- Merkle tree root for batch attestations
    merkle_proof JSONB, -- Merkle inclusion proof

    -- Nullifier system for double-spend prevention
    nullifier_hash VARCHAR(66) UNIQUE, -- Derived from private inputs
    nullifier_secret VARCHAR(66), -- Secret for nullifier generation

    -- Usage tracking
    is_spent BOOLEAN DEFAULT false,
    spent_amount DECIMAL(18,6) DEFAULT 0,
    remaining_amount DECIMAL(18,6), -- Computed: wage_amount - spent_amount
    usage_count INTEGER DEFAULT 0, -- Number of times used for advances

    -- Metadata
    hours_worked DECIMAL(5,2), -- Hours worked in period
    overtime_hours DECIMAL(5,2), -- Overtime hours
    job_code VARCHAR(50), -- Internal job/project code
    department VARCHAR(100), -- Employee department

    -- Audit and compliance
    attestation_version INTEGER DEFAULT 1, -- Schema version
    expires_at TIMESTAMP, -- Attestation expiry
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    revocation_reason TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT positive_wage_amount CHECK (wage_amount > 0),
    CONSTRAINT valid_work_period CHECK (work_period_end > work_period_start),
    CONSTRAINT valid_spent_amount CHECK (spent_amount >= 0 AND spent_amount <= wage_amount)
);

-- =============================================================================
-- ZKP NULLIFIER SYSTEM: Double-spend prevention with audit trail
-- =============================================================================

-- Comprehensive nullifier tracking for ZKP double-spend prevention
CREATE TABLE zkp_nullifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nullifier_hash VARCHAR(66) NOT NULL UNIQUE, -- The nullifier hash

    -- Usage tracking
    first_used_at TIMESTAMP DEFAULT NOW(),
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP DEFAULT NOW(),

    -- Associated transaction
    advance_id UUID, -- Will reference wage_advances.id (created in next migration)
    employee_wallet VARCHAR(42) NOT NULL,
    employer_id UUID REFERENCES employers(id),

    -- Verification context
    circuit_version VARCHAR(20) DEFAULT 'v1.0',
    verification_key_hash VARCHAR(66),
    block_number BIGINT, -- Block when first used

    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT positive_usage CHECK (usage_count > 0)
);

-- =============================================================================
-- ZKP PROOF VERIFICATION: Audit trail for all proof verifications
-- =============================================================================

-- Comprehensive audit trail for ZKP proof verification
CREATE TABLE zkp_proof_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Proof details
    advance_id UUID, -- Will reference wage_advances.id (created in next migration)
    proof_data TEXT NOT NULL, -- The actual zk-SNARK proof
    public_inputs JSONB NOT NULL, -- Public inputs used for verification

    -- Verification context
    verification_key_hash VARCHAR(66) NOT NULL,
    circuit_version VARCHAR(20) DEFAULT 'v1.0',
    verifier_address VARCHAR(42), -- Contract or service that verified

    -- Results
    is_valid BOOLEAN NOT NULL,
    verification_time_ms INTEGER, -- Time taken to verify
    error_message TEXT, -- Error details if verification failed

    -- Gas and cost tracking
    gas_used INTEGER,
    gas_price_gwei DECIMAL(10,2),
    verification_cost DECIMAL(18,6), -- Cost in USD

    -- Metadata
    verification_method TEXT DEFAULT 'OFF_CHAIN' CHECK (verification_method IN ('ON_CHAIN', 'OFF_CHAIN', 'HYBRID')),
    verifier_version VARCHAR(20),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Create performance indexes for ZKP system
CREATE UNIQUE INDEX idx_nullifiers_hash_lookup
ON zkp_nullifiers (nullifier_hash)
INCLUDE (advance_id, first_used_at, employee_wallet);

CREATE INDEX idx_nullifiers_employee_timeline
ON zkp_nullifiers (employee_wallet, first_used_at DESC)
INCLUDE (nullifier_hash);

CREATE UNIQUE INDEX idx_attestations_nullifier_unique
ON wage_attestations (nullifier_hash)
WHERE nullifier_hash IS NOT NULL
INCLUDE (id, employer_id, employee_wallet, wage_amount, is_spent);

CREATE INDEX idx_attestations_employee_employer
ON wage_attestations (employee_wallet, employer_id, created_at DESC);

CREATE INDEX idx_attestations_available
ON wage_attestations (employee_wallet, is_spent, expires_at)
WHERE is_spent = false AND revoked = false
INCLUDE (id, wage_amount, remaining_amount, nullifier_hash);

COMMIT;