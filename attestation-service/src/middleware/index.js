/**
 * Stream Protocol Attestation Service Middleware
 * Security, rate limiting, authentication, and validation middleware
 */

const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

/**
 * Rate limiting configurations for different endpoint types
 */
const rateLimitMiddleware = {
  // Standard API endpoints
  standard: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.ip + ':' + (req.headers['x-employer-id'] || 'anonymous');
    }
  }),

  // Attestation creation (more restrictive)
  attestationCreation: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 attestations per minute per employer
    message: {
      error: 'Attestation creation rate limit exceeded',
      message: 'Too many attestation creation requests, please slow down.',
      retryAfter: '1 minute'
    },
    keyGenerator: (req) => {
      return req.body.employerId || req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for test scenarios in development
      return process.env.NODE_ENV === 'development' && req.headers['x-test-scenario'];
    }
  }),

  // Signature verification
  verification: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 verifications per minute
    message: {
      error: 'Verification rate limit exceeded',
      message: 'Too many verification requests, please try again later.',
      retryAfter: '1 minute'
    }
  }),

  // Employer registration
  employerRegistration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registrations per hour per IP
    message: {
      error: 'Employer registration rate limit exceeded',
      message: 'Too many registration attempts, please try again later.',
      retryAfter: '1 hour'
    }
  }),

  // Batch operations
  batchOperations: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 batch operations per 5 minutes
    message: {
      error: 'Batch operation rate limit exceeded',
      message: 'Too many batch requests, please try again later.',
      retryAfter: '5 minutes'
    }
  }),

  // Restricted operations (auditing, stats)
  restricted: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: {
      error: 'Restricted operation rate limit exceeded',
      message: 'Too many requests for this restricted endpoint.',
      retryAfter: '1 minute'
    }
  })
};

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Authentication middleware for different access levels
 */
const authMiddleware = {
  // Employer access (requires employer ID in headers or body)
  employerAccess: (req, res, next) => {
    const employerId = req.headers['x-employer-id'] ||
                      req.body.employerId ||
                      req.params.employerId;

    if (!employerId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Employer ID must be provided in headers, body, or URL parameters',
        header: 'X-Employer-Id'
      });
    }

    // In production, verify employer exists and has valid API key
    // For simulation, we allow any employer ID that follows the pattern
    if (!/^[a-f0-9]{16}$/.test(employerId)) {
      return res.status(401).json({
        error: 'Invalid employer ID format',
        message: 'Employer ID must be a 16-character hexadecimal string'
      });
    }

    req.employerId = employerId;
    next();
  },

  // API key authentication (for production integration)
  apiKey: (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'X-Api-Key header must be provided',
        header: 'X-Api-Key'
      });
    }

    // In production, validate API key against database
    // For simulation, we accept any key starting with 'sk_'
    if (!apiKey.startsWith('sk_')) {
      return res.status(401).json({
        error: 'Invalid API key format',
        message: 'API key must start with sk_'
      });
    }

    req.apiKey = apiKey;
    next();
  },

  // Admin access (for internal operations)
  admin: (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];

    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'Valid admin key required for this operation'
      });
    }

    req.isAdmin = true;
    next();
  }
};

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Request validation middleware
 */
const validationMiddleware = {
  // Employer registration validation
  employerRegistration: (req, res, next) => {
    const { companyName, domain, contactEmail } = req.body;
    const errors = [];

    if (!companyName || typeof companyName !== 'string' || companyName.length < 2) {
      errors.push('companyName must be a string with at least 2 characters');
    }

    if (!domain || typeof domain !== 'string' || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      errors.push('domain must be a valid domain name');
    }

    if (!contactEmail || typeof contactEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      errors.push('contactEmail must be a valid email address');
    }

    if (req.body.employeeCount && (!Number.isInteger(req.body.employeeCount) || req.body.employeeCount < 1)) {
      errors.push('employeeCount must be a positive integer');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Request body contains invalid data',
        details: errors
      });
    }

    next();
  },

  // Attestation creation validation
  attestationCreation: (req, res, next) => {
    const {
      employerId,
      employeeWallet,
      wageAmount,
      periodStart,
      periodEnd,
      hoursWorked,
      hourlyRate
    } = req.body;

    const errors = [];

    if (!employerId || typeof employerId !== 'string') {
      errors.push('employerId is required and must be a string');
    }

    if (!employeeWallet || !/^0x[a-fA-F0-9]{40}$/.test(employeeWallet)) {
      errors.push('employeeWallet must be a valid Ethereum address');
    }

    if (!Number.isFinite(wageAmount) || wageAmount <= 0) {
      errors.push('wageAmount must be a positive number');
    }

    if (!periodStart || isNaN(new Date(periodStart).getTime())) {
      errors.push('periodStart must be a valid date');
    }

    if (!periodEnd || isNaN(new Date(periodEnd).getTime())) {
      errors.push('periodEnd must be a valid date');
    }

    if (periodStart && periodEnd && new Date(periodStart) >= new Date(periodEnd)) {
      errors.push('periodStart must be before periodEnd');
    }

    if (!Number.isFinite(hoursWorked) || hoursWorked <= 0) {
      errors.push('hoursWorked must be a positive number');
    }

    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      errors.push('hourlyRate must be a positive number');
    }

    // Business logic validations
    if (hoursWorked > 168) { // More than hours in a week
      errors.push('hoursWorked cannot exceed 168 hours (1 week)');
    }

    if (hourlyRate > 50000) { // More than $500/hour
      errors.push('hourlyRate cannot exceed 50000 cents ($500/hour)');
    }

    if (wageAmount > 1000000) { // More than $10,000
      errors.push('wageAmount cannot exceed 1000000 cents ($10,000)');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Attestation data contains invalid values',
        details: errors
      });
    }

    next();
  },

  // Attestation verification validation
  attestationVerification: (req, res, next) => {
    const { employerId } = req.body;

    if (employerId && (typeof employerId !== 'string' || !/^[a-f0-9]{16}$/.test(employerId))) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'employerId must be a 16-character hexadecimal string if provided'
      });
    }

    next();
  },

  // Batch verification validation
  batchVerification: (req, res, next) => {
    const { attestationIds } = req.body;

    if (!Array.isArray(attestationIds)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'attestationIds must be an array'
      });
    }

    if (attestationIds.length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'attestationIds array cannot be empty'
      });
    }

    if (attestationIds.length > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Cannot verify more than 100 attestations at once'
      });
    }

    // Validate each attestation ID is a valid UUID
    const invalidIds = attestationIds.filter(id =>
      typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'All attestation IDs must be valid UUIDs',
        invalid: invalidIds.slice(0, 5) // Show first 5 invalid IDs
      });
    }

    next();
  }
};

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

/**
 * Security-focused middleware
 */
const securityMiddleware = {
  // Request ID generation for tracing
  requestId: (req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
  },

  // Anti-replay protection
  antiReplay: (req, res, next) => {
    const timestamp = req.headers['x-timestamp'];
    const nonce = req.headers['x-nonce'];

    if (req.method === 'POST' && req.path.includes('/attestations')) {
      if (!timestamp) {
        return res.status(400).json({
          error: 'Anti-replay protection',
          message: 'X-Timestamp header required for attestation creation',
          requiredHeaders: ['X-Timestamp', 'X-Nonce']
        });
      }

      const requestTime = parseInt(timestamp);
      const now = Date.now();
      const timeDiff = Math.abs(now - requestTime);

      // Reject requests older than 5 minutes
      if (timeDiff > 5 * 60 * 1000) {
        return res.status(400).json({
          error: 'Request expired',
          message: 'Request timestamp is too old (>5 minutes)',
          serverTime: now,
          requestTime: requestTime,
          timeDiff: timeDiff
        });
      }

      // In production, check nonce against cache to prevent replay
      if (nonce) {
        req.nonce = nonce;
      }
    }

    next();
  },

  // Input sanitization
  sanitizeInput: (req, res, next) => {
    // Recursively sanitize strings in request body
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        // Remove potentially dangerous characters but preserve valid data
        return obj.replace(/[<>\"']/g, '').trim();
      }
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          obj[key] = sanitize(obj[key]);
        }
      }
      return obj;
    };

    if (req.body && typeof req.body === 'object') {
      req.body = sanitize({ ...req.body });
    }

    next();
  },

  // CORS headers for browser clients
  cors: (req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Employer-Id, X-Api-Key, X-Timestamp, X-Nonce');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  }
};

// =============================================================================
// LOGGING MIDDLEWARE
// =============================================================================

/**
 * Request logging middleware
 */
const loggingMiddleware = {
  // Request logger
  requestLogger: (req, res, next) => {
    const start = Date.now();

    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      employerId: req.headers['x-employer-id'],
      contentLength: req.headers['content-length']
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - start;

      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode}`, {
        requestId: req.id,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });

      originalEnd.apply(this, args);
    };

    next();
  },

  // Error logger
  errorLogger: (error, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.path}`, {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    next(error);
  }
};

module.exports = {
  rateLimitMiddleware,
  authMiddleware,
  validationMiddleware,
  securityMiddleware,
  loggingMiddleware
};