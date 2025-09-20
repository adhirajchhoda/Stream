/**
 * Unit Tests for WageAttestation Model
 */

const { WageAttestation, EMPLOYMENT_TYPES } = require('../../src/models/WageAttestation');

describe('WageAttestation Model', () => {
  const validAttestationData = {
    employerId: 'test_employer_123',
    employeeWallet: '0x742d35Cc6634C0532925a3b8D000B45f5c964C12',
    wageAmount: 50000, // $500.00
    periodStart: new Date('2024-01-01T09:00:00.000Z'),
    periodEnd: new Date('2024-01-01T17:00:00.000Z'),
    hoursWorked: 8,
    hourlyRate: 6250, // $62.50
    periodNonce: 'test_nonce_123',
    timestamp: new Date('2024-01-01T18:00:00.000Z')
  };

  describe('Constructor and Basic Properties', () => {
    test('should create attestation with valid data', () => {
      const attestation = new WageAttestation(validAttestationData);

      expect(attestation.employerId).toBe('test_employer_123');
      expect(attestation.employeeWallet).toBe('0x742d35Cc6634C0532925a3b8D000B45f5c964C12');
      expect(attestation.wageAmount).toBe(50000);
      expect(attestation.hoursWorked).toBe(8);
      expect(attestation.hourlyRate).toBe(6250);
      expect(attestation.attestationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should generate period nonce if not provided', () => {
      const data = { ...validAttestationData };
      delete data.periodNonce;

      const attestation = new WageAttestation(data);
      expect(attestation.periodNonce).toBeDefined();
      expect(typeof attestation.periodNonce).toBe('string');
      expect(attestation.periodNonce.length).toBe(16);
    });

    test('should set timestamp to now if not provided', () => {
      const data = { ...validAttestationData };
      delete data.timestamp;

      const attestation = new WageAttestation(data);
      expect(attestation.timestamp).toBeInstanceOf(Date);
      expect(Date.now() - attestation.timestamp.getTime()).toBeLessThan(1000);
    });
  });

  describe('Validation', () => {
    test('should validate correct attestation', () => {
      const attestation = new WageAttestation(validAttestationData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should reject missing required fields', () => {
      const invalidData = {
        employeeWallet: '0x742d35Cc6634C0532925a3b8D000B45f5c964C12',
        // Missing other required fields
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(err => err.includes('employerId'))).toBe(true);
    });

    test('should reject invalid Ethereum address', () => {
      const invalidData = {
        ...validAttestationData,
        employeeWallet: 'invalid_address'
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(err => err.includes('valid Ethereum address'))).toBe(true);
    });

    test('should reject negative values', () => {
      const invalidData = {
        ...validAttestationData,
        wageAmount: -100,
        hoursWorked: -5,
        hourlyRate: -10
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should reject period end before start', () => {
      const invalidData = {
        ...validAttestationData,
        periodStart: new Date('2024-01-01T17:00:00.000Z'),
        periodEnd: new Date('2024-01-01T09:00:00.000Z')
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(err => err.includes('periodStart must be before periodEnd'))).toBe(true);
    });

    test('should reject future work periods', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const invalidData = {
        ...validAttestationData,
        periodEnd: futureDate
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(err => err.includes('cannot be in the future'))).toBe(true);
    });

    test('should reject wage calculation mismatch', () => {
      const invalidData = {
        ...validAttestationData,
        wageAmount: 100000, // Wrong amount for 8 hours at $62.50/hour
        hoursWorked: 8,
        hourlyRate: 6250
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(err => err.includes('does not match'))).toBe(true);
    });

    test('should reject unrealistic hourly rates', () => {
      const invalidData = {
        ...validAttestationData,
        hourlyRate: 50, // $0.50/hour - too low
        wageAmount: 400 // Adjusted for new rate
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(err => err.includes('between $1.00 and $500.00'))).toBe(true);
    });

    test('should reject excessive work periods', () => {
      const invalidData = {
        ...validAttestationData,
        periodStart: new Date('2024-01-01T00:00:00.000Z'),
        periodEnd: new Date('2024-02-15T00:00:00.000Z'), // 45 days
        hoursWorked: 8
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(err => err.includes('cannot exceed 28 days'))).toBe(true);
    });

    test('should reject impossible hours per day', () => {
      const invalidData = {
        ...validAttestationData,
        hoursWorked: 25 // More than 24 hours in a day
      };

      const attestation = new WageAttestation(invalidData);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(err => err.includes('exceeds maximum possible hours'))).toBe(true);
    });
  });

  describe('Canonical Data Generation', () => {
    test('should generate consistent canonical data', () => {
      const attestation = new WageAttestation(validAttestationData);
      const canonical1 = attestation.getCanonicalData();
      const canonical2 = attestation.getCanonicalData();

      expect(canonical1).toEqual(canonical2);
    });

    test('should normalize wallet address to lowercase', () => {
      const data = {
        ...validAttestationData,
        employeeWallet: '0X742D35CC6634C0532925A3B8D000B45F5C964C12' // Uppercase
      };

      const attestation = new WageAttestation(data);
      const canonical = attestation.getCanonicalData();

      expect(canonical.employeeWallet).toBe('0x742d35cc6634c0532925a3b8d000b45f5c964c12');
    });

    test('should use ISO string format for dates', () => {
      const attestation = new WageAttestation(validAttestationData);
      const canonical = attestation.getCanonicalData();

      expect(canonical.periodStart).toBe('2024-01-01T09:00:00.000Z');
      expect(canonical.periodEnd).toBe('2024-01-01T17:00:00.000Z');
      expect(canonical.timestamp).toBe('2024-01-01T18:00:00.000Z');
    });
  });

  describe('Signing Hash Generation', () => {
    test('should generate consistent signing hash', () => {
      const attestation = new WageAttestation(validAttestationData);
      const hash1 = attestation.getSigningHash();
      const hash2 = attestation.getSigningHash();

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should generate different hashes for different data', () => {
      const attestation1 = new WageAttestation(validAttestationData);
      const attestation2 = new WageAttestation({
        ...validAttestationData,
        wageAmount: 60000
      });

      const hash1 = attestation1.getSigningHash();
      const hash2 = attestation2.getSigningHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Expiration Handling', () => {
    test('should not be expired when just created', () => {
      const attestation = new WageAttestation(validAttestationData);
      expect(attestation.isExpired()).toBe(false);
    });

    test('should be expired after 7 days', () => {
      const oldData = {
        ...validAttestationData,
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      };

      const attestation = new WageAttestation(oldData);
      expect(attestation.isExpired()).toBe(true);
    });
  });

  describe('ZKP Format', () => {
    test('should generate ZKP-compatible format', () => {
      const attestation = new WageAttestation(validAttestationData);
      const zkpFormat = attestation.getZKPFormat();

      expect(zkpFormat).toHaveProperty('employerId');
      expect(zkpFormat).toHaveProperty('employeeWallet');
      expect(zkpFormat).toHaveProperty('wageAmount');
      expect(zkpFormat).toHaveProperty('periodNonce');
      expect(zkpFormat).toHaveProperty('attestationHash');

      expect(typeof zkpFormat.wageAmount).toBe('string');
      expect(zkpFormat.attestationHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('JSON Serialization', () => {
    test('should serialize to JSON correctly', () => {
      const attestation = new WageAttestation(validAttestationData);
      const json = attestation.toJSON();

      expect(json).toHaveProperty('attestationId');
      expect(json).toHaveProperty('employerId');
      expect(json).toHaveProperty('employeeWallet');
      expect(json).toHaveProperty('wageAmount');
      expect(json).toHaveProperty('isExpired');
      expect(json).toHaveProperty('signingHash');

      expect(typeof json.periodStart).toBe('string');
      expect(typeof json.periodEnd).toBe('string');
      expect(typeof json.timestamp).toBe('string');
    });

    test('should recreate from JSON', () => {
      const attestation1 = new WageAttestation(validAttestationData);
      const json = attestation1.toJSON();
      const attestation2 = WageAttestation.fromJSON(json);

      expect(attestation2.employerId).toBe(attestation1.employerId);
      expect(attestation2.employeeWallet).toBe(attestation1.employeeWallet);
      expect(attestation2.wageAmount).toBe(attestation1.wageAmount);
      expect(attestation2.getSigningHash()).toBe(attestation1.getSigningHash());
    });
  });

  describe('Employment Types', () => {
    test('should have defined employment types', () => {
      expect(EMPLOYMENT_TYPES).toBeDefined();
      expect(EMPLOYMENT_TYPES.HOURLY).toBeDefined();
      expect(EMPLOYMENT_TYPES.SALARY).toBeDefined();
      expect(EMPLOYMENT_TYPES.GIG).toBeDefined();
      expect(EMPLOYMENT_TYPES.PART_TIME).toBeDefined();
    });

    test('employment types should have required properties', () => {
      Object.values(EMPLOYMENT_TYPES).forEach(type => {
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('rateRange');
        expect(type).toHaveProperty('hoursRange');
        expect(type).toHaveProperty('periodType');
        expect(Array.isArray(type.rateRange)).toBe(true);
        expect(Array.isArray(type.hoursRange)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle wage amount with floating point precision', () => {
      const data = {
        ...validAttestationData,
        hoursWorked: 8.5,
        hourlyRate: 5882.35, // $58.8235
        wageAmount: Math.round(8.5 * 5882.35) // Should be 50000
      };

      const attestation = new WageAttestation(data);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(true);
    });

    test('should handle minimum valid values', () => {
      const data = {
        ...validAttestationData,
        wageAmount: 100, // $1.00
        hoursWorked: 1,
        hourlyRate: 100, // $1.00/hour
        periodStart: new Date('2024-01-01T16:00:00.000Z'),
        periodEnd: new Date('2024-01-01T17:00:00.000Z')
      };

      const attestation = new WageAttestation(data);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(true);
    });

    test('should handle maximum reasonable values', () => {
      const data = {
        ...validAttestationData,
        wageAmount: 800000, // $8000
        hoursWorked: 16,
        hourlyRate: 50000, // $500/hour
        periodStart: new Date('2024-01-01T01:00:00.000Z'),
        periodEnd: new Date('2024-01-01T17:00:00.000Z')
      };

      const attestation = new WageAttestation(data);
      const validation = attestation.validate();

      expect(validation.isValid).toBe(true);
    });
  });
});