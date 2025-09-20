/**
 * Stream Protocol Attestation Validation Service
 * Handles attestation validation, anti-replay protection, and business logic
 */

const crypto = require('crypto');
const { WageAttestation } = require('../models/WageAttestation');

/**
 * Attestation Storage and Validation Service
 */
class AttestationValidator {
  constructor() {
    this.attestations = new Map(); // In production, this would be a database
    this.usedNonces = new Set(); // Track used period nonces for anti-replay
    this.nullifierHashes = new Set(); // Track nullifiers for double-spend prevention
    this.employerPolicies = new Map(); // Employer-specific validation policies
  }

  /**
   * Initialize employer validation policies
   */
  initializeEmployerPolicies(employerId, policies = {}) {
    const defaultPolicies = {
      maxDailyAttestations: 50,
      maxWagePerAttestation: 500000, // $5000 in cents
      minHourlyRate: 1000, // $10/hour minimum
      maxHourlyRate: 10000, // $100/hour maximum
      maxHoursPerDay: 16,
      allowFutureAttestations: false,
      requireExactWageCalculation: true,
      maxAttestationAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      ...policies
    };

    this.employerPolicies.set(employerId, defaultPolicies);
    return defaultPolicies;
  }

  /**
   * Validate attestation against business rules and security policies
   */
  async validateAttestation(attestation, employerId) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      securityFlags: []
    };

    // Basic attestation format validation
    const formatValidation = attestation.validate();
    if (!formatValidation.isValid) {
      validation.errors.push(...formatValidation.errors);
      validation.isValid = false;
    }

    // Get employer policies
    const policies = this.employerPolicies.get(employerId) || this.initializeEmployerPolicies(employerId);

    // Anti-replay protection
    const replayCheck = this.checkAntiReplay(attestation);
    if (!replayCheck.isValid) {
      validation.errors.push(...replayCheck.errors);
      validation.securityFlags.push(...replayCheck.securityFlags);
      validation.isValid = false;
    }

    // Employer-specific policy validation
    const policyValidation = this.validateAgainstPolicies(attestation, policies);
    if (!policyValidation.isValid) {
      validation.errors.push(...policyValidation.errors);
      validation.warnings.push(...policyValidation.warnings);
      if (policyValidation.errors.length > 0) {
        validation.isValid = false;
      }
    }

    // Temporal validation
    const temporalValidation = this.validateTemporal(attestation, policies);
    if (!temporalValidation.isValid) {
      validation.errors.push(...temporalValidation.errors);
      validation.warnings.push(...temporalValidation.warnings);
      validation.isValid = false;
    }

    // Pattern analysis for fraud detection
    const patternAnalysis = await this.analyzePatterns(attestation, employerId);
    validation.warnings.push(...patternAnalysis.warnings);
    validation.securityFlags.push(...patternAnalysis.securityFlags);

    return validation;
  }

  /**
   * Check for replay attacks and period uniqueness
   */
  checkAntiReplay(attestation) {
    const result = {
      isValid: true,
      errors: [],
      securityFlags: []
    };

    // Check period nonce uniqueness
    const periodKey = `${attestation.employerId}_${attestation.employeeWallet}_${attestation.periodNonce}`;
    if (this.usedNonces.has(periodKey)) {
      result.errors.push('Period nonce already used - potential replay attack');
      result.securityFlags.push('REPLAY_ATTEMPT');
      result.isValid = false;
    }

    // Check for overlapping periods for same employee
    const overlappingPeriods = this.findOverlappingPeriods(attestation);
    if (overlappingPeriods.length > 0) {
      result.errors.push(`Overlapping work periods detected: ${overlappingPeriods.length} conflicts`);
      result.securityFlags.push('OVERLAPPING_PERIODS');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate against employer-specific policies
   */
  validateAgainstPolicies(attestation, policies) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Wage amount limits
    if (attestation.wageAmount > policies.maxWagePerAttestation) {
      result.errors.push(`Wage amount (${attestation.wageAmount}) exceeds maximum (${policies.maxWagePerAttestation})`);
      result.isValid = false;
    }

    // Hourly rate validation
    if (attestation.hourlyRate < policies.minHourlyRate) {
      result.errors.push(`Hourly rate (${attestation.hourlyRate}) below minimum (${policies.minHourlyRate})`);
      result.isValid = false;
    }

    if (attestation.hourlyRate > policies.maxHourlyRate) {
      result.warnings.push(`Hourly rate (${attestation.hourlyRate}) unusually high (max recommended: ${policies.maxHourlyRate})`);
    }

    // Hours per day validation
    const periodDays = Math.ceil((attestation.periodEnd - attestation.periodStart) / (24 * 60 * 60 * 1000));
    const avgHoursPerDay = attestation.hoursWorked / periodDays;

    if (avgHoursPerDay > policies.maxHoursPerDay) {
      result.errors.push(`Average hours per day (${avgHoursPerDay.toFixed(1)}) exceeds maximum (${policies.maxHoursPerDay})`);
      result.isValid = false;
    }

    // Future work validation
    if (!policies.allowFutureAttestations && attestation.periodEnd > new Date()) {
      result.errors.push('Work period end date cannot be in the future');
      result.isValid = false;
    }

    // Exact wage calculation requirement
    if (policies.requireExactWageCalculation) {
      const expectedWage = Math.round(attestation.hoursWorked * attestation.hourlyRate);
      if (attestation.wageAmount !== expectedWage) {
        result.errors.push(`Wage calculation mismatch: expected ${expectedWage}, got ${attestation.wageAmount}`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Validate temporal aspects of attestation
   */
  validateTemporal(attestation, policies) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if attestation is too old
    const attestationAge = Date.now() - attestation.timestamp.getTime();
    if (attestationAge > policies.maxAttestationAge) {
      result.errors.push('Attestation is too old to be valid');
      result.isValid = false;
    }

    // Check for reasonable work schedule patterns
    const periodLength = attestation.periodEnd - attestation.periodStart;
    const hoursToMsRatio = attestation.hoursWorked / (periodLength / (1000 * 60 * 60));

    // If working more than 100% of the time period, flag as suspicious
    if (hoursToMsRatio > 1.0) {
      result.warnings.push('Work hours exceed time period duration - check for accuracy');
    }

    // Check for weekend/holiday patterns (simplified)
    const startDay = attestation.periodStart.getDay();
    const endDay = attestation.periodEnd.getDay();

    if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) {
      result.warnings.push('Work period includes weekend - verify if intentional');
    }

    return result;
  }

  /**
   * Analyze patterns for fraud detection
   */
  async analyzePatterns(attestation, employerId) {
    const result = {
      warnings: [],
      securityFlags: []
    };

    // Get recent attestations for this employee
    const recentAttestations = this.getRecentAttestations(attestation.employeeWallet, employerId, 30); // 30 days

    if (recentAttestations.length > 0) {
      // Check for unusual wage variations
      const wages = recentAttestations.map(a => a.wageAmount);
      const avgWage = wages.reduce((sum, w) => sum + w, 0) / wages.length;
      const variance = wages.reduce((sum, w) => sum + Math.pow(w - avgWage, 2), 0) / wages.length;
      const stdDev = Math.sqrt(variance);

      if (Math.abs(attestation.wageAmount - avgWage) > 2 * stdDev && stdDev > avgWage * 0.1) {
        result.warnings.push('Wage amount significantly different from recent pattern');
        result.securityFlags.push('UNUSUAL_WAGE_PATTERN');
      }

      // Check for frequency anomalies
      const attestationFrequency = recentAttestations.length / 30; // per day
      if (attestationFrequency > 2) {
        result.warnings.push('High frequency of attestations detected');
        result.securityFlags.push('HIGH_FREQUENCY');
      }

      // Check for round number bias (possible fabrication)
      const hourlyRates = recentAttestations.map(a => a.hourlyRate);
      const roundRates = hourlyRates.filter(rate => rate % 100 === 0); // Exact dollar amounts

      if (roundRates.length / hourlyRates.length > 0.8) {
        result.warnings.push('Unusually high proportion of round hourly rates');
        result.securityFlags.push('ROUND_NUMBER_BIAS');
      }
    }

    return result;
  }

  /**
   * Find overlapping work periods for the same employee
   */
  findOverlappingPeriods(newAttestation) {
    const overlapping = [];

    for (const [id, existingAttestation] of this.attestations) {
      if (existingAttestation.employeeWallet === newAttestation.employeeWallet &&
          existingAttestation.employerId === newAttestation.employerId) {

        // Check for period overlap
        const newStart = newAttestation.periodStart.getTime();
        const newEnd = newAttestation.periodEnd.getTime();
        const existingStart = existingAttestation.periodStart.getTime();
        const existingEnd = existingAttestation.periodEnd.getTime();

        if ((newStart < existingEnd && newEnd > existingStart)) {
          overlapping.push({
            attestationId: id,
            overlapType: this.getOverlapType(newStart, newEnd, existingStart, existingEnd)
          });
        }
      }
    }

    return overlapping;
  }

  /**
   * Determine type of period overlap
   */
  getOverlapType(newStart, newEnd, existingStart, existingEnd) {
    if (newStart === existingStart && newEnd === existingEnd) {
      return 'EXACT_DUPLICATE';
    } else if (newStart >= existingStart && newEnd <= existingEnd) {
      return 'CONTAINED_WITHIN';
    } else if (newStart <= existingStart && newEnd >= existingEnd) {
      return 'CONTAINS_EXISTING';
    } else {
      return 'PARTIAL_OVERLAP';
    }
  }

  /**
   * Get recent attestations for pattern analysis
   */
  getRecentAttestations(employeeWallet, employerId, days = 30) {
    const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const recent = [];

    for (const attestation of this.attestations.values()) {
      if (attestation.employeeWallet === employeeWallet &&
          attestation.employerId === employerId &&
          attestation.timestamp >= cutoffDate) {
        recent.push(attestation);
      }
    }

    return recent.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Store validated attestation
   */
  storeAttestation(attestation) {
    const attestationId = attestation.attestationId;
    this.attestations.set(attestationId, attestation);

    // Track nonce usage
    const periodKey = `${attestation.employerId}_${attestation.employeeWallet}_${attestation.periodNonce}`;
    this.usedNonces.add(periodKey);

    // Generate and track nullifier hash for ZKP
    const nullifierHash = this.generateNullifierHash(attestation);
    this.nullifierHashes.add(nullifierHash);

    return {
      attestationId,
      nullifierHash,
      storedAt: new Date()
    };
  }

  /**
   * Generate nullifier hash for zero-knowledge proofs
   */
  generateNullifierHash(attestation) {
    const nullifierData = {
      employerId: attestation.employerId,
      employeeWallet: attestation.employeeWallet,
      periodNonce: attestation.periodNonce,
      wageAmount: attestation.wageAmount
    };

    const dataString = JSON.stringify(nullifierData, Object.keys(nullifierData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Check if nullifier has been used (prevents double-spending)
   */
  isNullifierUsed(nullifierHash) {
    return this.nullifierHashes.has(nullifierHash);
  }

  /**
   * Get attestation by ID
   */
  getAttestation(attestationId) {
    return this.attestations.get(attestationId);
  }

  /**
   * Get attestations for employee
   */
  getEmployeeAttestations(employeeWallet, employerId = null, limit = 50) {
    const results = [];

    for (const attestation of this.attestations.values()) {
      if (attestation.employeeWallet === employeeWallet &&
          (!employerId || attestation.employerId === employerId)) {
        results.push(attestation);
      }
    }

    return results
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      totalAttestations: this.attestations.size,
      usedNonces: this.usedNonces.size,
      nullifierHashes: this.nullifierHashes.size,
      employersWithPolicies: this.employerPolicies.size,
      oldestAttestation: this.getOldestAttestationDate(),
      newestAttestation: this.getNewestAttestationDate()
    };
  }

  /**
   * Get oldest attestation date
   */
  getOldestAttestationDate() {
    let oldest = null;
    for (const attestation of this.attestations.values()) {
      if (!oldest || attestation.timestamp < oldest) {
        oldest = attestation.timestamp;
      }
    }
    return oldest;
  }

  /**
   * Get newest attestation date
   */
  getNewestAttestationDate() {
    let newest = null;
    for (const attestation of this.attestations.values()) {
      if (!newest || attestation.timestamp > newest) {
        newest = attestation.timestamp;
      }
    }
    return newest;
  }
}

module.exports = {
  AttestationValidator
};