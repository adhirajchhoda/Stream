# Redis Cache Strategy for Stream Protocol
## Sub-50ms Performance Optimization with Stablecoin Focus

### OVERVIEW

This document outlines the comprehensive Redis caching strategy designed to achieve sub-50ms p99 query performance for the Stream Protocol's multi-rail payment system with primary focus on USDC/USDT operations.

### CACHE ARCHITECTURE

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │   Redis Cache    │    │   PostgreSQL    │
│     Layer       │◄──►│     Layer        │◄──►│    Database     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Cache Patterns  │
                    │                  │
                    │ • Hot Data       │
                    │ • Session State  │
                    │ • Rate Limiting  │
                    │ • Real-time Metrics │
                    └──────────────────┘
```

---

## CORE CACHE PATTERNS

### 1. Employee & Employer Lookups (Highest Priority)

**Key Patterns:**
```redis
# Employee data (TTL: 300 seconds)
employee:{wallet_address} = {
  "id": "uuid",
  "employer_id": "uuid",
  "preferred_rail": "uuid",
  "risk_score": 1.25,
  "daily_limit": 100.00,
  "current_outstanding": 45.50,
  "last_advance": "2024-09-20T10:30:00Z"
}

# Employer data (TTL: 600 seconds)
employer:{id} = {
  "name": "Acme Corp",
  "public_key": "0x...",
  "is_verified": true,
  "verification_tier": 2,
  "stake_amount": 10000.00,
  "reputation_score": 87.5,
  "default_rail": "uuid"
}

# Quick employer lookup by public key (TTL: 600 seconds)
employer:pubkey:{public_key} = "employer_id"
```

**Performance Target:** < 5ms for employee/employer lookups

### 2. Payment Rail Configuration (High Priority)

**Key Patterns:**
```redis
# Active rails only (TTL: 900 seconds)
rails:active = [
  {
    "id": "uuid",
    "name": "USDC_ETH",
    "network": "ethereum",
    "contract_address": "0xA0b86a33E6441FEA85a6c6de387d67BF6F372c25",
    "min_amount": 1.00,
    "max_amount": 5000.00,
    "gas_price_gwei": 30.0,
    "success_rate": 0.995,
    "avg_gas_cost": 5.50
  }
]

# Rail-specific configuration (TTL: 900 seconds)
rail:{rail_id} = {
  "fee_structure": {"type": "flat", "protocol_fee": 2.00, "gas_estimate": 5.00},
  "settlement_time": 900,
  "block_confirmations": 12,
  "is_active": true,
  "maintenance_mode": false
}

# Network gas prices (TTL: 60 seconds - frequently updated)
gas:ethereum = {
  "slow": 25.0,
  "standard": 30.0,
  "fast": 40.0,
  "updated_at": "2024-09-20T10:30:00Z"
}
```

### 3. Liquidity Pool Data (High Priority)

**Key Patterns:**
```redis
# Pool status (TTL: 120 seconds)
pool:{rail_id} = {
  "available_liquidity": 150000.50,
  "utilization_rate": 0.65,
  "current_apr": 0.12,
  "total_advances_issued": 1250000.00,
  "default_rate": 0.025,
  "is_active": true
}

# Pool performance metrics (TTL: 300 seconds)
pool:metrics:{rail_id} = {
  "volume_24h": 25000.00,
  "volume_7d": 175000.00,
  "avg_advance_size": 125.50,
  "active_providers": 45,
  "last_updated": "2024-09-20T10:30:00Z"
}

# Quick liquidity check (TTL: 60 seconds)
liquidity:available:{rail_id} = "150000.50"
```

### 4. ZKP Nullifier System (Critical Priority)

**Key Patterns:**
```redis
# Nullifier tracking (TTL: Never expires - permanent)
nullifier:{hash} = {
  "used": true,
  "advance_id": "uuid",
  "employee_wallet": "0x...",
  "first_used_at": "2024-09-20T10:30:00Z",
  "block_number": 18500000
}

# Fast nullifier existence check
nullifier:exists = SET("hash1", "hash2", "hash3", ...)

# Recent nullifiers for velocity checking (TTL: 3600 seconds)
nullifier:recent:{employee_wallet} = ZSET {
  "hash1": timestamp1,
  "hash2": timestamp2
}
```

**Performance Target:** < 1ms for nullifier checks (critical for double-spend prevention)

### 5. Real-time Rate Limiting (Critical Priority)

**Key Patterns:**
```redis
# Employee rate limiting (TTL: 3600 seconds)
rate:employee:{wallet_address} = {
  "requests_1h": 5,
  "volume_24h": 250.00,
  "last_advance": "2024-09-20T10:30:00Z",
  "blocked_until": null
}

# Employer rate limiting (TTL: 3600 seconds)
rate:employer:{employer_id} = {
  "attestations_1h": 25,
  "volume_24h": 5000.00,
  "employees_active": 12
}

# Global rate limiting (TTL: 3600 seconds)
rate:global = {
  "advances_1h": 150,
  "total_volume_1h": 18750.00,
  "avg_processing_time": 1250
}
```

### 6. Advance Status Tracking (High Priority)

**Key Patterns:**
```redis
# Active advances per employee (TTL: Dynamic based on due_date)
advances:active:{wallet_address} = [
  {
    "id": "uuid",
    "amount": 100.00,
    "status": "DISBURSED",
    "due_date": "2024-09-22T10:30:00Z",
    "rail": "USDC_ETH"
  }
]

# Advance routing cache (TTL: 300 seconds)
routing:{advance_id} = {
  "selected_rail": "uuid",
  "estimated_cost": 7.50,
  "estimated_time": 900,
  "fallback_rails": ["uuid1", "uuid2"],
  "reason": "cost_optimization"
}

# Due advances monitoring (TTL: Dynamic)
advances:due:today = ZSET {
  "advance_id1": due_timestamp1,
  "advance_id2": due_timestamp2
}
```

---

## CACHE INVALIDATION STRATEGIES

### 1. Time-Based TTL
```redis
# Short TTL for volatile data
gas:prices:* = 60 seconds
liquidity:available:* = 60 seconds
rate:* = 3600 seconds

# Medium TTL for semi-static data
employee:* = 300 seconds
pool:* = 300 seconds
routing:* = 300 seconds

# Long TTL for stable data
employer:* = 600 seconds
rails:* = 900 seconds
```

### 2. Event-Based Invalidation
```javascript
// Example: When advance is created
function onAdvanceCreated(advance) {
  // Invalidate employee cache
  redis.del(`employee:${advance.employee_wallet}`);

  // Update liquidity cache
  redis.del(`pool:${advance.payment_rail_id}`);
  redis.del(`liquidity:available:${advance.payment_rail_id}`);

  // Update rate limiting
  redis.hincrby(`rate:employee:${advance.employee_wallet}`, 'requests_1h', 1);
  redis.hincrbyfloat(`rate:employee:${advance.employee_wallet}`, 'volume_24h', advance.net_amount);
}
```

### 3. Write-Through Pattern
```javascript
// Update database and cache simultaneously
async function updateEmployeeRiskScore(walletAddress, newScore) {
  // Update database
  await db.query('UPDATE employees SET risk_score = $1 WHERE wallet_address = $2',
                 [newScore, walletAddress]);

  // Update cache
  const employee = await redis.hget(`employee:${walletAddress}`);
  if (employee) {
    const data = JSON.parse(employee);
    data.risk_score = newScore;
    await redis.setex(`employee:${walletAddress}`, 300, JSON.stringify(data));
  }
}
```

---

## PERFORMANCE OPTIMIZATIONS

### 1. Connection Pooling
```javascript
const redis = new Redis.Cluster([
  { host: 'redis-1.stream.internal', port: 6379 },
  { host: 'redis-2.stream.internal', port: 6379 },
  { host: 'redis-3.stream.internal', port: 6379 }
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    connectTimeout: 1000,
    commandTimeout: 5000,
    lazyConnect: true
  },
  natMap: {
    // Production cluster mapping
  }
});
```

### 2. Pipeline Operations
```javascript
// Batch multiple cache operations
async function loadEmployeeAdvanceData(walletAddress) {
  const pipeline = redis.pipeline();

  pipeline.get(`employee:${walletAddress}`);
  pipeline.lrange(`advances:active:${walletAddress}`, 0, -1);
  pipeline.hgetall(`rate:employee:${walletAddress}`);
  pipeline.zscore('nullifier:recent', walletAddress);

  const results = await pipeline.exec();

  return {
    employee: JSON.parse(results[0][1]),
    activeAdvances: results[1][1].map(JSON.parse),
    rateLimit: results[2][1],
    recentActivity: results[3][1]
  };
}
```

### 3. Compression for Large Objects
```javascript
const LZ4 = require('lz4');

// Compress large pool data
function cachePoolMetrics(railId, metrics) {
  const compressed = LZ4.encode(JSON.stringify(metrics));
  return redis.setex(`pool:metrics:${railId}:compressed`, 300, compressed);
}

function getCachedPoolMetrics(railId) {
  return redis.get(`pool:metrics:${railId}:compressed`).then(compressed => {
    if (!compressed) return null;
    const decompressed = LZ4.decode(compressed);
    return JSON.parse(decompressed.toString());
  });
}
```

---

## MONITORING AND METRICS

### 1. Cache Hit Rate Monitoring
```redis
# Track cache performance
cache:stats:employee:hits = COUNTER
cache:stats:employee:misses = COUNTER
cache:stats:pool:hits = COUNTER
cache:stats:pool:misses = COUNTER

# Performance monitoring
cache:response_time:p50 = 2.5  # milliseconds
cache:response_time:p95 = 8.0
cache:response_time:p99 = 15.0
```

### 2. Memory Usage Optimization
```redis
# Memory usage by pattern
memory:usage:employee:* = ~50MB
memory:usage:pool:* = ~25MB
memory:usage:nullifier:* = ~100MB
memory:usage:rate:* = ~10MB

# Target: < 500MB total Redis memory usage
```

### 3. Error Handling and Fallback
```javascript
async function getCachedEmployee(walletAddress) {
  try {
    // Try cache first
    const cached = await redis.get(`employee:${walletAddress}`);
    if (cached) {
      metrics.increment('cache.employee.hit');
      return JSON.parse(cached);
    }

    metrics.increment('cache.employee.miss');

    // Fallback to database
    const employee = await db.query(
      'SELECT * FROM employees WHERE wallet_address = $1',
      [walletAddress]
    );

    // Cache for next time (fire and forget)
    redis.setex(`employee:${walletAddress}`, 300, JSON.stringify(employee))
      .catch(err => logger.warn('Cache write failed:', err));

    return employee;

  } catch (error) {
    logger.error('Cache error:', error);
    // Always fallback to database
    return db.query('SELECT * FROM employees WHERE wallet_address = $1', [walletAddress]);
  }
}
```

---

## SECURITY CONSIDERATIONS

### 1. Data Encryption
```javascript
const crypto = require('crypto');

// Encrypt sensitive data before caching
function encryptCacheData(data) {
  const cipher = crypto.createCipher('aes-256-gcm', process.env.CACHE_ENCRYPTION_KEY);
  return cipher.update(JSON.stringify(data), 'utf8', 'hex') + cipher.final('hex');
}

// Example: Encrypt employer data
redis.setex(`employer:${id}:encrypted`, 600, encryptCacheData(employerData));
```

### 2. Access Control
```redis
# Use Redis AUTH and ACLs
AUTH redis_stream_password

# Limited user permissions
ACL SETUSER stream_api +@read +@write -@dangerous ~employee:* ~pool:* ~rails:*
```

### 3. Network Security
```javascript
// TLS encryption for Redis connections
const redis = new Redis({
  host: 'redis.stream.internal',
  port: 6380,
  tls: {
    cert: fs.readFileSync('client-cert.pem'),
    key: fs.readFileSync('client-key.pem'),
    ca: fs.readFileSync('ca-cert.pem'),
    servername: 'redis.stream.internal'
  }
});
```

---

## DEPLOYMENT CONFIGURATION

### 1. Redis Cluster Setup
```bash
# Redis cluster configuration
cluster-enabled yes
cluster-config-file nodes-6379.conf
cluster-node-timeout 15000
cluster-announce-ip 10.0.1.10
cluster-announce-port 6379

# Memory optimization
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 2. High Availability
```yaml
# docker-compose.yml
version: '3.8'
services:
  redis-primary:
    image: redis:7-alpine
    command: redis-server --appendonly yes --cluster-enabled yes
    volumes:
      - redis-primary-data:/data
    networks:
      - stream-internal

  redis-replica-1:
    image: redis:7-alpine
    command: redis-server --replicaof redis-primary 6379
    depends_on:
      - redis-primary
    networks:
      - stream-internal

  redis-replica-2:
    image: redis:7-alpine
    command: redis-server --replicaof redis-primary 6379
    depends_on:
      - redis-primary
    networks:
      - stream-internal
```

### 3. Monitoring and Alerting
```yaml
# Prometheus monitoring
- name: redis_cache_performance
  rules:
    - alert: CacheHitRateLow
      expr: redis_cache_hit_rate < 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Cache hit rate below 80%"

    - alert: CacheResponseTimeSlow
      expr: redis_response_time_p99 > 20
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Cache response time p99 > 20ms"
```

---

## EXPECTED PERFORMANCE GAINS

### Before Caching (Database Only)
- Employee lookup: 25-50ms
- Payment rail lookup: 15-30ms
- Liquidity check: 20-40ms
- Total request time: 60-120ms

### After Caching (Optimized)
- Employee lookup: 2-5ms
- Payment rail lookup: 1-3ms
- Liquidity check: 1-2ms
- **Total request time: 5-15ms (Target: <50ms p99)**

### Cache Hit Rate Targets
- Employee data: >90%
- Payment rails: >95%
- Liquidity data: >85%
- Nullifier checks: >99%

This Redis caching strategy is designed to achieve the Stream Protocol's performance targets while maintaining data consistency and system reliability for high-volume stablecoin transactions.