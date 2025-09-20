/**
 * Stream Protocol Employer Key Management Service
 * Handles ECDSA key pairs, signature generation, and HSM simulation
 */

const crypto = require('crypto');
const secp256k1 = require('secp256k1');
const { v4: uuidv4 } = require('uuid');

/**
 * Simulated Hardware Security Module for key protection
 */
class MockHSM {
  constructor() {
    this.keys = new Map(); // In production, this would be actual HSM
    this.accessLog = [];
  }

  /**
   * Generate new ECDSA key pair
   */
  generateKeyPair(employerId) {
    let privateKey;
    do {
      privateKey = crypto.randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privateKey));

    const publicKey = secp256k1.publicKeyCreate(privateKey, false);

    const keyData = {
      employerId,
      privateKey: privateKey.toString('hex'),
      publicKey: publicKey.toString('hex'),
      created: new Date(),
      lastUsed: null,
      signatureCount: 0
    };

    this.keys.set(employerId, keyData);
    this.logAccess(employerId, 'KEY_GENERATION');

    return {
      employerId,
      publicKey: publicKey.toString('hex'),
      keyId: this.getKeyId(publicKey)
    };
  }

  /**
   * Sign data with employer's private key
   */
  sign(employerId, dataHash) {
    const keyData = this.keys.get(employerId);
    if (!keyData) {
      throw new Error(`No key found for employer: ${employerId}`);
    }

    const privateKeyBuffer = Buffer.from(keyData.privateKey, 'hex');
    const messageHash = Buffer.from(dataHash, 'hex');

    const signature = secp256k1.ecdsaSign(messageHash, privateKeyBuffer);

    // Update usage statistics
    keyData.lastUsed = new Date();
    keyData.signatureCount += 1;
    this.logAccess(employerId, 'SIGNATURE');

    return {
      signature: signature.signature.toString('hex'),
      recovery: signature.recovery,
      signatureCount: keyData.signatureCount
    };
  }

  /**
   * Get public key for employer
   */
  getPublicKey(employerId) {
    const keyData = this.keys.get(employerId);
    if (!keyData) {
      throw new Error(`No key found for employer: ${employerId}`);
    }

    this.logAccess(employerId, 'PUBLIC_KEY_ACCESS');
    return keyData.publicKey;
  }

  /**
   * Verify signature
   */
  verifySignature(publicKey, signature, dataHash) {
    try {
      const publicKeyBuffer = Buffer.from(publicKey, 'hex');
      const signatureBuffer = Buffer.from(signature, 'hex');
      const messageHash = Buffer.from(dataHash, 'hex');

      return secp256k1.ecdsaVerify(signatureBuffer, messageHash, publicKeyBuffer);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate unique key identifier
   */
  getKeyId(publicKey) {
    const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    return crypto.createHash('sha256').update(publicKeyBuffer).digest('hex').substring(0, 16);
  }

  /**
   * Log access for security auditing
   */
  logAccess(employerId, operation) {
    this.accessLog.push({
      employerId,
      operation,
      timestamp: new Date(),
      requestId: uuidv4()
    });
  }

  /**
   * Get key statistics for monitoring
   */
  getKeyStats(employerId) {
    const keyData = this.keys.get(employerId);
    if (!keyData) {
      return null;
    }

    return {
      employerId,
      created: keyData.created,
      lastUsed: keyData.lastUsed,
      signatureCount: keyData.signatureCount,
      keyAge: Date.now() - keyData.created.getTime(),
      isActive: keyData.lastUsed && (Date.now() - keyData.lastUsed.getTime()) < (30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }

  /**
   * List all registered employers
   */
  listEmployers() {
    return Array.from(this.keys.keys());
  }

  /**
   * Get access logs for auditing
   */
  getAccessLogs(employerId = null, limit = 100) {
    let logs = this.accessLog;

    if (employerId) {
      logs = logs.filter(log => log.employerId === employerId);
    }

    return logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

/**
 * Employer Key Management Service
 */
class EmployerKeyManager {
  constructor() {
    this.hsm = new MockHSM();
    this.rateLimits = new Map(); // Rate limiting per employer
  }

  /**
   * Register new employer with key generation
   */
  registerEmployer(employerData) {
    const {
      companyName,
      domain,
      employeeCount,
      payrollFrequency,
      contactEmail
    } = employerData;

    const employerId = this.generateEmployerId(companyName, domain);

    // Generate key pair
    const keyInfo = this.hsm.generateKeyPair(employerId);

    // Initialize rate limiting
    this.rateLimits.set(employerId, {
      signatureCount: 0,
      lastReset: Date.now(),
      dailyLimit: Math.min(1000, employeeCount * 10) // 10 attestations per employee per day max
    });

    return {
      employerId,
      companyName,
      domain,
      publicKey: keyInfo.publicKey,
      keyId: keyInfo.keyId,
      employeeCount,
      payrollFrequency,
      contactEmail,
      registeredAt: new Date(),
      verificationStatus: 'pending',
      dailyAttestationLimit: this.rateLimits.get(employerId).dailyLimit
    };
  }

  /**
   * Sign wage attestation
   */
  signAttestation(employerId, attestation) {
    // Check rate limits
    if (!this.checkRateLimit(employerId)) {
      throw new Error('Daily attestation limit exceeded');
    }

    // Get signing hash from attestation
    const signingHash = attestation.getSigningHash();

    // Sign with HSM
    const signatureData = this.hsm.sign(employerId, signingHash);

    // Update rate limiting
    this.updateRateLimit(employerId);

    // Set signature on attestation
    attestation.signature = signatureData.signature;

    return {
      attestation,
      signatureInfo: {
        algorithm: 'ECDSA-secp256k1',
        signature: signatureData.signature,
        recovery: signatureData.recovery,
        signingHash,
        signatureCount: signatureData.signatureCount,
        timestamp: new Date()
      }
    };
  }

  /**
   * Verify attestation signature
   */
  verifyAttestation(attestation, employerId = null) {
    try {
      const signingHash = attestation.getSigningHash();

      // If employerId provided, get public key from HSM
      let publicKey;
      if (employerId) {
        publicKey = this.hsm.getPublicKey(employerId);
      } else {
        // Would need to look up employer by attestation in production
        throw new Error('Employer ID required for verification');
      }

      return this.hsm.verifySignature(publicKey, attestation.signature, signingHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate employer ID from company data
   */
  generateEmployerId(companyName, domain) {
    const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedDomain = domain ? domain.toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
    const combined = `${normalizedName}_${normalizedDomain}_${Date.now()}`;

    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
  }

  /**
   * Check if employer can create more attestations today
   */
  checkRateLimit(employerId) {
    const limits = this.rateLimits.get(employerId);
    if (!limits) {
      return false;
    }

    const now = Date.now();
    const daysSinceReset = Math.floor((now - limits.lastReset) / (24 * 60 * 60 * 1000));

    // Reset daily counter if new day
    if (daysSinceReset >= 1) {
      limits.signatureCount = 0;
      limits.lastReset = now;
    }

    return limits.signatureCount < limits.dailyLimit;
  }

  /**
   * Update rate limiting after successful signature
   */
  updateRateLimit(employerId) {
    const limits = this.rateLimits.get(employerId);
    if (limits) {
      limits.signatureCount += 1;
    }
  }

  /**
   * Get employer information
   */
  getEmployerInfo(employerId) {
    const keyStats = this.hsm.getKeyStats(employerId);
    const rateLimits = this.rateLimits.get(employerId);

    if (!keyStats || !rateLimits) {
      return null;
    }

    return {
      employerId,
      keyStats,
      rateLimits: {
        dailyLimit: rateLimits.dailyLimit,
        remainingToday: rateLimits.dailyLimit - rateLimits.signatureCount,
        usedToday: rateLimits.signatureCount,
        lastReset: new Date(rateLimits.lastReset)
      }
    };
  }

  /**
   * List all registered employers
   */
  listEmployers() {
    return this.hsm.listEmployers().map(employerId => this.getEmployerInfo(employerId));
  }

  /**
   * Get security audit logs
   */
  getAuditLogs(employerId = null, limit = 100) {
    return this.hsm.getAccessLogs(employerId, limit);
  }
}

module.exports = {
  EmployerKeyManager,
  MockHSM
};