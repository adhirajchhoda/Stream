/**
 * Stream Protocol Employer Controller
 * Handles employer registration, key management, and attestation requests
 */

const { EmployerKeyManager } = require('../services/EmployerKeyManager');

class EmployerController {
  constructor() {
    this.keyManager = new EmployerKeyManager();
  }

  /**
   * Register new employer
   * POST /api/v1/employers/register
   */
  async registerEmployer(req, res) {
    try {
      const {
        companyName,
        domain,
        employeeCount,
        payrollFrequency,
        contactEmail,
        integrationType = 'API'
      } = req.body;

      // Validate required fields
      if (!companyName || !domain || !contactEmail) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['companyName', 'domain', 'contactEmail']
        });
      }

      // Register employer
      const employerInfo = this.keyManager.registerEmployer({
        companyName,
        domain,
        employeeCount: parseInt(employeeCount) || 1,
        payrollFrequency,
        contactEmail
      });

      const response = {
        employerId: employerInfo.employerId,
        companyName: employerInfo.companyName,
        domain: employerInfo.domain,
        publicKey: employerInfo.publicKey,
        keyId: employerInfo.keyId,
        verificationStatus: 'pending',
        dailyAttestationLimit: employerInfo.dailyAttestationLimit,
        integrationType,
        registeredAt: employerInfo.registeredAt.toISOString(),
        nextSteps: [
          'Complete domain verification',
          'Upload business verification documents',
          'Configure webhook endpoints (optional)',
          'Begin creating wage attestations'
        ]
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Employer registration error:', error);
      res.status(500).json({
        error: 'Failed to register employer',
        message: error.message
      });
    }
  }

  /**
   * Get employer information
   * GET /api/v1/employers/:employerId
   */
  async getEmployer(req, res) {
    try {
      const { employerId } = req.params;

      const employerInfo = this.keyManager.getEmployerInfo(employerId);
      if (!employerInfo) {
        return res.status(404).json({
          error: 'Employer not found',
          employerId
        });
      }

      const response = {
        employerId,
        keyStatistics: employerInfo.keyStats,
        rateLimiting: employerInfo.rateLimits,
        status: 'active',
        lastActivity: employerInfo.keyStats.lastUsed
      };

      res.json(response);

    } catch (error) {
      console.error('Employer retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve employer',
        message: error.message
      });
    }
  }

  /**
   * List all registered employers
   * GET /api/v1/employers
   */
  async listEmployers(req, res) {
    try {
      const { limit = 50, offset = 0, active = true } = req.query;

      const allEmployers = this.keyManager.listEmployers();

      let filteredEmployers = allEmployers;
      if (active === 'true') {
        filteredEmployers = allEmployers.filter(emp => emp.keyStats.isActive);
      }

      const paginatedEmployers = filteredEmployers.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );

      const response = {
        total: filteredEmployers.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        employers: paginatedEmployers.map(emp => ({
          employerId: emp.employerId,
          keyAge: emp.keyStats.keyAge,
          signatureCount: emp.keyStats.signatureCount,
          lastUsed: emp.keyStats.lastUsed,
          isActive: emp.keyStats.isActive,
          dailyUsage: emp.rateLimits.usedToday,
          dailyLimit: emp.rateLimits.dailyLimit
        }))
      };

      res.json(response);

    } catch (error) {
      console.error('Employer listing error:', error);
      res.status(500).json({
        error: 'Failed to list employers',
        message: error.message
      });
    }
  }

  /**
   * Get employer's public key
   * GET /api/v1/employers/:employerId/public-key
   */
  async getPublicKey(req, res) {
    try {
      const { employerId } = req.params;

      const publicKey = this.keyManager.hsm.getPublicKey(employerId);
      const keyId = this.keyManager.hsm.getKeyId(publicKey);

      const response = {
        employerId,
        publicKey,
        keyId,
        algorithm: 'ECDSA-secp256k1',
        keyUsage: ['digital_signature', 'wage_attestation'],
        retrievedAt: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('Public key retrieval error:', error);

      if (error.message.includes('No key found')) {
        return res.status(404).json({
          error: 'Employer not found',
          employerId: req.params.employerId
        });
      }

      res.status(500).json({
        error: 'Failed to retrieve public key',
        message: error.message
      });
    }
  }

  /**
   * Get employer's usage statistics
   * GET /api/v1/employers/:employerId/stats
   */
  async getEmployerStats(req, res) {
    try {
      const { employerId } = req.params;
      const { timeframe = '30d' } = req.query;

      const employerInfo = this.keyManager.getEmployerInfo(employerId);
      if (!employerInfo) {
        return res.status(404).json({
          error: 'Employer not found',
          employerId
        });
      }

      // Get audit logs for activity analysis
      const auditLogs = this.keyManager.getAuditLogs(employerId, 1000);

      // Calculate statistics
      const now = Date.now();
      const timeframeMs = this.parseTimeframe(timeframe);
      const cutoffTime = now - timeframeMs;

      const recentLogs = auditLogs.filter(log => log.timestamp.getTime() > cutoffTime);
      const signatureLogs = recentLogs.filter(log => log.operation === 'SIGNATURE');

      const response = {
        employerId,
        timeframe,
        summary: {
          totalSignatures: employerInfo.keyStats.signatureCount,
          signaturesInPeriod: signatureLogs.length,
          dailyAverage: Math.round(signatureLogs.length / (timeframeMs / (24 * 60 * 60 * 1000))),
          lastActivity: employerInfo.keyStats.lastUsed,
          accountAge: now - employerInfo.keyStats.created.getTime(),
          isActive: employerInfo.keyStats.isActive
        },
        usage: {
          dailyUsed: employerInfo.rateLimits.usedToday,
          dailyLimit: employerInfo.rateLimits.dailyLimit,
          dailyRemaining: employerInfo.rateLimits.remainingToday,
          utilizationRate: employerInfo.rateLimits.usedToday / employerInfo.rateLimits.dailyLimit
        },
        activityPattern: this.analyzeActivityPattern(signatureLogs),
        generatedAt: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('Employer stats error:', error);
      res.status(500).json({
        error: 'Failed to generate employer statistics',
        message: error.message
      });
    }
  }

  /**
   * Get employer's audit logs
   * GET /api/v1/employers/:employerId/audit
   */
  async getEmployerAudit(req, res) {
    try {
      const { employerId } = req.params;
      const { limit = 100, operation } = req.query;

      let auditLogs = this.keyManager.getAuditLogs(employerId, parseInt(limit));

      // Filter by operation type if specified
      if (operation) {
        auditLogs = auditLogs.filter(log => log.operation === operation.toUpperCase());
      }

      const response = {
        employerId,
        total: auditLogs.length,
        limit: parseInt(limit),
        filters: operation ? { operation } : {},
        logs: auditLogs.map(log => ({
          requestId: log.requestId,
          operation: log.operation,
          timestamp: log.timestamp.toISOString(),
          timeAgo: this.getTimeAgo(log.timestamp)
        })),
        operations: ['KEY_GENERATION', 'SIGNATURE', 'PUBLIC_KEY_ACCESS'],
        retrievedAt: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('Employer audit error:', error);
      res.status(500).json({
        error: 'Failed to retrieve audit logs',
        message: error.message
      });
    }
  }

  /**
   * Test employer key functionality
   * POST /api/v1/employers/:employerId/test-key
   */
  async testEmployerKey(req, res) {
    try {
      const { employerId } = req.params;
      const { testData = 'Stream Protocol Key Test' } = req.body;

      // Create test hash
      const crypto = require('crypto');
      const testHash = crypto.createHash('sha256').update(testData).digest('hex');

      // Test signing
      const signatureResult = this.keyManager.hsm.sign(employerId, testHash);

      // Test verification
      const publicKey = this.keyManager.hsm.getPublicKey(employerId);
      const isValid = this.keyManager.hsm.verifySignature(publicKey, signatureResult.signature, testHash);

      const response = {
        employerId,
        testData,
        testHash,
        signature: signatureResult.signature,
        recovery: signatureResult.recovery,
        signatureCount: signatureResult.signatureCount,
        verification: {
          isValid,
          publicKey,
          algorithm: 'ECDSA-secp256k1'
        },
        testedAt: new Date().toISOString(),
        status: isValid ? 'SUCCESS' : 'FAILED'
      };

      res.json(response);

    } catch (error) {
      console.error('Key test error:', error);

      if (error.message.includes('No key found')) {
        return res.status(404).json({
          error: 'Employer not found',
          employerId: req.params.employerId
        });
      }

      res.status(500).json({
        error: 'Key test failed',
        message: error.message
      });
    }
  }

  /**
   * Parse timeframe string to milliseconds
   */
  parseTimeframe(timeframe) {
    const units = {
      'd': 24 * 60 * 60 * 1000,
      'h': 60 * 60 * 1000,
      'm': 60 * 1000
    };

    const match = timeframe.match(/^(\d+)([dhm])$/);
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000; // Default to 30 days
    }

    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * Analyze activity patterns from audit logs
   */
  analyzeActivityPattern(logs) {
    if (logs.length === 0) {
      return { pattern: 'no_activity', confidence: 1.0 };
    }

    // Group by hour of day
    const hourlyActivity = new Array(24).fill(0);
    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      hourlyActivity[hour]++;
    });

    // Find peak hours
    const maxActivity = Math.max(...hourlyActivity);
    const peakHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count === maxActivity)
      .map(({ hour }) => hour);

    // Determine pattern
    let pattern = 'irregular';
    if (peakHours.some(hour => hour >= 9 && hour <= 17)) {
      pattern = 'business_hours';
    } else if (peakHours.some(hour => hour >= 18 || hour <= 6)) {
      pattern = 'after_hours';
    }

    return {
      pattern,
      peakHours,
      hourlyDistribution: hourlyActivity,
      totalActivity: logs.length,
      averagePerHour: logs.length / 24
    };
  }

  /**
   * Get human-readable time ago
   */
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toISOString().split('T')[0];
  }
}

module.exports = { EmployerController };