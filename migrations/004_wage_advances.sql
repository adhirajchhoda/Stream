-- Migration 004: Wage Advances and Transaction System
-- Description: Core advance tracking with comprehensive ZKP integration
-- Version: 1.0.0
-- Date: 2024-09-20

BEGIN;

-- =============================================================================
-- WAGE ADVANCES: Employee wage advance tracking with comprehensive ZKP integration
-- =============================================================================

-- Enhanced wage advances with detailed transaction and ZKP tracking
CREATE TABLE wage_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core references
    employee_wallet VARCHAR(42) NOT NULL,
    employer_id UUID REFERENCES employers(id),
    payment_rail_id UUID REFERENCES payment_rails(id) NOT NULL,
    liquidity_pool_id UUID REFERENCES liquidity_pools(id) NOT NULL,
    attestation_id UUID REFERENCES wage_attestations(id) NOT NULL,

    -- Amount breakdown
    requested_amount DECIMAL(18,6) NOT NULL,
    protocol_fee DECIMAL(18,6) NOT NULL,
    gas_fee DECIMAL(18,6) DEFAULT 0, -- Estimated gas cost
    liquidity_provider_fee DECIMAL(18,6) NOT NULL,
    total_fees DECIMAL(18,6) NOT NULL, -- Sum of all fees
    net_amount DECIMAL(18,6) NOT NULL, -- Amount sent to employee

    -- ZKP verification details
    zkp_proof TEXT NOT NULL, -- The actual zero-knowledge proof (Groth16)
    public_inputs JSONB NOT NULL, -- Public inputs for verification
    verification_key_hash VARCHAR(66), -- Hash of VK used for verification
    circuit_version VARCHAR(20) DEFAULT 'v1.0', -- Circuit version identifier

    -- Nullifier system
    nullifier_hash VARCHAR(66) NOT NULL UNIQUE, -- Prevents double-spending
    nullifier_verified_at TIMESTAMP, -- When nullifier was verified
    nullifier_merkle_proof JSONB, -- Merkle proof for nullifier verification

    -- Transaction details
    transaction_hash VARCHAR(66), -- On-chain transaction hash
    block_number BIGINT,
    gas_used INTEGER,
    gas_price_gwei DECIMAL(10,2),
    actual_gas_cost DECIMAL(18,6), -- Actual gas cost paid

    -- Routing and fallback
    primary_rail_used BOOLEAN DEFAULT true,
    fallback_attempt_count INTEGER DEFAULT 0,
    routing_reason TEXT, -- Why this rail was selected

    -- Status tracking
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'ROUTING', 'DISBURSING', 'DISBURSED', 'FAILED', 'CANCELLED', 'REPAID', 'DEFAULTED')),
    failure_reason TEXT, -- Reason for failure if status = 'FAILED'
    retry_count INTEGER DEFAULT 0,

    -- Repayment details
    due_date TIMESTAMP NOT NULL, -- Expected repayment date
    grace_period_hours INTEGER DEFAULT 24, -- Grace period before default
    repayment_amount DECIMAL(18,6), -- Amount to be repaid (may include interest)
    repaid_amount DECIMAL(18,6) DEFAULT 0, -- Amount actually repaid
    outstanding_amount DECIMAL(18,6), -- Remaining amount owed

    -- Risk and fraud detection
    risk_score DECIMAL(5,2), -- Calculated risk score at time of advance
    fraud_flags JSONB DEFAULT '[]', -- Array of fraud indicators
    velocity_check_passed BOOLEAN DEFAULT true,
    amount_check_passed BOOLEAN DEFAULT true,

    -- Performance metrics
    processing_time_ms INTEGER, -- Time from request to disbursement
    verification_time_ms INTEGER, -- ZKP verification time

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP, -- When ZKP was verified
    routed_at TIMESTAMP, -- When payment rail was selected
    disbursed_at TIMESTAMP, -- When funds were sent
    repaid_at TIMESTAMP, -- When fully repaid
    defaulted_at TIMESTAMP, -- When marked as default

    -- Constraints
    CONSTRAINT positive_amounts CHECK (requested_amount > 0 AND net_amount > 0),
    CONSTRAINT valid_fees CHECK (total_fees = protocol_fee + gas_fee + liquidity_provider_fee),
    CONSTRAINT valid_net_amount CHECK (net_amount = requested_amount - total_fees),
    CONSTRAINT valid_due_date CHECK (due_date > created_at)
);

-- Enhanced repayment tracking with automated settlement
CREATE TABLE repayment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES wage_advances(id) NOT NULL,
    employee_wallet VARCHAR(42) NOT NULL,

    -- Repayment details
    expected_amount DECIMAL(18,6) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    grace_period_hours INTEGER DEFAULT 24,

    -- Settlement configuration
    auto_settlement BOOLEAN DEFAULT true,
    repayment_rail_id UUID REFERENCES payment_rails(id),
    settlement_method TEXT DEFAULT 'WALLET_SWEEP' CHECK (settlement_method IN ('DIRECT_DEBIT', 'WALLET_SWEEP', 'MANUAL')),

    -- Status tracking
    status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'PENDING', 'PROCESSING', 'PARTIAL', 'COMPLETE', 'OVERDUE', 'FAILED', 'CANCELLED')),

    -- Actual repayment
    repayment_tx_hash VARCHAR(66),
    actual_amount DECIMAL(18,6) DEFAULT 0,
    fees_paid DECIMAL(18,6) DEFAULT 0,
    repaid_at TIMESTAMP,

    -- Retry logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    failure_reason TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT positive_expected_amount CHECK (expected_amount > 0),
    CONSTRAINT valid_due_date CHECK (due_date > created_at)
);

-- Fee distribution and revenue tracking
CREATE TABLE fee_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES wage_advances(id) NOT NULL,
    liquidity_pool_id UUID REFERENCES liquidity_pools(id) NOT NULL,

    -- Fee breakdown
    total_fee DECIMAL(18,6) NOT NULL,
    protocol_fee DECIMAL(18,6) NOT NULL, -- Platform revenue
    lp_yield DECIMAL(18,6) NOT NULL, -- Liquidity provider yield
    gas_reimbursement DECIMAL(18,6) DEFAULT 0,

    -- Distribution details
    distribution_tx_hash VARCHAR(66),
    distribution_block BIGINT,
    distributed_at TIMESTAMP DEFAULT NOW(),

    -- Yield calculation
    yield_rate DECIMAL(5,4), -- APR at time of distribution
    time_weighted_amount DECIMAL(18,6), -- Amount * time for yield calculation

    created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-rail transaction routing
CREATE TABLE transaction_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES wage_advances(id) NOT NULL,

    -- Routing decision
    primary_rail_id UUID REFERENCES payment_rails(id) NOT NULL,
    fallback_rails UUID[] DEFAULT '{}', -- Ordered array of fallback rails
    route_reason VARCHAR(255), -- 'cost_optimization', 'liquidity_availability', 'user_preference'

    -- Cost analysis
    estimated_cost DECIMAL(18,6),
    estimated_time_seconds INTEGER,
    success_probability DECIMAL(5,4),

    -- Actual execution
    final_rail_used UUID REFERENCES payment_rails(id),
    actual_cost DECIMAL(18,6),
    actual_time_seconds INTEGER,
    fallback_used BOOLEAN DEFAULT false,

    routing_timestamp TIMESTAMP DEFAULT NOW()
);

-- Update nullifier and proof verification tables to reference wage_advances
ALTER TABLE zkp_nullifiers
ADD CONSTRAINT fk_nullifiers_advance
FOREIGN KEY (advance_id) REFERENCES wage_advances(id);

ALTER TABLE zkp_proof_verifications
ADD CONSTRAINT fk_proofs_advance
FOREIGN KEY (advance_id) REFERENCES wage_advances(id);

-- Create critical performance indexes
CREATE INDEX idx_advances_employee_status_timeline
ON wage_advances (employee_wallet, status, created_at DESC)
INCLUDE (id, net_amount, due_date, payment_rail_id);

CREATE INDEX idx_advances_employer_timeline
ON wage_advances (employer_id, created_at DESC)
WHERE status NOT IN ('REPAID', 'DEFAULTED')
INCLUDE (employee_wallet, net_amount, status, due_date);

CREATE INDEX idx_advances_due_monitoring
ON wage_advances (due_date, status)
WHERE status IN ('DISBURSED')
INCLUDE (id, employee_wallet, net_amount, outstanding_amount);

CREATE UNIQUE INDEX idx_advances_nullifier_mapping
ON wage_advances (nullifier_hash)
INCLUDE (id, employee_wallet, status, created_at);

CREATE INDEX idx_repayments_due_active
ON repayment_schedules (due_date, status)
WHERE status IN ('SCHEDULED', 'PENDING', 'PROCESSING')
INCLUDE (advance_id, employee_wallet, expected_amount);

-- Function to update advance outstanding amount
CREATE OR REPLACE FUNCTION update_advance_outstanding()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate outstanding amount
    NEW.outstanding_amount = NEW.repayment_amount - NEW.repaid_amount;

    -- Update repayment status based on amounts
    IF NEW.repaid_amount >= NEW.repayment_amount THEN
        NEW.status = 'REPAID';
        NEW.repaid_at = NOW();
    ELSIF NEW.repaid_amount > 0 THEN
        -- Partial repayment logic can be added here
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update outstanding amounts
CREATE TRIGGER trigger_update_advance_outstanding
    BEFORE UPDATE ON wage_advances
    FOR EACH ROW
    WHEN (OLD.repaid_amount IS DISTINCT FROM NEW.repaid_amount)
    EXECUTE FUNCTION update_advance_outstanding();

-- Function to update employee statistics
CREATE OR REPLACE FUNCTION update_employee_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update employee total advances and volume when advance is created
    IF TG_OP = 'INSERT' THEN
        UPDATE employees
        SET
            total_advances = total_advances + 1,
            total_volume = total_volume + NEW.net_amount,
            avg_advance_amount = (total_volume + NEW.net_amount) / (total_advances + 1),
            last_advance_date = NEW.created_at
        WHERE wallet_address = NEW.employee_wallet;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update employee statistics
CREATE TRIGGER trigger_update_employee_stats
    AFTER INSERT ON wage_advances
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_stats();

COMMIT;