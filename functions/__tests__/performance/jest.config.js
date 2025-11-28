module.exports = {
  displayName: 'Performance Tests',
  testMatch: ['<rootDir>/functions/__tests__/performance/**/*.test.js'],
  testEnvironment: 'node',
  testTimeout: 180000, // 3 minutes for performance tests
  verbose: true,
  collectCoverage: false, // Performance tests don't need coverage
  maxWorkers: 1, // Run performance tests sequentially
};
