// src/__tests__/services/commandExecutor.test.js
// Integration tests for command execution and business logic

import { executeCommand, INTENTS } from '../../services/commandExecutor';
import * as expenseService from '../../services/expenseService';
import * as fuzzyMatcher from '../../services/fuzzyMatcher';

// Mock the services
jest.mock('../../services/expenseService');
jest.mock('../../services/fuzzyMatcher');

describe('commandExecutor.js - Command Execution Integration', () => {
  // Mock context data
  const mockContext = {
    categories: {
      food: { name: 'Groceries', icon: '🛒', budget: 500 },
      transport: { name: 'Transportation', icon: '🚗', budget: 200 },
      utilities: { name: 'Utilities', icon: '💡', budget: 150 },
    },
    currentBudget: {
      monthlyIncome: 3000,
      categories: {
        food: { budget: 500, spent: 200 },
        transport: { budget: 200, spent: 100 },
        utilities: { budget: 150, spent: 75 },
      },
    },
    budgetProgress: {
      totalBudget: 3000,
      totalSpent: 375,
      remainingBudget: 2625,
      percentageUsed: 12.5,
    },
    expenses: [
      {
        id: 'expense1',
        amount: 50,
        description: 'Groceries',
        category: 'food',
        paidBy: 'user1',
        date: new Date(),
      },
    ],
    userDetails: {
      userId: 'user1',
      coupleId: 'couple1',
      partnerName: 'Partner',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ADD_EXPENSE Command', () => {
    it('should successfully add expense with exact category match', async () => {
      const entities = {
        amount: 50,
        description: 'Weekly groceries',
        categoryText: 'groceries',
        splitRatio: { user1: 50, user2: 50 },
        date: new Date(),
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue({
        key: 'food',
        category: mockContext.categories.food,
        score: 1.0,
        exact: true,
      });

      expenseService.addExpense.mockResolvedValue({
        id: 'expense123',
        ...entities,
      });

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('$50');
      expect(result.message).toContain('Weekly groceries');
      expect(expenseService.addExpense).toHaveBeenCalled();
    });

    it('should add expense with fuzzy category match', async () => {
      const entities = {
        amount: 30,
        description: 'Lunch',
        categoryText: 'groceris', // typo
        splitRatio: { user1: 50, user2: 50 },
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue({
        key: 'food',
        category: mockContext.categories.food,
        score: 0.88,
        exact: false,
      });

      expenseService.addExpense.mockResolvedValue({
        id: 'expense123',
        ...entities,
      });

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Groceries'); // Matched category name
    });

    it('should return error when category not found', async () => {
      const entities = {
        amount: 50,
        description: 'Something',
        categoryText: 'unknown_category',
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue(null);

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('category');
      expect(expenseService.addExpense).not.toHaveBeenCalled();
    });

    it('should provide category suggestions when match not found', async () => {
      const entities = {
        amount: 50,
        description: 'Test',
        categoryText: 'xyz',
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue(null);

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Groceries');
      expect(result.message).toContain('Transportation');
    });

    it('should return error when amount is missing', async () => {
      const entities = {
        description: 'Groceries',
        categoryText: 'food',
      };

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('amount');
    });

    it('should warn when approaching budget limit', async () => {
      const entities = {
        amount: 250, // This will push food category to 90%
        description: 'Big grocery shop',
        categoryText: 'groceries',
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue({
        key: 'food',
        category: mockContext.categories.food,
        score: 1.0,
        exact: true,
      });

      expenseService.addExpense.mockResolvedValue({
        id: 'expense123',
        ...entities,
      });

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.budgetWarning).toBeDefined();
      expect(result.data.budgetWarning.level).toBe('warning');
    });

    it('should warn when exceeding budget', async () => {
      const entities = {
        amount: 350, // This will exceed food budget
        description: 'Huge grocery shop',
        categoryText: 'groceries',
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue({
        key: 'food',
        category: mockContext.categories.food,
        score: 1.0,
        exact: true,
      });

      expenseService.addExpense.mockResolvedValue({
        id: 'expense123',
        ...entities,
      });

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.budgetWarning).toBeDefined();
      expect(result.data.budgetWarning.level).toBe('over');
    });

    it('should handle service errors gracefully', async () => {
      const entities = {
        amount: 50,
        description: 'Test',
        categoryText: 'groceries',
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue({
        key: 'food',
        category: mockContext.categories.food,
        score: 1.0,
        exact: true,
      });

      expenseService.addExpense.mockRejectedValue(new Error('Database error'));

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });
  });

  describe('EDIT_EXPENSE Command', () => {
    it('should show edit prompt when no field specified', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.EDIT_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Edit Last Expense');
      expect(result.message).toContain('$50'); // Last expense amount
      expect(result.message).toContain('Groceries'); // Last expense description
    });

    it('should return error when no expenses exist', async () => {
      const emptyContext = {
        ...mockContext,
        expenses: [],
      };

      const entities = {};

      const result = await executeCommand(INTENTS.EDIT_EXPENSE, entities, emptyContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No expenses to edit');
    });

    it('should edit amount field', async () => {
      const entities = {
        field: 'amount',
        newValue: 75,
      };

      expenseService.updateExpense.mockResolvedValue({
        success: true,
      });

      const result = await executeCommand(INTENTS.EDIT_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(expenseService.updateExpense).toHaveBeenCalledWith(
        'expense1',
        expect.objectContaining({ amount: 75 })
      );
    });

    it('should edit category field', async () => {
      const entities = {
        field: 'category',
        newValue: 'transport',
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue({
        key: 'transport',
        category: mockContext.categories.transport,
        score: 1.0,
        exact: true,
      });

      expenseService.updateExpense.mockResolvedValue({
        success: true,
      });

      const result = await executeCommand(INTENTS.EDIT_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(expenseService.updateExpense).toHaveBeenCalled();
    });

    it('should edit description field', async () => {
      const entities = {
        field: 'description',
        newValue: 'Updated description',
      };

      expenseService.updateExpense.mockResolvedValue({
        success: true,
      });

      const result = await executeCommand(INTENTS.EDIT_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(expenseService.updateExpense).toHaveBeenCalledWith(
        'expense1',
        expect.objectContaining({ description: 'Updated description' })
      );
    });

    it('should return error for invalid amount', async () => {
      const entities = {
        field: 'amount',
        newValue: null,
      };

      const result = await executeCommand(INTENTS.EDIT_EXPENSE, entities, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('valid');
    });
  });

  describe('DELETE_EXPENSE Command', () => {
    it('should request confirmation for delete', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.DELETE_EXPENSE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.needsConfirmation).toBe(true);
      expect(result.confirmationContext).toBeDefined();
      expect(result.message).toContain('Are you sure');
    });

    it('should return error when no expenses to delete', async () => {
      const emptyContext = {
        ...mockContext,
        expenses: [],
      };

      const entities = {};

      const result = await executeCommand(INTENTS.DELETE_EXPENSE, entities, emptyContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No expenses to delete');
    });
  });

  describe('QUERY_BUDGET Command', () => {
    it('should show overall budget when no category specified', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.QUERY_BUDGET, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Budget Overview');
      expect(result.message).toContain('$375');
      expect(result.message).toContain('$3000');
    });

    it('should show specific category budget', async () => {
      const entities = {
        categoryText: 'groceries',
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue({
        key: 'food',
        category: mockContext.categories.food,
        score: 1.0,
        exact: true,
      });

      const result = await executeCommand(INTENTS.QUERY_BUDGET, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Groceries');
      expect(result.message).toContain('$200');
      expect(result.message).toContain('$500');
    });

    it('should return error when no budget set', async () => {
      const noBudgetContext = {
        ...mockContext,
        currentBudget: null,
      };

      const entities = {};

      const result = await executeCommand(INTENTS.QUERY_BUDGET, entities, noBudgetContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no budget');
    });
  });

  describe('QUERY_BALANCE Command', () => {
    it('should calculate and show balance', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.QUERY_BALANCE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Current Balance');
    });

    it('should show settled message when balance is zero', async () => {
      const settledContext = {
        ...mockContext,
        expenses: [],
      };

      const entities = {};

      const result = await executeCommand(INTENTS.QUERY_BALANCE, entities, settledContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('settled');
    });
  });

  describe('QUERY_SPENDING Command', () => {
    it('should show top spending categories', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.QUERY_SPENDING, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Top Spending');
    });

    it('should show spending for specific category', async () => {
      const entities = {
        categoryText: 'groceries',
      };

      fuzzyMatcher.findMatchingCategory.mockReturnValue({
        key: 'food',
        category: mockContext.categories.food,
        score: 1.0,
        exact: true,
      });

      const result = await executeCommand(INTENTS.QUERY_SPENDING, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Groceries');
    });
  });

  describe('LIST_EXPENSES Command', () => {
    it('should list recent expenses', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.LIST_EXPENSES, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Recent Expenses');
    });

    it('should handle no expenses', async () => {
      const emptyContext = {
        ...mockContext,
        expenses: [],
      };

      const entities = {};

      const result = await executeCommand(INTENTS.LIST_EXPENSES, entities, emptyContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('no expenses');
    });
  });

  describe('HELP Command', () => {
    it('should return help message', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.HELP, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Budget Assistant');
      expect(result.message).toContain('Add Expense');
    });
  });

  describe('SETTLE Command', () => {
    it('should redirect to settlement screen', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.SETTLE, entities, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('settle');
      expect(result.message).toContain('Home');
    });
  });

  describe('UNKNOWN Command', () => {
    it('should return helpful error message', async () => {
      const entities = {};

      const result = await executeCommand(INTENTS.UNKNOWN, entities, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not sure');
      expect(result.message).toContain('help');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing context gracefully', async () => {
      const entities = {
        amount: 50,
        description: 'Test',
        categoryText: 'groceries',
      };

      const result = await executeCommand(INTENTS.ADD_EXPENSE, entities, null);

      expect(result.success).toBe(false);
    });

    it('should handle malformed entities', async () => {
      const malformedEntities = {
        amount: 'not a number',
      };

      const result = await executeCommand(INTENTS.ADD_EXPENSE, malformedEntities, mockContext);

      expect(result.success).toBe(false);
    });
  });
});
