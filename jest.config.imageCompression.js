/**
 * Custom Jest configuration for imageCompression tests
 * Bypasses jest-expo preset to avoid React 19 compatibility issues
 */

module.exports = {
  testMatch: ['**/src/utils/__tests__/imageCompression.test.js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo-image-manipulator|expo-file-system)/)',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.imageCompression.js'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
