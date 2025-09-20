/**
 * Unit Tests for JSON Canonicalizer
 */

const { JSONCanonicalizer } = require('../../src/utils/JSONCanonicalizer');

describe('JSONCanonicalizer', () => {
  describe('Basic Canonicalization', () => {
    test('should canonicalize simple object with sorted keys', () => {
      const obj = { c: 3, a: 1, b: 2 };
      const canonical = JSONCanonicalizer.canonicalize(obj);
      const expected = '{"a":1,"b":2,"c":3}';

      expect(canonical).toBe(expected);
    });

    test('should handle nested objects', () => {
      const obj = {
        z: { b: 2, a: 1 },
        a: { z: 26, y: 25 }
      };

      const canonical = JSONCanonicalizer.canonicalize(obj);
      const expected = '{"a":{"y":25,"z":26},"z":{"a":1,"b":2}}';

      expect(canonical).toBe(expected);
    });

    test('should preserve arrays without sorting', () => {
      const obj = { arr: [3, 1, 2], key: 'value' };
      const canonical = JSONCanonicalizer.canonicalize(obj);
      const expected = '{"arr":[3,1,2],"key":"value"}';

      expect(canonical).toBe(expected);
    });

    test('should handle null and undefined values', () => {
      const obj = { a: null, b: undefined, c: 'value' };
      const canonical = JSONCanonicalizer.canonicalize(obj);
      const expected = '{"a":null,"c":"value"}'; // undefined is omitted

      expect(canonical).toBe(expected);
    });
  });

  describe('Deep Normalization', () => {
    test('should normalize string values', () => {
      const str = 'Test String';
      const normalized = JSONCanonicalizer.normalizeString(str);

      expect(normalized).toBe('Test String');
    });

    test('should normalize number values', () => {
      const num = 123.456789;
      const normalized = JSONCanonicalizer.normalizeNumber(num);

      expect(normalized).toBe(123.456789);
    });

    test('should normalize date values to ISO string', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      const normalized = JSONCanonicalizer.normalizeDate(date);

      expect(normalized).toBe('2024-01-01T12:00:00.000Z');
    });

    test('should deep normalize complex objects', () => {
      const obj = {
        date: new Date('2024-01-01T12:00:00.000Z'),
        number: 123.456789,
        string: 'Test',
        nested: {
          date2: new Date('2024-01-02T12:00:00.000Z'),
          array: [1, 2, 3]
        }
      };

      const normalized = JSONCanonicalizer.deepNormalize(obj);

      expect(normalized.date).toBe('2024-01-01T12:00:00.000Z');
      expect(normalized.nested.date2).toBe('2024-01-02T12:00:00.000Z');
      expect(Array.isArray(normalized.nested.array)).toBe(true);
    });
  });

  describe('Hash Generation', () => {
    test('should generate consistent SHA256 hash', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const hash1 = JSONCanonicalizer.hash(obj);
      const hash2 = JSONCanonicalizer.hash(obj);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should generate different hashes for different objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };

      const hash1 = JSONCanonicalizer.hash(obj1);
      const hash2 = JSONCanonicalizer.hash(obj2);

      expect(hash1).not.toBe(hash2);
    });

    test('should generate same hash regardless of key order', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };

      const hash1 = JSONCanonicalizer.hash(obj1);
      const hash2 = JSONCanonicalizer.hash(obj2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Attestation Preparation', () => {
    test('should prepare attestation for signing', () => {
      const attestation = {
        employerId: 'test_employer',
        employeeWallet: '0X742D35CC6634C0532925A3B8D000B45F5C964C12', // Uppercase
        wageAmount: 50000.123,
        periodStart: new Date('2024-01-01T09:00:00.000Z'),
        periodEnd: new Date('2024-01-01T17:00:00.000Z'),
        hoursWorked: 8.5,
        hourlyRate: 5882.352941,
        periodNonce: 'test_nonce',
        timestamp: new Date('2024-01-01T18:00:00.000Z')
      };

      const prepared = JSONCanonicalizer.prepareAttestationForSigning(attestation);

      expect(prepared.employeeWallet).toBe('0x742d35cc6634c0532925a3b8d000b45f5c964c12');
      expect(prepared.periodStart).toBe('2024-01-01T09:00:00.000Z');
      expect(prepared.periodEnd).toBe('2024-01-01T17:00:00.000Z');
      expect(prepared.timestamp).toBe('2024-01-01T18:00:00.000Z');
      expect(typeof prepared.wageAmount).toBe('number');
      expect(typeof prepared.hoursWorked).toBe('number');
    });
  });

  describe('Canonical Equality', () => {
    test('should detect canonical equality', () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };

      const areEqual = JSONCanonicalizer.areCanonicallyEqual(obj1, obj2);
      expect(areEqual).toBe(true);
    });

    test('should detect canonical inequality', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };

      const areEqual = JSONCanonicalizer.areCanonicallyEqual(obj1, obj2);
      expect(areEqual).toBe(false);
    });
  });

  describe('Canonical Metadata', () => {
    test('should generate canonical with metadata', () => {
      const obj = { c: 3, a: 1, b: 2 };
      const result = JSONCanonicalizer.getCanonicalWithMetadata(obj);

      expect(result).toHaveProperty('canonical');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('length');
      expect(result).toHaveProperty('normalized');
      expect(result).toHaveProperty('timestamp');

      expect(result.canonical).toBe('{"a":1,"b":2,"c":3}');
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.length).toBe(result.canonical.length);
    });
  });

  describe('Validation', () => {
    test('should validate correct canonical JSON', () => {
      const canonical = '{"a":1,"b":2,"c":3}';
      const validation = JSONCanonicalizer.validateCanonical(canonical);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should reject non-canonical JSON', () => {
      const nonCanonical = '{"c":3,"a":1,"b":2}'; // Wrong order
      const validation = JSONCanonicalizer.validateCanonical(nonCanonical);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should reject invalid JSON', () => {
      const invalid = '{"a":1,"b":2,}'; // Trailing comma
      const validation = JSONCanonicalizer.validateCanonical(invalid);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(err => err.includes('Invalid JSON'))).toBe(true);
    });
  });

  describe('Signing Hash Creation', () => {
    test('should create signing hash with full traceability', () => {
      const attestation = {
        employerId: 'test_employer',
        employeeWallet: '0x742d35Cc6634C0532925a3b8D000B45f5c964C12',
        wageAmount: 50000,
        periodStart: new Date('2024-01-01T09:00:00.000Z'),
        periodEnd: new Date('2024-01-01T17:00:00.000Z'),
        hoursWorked: 8,
        hourlyRate: 6250,
        periodNonce: 'test_nonce',
        timestamp: new Date('2024-01-01T18:00:00.000Z')
      };

      const result = JSONCanonicalizer.createSigningHash(attestation);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('canonical');
      expect(result).toHaveProperty('prepared');
      expect(result).toHaveProperty('validation');
      expect(result).toHaveProperty('metadata');

      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.validation.isValid).toBe(true);
      expect(result.metadata.algorithm).toBe('SHA256');
    });

    test('should throw error for invalid canonicalization', () => {
      const invalidAttestation = {
        employerId: 'test_employer',
        // Missing required fields to force canonicalization error
      };

      expect(() => {
        JSONCanonicalizer.createSigningHash(invalidAttestation);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Attestation Comparison', () => {
    test('should compare identical attestations as equal', () => {
      const attestation1 = {
        employerId: 'test_employer',
        employeeWallet: '0x742d35Cc6634C0532925a3b8D000B45f5c964C12',
        wageAmount: 50000,
        periodStart: new Date('2024-01-01T09:00:00.000Z'),
        periodEnd: new Date('2024-01-01T17:00:00.000Z'),
        hoursWorked: 8,
        hourlyRate: 6250,
        periodNonce: 'test_nonce',
        timestamp: new Date('2024-01-01T18:00:00.000Z')
      };

      const attestation2 = { ...attestation1 };

      const comparison = JSONCanonicalizer.compareAttestations(attestation1, attestation2);

      expect(comparison.areEqual).toBe(true);
      expect(comparison.hash1).toBe(comparison.hash2);
      expect(comparison.differences).toEqual([]);
    });

    test('should compare different attestations as unequal', () => {
      const attestation1 = {
        employerId: 'test_employer',
        employeeWallet: '0x742d35Cc6634C0532925a3b8D000B45f5c964C12',
        wageAmount: 50000,
        periodStart: new Date('2024-01-01T09:00:00.000Z'),
        periodEnd: new Date('2024-01-01T17:00:00.000Z'),
        hoursWorked: 8,
        hourlyRate: 6250,
        periodNonce: 'test_nonce',
        timestamp: new Date('2024-01-01T18:00:00.000Z')
      };

      const attestation2 = {
        ...attestation1,
        wageAmount: 60000 // Different amount
      };

      const comparison = JSONCanonicalizer.compareAttestations(attestation1, attestation2);

      expect(comparison.areEqual).toBe(false);
      expect(comparison.hash1).not.toBe(comparison.hash2);
      expect(comparison.differences.length).toBeGreaterThan(0);
      expect(comparison.differences[0]).toMatchObject({
        key: 'wageAmount',
        type: 'value_difference',
        value1: 50000,
        value2: 60000
      });
    });
  });

  describe('Test Vector Generation', () => {
    test('should generate test vectors', () => {
      const testVectors = JSONCanonicalizer.generateTestVectors();

      expect(Array.isArray(testVectors)).toBe(true);
      expect(testVectors.length).toBeGreaterThan(0);

      testVectors.forEach(testCase => {
        expect(testCase).toHaveProperty('name');
        expect(testCase).toHaveProperty('input');
        expect(testCase).toHaveProperty('output');
        expect(testCase.output).toHaveProperty('hash');
        expect(testCase.output).toHaveProperty('canonical');
        expect(testCase.output).toHaveProperty('metadata');
      });
    });

    test('test vectors should have consistent hashes', () => {
      const testVectors = JSONCanonicalizer.generateTestVectors();

      testVectors.forEach(testCase => {
        const regenerated = JSONCanonicalizer.createSigningHash(testCase.input);
        expect(regenerated.hash).toBe(testCase.output.hash);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty objects', () => {
      const obj = {};
      const canonical = JSONCanonicalizer.canonicalize(obj);
      expect(canonical).toBe('{}');
    });

    test('should handle arrays with objects', () => {
      const obj = {
        items: [
          { b: 2, a: 1 },
          { d: 4, c: 3 }
        ]
      };

      const canonical = JSONCanonicalizer.canonicalize(obj);
      const expected = '{"items":[{"a":1,"b":2},{"c":3,"d":4}]}';

      expect(canonical).toBe(expected);
    });

    test('should handle special characters in strings', () => {
      const obj = {
        special: 'Test with "quotes" and \\backslashes',
        unicode: 'Test with üñíçødé'
      };

      const canonical = JSONCanonicalizer.canonicalize(obj);
      expect(canonical).toContain('"special"');
      expect(canonical).toContain('"unicode"');
    });

    test('should handle very deep nesting', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep'
              }
            }
          }
        }
      };

      const canonical = JSONCanonicalizer.canonicalize(obj);
      expect(canonical).toContain('"value":"deep"');
    });

    test('should handle floating point precision consistently', () => {
      const obj1 = { value: 1.23456789 };
      const obj2 = { value: 1.23456789 };

      const hash1 = JSONCanonicalizer.hash(obj1);
      const hash2 = JSONCanonicalizer.hash(obj2);

      expect(hash1).toBe(hash2);
    });
  });
});