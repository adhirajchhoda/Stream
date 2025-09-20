/**
 * Database Manager for Stream Protocol Integration
 *
 * Handles PostgreSQL and Redis operations for the integration layer
 */

const { Pool } = require('pg');
const Redis = require('ioredis');
const chalk = require('chalk');

class DatabaseManager {
    constructor(config = {}) {
        this.pgConfig = {
            host: config.host || process.env.DB_HOST || 'localhost',
            port: config.port || process.env.DB_PORT || 5432,
            database: config.database || process.env.DB_NAME || 'stream_protocol',
            user: config.user || process.env.DB_USER || 'stream_user',
            password: config.password || process.env.DB_PASSWORD || 'stream_password',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

        this.redisConfig = {
            host: config.redisHost || process.env.REDIS_HOST || 'localhost',
            port: config.redisPort || process.env.REDIS_PORT || 6379,
            password: config.redisPassword || process.env.REDIS_PASSWORD,
            db: config.redisDb || 0,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
        };

        this.pool = null;
        this.redis = null;
        this.connected = false;
    }

    async connect() {
        try {
            // Connect to PostgreSQL
            this.pool = new Pool(this.pgConfig);

            // Test PostgreSQL connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            // Connect to Redis
            this.redis = new Redis(this.redisConfig);

            // Test Redis connection
            await this.redis.ping();

            this.connected = true;
            console.log(chalk.green('✅ Database connections established'));
        } catch (error) {
            console.error(chalk.red('❌ Database connection failed:'), error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
        }
        if (this.redis) {
            this.redis.disconnect();
        }
        this.connected = false;
    }

    // Attestation Management
    async storeAttestation(attestation) {
        const query = `
            INSERT INTO wage_attestations (
                id, employer_id, employee_address, wage_amount, period_start, period_end,
                hours_worked, hourly_rate, period_nonce, signature, nullifier, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;

        const values = [
            attestation.id,
            attestation.employerId,
            attestation.employeeWallet,
            attestation.wageAmount,
            attestation.periodStart,
            attestation.periodEnd,
            attestation.hoursWorked,
            attestation.hourlyRate,
            attestation.periodNonce,
            attestation.signature,
            attestation.nullifier,
            'pending',
            new Date()
        ];

        try {
            const result = await this.pool.query(query, values);

            // Cache in Redis for fast access
            await this.redis.setex(
                `attestation:${attestation.id}`,
                3600, // 1 hour TTL
                JSON.stringify(attestation)
            );

            return result.rows[0].id;
        } catch (error) {
            console.error('Error storing attestation:', error);
            throw error;
        }
    }

    async getAttestation(attestationId) {
        // Try Redis first
        const cached = await this.redis.get(`attestation:${attestationId}`);
        if (cached) {
            return JSON.parse(cached);
        }

        // Fallback to PostgreSQL
        const query = 'SELECT * FROM wage_attestations WHERE id = $1';
        const result = await this.pool.query(query, [attestationId]);

        if (result.rows.length === 0) {
            return null;
        }

        const attestation = result.rows[0];

        // Cache for future requests
        await this.redis.setex(
            `attestation:${attestationId}`,
            3600,
            JSON.stringify(attestation)
        );

        return attestation;
    }

    async getAvailableAttestations() {
        const query = `
            SELECT * FROM wage_attestations
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 10
        `;

        const result = await this.pool.query(query);
        return result.rows;
    }

    async markAttestationClaimed(attestationId, transactionHash) {
        const query = `
            UPDATE wage_attestations
            SET status = 'claimed', claimed_at = $1, transaction_hash = $2
            WHERE id = $3
        `;

        await this.pool.query(query, [new Date(), transactionHash, attestationId]);

        // Update cache
        await this.redis.del(`attestation:${attestationId}`);
    }

    // Proof Management
    async storeProofSubmission(proofData) {
        const query = `
            INSERT INTO proof_submissions (
                id, attestation_id, proof_hash, public_inputs, verification_tx,
                claimed_amount, gas_used, submitted_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;

        const values = [
            proofData.id,
            proofData.attestationId,
            proofData.proofHash,
            JSON.stringify(proofData.publicInputs),
            proofData.transactionHash,
            proofData.claimedAmount,
            proofData.gasUsed,
            new Date()
        ];

        const result = await this.pool.query(query, values);
        return result.rows[0].id;
    }

    // Nullifier Management
    async checkNullifier(nullifierHash) {
        // Check Redis first (fastest)
        const exists = await this.redis.exists(`nullifier:${nullifierHash}`);
        if (exists) {
            return true;
        }

        // Check PostgreSQL
        const query = 'SELECT COUNT(*) FROM wage_attestations WHERE nullifier = $1 AND status = \'claimed\'';
        const result = await this.pool.query(query, [nullifierHash]);

        const isUsed = parseInt(result.rows[0].count) > 0;

        if (isUsed) {
            // Cache for fast future lookups
            await this.redis.setex(`nullifier:${nullifierHash}`, 86400, '1'); // 24 hours
        }

        return isUsed;
    }

    async markNullifierUsed(nullifierHash) {
        // Store in Redis immediately
        await this.redis.setex(`nullifier:${nullifierHash}`, 86400, '1');
    }

    // Employer Management
    async getEmployer(employerId) {
        const cacheKey = `employer:${employerId}`;

        // Try Redis first
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Fallback to PostgreSQL
        const query = 'SELECT * FROM employers WHERE id = $1';
        const result = await this.pool.query(query, [employerId]);

        if (result.rows.length === 0) {
            return null;
        }

        const employer = result.rows[0];

        // Cache for 5 minutes
        await this.redis.setex(cacheKey, 300, JSON.stringify(employer));

        return employer;
    }

    async registerEmployer(employerData) {
        const query = `
            INSERT INTO employers (
                id, name, public_key, verification_level, stake_amount,
                reputation_score, whitelisted_at, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;

        const values = [
            employerData.id,
            employerData.name,
            employerData.publicKey,
            employerData.verificationLevel || 'basic',
            employerData.stakeAmount || 0,
            employerData.reputationScore || 100,
            new Date(),
            JSON.stringify(employerData.metadata || {})
        ];

        const result = await this.pool.query(query, values);

        // Cache the new employer
        await this.redis.setex(
            `employer:${employerData.id}`,
            300,
            JSON.stringify(employerData)
        );

        return result.rows[0].id;
    }

    // Statistics and Analytics
    async getSystemStats() {
        const stats = {};

        // Get employer stats
        const employerQuery = `
            SELECT
                COUNT(*) as total_employers,
                SUM(stake_amount) as total_stake,
                AVG(reputation_score) as avg_reputation
            FROM employers
        `;
        const employerResult = await this.pool.query(employerQuery);
        stats.totalEmployers = parseInt(employerResult.rows[0].total_employers);
        stats.totalStake = parseFloat(employerResult.rows[0].total_stake || 0);
        stats.avgReputation = parseFloat(employerResult.rows[0].avg_reputation || 0);

        // Get transaction stats
        const transactionQuery = `
            SELECT
                COUNT(*) as total_attestations,
                COUNT(CASE WHEN status = 'claimed' THEN 1 END) as total_proofs,
                SUM(CASE WHEN status = 'claimed' THEN wage_amount ELSE 0 END) as total_volume
            FROM wage_attestations
        `;
        const transactionResult = await this.pool.query(transactionQuery);
        stats.totalAttestations = parseInt(transactionResult.rows[0].total_attestations);
        stats.totalProofs = parseInt(transactionResult.rows[0].total_proofs);
        stats.totalVolume = parseFloat(transactionResult.rows[0].total_volume || 0) / 100; // Convert cents to dollars

        // Get liquidity stats (mock for demo)
        stats.totalLiquidity = 50000; // Mock value
        stats.utilization = Math.min(95, (stats.totalVolume / stats.totalLiquidity) * 100);
        stats.currentAPR = 8.5 + (stats.utilization * 0.15); // Dynamic APR

        return stats;
    }

    // Performance Analytics
    async logPerformanceMetric(operation, duration, metadata = {}) {
        const metric = {
            operation,
            duration,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        // Store in Redis with TTL for performance monitoring
        await this.redis.lpush('performance:metrics', JSON.stringify(metric));
        await this.redis.ltrim('performance:metrics', 0, 999); // Keep last 1000 metrics
        await this.redis.expire('performance:metrics', 3600); // 1 hour TTL
    }

    async getPerformanceMetrics(operation = null, limit = 100) {
        const metrics = await this.redis.lrange('performance:metrics', 0, limit - 1);
        const parsed = metrics.map(m => JSON.parse(m));

        if (operation) {
            return parsed.filter(m => m.operation === operation);
        }

        return parsed;
    }

    // Health Check
    async healthCheck() {
        const health = {
            postgresql: false,
            redis: false,
            timestamp: new Date().toISOString()
        };

        try {
            await this.pool.query('SELECT 1');
            health.postgresql = true;
        } catch (error) {
            console.error('PostgreSQL health check failed:', error.message);
        }

        try {
            await this.redis.ping();
            health.redis = true;
        } catch (error) {
            console.error('Redis health check failed:', error.message);
        }

        return health;
    }

    // Rate Limiting
    async checkRateLimit(identifier, limit = 10, window = 60) {
        const key = `rate_limit:${identifier}`;
        const current = await this.redis.incr(key);

        if (current === 1) {
            await this.redis.expire(key, window);
        }

        return {
            allowed: current <= limit,
            current,
            limit,
            resetTime: await this.redis.ttl(key)
        };
    }

    // Cache Management
    async clearCache(pattern = null) {
        if (pattern) {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            return keys.length;
        } else {
            await this.redis.flushdb();
            return 'all';
        }
    }
}

module.exports = DatabaseManager;