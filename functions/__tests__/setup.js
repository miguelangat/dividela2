/**
 * Jest Test Setup
 * Configures global test environment for Cloud Functions
 */

// Set test environment variables
process.env.GCLOUD_PROJECT = 'test-project';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'test-project',
  databaseURL: 'https://test-project.firebaseio.com',
  storageBucket: 'test-project.appspot.com',
});

// Extend Jest timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: jest.fn(),
  warn: jest.fn(),
  // Suppress log, debug, and info
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};
