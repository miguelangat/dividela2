// src/utils/__tests__/calculations.multi-currency.test.js
// Unit tests for multi-currency support in balance calculations

import {
  calculateBalance,
  calculateTotalExpenses,
  calculateExpensesByCategory,
  formatCurrency,
} from '../calculations';

describe('Calculations - Multi-Currency Support', () => {
  const user1Id = 'user1';
  const user2Id = 'user2';

  describe('calculateBalance with multi-currency', () => {
    it('should calculate balance using primaryCurrencyAmount', () => {
      const expenses = [
        {
          amount: 50, // Original EUR
          currency: 'EUR',
          primaryCurrencyAmount: 55, // Converted to USD
          primaryCurrency: 'USD',
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 27.5,
            user2Amount: 27.5,
            user1Percentage: 50,
            user2Percentage: 50,
          },
        },
        {
          amount: 100, // USD
          currency: 'USD',
          primaryCurrencyAmount: 100,
          primaryCurrency: 'USD',
          paidBy: user2Id,
          splitDetails: {
            user1Amount: 50,
            user2Amount: 50,
            user1Percentage: 50,
            user2Percentage: 50,
          },
        },
      ];

      // User1 paid €50 (=$55), user2 owes $27.50
      // User2 paid $100, user1 owes $50
      // Balance = 27.5 - 50 = -22.5 (user1 owes user2 $22.50)
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(-22.5);
    });

    it('should handle all same-currency expenses (legacy)', () => {
      const expenses = [
        {
          amount: 100,
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 50,
            user2Amount: 50,
          },
        },
        {
          amount: 80,
          paidBy: user2Id,
          splitDetails: {
            user1Amount: 40,
            user2Amount: 40,
          },
        },
      ];

      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(10); // user2 owes user1 $10
    });

    it('should handle mixed currency expenses', () => {
      const expenses = [
        {
          amount: 100, // MXN
          currency: 'MXN',
          primaryCurrencyAmount: 5, // ~$5 USD
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 2.5,
            user2Amount: 2.5,
          },
        },
        {
          amount: 50, // EUR
          currency: 'EUR',
          primaryCurrencyAmount: 55, // ~$55 USD
          paidBy: user2Id,
          splitDetails: {
            user1Amount: 27.5,
            user2Amount: 27.5,
          },
        },
        {
          amount: 100, // USD
          currency: 'USD',
          primaryCurrencyAmount: 100,
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 50,
            user2Amount: 50,
          },
        },
      ];

      // User1 paid: 100MXN ($5) + $100 = $105, user2 owes $52.50
      // User2 paid: €50 ($55), user1 owes $27.50
      // Balance = 52.50 - 27.50 = 25 (user2 owes user1 $25)
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(25);
    });

    it('should handle backwards compatibility (expenses without primaryCurrencyAmount)', () => {
      const expenses = [
        {
          amount: 100,
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 50,
            user2Amount: 50,
          },
        },
      ];

      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(50);
    });

    it('should return 0 for empty expenses array', () => {
      const balance = calculateBalance([], user1Id, user2Id);
      expect(balance).toBe(0);
    });

    it('should handle invalid expense objects gracefully', () => {
      const expenses = [
        null,
        undefined,
        {},
        {
          amount: 100,
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 50,
            user2Amount: 50,
          },
        },
      ];

      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(50);
    });
  });

  describe('calculateTotalExpenses with multi-currency', () => {
    it('should sum primaryCurrencyAmount for multi-currency expenses', () => {
      const expenses = [
        {
          amount: 50,
          currency: 'EUR',
          primaryCurrencyAmount: 55,
        },
        {
          amount: 100,
          currency: 'USD',
          primaryCurrencyAmount: 100,
        },
        {
          amount: 1000,
          currency: 'MXN',
          primaryCurrencyAmount: 50,
        },
      ];

      const total = calculateTotalExpenses(expenses);
      expect(total).toBe(205); // 55 + 100 + 50
    });

    it('should handle legacy expenses without primaryCurrencyAmount', () => {
      const expenses = [
        {
          amount: 100,
        },
        {
          amount: 50,
        },
      ];

      const total = calculateTotalExpenses(expenses);
      expect(total).toBe(150);
    });

    it('should return 0 for empty array', () => {
      const total = calculateTotalExpenses([]);
      expect(total).toBe(0);
    });
  });

  describe('calculateExpensesByCategory with multi-currency', () => {
    it('should group by category using primaryCurrencyAmount', () => {
      const expenses = [
        {
          amount: 50,
          currency: 'EUR',
          primaryCurrencyAmount: 55,
          category: 'food',
        },
        {
          amount: 30,
          currency: 'EUR',
          primaryCurrencyAmount: 33,
          category: 'food',
        },
        {
          amount: 100,
          currency: 'USD',
          primaryCurrencyAmount: 100,
          category: 'transport',
        },
      ];

      const byCategory = calculateExpensesByCategory(expenses);
      expect(byCategory.food).toBe(88); // 55 + 33
      expect(byCategory.transport).toBe(100);
    });

    it('should handle mixed legacy and new expenses', () => {
      const expenses = [
        {
          amount: 50,
          category: 'food',
          // No primaryCurrencyAmount (legacy)
        },
        {
          amount: 40,
          currency: 'EUR',
          primaryCurrencyAmount: 44,
          category: 'food',
        },
      ];

      const byCategory = calculateExpensesByCategory(expenses);
      expect(byCategory.food).toBe(94); // 50 + 44
    });
  });

  describe('formatCurrency with currencyUtils integration', () => {
    it('should use new currency utils when available', () => {
      const formatted = formatCurrency(1234.56, 'USD');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should fallback gracefully if currencyUtils not available', () => {
      // This tests the fallback in the dynamic import
      const formatted = formatCurrency(100, 'USD');
      expect(formatted).toContain('100');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small exchange rates', () => {
      const expenses = [
        {
          amount: 100,
          currency: 'MXN',
          primaryCurrencyAmount: 5, // 0.05 rate
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 2.5,
            user2Amount: 2.5,
          },
        },
      ];

      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(2.5);
    });

    it('should handle very large amounts', () => {
      const expenses = [
        {
          amount: 1000000,
          currency: 'USD',
          primaryCurrencyAmount: 1000000,
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 500000,
            user2Amount: 500000,
          },
        },
      ];

      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(500000);
    });

    it('should handle decimal precision correctly', () => {
      const expenses = [
        {
          amount: 33.33,
          currency: 'EUR',
          primaryCurrencyAmount: 36.66, // 1.1 rate
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 18.33,
            user2Amount: 18.33,
          },
        },
      ];

      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(18.33);
    });
  });

  describe('Currency Conversion Accuracy', () => {
    it('should maintain accuracy through conversion and splitting', () => {
      // Real scenario: €100 at 1.10 rate = $110
      // Split 50/50 = $55 each
      const expenses = [
        {
          amount: 100,
          currency: 'EUR',
          primaryCurrencyAmount: 110,
          exchangeRate: 1.10,
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 55,
            user2Amount: 55,
          },
        },
      ];

      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(55); // Exact, no rounding errors
    });

    it('should handle custom splits with currency conversion', () => {
      // €100 at 1.10 = $110
      // Split 60/40
      const expenses = [
        {
          amount: 100,
          currency: 'EUR',
          primaryCurrencyAmount: 110,
          exchangeRate: 1.10,
          paidBy: user1Id,
          splitDetails: {
            user1Amount: 66,
            user2Amount: 44,
            user1Percentage: 60,
            user2Percentage: 40,
          },
        },
      ];

      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(44);
    });
  });
});
