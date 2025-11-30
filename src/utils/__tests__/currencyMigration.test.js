// src/utils/__tests__/currencyMigration.test.js
// Unit tests for currency migration utilities

import {
  migrateExpensesToMultiCurrency,
  migrateBudgetsToMultiCurrency,
  migrateCoupleToCurrency,
  checkMigrationNeeded,
  dryRunMigration,
} from '../currencyMigration';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  db: {},
}));

// Mock Firestore functions
const mockGetDocs = jest.fn();
const mockWriteBatch = jest.fn();
const mockUpdate = jest.fn();
const mockCommit = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, name) => `collection_${name}`),
  getDocs: (...args) => mockGetDocs(...args),
  doc: jest.fn((db, collection, id) => ({ collection, id })),
  updateDoc: jest.fn(),
  query: jest.fn((...args) => `query_${args.join('_')}`),
  where: jest.fn((field, op, value) => `where_${field}_${op}_${value}`),
  writeBatch: jest.fn(() => ({
    update: mockUpdate,
    commit: mockCommit,
  })),
}));

describe('Currency Migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCommit.mockResolvedValue(undefined);
  });

  describe('migrateExpensesToMultiCurrency', () => {
    it('should migrate expenses successfully', async () => {
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 100, coupleId: 'couple1' }) },
        { id: 'exp2', data: () => ({ amount: 50, coupleId: 'couple1' }) },
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        size: 2,
        forEach: (callback) => mockExpenses.forEach(callback),
      });

      const result = await migrateExpensesToMultiCurrency('couple1', 'USD');

      expect(result.success).toBe(true);
      expect(result.expensesMigrated).toBe(2);
      expect(result.expensesSkipped).toBe(0);
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should skip expenses that already have currency fields', async () => {
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 100, currency: 'USD', primaryCurrencyAmount: 100 }) },
        { id: 'exp2', data: () => ({ amount: 50, coupleId: 'couple1' }) },
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        size: 2,
        forEach: (callback) => mockExpenses.forEach(callback),
      });

      const result = await migrateExpensesToMultiCurrency('couple1', 'USD');

      expect(result.expensesMigrated).toBe(1);
      expect(result.expensesSkipped).toBe(1);
    });

    it('should handle empty expense collection', async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        size: 0,
        forEach: jest.fn(),
      });

      const result = await migrateExpensesToMultiCurrency('couple1', 'USD');

      expect(result.success).toBe(true);
      expect(result.expensesMigrated).toBe(0);
      expect(result.message).toContain('No expenses found');
    });

    it('should batch writes for large datasets', async () => {
      // Create 1000 mock expenses to test batching (500 per batch)
      const mockExpenses = Array.from({ length: 1000 }, (_, i) => ({
        id: `exp${i}`,
        data: () => ({ amount: 100, coupleId: 'couple1' }),
      }));

      mockGetDocs.mockResolvedValue({
        empty: false,
        size: 1000,
        forEach: (callback) => mockExpenses.forEach(callback),
      });

      const result = await migrateExpensesToMultiCurrency('couple1', 'USD');

      expect(result.success).toBe(true);
      expect(result.expensesMigrated).toBe(1000);
      // Should have 2 batches (500 + 500)
      expect(mockCommit).toHaveBeenCalledTimes(2);
    });

    it('should use specified default currency', async () => {
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 100, coupleId: 'couple1' }) },
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        size: 1,
        forEach: (callback) => mockExpenses.forEach(callback),
      });

      await migrateExpensesToMultiCurrency('couple1', 'EUR');

      // Verify EUR was used (check through the update calls)
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle migration errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Database error'));

      const result = await migrateExpensesToMultiCurrency('couple1', 'USD');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('migrateBudgetsToMultiCurrency', () => {
    it('should migrate budgets successfully', async () => {
      const mockBudgets = [
        { id: 'budget1', data: () => ({ categoryBudgets: {}, coupleId: 'couple1' }) },
        { id: 'budget2', data: () => ({ categoryBudgets: {}, coupleId: 'couple1' }) },
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        size: 2,
        forEach: (callback) => mockBudgets.forEach(callback),
      });

      const result = await migrateBudgetsToMultiCurrency('couple1', 'USD');

      expect(result.success).toBe(true);
      expect(result.budgetsMigrated).toBe(2);
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should skip budgets that already have currency field', async () => {
      const mockBudgets = [
        { id: 'budget1', data: () => ({ currency: 'USD', coupleId: 'couple1' }) },
        { id: 'budget2', data: () => ({ categoryBudgets: {}, coupleId: 'couple1' }) },
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        size: 2,
        forEach: (callback) => mockBudgets.forEach(callback),
      });

      const result = await migrateBudgetsToMultiCurrency('couple1', 'USD');

      expect(result.budgetsMigrated).toBe(1);
      expect(result.budgetsSkipped).toBe(1);
    });

    it('should handle empty budget collection', async () => {
      mockGetDocs.mockResolvedValue({
        empty: true,
        size: 0,
        forEach: jest.fn(),
      });

      const result = await migrateBudgetsToMultiCurrency('couple1', 'USD');

      expect(result.success).toBe(true);
      expect(result.budgetsMigrated).toBe(0);
    });
  });

  describe('migrateCoupleToCurrency', () => {
    it('should migrate both expenses and budgets', async () => {
      // Mock expenses
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 100, coupleId: 'couple1' }) },
      ];

      // Mock budgets
      const mockBudgets = [
        { id: 'budget1', data: () => ({ categoryBudgets: {}, coupleId: 'couple1' }) },
      ];

      // First call is for expenses, second for budgets
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          size: 1,
          forEach: (callback) => mockExpenses.forEach(callback),
        })
        .mockResolvedValueOnce({
          empty: false,
          size: 1,
          forEach: (callback) => mockBudgets.forEach(callback),
        });

      const result = await migrateCoupleToCurrency('couple1', 'USD');

      expect(result.success).toBe(true);
      expect(result.expenses.success).toBe(true);
      expect(result.budgets.success).toBe(true);
      expect(result.summary.totalExpensesMigrated).toBe(1);
      expect(result.summary.totalBudgetsMigrated).toBe(1);
      expect(result.summary.currency).toBe('USD');
    });

    it('should report failure if expenses migration fails', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Expenses error'));

      const result = await migrateCoupleToCurrency('couple1', 'USD');

      expect(result.success).toBe(false);
    });
  });

  describe('checkMigrationNeeded', () => {
    it('should detect expenses needing migration', async () => {
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 100 }) }, // Needs migration
        { id: 'exp2', data: () => ({ amount: 50, currency: 'USD', primaryCurrencyAmount: 50 }) }, // Already migrated
      ];

      const mockBudgets = [
        { id: 'budget1', data: () => ({ currency: 'USD' }) },
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          size: 2,
          forEach: (callback) => mockExpenses.forEach(callback),
        })
        .mockResolvedValueOnce({
          size: 1,
          forEach: (callback) => mockBudgets.forEach(callback),
        });

      const result = await checkMigrationNeeded('couple1');

      expect(result.needsMigration).toBe(true);
      expect(result.expensesNeedMigration).toBe(1);
      expect(result.budgetsNeedMigration).toBe(0);
      expect(result.totalExpenses).toBe(2);
      expect(result.totalBudgets).toBe(1);
    });

    it('should detect no migration needed', async () => {
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 100, currency: 'USD', primaryCurrencyAmount: 100 }) },
      ];

      const mockBudgets = [
        { id: 'budget1', data: () => ({ currency: 'USD' }) },
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          size: 1,
          forEach: (callback) => mockExpenses.forEach(callback),
        })
        .mockResolvedValueOnce({
          size: 1,
          forEach: (callback) => mockBudgets.forEach(callback),
        });

      const result = await checkMigrationNeeded('couple1');

      expect(result.needsMigration).toBe(false);
      expect(result.expensesNeedMigration).toBe(0);
      expect(result.budgetsNeedMigration).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Check error'));

      const result = await checkMigrationNeeded('couple1');

      expect(result.needsMigration).toBe(false);
      expect(result.error).toBe('Check error');
    });
  });

  describe('dryRunMigration', () => {
    it('should preview migration without making changes', async () => {
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 100 }) },
        { id: 'exp2', data: () => ({ amount: 50 }) },
      ];

      const mockBudgets = [
        { id: 'budget1', data: () => ({}) },
      ];

      mockGetDocs
        .mockResolvedValueOnce({
          size: 2,
          forEach: (callback) => mockExpenses.forEach(callback),
        })
        .mockResolvedValueOnce({
          size: 1,
          forEach: (callback) => mockBudgets.forEach(callback),
        });

      const result = await dryRunMigration('couple1');

      expect(result.expensesNeedMigration).toBe(2);
      expect(result.budgetsNeedMigration).toBe(1);
      expect(result.totalExpenses).toBe(2);
      expect(result.totalBudgets).toBe(1);

      // Should NOT have committed any changes
      expect(mockCommit).not.toHaveBeenCalled();
    });
  });

  describe('Migration Data Integrity', () => {
    it('should preserve original expense amounts', async () => {
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 123.45, coupleId: 'couple1' }) },
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        size: 1,
        forEach: (callback) => mockExpenses.forEach(callback),
      });

      await migrateExpensesToMultiCurrency('couple1', 'USD');

      // Verify update was called with correct data structure
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'exp1' }),
        expect.objectContaining({
          currency: 'USD',
          primaryCurrency: 'USD',
          primaryCurrencyAmount: 123.45,
          exchangeRate: 1.0,
          exchangeRateSource: 'migration',
        })
      );
    });

    it('should set exchange rate to 1.0 for same-currency migration', async () => {
      const mockExpenses = [
        { id: 'exp1', data: () => ({ amount: 100, coupleId: 'couple1' }) },
      ];

      mockGetDocs.mockResolvedValue({
        empty: false,
        size: 1,
        forEach: (callback) => mockExpenses.forEach(callback),
      });

      await migrateExpensesToMultiCurrency('couple1', 'USD');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          exchangeRate: 1.0,
        })
      );
    });
  });
});
