/**
 * Stream Protocol Attestation Controller
 * Handles HTTP requests for attestation creation, retrieval, and management
 */

const { WageAttestation } = require('../models/WageAttestation');
const { EmployerKeyManager } = require('../services/EmployerKeyManager');
const { AttestationValidator } = require('../services/AttestationValidator');
const { JSONCanonicalizer } = require('../utils/JSONCanonicalizer');

class AttestationController {
  constructor() {
    this.keyManager = new EmployerKeyManager();
    this.validator = new AttestationValidator();
  }

  /**
   * Create a new wage attestation
   * POST /api/v1/attestations
   */
  async createAttestation(req, res) {
    try {
      const {
        employerId,
        employeeWallet,
        wageAmount,
        periodStart,
        periodEnd,
        hoursWorked,
        hourlyRate,
        periodNonce
      } = req.body;

      // Create attestation object
      const attestation = new WageAttestation({
        employerId,
        employeeWallet,
        wageAmount,
        periodStart,
        periodEnd,
        hoursWorked,
        hourlyRate,
        periodNonce
      });

      // Validate attestation
      const validation = await this.validator.validateAttestation(attestation, employerId);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Attestation validation failed',
          details: validation.errors,
          warnings: validation.warnings,
          securityFlags: validation.securityFlags
        });
      }

      // Sign attestation
      const signatureResult = this.keyManager.signAttestation(employerId, attestation);

      // Store attestation
      const storageResult = this.validator.storeAttestation(attestation);

      // Prepare response
      const response = {
        attestationId: attestation.attestationId,
        attestation: attestation.toJSON(),
        signature: signatureResult.signatureInfo,
        nullifierHash: storageResult.nullifierHash,
        validation: {
          warnings: validation.warnings,
          securityFlags: validation.securityFlags
        },
        zkpCompatible: true,
        expiresAt: new Date(attestation.timestamp.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
        createdAt: storageResult.storedAt.toISOString()
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Attestation creation error:', error);
      res.status(500).json({
        error: 'Failed to create attestation',
        message: error.message
      });
    }
  }

  /**
   * Get attestation by ID
   * GET /api/v1/attestations/:attestationId
   */
  async getAttestation(req, res) {
    try {
      const { attestationId } = req.params;

      const attestation = this.validator.getAttestation(attestationId);
      if (!attestation) {
        return res.status(404).json({
          error: 'Attestation not found',
          attestationId
        });
      }

      const response = {
        attestation: attestation.toJSON(),
        zkpFormat: attestation.getZKPFormat(),
        isExpired: attestation.isExpired(),
        canonicalData: JSONCanonicalizer.prepareAttestationForSigning(attestation)
      };

      res.json(response);

    } catch (error) {
      console.error('Attestation retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve attestation',
        message: error.message
      });
    }
  }

  /**
   * Get attestations for employee
   * GET /api/v1/attestations/employee/:employeeWallet
   */
  async getEmployeeAttestations(req, res) {
    try {
      const { employeeWallet } = req.params;
      const { employerId, limit = 50, offset = 0 } = req.query;

      const attestations = this.validator.getEmployeeAttestations(
        employeeWallet,
        employerId,
        parseInt(limit)
      );

      const paginatedAttestations = attestations.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );

      const response = {
        employeeWallet,
        employerId: employerId || 'all',
        total: attestations.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        attestations: paginatedAttestations.map(a => a.toJSON())
      };

      res.json(response);

    } catch (error) {
      console.error('Employee attestations retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve employee attestations',
        message: error.message
      });
    }
  }

  /**
   * Verify attestation signature
   * POST /api/v1/attestations/:attestationId/verify
   */
  async verifyAttestation(req, res) {
    try {
      const { attestationId } = req.params;
      const { employerId } = req.body;

      const attestation = this.validator.getAttestation(attestationId);
      if (!attestation) {
        return res.status(404).json({
          error: 'Attestation not found',
          attestationId
        });
      }

      const isValid = this.keyManager.verifyAttestation(attestation, employerId || attestation.employerId);
      const isExpired = attestation.isExpired();

      const response = {
        attestationId,
        isValid,
        isExpired,
        isUsable: isValid && !isExpired,
        signatureDetails: {
          algorithm: 'ECDSA-secp256k1',
          hash: attestation.getSigningHash(),
          signature: attestation.signature
        },
        verification: {
          timestamp: new Date().toISOString(),
          employerId: employerId || attestation.employerId
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Attestation verification error:', error);
      res.status(500).json({
        error: 'Failed to verify attestation',
        message: error.message
      });
    }
  }

  /**
   * Get ZKP-formatted attestation data
   * GET /api/v1/attestations/:attestationId/zkp
   */
  async getZKPData(req, res) {
    try {
      const { attestationId } = req.params;

      const attestation = this.validator.getAttestation(attestationId);
      if (!attestation) {
        return res.status(404).json({
          error: 'Attestation not found',
          attestationId
        });
      }

      if (attestation.isExpired()) {
        return res.status(400).json({
          error: 'Attestation has expired',
          expiresAt: new Date(attestation.timestamp.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString()
        });
      }

      const canonicalResult = JSONCanonicalizer.createSigningHash(attestation);
      const nullifierHash = this.validator.generateNullifierHash(attestation);

      const response = {
        attestationId,
        zkpInputs: {
          employerId: attestation.employerId,
          employeeWallet: attestation.employeeWallet,
          wageAmount: attestation.wageAmount.toString(),
          hoursWorked: attestation.hoursWorked.toString(),
          hourlyRate: attestation.hourlyRate.toString(),
          periodNonce: attestation.periodNonce,
          signature: attestation.signature,
          attestationHash: canonicalResult.hash
        },
        publicInputs: {
          nullifierHash,
          wageAmount: attestation.wageAmount.toString(),
          employerCommitment: this.keyManager.hsm.getPublicKey(attestation.employerId)
        },
        circuitCompatibility: {
          version: 'v1.0.0',
          maxWageAmount: '1000000', // $10,000
          supportedCurves: ['BN254'],
          constraints: 'optimized'
        },
        canonicalization: canonicalResult.metadata
      };

      res.json(response);

    } catch (error) {
      console.error('ZKP data generation error:', error);
      res.status(500).json({
        error: 'Failed to generate ZKP data',
        message: error.message
      });
    }
  }

  /**
   * Check if nullifier has been used
   * GET /api/v1/nullifiers/:nullifierHash
   */
  async checkNullifier(req, res) {
    try {
      const { nullifierHash } = req.params;

      const isUsed = this.validator.isNullifierUsed(nullifierHash);

      const response = {
        nullifierHash,
        isUsed,
        canUse: !isUsed,
        checkedAt: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('Nullifier check error:', error);
      res.status(500).json({
        error: 'Failed to check nullifier',
        message: error.message
      });
    }
  }

  /**
   * Get attestation statistics
   * GET /api/v1/attestations/stats
   */
  async getStatistics(req, res) {
    try {
      const { employerId, timeframe = '30d' } = req.query;

      const stats = this.validator.getValidationStats();
      const employerInfo = employerId ? this.keyManager.getEmployerInfo(employerId) : null;

      const response = {
        global: stats,
        employer: employerInfo,
        timeframe,
        generatedAt: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('Statistics generation error:', error);
      res.status(500).json({
        error: 'Failed to generate statistics',
        message: error.message
      });
    }
  }

  /**
   * Batch verify attestations
   * POST /api/v1/attestations/batch-verify
   */
  async batchVerifyAttestations(req, res) {
    try {
      const { attestationIds } = req.body;

      if (!Array.isArray(attestationIds) || attestationIds.length === 0) {
        return res.status(400).json({
          error: 'attestationIds must be a non-empty array'
        });
      }

      if (attestationIds.length > 100) {
        return res.status(400).json({
          error: 'Maximum 100 attestations can be verified at once'
        });
      }

      const results = [];

      for (const attestationId of attestationIds) {
        try {
          const attestation = this.validator.getAttestation(attestationId);
          if (!attestation) {
            results.push({
              attestationId,
              isValid: false,
              error: 'Attestation not found'
            });
            continue;
          }

          const isValid = this.keyManager.verifyAttestation(attestation, attestation.employerId);
          const isExpired = attestation.isExpired();

          results.push({
            attestationId,
            isValid,
            isExpired,
            isUsable: isValid && !isExpired,
            wageAmount: attestation.wageAmount,
            employerId: attestation.employerId
          });

        } catch (error) {
          results.push({
            attestationId,
            isValid: false,
            error: error.message
          });
        }
      }

      const summary = {
        total: results.length,
        valid: results.filter(r => r.isValid).length,
        expired: results.filter(r => r.isExpired).length,
        usable: results.filter(r => r.isUsable).length,
        errors: results.filter(r => r.error).length
      };

      const response = {
        summary,
        results,
        verifiedAt: new Date().toISOString()
      };

      res.json(response);

    } catch (error) {
      console.error('Batch verification error:', error);
      res.status(500).json({
        error: 'Failed to perform batch verification',
        message: error.message
      });
    }
  }
}

module.exports = { AttestationController };