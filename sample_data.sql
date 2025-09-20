-- Sample Data for Stream Protocol Testing
-- Description: Realistic test data for development and performance testing
-- Version: 1.0.0
-- Date: 2024-09-20

BEGIN;

-- =============================================================================
-- SAMPLE EMPLOYERS
-- =============================================================================

INSERT INTO employers (
    id, name, public_key, domain, business_registration, tax_id,
    supported_rails, default_rail, rail_preferences,
    stake_amount, reputation_score, total_volume, default_rate,
    is_verified, verification_tier, kyc_status, risk_multiplier,
    daily_advance_limit, max_advance_amount, max_outstanding_amount,
    attestation_count
) VALUES
-- Tech Company (High Volume, Low Risk)
(
    '550e8400-e29b-41d4-a716-446655440001',
    'TechCorp Inc',
    '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    'techcorp.com',
    'TC-2024-001',
    'TC-TAX-123456',
    (SELECT ARRAY_AGG(id) FROM payment_rails WHERE rail_type = 'CRYPTO'),
    (SELECT id FROM payment_rails WHERE name = 'USDC_ETH' LIMIT 1),
    '{"preferred_network": "ethereum", "cost_priority": "medium", "speed_priority": "high"}',
    50000.00,
    92.5,
    250000.00,
    0.015,
    true,
    1,
    'ENHANCED',
    0.90,
    25000.00,
    2500.00,
    15000.00,
    1247
),
-- Medium Business (Moderate Volume)
(
    '550e8400-e29b-41d4-a716-446655440002',
    'MidSize Solutions LLC',
    '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    'midsize.biz',
    'MS-2024-002',
    'MS-TAX-789012',
    (SELECT ARRAY_AGG(id) FROM payment_rails WHERE rail_type = 'CRYPTO' AND network IN ('polygon', 'base')),
    (SELECT id FROM payment_rails WHERE name = 'USDC_POLYGON' LIMIT 1),
    '{"preferred_network": "polygon", "cost_priority": "high", "speed_priority": "medium"}',
    15000.00,
    78.3,
    75000.00,
    0.025,
    true,
    2,
    'BASIC',
    1.10,
    10000.00,
    1000.00,
    5000.00,
    423
),
-- Startup (New, Higher Risk)
(
    '550e8400-e29b-41d4-a716-446655440003',
    'StartupX',
    '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    'startupx.io',
    'SX-2024-003',
    'SX-TAX-345678',
    (SELECT ARRAY_AGG(id) FROM payment_rails WHERE name IN ('USDC_BASE', 'USDC_POLYGON')),
    (SELECT id FROM payment_rails WHERE name = 'USDC_BASE' LIMIT 1),
    '{"preferred_network": "base", "cost_priority": "high", "speed_priority": "low"}',
    5000.00,
    65.8,
    12000.00,
    0.045,
    true,
    3,
    'BASIC',
    1.35,
    2500.00,
    500.00,
    2000.00,
    89
);

-- =============================================================================
-- SAMPLE EMPLOYEES
-- =============================================================================

-- TechCorp Employees
INSERT INTO employees (
    id, wallet_address, employer_id, employment_status, start_date, hourly_wage,
    preferred_rail, auto_repay_enabled, kyc_status, risk_score,
    total_advances, total_volume, avg_advance_amount, repayment_rate,
    daily_advance_limit, max_outstanding, current_outstanding
) VALUES
-- Senior Developer
(
    '660e8400-e29b-41d4-a716-446655440001',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1001',
    '550e8400-e29b-41d4-a716-446655440001',
    'ACTIVE',
    '2023-01-15',
    85.00,
    (SELECT id FROM payment_rails WHERE name = 'USDC_ETH' LIMIT 1),
    true,
    'ENHANCED',
    0.75,
    23,
    2875.50,
    125.02,
    0.9565,
    500.00,
    1000.00,
    0.00
),
-- Junior Developer
(
    '660e8400-e29b-41d4-a716-446655440002',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1002',
    '550e8400-e29b-41d4-a716-446655440001',
    'ACTIVE',
    '2024-03-01',
    55.00,
    (SELECT id FROM payment_rails WHERE name = 'USDC_POLYGON' LIMIT 1),
    true,
    'BASIC',
    1.15,
    8,
    720.00,
    90.00,
    1.0000,
    300.00,
    750.00,
    0.00
),
-- Product Manager
(
    '660e8400-e29b-41d4-a716-446655440003',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1003',
    '550e8400-e29b-41d4-a716-446655440001',
    'ACTIVE',
    '2022-08-10',
    95.00,
    (SELECT id FROM payment_rails WHERE name = 'USDC_ETH' LIMIT 1),
    true,
    'ENHANCED',
    0.65,
    35,
    5250.00,
    150.00,
    0.9714,
    600.00,
    1500.00,
    125.00
);

-- MidSize Solutions Employees
INSERT INTO employees (
    id, wallet_address, employer_id, employment_status, start_date, hourly_wage,
    preferred_rail, auto_repay_enabled, kyc_status, risk_score,
    total_advances, total_volume, avg_advance_amount, repayment_rate,
    daily_advance_limit, max_outstanding, current_outstanding
) VALUES
-- Sales Manager
(
    '660e8400-e29b-41d4-a716-446655440004',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b2001',
    '550e8400-e29b-41d4-a716-446655440002',
    'ACTIVE',
    '2023-06-01',
    72.50,
    (SELECT id FROM payment_rails WHERE name = 'USDC_POLYGON' LIMIT 1),
    true,
    'BASIC',
    0.95,
    15,
    1537.50,
    102.50,
    0.9333,
    400.00,
    800.00,
    75.00
),
-- Operations Specialist
(
    '660e8400-e29b-41d4-a716-446655440005',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b2002',
    '550e8400-e29b-41d4-a716-446655440002',
    'ACTIVE',
    '2024-01-20',
    48.00,
    (SELECT id FROM payment_rails WHERE name = 'USDC_BASE' LIMIT 1),
    true,
    'BASIC',
    1.25,
    6,
    420.00,
    70.00,
    1.0000,
    250.00,
    500.00,
    0.00
);

-- StartupX Employees
INSERT INTO employees (
    id, wallet_address, employer_id, employment_status, start_date, hourly_wage,
    preferred_rail, auto_repay_enabled, kyc_status, risk_score,
    total_advances, total_volume, avg_advance_amount, repayment_rate,
    daily_advance_limit, max_outstanding, current_outstanding
) VALUES
-- Founder/CEO
(
    '660e8400-e29b-41d4-a716-446655440006',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b3001',
    '550e8400-e29b-41d4-a716-446655440003',
    'ACTIVE',
    '2024-02-01',
    120.00,
    (SELECT id FROM payment_rails WHERE name = 'USDC_BASE' LIMIT 1),
    true,
    'ENHANCED',
    0.85,
    12,
    1800.00,
    150.00,
    0.9167,
    500.00,
    1200.00,
    200.00
),
-- Full-stack Developer
(
    '660e8400-e29b-41d4-a716-446655440007',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b3002',
    '550e8400-e29b-41d4-a716-446655440003',
    'ACTIVE',
    '2024-04-15',
    68.00,
    (SELECT id FROM payment_rails WHERE name = 'USDC_BASE' LIMIT 1),
    true,
    'BASIC',
    1.05,
    4,
    340.00,
    85.00,
    1.0000,
    300.00,
    600.00,
    85.00
);

-- =============================================================================
-- SAMPLE WAGE ATTESTATIONS
-- =============================================================================

-- Generate realistic attestations for the past month
INSERT INTO wage_attestations (
    id, employer_id, employee_wallet, wage_amount,
    work_period_start, work_period_end,
    attestation_hash, employer_signature, commitment_hash,
    nullifier_hash, nullifier_secret,
    hours_worked, overtime_hours, job_code, department,
    attestation_version, expires_at
) VALUES
-- TechCorp Senior Developer - Recent attestation
(
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1001',
    3400.00, -- 40 hours * $85/hour
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    '0x98765432109876543210987654321098765432109876543210987654321098',
    '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    '0x1111111111111111111111111111111111111111111111111111111111111111',
    40.0,
    0.0,
    'ENG-001',
    'Engineering',
    1,
    NOW() + INTERVAL '30 days'
),
-- TechCorp Junior Developer - Recent attestation
(
    '770e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1002',
    2200.00, -- 40 hours * $55/hour
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    '0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789a',
    '0x234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1',
    '0x87654321098765432109876543210987654321098765432109876543210987',
    '0xedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654322',
    '0x2222222222222222222222222222222222222222222222222222222222222222',
    40.0,
    0.0,
    'ENG-002',
    'Engineering',
    1,
    NOW() + INTERVAL '30 days'
),
-- MidSize Sales Manager - Recent attestation
(
    '770e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440002',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b2001',
    2900.00, -- 40 hours * $72.50/hour
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    '0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890b',
    '0x34567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
    '0x76543210987654321098765432109876543210987654321098765432109876',
    '0xdcba0987654321fedcba0987654321fedcba0987654321fedcba0987654323',
    '0x3333333333333333333333333333333333333333333333333333333333333333',
    40.0,
    0.0,
    'SALES-001',
    'Sales',
    1,
    NOW() + INTERVAL '30 days'
);

-- =============================================================================
-- SAMPLE LIQUIDITY PROVIDER POSITIONS
-- =============================================================================

-- Add some liquidity to pools for testing
UPDATE liquidity_pools
SET
    total_liquidity = 100000.00,
    available_liquidity = 75000.00,
    utilization_rate = 0.25,
    current_apr = 0.10,
    volume_24h = 12500.00,
    volume_7d = 87500.00,
    advance_count = 45,
    avg_advance_size = 138.89
WHERE payment_rail_id = (SELECT id FROM payment_rails WHERE name = 'USDC_ETH' LIMIT 1);

UPDATE liquidity_pools
SET
    total_liquidity = 50000.00,
    available_liquidity = 42000.00,
    utilization_rate = 0.16,
    current_apr = 0.08,
    volume_24h = 8500.00,
    volume_7d = 59500.00,
    advance_count = 67,
    avg_advance_size = 126.87
WHERE payment_rail_id = (SELECT id FROM payment_rails WHERE name = 'USDC_POLYGON' LIMIT 1);

-- Sample LP positions
INSERT INTO lp_positions (
    id, liquidity_pool_id, provider_address,
    lp_tokens, deposited_amount, current_value,
    total_yield_earned, deposit_count, total_deposits,
    auto_compound, avg_apr
) VALUES
-- Major LP in USDC_ETH pool
(
    '880e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM liquidity_pools lp JOIN payment_rails pr ON lp.payment_rail_id = pr.id WHERE pr.name = 'USDC_ETH' LIMIT 1),
    '0x9999999999999999999999999999999999999999',
    75000.000000000000,
    75000.00,
    76875.50,
    1875.50,
    3,
    75000.00,
    true,
    0.095
),
-- Smaller LP in USDC_POLYGON pool
(
    '880e8400-e29b-41d4-a716-446655440002',
    (SELECT id FROM liquidity_pools lp JOIN payment_rails pr ON lp.payment_rail_id = pr.id WHERE pr.name = 'USDC_POLYGON' LIMIT 1),
    '0x8888888888888888888888888888888888888888',
    25000.000000000000,
    25000.00,
    25625.75,
    625.75,
    2,
    25000.00,
    true,
    0.082
);

-- =============================================================================
-- SAMPLE WAGE ADVANCES (Historical)
-- =============================================================================

-- Generate some historical advances for testing
INSERT INTO wage_advances (
    id, employee_wallet, employer_id, payment_rail_id, liquidity_pool_id, attestation_id,
    requested_amount, protocol_fee, gas_fee, liquidity_provider_fee, total_fees, net_amount,
    zkp_proof, public_inputs, nullifier_hash,
    transaction_hash, block_number, gas_used, gas_price_gwei, actual_gas_cost,
    status, due_date, repayment_amount, repaid_amount, outstanding_amount,
    risk_score, processing_time_ms, verification_time_ms,
    created_at, verified_at, disbursed_at, repaid_at
) VALUES
-- TechCorp Senior Developer - Completed advance
(
    '990e8400-e29b-41d4-a716-446655440001',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1001',
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM payment_rails WHERE name = 'USDC_ETH' LIMIT 1),
    (SELECT id FROM liquidity_pools lp JOIN payment_rails pr ON lp.payment_rail_id = pr.id WHERE pr.name = 'USDC_ETH' LIMIT 1),
    '770e8400-e29b-41d4-a716-446655440001',
    200.00, 4.00, 3.50, 2.50, 10.00, 190.00,
    'proof_data_placeholder_groth16_proof_here',
    '{"wage_amount": "3400.00", "employer_commitment": "0x98765432109876543210987654321098765432109876543210987654321098", "nullifier_hash": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"}',
    '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    18500000,
    21000,
    25.5,
    3.47,
    'REPAID',
    NOW() + INTERVAL '14 days',
    200.00,
    200.00,
    0.00,
    0.75,
    8500,
    1200,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days' + INTERVAL '1.2 seconds',
    NOW() - INTERVAL '5 days' + INTERVAL '8.5 seconds',
    NOW() - INTERVAL '1 day'
),
-- TechCorp Junior Developer - Active advance
(
    '990e8400-e29b-41d4-a716-446655440002',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1002',
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM payment_rails WHERE name = 'USDC_POLYGON' LIMIT 1),
    (SELECT id FROM liquidity_pools lp JOIN payment_rails pr ON lp.payment_rail_id = pr.id WHERE pr.name = 'USDC_POLYGON' LIMIT 1),
    '770e8400-e29b-41d4-a716-446655440002',
    150.00, 1.50, 0.02, 1.48, 3.00, 147.00,
    'proof_data_placeholder_groth16_proof_here_2',
    '{"wage_amount": "2200.00", "employer_commitment": "0x87654321098765432109876543210987654321098765432109876543210987", "nullifier_hash": "0xedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654322"}',
    '0xedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654322',
    '0x234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1',
    15200000,
    45000,
    45.0,
    0.02,
    'DISBURSED',
    NOW() + INTERVAL '12 days',
    150.00,
    0.00,
    150.00,
    1.15,
    1250,
    850,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '0.85 seconds',
    NOW() - INTERVAL '2 days' + INTERVAL '1.25 seconds',
    NULL
);

-- =============================================================================
-- SAMPLE NULLIFIERS
-- =============================================================================

INSERT INTO zkp_nullifiers (
    id, nullifier_hash, first_used_at, usage_count, last_used_at,
    advance_id, employee_wallet, employer_id,
    circuit_version, verification_key_hash, block_number
) VALUES
(
    'aa0e8400-e29b-41d4-a716-446655440001',
    '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    NOW() - INTERVAL '5 days',
    1,
    NOW() - INTERVAL '5 days',
    '990e8400-e29b-41d4-a716-446655440001',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1001',
    '550e8400-e29b-41d4-a716-446655440001',
    'v1.0',
    '0x1111111111111111111111111111111111111111111111111111111111111111',
    18500000
),
(
    'aa0e8400-e29b-41d4-a716-446655440002',
    '0xedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654322',
    NOW() - INTERVAL '2 days',
    1,
    NOW() - INTERVAL '2 days',
    '990e8400-e29b-41d4-a716-446655440002',
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1002',
    '550e8400-e29b-41d4-a716-446655440001',
    'v1.0',
    '0x2222222222222222222222222222222222222222222222222222222222222222',
    15200000
);

-- =============================================================================
-- SAMPLE SYSTEM EVENTS
-- =============================================================================

INSERT INTO system_events (
    id, event_type, event_category, severity,
    entity_type, entity_id, event_data, message,
    transaction_hash, block_number, user_address, processing_time_ms
) VALUES
(
    'bb0e8400-e29b-41d4-a716-446655440001',
    'advance_created',
    'TRANSACTION',
    'INFO',
    'advance',
    '990e8400-e29b-41d4-a716-446655440001',
    '{"amount": 200.00, "rail": "USDC_ETH", "processing_time": 8500}',
    'Wage advance created successfully',
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    18500000,
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1001',
    8500
),
(
    'bb0e8400-e29b-41d4-a716-446655440002',
    'zkp_verification_completed',
    'SECURITY',
    'INFO',
    'advance',
    '990e8400-e29b-41d4-a716-446655440001',
    '{"verification_time": 1200, "circuit_version": "v1.0", "valid": true}',
    'ZKP verification completed successfully',
    NULL,
    NULL,
    '0x742d35Cc6634C0532925a3b8F50d4B8d5c9b1001',
    1200
);

-- =============================================================================
-- SAMPLE RISK METRICS
-- =============================================================================

INSERT INTO risk_metrics (
    id, entity_type, entity_id, metric_name, metric_value, metric_unit,
    measurement_period, window_start, window_end,
    threshold_value, threshold_breached, alert_triggered
) VALUES
-- Employee risk metrics
(
    'cc0e8400-e29b-41d4-a716-446655440001',
    'EMPLOYEE',
    '660e8400-e29b-41d4-a716-446655440001',
    'repayment_rate',
    0.9565,
    'percentage',
    '30 days',
    NOW() - INTERVAL '30 days',
    NOW(),
    0.90,
    false,
    false
),
-- Pool utilization metrics
(
    'cc0e8400-e29b-41d4-a716-446655440002',
    'POOL',
    (SELECT id FROM liquidity_pools lp JOIN payment_rails pr ON lp.payment_rail_id = pr.id WHERE pr.name = 'USDC_ETH' LIMIT 1),
    'utilization_rate',
    0.25,
    'percentage',
    '1 hour',
    NOW() - INTERVAL '1 hour',
    NOW(),
    0.85,
    false,
    false
);

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify sample data was inserted correctly
SELECT 'Employers' as table_name, COUNT(*) as record_count FROM employers
UNION ALL
SELECT 'Employees', COUNT(*) FROM employees
UNION ALL
SELECT 'Payment Rails', COUNT(*) FROM payment_rails
UNION ALL
SELECT 'Liquidity Pools', COUNT(*) FROM liquidity_pools
UNION ALL
SELECT 'Wage Attestations', COUNT(*) FROM wage_attestations
UNION ALL
SELECT 'Wage Advances', COUNT(*) FROM wage_advances
UNION ALL
SELECT 'ZKP Nullifiers', COUNT(*) FROM zkp_nullifiers
UNION ALL
SELECT 'System Events', COUNT(*) FROM system_events
UNION ALL
SELECT 'Risk Metrics', COUNT(*) FROM risk_metrics
UNION ALL
SELECT 'LP Positions', COUNT(*) FROM lp_positions
ORDER BY table_name;

-- Performance test query
SELECT
    'Sample data loaded successfully!' as status,
    'Ready for testing and development' as message;