-- Migration 006: Final Performance Indexes and Optimization
-- Description: Complete index strategy for sub-50ms query performance
-- Version: 1.0.0
-- Date: 2024-09-20

BEGIN;

-- =============================================================================
-- CRITICAL PERFORMANCE INDEXES: Sub-50ms Query Targets
-- =============================================================================

-- Enhanced employee lookups with complete covering indexes
CREATE INDEX CONCURRENTLY idx_employees_wallet_complete
ON employees (wallet_address)
INCLUDE (id, employer_id, preferred_rail, risk_score, current_outstanding, daily_advance_limit, employment_status);

-- Enhanced employer lookups
CREATE INDEX CONCURRENTLY idx_employers_pubkey_complete
ON employers (public_key)
INCLUDE (id, name, is_verified, verification_tier, stake_amount, default_rail);

-- Payment rail optimization
CREATE INDEX CONCURRENTLY idx_rails_active_routing
ON payment_rails (is_active, rail_type, network)
WHERE is_active = true AND maintenance_mode = false
INCLUDE (id, name, min_amount, max_amount, success_rate, avg_gas_cost, fee_structure);

-- Network-specific rail lookups
CREATE INDEX CONCURRENTLY idx_rails_network_lookup
ON payment_rails (network, rail_type, is_active)
WHERE is_active = true
INCLUDE (id, name, contract_address, chain_id, gas_price_gwei);

-- =============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =============================================================================

-- Complex advance filtering and analytics
CREATE INDEX CONCURRENTLY idx_advances_complex_filter
ON wage_advances (employee_wallet, status, payment_rail_id, created_at DESC)
INCLUDE (id, net_amount, due_date, risk_score, processing_time_ms);

-- Employer advance monitoring
CREATE INDEX CONCURRENTLY idx_advances_employer_monitoring
ON wage_advances (employer_id, status, created_at DESC)
WHERE status NOT IN ('REPAID', 'DEFAULTED', 'CANCELLED')
INCLUDE (employee_wallet, net_amount, due_date, risk_score);

-- Due date monitoring with grace period
CREATE INDEX CONCURRENTLY idx_advances_due_with_grace
ON wage_advances (due_date, status, grace_period_hours)
WHERE status = 'DISBURSED'
INCLUDE (id, employee_wallet, outstanding_amount, employer_id);

-- =============================================================================
-- ZKP SYSTEM OPTIMIZATION
-- =============================================================================

-- Nullifier verification optimization (most critical - <1ms target)
CREATE INDEX CONCURRENTLY idx_nullifiers_hash_exists_fast
ON zkp_nullifiers (nullifier_hash)
WHERE usage_count > 0
INCLUDE (first_used_at, employee_wallet);

-- Employee nullifier velocity checking
CREATE INDEX CONCURRENTLY idx_nullifiers_employee_velocity
ON zkp_nullifiers (employee_wallet, first_used_at DESC)
INCLUDE (nullifier_hash, advance_id)
WHERE first_used_at > NOW() - INTERVAL '24 hours';

-- ZKP verification performance tracking
CREATE INDEX CONCURRENTLY idx_zkp_verifications_performance
ON zkp_proof_verifications (created_at DESC, is_valid)
INCLUDE (verification_time_ms, circuit_version, advance_id);

-- =============================================================================
-- LIQUIDITY AND POOL OPTIMIZATION
-- =============================================================================

-- Real-time liquidity availability
CREATE INDEX CONCURRENTLY idx_pools_realtime_liquidity
ON liquidity_pools (payment_rail_id, available_liquidity DESC, is_active)
WHERE is_active = true AND available_liquidity > 100
INCLUDE (utilization_rate, current_apr, max_utilization);

-- LP provider portfolio management
CREATE INDEX CONCURRENTLY idx_lp_positions_portfolio
ON lp_positions (provider_address, is_active, liquidity_pool_id)
WHERE is_active = true
INCLUDE (lp_tokens, current_value, total_yield_earned, unclaimed_yield);

-- Pool performance analytics
CREATE INDEX CONCURRENTLY idx_pools_performance_analytics
ON liquidity_pools (payment_rail_id, updated_at DESC)
INCLUDE (volume_24h, volume_7d, default_rate, total_advances_issued, total_repaid);

-- =============================================================================
-- ATTESTATION SYSTEM OPTIMIZATION
-- =============================================================================

-- Available attestations for advance creation
CREATE INDEX CONCURRENTLY idx_attestations_available_optimized
ON wage_attestations (employee_wallet, employer_id, is_spent, expires_at)
WHERE is_spent = false AND revoked = false AND expires_at > NOW()
INCLUDE (id, wage_amount, remaining_amount, nullifier_hash, commitment_hash);

-- Attestation usage tracking
CREATE INDEX CONCURRENTLY idx_attestations_usage_tracking
ON wage_attestations (employer_id, created_at DESC, usage_count)
INCLUDE (employee_wallet, wage_amount, spent_amount);

-- =============================================================================
-- REPAYMENT SYSTEM OPTIMIZATION
-- =============================================================================

-- Due repayments with automation support
CREATE INDEX CONCURRENTLY idx_repayments_automation
ON repayment_schedules (due_date, auto_settlement, status)
WHERE status IN ('SCHEDULED', 'PENDING') AND auto_settlement = true
INCLUDE (advance_id, employee_wallet, expected_amount, settlement_method);

-- Employee repayment history
CREATE INDEX CONCURRENTLY idx_repayments_employee_history
ON repayment_schedules (employee_wallet, status, repaid_at DESC)
WHERE status = 'COMPLETE'
INCLUDE (advance_id, expected_amount, actual_amount, fees_paid);

-- =============================================================================
-- RISK AND MONITORING OPTIMIZATION
-- =============================================================================

-- Real-time risk metrics
CREATE INDEX CONCURRENTLY idx_risk_metrics_realtime
ON risk_metrics (entity_type, entity_id, metric_name, calculated_at DESC)
INCLUDE (metric_value, threshold_breached, alert_triggered);

-- System event monitoring
CREATE INDEX CONCURRENTLY idx_events_monitoring
ON system_events (timestamp DESC, event_category, severity)
WHERE timestamp > NOW() - INTERVAL '24 hours'
INCLUDE (event_type, entity_type, entity_id, processing_time_ms);

-- Performance degradation detection
CREATE INDEX CONCURRENTLY idx_events_performance_issues
ON system_events (timestamp DESC, event_type)
WHERE event_type LIKE '%performance%' OR event_type LIKE '%timeout%' OR event_type LIKE '%error%'
INCLUDE (severity, event_data, processing_time_ms);

-- =============================================================================
-- PARTIAL INDEXES FOR ACTIVE RECORDS
-- =============================================================================

-- Active employees only
CREATE INDEX CONCURRENTLY idx_employees_active_optimized
ON employees (wallet_address, employer_id)
WHERE employment_status = 'ACTIVE'
INCLUDE (preferred_rail, risk_score, current_outstanding, last_advance_date);

-- Verified employers only
CREATE INDEX CONCURRENTLY idx_employers_verified_optimized
ON employers (id, public_key)
WHERE is_verified = true
INCLUDE (name, verification_tier, stake_amount, reputation_score, default_rail);

-- Available liquidity pools only
CREATE INDEX CONCURRENTLY idx_pools_available_optimized
ON liquidity_pools (payment_rail_id)
WHERE is_active = true AND available_liquidity > 0 AND emergency_shutdown = false
INCLUDE (available_liquidity, utilization_rate, current_apr);

-- Active LP positions only
CREATE INDEX CONCURRENTLY idx_lp_positions_active_optimized
ON lp_positions (provider_address, liquidity_pool_id)
WHERE is_active = true
INCLUDE (lp_tokens, current_value, unclaimed_yield);

-- Pending advances for processing
CREATE INDEX CONCURRENTLY idx_advances_pending_optimized
ON wage_advances (created_at DESC, payment_rail_id)
WHERE status IN ('PENDING', 'VERIFIED', 'ROUTING')
INCLUDE (employee_wallet, employer_id, net_amount, nullifier_hash);

-- =============================================================================
-- SPECIALIZED INDEXES FOR ANALYTICS
-- =============================================================================

-- Time-series analytics for volume tracking
CREATE INDEX CONCURRENTLY idx_advances_time_series
ON wage_advances (created_at DESC, payment_rail_id, status)
WHERE status IN ('DISBURSED', 'REPAID')
INCLUDE (net_amount, processing_time_ms, verification_time_ms);

-- Geographic/network analytics
CREATE INDEX CONCURRENTLY idx_rails_network_analytics
ON payment_rails (network, created_at DESC)
WHERE is_active = true
INCLUDE (name, avg_gas_cost, success_rate, settlement_time_seconds);

-- Employer performance analytics
CREATE INDEX CONCURRENTLY idx_employers_performance_analytics
ON employers (verification_tier, reputation_score DESC, total_volume DESC)
WHERE is_verified = true
INCLUDE (name, default_rate, stake_amount, attestation_count);

-- =============================================================================
-- QUERY OPTIMIZATION HINTS AND STATISTICS
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE employees;
ANALYZE employers;
ANALYZE payment_rails;
ANALYZE wage_advances;
ANALYZE wage_attestations;
ANALYZE liquidity_pools;
ANALYZE lp_positions;
ANALYZE zkp_nullifiers;
ANALYZE repayment_schedules;
ANALYZE system_events;
ANALYZE risk_metrics;

-- Set table-specific statistics targets for better planning
ALTER TABLE wage_advances ALTER COLUMN employee_wallet SET STATISTICS 1000;
ALTER TABLE wage_advances ALTER COLUMN nullifier_hash SET STATISTICS 1000;
ALTER TABLE wage_advances ALTER COLUMN status SET STATISTICS 100;
ALTER TABLE employees ALTER COLUMN wallet_address SET STATISTICS 1000;
ALTER TABLE employers ALTER COLUMN public_key SET STATISTICS 1000;
ALTER TABLE zkp_nullifiers ALTER COLUMN nullifier_hash SET STATISTICS 1000;

-- =============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =============================================================================

-- Function to monitor index usage and effectiveness
CREATE OR REPLACE FUNCTION monitor_index_performance()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    size_mb DECIMAL,
    usage_ratio DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname::TEXT || '.' || tablename::TEXT as table_name,
        indexrelname::TEXT as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        ROUND(pg_relation_size(indexrelname::regclass) / 1024.0 / 1024.0, 2) as size_mb,
        CASE
            WHEN idx_tup_read > 0 THEN ROUND(idx_tup_fetch::DECIMAL / idx_tup_read, 4)
            ELSE 0
        END as usage_ratio
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify slow queries
CREATE OR REPLACE FUNCTION identify_slow_queries()
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time_ms DECIMAL,
    mean_time_ms DECIMAL,
    max_time_ms DECIMAL,
    rows_affected BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        query::TEXT as query_text,
        calls,
        ROUND(total_exec_time, 2) as total_time_ms,
        ROUND(mean_exec_time, 2) as mean_time_ms,
        ROUND(max_exec_time, 2) as max_time_ms,
        rows
    FROM pg_stat_statements
    WHERE mean_exec_time > 10 -- Queries averaging more than 10ms
    ORDER BY mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to check query performance against targets
CREATE OR REPLACE FUNCTION check_performance_targets()
RETURNS TABLE(
    query_type TEXT,
    target_ms INTEGER,
    actual_avg_ms DECIMAL,
    target_met BOOLEAN,
    performance_ratio DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH query_performance AS (
        SELECT
            'employee_lookup' as query_type,
            5 as target_ms,
            AVG(mean_exec_time) as actual_avg_ms
        FROM pg_stat_statements
        WHERE query ILIKE '%employees%wallet_address%'

        UNION ALL

        SELECT
            'nullifier_check' as query_type,
            1 as target_ms,
            AVG(mean_exec_time) as actual_avg_ms
        FROM pg_stat_statements
        WHERE query ILIKE '%zkp_nullifiers%nullifier_hash%'

        UNION ALL

        SELECT
            'liquidity_check' as query_type,
            3 as target_ms,
            AVG(mean_exec_time) as actual_avg_ms
        FROM pg_stat_statements
        WHERE query ILIKE '%liquidity_pools%available_liquidity%'

        UNION ALL

        SELECT
            'advance_creation' as query_type,
            15 as target_ms,
            AVG(mean_exec_time) as actual_avg_ms
        FROM pg_stat_statements
        WHERE query ILIKE '%INSERT INTO wage_advances%'
    )
    SELECT
        qp.query_type,
        qp.target_ms,
        ROUND(qp.actual_avg_ms, 2) as actual_avg_ms,
        (qp.actual_avg_ms <= qp.target_ms) as target_met,
        ROUND(qp.target_ms / qp.actual_avg_ms, 2) as performance_ratio
    FROM query_performance qp;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =============================================================================
-- POST-MIGRATION PERFORMANCE VALIDATION
-- =============================================================================

-- Validate critical indexes exist
DO $$
DECLARE
    critical_indexes TEXT[] := ARRAY[
        'idx_employees_wallet_complete',
        'idx_nullifiers_hash_lookup',
        'idx_advances_employee_status_timeline',
        'idx_pools_realtime_liquidity',
        'idx_attestations_available_optimized'
    ];
    idx TEXT;
    index_count INTEGER;
BEGIN
    FOREACH idx IN ARRAY critical_indexes
    LOOP
        SELECT COUNT(*)
        INTO index_count
        FROM pg_indexes
        WHERE indexname = idx;

        IF index_count = 0 THEN
            RAISE EXCEPTION 'Critical index % not found', idx;
        END IF;
    END LOOP;

    RAISE NOTICE 'All critical indexes validated successfully';
END $$;

-- Final statistics update
ANALYZE;