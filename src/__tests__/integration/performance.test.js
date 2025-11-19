/**
 * Integration Test: Performance
 * Tests performance with large datasets
 */

import { parseFile, processTransactions, importExpenses } from '../../services/importService';
import { detectDuplicatesForTransactions } from '../../utils/duplicateDetector';
import { suggestCategoriesForTransactions } from '../../utils/categoryAutoMapper';
import { createMockFileInfo, createMockTransactions } from '../utils/testHelpers';
import * as FileSystem from 'expo-file-system';

// Mock Firebase with performance-optimized behavior
jest.mock('../../config/firebase', () => {
  const expenses = new Map();

  // Add 500 existing expenses for realistic testing
  for (let i = 0; i < 500; i++) {
    expenses.set(`expense-${i}`, {
      id: `expense-${i}`,
      date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      description: `Merchant ${i % 50}`, // 50 different merchants
      amount: Math.random() * 200,
      categoryKey: ['food', 'groceries', 'transport', 'entertainment'][i % 4],
      paidBy: 'user-1',
    });
  }

  const mockBatch = {
    operations: [],
    set: jest.fn((ref, data) => {
      mockBatch.operations.push({ type: 'set', ref, data });
    }),
    commit: jest.fn(async () => {
      // Simulate Firebase batch commit with slight delay
      await new Promise(resolve => setTimeout(resolve, 10));
      mockBatch.operations.forEach(op => {
        if (op.type === 'set') {
          expenses.set(op.ref.id, op.data);
        }
      });
      mockBatch.operations = [];
    }),
  };

  return {
    db: {
      collection: jest.fn(() => ({
        doc: jest.fn((id) => ({
          id,
          get: jest.fn(async () => ({
            exists: expenses.has(id),
            data: () => expenses.get(id),
          })),
        })),
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(async () => ({
              docs: Array.from(expenses.values()).slice(0, 100).map(data => ({
                id: data.id,
                data: () => data,
              })),
            })),
          })),
          get: jest.fn(async () => ({
            docs: Array.from(expenses.values()).map(data => ({
              id: data.id,
              data: () => data,
            })),
          })),
        })),
      })),
    },
    writeBatch: jest.fn(() => mockBatch),
    expenses,
  };
});

describe('Integration: Performance Tests', () => {
  const mockCoupleId = 'couple-1';
  const mockUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Large File Parsing', () => {
    it('should parse 1000 transaction CSV within 3 seconds', async () => {
      const mockFileInfo = createMockFileInfo({
        name: 'large-statement.csv',
        size: 100000,
      });

      // Generate 1000 transactions
      const csvRows = ['Date,Description,Amount,Type'];
      for (let i = 1; i <= 1000; i++) {
        csvRows.push(
          `2024-${String(Math.floor(i / 31) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')},` +
          `Merchant ${i % 100},${(Math.random() * 200).toFixed(2)},debit`
        );
      }
      const csvContent = csvRows.join('\n');

      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const startTime = Date.now();
      const result = await parseFile('file:///large-statement.csv', mockFileInfo);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(1000);
      expect(duration).toBeLessThan(3000); // 3 seconds
    });

    it('should parse 5000 transaction CSV within 10 seconds', async () => {
      const mockFileInfo = createMockFileInfo({
        name: 'very-large-statement.csv',
        size: 500000,
      });

      // Generate 5000 transactions
      const csvRows = ['Date,Description,Amount,Type'];
      for (let i = 1; i <= 5000; i++) {
        csvRows.push(
          `2024-${String(Math.floor(i / 150) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')},` +
          `Merchant ${i % 200},${(Math.random() * 200).toFixed(2)},debit`
        );
      }
      const csvContent = csvRows.join('\n');

      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const startTime = Date.now();
      const result = await parseFile('file:///very-large-statement.csv', mockFileInfo);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(5000);
      expect(duration).toBeLessThan(10000); // 10 seconds
    }, 15000); // Increase Jest timeout for this test
  });

  describe('Duplicate Detection Performance', () => {
    it('should detect duplicates for 500 transactions within 5 seconds', async () => {
      const transactions = createMockTransactions(500);

      const startTime = Date.now();
      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );
      const duration = Date.now() - startTime;

      expect(duplicateResults).toHaveLength(500);
      expect(duration).toBeLessThan(5000); // 5 seconds
    }, 10000);

    it('should efficiently batch Firebase queries', async () => {
      const transactions = createMockTransactions(100);

      const { db } = require('../../config/firebase');
      const getSpy = jest.spyOn(db.collection().where(), 'get');

      await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Should not make 100 separate queries
      expect(getSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Category Suggestion Performance', () => {
    it('should suggest categories for 1000 transactions within 3 seconds', async () => {
      const transactions = createMockTransactions(1000);

      const startTime = Date.now();
      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );
      const duration = Date.now() - startTime;

      expect(suggestions).toHaveLength(1000);
      expect(duration).toBeLessThan(3000); // 3 seconds
    }, 10000);

    it('should batch Firebase historical queries', async () => {
      const transactions = createMockTransactions(50);

      const { db } = require('../../config/firebase');
      const getSpy = jest.spyOn(db.collection().where().limit(100), 'get');

      await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Should make minimal queries (not one per transaction)
      expect(getSpy.mock.calls.length).toBeLessThan(5);
    });
  });

  describe('Import Performance', () => {
    it('should import 100 transactions within 2 seconds', async () => {
      const transactions = createMockTransactions(100);
      const selectedTransactions = {};
      for (let i = 0; i < 100; i++) {
        selectedTransactions[i] = true;
      }

      const startTime = Date.now();
      const result = await importExpenses({
        coupleId: mockCoupleId,
        transactions,
        suggestions: [],
        duplicateResults: [],
        selectedTransactions,
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: 'user-2',
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress: jest.fn(),
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.summary.imported).toBe(100);
      expect(duration).toBeLessThan(2000); // 2 seconds
    });

    it('should handle 500 transactions with proper batching', async () => {
      const transactions = createMockTransactions(500);
      const selectedTransactions = {};
      for (let i = 0; i < 500; i++) {
        selectedTransactions[i] = true;
      }

      const { mockBatch } = require('../../config/firebase');

      const result = await importExpenses({
        coupleId: mockCoupleId,
        transactions,
        suggestions: [],
        duplicateResults: [],
        selectedTransactions,
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: 'user-2',
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress: jest.fn(),
      });

      expect(result.success).toBe(true);
      expect(result.summary.imported).toBe(500);

      // Should use only 1 batch for 500 transactions (Firestore limit is 500)
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    }, 10000);

    it('should handle 600 transactions with multiple batches', async () => {
      const transactions = createMockTransactions(600);
      const selectedTransactions = {};
      for (let i = 0; i < 600; i++) {
        selectedTransactions[i] = true;
      }

      const { mockBatch } = require('../../config/firebase');

      const result = await importExpenses({
        coupleId: mockCoupleId,
        transactions,
        suggestions: [],
        duplicateResults: [],
        selectedTransactions,
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: 'user-2',
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress: jest.fn(),
      });

      expect(result.success).toBe(true);
      expect(result.summary.imported).toBe(600);

      // Should use 2 batches (500 + 100)
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('End-to-End Performance', () => {
    it('should complete full import workflow for 200 transactions within 8 seconds', async () => {
      // Step 1: Parse
      const mockFileInfo = createMockFileInfo();
      const csvRows = ['Date,Description,Amount,Type'];
      for (let i = 1; i <= 200; i++) {
        csvRows.push(
          `2024-01-${String((i % 28) + 1).padStart(2, '0')},` +
          `Merchant ${i % 50},${(Math.random() * 100).toFixed(2)},debit`
        );
      }
      const csvContent = csvRows.join('\n');
      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const startTime = Date.now();

      const parseResult = await parseFile('file:///statement.csv', mockFileInfo);
      expect(parseResult.success).toBe(true);

      // Step 2: Process
      const processResult = await processTransactions(
        parseResult.transactions,
        mockUserId,
        ['food', 'groceries', 'transport', 'entertainment'],
        true // detectDuplicates
      );
      expect(processResult.success).toBe(true);

      // Step 3: Import
      const selectedTransactions = {};
      for (let i = 0; i < 200; i++) {
        selectedTransactions[i] = true;
      }

      const importResult = await importExpenses({
        coupleId: mockCoupleId,
        transactions: processResult.validTransactions,
        suggestions: processResult.suggestions,
        duplicateResults: processResult.duplicateResults,
        selectedTransactions,
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: 'user-2',
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress: jest.fn(),
      });

      const duration = Date.now() - startTime;

      expect(importResult.success).toBe(true);
      expect(duration).toBeLessThan(8000); // 8 seconds for complete workflow
    }, 15000);
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process multiple large batches
      for (let batch = 0; batch < 5; batch++) {
        const transactions = createMockTransactions(200);
        await processTransactions(
          transactions,
          mockUserId,
          ['food'],
          false
        );
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Progress Reporting Frequency', () => {
    it('should report progress at reasonable intervals', async () => {
      const transactions = createMockTransactions(100);
      const selectedTransactions = {};
      for (let i = 0; i < 100; i++) {
        selectedTransactions[i] = true;
      }

      const progressUpdates = [];
      const onProgress = jest.fn((progress) => {
        progressUpdates.push(progress);
      });

      await importExpenses({
        coupleId: mockCoupleId,
        transactions,
        suggestions: [],
        duplicateResults: [],
        selectedTransactions,
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: 'user-2',
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress,
      });

      // Should report progress multiple times but not excessively
      expect(progressUpdates.length).toBeGreaterThan(2);
      expect(progressUpdates.length).toBeLessThan(100); // Not every transaction

      // Progress should be monotonically increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].progress).toBeGreaterThanOrEqual(
          progressUpdates[i - 1].progress
        );
      }
    });
  });
});
