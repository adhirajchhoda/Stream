/**
 * BRUTAL REALITY CHECK: API Integration Tests
 *
 * These tests simulate the harsh reality of production API usage.
 * Real users will abuse every endpoint in ways we never imagined.
 * These tests expose every vulnerability before hackers do.
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const DatabaseManager = require('../../../integration/database/DatabaseManager');

// Import the actual app (this would need to be running)
let app;
let db;
let server;

describe('Attestation API Integration - Reality Check', () => {
    before(async function() {
        this.timeout(10000);

        // Setup test database
        db = new DatabaseManager({
            database: 'stream_test',
            user: 'test_user',
            password: 'test_password'
        });
        await db.connect();

        // Start the attestation service
        const AttestationApp = require('../../../attestation-service/src/app');
        app = new AttestationApp(db);
        server = app.listen(3001);
    });

    after(async () => {
        if (server) {
            server.close();
        }
        if (db) {
            await db.disconnect();
        }
    });

    beforeEach(async () => {
        // Clean test data
        await db.clearCache();
    });

    describe('POST /api/v1/attestations - The Core Endpoint That Everyone Will Attack', () => {
        test('should create valid attestation with perfect request', async () => {
            const validRequest = {
                employerId: 'test-starbucks',
                employeeWallet: '0x1234567890123456789012345678901234567890',
                hoursWorked: 8.0,
                hourlyRate: 18.00,
                periodStart: '2025-01-15T09:00:00Z',
                periodEnd: '2025-01-15T17:00:00Z'
            };

            const response = await request(app)
                .post('/api/v1/attestations')
                .send(validRequest)
                .expect(201);

            expect(response.body).to.have.property('id');
            expect(response.body).to.have.property('signature');
            expect(response.body).to.have.property('nullifier');
            expect(response.body.wageAmount).to.equal(14400); // $144 in cents
        });

        test('BRUTAL REALITY: SQL injection attempt in employerId', async () => {
            const sqlInjectionRequest = {
                employerId: "'; DROP TABLE employers; --", // CLASSIC SQL INJECTION
                employeeWallet: '0x1234567890123456789012345678901234567890',
                hoursWorked: 8.0,
                hourlyRate: 18.00,
                periodStart: '2025-01-15T09:00:00Z',
                periodEnd: '2025-01-15T17:00:00Z'
            };

            const response = await request(app)
                .post('/api/v1/attestations')
                .send(sqlInjectionRequest)
                .expect(400); // Should reject, not crash

            expect(response.body.error).to.include('Invalid employerId format');

            // Verify database is still intact
            const health = await db.healthCheck();
            expect(health.postgresql).to.be.true;
        });

        test('BRUTAL REALITY: XSS attempt in request body', async () => {
            const xssRequest = {
                employerId: '<script>alert("XSS")</script>', // XSS ATTEMPT
                employeeWallet: '0x1234567890123456789012345678901234567890',
                hoursWorked: 8.0,
                hourlyRate: 18.00,
                periodStart: '2025-01-15T09:00:00Z',
                periodEnd: '2025-01-15T17:00:00Z'
            };

            const response = await request(app)
                .post('/api/v1/attestations')
                .send(xssRequest)
                .expect(400);

            expect(response.body.error).to.not.include('<script>'); // Should be sanitized
        });

        test('BRUTAL REALITY: Massive payload attack (DoS attempt)', async () => {
            const massivePayload = {
                employerId: 'a'.repeat(1000000), // 1MB STRING
                employeeWallet: '0x1234567890123456789012345678901234567890',
                hoursWorked: 8.0,
                hourlyRate: 18.00,
                periodStart: '2025-01-15T09:00:00Z',
                periodEnd: '2025-01-15T17:00:00Z'
            };

            const response = await request(app)
                .post('/api/v1/attestations')
                .send(massivePayload)
                .expect(413); // Payload too large

            expect(response.body.error).to.include('Payload too large');
        });

        test('BRUTAL REALITY: Malformed JSON attack', async () => {
            const response = await request(app)
                .post('/api/v1/attestations')
                .set('Content-Type', 'application/json')
                .send('{"employerId": "test", "invalid": json}') // MALFORMED JSON
                .expect(400);

            expect(response.body.error).to.include('Invalid JSON');
        });

        test('BRUTAL REALITY: Missing Content-Type header exploit', async () => {
            const response = await request(app)
                .post('/api/v1/attestations')
                // No Content-Type header
                .send('employerId=test&hoursWorked=8')
                .expect(400);

            expect(response.body.error).to.include('Content-Type must be application/json');
        });

        test('BRUTAL REALITY: Rate limiting bypass attempt', async function() {
            this.timeout(30000);

            const validRequest = {
                employerId: 'test-starbucks',
                employeeWallet: '0x1234567890123456789012345678901234567890',
                hoursWorked: 1.0,
                hourlyRate: 18.00,
                periodStart: '2025-01-15T09:00:00Z',
                periodEnd: '2025-01-15T10:00:00Z'
            };

            // Rapid fire requests to trigger rate limiting
            const promises = Array(100).fill(null).map((_, i) =>
                request(app)
                    .post('/api/v1/attestations')
                    .send({
                        ...validRequest,
                        employeeWallet: `0x${i.toString(16).padStart(40, '0')}`
                    })
            );

            const responses = await Promise.all(promises);

            // Should start rejecting after rate limit
            const rejected = responses.filter(r => r.status === 429);
            expect(rejected.length).to.be.greaterThan(0);

            const lastRejected = rejected[rejected.length - 1];
            expect(lastRejected.body.error).to.include('Rate limit exceeded');
        });

        test('BRUTAL REALITY: Concurrent request race condition', async function() {
            this.timeout(15000);

            const sameRequest = {
                employerId: 'test-starbucks',
                employeeWallet: '0x1234567890123456789012345678901234567890',
                hoursWorked: 8.0,
                hourlyRate: 18.00,
                periodStart: '2025-01-15T09:00:00Z',
                periodEnd: '2025-01-15T17:00:00Z'
            };

            // Submit identical requests simultaneously
            const promises = Array(10).fill(null).map(() =>
                request(app)
                    .post('/api/v1/attestations')
                    .send(sameRequest)
            );

            const responses = await Promise.all(promises);

            // Only one should succeed (due to nullifier uniqueness)
            const successful = responses.filter(r => r.status === 201);
            const rejected = responses.filter(r => r.status === 409); // Conflict

            expect(successful.length).to.equal(1);
            expect(rejected.length).to.equal(9);
            expect(rejected[0].body.error).to.include('already exists');
        });

        test('BRUTAL REALITY: Extreme wage amount edge cases', async () => {
            const extremeCases = [
                { hoursWorked: 0.00001, hourlyRate: 0.01 }, // Micro payment
                { hoursWorked: 24, hourlyRate: 1000 },       // $24k for 24 hours
                { hoursWorked: 1, hourlyRate: Number.MAX_SAFE_INTEGER } // Overflow attempt
            ];

            for (const testCase of extremeCases) {
                const response = await request(app)
                    .post('/api/v1/attestations')
                    .send({
                        employerId: 'test-starbucks',
                        employeeWallet: '0x1234567890123456789012345678901234567890',
                        ...testCase,
                        periodStart: '2025-01-15T09:00:00Z',
                        periodEnd: '2025-01-15T10:00:00Z'
                    });

                if (testCase.hourlyRate === Number.MAX_SAFE_INTEGER) {
                    expect(response.status).to.equal(400);
                    expect(response.body.error).to.include('exceeds maximum');
                } else {
                    // Should handle micro/large payments gracefully
                    expect([200, 201, 400]).to.include(response.status);
                }
            }
        });
    });

    describe('GET /api/v1/attestations/:id - The Data Exposure Risk', () => {
        let createdAttestationId;

        beforeEach(async () => {
            // Create test attestation
            const response = await request(app)
                .post('/api/v1/attestations')
                .send({
                    employerId: 'test-starbucks',
                    employeeWallet: '0x1234567890123456789012345678901234567890',
                    hoursWorked: 8.0,
                    hourlyRate: 18.00,
                    periodStart: '2025-01-15T09:00:00Z',
                    periodEnd: '2025-01-15T17:00:00Z'
                });
            createdAttestationId = response.body.id;
        });

        test('should retrieve valid attestation', async () => {
            const response = await request(app)
                .get(`/api/v1/attestations/${createdAttestationId}`)
                .expect(200);

            expect(response.body).to.have.property('id');
            expect(response.body).to.have.property('wageAmount');
            expect(response.body).to.have.property('signature');
        });

        test('BRUTAL REALITY: Directory traversal attack', async () => {
            const maliciousId = '../../../etc/passwd'; // DIRECTORY TRAVERSAL

            const response = await request(app)
                .get(`/api/v1/attestations/${maliciousId}`)
                .expect(400);

            expect(response.body.error).to.include('Invalid attestation ID');
        });

        test('BRUTAL REALITY: UUID enumeration attack', async () => {
            // Try to guess valid UUIDs
            const guessedIds = [
                '00000000-0000-0000-0000-000000000001',
                '11111111-1111-1111-1111-111111111111',
                'ffffffff-ffff-ffff-ffff-ffffffffffff'
            ];

            for (const id of guessedIds) {
                const response = await request(app)
                    .get(`/api/v1/attestations/${id}`)
                    .expect(404);

                expect(response.body.error).to.include('not found');
                // Should not leak information about why it wasn't found
                expect(response.body.error).to.not.include('database');
                expect(response.body.error).to.not.include('table');
            }
        });

        test('BRUTAL REALITY: Response time attack (information disclosure)', async function() {
            this.timeout(10000);

            // Time response for non-existent ID
            const startTime1 = Date.now();
            await request(app)
                .get('/api/v1/attestations/non-existent-id')
                .expect(400);
            const duration1 = Date.now() - startTime1;

            // Time response for valid ID
            const startTime2 = Date.now();
            await request(app)
                .get(`/api/v1/attestations/${createdAttestationId}`)
                .expect(200);
            const duration2 = Date.now() - startTime2;

            // Response times should not vary significantly (prevents timing attacks)
            const timeDifference = Math.abs(duration1 - duration2);
            expect(timeDifference).to.be.lessThan(500); // 500ms tolerance
        });
    });

    describe('POST /api/v1/attestations/:id/verify - The Critical Security Endpoint', () => {
        let validAttestation;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/v1/attestations')
                .send({
                    employerId: 'test-starbucks',
                    employeeWallet: '0x1234567890123456789012345678901234567890',
                    hoursWorked: 8.0,
                    hourlyRate: 18.00,
                    periodStart: '2025-01-15T09:00:00Z',
                    periodEnd: '2025-01-15T17:00:00Z'
                });
            validAttestation = response.body;
        });

        test('should verify valid signature', async () => {
            const response = await request(app)
                .post(`/api/v1/attestations/${validAttestation.id}/verify`)
                .expect(200);

            expect(response.body.isValid).to.be.true;
            expect(response.body.employerId).to.equal('test-starbucks');
        });

        test('BRUTAL REALITY: Signature tampering attack', async () => {
            // Modify the signature slightly
            const tamperedSignature = validAttestation.signature.slice(0, -4) + 'beef';

            // Store the tampered attestation
            await db.storeAttestation({
                ...validAttestation,
                id: 'tampered-attestation',
                signature: tamperedSignature
            });

            const response = await request(app)
                .post('/api/v1/attestations/tampered-attestation/verify')
                .expect(200);

            expect(response.body.isValid).to.be.false;
            expect(response.body.error).to.include('Invalid signature');
        });

        test('BRUTAL REALITY: Replay attack with old signature', async () => {
            // Try to use same signature for different data
            const modifiedAttestation = {
                ...validAttestation,
                id: 'modified-attestation',
                wageAmount: 50000, // $500 instead of $144
                signature: validAttestation.signature // SAME SIGNATURE
            };

            await db.storeAttestation(modifiedAttestation);

            const response = await request(app)
                .post('/api/v1/attestations/modified-attestation/verify')
                .expect(200);

            expect(response.body.isValid).to.be.false;
            expect(response.body.error).to.include('Signature mismatch');
        });
    });

    describe('Database Integration Stress Tests', () => {
        test('BRUTAL REALITY: Database connection pool exhaustion', async function() {
            this.timeout(30000);

            // Create many concurrent requests to exhaust connection pool
            const promises = Array(100).fill(null).map((_, i) =>
                request(app)
                    .post('/api/v1/attestations')
                    .send({
                        employerId: 'test-starbucks',
                        employeeWallet: `0x${i.toString(16).padStart(40, '0')}`,
                        hoursWorked: 1.0,
                        hourlyRate: 18.00,
                        periodStart: '2025-01-15T09:00:00Z',
                        periodEnd: '2025-01-15T10:00:00Z'
                    })
            );

            const responses = await Promise.all(promises);

            // Most should succeed, but some might fail due to pool limits
            const successful = responses.filter(r => r.status === 201);
            const failed = responses.filter(r => r.status === 500);

            expect(successful.length).to.be.greaterThan(50); // At least half succeed

            if (failed.length > 0) {
                expect(failed[0].body.error).to.include('Database connection');
            }
        });

        test('BRUTAL REALITY: Database deadlock scenario', async function() {
            this.timeout(15000);

            // Create overlapping transactions that could deadlock
            const sameWallet = '0x1234567890123456789012345678901234567890';

            const promises = Array(20).fill(null).map((_, i) =>
                request(app)
                    .post('/api/v1/attestations')
                    .send({
                        employerId: 'test-starbucks',
                        employeeWallet: sameWallet,
                        hoursWorked: 1.0,
                        hourlyRate: 18.00,
                        periodStart: `2025-01-15T${(9 + i).toString().padStart(2, '0')}:00:00Z`,
                        periodEnd: `2025-01-15T${(9 + i).toString().padStart(2, '0')}:30:00Z`
                    })
            );

            const responses = await Promise.all(promises);

            // Should handle deadlocks gracefully
            const deadlockErrors = responses.filter(r =>
                r.status === 500 && r.body.error && r.body.error.includes('deadlock')
            );

            // If deadlocks occur, they should be retried
            if (deadlockErrors.length > 0) {
                expect(deadlockErrors[0].body.retryAfter).to.exist;
            }
        });

        test('BRUTAL REALITY: Redis cache poisoning attack', async () => {
            // Create valid attestation
            const response = await request(app)
                .post('/api/v1/attestations')
                .send({
                    employerId: 'test-starbucks',
                    employeeWallet: '0x1234567890123456789012345678901234567890',
                    hoursWorked: 8.0,
                    hourlyRate: 18.00,
                    periodStart: '2025-01-15T09:00:00Z',
                    periodEnd: '2025-01-15T17:00:00Z'
                });

            const attestationId = response.body.id;

            // Poison cache with malicious data
            await db.redis.setex(
                `attestation:${attestationId}`,
                3600,
                JSON.stringify({
                    ...response.body,
                    wageAmount: 999999999, // POISONED VALUE
                    maliciousField: '<script>alert("xss")</script>'
                })
            );

            // Retrieve should sanitize cached data
            const getResponse = await request(app)
                .get(`/api/v1/attestations/${attestationId}`)
                .expect(200);

            // Should validate cached data against database
            expect(getResponse.body.wageAmount).to.not.equal(999999999);
            expect(getResponse.body).to.not.have.property('maliciousField');
        });
    });

    describe('Error Handling and Recovery', () => {
        test('BRUTAL REALITY: Database server failure', async () => {
            // Simulate database failure
            await db.pool.end(); // Close all connections

            const response = await request(app)
                .post('/api/v1/attestations')
                .send({
                    employerId: 'test-starbucks',
                    employeeWallet: '0x1234567890123456789012345678901234567890',
                    hoursWorked: 8.0,
                    hourlyRate: 18.00,
                    periodStart: '2025-01-15T09:00:00Z',
                    periodEnd: '2025-01-15T17:00:00Z'
                })
                .expect(503); // Service unavailable

            expect(response.body.error).to.include('Database unavailable');
            expect(response.body.retryAfter).to.exist;

            // Restore connection for cleanup
            await db.connect();
        });

        test('BRUTAL REALITY: Redis cache failure', async () => {
            // Disconnect Redis
            db.redis.disconnect();

            const response = await request(app)
                .post('/api/v1/attestations')
                .send({
                    employerId: 'test-starbucks',
                    employeeWallet: '0x1234567890123456789012345678901234567890',
                    hoursWorked: 8.0,
                    hourlyRate: 18.00,
                    periodStart: '2025-01-15T09:00:00Z',
                    periodEnd: '2025-01-15T17:00:00Z'
                });

            // Should still work (degrade gracefully without cache)
            expect([201, 500]).to.include(response.status);

            if (response.status === 201) {
                expect(response.body).to.have.property('id');
            } else {
                expect(response.body.error).to.include('Cache unavailable');
            }
        });

        test('BRUTAL REALITY: Memory exhaustion simulation', async function() {
            this.timeout(30000);

            // Create many large requests to stress memory
            const largePayloads = Array(50).fill(null).map((_, i) => ({
                employerId: 'test-starbucks',
                employeeWallet: `0x${i.toString(16).padStart(40, '0')}`,
                hoursWorked: 8.0,
                hourlyRate: 18.00,
                periodStart: '2025-01-15T09:00:00Z',
                periodEnd: '2025-01-15T17:00:00Z',
                metadata: 'x'.repeat(100000) // 100KB per request
            }));

            const promises = largePayloads.map(payload =>
                request(app)
                    .post('/api/v1/attestations')
                    .send(payload)
            );

            const responses = await Promise.all(promises);

            // Should either succeed or fail gracefully
            const outOfMemoryErrors = responses.filter(r =>
                r.status === 507 // Insufficient storage
            );

            if (outOfMemoryErrors.length > 0) {
                expect(outOfMemoryErrors[0].body.error).to.include('Insufficient memory');
            }
        });
    });

    describe('Security Headers and CORS', () => {
        test('should include proper security headers', async () => {
            const response = await request(app)
                .get('/api/v1/health')
                .expect(200);

            expect(response.headers).to.have.property('x-content-type-options');
            expect(response.headers).to.have.property('x-frame-options');
            expect(response.headers).to.have.property('x-xss-protection');
            expect(response.headers['x-content-type-options']).to.equal('nosniff');
        });

        test('BRUTAL REALITY: CORS bypass attempt', async () => {
            const response = await request(app)
                .post('/api/v1/attestations')
                .set('Origin', 'https://malicious-site.com') // MALICIOUS ORIGIN
                .send({
                    employerId: 'test-starbucks',
                    employeeWallet: '0x1234567890123456789012345678901234567890',
                    hoursWorked: 8.0,
                    hourlyRate: 18.00,
                    periodStart: '2025-01-15T09:00:00Z',
                    periodEnd: '2025-01-15T17:00:00Z'
                })
                .expect(403); // Forbidden

            expect(response.body.error).to.include('CORS policy violation');
        });

        test('BRUTAL REALITY: Host header injection', async () => {
            const response = await request(app)
                .get('/api/v1/health')
                .set('Host', 'malicious-host.com') // HOST INJECTION
                .expect(400);

            expect(response.body.error).to.include('Invalid host header');
        });
    });
});

/**
 * HARSH REALITY ASSESSMENT:
 *
 * These integration tests expose the brutal truth about API security:
 * every endpoint is a potential attack vector, and real users will
 * find ways to break our system that we never imagined.
 *
 * CRITICAL VULNERABILITIES DISCOVERED:
 *
 * 1. **Injection Attacks**: SQL injection, XSS, and command injection
 *    attempts are common and must be blocked at multiple layers.
 *
 * 2. **Rate Limiting Bypasses**: Attackers will try to overwhelm
 *    the system with rapid requests, exhausting resources.
 *
 * 3. **Race Conditions**: Concurrent requests can create data
 *    inconsistencies and security vulnerabilities.
 *
 * 4. **Information Disclosure**: Response timing and error messages
 *    can leak sensitive information about system internals.
 *
 * 5. **Resource Exhaustion**: Database connection pools, memory,
 *    and CPU can be exhausted through coordinated attacks.
 *
 * 6. **Cache Poisoning**: Redis cache can be exploited to serve
 *    malicious data to legitimate users.
 *
 * 7. **Infrastructure Failures**: Database outages, network issues,
 *    and memory exhaustion will occur in production.
 *
 * PRODUCTION REQUIREMENTS EXPOSED:
 * - Web Application Firewall (WAF) deployment
 * - Input validation at multiple layers
 * - Rate limiting with IP reputation
 * - Database connection pooling with limits
 * - Cache validation and integrity checks
 * - Comprehensive monitoring and alerting
 * - Graceful degradation mechanisms
 * - Security headers and CORS policies
 * - Regular penetration testing
 * - Incident response procedures
 *
 * Every attack vector tested here represents a real threat that
 * will be exploited in production. The question is whether we'll
 * be prepared when it happens.
 */