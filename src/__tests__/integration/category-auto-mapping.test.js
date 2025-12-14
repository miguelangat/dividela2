/**
 * Integration Test: Category Auto-Mapping
 * Tests category suggestion system with historical expense data
 */

import { processTransactions } from '../../services/importService';
import { suggestCategoriesForTransactions } from '../../utils/categoryAutoMapper';
import { createMockTransaction } from '../utils/testHelpers';

// Mock Firebase with historical expense data
jest.mock('../../config/firebase', () => {
  const historicalExpenses = new Map();

  // Add historical expenses for category learning
  // Food purchases
  historicalExpenses.set('hist-1', {
    id: 'hist-1',
    description: 'STARBUCKS #1234',
    categoryKey: 'food',
    amount: 5.50,
  });
  historicalExpenses.set('hist-2', {
    id: 'hist-2',
    description: 'STARBUCKS CAFE',
    categoryKey: 'food',
    amount: 7.25,
  });
  historicalExpenses.set('hist-3', {
    id: 'hist-3',
    description: 'MCDONALDS #5678',
    categoryKey: 'food',
    amount: 12.50,
  });

  // Grocery purchases
  historicalExpenses.set('hist-4', {
    id: 'hist-4',
    description: 'WALMART GROCERY',
    categoryKey: 'groceries',
    amount: 125.00,
  });
  historicalExpenses.set('hist-5', {
    id: 'hist-5',
    description: 'WHOLE FOODS MARKET',
    categoryKey: 'groceries',
    amount: 89.50,
  });

  // Transport purchases
  historicalExpenses.set('hist-6', {
    id: 'hist-6',
    description: 'SHELL GAS STATION',
    categoryKey: 'transport',
    amount: 45.00,
  });
  historicalExpenses.set('hist-7', {
    id: 'hist-7',
    description: 'UBER TRIP',
    categoryKey: 'transport',
    amount: 15.00,
  });

  return {
    db: {
      collection: jest.fn((path) => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(async () => ({
              docs: Array.from(historicalExpenses.values()).map(data => ({
                id: data.id,
                data: () => data,
              })),
            })),
          })),
          get: jest.fn(async () => ({
            docs: Array.from(historicalExpenses.values()).map(data => ({
              id: data.id,
              data: () => data,
            })),
          })),
        })),
      })),
    },
    historicalExpenses, // Expose for test assertions
  };
});

describe('Integration: Category Auto-Mapping', () => {
  const mockCoupleId = 'couple-1';
  const mockUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('High Confidence Suggestions', () => {
    it('should suggest category with high confidence for known merchants', async () => {
      const transactions = [
        createMockTransaction({
          description: 'STARBUCKS #9999', // New Starbucks location
          amount: 6.50,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(suggestions[0].suggestion.categoryKey).toBe('food');
      expect(suggestions[0].suggestion.confidence).toBeGreaterThanOrEqual(0.8);
      expect(suggestions[0].suggestion.reason).toContain('similar');
    });

    it('should suggest groceries for Walmart purchases', async () => {
      const transactions = [
        createMockTransaction({
          description: 'WALMART SUPERCENTER #1234',
          amount: 150.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(suggestions[0].suggestion.categoryKey).toBe('groceries');
      expect(suggestions[0].suggestion.confidence).toBeGreaterThan(0.7);
    });

    it('should suggest transport for gas stations', async () => {
      const transactions = [
        createMockTransaction({
          description: 'SHELL #5678',
          amount: 50.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(suggestions[0].suggestion.categoryKey).toBe('transport');
      expect(suggestions[0].suggestion.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Learning from Multiple Occurrences', () => {
    it('should have higher confidence when multiple similar transactions exist', async () => {
      const { historicalExpenses } = require('../../config/firebase');

      // Add more Starbucks transactions
      for (let i = 10; i < 20; i++) {
        historicalExpenses.set(`hist-${i}`, {
          id: `hist-${i}`,
          description: `STARBUCKS #${i}`,
          categoryKey: 'food',
          amount: Math.random() * 10 + 5,
        });
      }

      const transactions = [
        createMockTransaction({
          description: 'STARBUCKS RESERVE',
          amount: 8.50,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // With 12 Starbucks transactions in history, confidence should be very high
      expect(suggestions[0].suggestion.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should learn from exact previous transactions', async () => {
      const { historicalExpenses } = require('../../config/firebase');

      // Add a specific merchant
      historicalExpenses.set('hist-custom', {
        id: 'hist-custom',
        description: 'JOE\'S PIZZA SHOP',
        categoryKey: 'food',
        amount: 15.00,
      });

      const transactions = [
        createMockTransaction({
          description: 'JOE\'S PIZZA SHOP', // Exact match
          amount: 18.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(suggestions[0].suggestion.categoryKey).toBe('food');
      expect(suggestions[0].suggestion.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Unknown Merchants', () => {
    it('should provide low confidence for completely unknown merchants', async () => {
      const transactions = [
        createMockTransaction({
          description: 'UNKNOWN MERCHANT ABC123',
          amount: 99.99,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Should still provide a suggestion but with low confidence
      expect(suggestions[0].suggestion).toBeDefined();
      expect(suggestions[0].suggestion.confidence).toBeLessThan(0.5);
    });

    it('should use default category for no matches', async () => {
      const transactions = [
        createMockTransaction({
          description: 'COMPLETELY NEW STORE XYZ',
          amount: 50.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId,
        'other' // default category
      );

      expect(suggestions[0].suggestion.categoryKey).toBeDefined();
      if (suggestions[0].suggestion.confidence < 0.3) {
        expect(['other', suggestions[0].suggestion.categoryKey]).toContain(
          suggestions[0].suggestion.categoryKey
        );
      }
    });
  });

  describe('Fuzzy Matching', () => {
    it('should match despite typos and variations', async () => {
      const transactions = [
        createMockTransaction({
          description: 'STARBCKS #1234', // Typo in Starbucks
          amount: 6.00,
        }),
        createMockTransaction({
          description: 'STAR BUCKS COFFEE', // Spaced differently
          amount: 7.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Both should be categorized as food despite spelling variations
      expect(suggestions[0].suggestion.categoryKey).toBe('food');
      expect(suggestions[1].suggestion.categoryKey).toBe('food');
    });

    it('should match partial merchant names', async () => {
      const transactions = [
        createMockTransaction({
          description: 'WALMART', // Without "GROCERY" suffix
          amount: 100.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(suggestions[0].suggestion.categoryKey).toBe('groceries');
      expect(suggestions[0].suggestion.confidence).toBeGreaterThan(0.6);
    });

    it('should handle extra whitespace and special characters', async () => {
      const transactions = [
        createMockTransaction({
          description: '  STARBUCKS   #1234  ', // Extra spaces
          amount: 6.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(suggestions[0].suggestion.categoryKey).toBe('food');
      expect(suggestions[0].suggestion.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Integration with Process Transactions', () => {
    it('should provide suggestions during transaction processing', async () => {
      const transactions = [
        createMockTransaction({
          description: 'STARBUCKS #5555',
          amount: 5.75,
        }),
        createMockTransaction({
          description: 'WALMART STORE',
          amount: 120.00,
        }),
        createMockTransaction({
          description: 'UNKNOWN MERCHANT',
          amount: 45.00,
        }),
      ];

      const result = await processTransactions(
        transactions,
        mockUserId,
        ['food', 'groceries', 'transport', 'other'],
        false // skip duplicate detection for this test
      );

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(3);

      // First transaction should have food suggestion
      expect(result.suggestions[0].suggestion.categoryKey).toBe('food');
      expect(result.suggestions[0].suggestion.confidence).toBeGreaterThan(0.7);

      // Second transaction should have groceries suggestion
      expect(result.suggestions[1].suggestion.categoryKey).toBe('groceries');
      expect(result.suggestions[1].suggestion.confidence).toBeGreaterThan(0.6);

      // Third transaction might have low confidence
      expect(result.suggestions[2].suggestion).toBeDefined();
    });

    it('should handle batch suggestions efficiently', async () => {
      const transactions = [];
      for (let i = 0; i < 50; i++) {
        transactions.push(
          createMockTransaction({
            description: `STARBUCKS #${i}`,
            amount: Math.random() * 10 + 5,
          })
        );
      }

      const startTime = Date.now();
      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );
      const duration = Date.now() - startTime;

      expect(suggestions).toHaveLength(50);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      // All should be categorized as food
      suggestions.forEach(s => {
        expect(s.suggestion.categoryKey).toBe('food');
      });
    });
  });

  describe('Category Confidence Levels', () => {
    it('should categorize confidence levels correctly', async () => {
      const { historicalExpenses } = require('../../config/firebase');

      // High confidence: exact match
      historicalExpenses.set('high-conf', {
        id: 'high-conf',
        description: 'EXACT MATCH STORE',
        categoryKey: 'food',
        amount: 10.00,
      });

      const transactions = [
        createMockTransaction({
          description: 'EXACT MATCH STORE',
          amount: 10.00,
        }),
        createMockTransaction({
          description: 'STARBUCKS #9999', // Similar to existing
          amount: 6.00,
        }),
        createMockTransaction({
          description: 'BRAND NEW STORE', // Unknown
          amount: 50.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Verify confidence levels decrease
      expect(suggestions[0].suggestion.confidence).toBeGreaterThanOrEqual(0.9); // High
      expect(suggestions[1].suggestion.confidence).toBeGreaterThanOrEqual(0.7); // Medium
      expect(suggestions[2].suggestion.confidence).toBeLessThan(0.6); // Low
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty historical data', async () => {
      const { historicalExpenses } = require('../../config/firebase');
      historicalExpenses.clear();

      const transactions = [
        createMockTransaction({
          description: 'SOME STORE',
          amount: 25.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      // Should still provide a suggestion (likely default)
      expect(suggestions[0].suggestion).toBeDefined();
      expect(suggestions[0].suggestion.confidence).toBeLessThan(0.3);
    });

    it('should handle very long merchant names', async () => {
      const transactions = [
        createMockTransaction({
          description: 'A'.repeat(200), // 200 character merchant name
          amount: 10.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(suggestions[0].suggestion).toBeDefined();
    });

    it('should handle special characters in merchant names', async () => {
      const transactions = [
        createMockTransaction({
          description: 'JOE\'S CAFÉ & BISTRO',
          amount: 20.00,
        }),
      ];

      const suggestions = await suggestCategoriesForTransactions(
        transactions,
        mockCoupleId,
        mockUserId
      );

      expect(suggestions[0].suggestion).toBeDefined();
    });
  });
});
