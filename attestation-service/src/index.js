/**
 * Stream Protocol Attestation Service
 * Main application entry point
 */

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');
const { securityMiddleware, loggingMiddleware } = require('./middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Employer-Id', 'X-Api-Key', 'X-Timestamp', 'X-Nonce']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(securityMiddleware.requestId);
app.use(securityMiddleware.antiReplay);
app.use(securityMiddleware.sanitizeInput);

// Logging middleware
app.use(loggingMiddleware.requestLogger);

// =============================================================================
// ROUTES
// =============================================================================

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Stream Protocol Attestation Service',
    version: '1.0.0',
    description: 'Employer wage attestation service for ZK proof generation',
    endpoints: {
      health: '/health',
      status: '/status',
      api: '/api/v1',
      docs: '/docs'
    },
    features: [
      'ECDSA signature generation',
      'Wage attestation validation',
      'Anti-replay protection',
      'ZKP circuit compatibility',
      'Mock employer simulation',
      'Rate limiting',
      'JSON canonicalization'
    ],
    timestamp: new Date().toISOString()
  });
});

// Documentation endpoint
app.get('/docs', (req, res) => {
  res.json({
    title: 'Stream Protocol Attestation Service API',
    version: '1.0.0',
    description: 'REST API for employer wage attestations and ZK proof generation',
    baseUrl: `${req.protocol}://${req.get('host')}/api/v1`,
    endpoints: {
      employers: {
        'POST /employers/register': 'Register new employer',
        'GET /employers': 'List all employers',
        'GET /employers/:id': 'Get employer details',
        'GET /employers/:id/public-key': 'Get employer public key',
        'GET /employers/:id/stats': 'Get employer statistics',
        'POST /employers/:id/test-key': 'Test employer key functionality'
      },
      attestations: {
        'POST /attestations': 'Create wage attestation',
        'GET /attestations/:id': 'Get attestation details',
        'GET /attestations/employee/:wallet': 'Get employee attestations',
        'POST /attestations/:id/verify': 'Verify attestation signature',
        'GET /attestations/:id/zkp': 'Get ZKP-formatted data',
        'POST /attestations/batch-verify': 'Batch verify attestations'
      },
      utilities: {
        'GET /nullifiers/:hash': 'Check nullifier usage',
        'GET /utils/canonical-test': 'Test JSON canonicalization',
        'POST /utils/validate-attestation': 'Validate attestation format'
      }
    },
    authentication: {
      employerAccess: 'X-Employer-Id header required',
      apiKey: 'X-Api-Key header for production',
      rateLimiting: 'Various limits per endpoint type'
    },
    examples: {
      registerEmployer: {
        url: 'POST /api/v1/employers/register',
        body: {
          companyName: 'Example Corp',
          domain: 'example.com',
          employeeCount: 100,
          payrollFrequency: 'BIWEEKLY',
          contactEmail: 'payroll@example.com'
        }
      },
      createAttestation: {
        url: 'POST /api/v1/attestations',
        headers: { 'X-Employer-Id': 'employer_id_here' },
        body: {
          employerId: 'employer_id_here',
          employeeWallet: '0x742d35Cc6634C0532925a3b8D000B45f5c964C12',
          wageAmount: 50000,
          periodStart: '2024-01-01T09:00:00Z',
          periodEnd: '2024-01-01T17:00:00Z',
          hoursWorked: 8,
          hourlyRate: 6250
        }
      }
    }
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Error logging middleware
app.use(loggingMiddleware.errorLogger);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /status',
      'GET /docs',
      'POST /api/v1/employers/register',
      'GET /api/v1/employers',
      'POST /api/v1/attestations'
    ],
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    Stream Protocol                             ║
║              Attestation Service Started                      ║
╠════════════════════════════════════════════════════════════════╣
║ Port: ${PORT.toString().padEnd(56)} ║
║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(48)} ║
║ Timestamp: ${new Date().toISOString().padEnd(50)} ║
╠════════════════════════════════════════════════════════════════╣
║ Endpoints:                                                     ║
║   Health Check: http://localhost:${PORT}/health${' '.repeat(26)} ║
║   Status: http://localhost:${PORT}/status${' '.repeat(28)} ║
║   API Docs: http://localhost:${PORT}/docs${' '.repeat(30)} ║
║   API Base: http://localhost:${PORT}/api/v1${' '.repeat(26)} ║
╠════════════════════════════════════════════════════════════════╣
║ Features:                                                      ║
║   ✓ ECDSA Signature Generation                                 ║
║   ✓ Wage Attestation Validation                               ║
║   ✓ Anti-Replay Protection                                     ║
║   ✓ ZKP Circuit Compatibility                                  ║
║   ✓ Mock Employer Simulation                                   ║
║   ✓ Rate Limiting & Security                                   ║
║   ✓ JSON Canonicalization                                      ║
╚════════════════════════════════════════════════════════════════╝
  `);

  console.log('Stream Attestation Service is ready to process wage attestations! 🚀\n');
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;