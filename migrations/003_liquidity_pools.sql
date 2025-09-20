-- Migration 003: Liquidity Pools and LP Positions
-- Description: Liquidity management system for multi-rail payment architecture
-- Version: 1.0.0
-- Date: 2024-09-20

BEGIN;

-- =============================================================================
-- LIQUIDITY POOLS: Per-rail liquidity management with yield calculation
-- =============================================================================

-- Enhanced liquidity pools with comprehensive yield and risk management
CREATE TABLE liquidity_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_rail_id UUID REFERENCES payment_rails(id) NOT NULL,

    -- Core liquidity metrics
    total_liquidity DECIMAL(18,6) NOT NULL DEFAULT 0,
    available_liquidity DECIMAL(18,6) NOT NULL DEFAULT 0,
    reserved_liquidity DECIMAL(18,6) DEFAULT 0, -- Pending advances
    utilization_rate DECIMAL(5,4) NOT NULL DEFAULT 0, -- 0.0000-1.0000

    -- Yield calculation for liquidity providers
    base_apr DECIMAL(5,4) NOT NULL, -- Base annual percentage rate
    current_apr DECIMAL(5,4) NOT NULL, -- Dynamic rate based on utilization
    yield_curve JSONB, -- Utilization -> APR mapping
    total_yield_distributed DECIMAL(18,6) DEFAULT 0,
    yield_per_token DECIMAL(18,12) DEFAULT 0, -- Accumulated yield per LP token
    last_yield_update TIMESTAMP DEFAULT NOW(),

    -- Volume and transaction metrics
    total_advances_issued DECIMAL(18,6) DEFAULT 0,
    total_repaid DECIMAL(18,6) DEFAULT 0,
    total_fees_collected DECIMAL(18,6) DEFAULT 0,
    advance_count INTEGER DEFAULT 0,
    avg_advance_size DECIMAL(18,6) DEFAULT 0,

    -- Risk metrics
    default_rate DECIMAL(5,4) DEFAULT 0, -- Historical default rate
    max_utilization DECIMAL(5,4) DEFAULT 0.85, -- Maximum allowed utilization
    risk_adjustment DECIMAL(3,2) DEFAULT 1.00, -- Risk multiplier for yields
    insurance_fund DECIMAL(18,6) DEFAULT 0, -- Pool insurance reserve

    -- Performance tracking
    volume_24h DECIMAL(18,6) DEFAULT 0,
    volume_7d DECIMAL(18,6) DEFAULT 0,
    volume_30d DECIMAL(18,6) DEFAULT 0,
    net_flow_24h DECIMAL(18,6) DEFAULT 0, -- Deposits - withdrawals

    -- Operational status
    is_active BOOLEAN DEFAULT true,
    deposits_paused BOOLEAN DEFAULT false,
    withdrawals_paused BOOLEAN DEFAULT false,
    emergency_shutdown BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_liquidity CHECK (available_liquidity <= total_liquidity),
    CONSTRAINT valid_utilization CHECK (utilization_rate >= 0 AND utilization_rate <= 1),
    CONSTRAINT valid_apr CHECK (base_apr >= 0 AND current_apr >= 0)
);

-- Enhanced LP positions with detailed yield tracking
CREATE TABLE lp_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liquidity_pool_id UUID REFERENCES liquidity_pools(id) NOT NULL,
    provider_address VARCHAR(42) NOT NULL,

    -- Position details
    lp_tokens DECIMAL(18,12) NOT NULL, -- LP token balance
    deposited_amount DECIMAL(18,6) NOT NULL, -- Original deposit amount
    current_value DECIMAL(18,6) NOT NULL, -- Current value including yield

    -- Yield tracking
    total_yield_earned DECIMAL(18,6) DEFAULT 0,
    yield_checkpoint DECIMAL(18,12) DEFAULT 0, -- Last yield calculation point
    last_yield_claim TIMESTAMP,
    unclaimed_yield DECIMAL(18,6) DEFAULT 0,

    -- Transaction history
    deposit_count INTEGER DEFAULT 1,
    last_deposit_amount DECIMAL(18,6),
    last_deposit_timestamp TIMESTAMP,
    total_deposits DECIMAL(18,6),
    total_withdrawals DECIMAL(18,6) DEFAULT 0,

    -- Position management
    is_active BOOLEAN DEFAULT true,
    auto_compound BOOLEAN DEFAULT true, -- Auto-compound yields
    lock_period INTERVAL, -- Optional lock period for higher yields
    locked_until TIMESTAMP,

    -- Risk and performance
    entry_price DECIMAL(18,6), -- Price when position opened
    impermanent_loss DECIMAL(18,6) DEFAULT 0,
    avg_apr DECIMAL(5,4), -- Time-weighted average APR

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT positive_tokens CHECK (lp_tokens > 0),
    CONSTRAINT positive_deposit CHECK (deposited_amount > 0)
);

-- Automated yield calculation and distribution
CREATE TABLE yield_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Distribution context
    liquidity_pool_id UUID REFERENCES liquidity_pools(id) NOT NULL,
    distribution_period_start TIMESTAMP NOT NULL,
    distribution_period_end TIMESTAMP NOT NULL,

    -- Yield calculation
    total_yield_generated DECIMAL(18,6) NOT NULL,
    fees_collected DECIMAL(18,6) NOT NULL,
    protocol_share DECIMAL(18,6) NOT NULL,
    lp_share DECIMAL(18,6) NOT NULL,

    -- Distribution mechanics
    total_lp_tokens DECIMAL(18,12) NOT NULL,
    yield_per_token DECIMAL(18,12) NOT NULL,

    -- Execution
    distribution_tx_hash VARCHAR(66),
    gas_cost DECIMAL(18,6),
    distributed_at TIMESTAMP DEFAULT NOW(),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Create initial liquidity pools for stablecoin rails
INSERT INTO liquidity_pools (
    payment_rail_id, total_liquidity, available_liquidity,
    base_apr, current_apr, max_utilization,
    yield_curve, insurance_fund
)
SELECT
    id,
    0, 0, -- Start with empty pools
    0.08, 0.08, -- 8% base APR
    0.85, -- 85% max utilization
    '{"0.0": 0.05, "0.5": 0.08, "0.75": 0.12, "0.85": 0.20}', -- Yield curve
    0 -- No initial insurance fund
FROM payment_rails
WHERE rail_type = 'CRYPTO' AND is_active = true;

-- Create performance indexes for liquidity pools
CREATE INDEX idx_pools_rail_active ON liquidity_pools(payment_rail_id, is_active)
INCLUDE (available_liquidity, utilization_rate, max_utilization);

CREATE INDEX idx_pools_available_liquidity ON liquidity_pools(payment_rail_id, available_liquidity DESC)
WHERE is_active = true AND available_liquidity > 0;

CREATE INDEX idx_lp_positions_provider ON lp_positions(provider_address, is_active)
INCLUDE (liquidity_pool_id, lp_tokens, current_value);

CREATE INDEX idx_lp_positions_pool ON lp_positions(liquidity_pool_id, is_active)
INCLUDE (lp_tokens, current_value);

-- Function to update liquidity pool metrics
CREATE OR REPLACE FUNCTION update_pool_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update utilization rate when liquidity changes
    IF TG_OP = 'UPDATE' AND (NEW.total_liquidity != OLD.total_liquidity OR NEW.available_liquidity != OLD.available_liquidity) THEN
        NEW.utilization_rate = CASE
            WHEN NEW.total_liquidity > 0 THEN
                (NEW.total_liquidity - NEW.available_liquidity) / NEW.total_liquidity
            ELSE 0
        END;

        NEW.updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update pool metrics
CREATE TRIGGER trigger_update_pool_metrics
    BEFORE UPDATE ON liquidity_pools
    FOR EACH ROW
    EXECUTE FUNCTION update_pool_metrics();

COMMIT;