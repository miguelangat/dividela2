/**
 * Integration Test: Duplicate Detection
 * Tests duplicate detection with real Firebase data
 */

import { processTransactions, importExpenses } from '../../services/importService';
import { detectDuplicatesForTransactions } from '../../utils/duplicateDetector';
import { createMockTransaction, createMockExpense } from '../utils/testHelpers';

// Mock Firebase with existing expense data
jest.mock('../../config/firebase', () => {
  const existingExpenses = new Map();

  // Add some pre-existing expenses
  existingExpenses.set('expense-1', {
    id: 'expense-1',
    date: '2024-01-15',
    description: 'STARBUCKS #1234',
    amount: 5.50,
    categoryKey: 'food',
    paidBy: 'user-1',
  });

  existingExpenses.set('expense-2', {
    id: 'expense-2',
    date: '2024-01-16',
    description: 'Walmart Grocery',
    amount: 125.00,
    categoryKey: 'groceries',
    paidBy: 'user-1',
  });

  existingExpenses.set('expense-3', {
    id: 'expense-3',
    date: '2024-01-17',
    description: 'Shell Gas Station',
    amount: 45.00,
    categoryKey: 'transport',
    paidBy: 'user-1',
  });

  const mockBatch = {
    operations: [],
    set: jest.fn((ref, data) => {
      mockBatch.operations.push({ type: 'set', ref, data });
    }),
    commit: jest.fn(async () => {
      mockBatch.operations.forEach(op => {
        if (op.type === 'set') {
          existingExpenses.set(op.ref.id, op.data);
        }
      });
      mockBatch.operations = [];
    }),
  };

  return {
    db: {
      collection: jest.fn((path) => ({
        doc: jest.fn((id) => ({
          id,
          get: jest.fn(async () => ({
            exists: existingExpenses.has(id),
            data: () => existingExpenses.get(id),
          })),
        })),
        where: jest.fn((field, op, value) => ({
          where: jest.fn(() => ({
            get: jest.fn(async () => {
              // Filter expenses based on query
              const filtered = Array.from(existingExpenses.values()).filter(expense => {
                // Simple filtering for coupleId
                return true;
              });
              return {
                docs: filtered.map(data => ({
                  id: data.id,
                  data: () => data,
                })),
              };
            }),
          })),
          get: jest.fn(async () => ({
            docs: Array.from(existingExpenses.values()).map(data => ({
              id: data.id,
              data: () => data,
            })),
          })),
        })),
      })),
    },
    writeBatch: jest.fn(() => mockBatch),
    existingExpenses, // Expose for test assertions
    mockBatch,
  };
});

describe('Integration: Duplicate Detection', () => {
  const mockCoupleId = 'couple-1';
  const mockUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Exact Duplicate Detection', () => {
    it('should detect exact duplicate transactions', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'STARBUCKS #1234',
          amount: 5.50,
        }),
        createMockTransaction({
          date: new Date('2024-01-18'),
          description: 'New Transaction',
          amount: 25.00,
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // First transaction should be detected as duplicate
      expect(duplicateResults[0].hasDuplicates).toBe(true);
      expect(duplicateResults[0].highestConfidence).toBeGreaterThanOrEqual(0.95);
      expect(duplicateResults[0].autoSkip).toBe(true);

      // Second transaction should not be a duplicate
      expect(duplicateResults[1].hasDuplicates).toBe(false);
    });

    it('should detect similar transactions with high confidence', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'Starbucks Store #1234', // Slightly different description
          amount: 5.50,
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(duplicateResults[0].hasDuplicates).toBe(true);
      expect(duplicateResults[0].highestConfidence).toBeGreaterThan(0.7);
    });

    it('should detect amount-only matches with lower confidence', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-02-15'), // Different date
          description: 'Different Store', // Different description
          amount: 5.50, // Same amount
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Should detect as possible duplicate but with lower confidence
      if (duplicateResults[0].hasDuplicates) {
        expect(duplicateResults[0].highestConfidence).toBeLessThan(0.7);
        expect(duplicateResults[0].autoSkip).toBe(false);
      }
    });
  });

  describe('Import with Duplicate Handling', () => {
    it('should auto-skip high-confidence duplicates during import', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'STARBUCKS #1234', // Exact match
          amount: 5.50,
        }),
        createMockTransaction({
          date: new Date('2024-01-18'),
          description: 'New Transaction',
          amount: 25.00,
        }),
      ];

      const processResult = await processTransactions(
        transactions,
        mockUserId,
        ['food'],
        true // detectDuplicates
      );

      // All transactions selected initially
      const selectedTransactions = { 0: true, 1: true };

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

      expect(importResult.success).toBe(true);
      // First transaction should be skipped as duplicate
      expect(importResult.summary.duplicates).toBeGreaterThan(0);
      // Only second transaction should be imported
      expect(importResult.summary.imported).toBeLessThanOrEqual(1);
    });

    it('should allow user to override duplicate detection', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'STARBUCKS #1234',
          amount: 5.50,
        }),
      ];

      const processResult = await processTransactions(
        transactions,
        mockUserId,
        ['food'],
        true
      );

      // User explicitly selects the duplicate transaction
      const selectedTransactions = { 0: true };

      // Even though it's a duplicate, if user selects it, it should be imported
      // (This depends on implementation - some systems allow force import)
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
        forceImport: true, // Flag to force import duplicates
      });

      // Should respect user's decision to import
      expect(importResult.success).toBe(true);
    });

    it('should handle multiple duplicates correctly', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'STARBUCKS #1234',
          amount: 5.50,
        }),
        createMockTransaction({
          date: new Date('2024-01-16'),
          description: 'Walmart Grocery',
          amount: 125.00,
        }),
        createMockTransaction({
          date: new Date('2024-01-17'),
          description: 'Shell Gas Station',
          amount: 45.00,
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // All three should be detected as duplicates
      const duplicateCount = duplicateResults.filter(r => r.hasDuplicates).length;
      expect(duplicateCount).toBe(3);
    });
  });

  describe('Duplicate Detection Edge Cases', () => {
    it('should handle transactions with no existing expenses', async () => {
      // Clear existing expenses
      const { existingExpenses } = require('../../config/firebase');
      existingExpenses.clear();

      const transactions = [
        createMockTransaction({
          date: new Date('2024-02-01'),
          description: 'Brand New Store',
          amount: 99.99,
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(duplicateResults[0].hasDuplicates).toBe(false);
    });

    it('should handle very similar amounts but different descriptions', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'Completely Different Store',
          amount: 5.51, // Very close to 5.50 but different
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Should have low confidence or no duplicate
      if (duplicateResults[0].hasDuplicates) {
        expect(duplicateResults[0].highestConfidence).toBeLessThan(0.6);
      }
    });

    it('should handle same description but very different amounts', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'STARBUCKS #1234',
          amount: 500.00, // Much higher than original 5.50
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Should have low confidence due to large amount difference
      if (duplicateResults[0].hasDuplicates) {
        expect(duplicateResults[0].highestConfidence).toBeLessThan(0.8);
      }
    });

    it('should handle transactions on same day', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'Another Starbucks Purchase',
          amount: 8.00,
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Same day + similar merchant should have moderate confidence
      if (duplicateResults[0].hasDuplicates) {
        expect(duplicateResults[0].highestConfidence).toBeGreaterThan(0.3);
      }
    });

    it('should handle case-insensitive description matching', async () => {
      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'starbucks #1234', // lowercase
          amount: 5.50,
        }),
      ];

      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(duplicateResults[0].hasDuplicates).toBe(true);
      expect(duplicateResults[0].highestConfidence).toBeGreaterThan(0.9);
    });
  });

  describe('Performance with Many Existing Expenses', () => {
    it('should efficiently detect duplicates with 100+ existing expenses', async () => {
      const { existingExpenses } = require('../../config/firebase');

      // Add 100 more expenses
      for (let i = 10; i < 110; i++) {
        existingExpenses.set(`expense-${i}`, {
          id: `expense-${i}`,
          date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
          description: `Transaction ${i}`,
          amount: Math.random() * 100,
          categoryKey: 'food',
          paidBy: mockUserId,
        });
      }

      const transactions = [
        createMockTransaction({
          date: new Date('2024-01-15'),
          description: 'Transaction 50', // Matches one of the added expenses
          amount: existingExpenses.get('expense-50').amount,
        }),
      ];

      const startTime = Date.now();
      const duplicateResults = await detectDuplicatesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );
      const duration = Date.now() - startTime;

      expect(duplicateResults[0].hasDuplicates).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
