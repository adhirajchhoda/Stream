/**
 * Stream Protocol Attestation Service Routes
 * Main routing configuration for the attestation API
 */

const express = require('express');
const { AttestationController } = require('../controllers/AttestationController');
const { EmployerController } = require('../controllers/EmployerController');
const { rateLimitMiddleware, authMiddleware, validationMiddleware } = require('../middleware');

const router = express.Router();

// Initialize controllers
const attestationController = new AttestationController();
const employerController = new EmployerController();

// =============================================================================
// HEALTH CHECK AND STATUS
// =============================================================================

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'stream-attestation-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/status', (req, res) => {
  const stats = attestationController.validator.getValidationStats();
  const employers = employerController.keyManager.listEmployers();

  res.json({
    service: 'stream-attestation-service',
    status: 'operational',
    statistics: {
      ...stats,
      activeEmployers: employers.filter(emp => emp.keyStats.isActive).length,
      totalEmployers: employers.length
    },
    features: {
      attestationCreation: true,
      signatureVerification: true,
      antiReplayProtection: true,
      zkpCompatibility: true,
      rateLimiting: true
    },
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// EMPLOYER MANAGEMENT ROUTES
// =============================================================================

router.post('/employers/register',
  rateLimitMiddleware.employerRegistration,
  validationMiddleware.employerRegistration,
  (req, res) => employerController.registerEmployer(req, res)
);

router.get('/employers',
  rateLimitMiddleware.standard,
  (req, res) => employerController.listEmployers(req, res)
);

router.get('/employers/:employerId',
  rateLimitMiddleware.standard,
  authMiddleware.employerAccess,
  (req, res) => employerController.getEmployer(req, res)
);

router.get('/employers/:employerId/public-key',
  rateLimitMiddleware.standard,
  (req, res) => employerController.getPublicKey(req, res)
);

router.get('/employers/:employerId/stats',
  rateLimitMiddleware.standard,
  authMiddleware.employerAccess,
  (req, res) => employerController.getEmployerStats(req, res)
);

router.get('/employers/:employerId/audit',
  rateLimitMiddleware.restricted,
  authMiddleware.employerAccess,
  (req, res) => employerController.getEmployerAudit(req, res)
);

router.post('/employers/:employerId/test-key',
  rateLimitMiddleware.restricted,
  authMiddleware.employerAccess,
  (req, res) => employerController.testEmployerKey(req, res)
);

// =============================================================================
// ATTESTATION MANAGEMENT ROUTES
// =============================================================================

router.post('/attestations',
  rateLimitMiddleware.attestationCreation,
  authMiddleware.employerAccess,
  validationMiddleware.attestationCreation,
  (req, res) => attestationController.createAttestation(req, res)
);

router.get('/attestations/:attestationId',
  rateLimitMiddleware.standard,
  (req, res) => attestationController.getAttestation(req, res)
);

router.get('/attestations/employee/:employeeWallet',
  rateLimitMiddleware.standard,
  (req, res) => attestationController.getEmployeeAttestations(req, res)
);

router.post('/attestations/:attestationId/verify',
  rateLimitMiddleware.verification,
  validationMiddleware.attestationVerification,
  (req, res) => attestationController.verifyAttestation(req, res)
);

router.get('/attestations/:attestationId/zkp',
  rateLimitMiddleware.standard,
  (req, res) => attestationController.getZKPData(req, res)
);

router.post('/attestations/batch-verify',
  rateLimitMiddleware.batchOperations,
  validationMiddleware.batchVerification,
  (req, res) => attestationController.batchVerifyAttestations(req, res)
);

router.get('/attestations/stats',
  rateLimitMiddleware.standard,
  (req, res) => attestationController.getStatistics(req, res)
);

// =============================================================================
// NULLIFIER MANAGEMENT ROUTES
// =============================================================================

router.get('/nullifiers/:nullifierHash',
  rateLimitMiddleware.standard,
  (req, res) => attestationController.checkNullifier(req, res)
);

// =============================================================================
// UTILITY AND DEVELOPMENT ROUTES
// =============================================================================

router.get('/utils/canonical-test',
  rateLimitMiddleware.standard,
  (req, res) => {
    const { JSONCanonicalizer } = require('../utils/JSONCanonicalizer');

    try {
      const testVectors = JSONCanonicalizer.generateTestVectors();
      res.json({
        description: 'JSON canonicalization test vectors',
        testVectors,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate test vectors',
        message: error.message
      });
    }
  }
);

router.post('/utils/validate-attestation',
  rateLimitMiddleware.standard,
  (req, res) => {
    const { WageAttestation } = require('../models/WageAttestation');

    try {
      const attestation = new WageAttestation(req.body);
      const validation = attestation.validate();

      res.json({
        isValid: validation.isValid,
        errors: validation.errors,
        attestationData: attestation.toJSON(),
        canonicalHash: attestation.getSigningHash()
      });
    } catch (error) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }
  }
);

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Handle 404s
router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /status',
      'POST /employers/register',
      'GET /employers',
      'POST /attestations',
      'GET /attestations/:id',
      'POST /attestations/:id/verify',
      'GET /nullifiers/:hash'
    ]
  });
});

// Global error handler
router.use((error, req, res, next) => {
  console.error('API Error:', error);

  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: error.message,
      retryAfter: error.headers['Retry-After']
    });
  }

  // Validation errors
  if (error.type === 'validation') {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message,
      details: error.details
    });
  }

  // Authentication errors
  if (error.status === 401) {
    return res.status(401).json({
      error: 'Authentication required',
      message: error.message
    });
  }

  // Authorization errors
  if (error.status === 403) {
    return res.status(403).json({
      error: 'Access denied',
      message: error.message
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    requestId: req.id || 'unknown'
  });
});

module.exports = router;