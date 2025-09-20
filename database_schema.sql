-- Stream Protocol Database Schema for Stablecoin Payment Rails
-- Optimized for 48-hour hackathon with future multi-rail scalability

-- Core Tables

-- Supported payment rails and their configurations
CREATE TABLE payment_rails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'USDC', 'USDT', 'ACH', 'CARD', 'PAYPAL'
    rail_type ENUM('CRYPTO', 'BANK', 'CARD', 'WALLET') NOT NULL,
    network VARCHAR(50), -- 'ethereum', 'polygon', 'arbitrum' for crypto
    contract_address VARCHAR(42), -- Token contract address for crypto rails
    is_active BOOLEAN DEFAULT true,
    min_amount DECIMAL(18,6) NOT NULL, -- Minimum transaction amount
    max_amount DECIMAL(18,6) NOT NULL, -- Maximum transaction amount
    fee_structure JSONB NOT NULL, -- Flexible fee configuration
    settlement_time_seconds INTEGER NOT NULL, -- Expected settlement time
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Employers in the system with their payment rail preferences
CREATE TABLE employers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    public_key VARCHAR(132) NOT NULL UNIQUE, -- For ZKP verification
    domain VARCHAR(255), -- Company domain for verification
    supported_rails UUID[] DEFAULT '{}', -- Array of payment_rails.id
    default_rail UUID REFERENCES payment_rails(id),
    is_verified BOOLEAN DEFAULT false,
    verification_tier INTEGER DEFAULT 1, -- Risk tier 1-5
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee wallets and their payment preferences
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    employer_id UUID REFERENCES employers(id),
    preferred_rail UUID REFERENCES payment_rails(id),
    backup_rails UUID[] DEFAULT '{}', -- Fallback payment methods
    kyc_status ENUM('NONE', 'BASIC', 'FULL') DEFAULT 'NONE',
    risk_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00-5.00 risk multiplier
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Zero-knowledge proof wage attestations
CREATE TABLE wage_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID REFERENCES employers(id) NOT NULL,
    employee_wallet VARCHAR(42) NOT NULL,
    wage_amount DECIMAL(18,6) NOT NULL,
    work_period_start TIMESTAMP NOT NULL,
    work_period_end TIMESTAMP NOT NULL,
    attestation_hash VARCHAR(66) NOT NULL, -- Keccak256 hash of signed attestation
    is_spent BOOLEAN DEFAULT false,
    nullifier_hash VARCHAR(66) UNIQUE, -- Prevents double-spending
    created_at TIMESTAMP DEFAULT NOW()
);

-- Liquidity pool for each payment rail
CREATE TABLE liquidity_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_rail_id UUID REFERENCES payment_rails(id) NOT NULL,
    total_liquidity DECIMAL(18,6) NOT NULL DEFAULT 0,
    available_liquidity DECIMAL(18,6) NOT NULL DEFAULT 0,
    utilization_rate DECIMAL(5,4) NOT NULL DEFAULT 0, -- 0.0000-1.0000
    base_apr DECIMAL(5,4) NOT NULL, -- Annual percentage rate for LPs
    current_apr DECIMAL(5,4) NOT NULL, -- Dynamic rate based on utilization
    total_advances_issued DECIMAL(18,6) DEFAULT 0,
    total_repaid DECIMAL(18,6) DEFAULT 0,
    default_rate DECIMAL(5,4) DEFAULT 0, -- Historical default rate
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual liquidity provider positions
CREATE TABLE lp_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liquidity_pool_id UUID REFERENCES liquidity_pools(id) NOT NULL,
    provider_address VARCHAR(42) NOT NULL,
    deposited_amount DECIMAL(18,6) NOT NULL,
    current_value DECIMAL(18,6) NOT NULL, -- Including earned yield
    deposit_timestamp TIMESTAMP NOT NULL,
    last_yield_calculation TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Individual wage advances/withdrawals
CREATE TABLE wage_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_wallet VARCHAR(42) NOT NULL,
    employer_id UUID REFERENCES employers(id),
    payment_rail_id UUID REFERENCES payment_rails(id) NOT NULL,
    liquidity_pool_id UUID REFERENCES liquidity_pools(id) NOT NULL,
    attestation_id UUID REFERENCES wage_attestations(id) NOT NULL,

    -- Amount details
    requested_amount DECIMAL(18,6) NOT NULL,
    fee_amount DECIMAL(18,6) NOT NULL,
    net_amount DECIMAL(18,6) NOT NULL, -- Amount sent to employee

    -- ZKP verification details
    zkp_proof TEXT NOT NULL, -- The actual zero-knowledge proof
    public_inputs JSONB NOT NULL, -- Public inputs for verification
    nullifier_hash VARCHAR(66) NOT NULL UNIQUE,

    -- Transaction details
    transaction_hash VARCHAR(66), -- On-chain transaction hash
    block_number BIGINT,

    -- Status and timestamps
    status ENUM('PENDING', 'VERIFIED', 'DISBURSED', 'FAILED', 'REPAID', 'DEFAULTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    disbursed_at TIMESTAMP,
    due_date TIMESTAMP NOT NULL, -- Expected repayment date
    repaid_at TIMESTAMP
);

-- Automated repayment tracking
CREATE TABLE repayment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES wage_advances(id) NOT NULL,
    employee_wallet VARCHAR(42) NOT NULL,
    expected_amount DECIMAL(18,6) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status ENUM('PENDING', 'PARTIAL', 'COMPLETE', 'OVERDUE', 'FAILED') DEFAULT 'PENDING',
    repayment_rail_id UUID REFERENCES payment_rails(id),
    repayment_tx_hash VARCHAR(66),
    actual_amount DECIMAL(18,6),
    repaid_at TIMESTAMP
);

-- Fee distribution tracking
CREATE TABLE fee_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES wage_advances(id) NOT NULL,
    liquidity_pool_id UUID REFERENCES liquidity_pools(id) NOT NULL,
    total_fee DECIMAL(18,6) NOT NULL,
    protocol_fee DECIMAL(18,6) NOT NULL, -- Platform fee
    lp_yield DECIMAL(18,6) NOT NULL, -- Amount distributed to LPs
    distribution_tx_hash VARCHAR(66),
    distributed_at TIMESTAMP DEFAULT NOW()
);

-- Risk management and monitoring
CREATE TABLE risk_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type ENUM('EMPLOYER', 'EMPLOYEE', 'RAIL') NOT NULL,
    entity_id UUID NOT NULL, -- References employers.id, employees.id, or payment_rails.id
    metric_name VARCHAR(100) NOT NULL, -- 'default_rate', 'volume_7d', 'avg_advance_size'
    metric_value DECIMAL(18,6) NOT NULL,
    measurement_period INTERVAL, -- '7 days', '30 days', 'all time'
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- Multi-rail transaction routing
CREATE TABLE transaction_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_id UUID REFERENCES wage_advances(id) NOT NULL,
    primary_rail_id UUID REFERENCES payment_rails(id) NOT NULL,
    fallback_rails UUID[] DEFAULT '{}', -- Ordered array of fallback payment rails
    route_reason VARCHAR(255), -- 'user_preference', 'cost_optimization', 'liquidity_availability'
    final_rail_used UUID REFERENCES payment_rails(id),
    routing_timestamp TIMESTAMP DEFAULT NOW()
);

-- Event log for auditability
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- 'advance_created', 'repayment_received', 'pool_deposit'
    entity_type VARCHAR(50), -- 'advance', 'pool', 'employee'
    entity_id UUID,
    event_data JSONB NOT NULL,
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_employees_wallet ON employees(wallet_address);
CREATE INDEX idx_advances_employee ON wage_advances(employee_wallet);
CREATE INDEX idx_advances_status ON wage_advances(status);
CREATE INDEX idx_advances_due_date ON wage_advances(due_date);
CREATE INDEX idx_attestations_nullifier ON wage_attestations(nullifier_hash);
CREATE INDEX idx_repayments_due_date ON repayment_schedules(due_date);
CREATE INDEX idx_events_timestamp ON system_events(timestamp);
CREATE INDEX idx_risk_metrics_entity ON risk_metrics(entity_type, entity_id);

-- Insert initial payment rails
INSERT INTO payment_rails (name, rail_type, network, contract_address, min_amount, max_amount, fee_structure, settlement_time_seconds) VALUES
('USDC', 'CRYPTO', 'ethereum', '0xA0b86a33E6441FEA85a6c6de387d67BF6F372c25', 1.00, 5000.00, '{"type": "flat", "amount": 2.00}', 15),
('USDT', 'CRYPTO', 'ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 1.00, 5000.00, '{"type": "flat", "amount": 2.00}', 15),
('USDC_POLYGON', 'CRYPTO', 'polygon', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 1.00, 5000.00, '{"type": "flat", "amount": 0.10}', 2),
('ACH', 'BANK', NULL, NULL, 10.00, 10000.00, '{"type": "percentage", "rate": 0.01, "min": 1.00}', 259200), -- 3 days
('CARD', 'CARD', NULL, NULL, 5.00, 2000.00, '{"type": "percentage", "rate": 0.029, "fixed": 0.30}', 1); -- Instant

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

-- =============================================================================
-- ADDITIONAL TABLES: Repayment tracking and system monitoring
-- =============================================================================

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
    settlement_method ENUM('DIRECT_DEBIT', 'WALLET_SWEEP', 'MANUAL') DEFAULT 'WALLET_SWEEP',

    -- Status tracking
    status ENUM('SCHEDULED', 'PENDING', 'PROCESSING', 'PARTIAL', 'COMPLETE', 'OVERDUE', 'FAILED', 'CANCELLED') DEFAULT 'SCHEDULED',

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

-- Enhanced risk management and monitoring
CREATE TABLE risk_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type ENUM('EMPLOYER', 'EMPLOYEE', 'RAIL', 'POOL') NOT NULL,
    entity_id UUID NOT NULL,

    -- Metric details
    metric_name VARCHAR(100) NOT NULL, -- 'default_rate', 'volume_7d', 'avg_advance_size'
    metric_value DECIMAL(18,6) NOT NULL,
    metric_unit VARCHAR(20), -- 'percentage', 'usd', 'count', 'seconds'

    -- Time context
    measurement_period INTERVAL, -- '7 days', '30 days', 'all time'
    window_start TIMESTAMP,
    window_end TIMESTAMP,

    -- Threshold monitoring
    threshold_value DECIMAL(18,6),
    threshold_breached BOOLEAN DEFAULT false,
    alert_triggered BOOLEAN DEFAULT false,

    calculated_at TIMESTAMP DEFAULT NOW(),

    -- Index for fast lookups
    UNIQUE(entity_type, entity_id, metric_name, measurement_period, calculated_at)
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

-- Comprehensive event log for auditability
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event classification
    event_type VARCHAR(100) NOT NULL, -- 'advance_created', 'repayment_received', 'pool_deposit'
    event_category ENUM('TRANSACTION', 'SYSTEM', 'SECURITY', 'COMPLIANCE') NOT NULL,
    severity ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') DEFAULT 'INFO',

    -- Entity references
    entity_type VARCHAR(50), -- 'advance', 'pool', 'employee', 'employer'
    entity_id UUID,

    -- Event data
    event_data JSONB NOT NULL,
    message TEXT,

    -- Blockchain context
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    gas_used INTEGER,

    -- User context
    user_address VARCHAR(42),
    user_agent TEXT,
    ip_address INET,

    -- Performance tracking
    processing_time_ms INTEGER,

    timestamp TIMESTAMP DEFAULT NOW()
);

-- Employer staking and reputation system
CREATE TABLE employer_stakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID REFERENCES employers(id) NOT NULL,

    -- Stake details
    staked_amount DECIMAL(18,6) NOT NULL,
    stake_token VARCHAR(10) DEFAULT 'USDC', -- Token used for staking
    stake_rail_id UUID REFERENCES payment_rails(id),

    -- Lock mechanism
    lock_period INTERVAL NOT NULL, -- e.g., '90 days'
    locked_until TIMESTAMP NOT NULL,
    early_unlock_penalty DECIMAL(5,4) DEFAULT 0.10, -- 10% penalty

    -- Staking transaction
    stake_tx_hash VARCHAR(66),
    stake_block_number BIGINT,

    -- Status
    status ENUM('ACTIVE', 'UNLOCKING', 'WITHDRAWN', 'SLASHED') DEFAULT 'ACTIVE',
    slashed_amount DECIMAL(18,6) DEFAULT 0,
    slash_reason TEXT,

    -- Yield
    yield_earned DECIMAL(18,6) DEFAULT 0,
    last_yield_calculation TIMESTAMP DEFAULT NOW(),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_stake CHECK (staked_amount > 0)
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

-- =============================================================================
-- TABLE PARTITIONING: For large tables with high write volume
-- =============================================================================

-- Partition wage_advances by month for better performance
-- Note: PostgreSQL 10+ declarative partitioning
ALTER TABLE wage_advances PARTITION BY RANGE (created_at);

-- Create partitions for current and upcoming months
CREATE TABLE wage_advances_2024_09 PARTITION OF wage_advances
FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');

CREATE TABLE wage_advances_2024_10 PARTITION OF wage_advances
FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');

CREATE TABLE wage_advances_2024_11 PARTITION OF wage_advances
FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

-- Partition system_events by month (high volume)
ALTER TABLE system_events PARTITION BY RANGE (timestamp);

CREATE TABLE system_events_2024_09 PARTITION OF system_events
FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');

CREATE TABLE system_events_2024_10 PARTITION OF system_events
FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');

-- =============================================================================
-- DATA RETENTION POLICIES: Automated cleanup for old data
-- =============================================================================

-- Function to archive old system events
CREATE OR REPLACE FUNCTION archive_old_events()
RETURNS void AS $$
BEGIN
    -- Archive events older than 1 year to separate table
    INSERT INTO system_events_archive
    SELECT * FROM system_events
    WHERE timestamp < NOW() - INTERVAL '1 year';

    -- Delete archived events from main table
    DELETE FROM system_events
    WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create archive table
CREATE TABLE system_events_archive (LIKE system_events INCLUDING ALL);

-- =============================================================================
-- VIEWS: Commonly accessed data combinations for performance
-- =============================================================================

-- Employee advance summary view
CREATE VIEW employee_advance_summary AS
SELECT
    e.wallet_address,
    e.employer_id,
    COUNT(wa.id) as total_advances,
    SUM(wa.net_amount) as total_volume,
    AVG(wa.net_amount) as avg_advance_size,
    SUM(CASE WHEN wa.status = 'REPAID' THEN wa.net_amount ELSE 0 END) as repaid_volume,
    SUM(CASE WHEN wa.status = 'DEFAULTED' THEN wa.net_amount ELSE 0 END) as defaulted_volume,
    (SUM(CASE WHEN wa.status = 'REPAID' THEN wa.net_amount ELSE 0 END) /
     NULLIF(SUM(wa.net_amount), 0))::DECIMAL(5,4) as repayment_rate,
    MAX(wa.created_at) as last_advance_date
FROM employees e
LEFT JOIN wage_advances wa ON e.wallet_address = wa.employee_wallet
GROUP BY e.wallet_address, e.employer_id;

-- Liquidity pool performance view
CREATE VIEW pool_performance_summary AS
SELECT
    lp.id,
    pr.name as rail_name,
    pr.network,
    lp.total_liquidity,
    lp.available_liquidity,
    lp.utilization_rate,
    lp.current_apr,
    lp.total_advances_issued,
    lp.total_repaid,
    lp.default_rate,
    (lp.total_repaid / NULLIF(lp.total_advances_issued, 0))::DECIMAL(5,4) as recovery_rate,
    COUNT(lpp.id) as active_providers,
    lp.updated_at
FROM liquidity_pools lp
JOIN payment_rails pr ON lp.payment_rail_id = pr.id
LEFT JOIN lp_positions lpp ON lp.id = lpp.liquidity_pool_id AND lpp.is_active = true
GROUP BY lp.id, pr.name, pr.network, lp.total_liquidity, lp.available_liquidity,
         lp.utilization_rate, lp.current_apr, lp.total_advances_issued,
         lp.total_repaid, lp.default_rate, lp.updated_at;

-- Real-time advance status view
CREATE VIEW advance_status_summary AS
SELECT
    wa.id,
    wa.employee_wallet,
    emp.name as employer_name,
    pr.name as payment_rail,
    wa.net_amount,
    wa.status,
    wa.created_at,
    wa.due_date,
    CASE
        WHEN wa.status = 'DISBURSED' AND wa.due_date < NOW() THEN 'OVERDUE'
        WHEN wa.status = 'DISBURSED' AND wa.due_date < NOW() + INTERVAL '24 hours' THEN 'DUE_SOON'
        ELSE wa.status::text
    END as effective_status,
    (NOW() - wa.created_at) as age,
    wa.risk_score
FROM wage_advances wa
JOIN employers emp ON wa.employer_id = emp.id
JOIN payment_rails pr ON wa.payment_rail_id = pr.id
WHERE wa.status NOT IN ('REPAID', 'DEFAULTED');