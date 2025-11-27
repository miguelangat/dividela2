module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  roots: ['<rootDir>/__tests__'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',  // Exclude main entry point
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(firebase-functions|firebase-admin)/)'
  ]
};
