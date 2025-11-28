/**
 * Test helpers and utilities
 *
 * Shared functions for setting up tests, mocking contexts, and assertions
 */

import React from 'react';
import { renderHook } from '@testing-library/react-native';

/**
 * Create a mock AuthContext provider for testing
 */
export const createMockAuthProvider = (user, userDetails, partnerDetails = null) => {
  const mockAuth = {
    user,
    userDetails,
    loading: false,
    signOut: jest.fn(),
    getPartnerDetails: jest.fn().mockResolvedValue(partnerDetails),
  };

  return ({ children }) =>
    React.createElement(
      'AuthContext.Provider',
      { value: mockAuth },
      children
    );
};

/**
 * Create a mock SubscriptionContext provider for testing
 */
export const createMockSubscriptionProvider = (subscriptionState) => {
  const mockSubscription = {
    isPremium: false,
    isLocked: true,
    loading: false,
    isOffline: false,
    subscriptionInfo: {},
    purchase: jest.fn(),
    restore: jest.fn(),
    refresh: jest.fn(),
    ...subscriptionState,
  };

  return ({ children }) =>
    React.createElement(
      'SubscriptionContext.Provider',
      { value: mockSubscription },
      children
    );
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create a mock Firebase Timestamp
 */
export const createMockTimestamp = (date) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
});

/**
 * Mock AsyncStorage helpers
 */
export const mockAsyncStorage = {
  store: {},

  getItem: jest.fn((key) => {
    return Promise.resolve(mockAsyncStorage.store[key] || null);
  }),

  setItem: jest.fn((key, value) => {
    mockAsyncStorage.store[key] = value;
    return Promise.resolve();
  }),

  removeItem: jest.fn((key) => {
    delete mockAsyncStorage.store[key];
    return Promise.resolve();
  }),

  clear: jest.fn(() => {
    mockAsyncStorage.store = {};
    return Promise.resolve();
  }),

  reset: () => {
    mockAsyncStorage.store = {};
    mockAsyncStorage.getItem.mockClear();
    mockAsyncStorage.setItem.mockClear();
    mockAsyncStorage.removeItem.mockClear();
    mockAsyncStorage.clear.mockClear();
  },
};

/**
 * Mock Firestore document reference
 */
export const createMockDocRef = (id, data) => ({
  id,
  data: () => data,
  exists: () => !!data,
});

/**
 * Mock Firestore query snapshot
 */
export const createMockQuerySnapshot = (docs) => ({
  docs: docs.map((doc) => createMockDocRef(doc.id, doc.data)),
  empty: docs.length === 0,
  size: docs.length,
  forEach: (callback) => docs.forEach((doc) => callback(createMockDocRef(doc.id, doc.data))),
});

/**
 * Advance timers for testing time-dependent behavior
 */
export const advanceTimersByTime = (ms) => {
  jest.advanceTimersByTime(ms);
};

/**
 * Setup fake timers
 */
export const useFakeTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
};

/**
 * Mock network conditions
 */
export const mockNetworkConditions = {
  online: () => {
    global.navigator.onLine = true;
  },

  offline: () => {
    global.navigator.onLine = false;
  },

  reset: () => {
    global.navigator.onLine = true;
  },
};

/**
 * Mock console methods for testing error handling
 */
export const mockConsole = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),

  restore: () => {
    mockConsole.error.mockRestore();
    mockConsole.warn.mockRestore();
    mockConsole.log.mockRestore();
  },

  clear: () => {
    mockConsole.error.mockClear();
    mockConsole.warn.mockClear();
    mockConsole.log.mockClear();
  },
};

/**
 * Create a spy on a module function
 */
export const createModuleSpy = (module, functionName, mockImplementation) => {
  const spy = jest.spyOn(module, functionName);
  if (mockImplementation) {
    spy.mockImplementation(mockImplementation);
  }
  return spy;
};

/**
 * Assert that a promise rejects with specific error
 */
export const expectToRejectWith = async (promise, errorMessage) => {
  await expect(promise).rejects.toThrow(errorMessage);
};

/**
 * Assert that a promise resolves with specific value
 */
export const expectToResolveWith = async (promise, expectedValue) => {
  await expect(promise).resolves.toEqual(expectedValue);
};

/**
 * Create a deferred promise for testing async operations
 */
export const createDeferredPromise = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/**
 * Mock Date.now() for consistent timestamps
 */
export const mockDateNow = (timestamp) => {
  const originalDateNow = Date.now;
  Date.now = jest.fn(() => timestamp);
  return () => {
    Date.now = originalDateNow;
  };
};

/**
 * Wait for a condition to be true
 */
export const waitForCondition = async (condition, timeout = 5000) => {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
