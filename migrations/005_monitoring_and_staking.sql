-- Migration 005: Monitoring, Risk Management, and Staking System
-- Description: System monitoring, risk metrics, employer staking, and audit trails
-- Version: 1.0.0
-- Date: 2024-09-20

BEGIN;

-- =============================================================================
-- RISK MANAGEMENT AND MONITORING
-- =============================================================================

-- Enhanced risk management and monitoring
CREATE TABLE risk_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('EMPLOYER', 'EMPLOYEE', 'RAIL', 'POOL')),
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

-- Comprehensive event log for auditability
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event classification
    event_type VARCHAR(100) NOT NULL, -- 'advance_created', 'repayment_received', 'pool_deposit'
    event_category TEXT NOT NULL CHECK (event_category IN ('TRANSACTION', 'SYSTEM', 'SECURITY', 'COMPLIANCE')),
    severity TEXT DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),

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

-- =============================================================================
-- EMPLOYER STAKING AND REPUTATION SYSTEM
-- =============================================================================

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
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNLOCKING', 'WITHDRAWN', 'SLASHED')),
    slashed_amount DECIMAL(18,6) DEFAULT 0,
    slash_reason TEXT,

    -- Yield
    yield_earned DECIMAL(18,6) DEFAULT 0,
    last_yield_calculation TIMESTAMP DEFAULT NOW(),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT positive_stake CHECK (staked_amount > 0)
);

-- =============================================================================
-- TABLE PARTITIONING: For large tables with high write volume
-- =============================================================================

-- Partition system_events by month (high volume)
CREATE TABLE system_events_2024_09 (
    LIKE system_events INCLUDING ALL,
    CHECK (timestamp >= '2024-09-01' AND timestamp < '2024-10-01')
);

CREATE TABLE system_events_2024_10 (
    LIKE system_events INCLUDING ALL,
    CHECK (timestamp >= '2024-10-01' AND timestamp < '2024-11-01')
);

CREATE TABLE system_events_2024_11 (
    LIKE system_events INCLUDING ALL,
    CHECK (timestamp >= '2024-11-01' AND timestamp < '2024-12-01')
);

-- =============================================================================
-- DATA RETENTION POLICIES: Automated cleanup for old data
-- =============================================================================

-- Create archive table for old system events
CREATE TABLE system_events_archive (LIKE system_events INCLUDING ALL);

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

-- =============================================================================
-- PERFORMANCE MONITORING VIEWS
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

-- Create comprehensive performance indexes
CREATE INDEX idx_events_timestamp_type ON system_events(timestamp DESC, event_type)
INCLUDE (entity_id, entity_type);

CREATE INDEX idx_risk_metrics_entity_date ON risk_metrics(entity_type, entity_id, calculated_at DESC);

CREATE INDEX idx_stakes_employer_status ON employer_stakes(employer_id, status)
WHERE status = 'ACTIVE'
INCLUDE (staked_amount, locked_until);

-- Performance monitoring function
CREATE OR REPLACE FUNCTION check_system_performance()
RETURNS TABLE(
    metric_name TEXT,
    metric_value DECIMAL,
    threshold_breached BOOLEAN,
    severity TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH performance_metrics AS (
        -- Average advance processing time
        SELECT
            'avg_advance_processing_time_ms' as metric_name,
            AVG(processing_time_ms) as metric_value,
            (AVG(processing_time_ms) > 50000) as threshold_breached,
            CASE WHEN AVG(processing_time_ms) > 50000 THEN 'CRITICAL' ELSE 'INFO' END as severity
        FROM wage_advances
        WHERE created_at > NOW() - INTERVAL '1 hour'
            AND processing_time_ms IS NOT NULL

        UNION ALL

        -- ZKP verification time
        SELECT
            'avg_zkp_verification_time_ms' as metric_name,
            AVG(verification_time_ms) as metric_value,
            (AVG(verification_time_ms) > 5000) as threshold_breached,
            CASE WHEN AVG(verification_time_ms) > 5000 THEN 'WARNING' ELSE 'INFO' END as severity
        FROM wage_advances
        WHERE created_at > NOW() - INTERVAL '1 hour'
            AND verification_time_ms IS NOT NULL

        UNION ALL

        -- Pool utilization rates
        SELECT
            'max_pool_utilization_rate' as metric_name,
            MAX(utilization_rate) as metric_value,
            (MAX(utilization_rate) > 0.90) as threshold_breached,
            CASE WHEN MAX(utilization_rate) > 0.95 THEN 'CRITICAL'
                 WHEN MAX(utilization_rate) > 0.90 THEN 'WARNING'
                 ELSE 'INFO' END as severity
        FROM liquidity_pools
        WHERE is_active = true

        UNION ALL

        -- System error rate
        SELECT
            'error_rate_percentage' as metric_name,
            (COUNT(CASE WHEN severity IN ('ERROR', 'CRITICAL') THEN 1 END) * 100.0 / COUNT(*)) as metric_value,
            ((COUNT(CASE WHEN severity IN ('ERROR', 'CRITICAL') THEN 1 END) * 100.0 / COUNT(*)) > 5.0) as threshold_breached,
            CASE WHEN (COUNT(CASE WHEN severity IN ('ERROR', 'CRITICAL') THEN 1 END) * 100.0 / COUNT(*)) > 10.0 THEN 'CRITICAL'
                 WHEN (COUNT(CASE WHEN severity IN ('ERROR', 'CRITICAL') THEN 1 END) * 100.0 / COUNT(*)) > 5.0 THEN 'WARNING'
                 ELSE 'INFO' END as severity
        FROM system_events
        WHERE timestamp > NOW() - INTERVAL '1 hour'
    )
    SELECT * FROM performance_metrics;
END;
$$ LANGUAGE plpgsql;

-- Automated risk calculation function
CREATE OR REPLACE FUNCTION calculate_employee_risk_score(employee_wallet_addr VARCHAR(42))
RETURNS DECIMAL(5,2) AS $$
DECLARE
    base_score DECIMAL(5,2) := 1.00;
    volume_factor DECIMAL(5,2) := 1.00;
    repayment_factor DECIMAL(5,2) := 1.00;
    velocity_factor DECIMAL(5,2) := 1.00;
    final_score DECIMAL(5,2);
BEGIN
    -- Calculate volume-based risk (higher volume = lower risk)
    SELECT
        CASE
            WHEN total_volume > 1000 THEN 0.80
            WHEN total_volume > 500 THEN 0.90
            ELSE 1.10
        END
    INTO volume_factor
    FROM employees
    WHERE wallet_address = employee_wallet_addr;

    -- Calculate repayment-based risk
    SELECT
        CASE
            WHEN repayment_rate >= 0.95 THEN 0.70
            WHEN repayment_rate >= 0.90 THEN 0.85
            WHEN repayment_rate >= 0.80 THEN 1.20
            ELSE 2.00
        END
    INTO repayment_factor
    FROM employees
    WHERE wallet_address = employee_wallet_addr;

    -- Calculate velocity risk (too many recent advances)
    SELECT
        CASE
            WHEN COUNT(*) > 5 THEN 1.50
            WHEN COUNT(*) > 3 THEN 1.20
            ELSE 1.00
        END
    INTO velocity_factor
    FROM wage_advances
    WHERE employee_wallet = employee_wallet_addr
        AND created_at > NOW() - INTERVAL '7 days';

    -- Combine factors
    final_score := base_score * volume_factor * repayment_factor * velocity_factor;

    -- Cap at reasonable bounds
    final_score := GREATEST(0.50, LEAST(5.00, final_score));

    RETURN final_score;
END;
$$ LANGUAGE plpgsql;

COMMIT;