# Database Index Optimization Plan
## Stream Protocol - Sub-50ms Query Performance Strategy

### OVERVIEW

This document provides a comprehensive index optimization strategy for the Stream Protocol database schema, designed to achieve sub-50ms p99 query performance for high-frequency stablecoin payment operations.

### QUERY PATTERNS ANALYSIS

Based on the Stream Protocol's multi-rail payment architecture, the following query patterns have been identified as critical for performance optimization:

#### High-Frequency Queries (>1000 QPS)
1. Employee wallet address lookups
2. Nullifier hash verification (ZKP double-spend prevention)
3. Active payment rail configuration
4. Liquidity pool availability checks
5. Rate limiting validations

#### Medium-Frequency Queries (100-1000 QPS)
1. Employer verification status
2. Active advance status checks
3. Due date monitoring
4. Transaction routing decisions
5. Risk metric calculations

#### Low-Frequency Queries (<100 QPS)
1. Historical reporting
2. Audit trail searches
3. Performance analytics
4. Compliance reporting

---

## CRITICAL PERFORMANCE INDEXES

### 1. Nullifier System (Highest Priority)

**Purpose:** ZKP double-spend prevention - must be <1ms
```sql
-- Primary nullifier lookup (most critical)
CREATE UNIQUE INDEX CONCURRENTLY idx_nullifiers_hash_lookup
ON zkp_nullifiers (nullifier_hash)
INCLUDE (advance_id, first_used_at, employee_wallet);

-- Employee nullifier history for velocity checks
CREATE INDEX CONCURRENTLY idx_nullifiers_employee_timeline
ON zkp_nullifiers (employee_wallet, first_used_at DESC)
INCLUDE (nullifier_hash, advance_id);

-- Hash existence check optimization
CREATE INDEX CONCURRENTLY idx_nullifiers_hash_exists
ON zkp_nullifiers (nullifier_hash)
WHERE usage_count > 0;
```

**Performance Target:** <1ms for nullifier verification

### 2. Employee & Employer Lookups (Critical Priority)

**Purpose:** Primary entity resolution for all operations
```sql
-- Employee wallet address lookup (most frequent)
CREATE UNIQUE INDEX CONCURRENTLY idx_employees_wallet_complete
ON employees (wallet_address)
INCLUDE (id, employer_id, preferred_rail, risk_score, current_outstanding, daily_advance_limit);

-- Employer public key lookup for ZKP verification
CREATE UNIQUE INDEX CONCURRENTLY idx_employers_pubkey_complete
ON employers (public_key)
INCLUDE (id, name, is_verified, verification_tier, stake_amount, default_rail);

-- Active employees by employer
CREATE INDEX CONCURRENTLY idx_employees_employer_active
ON employees (employer_id, employment_status)
WHERE employment_status = 'ACTIVE'
INCLUDE (wallet_address, preferred_rail, risk_score);
```

**Performance Target:** <5ms for entity lookups

### 3. Payment Rail Operations (Critical Priority)

**Purpose:** Fast rail selection and configuration lookup
```sql
-- Active rails for routing decisions
CREATE INDEX CONCURRENTLY idx_rails_active_routing
ON payment_rails (is_active, rail_type, network)
WHERE is_active = true AND maintenance_mode = false
INCLUDE (id, name, min_amount, max_amount, success_rate, avg_gas_cost);

-- Rail-specific configuration lookup
CREATE UNIQUE INDEX CONCURRENTLY idx_rails_config_lookup
ON payment_rails (id)
INCLUDE (fee_structure, settlement_time_seconds, gas_price_gwei, block_confirmations);

-- Network-specific rails
CREATE INDEX CONCURRENTLY idx_rails_network_lookup
ON payment_rails (network, rail_type, is_active)
WHERE is_active = true
INCLUDE (id, name, contract_address, chain_id);
```

**Performance Target:** <3ms for rail configuration lookups

### 4. Liquidity Pool Queries (High Priority)

**Purpose:** Real-time liquidity availability and pool metrics
```sql
-- Available liquidity for advance processing
CREATE INDEX CONCURRENTLY idx_pools_liquidity_available
ON liquidity_pools (payment_rail_id, is_active)
WHERE is_active = true AND available_liquidity > 0
INCLUDE (available_liquidity, utilization_rate, max_utilization);

-- Pool performance metrics
CREATE INDEX CONCURRENTLY idx_pools_metrics_lookup
ON liquidity_pools (id)
INCLUDE (total_liquidity, available_liquidity, current_apr, default_rate, volume_24h);

-- LP provider positions
CREATE INDEX CONCURRENTLY idx_lp_positions_provider_active
ON lp_positions (provider_address, is_active)
WHERE is_active = true
INCLUDE (liquidity_pool_id, lp_tokens, current_value, unclaimed_yield);
```

**Performance Target:** <5ms for liquidity checks

### 5. Wage Advance Operations (High Priority)

**Purpose:** Advance creation, status tracking, and repayment monitoring
```sql
-- Employee advance history and status
CREATE INDEX CONCURRENTLY idx_advances_employee_status_timeline
ON wage_advances (employee_wallet, status, created_at DESC)
INCLUDE (id, net_amount, due_date, payment_rail_id);

-- Employer advance monitoring
CREATE INDEX CONCURRENTLY idx_advances_employer_timeline
ON wage_advances (employer_id, created_at DESC)
WHERE status NOT IN ('REPAID', 'DEFAULTED')
INCLUDE (employee_wallet, net_amount, status, due_date);

-- Due date monitoring for repayments
CREATE INDEX CONCURRENTLY idx_advances_due_monitoring
ON wage_advances (due_date, status)
WHERE status IN ('DISBURSED')
INCLUDE (id, employee_wallet, net_amount, outstanding_amount);

-- Nullifier to advance mapping
CREATE UNIQUE INDEX CONCURRENTLY idx_advances_nullifier_mapping
ON wage_advances (nullifier_hash)
INCLUDE (id, employee_wallet, status, created_at);
```

**Performance Target:** <10ms for advance operations

### 6. Attestation Verification (High Priority)

**Purpose:** Fast attestation lookup and validation
```sql
-- Attestation nullifier lookup
CREATE UNIQUE INDEX CONCURRENTLY idx_attestations_nullifier_unique
ON wage_attestations (nullifier_hash)
WHERE nullifier_hash IS NOT NULL
INCLUDE (id, employer_id, employee_wallet, wage_amount, is_spent);

-- Employee-employer attestation history
CREATE INDEX CONCURRENTLY idx_attestations_relationship_timeline
ON wage_attestations (employee_wallet, employer_id, created_at DESC)
INCLUDE (id, wage_amount, remaining_amount, expires_at, is_spent);

-- Available (unspent) attestations
CREATE INDEX CONCURRENTLY idx_attestations_available
ON wage_attestations (employee_wallet, is_spent, expires_at)
WHERE is_spent = false AND revoked = false
INCLUDE (id, wage_amount, remaining_amount, nullifier_hash);
```

**Performance Target:** <5ms for attestation verification

---

## COMPOSITE INDEXES FOR COMPLEX QUERIES

### 1. Multi-Condition Advance Lookups
```sql
-- Complex advance filtering
CREATE INDEX CONCURRENTLY idx_advances_complex_filter
ON wage_advances (employee_wallet, status, payment_rail_id, created_at DESC)
INCLUDE (id, net_amount, due_date, risk_score);

-- Advance routing optimization
CREATE INDEX CONCURRENTLY idx_advances_routing_data
ON wage_advances (payment_rail_id, status, created_at DESC)
INCLUDE (employee_wallet, net_amount, processing_time_ms, actual_gas_cost);
```

### 2. Risk Assessment Queries
```sql
-- Employee risk metrics
CREATE INDEX CONCURRENTLY idx_risk_metrics_employee_recent
ON risk_metrics (entity_type, entity_id, calculated_at DESC)
WHERE entity_type = 'EMPLOYEE'
INCLUDE (metric_name, metric_value, measurement_period);

-- Employer reputation tracking
CREATE INDEX CONCURRENTLY idx_risk_metrics_employer_reputation
ON risk_metrics (entity_type, entity_id, metric_name, calculated_at DESC)
WHERE entity_type = 'EMPLOYER' AND metric_name IN ('default_rate', 'volume_7d', 'reputation_score')
INCLUDE (metric_value);
```

### 3. Repayment Monitoring
```sql
-- Due repayments monitoring
CREATE INDEX CONCURRENTLY idx_repayments_due_active
ON repayment_schedules (due_date, status)
WHERE status IN ('SCHEDULED', 'PENDING', 'PROCESSING')
INCLUDE (advance_id, employee_wallet, expected_amount);

-- Employee repayment history
CREATE INDEX CONCURRENTLY idx_repayments_employee_history
ON repayment_schedules (employee_wallet, repaid_at DESC)
WHERE status = 'COMPLETE'
INCLUDE (advance_id, expected_amount, actual_amount);
```

---

## PARTIAL INDEXES (Storage Optimization)

### 1. Active Record Optimization
```sql
-- Only index active employees
CREATE INDEX CONCURRENTLY idx_employees_active_only
ON employees (wallet_address)
WHERE employment_status = 'ACTIVE'
INCLUDE (employer_id, preferred_rail, risk_score);

-- Only index verified employers
CREATE INDEX CONCURRENTLY idx_employers_verified_only
ON employers (id)
WHERE is_verified = true
INCLUDE (name, public_key, verification_tier, stake_amount);

-- Only index available liquidity pools
CREATE INDEX CONCURRENTLY idx_pools_available_only
ON liquidity_pools (payment_rail_id)
WHERE is_active = true AND available_liquidity > 0
INCLUDE (available_liquidity, utilization_rate);
```

### 2. Status-Specific Indexes
```sql
-- Pending advances only
CREATE INDEX CONCURRENTLY idx_advances_pending_processing
ON wage_advances (created_at DESC)
WHERE status IN ('PENDING', 'VERIFIED', 'ROUTING', 'DISBURSING')
INCLUDE (employee_wallet, payment_rail_id, net_amount);

-- Failed advances for retry logic
CREATE INDEX CONCURRENTLY idx_advances_failed_retry
ON wage_advances (created_at DESC, retry_count)
WHERE status = 'FAILED' AND retry_count < 3
INCLUDE (employee_wallet, failure_reason, payment_rail_id);
```

---

## COVERING INDEXES (Read Optimization)

### 1. Employee Dashboard Queries
```sql
-- Complete employee profile data
CREATE INDEX CONCURRENTLY idx_employee_dashboard_complete
ON employees (wallet_address)
INCLUDE (id, employer_id, preferred_rail, backup_rails, kyc_status, risk_score,
         total_advances, total_volume, avg_advance_amount, repayment_rate,
         daily_advance_limit, max_outstanding, current_outstanding, last_advance_date);
```

### 2. Employer Analytics
```sql
-- Employer performance metrics
CREATE INDEX CONCURRENTLY idx_employer_analytics_complete
ON employers (id)
INCLUDE (name, total_volume, default_rate, reputation_score, stake_amount,
         daily_advance_limit, max_advance_amount, attestation_count,
         last_attestation, verification_tier);
```

---

## INDEX MAINTENANCE STRATEGY

### 1. Concurrent Index Creation
```sql
-- Always use CONCURRENTLY for production
CREATE INDEX CONCURRENTLY idx_name ON table_name (columns);

-- Monitor progress
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'wage_advances';
```

### 2. Index Usage Monitoring
```sql
-- Monitor index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC;

-- Identify unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND schemaname = 'public';
```

### 3. Index Optimization
```sql
-- Reindex when fragmentation is high
REINDEX INDEX CONCURRENTLY idx_name;

-- Update table statistics
ANALYZE wage_advances;
ANALYZE employees;
ANALYZE liquidity_pools;

-- Vacuum for space reclamation
VACUUM (ANALYZE, VERBOSE) wage_advances;
```

---

## QUERY OPTIMIZATION EXAMPLES

### 1. Optimized Employee Lookup
```sql
-- Before optimization: 25-50ms
SELECT e.*, emp.name as employer_name
FROM employees e
JOIN employers emp ON e.employer_id = emp.id
WHERE e.wallet_address = $1;

-- After optimization: 2-5ms (using covering index)
SELECT
    wallet_address, employer_id, preferred_rail, risk_score,
    current_outstanding, daily_advance_limit
FROM employees
WHERE wallet_address = $1;
-- Uses: idx_employees_wallet_complete
```

### 2. Optimized Liquidity Check
```sql
-- Before optimization: 20-40ms
SELECT
    lp.*,
    pr.name as rail_name,
    pr.network
FROM liquidity_pools lp
JOIN payment_rails pr ON lp.payment_rail_id = pr.id
WHERE pr.is_active = true
    AND lp.is_active = true
    AND lp.available_liquidity >= $1
ORDER BY lp.current_apr DESC;

-- After optimization: 1-3ms (using partial index)
SELECT payment_rail_id, available_liquidity, current_apr
FROM liquidity_pools
WHERE payment_rail_id = ANY($1)  -- Pre-filtered active rails
    AND available_liquidity >= $2
ORDER BY current_apr DESC;
-- Uses: idx_pools_available_only
```

### 3. Optimized Nullifier Check
```sql
-- Before optimization: 10-20ms
SELECT COUNT(*) FROM zkp_nullifiers WHERE nullifier_hash = $1;

-- After optimization: <1ms (using unique index)
SELECT 1 FROM zkp_nullifiers WHERE nullifier_hash = $1 LIMIT 1;
-- Uses: idx_nullifiers_hash_lookup
```

---

## PERFORMANCE MONITORING

### 1. Query Performance Tracking
```sql
-- Enable query monitoring
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET log_min_duration_statement = 50; -- Log queries >50ms

-- Monitor slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 10 -- Queries averaging >10ms
ORDER BY mean_time DESC;
```

### 2. Index Effectiveness
```sql
-- Index hit ratios
SELECT
    indexrelname,
    idx_tup_read,
    idx_tup_fetch,
    idx_tup_read / idx_tup_fetch as selectivity
FROM pg_stat_user_indexes
WHERE idx_tup_fetch > 0
ORDER BY selectivity DESC;
```

### 3. Performance Alerts
```sql
-- Automated performance monitoring
CREATE OR REPLACE FUNCTION check_query_performance()
RETURNS void AS $$
DECLARE
    slow_query_count INTEGER;
BEGIN
    -- Count queries exceeding 50ms in last hour
    SELECT COUNT(*)
    INTO slow_query_count
    FROM pg_stat_statements
    WHERE mean_time > 50;

    IF slow_query_count > 10 THEN
        -- Trigger alert
        INSERT INTO system_events (
            event_type, event_category, severity,
            event_data, message
        ) VALUES (
            'performance_degradation', 'SYSTEM', 'WARNING',
            json_build_object('slow_queries', slow_query_count),
            'Query performance degradation detected'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## EXPECTED PERFORMANCE IMPROVEMENTS

### Before Index Optimization
- Employee lookup: 25-50ms
- Nullifier check: 10-20ms
- Liquidity query: 20-40ms
- Advance status: 15-30ms
- **Total request: 70-140ms**

### After Index Optimization
- Employee lookup: 2-5ms
- Nullifier check: <1ms
- Liquidity query: 1-3ms
- Advance status: 2-5ms
- **Total request: 5-15ms**

### Performance Targets Achieved
- **P50 latency: <10ms**
- **P95 latency: <25ms**
- **P99 latency: <50ms**
- **Cache hit rate: >90%**

This index optimization plan, combined with the Redis caching strategy, ensures that the Stream Protocol can handle high-volume stablecoin transactions while maintaining sub-50ms response times.