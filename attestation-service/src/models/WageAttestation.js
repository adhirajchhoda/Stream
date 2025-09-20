/**
 * Stream Protocol Wage Attestation Model
 * Defines the structure and validation for employer wage attestations
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * WageAttestation class representing a digitally signed wage verification
 */
class WageAttestation {
  constructor(data) {
    this.employerId = data.employerId;
    this.employeeWallet = data.employeeWallet;
    this.wageAmount = data.wageAmount; // In USD cents
    this.periodStart = new Date(data.periodStart);
    this.periodEnd = new Date(data.periodEnd);
    this.hoursWorked = data.hoursWorked;
    this.hourlyRate = data.hourlyRate; // In USD cents per hour
    this.periodNonce = data.periodNonce || this.generatePeriodNonce();
    this.timestamp = new Date(data.timestamp || Date.now());
    this.signature = data.signature || null;
    this.attestationId = data.attestationId || uuidv4();
  }

  /**
   * Generate a unique period nonce to prevent replay attacks
   */
  generatePeriodNonce() {
    const periodKey = `${this.employerId}_${this.employeeWallet}_${this.periodStart.getTime()}_${this.periodEnd.getTime()}`;
    return crypto.createHash('sha256').update(periodKey).digest('hex').substring(0, 16);
  }

  /**
   * Validate attestation data integrity
   */
  validate() {
    const errors = [];

    // Required field validation
    if (!this.employerId) errors.push('employerId is required');
    if (!this.employeeWallet) errors.push('employeeWallet is required');
    if (typeof this.wageAmount !== 'number' || this.wageAmount <= 0) {
      errors.push('wageAmount must be a positive number');
    }
    if (!this.periodStart || isNaN(this.periodStart.getTime())) {
      errors.push('periodStart must be a valid date');
    }
    if (!this.periodEnd || isNaN(this.periodEnd.getTime())) {
      errors.push('periodEnd must be a valid date');
    }
    if (typeof this.hoursWorked !== 'number' || this.hoursWorked <= 0) {
      errors.push('hoursWorked must be a positive number');
    }
    if (typeof this.hourlyRate !== 'number' || this.hourlyRate <= 0) {
      errors.push('hourlyRate must be a positive number');
    }

    // Wallet address format validation (Ethereum address)
    if (this.employeeWallet && !/^0x[a-fA-F0-9]{40}$/.test(this.employeeWallet)) {
      errors.push('employeeWallet must be a valid Ethereum address');
    }

    // Period validation
    if (this.periodStart && this.periodEnd && this.periodStart >= this.periodEnd) {
      errors.push('periodStart must be before periodEnd');
    }

    // Wage calculation validation (amount = hours × rate)
    const expectedAmount = Math.round(this.hoursWorked * this.hourlyRate);
    const tolerance = Math.max(1, Math.round(expectedAmount * 0.01)); // 1% tolerance or 1 cent minimum

    if (Math.abs(this.wageAmount - expectedAmount) > tolerance) {
      errors.push(`wageAmount (${this.wageAmount}) does not match hoursWorked × hourlyRate (${expectedAmount})`);
    }

    // Future date validation
    if (this.periodEnd > new Date()) {
      errors.push('periodEnd cannot be in the future');
    }

    // Reasonable work period validation (max 4 weeks)
    const maxPeriodMs = 28 * 24 * 60 * 60 * 1000; // 28 days
    if (this.periodEnd - this.periodStart > maxPeriodMs) {
      errors.push('work period cannot exceed 28 days');
    }

    // Reasonable hourly rate validation ($1 to $500 per hour)
    if (this.hourlyRate < 100 || this.hourlyRate > 50000) {
      errors.push('hourlyRate must be between $1.00 and $500.00 per hour');
    }

    // Maximum hours per day validation (24 hours)
    const periodDays = Math.ceil((this.periodEnd - this.periodStart) / (24 * 60 * 60 * 1000));
    const maxHours = periodDays * 24;
    if (this.hoursWorked > maxHours) {
      errors.push(`hoursWorked (${this.hoursWorked}) exceeds maximum possible hours for period (${maxHours})`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get canonical JSON representation for signing
   * Ensures consistent ordering and formatting for ECDSA signatures
   */
  getCanonicalData() {
    return {
      employerId: this.employerId,
      employeeWallet: this.employeeWallet.toLowerCase(),
      wageAmount: this.wageAmount,
      periodStart: this.periodStart.toISOString(),
      periodEnd: this.periodEnd.toISOString(),
      hoursWorked: this.hoursWorked,
      hourlyRate: this.hourlyRate,
      periodNonce: this.periodNonce,
      timestamp: this.timestamp.toISOString()
    };
  }

  /**
   * Generate hash for signing
   */
  getSigningHash() {
    const canonicalData = this.getCanonicalData();
    const dataString = JSON.stringify(canonicalData, Object.keys(canonicalData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Check if attestation is expired (7-day validity)
   */
  isExpired() {
    const expiryTime = new Date(this.timestamp.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    return new Date() > expiryTime;
  }

  /**
   * Get attestation suitable for ZKP circuit input
   */
  getZKPFormat() {
    return {
      employerId: this.employerId,
      employeeWallet: this.employeeWallet,
      wageAmount: this.wageAmount.toString(),
      periodNonce: this.periodNonce,
      attestationHash: this.getSigningHash(),
      signature: this.signature
    };
  }

  /**
   * Convert to JSON representation
   */
  toJSON() {
    return {
      attestationId: this.attestationId,
      employerId: this.employerId,
      employeeWallet: this.employeeWallet,
      wageAmount: this.wageAmount,
      periodStart: this.periodStart.toISOString(),
      periodEnd: this.periodEnd.toISOString(),
      hoursWorked: this.hoursWorked,
      hourlyRate: this.hourlyRate,
      periodNonce: this.periodNonce,
      timestamp: this.timestamp.toISOString(),
      signature: this.signature,
      isExpired: this.isExpired(),
      signingHash: this.getSigningHash()
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data) {
    return new WageAttestation(data);
  }
}

/**
 * Employment type configurations for simulation
 */
const EMPLOYMENT_TYPES = {
  HOURLY: {
    name: 'Hourly Worker',
    rateRange: [1500, 3500], // $15-35/hour in cents
    hoursRange: [4, 12], // 4-12 hour shifts
    periodType: 'shift'
  },
  SALARY: {
    name: 'Salaried Employee',
    rateRange: [2500, 5000], // $25-50/hour equivalent in cents
    hoursRange: [8, 10], // Standard work day
    periodType: 'daily'
  },
  GIG: {
    name: 'Gig Worker',
    rateRange: [1200, 4000], // $12-40/hour in cents
    hoursRange: [2, 16], // Variable gig work
    periodType: 'flexible'
  },
  PART_TIME: {
    name: 'Part-time Worker',
    rateRange: [1500, 2500], // $15-25/hour in cents
    hoursRange: [4, 6], // Part-time shifts
    periodType: 'shift'
  }
};

module.exports = {
  WageAttestation,
  EMPLOYMENT_TYPES
};