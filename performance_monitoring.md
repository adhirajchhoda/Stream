# Performance Monitoring & Data Retention Policies
## Stream Protocol - Production Operations Guide

### OVERVIEW

This document provides comprehensive performance monitoring queries and data retention policies for the Stream Protocol's multi-rail payment system, designed to maintain sub-50ms p99 query performance and efficient data management for high-volume stablecoin operations.

---

## REAL-TIME PERFORMANCE MONITORING

### 1. Query Performance Dashboard

#### Critical Performance Metrics (Real-time)
```sql
-- Overall system performance summary
WITH performance_summary AS (
    SELECT
        COUNT(*) as total_queries,
        AVG(mean_exec_time) as avg_response_time,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY mean_exec_time) as p50_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time) as p95_time,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY mean_exec_time) as p99_time,
        SUM(calls) as total_calls,
        SUM(CASE WHEN mean_exec_time > 50 THEN calls ELSE 0 END) as slow_calls
    FROM pg_stat_statements
    WHERE last_exec > NOW() - INTERVAL '5 minutes'
),
performance_targets AS (
    SELECT
        1.0 as p50_target_ms,    -- Target: <1ms for p50
        10.0 as p95_target_ms,   -- Target: <10ms for p95
        50.0 as p99_target_ms    -- Target: <50ms for p99
)
SELECT
    ps.*,
    pt.*,
    (ps.p50_time <= pt.p50_target_ms) as p50_target_met,
    (ps.p95_time <= pt.p95_target_ms) as p95_target_met,
    (ps.p99_time <= pt.p99_target_ms) as p99_target_met,
    ROUND((slow_calls::DECIMAL / total_calls) * 100, 2) as slow_query_percentage
FROM performance_summary ps, performance_targets pt;
```

#### Top 10 Slowest Queries (Last Hour)
```sql
SELECT
    LEFT(query, 100) as query_preview,
    calls,
    ROUND(total_exec_time, 2) as total_time_ms,
    ROUND(mean_exec_time, 2) as avg_time_ms,
    ROUND(max_exec_time, 2) as max_time_ms,
    ROUND(stddev_exec_time, 2) as stddev_time_ms,
    rows as avg_rows_returned,
    ROUND(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) as cache_hit_ratio
FROM pg_stat_statements
WHERE last_exec > NOW() - INTERVAL '1 hour'
    AND mean_exec_time > 5 -- Focus on queries slower than 5ms
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 2. Critical Path Performance Monitoring

#### Employee Lookup Performance
```sql
-- Monitor employee lookup performance (target: <5ms)
WITH employee_lookups AS (
    SELECT
        query,
        calls,
        mean_exec_time,
        max_exec_time,
        total_exec_time
    FROM pg_stat_statements
    WHERE query ILIKE '%employees%wallet_address%'
        AND query ILIKE '%SELECT%'
        AND last_exec > NOW() - INTERVAL '15 minutes'
)
SELECT
    'employee_lookup' as operation_type,
    COUNT(*) as query_variants,
    SUM(calls) as total_calls,
    ROUND(AVG(mean_exec_time), 2) as avg_response_time_ms,
    ROUND(MAX(max_exec_time), 2) as max_response_time_ms,
    (AVG(mean_exec_time) <= 5.0) as target_met,
    CASE
        WHEN AVG(mean_exec_time) <= 5.0 THEN 'HEALTHY'
        WHEN AVG(mean_exec_time) <= 15.0 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as status
FROM employee_lookups;
```

#### Nullifier Verification Performance (Most Critical)
```sql
-- Monitor nullifier checks (target: <1ms)
WITH nullifier_checks AS (
    SELECT
        query,
        calls,
        mean_exec_time,
        max_exec_time
    FROM pg_stat_statements
    WHERE (query ILIKE '%zkp_nullifiers%nullifier_hash%' OR
           query ILIKE '%nullifier_hash%EXISTS%')
        AND last_exec > NOW() - INTERVAL '15 minutes'
)
SELECT
    'nullifier_verification' as operation_type,
    COUNT(*) as query_variants,
    SUM(calls) as total_calls,
    ROUND(AVG(mean_exec_time), 2) as avg_response_time_ms,
    ROUND(MAX(max_exec_time), 2) as max_response_time_ms,
    (AVG(mean_exec_time) <= 1.0) as target_met,
    CASE
        WHEN AVG(mean_exec_time) <= 1.0 THEN 'HEALTHY'
        WHEN AVG(mean_exec_time) <= 5.0 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as status
FROM nullifier_checks;
```

#### Advance Processing Pipeline Performance
```sql
-- Monitor complete advance processing pipeline
WITH advance_processing_metrics AS (
    SELECT
        wa.id,
        wa.created_at,
        wa.verified_at,
        wa.routed_at,
        wa.disbursed_at,
        wa.processing_time_ms,
        wa.verification_time_ms,
        EXTRACT(EPOCH FROM (wa.verified_at - wa.created_at)) * 1000 as zkp_verification_time_ms,
        EXTRACT(EPOCH FROM (wa.routed_at - wa.verified_at)) * 1000 as routing_time_ms,
        EXTRACT(EPOCH FROM (wa.disbursed_at - wa.routed_at)) * 1000 as disbursement_time_ms
    FROM wage_advances wa
    WHERE wa.created_at > NOW() - INTERVAL '1 hour'
        AND wa.status IN ('DISBURSED', 'REPAID')
)
SELECT
    COUNT(*) as total_advances,
    ROUND(AVG(processing_time_ms), 2) as avg_total_processing_ms,
    ROUND(AVG(zkp_verification_time_ms), 2) as avg_zkp_verification_ms,
    ROUND(AVG(routing_time_ms), 2) as avg_routing_ms,
    ROUND(AVG(disbursement_time_ms), 2) as avg_disbursement_ms,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_time_ms), 2) as p99_total_processing_ms,
    (AVG(processing_time_ms) <= 15000.0) as processing_target_met, -- 15 second target
    (AVG(zkp_verification_time_ms) <= 5000.0) as verification_target_met -- 5 second target
FROM advance_processing_metrics;
```

### 3. Database Health Monitoring

#### Connection and Resource Usage
```sql
-- Database connection and resource monitoring
SELECT
    'database_health' as metric_type,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle in transaction') as idle_in_transaction,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
    ROUND(
        (SELECT COUNT(*) FROM pg_stat_activity)::DECIMAL /
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') * 100, 2
    ) as connection_usage_percent,
    (SELECT ROUND(100.0 * checkpoints_timed / (checkpoints_timed + checkpoints_req), 1)
     FROM pg_stat_bgwriter) as checkpoint_efficiency_percent;
```

#### Index Usage and Effectiveness
```sql
-- Index usage monitoring (run every 15 minutes)
WITH index_stats AS (
    SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_size_pretty(pg_relation_size(indexrelname::regclass)) as size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
),
critical_indexes AS (
    SELECT unnest(ARRAY[
        'idx_employees_wallet_complete',
        'idx_nullifiers_hash_lookup',
        'idx_advances_employee_status_timeline',
        'idx_pools_realtime_liquidity',
        'idx_attestations_available_optimized'
    ]) as index_name
)
SELECT
    ci.index_name as critical_index,
    COALESCE(ist.idx_scan, 0) as index_scans,
    COALESCE(ist.idx_tup_read, 0) as tuples_read,
    COALESCE(ist.idx_tup_fetch, 0) as tuples_fetched,
    COALESCE(ist.size, 'N/A') as index_size,
    CASE
        WHEN ist.idx_scan IS NULL THEN 'MISSING'
        WHEN ist.idx_scan = 0 THEN 'UNUSED'
        WHEN ist.idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END as usage_status
FROM critical_indexes ci
LEFT JOIN index_stats ist ON ci.index_name = ist.indexname
ORDER BY ci.index_name;
```

### 4. Business Metrics Monitoring

#### Transaction Volume and Success Rates
```sql
-- Real-time transaction metrics (last hour)
WITH hourly_metrics AS (
    SELECT
        pr.name as payment_rail,
        COUNT(wa.id) as total_advances,
        SUM(wa.net_amount) as total_volume_usd,
        COUNT(CASE WHEN wa.status = 'DISBURSED' THEN 1 END) as successful_advances,
        COUNT(CASE WHEN wa.status = 'FAILED' THEN 1 END) as failed_advances,
        AVG(wa.processing_time_ms) as avg_processing_time_ms,
        AVG(wa.verification_time_ms) as avg_verification_time_ms
    FROM wage_advances wa
    JOIN payment_rails pr ON wa.payment_rail_id = pr.id
    WHERE wa.created_at > NOW() - INTERVAL '1 hour'
    GROUP BY pr.id, pr.name
)
SELECT
    payment_rail,
    total_advances,
    ROUND(total_volume_usd, 2) as total_volume_usd,
    successful_advances,
    failed_advances,
    ROUND((successful_advances::DECIMAL / NULLIF(total_advances, 0)) * 100, 2) as success_rate_percent,
    ROUND(avg_processing_time_ms, 0) as avg_processing_time_ms,
    ROUND(avg_verification_time_ms, 0) as avg_verification_time_ms,
    CASE
        WHEN (successful_advances::DECIMAL / NULLIF(total_advances, 0)) >= 0.95 THEN 'HEALTHY'
        WHEN (successful_advances::DECIMAL / NULLIF(total_advances, 0)) >= 0.90 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as health_status
FROM hourly_metrics
ORDER BY total_volume_usd DESC;
```

#### Liquidity Pool Health
```sql
-- Liquidity pool health monitoring
SELECT
    pr.name as payment_rail,
    pr.network,
    lp.total_liquidity,
    lp.available_liquidity,
    ROUND(lp.utilization_rate * 100, 2) as utilization_percent,
    ROUND(lp.current_apr * 100, 2) as current_apr_percent,
    lp.volume_24h,
    lp.default_rate * 100 as default_rate_percent,
    COUNT(lpp.id) as active_providers,
    CASE
        WHEN lp.utilization_rate > 0.90 THEN 'HIGH_UTILIZATION'
        WHEN lp.available_liquidity < 1000 THEN 'LOW_LIQUIDITY'
        WHEN NOT lp.is_active THEN 'INACTIVE'
        ELSE 'HEALTHY'
    END as status,
    lp.updated_at
FROM liquidity_pools lp
JOIN payment_rails pr ON lp.payment_rail_id = pr.id
LEFT JOIN lp_positions lpp ON lp.id = lpp.liquidity_pool_id AND lpp.is_active = true
WHERE pr.is_active = true
GROUP BY pr.id, pr.name, pr.network, lp.id, lp.total_liquidity, lp.available_liquidity,
         lp.utilization_rate, lp.current_apr, lp.volume_24h, lp.default_rate,
         lp.is_active, lp.updated_at
ORDER BY lp.total_liquidity DESC;
```

---

## AUTOMATED ALERTING SYSTEM

### 1. Performance Alert Thresholds
```sql
-- Function to check performance thresholds and generate alerts
CREATE OR REPLACE FUNCTION check_performance_alerts()
RETURNS TABLE(
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    metric_value DECIMAL,
    threshold_value DECIMAL,
    timestamp TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH alert_checks AS (
        -- Query performance alerts
        SELECT
            'QUERY_PERFORMANCE' as alert_type,
            CASE
                WHEN AVG(mean_exec_time) > 100 THEN 'CRITICAL'
                WHEN AVG(mean_exec_time) > 50 THEN 'WARNING'
                ELSE 'INFO'
            END as severity,
            'Average query response time exceeded threshold' as message,
            ROUND(AVG(mean_exec_time), 2) as metric_value,
            50.0 as threshold_value
        FROM pg_stat_statements
        WHERE last_exec > NOW() - INTERVAL '5 minutes'

        UNION ALL

        -- Nullifier check performance
        SELECT
            'NULLIFIER_PERFORMANCE' as alert_type,
            CASE
                WHEN AVG(mean_exec_time) > 5 THEN 'CRITICAL'
                WHEN AVG(mean_exec_time) > 1 THEN 'WARNING'
                ELSE 'INFO'
            END as severity,
            'Nullifier verification time exceeded threshold' as message,
            ROUND(AVG(mean_exec_time), 2) as metric_value,
            1.0 as threshold_value
        FROM pg_stat_statements
        WHERE query ILIKE '%zkp_nullifiers%nullifier_hash%'
            AND last_exec > NOW() - INTERVAL '5 minutes'

        UNION ALL

        -- Connection pool alerts
        SELECT
            'CONNECTION_POOL' as alert_type,
            CASE
                WHEN connection_ratio > 0.90 THEN 'CRITICAL'
                WHEN connection_ratio > 0.75 THEN 'WARNING'
                ELSE 'INFO'
            END as severity,
            'Database connection pool usage high' as message,
            ROUND(connection_ratio * 100, 2) as metric_value,
            75.0 as threshold_value
        FROM (
            SELECT
                COUNT(*)::DECIMAL / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as connection_ratio
            FROM pg_stat_activity
        ) conn_stats

        UNION ALL

        -- Liquidity alerts
        SELECT
            'LIQUIDITY_LOW' as alert_type,
            'WARNING' as severity,
            'Low liquidity detected in pool: ' || pr.name as message,
            lp.available_liquidity as metric_value,
            1000.0 as threshold_value
        FROM liquidity_pools lp
        JOIN payment_rails pr ON lp.payment_rail_id = pr.id
        WHERE lp.available_liquidity < 1000
            AND lp.is_active = true
            AND pr.is_active = true
    )
    SELECT
        ac.alert_type,
        ac.severity,
        ac.message,
        ac.metric_value,
        ac.threshold_value,
        NOW() as timestamp
    FROM alert_checks ac
    WHERE ac.severity IN ('WARNING', 'CRITICAL');
END;
$$ LANGUAGE plpgsql;
```

### 2. Business Logic Alerts
```sql
-- Function to monitor business-critical metrics
CREATE OR REPLACE FUNCTION check_business_alerts()
RETURNS TABLE(
    alert_type TEXT,
    severity TEXT,
    entity_id TEXT,
    message TEXT,
    current_value DECIMAL,
    timestamp TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH business_alerts AS (
        -- High failure rate alerts
        SELECT
            'HIGH_FAILURE_RATE' as alert_type,
            'CRITICAL' as severity,
            pr.name as entity_id,
            'High advance failure rate detected' as message,
            ROUND(failure_rate * 100, 2) as current_value
        FROM (
            SELECT
                wa.payment_rail_id,
                COUNT(CASE WHEN wa.status = 'FAILED' THEN 1 END)::DECIMAL /
                NULLIF(COUNT(*), 0) as failure_rate
            FROM wage_advances wa
            WHERE wa.created_at > NOW() - INTERVAL '1 hour'
            GROUP BY wa.payment_rail_id
            HAVING COUNT(CASE WHEN wa.status = 'FAILED' THEN 1 END)::DECIMAL /
                   NULLIF(COUNT(*), 0) > 0.1 -- 10% failure rate threshold
        ) failure_stats
        JOIN payment_rails pr ON failure_stats.payment_rail_id = pr.id

        UNION ALL

        -- Pool over-utilization alerts
        SELECT
            'POOL_OVER_UTILIZATION' as alert_type,
            CASE
                WHEN lp.utilization_rate > 0.95 THEN 'CRITICAL'
                ELSE 'WARNING'
            END as severity,
            pr.name as entity_id,
            'Pool utilization exceeds safe threshold' as message,
            ROUND(lp.utilization_rate * 100, 2) as current_value
        FROM liquidity_pools lp
        JOIN payment_rails pr ON lp.payment_rail_id = pr.id
        WHERE lp.utilization_rate > 0.85
            AND lp.is_active = true

        UNION ALL

        -- Suspicious velocity patterns
        SELECT
            'SUSPICIOUS_VELOCITY' as alert_type,
            'WARNING' as severity,
            emp.wallet_address as entity_id,
            'Unusual advance velocity pattern detected' as message,
            advance_count as current_value
        FROM (
            SELECT
                wa.employee_wallet,
                COUNT(*) as advance_count
            FROM wage_advances wa
            WHERE wa.created_at > NOW() - INTERVAL '1 hour'
            GROUP BY wa.employee_wallet
            HAVING COUNT(*) > 5 -- More than 5 advances in 1 hour
        ) velocity_check
        JOIN employees emp ON velocity_check.employee_wallet = emp.wallet_address
    )
    SELECT
        ba.alert_type,
        ba.severity,
        ba.entity_id,
        ba.message,
        ba.current_value,
        NOW() as timestamp
    FROM business_alerts ba;
END;
$$ LANGUAGE plpgsql;
```

---

## DATA RETENTION POLICIES

### 1. Automated Data Archival System

#### System Events Archival (Daily)
```sql
-- Archive system events older than 90 days
CREATE OR REPLACE FUNCTION archive_system_events()
RETURNS TABLE(archived_count BIGINT, archive_date DATE) AS $$
DECLARE
    archived_rows BIGINT;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '90 days';
BEGIN
    -- Move old events to archive table
    WITH archived_events AS (
        INSERT INTO system_events_archive
        SELECT * FROM system_events
        WHERE timestamp::DATE < cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_rows FROM archived_events;

    -- Delete archived events from main table
    DELETE FROM system_events
    WHERE timestamp::DATE < cutoff_date;

    RETURN QUERY SELECT archived_rows, cutoff_date;
END;
$$ LANGUAGE plpgsql;
```

#### ZKP Verification Records Cleanup (Weekly)
```sql
-- Clean up old ZKP verification records (keep for 1 year)
CREATE OR REPLACE FUNCTION cleanup_zkp_verifications()
RETURNS TABLE(cleaned_count BIGINT, cutoff_date DATE) AS $$
DECLARE
    cleaned_rows BIGINT;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '1 year';
BEGIN
    -- Archive successful verifications older than 1 year
    WITH cleanup_verifications AS (
        DELETE FROM zkp_proof_verifications
        WHERE created_at::DATE < cutoff_date
            AND is_valid = true  -- Only clean successful verifications
        RETURNING id
    )
    SELECT COUNT(*) INTO cleaned_rows FROM cleanup_verifications;

    RETURN QUERY SELECT cleaned_rows, cutoff_date;
END;
$$ LANGUAGE plpgsql;
```

### 2. Performance Data Retention

#### Query Statistics Cleanup
```sql
-- Reset pg_stat_statements periodically to prevent bloat
CREATE OR REPLACE FUNCTION reset_query_statistics()
RETURNS BOOLEAN AS $$
BEGIN
    -- Reset query statistics (run monthly)
    PERFORM pg_stat_statements_reset();

    -- Log the reset event
    INSERT INTO system_events (
        event_type, event_category, severity,
        event_data, message
    ) VALUES (
        'statistics_reset', 'SYSTEM', 'INFO',
        '{"action": "pg_stat_statements_reset"}',
        'Query statistics reset for performance maintenance'
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql;
```

#### Risk Metrics Aggregation
```sql
-- Aggregate old risk metrics into daily summaries
CREATE OR REPLACE FUNCTION aggregate_risk_metrics()
RETURNS TABLE(aggregated_count BIGINT, summary_date DATE) AS $$
DECLARE
    aggregated_rows BIGINT;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
    -- Create daily aggregations for old metrics
    WITH daily_aggregations AS (
        INSERT INTO risk_metrics_daily_summary (
            entity_type, entity_id, metric_name,
            avg_value, min_value, max_value, measurement_date
        )
        SELECT
            entity_type,
            entity_id,
            metric_name,
            AVG(metric_value) as avg_value,
            MIN(metric_value) as min_value,
            MAX(metric_value) as max_value,
            calculated_at::DATE as measurement_date
        FROM risk_metrics
        WHERE calculated_at::DATE < cutoff_date
        GROUP BY entity_type, entity_id, metric_name, calculated_at::DATE
        ON CONFLICT (entity_type, entity_id, metric_name, measurement_date)
        DO UPDATE SET
            avg_value = EXCLUDED.avg_value,
            min_value = EXCLUDED.min_value,
            max_value = EXCLUDED.max_value
        RETURNING entity_id
    )
    SELECT COUNT(*) INTO aggregated_rows FROM daily_aggregations;

    -- Delete original detailed metrics after aggregation
    DELETE FROM risk_metrics
    WHERE calculated_at::DATE < cutoff_date;

    RETURN QUERY SELECT aggregated_rows, cutoff_date;
END;
$$ LANGUAGE plpgsql;

-- Create summary table for aggregated risk metrics
CREATE TABLE IF NOT EXISTS risk_metrics_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    avg_value DECIMAL(18,6) NOT NULL,
    min_value DECIMAL(18,6) NOT NULL,
    max_value DECIMAL(18,6) NOT NULL,
    measurement_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, metric_name, measurement_date)
);
```

### 3. Automated Maintenance Schedule

#### Daily Maintenance Tasks
```sql
-- Daily maintenance function
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS TABLE(task_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
    -- Archive old system events
    RETURN QUERY
    SELECT
        'archive_system_events' as task_name,
        'COMPLETED' as status,
        'Archived ' || archived_count || ' events' as details
    FROM archive_system_events();

    -- Update table statistics
    PERFORM ANALYZE;

    RETURN QUERY
    SELECT
        'update_statistics' as task_name,
        'COMPLETED' as status,
        'Table statistics updated' as details;

    -- Vacuum old partitions
    PERFORM VACUUM (ANALYZE) system_events;
    PERFORM VACUUM (ANALYZE) wage_advances;

    RETURN QUERY
    SELECT
        'vacuum_tables' as task_name,
        'COMPLETED' as status,
        'Vacuum completed on main tables' as details;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT
            'daily_maintenance' as task_name,
            'FAILED' as status,
            'Error: ' || SQLERRM as details;
END;
$$ LANGUAGE plpgsql;
```

#### Weekly Maintenance Tasks
```sql
-- Weekly maintenance function
CREATE OR REPLACE FUNCTION weekly_maintenance()
RETURNS TABLE(task_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
    -- Clean up ZKP verification records
    RETURN QUERY
    SELECT
        'cleanup_zkp_verifications' as task_name,
        'COMPLETED' as status,
        'Cleaned ' || cleaned_count || ' old verification records' as details
    FROM cleanup_zkp_verifications();

    -- Aggregate risk metrics
    RETURN QUERY
    SELECT
        'aggregate_risk_metrics' as task_name,
        'COMPLETED' as status,
        'Aggregated ' || aggregated_count || ' risk metric records' as details
    FROM aggregate_risk_metrics();

    -- Reindex critical tables
    REINDEX INDEX CONCURRENTLY idx_employees_wallet_complete;
    REINDEX INDEX CONCURRENTLY idx_nullifiers_hash_lookup;

    RETURN QUERY
    SELECT
        'reindex_critical' as task_name,
        'COMPLETED' as status,
        'Critical indexes rebuilt' as details;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT
            'weekly_maintenance' as task_name,
            'FAILED' as status,
            'Error: ' || SQLERRM as details;
END;
$$ LANGUAGE plpgsql;
```

### 4. Storage Management

#### Database Size Monitoring
```sql
-- Monitor database and table sizes
CREATE OR REPLACE FUNCTION monitor_storage_usage()
RETURNS TABLE(
    object_type TEXT,
    object_name TEXT,
    size_mb DECIMAL,
    size_growth_24h_mb DECIMAL,
    recommended_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_sizes AS (
        SELECT
            'table' as object_type,
            tablename as object_name,
            ROUND(pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0, 2) as size_mb
        FROM pg_tables
        WHERE schemaname = 'public'

        UNION ALL

        SELECT
            'index' as object_type,
            indexname as object_name,
            ROUND(pg_relation_size(schemaname||'.'||indexname) / 1024.0 / 1024.0, 2) as size_mb
        FROM pg_indexes
        WHERE schemaname = 'public'
    ),
    size_recommendations AS (
        SELECT
            cs.*,
            0.0 as size_growth_24h_mb, -- Would need historical tracking
            CASE
                WHEN cs.size_mb > 1000 AND cs.object_type = 'table' THEN 'Consider partitioning'
                WHEN cs.size_mb > 500 AND cs.object_type = 'index' THEN 'Review index necessity'
                WHEN cs.size_mb > 100 THEN 'Monitor growth'
                ELSE 'Normal'
            END as recommended_action
        FROM current_sizes cs
    )
    SELECT * FROM size_recommendations
    ORDER BY size_mb DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## AUTOMATED SCHEDULING

### 1. Cron Job Schedule
```bash
# Add to PostgreSQL server crontab

# Every 5 minutes: Performance monitoring
*/5 * * * * psql -d stream_protocol -c "SELECT * FROM check_performance_alerts();" >> /var/log/stream/performance_alerts.log 2>&1

# Every 15 minutes: Business alerts
*/15 * * * * psql -d stream_protocol -c "SELECT * FROM check_business_alerts();" >> /var/log/stream/business_alerts.log 2>&1

# Daily at 2 AM: Maintenance tasks
0 2 * * * psql -d stream_protocol -c "SELECT * FROM daily_maintenance();" >> /var/log/stream/maintenance.log 2>&1

# Weekly on Sunday at 3 AM: Deep maintenance
0 3 * * 0 psql -d stream_protocol -c "SELECT * FROM weekly_maintenance();" >> /var/log/stream/weekly_maintenance.log 2>&1

# Monthly on 1st at 4 AM: Statistics reset
0 4 1 * * psql -d stream_protocol -c "SELECT reset_query_statistics();" >> /var/log/stream/statistics_reset.log 2>&1
```

### 2. Monitoring Dashboard Integration
```sql
-- Export metrics for Prometheus/Grafana
CREATE OR REPLACE FUNCTION export_prometheus_metrics()
RETURNS TABLE(metric_name TEXT, metric_value DECIMAL, labels TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Query performance metrics
    SELECT
        'stream_query_response_time_seconds' as metric_name,
        AVG(mean_exec_time) / 1000.0 as metric_value,
        'type="average"' as labels
    FROM pg_stat_statements
    WHERE last_exec > NOW() - INTERVAL '5 minutes'

    UNION ALL

    -- Transaction volume metrics
    SELECT
        'stream_advances_total' as metric_name,
        COUNT(*)::DECIMAL as metric_value,
        'status="' || status || '"' as labels
    FROM wage_advances
    WHERE created_at > NOW() - INTERVAL '1 hour'
    GROUP BY status

    UNION ALL

    -- Liquidity metrics
    SELECT
        'stream_liquidity_available_usd' as metric_name,
        SUM(available_liquidity) as metric_value,
        'rail_type="CRYPTO"' as labels
    FROM liquidity_pools lp
    JOIN payment_rails pr ON lp.payment_rail_id = pr.id
    WHERE pr.rail_type = 'CRYPTO' AND lp.is_active = true;
END;
$$ LANGUAGE plpgsql;
```

This comprehensive performance monitoring and data retention system ensures that the Stream Protocol maintains optimal performance while efficiently managing data growth and providing real-time insights into system health and business metrics.