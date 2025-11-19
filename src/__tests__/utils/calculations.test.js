// src/__tests__/utils/calculations.test.js
// Comprehensive unit tests for calculation utilities

import {
  calculateSplit,
  calculateEqualSplit,
  calculateBalance,
  calculateBalanceWithSettlements,
  formatBalance,
  formatCurrency,
  calculateTotalExpenses,
  calculateExpensesByCategory,
  calculateUserShare,
  calculateMonthlyStats,
  sortExpensesByDate,
  groupExpensesByDate,
  formatDate,
  roundCurrency,
  validateSettlement,
  isSettlementValid,
} from '../../utils/calculations';

describe('calculations.js - Math Behavior Tests', () => {
  describe('calculateSplit', () => {
    it('should calculate 50/50 split correctly', () => {
      const result = calculateSplit(100, 50, 50);
      expect(result).toEqual({
        user1Amount: 50,
        user2Amount: 50,
        user1Percentage: 50,
        user2Percentage: 50,
      });
    });

    it('should calculate 70/30 split correctly', () => {
      const result = calculateSplit(100, 70, 30);
      expect(result).toEqual({
        user1Amount: 70,
        user2Amount: 30,
        user1Percentage: 70,
        user2Percentage: 30,
      });
    });

    it('should calculate user2Percentage when not provided', () => {
      const result = calculateSplit(100, 60);
      expect(result).toEqual({
        user1Amount: 60,
        user2Amount: 40,
        user1Percentage: 60,
        user2Percentage: 40,
      });
    });

    it('should handle 0/100 split', () => {
      const result = calculateSplit(100, 0, 100);
      expect(result).toEqual({
        user1Amount: 0,
        user2Amount: 100,
        user1Percentage: 0,
        user2Percentage: 100,
      });
    });

    it('should handle 100/0 split', () => {
      const result = calculateSplit(100, 100, 0);
      expect(result).toEqual({
        user1Amount: 100,
        user2Amount: 0,
        user1Percentage: 100,
        user2Percentage: 0,
      });
    });

    it('should handle decimal amounts', () => {
      const result = calculateSplit(99.99, 60, 40);
      expect(result.user1Amount).toBeCloseTo(59.994);
      expect(result.user2Amount).toBeCloseTo(39.996);
    });

    it('should handle string inputs', () => {
      const result = calculateSplit('100', '60', '40');
      expect(result).toEqual({
        user1Amount: 60,
        user2Amount: 40,
        user1Percentage: 60,
        user2Percentage: 40,
      });
    });

    it('should throw error for negative amount', () => {
      expect(() => calculateSplit(-100, 50, 50)).toThrow('Invalid amount: must be a positive number');
    });

    it('should throw error for zero amount', () => {
      expect(() => calculateSplit(0, 50, 50)).toThrow('Invalid amount: must be a positive number');
    });

    it('should throw error for invalid amount', () => {
      expect(() => calculateSplit('abc', 50, 50)).toThrow('Invalid amount: must be a positive number');
    });

    it('should throw error for amount exceeding maximum', () => {
      expect(() => calculateSplit(1000001, 50, 50)).toThrow('Invalid amount: exceeds maximum allowed value');
    });

    it('should throw error for negative percentage', () => {
      expect(() => calculateSplit(100, -10, 110)).toThrow('Invalid percentage: must be between 0 and 100');
    });

    it('should throw error for percentage over 100', () => {
      expect(() => calculateSplit(100, 101, -1)).toThrow('Invalid percentage: must be between 0 and 100');
    });

    it('should throw error when percentages do not sum to 100', () => {
      expect(() => calculateSplit(100, 50, 60)).toThrow('Percentages must sum to 100');
    });

    it('should throw error for invalid percentage string', () => {
      expect(() => calculateSplit(100, 'abc', 50)).toThrow('Invalid percentage: must be between 0 and 100');
    });
  });

  describe('calculateEqualSplit', () => {
    it('should calculate 50/50 split for even amount', () => {
      const result = calculateEqualSplit(100);
      expect(result).toEqual({
        user1Amount: 50,
        user2Amount: 50,
        user1Percentage: 50,
        user2Percentage: 50,
      });
    });

    it('should calculate 50/50 split for odd amount', () => {
      const result = calculateEqualSplit(99);
      expect(result).toEqual({
        user1Amount: 49.5,
        user2Amount: 49.5,
        user1Percentage: 50,
        user2Percentage: 50,
      });
    });

    it('should handle decimal amounts', () => {
      const result = calculateEqualSplit(99.99);
      expect(result.user1Amount).toBeCloseTo(49.995);
      expect(result.user2Amount).toBeCloseTo(49.995);
    });

    it('should handle string input', () => {
      const result = calculateEqualSplit('100');
      expect(result).toEqual({
        user1Amount: 50,
        user2Amount: 50,
        user1Percentage: 50,
        user2Percentage: 50,
      });
    });

    it('should throw error for negative amount', () => {
      expect(() => calculateEqualSplit(-100)).toThrow('Invalid amount: must be a positive number');
    });

    it('should throw error for zero amount', () => {
      expect(() => calculateEqualSplit(0)).toThrow('Invalid amount: must be a positive number');
    });

    it('should throw error for amount exceeding maximum', () => {
      expect(() => calculateEqualSplit(1000001)).toThrow('Invalid amount: exceeds maximum allowed value');
    });
  });

  describe('calculateBalance', () => {
    const user1Id = 'user1';
    const user2Id = 'user2';

    it('should return 0 for empty expenses array', () => {
      const balance = calculateBalance([], user1Id, user2Id);
      expect(balance).toBe(0);
    });

    it('should calculate positive balance when user2 owes user1', () => {
      const expenses = [
        {
          paidBy: user1Id,
          splitDetails: { user1Amount: 30, user2Amount: 70 },
        },
      ];
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(70); // user2 owes 70
    });

    it('should calculate negative balance when user1 owes user2', () => {
      const expenses = [
        {
          paidBy: user2Id,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
      ];
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(-60); // user1 owes 60
    });

    it('should calculate balance for multiple expenses', () => {
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
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(20);
    });

    it('should calculate zero balance when expenses are equal', () => {
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
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(0);
    });

    it('should handle invalid expense objects gracefully', () => {
      const expenses = [
        null,
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
        undefined,
      ];
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(50);
    });

    it('should handle missing splitDetails gracefully', () => {
      const expenses = [
        { paidBy: user1Id },
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(50);
    });

    it('should handle invalid split amounts gracefully', () => {
      const expenses = [
        { paidBy: user1Id, splitDetails: { user1Amount: 'invalid', user2Amount: 50 } },
      ];
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(0);
    });

    it('should return 0 for non-array input', () => {
      const balance = calculateBalance('not an array', user1Id, user2Id);
      expect(balance).toBe(0);
    });

    it('should return 0 when user IDs are missing', () => {
      const expenses = [
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      expect(calculateBalance(expenses, null, user2Id)).toBe(0);
      expect(calculateBalance(expenses, user1Id, null)).toBe(0);
    });

    it('should ignore expenses with unknown paidBy', () => {
      const expenses = [
        { paidBy: 'unknownUser', splitDetails: { user1Amount: 50, user2Amount: 50 } },
        { paidBy: user1Id, splitDetails: { user1Amount: 30, user2Amount: 70 } },
      ];
      const balance = calculateBalance(expenses, user1Id, user2Id);
      expect(balance).toBe(70);
    });
  });

  describe('calculateBalanceWithSettlements', () => {
    const user1Id = 'user1';
    const user2Id = 'user2';
    const coupleId = 'couple1';

    it('should calculate balance with no settlements', () => {
      const expenses = [
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      const balance = calculateBalanceWithSettlements(expenses, [], user1Id, user2Id, coupleId);
      expect(balance).toBe(50);
    });

    it('should reduce balance when user1 settles', () => {
      const expenses = [
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      const settlements = [
        { settledBy: user1Id, amount: 30, coupleId },
      ];
      const balance = calculateBalanceWithSettlements(expenses, settlements, user1Id, user2Id, coupleId);
      expect(balance).toBe(80); // 50 + 30
    });

    it('should increase balance when user2 settles', () => {
      const expenses = [
        { paidBy: user2Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      const settlements = [
        { settledBy: user2Id, amount: 30, coupleId },
      ];
      const balance = calculateBalanceWithSettlements(expenses, settlements, user1Id, user2Id, coupleId);
      expect(balance).toBe(-80); // -50 - 30
    });

    it('should handle multiple settlements', () => {
      const expenses = [
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      const settlements = [
        { settledBy: user1Id, amount: 20, coupleId },
        { settledBy: user2Id, amount: 10, coupleId },
      ];
      const balance = calculateBalanceWithSettlements(expenses, settlements, user1Id, user2Id, coupleId);
      expect(balance).toBe(60); // 50 + 20 - 10
    });

    it('should ignore settlements from different couple', () => {
      const expenses = [
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      const settlements = [
        { settledBy: user1Id, amount: 30, coupleId: 'differentCouple' },
      ];
      const balance = calculateBalanceWithSettlements(expenses, settlements, user1Id, user2Id, coupleId);
      expect(balance).toBe(50); // Settlement ignored
    });

    it('should ignore invalid settlements', () => {
      const expenses = [
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      const settlements = [
        null,
        { settledBy: user1Id, amount: -10, coupleId }, // Invalid amount
        { settledBy: 'unknownUser', amount: 20, coupleId }, // Unknown user
      ];
      const balance = calculateBalanceWithSettlements(expenses, settlements, user1Id, user2Id, coupleId);
      expect(balance).toBe(50);
    });

    it('should handle non-array settlements input', () => {
      const expenses = [
        { paidBy: user1Id, splitDetails: { user1Amount: 50, user2Amount: 50 } },
      ];
      const balance = calculateBalanceWithSettlements(expenses, 'not an array', user1Id, user2Id, coupleId);
      expect(balance).toBe(50);
    });
  });

  describe('formatBalance', () => {
    it('should format positive balance correctly', () => {
      const result = formatBalance(50, 'Alice', 'Bob');
      expect(result).toEqual({
        amount: 50,
        text: 'Bob owes Alice',
        status: 'positive',
      });
    });

    it('should format negative balance correctly', () => {
      const result = formatBalance(-50, 'Alice', 'Bob');
      expect(result).toEqual({
        amount: 50,
        text: 'Alice owes Bob',
        status: 'negative',
      });
    });

    it('should format zero balance correctly', () => {
      const result = formatBalance(0, 'Alice', 'Bob');
      expect(result).toEqual({
        amount: 0,
        text: "You're all settled up!",
        status: 'settled',
      });
    });

    it('should use default names when not provided', () => {
      const result = formatBalance(50);
      expect(result).toEqual({
        amount: 50,
        text: 'Partner owes You',
        status: 'positive',
      });
    });
  });

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(100, 'USD')).toBe('$100.00');
    });

    it('should format decimals correctly', () => {
      expect(formatCurrency(99.99, 'USD')).toBe('$99.99');
      expect(formatCurrency(0.05, 'USD')).toBe('$0.05');
    });

    it('should handle negative amounts with absolute value', () => {
      expect(formatCurrency(-100, 'USD')).toBe('$100.00');
    });

    it('should format other currencies without symbol', () => {
      expect(formatCurrency(100, 'EUR')).toBe('100.00');
      expect(formatCurrency(100, 'GBP')).toBe('100.00');
    });
  });

  describe('calculateTotalExpenses', () => {
    it('should calculate total for single expense', () => {
      const expenses = [{ amount: 100 }];
      expect(calculateTotalExpenses(expenses)).toBe(100);
    });

    it('should calculate total for multiple expenses', () => {
      const expenses = [
        { amount: 100 },
        { amount: 50 },
        { amount: 25.50 },
      ];
      expect(calculateTotalExpenses(expenses)).toBeCloseTo(175.50);
    });

    it('should handle string amounts', () => {
      const expenses = [
        { amount: '100' },
        { amount: '50' },
      ];
      expect(calculateTotalExpenses(expenses)).toBe(150);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotalExpenses([])).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(calculateTotalExpenses(null)).toBe(0);
      expect(calculateTotalExpenses(undefined)).toBe(0);
    });
  });

  describe('calculateExpensesByCategory', () => {
    it('should group expenses by category', () => {
      const expenses = [
        { amount: 100, category: 'food' },
        { amount: 50, category: 'transport' },
        { amount: 30, category: 'food' },
      ];
      const result = calculateExpensesByCategory(expenses);
      expect(result).toEqual({
        food: 130,
        transport: 50,
      });
    });

    it('should handle missing category as "other"', () => {
      const expenses = [
        { amount: 100 },
        { amount: 50, category: 'food' },
      ];
      const result = calculateExpensesByCategory(expenses);
      expect(result).toEqual({
        other: 100,
        food: 50,
      });
    });

    it('should handle string amounts', () => {
      const expenses = [
        { amount: '100', category: 'food' },
        { amount: '50', category: 'food' },
      ];
      const result = calculateExpensesByCategory(expenses);
      expect(result).toEqual({
        food: 150,
      });
    });

    it('should return empty object for empty array', () => {
      expect(calculateExpensesByCategory([])).toEqual({});
    });

    it('should return empty object for null/undefined', () => {
      expect(calculateExpensesByCategory(null)).toEqual({});
      expect(calculateExpensesByCategory(undefined)).toEqual({});
    });
  });

  describe('calculateUserShare', () => {
    const userId = 'user1';

    it('should calculate share when user paid', () => {
      const expenses = [
        {
          paidBy: userId,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
      ];
      expect(calculateUserShare(expenses, userId)).toBe(60);
    });

    it('should calculate share when partner paid', () => {
      const expenses = [
        {
          paidBy: 'user2',
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
      ];
      expect(calculateUserShare(expenses, userId)).toBe(40);
    });

    it('should calculate total share for multiple expenses', () => {
      const expenses = [
        {
          paidBy: userId,
          splitDetails: { user1Amount: 60, user2Amount: 40 },
        },
        {
          paidBy: 'user2',
          splitDetails: { user1Amount: 30, user2Amount: 70 },
        },
      ];
      expect(calculateUserShare(expenses, userId)).toBe(90); // 60 + 30
    });

    it('should return 0 for empty array', () => {
      expect(calculateUserShare([], userId)).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(calculateUserShare(null, userId)).toBe(0);
      expect(calculateUserShare(undefined, userId)).toBe(0);
    });
  });

  describe('calculateMonthlyStats', () => {
    it('should calculate stats for specified month', () => {
      const expenses = [
        { amount: 100, category: 'food', date: new Date(2024, 0, 15) }, // Jan 2024
        { amount: 50, category: 'transport', date: new Date(2024, 0, 20) }, // Jan 2024
        { amount: 75, category: 'food', date: new Date(2024, 1, 10) }, // Feb 2024
      ];
      const result = calculateMonthlyStats(expenses, 0, 2024); // January (0-indexed)

      expect(result.total).toBe(150);
      expect(result.count).toBe(2);
      expect(result.byCategory).toEqual({
        food: 100,
        transport: 50,
      });
    });

    it('should return zeros for month with no expenses', () => {
      const expenses = [
        { amount: 100, category: 'food', date: new Date(2024, 0, 15) },
      ];
      const result = calculateMonthlyStats(expenses, 5, 2024); // June

      expect(result).toEqual({
        total: 0,
        count: 0,
        byCategory: {},
      });
    });

    it('should return zeros for empty expenses array', () => {
      const result = calculateMonthlyStats([], 0, 2024);
      expect(result).toEqual({
        total: 0,
        count: 0,
        byCategory: {},
      });
    });

    it('should filter by both month and year', () => {
      const expenses = [
        { amount: 100, category: 'food', date: new Date(2024, 0, 15) },
        { amount: 50, category: 'food', date: new Date(2023, 0, 15) }, // Different year
      ];
      const result = calculateMonthlyStats(expenses, 0, 2024);

      expect(result.total).toBe(100);
      expect(result.count).toBe(1);
    });
  });

  describe('sortExpensesByDate', () => {
    it('should sort expenses by date descending (newest first)', () => {
      const expenses = [
        { date: new Date(2024, 0, 15), amount: 100 },
        { date: new Date(2024, 0, 20), amount: 50 },
        { date: new Date(2024, 0, 10), amount: 75 },
      ];
      const sorted = sortExpensesByDate(expenses);

      expect(sorted[0].amount).toBe(50); // Jan 20
      expect(sorted[1].amount).toBe(100); // Jan 15
      expect(sorted[2].amount).toBe(75); // Jan 10
    });

    it('should sort expenses by date ascending when specified', () => {
      const expenses = [
        { date: new Date(2024, 0, 15), amount: 100 },
        { date: new Date(2024, 0, 20), amount: 50 },
        { date: new Date(2024, 0, 10), amount: 75 },
      ];
      const sorted = sortExpensesByDate(expenses, true);

      expect(sorted[0].amount).toBe(75); // Jan 10
      expect(sorted[1].amount).toBe(100); // Jan 15
      expect(sorted[2].amount).toBe(50); // Jan 20
    });

    it('should not mutate original array', () => {
      const expenses = [
        { date: new Date(2024, 0, 15), amount: 100 },
        { date: new Date(2024, 0, 20), amount: 50 },
      ];
      const original = [...expenses];
      sortExpensesByDate(expenses);

      expect(expenses).toEqual(original);
    });

    it('should return empty array for empty input', () => {
      expect(sortExpensesByDate([])).toEqual([]);
    });

    it('should return empty array for null/undefined', () => {
      expect(sortExpensesByDate(null)).toEqual([]);
      expect(sortExpensesByDate(undefined)).toEqual([]);
    });
  });

  describe('groupExpensesByDate', () => {
    it('should group expenses by date string', () => {
      const date1 = new Date(2024, 0, 15);
      const date2 = new Date(2024, 0, 16);

      const expenses = [
        { date: date1, amount: 100 },
        { date: date1, amount: 50 },
        { date: date2, amount: 75 },
      ];

      const grouped = groupExpensesByDate(expenses);
      const keys = Object.keys(grouped);

      expect(keys.length).toBe(2);
      expect(grouped[date1.toDateString()].length).toBe(2);
      expect(grouped[date2.toDateString()].length).toBe(1);
    });

    it('should return empty object for empty array', () => {
      expect(groupExpensesByDate([])).toEqual({});
    });

    it('should return empty object for null/undefined', () => {
      expect(groupExpensesByDate(null)).toEqual({});
      expect(groupExpensesByDate(undefined)).toEqual({});
    });
  });

  describe('roundCurrency', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(10.123)).toBe(10.12);
      expect(roundCurrency(10.126)).toBe(10.13);
    });

    it('should handle exact 2 decimals', () => {
      expect(roundCurrency(10.12)).toBe(10.12);
    });

    it('should handle whole numbers', () => {
      expect(roundCurrency(10)).toBe(10);
    });

    it('should handle rounding edge cases', () => {
      expect(roundCurrency(0.005)).toBe(0.01);
      expect(roundCurrency(0.004)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(roundCurrency(-10.126)).toBe(-10.13);
    });
  });

  describe('validateSettlement', () => {
    const currentUserId = 'user1';
    const currentUserCoupleId = 'couple1';
    const user2Id = 'user2';

    it('should validate correct settlement data', () => {
      const settlementData = {
        coupleId: currentUserCoupleId,
        user1Id: currentUserId,
        user2Id: user2Id,
        amount: 100,
        settledBy: currentUserId,
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result).toEqual({ valid: true, error: null });
    });

    it('should reject null settlement data', () => {
      const result = validateSettlement(null, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Settlement data is required');
    });

    it('should reject missing coupleId', () => {
      const settlementData = {
        user1Id: currentUserId,
        user2Id: user2Id,
        amount: 100,
        settledBy: currentUserId,
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Settlement must have a coupleId');
    });

    it('should reject different coupleId', () => {
      const settlementData = {
        coupleId: 'differentCouple',
        user1Id: currentUserId,
        user2Id: user2Id,
        amount: 100,
        settledBy: currentUserId,
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot create settlement for another couple');
    });

    it('should reject missing user IDs', () => {
      const settlementData = {
        coupleId: currentUserCoupleId,
        user2Id: user2Id,
        amount: 100,
        settledBy: currentUserId,
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Settlement must have both user IDs');
    });

    it('should reject when current user is not a member', () => {
      const settlementData = {
        coupleId: currentUserCoupleId,
        user1Id: 'otherUser1',
        user2Id: 'otherUser2',
        amount: 100,
        settledBy: 'otherUser1',
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Current user must be a member of the couple');
    });

    it('should reject missing settledBy', () => {
      const settlementData = {
        coupleId: currentUserCoupleId,
        user1Id: currentUserId,
        user2Id: user2Id,
        amount: 100,
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Settlement must have a settledBy field');
    });

    it('should reject invalid settledBy', () => {
      const settlementData = {
        coupleId: currentUserCoupleId,
        user1Id: currentUserId,
        user2Id: user2Id,
        amount: 100,
        settledBy: 'unknownUser',
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('settledBy must be one of the couple members');
    });

    it('should reject negative amount', () => {
      const settlementData = {
        coupleId: currentUserCoupleId,
        user1Id: currentUserId,
        user2Id: user2Id,
        amount: -100,
        settledBy: currentUserId,
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Settlement amount must be a positive number');
    });

    it('should reject zero amount', () => {
      const settlementData = {
        coupleId: currentUserCoupleId,
        user1Id: currentUserId,
        user2Id: user2Id,
        amount: 0,
        settledBy: currentUserId,
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Settlement amount must be a positive number');
    });

    it('should reject amount exceeding maximum', () => {
      const settlementData = {
        coupleId: currentUserCoupleId,
        user1Id: currentUserId,
        user2Id: user2Id,
        amount: 1000001,
        settledBy: currentUserId,
      };

      const result = validateSettlement(settlementData, currentUserId, currentUserCoupleId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Settlement amount exceeds maximum allowed value');
    });
  });

  describe('isSettlementValid', () => {
    const currentUserId = 'user1';
    const currentUserCoupleId = 'couple1';

    it('should validate settlement for current user', () => {
      const settlement = {
        coupleId: currentUserCoupleId,
        user1Id: currentUserId,
        user2Id: 'user2',
      };

      expect(isSettlementValid(settlement, currentUserId, currentUserCoupleId)).toBe(true);
    });

    it('should validate settlement when user is user2', () => {
      const settlement = {
        coupleId: currentUserCoupleId,
        user1Id: 'user2',
        user2Id: currentUserId,
      };

      expect(isSettlementValid(settlement, currentUserId, currentUserCoupleId)).toBe(true);
    });

    it('should reject null settlement', () => {
      expect(isSettlementValid(null, currentUserId, currentUserCoupleId)).toBe(false);
    });

    it('should reject settlement from different couple', () => {
      const settlement = {
        coupleId: 'differentCouple',
        user1Id: currentUserId,
        user2Id: 'user2',
      };

      expect(isSettlementValid(settlement, currentUserId, currentUserCoupleId)).toBe(false);
    });

    it('should reject settlement not involving current user', () => {
      const settlement = {
        coupleId: currentUserCoupleId,
        user1Id: 'otherUser1',
        user2Id: 'otherUser2',
      };

      expect(isSettlementValid(settlement, currentUserId, currentUserCoupleId)).toBe(false);
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      // Mock current date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format today as "Today"', () => {
      const today = new Date('2024-01-15T10:00:00');
      expect(formatDate(today)).toBe('Today');
    });

    it('should format yesterday as "Yesterday"', () => {
      const yesterday = new Date('2024-01-14T10:00:00');
      expect(formatDate(yesterday)).toBe('Yesterday');
    });

    it('should format dates within last week as day name', () => {
      const thursday = new Date('2024-01-11T10:00:00'); // 4 days ago
      expect(formatDate(thursday)).toBe('Thursday');
    });

    it('should format older dates with month and day', () => {
      const oldDate = new Date('2024-01-01T10:00:00');
      const formatted = formatDate(oldDate);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('1');
    });

    it('should include year for dates in different year', () => {
      const oldDate = new Date('2023-12-15T10:00:00');
      const formatted = formatDate(oldDate);
      expect(formatted).toContain('2023');
    });
  });
});
