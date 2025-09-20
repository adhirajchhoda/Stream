/**
 * Jest Test Setup
 * Global configuration and utilities for tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002'; // Different port for testing

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

global.mockConsole = () => {
  console.log = jest.fn();
  console.error = jest.fn();
};

global.restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
};

// Global test utilities
global.testUtils = {
  // Generate test Ethereum address
  generateTestAddress: (suffix = '0') => {
    return '0x' + suffix.padStart(40, '0');
  },

  // Generate test employer ID
  generateTestEmployerId: () => {
    return Math.random().toString(16).substring(2, 18);
  },

  // Create test attestation data
  createTestAttestationData: (overrides = {}) => {
    return {
      employerId: 'test_employer_123',
      employeeWallet: '0x742d35Cc6634C0532925a3b8D000B45f5c964C12',
      wageAmount: 50000,
      periodStart: new Date('2024-01-01T09:00:00.000Z'),
      periodEnd: new Date('2024-01-01T17:00:00.000Z'),
      hoursWorked: 8,
      hourlyRate: 6250,
      periodNonce: 'test_nonce_123',
      timestamp: new Date('2024-01-01T18:00:00.000Z'),
      ...overrides
    };
  },

  // Wait for async operations
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Setup and teardown
beforeEach(() => {
  // Mock console for cleaner test output
  mockConsole();
});

afterEach(() => {
  // Restore console
  restoreConsole();
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in tests:', reason);
});

// Increase timeout for integration tests
jest.setTimeout(30000);