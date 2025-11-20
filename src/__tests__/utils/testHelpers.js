/**
 * Test Helpers for Bank Import Feature
 * Provides utilities for creating mock data and Firebase mocks
 */

import { jest } from '@jest/globals';

/**
 * Creates a mock expense object
 */
export const createMockExpense = (overrides = {}) => ({
  id: 'expense-' + Math.random().toString(36).substr(2, 9),
  date: '2024-01-15',
  description: 'Test Expense',
  amount: 50.00,
  categoryKey: 'food',
  paidBy: 'user-1',
  splitMethod: '50/50',
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock transaction object
 */
export const createMockTransaction = (overrides = {}) => ({
  date: new Date('2024-01-15'),
  description: 'Test Transaction',
  amount: 50.00,
  type: 'debit',
  ...overrides,
});

/**
 * Creates a mock file info object
 */
export const createMockFileInfo = (overrides = {}) => ({
  uri: 'file:///path/to/statement.csv',
  name: 'statement.csv',
  type: 'text/csv',
  size: 5000,
  ...overrides,
});

/**
 * Creates multiple mock expenses
 */
export const createMockExpenses = (count = 5, overrides = {}) => {
  return Array.from({ length: count }, (_, i) =>
    createMockExpense({
      id: `expense-${i}`,
      description: `Expense ${i}`,
      date: new Date(2024, 0, 15 + i).toISOString().split('T')[0],
      ...overrides,
    })
  );
};

/**
 * Creates multiple mock transactions
 */
export const createMockTransactions = (count = 5, overrides = {}) => {
  return Array.from({ length: count }, (_, i) =>
    createMockTransaction({
      description: `Transaction ${i}`,
      date: new Date(2024, 0, 15 + i),
      amount: 10.00 * (i + 1),
      ...overrides,
    })
  );
};

/**
 * Mocks Firebase Firestore
 */
export const mockFirestore = () => {
  const mockBatch = {
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  };

  const mockDoc = jest.fn();
  const mockCollection = jest.fn();
  const mockWriteBatch = jest.fn(() => mockBatch);
  const mockServerTimestamp = jest.fn(() => new Date());

  return {
    db: {
      collection: mockCollection,
      doc: mockDoc,
    },
    writeBatch: mockWriteBatch,
    doc: mockDoc,
    collection: mockCollection,
    serverTimestamp: mockServerTimestamp,
    batch: mockBatch,
  };
};

/**
 * Mocks AsyncStorage
 */
export const mockAsyncStorage = () => {
  const storage = {};

  return {
    getItem: jest.fn((key) => Promise.resolve(storage[key] || null)),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(storage))),
    multiGet: jest.fn((keys) =>
      Promise.resolve(keys.map((key) => [key, storage[key] || null]))
    ),
    multiSet: jest.fn((pairs) => {
      pairs.forEach(([key, value]) => {
        storage[key] = value;
      });
      return Promise.resolve();
    }),
  };
};

/**
 * Creates a mock import session
 */
export const createMockSession = (overrides = {}) => ({
  id: 'session-' + Math.random().toString(36).substr(2, 9),
  userId: 'user-1',
  state: 'parsing',
  fileName: 'statement.csv',
  fileType: 'csv',
  totalTransactions: 10,
  imported: 0,
  failed: 0,
  duplicates: 0,
  startedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Waits for a condition to be true
 */
export const waitFor = async (condition, timeout = 5000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timeout waiting for condition');
};

/**
 * Flushes all promises
 */
export const flushPromises = () => {
  return new Promise((resolve) => setImmediate(resolve));
};
