-- Migration 001: Initial Stream Protocol Schema
-- Description: Core tables for multi-rail payment system with USDC/USDT focus
-- Version: 1.0.0
-- Date: 2024-09-20

BEGIN;

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CORE TABLES: Payment Rails & Multi-Rail Architecture
-- =============================================================================

-- Enhanced payment rails with stablecoin-specific features
CREATE TABLE payment_rails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'USDC', 'USDT', 'ACH', 'CARD', 'PAYPAL'
    rail_type TEXT NOT NULL CHECK (rail_type IN ('CRYPTO', 'BANK', 'CARD', 'WALLET')),

    -- Stablecoin-specific fields
    network VARCHAR(50), -- 'ethereum', 'polygon', 'arbitrum', 'base'
    contract_address VARCHAR(42), -- ERC-20 token contract address
    token_decimals INTEGER DEFAULT 6, -- USDC/USDT typically use 6 decimals
    chain_id INTEGER, -- Network chain ID for multi-chain support

    -- Transaction parameters
    min_amount DECIMAL(18,6) NOT NULL,
    max_amount DECIMAL(18,6) NOT NULL,
    daily_limit DECIMAL(18,6), -- Daily transaction limit per user

    -- Fee and cost structure
    fee_structure JSONB NOT NULL, -- Flexible fee configuration
    gas_price_gwei DECIMAL(10,2), -- Current gas price for cost estimation
    block_confirmations INTEGER DEFAULT 12, -- Required confirmations

    -- Performance metrics
    settlement_time_seconds INTEGER NOT NULL,
    success_rate DECIMAL(5,4) DEFAULT 0.99, -- Historical success rate
    avg_gas_cost DECIMAL(18,6), -- Average gas cost in USD

    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,
    last_health_check TIMESTAMP DEFAULT NOW(),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- EMPLOYER REGISTRY: Verified employers with staking and reputation
-- =============================================================================

-- Enhanced employers table with staking and reputation system
CREATE TABLE employers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    public_key VARCHAR(132) NOT NULL UNIQUE, -- EdDSA public key for ZKP verification

    -- Verification and compliance
    domain VARCHAR(255), -- Company domain for verification
    business_registration VARCHAR(100), -- Business registration number
    tax_id VARCHAR(50), -- Tax identification number

    -- Payment rail configuration
    supported_rails UUID[] DEFAULT '{}', -- Array of payment_rails.id
    default_rail UUID REFERENCES payment_rails(id),
    rail_preferences JSONB DEFAULT '{}', -- Rail routing preferences

    -- Staking and reputation system
    stake_amount DECIMAL(18,6) DEFAULT 0, -- USDC staked for reputation
    stake_locked_until TIMESTAMP, -- Stake lock period
    reputation_score DECIMAL(5,2) DEFAULT 0, -- 0-100 reputation score
    total_volume DECIMAL(18,6) DEFAULT 0, -- Total volume processed
    default_rate DECIMAL(5,4) DEFAULT 0, -- Historical default rate

    -- Risk management
    is_verified BOOLEAN DEFAULT false,
    verification_tier INTEGER DEFAULT 1, -- Risk tier 1-5 (1=lowest risk)
    kyc_status TEXT DEFAULT 'NONE' CHECK (kyc_status IN ('NONE', 'BASIC', 'ENHANCED', 'INSTITUTIONAL')),
    risk_multiplier DECIMAL(3,2) DEFAULT 1.00, -- Fee multiplier based on risk

    -- Operational limits
    daily_advance_limit DECIMAL(18,6), -- Max daily advances
    max_advance_amount DECIMAL(18,6), -- Max single advance
    max_outstanding_amount DECIMAL(18,6), -- Max total outstanding

    -- Audit trail
    last_attestation TIMESTAMP, -- Last wage attestation issued
    attestation_count INTEGER DEFAULT 0, -- Total attestations issued

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- EMPLOYEE REGISTRY: Employee wallets and payment preferences
-- =============================================================================

-- Enhanced employees table with comprehensive profile management
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL UNIQUE, -- Primary wallet address

    -- Employment relationship
    employer_id UUID REFERENCES employers(id),
    employment_status TEXT DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED')),
    start_date DATE,
    hourly_wage DECIMAL(8,2), -- For advance calculation limits

    -- Payment preferences
    preferred_rail UUID REFERENCES payment_rails(id),
    backup_rails UUID[] DEFAULT '{}', -- Ordered fallback payment methods
    auto_repay_enabled BOOLEAN DEFAULT true,
    repay_rail_id UUID REFERENCES payment_rails(id), -- Preferred repayment rail

    -- Risk and compliance
    kyc_status TEXT DEFAULT 'NONE' CHECK (kyc_status IN ('NONE', 'BASIC', 'ENHANCED', 'INSTITUTIONAL')),
    risk_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00-5.00 risk multiplier
    fraud_flags JSONB DEFAULT '[]', -- Array of fraud indicators

    -- Usage statistics
    total_advances INTEGER DEFAULT 0,
    total_volume DECIMAL(18,6) DEFAULT 0,
    avg_advance_amount DECIMAL(18,6) DEFAULT 0,
    repayment_rate DECIMAL(5,4) DEFAULT 1.0000, -- Historical repayment rate
    last_advance_date TIMESTAMP,

    -- Limits and restrictions
    daily_advance_limit DECIMAL(18,6) DEFAULT 100.00,
    max_outstanding DECIMAL(18,6) DEFAULT 500.00,
    current_outstanding DECIMAL(18,6) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add initial payment rails data
INSERT INTO payment_rails (
    name, rail_type, network, contract_address, token_decimals, chain_id,
    min_amount, max_amount, daily_limit, fee_structure,
    gas_price_gwei, block_confirmations, settlement_time_seconds,
    success_rate, avg_gas_cost
) VALUES
-- USDC on Ethereum Mainnet
('USDC_ETH', 'CRYPTO', 'ethereum', '0xA0b86a33E6441FEA85a6c6de387d67BF6F372c25', 6, 1,
 1.00, 5000.00, 10000.00,
 '{"type": "flat", "protocol_fee": 2.00, "gas_estimate": 5.00}',
 30.0, 12, 900, 0.995, 5.50),

-- USDT on Ethereum Mainnet
('USDT_ETH', 'CRYPTO', 'ethereum', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 1,
 1.00, 5000.00, 10000.00,
 '{"type": "flat", "protocol_fee": 2.00, "gas_estimate": 6.00}',
 30.0, 12, 900, 0.992, 6.20),

-- USDC on Polygon
('USDC_POLYGON', 'CRYPTO', 'polygon', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 6, 137,
 0.10, 5000.00, 15000.00,
 '{"type": "flat", "protocol_fee": 0.50, "gas_estimate": 0.01}',
 50.0, 3, 30, 0.998, 0.02),

-- USDC on Base
('USDC_BASE', 'CRYPTO', 'base', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6, 8453,
 0.10, 5000.00, 15000.00,
 '{"type": "flat", "protocol_fee": 0.25, "gas_estimate": 0.005}',
 0.01, 1, 5, 0.999, 0.005);

-- Create basic indexes for initial performance
CREATE INDEX idx_employees_wallet ON employees(wallet_address);
CREATE INDEX idx_employers_public_key ON employers(public_key);
CREATE INDEX idx_payment_rails_active ON payment_rails(is_active, rail_type);

COMMIT;