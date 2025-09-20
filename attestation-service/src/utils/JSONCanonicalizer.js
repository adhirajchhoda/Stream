/**
 * Stream Protocol JSON Canonicalization Utility
 * Ensures consistent JSON representation for ECDSA signature verification
 * Implements RFC 8785 JSON Canonicalization Scheme (JCS)
 */

const crypto = require('crypto');

/**
 * JSON Canonicalizer for deterministic serialization
 */
class JSONCanonicalizer {
  /**
   * Canonicalize a JavaScript object for consistent signing
   * Implements deterministic JSON serialization
   */
  static canonicalize(obj) {
    return JSON.stringify(obj, this.replacer, null);
  }

  /**
   * Custom replacer function for JSON.stringify to ensure consistent ordering
   */
  static replacer(key, value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Sort object keys alphabetically
      const sortedObj = {};
      Object.keys(value).sort().forEach(k => {
        sortedObj[k] = value[k];
      });
      return sortedObj;
    }
    return value;
  }

  /**
   * Normalize string values for consistent representation
   */
  static normalizeString(str) {
    if (typeof str !== 'string') {
      return str;
    }

    // Normalize Unicode
    return str.normalize('NFC');
  }

  /**
   * Normalize number values for consistent representation
   */
  static normalizeNumber(num) {
    if (typeof num !== 'number') {
      return num;
    }

    // Convert to string and back to handle floating point precision
    return parseFloat(num.toFixed(6));
  }

  /**
   * Normalize date values to ISO string format
   */
  static normalizeDate(date) {
    if (!(date instanceof Date)) {
      return date;
    }

    return date.toISOString();
  }

  /**
   * Deep normalize an object for canonical representation
   */
  static deepNormalize(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepNormalize(item));
    }

    if (obj instanceof Date) {
      return this.normalizeDate(obj);
    }

    if (typeof obj === 'string') {
      return this.normalizeString(obj);
    }

    if (typeof obj === 'number') {
      return this.normalizeNumber(obj);
    }

    if (typeof obj === 'object') {
      const normalized = {};
      Object.keys(obj).sort().forEach(key => {
        normalized[key] = this.deepNormalize(obj[key]);
      });
      return normalized;
    }

    return obj;
  }

  /**
   * Create a deterministic hash of an object
   */
  static hash(obj, algorithm = 'sha256') {
    const normalized = this.deepNormalize(obj);
    const canonical = this.canonicalize(normalized);
    return crypto.createHash(algorithm).update(canonical, 'utf8').digest('hex');
  }

  /**
   * Prepare wage attestation data for signing
   */
  static prepareAttestationForSigning(attestation) {
    const signingData = {
      employerId: attestation.employerId,
      employeeWallet: attestation.employeeWallet.toLowerCase(), // Normalize case
      wageAmount: this.normalizeNumber(attestation.wageAmount),
      periodStart: this.normalizeDate(attestation.periodStart),
      periodEnd: this.normalizeDate(attestation.periodEnd),
      hoursWorked: this.normalizeNumber(attestation.hoursWorked),
      hourlyRate: this.normalizeNumber(attestation.hourlyRate),
      periodNonce: this.normalizeString(attestation.periodNonce),
      timestamp: this.normalizeDate(attestation.timestamp)
    };

    return this.deepNormalize(signingData);
  }

  /**
   * Verify that two objects produce the same canonical representation
   */
  static areCanonicallyEqual(obj1, obj2) {
    const canonical1 = this.canonicalize(this.deepNormalize(obj1));
    const canonical2 = this.canonicalize(this.deepNormalize(obj2));
    return canonical1 === canonical2;
  }

  /**
   * Get canonical string representation with metadata
   */
  static getCanonicalWithMetadata(obj) {
    const normalized = this.deepNormalize(obj);
    const canonical = this.canonicalize(normalized);
    const hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');

    return {
      canonical,
      hash,
      length: canonical.length,
      normalized,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate canonical format
   */
  static validateCanonical(canonical) {
    const validation = {
      isValid: true,
      errors: []
    };

    try {
      // Parse to ensure it's valid JSON
      const parsed = JSON.parse(canonical);

      // Check for consistent ordering by re-canonicalizing
      const reCanonical = this.canonicalize(this.deepNormalize(parsed));

      if (canonical !== reCanonical) {
        validation.errors.push('JSON is not in canonical form');
        validation.isValid = false;
      }

      // Check for Unicode normalization
      if (canonical !== canonical.normalize('NFC')) {
        validation.errors.push('String values are not Unicode normalized');
        validation.isValid = false;
      }

      // Check for consistent number formatting
      const numberRegex = /\d+\.\d{7,}/g; // More than 6 decimal places
      if (numberRegex.test(canonical)) {
        validation.errors.push('Numbers have excessive precision');
        validation.isValid = false;
      }

    } catch (error) {
      validation.errors.push(`Invalid JSON: ${error.message}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Compress canonical JSON for efficient storage/transmission
   */
  static compress(canonical) {
    // Remove unnecessary whitespace while maintaining canonical form
    return canonical.replace(/\s+/g, ' ').trim();
  }

  /**
   * Create signing hash from attestation with full traceability
   */
  static createSigningHash(attestation) {
    const prepared = this.prepareAttestationForSigning(attestation);
    const canonical = this.canonicalize(prepared);
    const validation = this.validateCanonical(canonical);

    if (!validation.isValid) {
      throw new Error(`Canonicalization failed: ${validation.errors.join(', ')}`);
    }

    const hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');

    return {
      hash,
      canonical,
      prepared,
      validation,
      metadata: {
        algorithm: 'SHA256',
        encoding: 'UTF-8',
        normalization: 'NFC',
        keyOrdering: 'alphabetical',
        numberPrecision: 6,
        dateFormat: 'ISO8601',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Compare two attestations for canonical equality
   */
  static compareAttestations(attestation1, attestation2) {
    const prepared1 = this.prepareAttestationForSigning(attestation1);
    const prepared2 = this.prepareAttestationForSigning(attestation2);

    const canonical1 = this.canonicalize(prepared1);
    const canonical2 = this.canonicalize(prepared2);

    const hash1 = crypto.createHash('sha256').update(canonical1, 'utf8').digest('hex');
    const hash2 = crypto.createHash('sha256').update(canonical2, 'utf8').digest('hex');

    return {
      areEqual: hash1 === hash2,
      hash1,
      hash2,
      canonical1,
      canonical2,
      differences: this.findDifferences(prepared1, prepared2)
    };
  }

  /**
   * Find differences between two normalized objects
   */
  static findDifferences(obj1, obj2) {
    const differences = [];

    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of keys) {
      if (!(key in obj1)) {
        differences.push({ key, type: 'missing_in_first', value: obj2[key] });
      } else if (!(key in obj2)) {
        differences.push({ key, type: 'missing_in_second', value: obj1[key] });
      } else if (obj1[key] !== obj2[key]) {
        differences.push({
          key,
          type: 'value_difference',
          value1: obj1[key],
          value2: obj2[key]
        });
      }
    }

    return differences;
  }

  /**
   * Generate test vectors for validation
   */
  static generateTestVectors() {
    const testCases = [
      {
        name: 'Basic attestation',
        input: {
          employerId: 'test_employer',
          employeeWallet: '0x742d35Cc6634C0532925a3b8D000B45f5c964C12',
          wageAmount: 500000,
          periodStart: new Date('2024-01-01T00:00:00.000Z'),
          periodEnd: new Date('2024-01-07T23:59:59.999Z'),
          hoursWorked: 40,
          hourlyRate: 12500,
          periodNonce: 'test_nonce_123',
          timestamp: new Date('2024-01-08T10:00:00.000Z')
        }
      },
      {
        name: 'Unicode strings',
        input: {
          employerId: 'tëst_émplöyér',
          employeeWallet: '0x742d35cc6634c0532925a3b8d000b45f5c964c12',
          wageAmount: 123456.78,
          periodStart: new Date('2024-01-01T00:00:00.000Z'),
          periodEnd: new Date('2024-01-01T23:59:59.999Z'),
          hoursWorked: 8.5,
          hourlyRate: 14523.67,
          periodNonce: 'üñíçødé_nöñçé',
          timestamp: new Date('2024-01-02T10:00:00.000Z')
        }
      }
    ];

    return testCases.map(testCase => {
      const result = this.createSigningHash(testCase.input);
      return {
        ...testCase,
        output: result
      };
    });
  }
}

module.exports = {
  JSONCanonicalizer
};