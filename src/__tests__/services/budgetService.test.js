// src/__tests__/services/budgetService.test.js
// Unit tests for budget service calculation functions

import {
  calculateSpendingByCategory,
  calculateBudgetProgress,
  calculateBudgetSavings,
  getTotalBudget,
  getBudgetComplexity,
  isAutoCalculated,
  canAutoAdjust,
  isBudgetEnabled,
  shouldIncludeSavings,
} from '../../services/budgetService';
import { COMPLEXITY_MODES } from '../../constants/budgetDefaults';

describe('budgetService.js - Calculation Functions', () => {
  describe('calculateSpendingByCategory', () => {
    it('should calculate spending for current month', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 100,
          createdAt: { seconds: new Date('2024-01-15').getTime() / 1000 },
        },
        {
          categoryKey: 'transport',
          amount: 50,
          createdAt: { seconds: new Date('2024-01-20').getTime() / 1000 },
        },
        {
          categoryKey: 'food',
          amount: 30,
          createdAt: { seconds: new Date('2024-01-25').getTime() / 1000 },
        },
      ];

      const result = calculateSpendingByCategory(expenses, 1, 2024);
      expect(result).toEqual({
        food: 130,
        transport: 50,
      });
    });

    it('should filter by month and year correctly', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 100,
          createdAt: { seconds: new Date('2024-01-15').getTime() / 1000 },
        },
        {
          categoryKey: 'food',
          amount: 50,
          createdAt: { seconds: new Date('2024-02-15').getTime() / 1000 },
        },
        {
          categoryKey: 'food',
          amount: 75,
          createdAt: { seconds: new Date('2023-01-15').getTime() / 1000 },
        },
      ];

      const result = calculateSpendingByCategory(expenses, 1, 2024);
      expect(result).toEqual({
        food: 100,
      });
    });

    it('should handle expenses with Date objects', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 100,
          createdAt: new Date('2024-01-15'),
        },
      ];

      const result = calculateSpendingByCategory(expenses, 1, 2024);
      expect(result).toEqual({
        food: 100,
      });
    });

    it('should use "other" for missing category', () => {
      const expenses = [
        {
          amount: 100,
          createdAt: { seconds: new Date('2024-01-15').getTime() / 1000 },
        },
      ];

      const result = calculateSpendingByCategory(expenses, 1, 2024);
      expect(result).toEqual({
        other: 100,
      });
    });

    it('should return empty object for empty expenses', () => {
      const result = calculateSpendingByCategory([], 1, 2024);
      expect(result).toEqual({});
    });

    it('should handle category field instead of categoryKey', () => {
      const expenses = [
        {
          category: 'food',
          amount: 100,
          createdAt: { seconds: new Date('2024-01-15').getTime() / 1000 },
        },
      ];

      const result = calculateSpendingByCategory(expenses, 1, 2024);
      expect(result).toEqual({
        food: 100,
      });
    });
  });

  describe('calculateBudgetProgress', () => {
    const budget = {
      categoryBudgets: {
        food: 500,
        transport: 300,
        utilities: 200,
      },
    };

    beforeEach(() => {
      // Mock current date to January 2024
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate progress with spending below budget', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 300,
          createdAt: new Date('2024-01-10'),
        },
        {
          categoryKey: 'transport',
          amount: 100,
          createdAt: new Date('2024-01-15'),
        },
      ];

      const result = calculateBudgetProgress(budget, expenses);

      expect(result.totalBudget).toBe(1000);
      expect(result.totalSpent).toBe(400);
      expect(result.remaining).toBe(600);
      expect(result.categoryProgress.food).toEqual({
        budget: 500,
        spent: 300,
        remaining: 200,
        percentage: 60,
        status: 'normal',
      });
      expect(result.categoryProgress.transport).toEqual({
        budget: 300,
        spent: 100,
        remaining: 200,
        percentage: (100 / 300) * 100,
        status: 'normal',
      });
    });

    it('should mark category as warning when 80-99% spent', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 450, // 90% of 500
          createdAt: new Date('2024-01-10'),
        },
      ];

      const result = calculateBudgetProgress(budget, expenses);
      expect(result.categoryProgress.food.status).toBe('warning');
      expect(result.categoryProgress.food.percentage).toBe(90);
    });

    it('should mark category as danger when 100%+ spent', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 600, // 120% of 500
          createdAt: new Date('2024-01-10'),
        },
      ];

      const result = calculateBudgetProgress(budget, expenses);
      expect(result.categoryProgress.food.status).toBe('danger');
      expect(result.categoryProgress.food.percentage).toBe(120);
    });

    it('should handle categories with no spending', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 100,
          createdAt: new Date('2024-01-10'),
        },
      ];

      const result = calculateBudgetProgress(budget, expenses);
      expect(result.categoryProgress.transport).toEqual({
        budget: 300,
        spent: 0,
        remaining: 300,
        percentage: 0,
        status: 'normal',
      });
    });

    it('should return zeros for null budget', () => {
      const result = calculateBudgetProgress(null, []);
      expect(result).toEqual({
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        categoryProgress: {},
      });
    });

    it('should return zeros for budget without categoryBudgets', () => {
      const result = calculateBudgetProgress({}, []);
      expect(result).toEqual({
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        categoryProgress: {},
      });
    });

    it('should ignore expenses from other months', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 300,
          createdAt: new Date('2024-01-10'),
        },
        {
          categoryKey: 'food',
          amount: 500,
          createdAt: new Date('2024-02-10'), // Different month
        },
      ];

      const result = calculateBudgetProgress(budget, expenses);
      expect(result.totalSpent).toBe(300);
    });
  });

  describe('calculateBudgetSavings', () => {
    const budget = {
      categoryBudgets: {
        food: 500,
        transport: 300,
      },
      includeSavings: true,
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate savings when under budget', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 300,
          createdAt: new Date('2024-01-10'),
        },
      ];

      const result = calculateBudgetSavings(budget, expenses);
      expect(result.savings).toBe(500); // 800 total - 300 spent
      expect(result.overage).toBe(0);
      expect(result.splitAmount).toBe(250); // 500 / 2
    });

    it('should calculate overage when over budget', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 900,
          createdAt: new Date('2024-01-10'),
        },
      ];

      const result = calculateBudgetSavings(budget, expenses);
      expect(result.savings).toBe(0);
      expect(result.overage).toBe(100); // 900 - 800 budget
      expect(result.splitAmount).toBe(0);
    });

    it('should not split savings if includeSavings is false', () => {
      const budgetNoSplit = {
        ...budget,
        includeSavings: false,
      };

      const expenses = [
        {
          categoryKey: 'food',
          amount: 300,
          createdAt: new Date('2024-01-10'),
        },
      ];

      const result = calculateBudgetSavings(budgetNoSplit, expenses);
      expect(result.savings).toBe(500);
      expect(result.splitAmount).toBe(0);
    });

    it('should include category breakdown', () => {
      const expenses = [
        {
          categoryKey: 'food',
          amount: 300,
          createdAt: new Date('2024-01-10'),
        },
      ];

      const result = calculateBudgetSavings(budget, expenses);
      expect(result.categoryBreakdown).toBeDefined();
      expect(result.categoryBreakdown.food).toBeDefined();
      expect(result.categoryBreakdown.transport).toBeDefined();
    });
  });

  describe('getTotalBudget', () => {
    it('should calculate total from category budgets', () => {
      const budget = {
        categoryBudgets: {
          food: 500,
          transport: 300,
          utilities: 200,
        },
      };

      expect(getTotalBudget(budget)).toBe(1000);
    });

    it('should return 0 for null budget', () => {
      expect(getTotalBudget(null)).toBe(0);
    });

    it('should return 0 for budget without categoryBudgets', () => {
      expect(getTotalBudget({})).toBe(0);
    });

    it('should handle empty categoryBudgets', () => {
      const budget = {
        categoryBudgets: {},
      };

      expect(getTotalBudget(budget)).toBe(0);
    });

    it('should handle decimal amounts', () => {
      const budget = {
        categoryBudgets: {
          food: 500.50,
          transport: 300.25,
        },
      };

      expect(getTotalBudget(budget)).toBeCloseTo(800.75);
    });
  });

  describe('getBudgetComplexity', () => {
    it('should return complexity from budget', () => {
      const budget = {
        complexity: COMPLEXITY_MODES.ADVANCED,
      };

      expect(getBudgetComplexity(budget)).toBe(COMPLEXITY_MODES.ADVANCED);
    });

    it('should return SIMPLE as default', () => {
      expect(getBudgetComplexity({})).toBe(COMPLEXITY_MODES.SIMPLE);
      expect(getBudgetComplexity(null)).toBe(COMPLEXITY_MODES.SIMPLE);
    });

    it('should handle all complexity modes', () => {
      expect(getBudgetComplexity({ complexity: COMPLEXITY_MODES.NONE })).toBe(COMPLEXITY_MODES.NONE);
      expect(getBudgetComplexity({ complexity: COMPLEXITY_MODES.SIMPLE })).toBe(COMPLEXITY_MODES.SIMPLE);
      expect(getBudgetComplexity({ complexity: COMPLEXITY_MODES.ADVANCED })).toBe(COMPLEXITY_MODES.ADVANCED);
    });
  });

  describe('isAutoCalculated', () => {
    it('should return true when autoCalculated is true', () => {
      const budget = {
        autoCalculated: true,
      };

      expect(isAutoCalculated(budget)).toBe(true);
    });

    it('should return false when autoCalculated is false', () => {
      const budget = {
        autoCalculated: false,
      };

      expect(isAutoCalculated(budget)).toBe(false);
    });

    it('should return false when autoCalculated is not set', () => {
      expect(isAutoCalculated({})).toBe(false);
      expect(isAutoCalculated(null)).toBe(false);
    });
  });

  describe('canAutoAdjust', () => {
    it('should return true when canAutoAdjust is true', () => {
      const budget = {
        canAutoAdjust: true,
      };

      expect(canAutoAdjust(budget)).toBe(true);
    });

    it('should return false when canAutoAdjust is false', () => {
      const budget = {
        canAutoAdjust: false,
      };

      expect(canAutoAdjust(budget)).toBe(false);
    });

    it('should return false when canAutoAdjust is not set', () => {
      expect(canAutoAdjust({})).toBe(false);
      expect(canAutoAdjust(null)).toBe(false);
    });
  });

  describe('isBudgetEnabled', () => {
    it('should return true when enabled is true', () => {
      const budget = {
        enabled: true,
      };

      expect(isBudgetEnabled(budget)).toBe(true);
    });

    it('should return true when enabled is not set (default)', () => {
      expect(isBudgetEnabled({})).toBe(true);
    });

    it('should return false when enabled is false', () => {
      const budget = {
        enabled: false,
      };

      expect(isBudgetEnabled(budget)).toBe(false);
    });

    it('should return false for null budget', () => {
      expect(isBudgetEnabled(null)).toBe(false);
    });
  });

  describe('shouldIncludeSavings', () => {
    it('should return true when includeSavings is true', () => {
      const budget = {
        includeSavings: true,
      };

      expect(shouldIncludeSavings(budget)).toBe(true);
    });

    it('should return true when includeSavings is not set (default)', () => {
      expect(shouldIncludeSavings({})).toBe(true);
    });

    it('should return false when includeSavings is false', () => {
      const budget = {
        includeSavings: false,
      };

      expect(shouldIncludeSavings(budget)).toBe(false);
    });

    it('should return false for null budget', () => {
      expect(shouldIncludeSavings(null)).toBe(false);
    });
  });
});
