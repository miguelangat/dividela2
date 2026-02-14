// src/__tests__/services/settlementService.test.js
// Unit tests for settlement service calculation functions

import {
  generateCategoryBreakdown,
  generateBudgetSummary,
  identifyTopCategories,
  calculateSettlementAmount,
} from '../../services/settlementService';

describe('settlementService.js - Calculation Functions', () => {
  describe('generateCategoryBreakdown', () => {
    const categories = {
      food: { name: 'Food & Dining', icon: '🍔' },
      transport: { name: 'Transportation', icon: '🚗' },
      utilities: { name: 'Utilities', icon: '💡' },
    };

    it('should generate breakdown for single category', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 100,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
      ];

      const result = generateCategoryBreakdown(expenses, categories);

      expect(result.food).toEqual({
        categoryName: 'Food & Dining',
        icon: '🍔',
        totalAmount: 100,
        expenseCount: 1,
        user1Amount: 60,
        user2Amount: 40,
      });
    });

    it('should aggregate multiple expenses in same category', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 100,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
        {
          categoryKey: 'food',
          amount: 50,
          splitDetails: { user1Amount: 25, user2Amount: 25 },
        },
      ];

      const result = generateCategoryBreakdown(expenses, categories);

      expect(result.food).toEqual({
        categoryName: 'Food & Dining',
        icon: '🍔',
        totalAmount: 150,
        expenseCount: 2,
        user1Amount: 85,
        user2Amount: 65,
      });
    });

    it('should handle multiple categories', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 100,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
        {
          categoryKey: 'transport',
          amount: 50,
          splitDetails: { user1Amount: 25, user2Amount: 25 },
        },
      ];

      const result = generateCategoryBreakdown(expenses, categories);

      expect(result.food.totalAmount).toBe(100);
      expect(result.transport.totalAmount).toBe(50);
    });

    it('should use category field as fallback', () => {
      const expenses = [
        {
          category: 'food',
          amount: 100,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
      ];

      const result = generateCategoryBreakdown(expenses, categories);
      expect(result.food).toBeDefined();
    });

    it('should default to "other" for missing category', () => {
      const expenses = [
        {
          amount: 100,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
      ];

      const result = generateCategoryBreakdown(expenses, categories);

      expect(result.other).toEqual({
        categoryName: 'Other',
        icon: '💡',
        totalAmount: 100,
        expenseCount: 1,
        user1Amount: 60,
        user2Amount: 40,
      });
    });

    it('should handle missing splitDetails with 50/50 split', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 100,
        },
      ];

      const result = generateCategoryBreakdown(expenses, categories);

      expect(result.food.user1Amount).toBe(50);
      expect(result.food.user2Amount).toBe(50);
    });

    it('should handle empty expenses array', () => {
      const result = generateCategoryBreakdown([], categories);
      expect(result).toEqual({});
    });

    it('should handle unknown category gracefully', () => {
      const expenses = [
        {
          categoryKey: 'unknown',
          amount: 100,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
      ];

      const result = generateCategoryBreakdown(expenses, categories);
      expect(result.unknown).toBeDefined();
      expect(result.unknown.categoryName).toBeUndefined();
      expect(result.unknown.icon).toBeUndefined();
    });
  });

  describe('generateBudgetSummary', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should generate summary for enabled budget', () => {
      const expenses = [
        { amount: 100 },
        { amount: 50 },
      ];

      const budget = {
        enabled: true,
        categoryBudgets: {
          food: 500,
          transport: 300,
        },
      };

      const categories = {
        food: { name: 'Food' },
        transport: { name: 'Transport' },
      };

      const result = generateBudgetSummary(expenses, budget, categories);

      expect(result.totalBudget).toBe(800);
      expect(result.totalSpent).toBe(150);
      expect(result.budgetRemaining).toBe(650);
      expect(result.includedInBudget).toBe(true);
      expect(result.monthYear).toBe('2024-01');
    });

    it('should return zeros for disabled budget', () => {
      const expenses = [{ amount: 100 }];
      const budget = {
        enabled: false,
        categoryBudgets: { food: 500 },
      };

      const result = generateBudgetSummary(expenses, budget, {});

      expect(result).toEqual({
        totalBudget: 0,
        totalSpent: 0,
        budgetRemaining: 0,
        includedInBudget: false,
        monthYear: null,
      });
    });

    it('should return zeros for null budget', () => {
      const expenses = [{ amount: 100 }];
      const result = generateBudgetSummary(expenses, null, {});

      expect(result).toEqual({
        totalBudget: 0,
        totalSpent: 0,
        budgetRemaining: 0,
        includedInBudget: false,
        monthYear: null,
      });
    });

    it('should handle overspending', () => {
      const expenses = [{ amount: 1000 }];
      const budget = {
        enabled: true,
        categoryBudgets: { food: 500 },
      };

      const result = generateBudgetSummary(expenses, budget, {});

      expect(result.totalBudget).toBe(500);
      expect(result.totalSpent).toBe(1000);
      expect(result.budgetRemaining).toBe(-500);
    });

    it('should handle empty categoryBudgets', () => {
      const expenses = [{ amount: 100 }];
      const budget = {
        enabled: true,
        categoryBudgets: {},
      };

      const result = generateBudgetSummary(expenses, budget, {});

      expect(result.totalBudget).toBe(0);
      expect(result.totalSpent).toBe(100);
      expect(result.budgetRemaining).toBe(-100);
    });

    it('should format monthYear correctly for different months', () => {
      jest.setSystemTime(new Date('2024-11-15T12:00:00'));

      const expenses = [];
      const budget = {
        enabled: true,
        categoryBudgets: { food: 500 },
      };

      const result = generateBudgetSummary(expenses, budget, {});
      expect(result.monthYear).toBe('2024-11');
    });
  });

  describe('identifyTopCategories', () => {
    const categoryBreakdown = {
      food: {
        categoryName: 'Food',
        icon: '🍔',
        totalAmount: 500,
      },
      transport: {
        categoryName: 'Transport',
        icon: '🚗',
        totalAmount: 300,
      },
      utilities: {
        categoryName: 'Utilities',
        icon: '💡',
        totalAmount: 200,
      },
      entertainment: {
        categoryName: 'Entertainment',
        icon: '🎬',
        totalAmount: 100,
      },
    };

    it('should return top 3 categories by default', () => {
      const result = identifyTopCategories(categoryBreakdown);

      expect(result.length).toBe(3);
      expect(result[0].categoryKey).toBe('food');
      expect(result[0].amount).toBe(500);
      expect(result[1].categoryKey).toBe('transport');
      expect(result[1].amount).toBe(300);
      expect(result[2].categoryKey).toBe('utilities');
      expect(result[2].amount).toBe(200);
    });

    it('should respect custom limit', () => {
      const result = identifyTopCategories(categoryBreakdown, 2);

      expect(result.length).toBe(2);
      expect(result[0].categoryKey).toBe('food');
      expect(result[1].categoryKey).toBe('transport');
    });

    it('should include all category details', () => {
      const result = identifyTopCategories(categoryBreakdown, 1);

      expect(result[0]).toEqual({
        categoryKey: 'food',
        categoryName: 'Food',
        icon: '🍔',
        amount: 500,
      });
    });

    it('should handle limit larger than categories', () => {
      const result = identifyTopCategories(categoryBreakdown, 10);
      expect(result.length).toBe(4);
    });

    it('should handle empty breakdown', () => {
      const result = identifyTopCategories({}, 3);
      expect(result).toEqual([]);
    });

    it('should sort correctly with equal amounts', () => {
      const breakdown = {
        cat1: { categoryName: 'Cat1', icon: '🐱', totalAmount: 100 },
        cat2: { categoryName: 'Cat2', icon: '🐱', totalAmount: 100 },
      };

      const result = identifyTopCategories(breakdown, 2);
      expect(result.length).toBe(2);
      expect(result[0].amount).toBe(100);
      expect(result[1].amount).toBe(100);
    });

    it('should handle single category', () => {
      const breakdown = {
        food: { categoryName: 'Food', icon: '🍔', totalAmount: 500 },
      };

      const result = identifyTopCategories(breakdown, 3);
      expect(result.length).toBe(1);
      expect(result[0].categoryKey).toBe('food');
    });
  });

  describe('calculateSettlementAmount', () => {
    const user1Id = 'user1';
    const user2Id = 'user2';

    it('should calculate amount from unsettled expenses only', () => {
      const expenses = [
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
          settledAt: null,
        },
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 30, user2Amount: 70 },
          settledAt: new Date(), // Settled, should be ignored
        },
      ];

      const result = calculateSettlementAmount(expenses, [], user1Id, user2Id);
      expect(result).toBe(40); // Only first expense
    });

    it('should calculate with user1 owing', () => {
      // user2 paid, user1 owes 60 (non-payer's share)
      // splitDetails: user1Amount = payer's share, user2Amount = non-payer's share
      const expenses = [
        {
          paidBy: user2Id,
          splitDetails: { user1Amount: 40, user2Amount: 60 },
        },
      ];

      const result = calculateSettlementAmount(expenses, [], user1Id, user2Id);
      expect(result).toBe(60);
    });

    it('should calculate with user2 owing', () => {
      const expenses = [
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 30, user2Amount: 70 },
        },
      ];

      const result = calculateSettlementAmount(expenses, [], user1Id, user2Id);
      expect(result).toBe(70);
    });

    it('should handle multiple expenses', () => {
      const expenses = [
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 50, user2Amount: 50 },
        },
        {
          paidBy: user2Id,
          splitDetails: { user1Amount: 30, user2Amount: 70 },
        },
      ];

      // user2 owes 50, user1 owes 30, net: user2 owes 20
      const result = calculateSettlementAmount(expenses, [], user1Id, user2Id);
      expect(result).toBe(20);
    });

    it('should factor in settlements', () => {
      const expenses = [
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 50, user2Amount: 50 },
        },
      ];

      const settlements = [
        {
          settledBy: user1Id,
          amount: 20,
        },
      ];

      // user2 owes 50, plus settlement 20 = 70
      const result = calculateSettlementAmount(expenses, settlements, user1Id, user2Id);
      expect(result).toBe(70);
    });

    it('should handle user2 settlements', () => {
      const expenses = [
        {
          paidBy: user2Id,
          splitDetails: { user1Amount: 50, user2Amount: 50 },
        },
      ];

      const settlements = [
        {
          settledBy: user2Id,
          amount: 20,
        },
      ];

      // user1 owes 50, plus settlement -20 = 30
      const result = calculateSettlementAmount(expenses, settlements, user1Id, user2Id);
      expect(result).toBe(70); // absolute value
    });

    it('should return absolute value', () => {
      // user2 paid $100, user1 owes 100% (non-payer's share)
      // splitDetails: user1Amount = payer's share, user2Amount = non-payer's share
      const expenses = [
        {
          paidBy: user2Id,
          splitDetails: { user1Amount: 0, user2Amount: 100 },
        },
      ];

      const result = calculateSettlementAmount(expenses, [], user1Id, user2Id);
      expect(result).toBe(100); // Always positive
    });

    it('should handle missing splitDetails with 50/50 default', () => {
      const expenses = [
        {
          paidBy: user1Id,
          amount: 100,
        },
      ];

      const result = calculateSettlementAmount(expenses, [], user1Id, user2Id);
      expect(result).toBe(50);
    });

    it('should return 0 for balanced expenses', () => {
      const expenses = [
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 50, user2Amount: 50 },
        },
        {
          paidBy: user2Id,
          splitDetails: { user1Amount: 50, user2Amount: 50 },
        },
      ];

      const result = calculateSettlementAmount(expenses, [], user1Id, user2Id);
      expect(result).toBe(0);
    });

    it('should handle empty expenses and settlements', () => {
      const result = calculateSettlementAmount([], [], user1Id, user2Id);
      expect(result).toBe(0);
    });

    it('should handle complex scenario', () => {
      // splitDetails: user1Amount = payer's share, user2Amount = non-payer's share
      const expenses = [
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 60, user2Amount: 40 },  // user1 paid, user2 owes 40
        },
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 30, user2Amount: 70 },  // user1 paid, user2 owes 70
        },
        {
          paidBy: user2Id,
          splitDetails: { user1Amount: 50, user2Amount: 50 },  // user2 paid, user1 owes 50
        },
        {
          paidBy: user2Id,
          splitDetails: { user1Amount: 80, user2Amount: 20 },  // user2 paid, user1 owes 20
        },
      ];

      const settlements = [
        { settledBy: user1Id, amount: 10 },
        { settledBy: user2Id, amount: 5 },
      ];

      // user1 paid: user2 owes (40 + 70) = 110
      // user2 paid: user1 owes (50 + 20) = 70
      // Net: user2 owes 40
      // Settlement adjustments: +10 (user1) -5 (user2) = net +5
      // Total: 40 + 5 = 45
      const result = calculateSettlementAmount(expenses, settlements, user1Id, user2Id);
      expect(result).toBe(45);
    });
  });
});
