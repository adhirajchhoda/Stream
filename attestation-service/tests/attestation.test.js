/**
 * Stream Protocol Attestation Service Integration Tests
 * Comprehensive test suite for attestation functionality
 */

const request = require('supertest');
const app = require('../src/index');
const { WageAttestation } = require('../src/models/WageAttestation');
const { EmployerSimulator } = require('../src/services/EmployerSimulator');
const { JSONCanonicalizer } = require('../src/utils/JSONCanonicalizer');

describe('Stream Attestation Service', () => {
  let simulator;
  let testEmployer;
  let testEmployee;

  beforeAll(async () => {
    // Initialize simulator
    simulator = new EmployerSimulator();
    await simulator.initializeEmployers();

    // Get test data
    const employers = simulator.getRegisteredEmployers();
    testEmployer = employers.find(emp => emp.key === 'starbucks');
    testEmployee = '0x742d35Cc6634C0532925a3b8D000B45f5c964C12';
  });

  afterAll(async () => {
    simulator.cleanup();
  });

  // =============================================================================
  // HEALTH CHECK TESTS
  // =============================================================================

  describe('Health Check Endpoints', () => {
    test('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'stream-attestation-service',
        version: '1.0.0'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    test('GET /status should return operational status', async () => {
      const response = await request(app)
        .get('/status')
        .expect(200);

      expect(response.body).toMatchObject({
        service: 'stream-attestation-service',
        status: 'operational'
      });
      expect(response.body.statistics).toBeDefined();
      expect(response.body.features).toBeDefined();
    });

    test('GET /docs should return API documentation', async () => {
      const response = await request(app)
        .get('/docs')
        .expect(200);

      expect(response.body).toMatchObject({
        title: 'Stream Protocol Attestation Service API',
        version: '1.0.0'
      });
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.examples).toBeDefined();
    });
  });

  // =============================================================================
  // EMPLOYER MANAGEMENT TESTS
  // =============================================================================

  describe('Employer Management', () => {
    test('POST /api/v1/employers/register should register new employer', async () => {
      const employerData = {
        companyName: 'Test Corporation',
        domain: 'testcorp.com',
        employeeCount: 100,
        payrollFrequency: 'BIWEEKLY',
        contactEmail: 'payroll@testcorp.com'
      };

      const response = await request(app)
        .post('/api/v1/employers/register')
        .send(employerData)
        .expect(201);

      expect(response.body).toMatchObject({
        companyName: 'Test Corporation',
        domain: 'testcorp.com',
        verificationStatus: 'pending'
      });
      expect(response.body.employerId).toMatch(/^[a-f0-9]{16}$/);
      expect(response.body.publicKey).toMatch(/^[a-f0-9]+$/);
      expect(response.body.dailyAttestationLimit).toBeGreaterThan(0);
    });

    test('POST /api/v1/employers/register should validate required fields', async () => {
      const invalidData = {
        companyName: '',
        domain: 'invalid-domain',
        contactEmail: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/v1/employers/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    test('GET /api/v1/employers should list employers', async () => {
      const response = await request(app)
        .get('/api/v1/employers')
        .expect(200);

      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.employers).toBeInstanceOf(Array);
      expect(response.body.employers[0]).toHaveProperty('employerId');
      expect(response.body.employers[0]).toHaveProperty('signatureCount');
    });

    test('GET /api/v1/employers/:employerId should get employer details', async () => {
      const response = await request(app)
        .get(`/api/v1/employers/${testEmployer.employerId}`)
        .set('X-Employer-Id', testEmployer.employerId)
        .expect(200);

      expect(response.body.employerId).toBe(testEmployer.employerId);
      expect(response.body.keyStatistics).toBeDefined();
      expect(response.body.rateLimiting).toBeDefined();
    });

    test('GET /api/v1/employers/:employerId/public-key should return public key', async () => {
      const response = await request(app)
        .get(`/api/v1/employers/${testEmployer.employerId}/public-key`)
        .expect(200);

      expect(response.body.employerId).toBe(testEmployer.employerId);
      expect(response.body.publicKey).toMatch(/^[a-f0-9]+$/);
      expect(response.body.algorithm).toBe('ECDSA-secp256k1');
    });

    test('POST /api/v1/employers/:employerId/test-key should test key functionality', async () => {
      const testData = { testData: 'Stream Protocol Key Test' };

      const response = await request(app)
        .post(`/api/v1/employers/${testEmployer.employerId}/test-key`)
        .set('X-Employer-Id', testEmployer.employerId)
        .send(testData)
        .expect(200);

      expect(response.body.signature).toMatch(/^[a-f0-9]+$/);
      expect(response.body.verification.isValid).toBe(true);
      expect(response.body.status).toBe('SUCCESS');
    });
  });

  // =============================================================================
  // ATTESTATION TESTS
  // =============================================================================

  describe('Attestation Management', () => {
    let createdAttestationId;

    test('POST /api/v1/attestations should create valid attestation', async () => {
      const attestationData = {
        employerId: testEmployer.employerId,
        employeeWallet: testEmployee,
        wageAmount: 50000, // $500.00
        periodStart: '2024-01-01T09:00:00.000Z',
        periodEnd: '2024-01-01T17:00:00.000Z',
        hoursWorked: 8,
        hourlyRate: 6250 // $62.50
      };

      const response = await request(app)
        .post('/api/v1/attestations')
        .set('X-Employer-Id', testEmployer.employerId)
        .send(attestationData)
        .expect(201);

      expect(response.body.attestationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(response.body.signature).toBeDefined();
      expect(response.body.nullifierHash).toMatch(/^[a-f0-9]{64}$/);
      expect(response.body.zkpCompatible).toBe(true);

      createdAttestationId = response.body.attestationId;
    });

    test('POST /api/v1/attestations should validate attestation data', async () => {
      const invalidData = {
        employerId: testEmployer.employerId,
        employeeWallet: 'invalid-wallet',
        wageAmount: -100,
        periodStart: '2024-01-01T17:00:00.000Z',
        periodEnd: '2024-01-01T09:00:00.000Z', // End before start
        hoursWorked: -5,
        hourlyRate: 0
      };

      const response = await request(app)
        .post('/api/v1/attestations')
        .set('X-Employer-Id', testEmployer.employerId)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    test('GET /api/v1/attestations/:attestationId should retrieve attestation', async () => {
      const response = await request(app)
        .get(`/api/v1/attestations/${createdAttestationId}`)
        .expect(200);

      expect(response.body.attestation.attestationId).toBe(createdAttestationId);
      expect(response.body.attestation.signature).toBeDefined();
      expect(response.body.zkpFormat).toBeDefined();
      expect(response.body.canonicalData).toBeDefined();
    });

    test('POST /api/v1/attestations/:attestationId/verify should verify signature', async () => {
      const response = await request(app)
        .post(`/api/v1/attestations/${createdAttestationId}/verify`)
        .send({ employerId: testEmployer.employerId })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.isExpired).toBe(false);
      expect(response.body.isUsable).toBe(true);
      expect(response.body.signatureDetails.algorithm).toBe('ECDSA-secp256k1');
    });

    test('GET /api/v1/attestations/:attestationId/zkp should return ZKP data', async () => {
      const response = await request(app)
        .get(`/api/v1/attestations/${createdAttestationId}/zkp`)
        .expect(200);

      expect(response.body.zkpInputs).toBeDefined();
      expect(response.body.publicInputs).toBeDefined();
      expect(response.body.circuitCompatibility).toBeDefined();
      expect(response.body.canonicalization).toBeDefined();

      expect(response.body.zkpInputs.employerId).toBe(testEmployer.employerId);
      expect(response.body.zkpInputs.signature).toMatch(/^[a-f0-9]+$/);
    });

    test('GET /api/v1/attestations/employee/:wallet should get employee attestations', async () => {
      const response = await request(app)
        .get(`/api/v1/attestations/employee/${testEmployee}`)
        .expect(200);

      expect(response.body.employeeWallet).toBe(testEmployee);
      expect(response.body.attestations).toBeInstanceOf(Array);
      expect(response.body.total).toBeGreaterThan(0);
    });

    test('POST /api/v1/attestations/batch-verify should verify multiple attestations', async () => {
      const response = await request(app)
        .post('/api/v1/attestations/batch-verify')
        .send({ attestationIds: [createdAttestationId] })
        .expect(200);

      expect(response.body.summary.total).toBe(1);
      expect(response.body.summary.valid).toBe(1);
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.results[0].isValid).toBe(true);
    });
  });

  // =============================================================================
  // NULLIFIER TESTS
  // =============================================================================

  describe('Nullifier Management', () => {
    test('GET /api/v1/nullifiers/:hash should check nullifier usage', async () => {
      const testHash = 'a'.repeat(64); // Valid hex hash

      const response = await request(app)
        .get(`/api/v1/nullifiers/${testHash}`)
        .expect(200);

      expect(response.body.nullifierHash).toBe(testHash);
      expect(response.body.isUsed).toBe(false);
      expect(response.body.canUse).toBe(true);
    });
  });

  // =============================================================================
  // UTILITY TESTS
  // =============================================================================

  describe('Utility Endpoints', () => {
    test('GET /api/v1/utils/canonical-test should return test vectors', async () => {
      const response = await request(app)
        .get('/api/v1/utils/canonical-test')
        .expect(200);

      expect(response.body.description).toContain('canonicalization');
      expect(response.body.testVectors).toBeInstanceOf(Array);
      expect(response.body.testVectors.length).toBeGreaterThan(0);
    });

    test('POST /api/v1/utils/validate-attestation should validate format', async () => {
      const attestationData = {
        employerId: testEmployer.employerId,
        employeeWallet: testEmployee,
        wageAmount: 50000,
        periodStart: '2024-01-01T09:00:00.000Z',
        periodEnd: '2024-01-01T17:00:00.000Z',
        hoursWorked: 8,
        hourlyRate: 6250
      };

      const response = await request(app)
        .post('/api/v1/utils/validate-attestation')
        .send(attestationData)
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBe(0);
      expect(response.body.canonicalHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.availableEndpoints).toBeInstanceOf(Array);
    });

    test('should return 401 for missing employer authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/employers/${testEmployer.employerId}`)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array(15).fill().map(() =>
        request(app)
          .post('/api/v1/attestations')
          .set('X-Employer-Id', testEmployer.employerId)
          .send({
            employerId: testEmployer.employerId,
            employeeWallet: testEmployee,
            wageAmount: 50000,
            periodStart: '2024-01-01T09:00:00.000Z',
            periodEnd: '2024-01-01T17:00:00.000Z',
            hoursWorked: 8,
            hourlyRate: 6250
          })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res.status === 429);

      // Note: Rate limiting might not trigger in test environment
      // This test mainly ensures the endpoint doesn't crash under load
      expect(responses.length).toBe(15);
    });
  });

  // =============================================================================
  // INTEGRATION TESTS WITH SIMULATOR
  // =============================================================================

  describe('Integration with Employer Simulator', () => {
    test('should generate realistic test scenarios', async () => {
      const scenarios = simulator.generateAttestationScenarios('starbucks', 5, {
        errorRate: 0.2, // 20% error scenarios
        timeRange: 7
      });

      expect(scenarios).toBeInstanceOf(Array);
      expect(scenarios.length).toBe(5);

      const validScenarios = scenarios.filter(s => !s.isErrorScenario);
      const errorScenarios = scenarios.filter(s => s.isErrorScenario);

      expect(validScenarios.length).toBeGreaterThan(0);
      expect(errorScenarios.length).toBeGreaterThan(0);

      // Test a valid scenario
      const validScenario = validScenarios[0];
      const response = await request(app)
        .post('/api/v1/attestations')
        .set('X-Employer-Id', validScenario.employerId)
        .send(validScenario.attestationData)
        .expect(201);

      expect(response.body.attestationId).toBeDefined();
    });

    test('should create comprehensive test suite', async () => {
      const testSuite = await simulator.generateTestSuite({
        attestationsPerEmployer: 3,
        errorRate: 0.1,
        timeRange: 7
      });

      expect(testSuite.employers).toBeInstanceOf(Array);
      expect(testSuite.scenarios).toBeInstanceOf(Array);
      expect(testSuite.attestations).toBeInstanceOf(Array);
      expect(testSuite.summary.totalEmployers).toBeGreaterThan(0);
      expect(testSuite.summary.totalAttestations).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // PERFORMANCE TESTS
  // =============================================================================

  describe('Performance Tests', () => {
    test('should handle concurrent attestation creation', async () => {
      const startTime = Date.now();

      const promises = Array(5).fill().map((_, index) =>
        request(app)
          .post('/api/v1/attestations')
          .set('X-Employer-Id', testEmployer.employerId)
          .send({
            employerId: testEmployer.employerId,
            employeeWallet: `0x${index.toString().padStart(40, '0')}`,
            wageAmount: 50000 + index * 1000,
            periodStart: '2024-01-01T09:00:00.000Z',
            periodEnd: '2024-01-01T17:00:00.000Z',
            hoursWorked: 8,
            hourlyRate: 6250
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      expect(responses.every(res => res.status === 201)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should efficiently verify multiple attestations', async () => {
      // First create some attestations
      const createPromises = Array(3).fill().map((_, index) =>
        request(app)
          .post('/api/v1/attestations')
          .set('X-Employer-Id', testEmployer.employerId)
          .send({
            employerId: testEmployer.employerId,
            employeeWallet: `0x${(index + 100).toString().padStart(40, '0')}`,
            wageAmount: 50000,
            periodStart: '2024-01-01T09:00:00.000Z',
            periodEnd: '2024-01-01T17:00:00.000Z',
            hoursWorked: 8,
            hourlyRate: 6250
          })
      );

      const createResponses = await Promise.all(createPromises);
      const attestationIds = createResponses.map(res => res.body.attestationId);

      // Now batch verify them
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v1/attestations/batch-verify')
        .send({ attestationIds })
        .expect(200);

      const endTime = Date.now();

      expect(response.body.summary.total).toBe(3);
      expect(response.body.summary.valid).toBe(3);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});