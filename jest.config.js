module.exports = {
  // Use react-native preset for proper React Native testing
  preset: 'react-native',
  testEnvironment: 'node',

  // Transform patterns - tell Jest which node_modules to transform
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-paper|i18next|react-i18next)',
  ],

  // Transform files with babel-jest
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module name mapper
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
  ],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(spec|test).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // Ignore mock and fixture files
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/mocks/',
    '/__tests__/fixtures/',
    '/__mocks__/',
    'jest.config.js',
    'jest.setup.js',
  ],

  // Global setup to prevent React 19 errors
  globals: {
    __DEV__: true,
  },
};
