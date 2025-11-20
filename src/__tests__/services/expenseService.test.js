// src/__tests__/services/expenseService.test.js
// Integration tests for expense service CRUD operations

import {
  getExpenses,
  getExpenseById,
  addExpense,
  updateExpense,
  deleteExpense,
  canEditExpense,
  canDeleteExpense,
} from '../../services/expenseService';

import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

describe('expenseService.js - CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create - addExpense', () => {
    it('should add a new expense', async () => {
      const mockExpenseData = {
        coupleId: 'couple1',
        paidBy: 'user1',
        amount: 100,
        description: 'Groceries',
        category: 'food',
        date: new Date(),
        splitDetails: {
          user1Amount: 50,
          user2Amount: 50,
        },
      };

      const mockDocRef = { id: 'expense123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      const result = await addExpense(mockExpenseData);

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...mockExpenseData,
          createdAt: 'mock-timestamp',
        })
      );

      expect(result.id).toBe('expense123');
      expect(result.description).toBe('Groceries');
    });

    it('should include timestamp in created expense', async () => {
      const mockExpenseData = {
        coupleId: 'couple1',
        amount: 50,
      };

      addDoc.mockResolvedValue({ id: 'expense123' });
      serverTimestamp.mockReturnValue('timestamp');

      await addExpense(mockExpenseData);

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.createdAt).toBe('timestamp');
    });

    it('should handle errors when adding expense', async () => {
      const mockExpenseData = {
        coupleId: 'couple1',
        amount: 100,
      };

      addDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(addExpense(mockExpenseData)).rejects.toThrow('Firestore error');
    });
  });

  describe('Read - getExpenses', () => {
    it('should get all expenses for a couple', async () => {
      const mockExpenses = [
        {
          id: 'expense1',
          coupleId: 'couple1',
          amount: 100,
          description: 'Groceries',
        },
        {
          id: 'expense2',
          coupleId: 'couple1',
          amount: 50,
          description: 'Gas',
        },
      ];

      const mockSnapshot = {
        forEach: (callback) => {
          mockExpenses.forEach((expense) => {
            callback({
              id: expense.id,
              data: () => ({ ...expense, id: undefined }),
            });
          });
        },
      };

      getDocs.mockResolvedValue(mockSnapshot);
      query.mockReturnValue('mock-query');
      collection.mockReturnValue('mock-collection');

      const result = await getExpenses('couple1');

      expect(collection).toHaveBeenCalled();
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('coupleId', '==', 'couple1');
      expect(orderBy).toHaveBeenCalledWith('date', 'desc');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('expense1');
      expect(result[1].id).toBe('expense2');
    });

    it('should return empty array when no expenses found', async () => {
      const mockSnapshot = {
        forEach: () => {},
      };

      getDocs.mockResolvedValue(mockSnapshot);

      const result = await getExpenses('couple1');
      expect(result).toEqual([]);
    });

    it('should handle errors when getting expenses', async () => {
      getDocs.mockRejectedValue(new Error('Firestore error'));

      await expect(getExpenses('couple1')).rejects.toThrow('Firestore error');
    });
  });

  describe('Read - getExpenseById', () => {
    it('should get a single expense by ID', async () => {
      const mockExpense = {
        id: 'expense1',
        coupleId: 'couple1',
        amount: 100,
        description: 'Groceries',
      };

      getDoc.mockResolvedValue({
        exists: () => true,
        id: mockExpense.id,
        data: () => ({ ...mockExpense, id: undefined }),
      });

      const result = await getExpenseById('expense1');

      expect(getDoc).toHaveBeenCalled();
      expect(doc).toHaveBeenCalled();
      expect(result.id).toBe('expense1');
      expect(result.description).toBe('Groceries');
    });

    it('should throw error when expense not found', async () => {
      getDoc.mockResolvedValue({
        exists: () => false,
      });

      await expect(getExpenseById('nonexistent')).rejects.toThrow('Expense not found');
    });

    it('should handle errors when getting expense', async () => {
      getDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(getExpenseById('expense1')).rejects.toThrow('Firestore error');
    });
  });

  describe('Update - updateExpense', () => {
    it('should update an expense', async () => {
      const updates = {
        amount: 150,
        description: 'Updated description',
      };

      updateDoc.mockResolvedValue();
      serverTimestamp.mockReturnValue('update-timestamp');

      const result = await updateExpense('expense1', updates);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          amount: 150,
          description: 'Updated description',
          updatedAt: 'update-timestamp',
        })
      );

      expect(result.success).toBe(true);
    });

    it('should not update createdAt or id fields', async () => {
      const updates = {
        id: 'new-id',
        createdAt: new Date(),
        amount: 150,
      };

      updateDoc.mockResolvedValue();

      await updateExpense('expense1', updates);

      const callArgs = updateDoc.mock.calls[0][1];
      expect(callArgs.id).toBeUndefined();
      expect(callArgs.createdAt).toBeUndefined();
      expect(callArgs.amount).toBe(150);
    });

    it('should add updatedAt timestamp', async () => {
      updateDoc.mockResolvedValue();
      serverTimestamp.mockReturnValue('timestamp');

      await updateExpense('expense1', { amount: 100 });

      const callArgs = updateDoc.mock.calls[0][1];
      expect(callArgs.updatedAt).toBe('timestamp');
    });

    it('should handle errors when updating expense', async () => {
      updateDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(updateExpense('expense1', { amount: 100 })).rejects.toThrow('Firestore error');
    });
  });

  describe('Delete - deleteExpense', () => {
    it('should delete an expense', async () => {
      deleteDoc.mockResolvedValue();

      const result = await deleteExpense('expense1');

      expect(deleteDoc).toHaveBeenCalled();
      expect(doc).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle errors when deleting expense', async () => {
      deleteDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(deleteExpense('expense1')).rejects.toThrow('Firestore error');
    });
  });

  describe('Permission Checks - canEditExpense', () => {
    it('should allow editing if user created expense and not settled', () => {
      const expense = {
        paidBy: 'user1',
        settledAt: null,
      };

      expect(canEditExpense(expense, 'user1')).toBe(true);
    });

    it('should not allow editing if expense is settled', () => {
      const expense = {
        paidBy: 'user1',
        settledAt: new Date(),
      };

      expect(canEditExpense(expense, 'user1')).toBe(false);
    });

    it('should not allow editing if user did not create expense', () => {
      const expense = {
        paidBy: 'user1',
        settledAt: null,
      };

      expect(canEditExpense(expense, 'user2')).toBe(false);
    });

    it('should return false for null expense', () => {
      expect(canEditExpense(null, 'user1')).toBe(false);
    });

    it('should return false for null user ID', () => {
      const expense = {
        paidBy: 'user1',
        settledAt: null,
      };

      expect(canEditExpense(expense, null)).toBe(false);
    });
  });

  describe('Permission Checks - canDeleteExpense', () => {
    it('should allow deleting unsettled expense from same couple', () => {
      const expense = {
        coupleId: 'couple1',
        settledAt: null,
      };

      const result = canDeleteExpense(expense, 'user1', 'couple1');

      expect(result.canDelete).toBe(true);
      expect(result.isSettled).toBe(false);
    });

    it('should allow deleting but warn if expense is settled', () => {
      const expense = {
        coupleId: 'couple1',
        settledAt: new Date(),
      };

      const result = canDeleteExpense(expense, 'user1', 'couple1');

      expect(result.canDelete).toBe(true);
      expect(result.isSettled).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('settlement');
    });

    it('should not allow deleting expense from different couple', () => {
      const expense = {
        coupleId: 'couple1',
        settledAt: null,
      };

      const result = canDeleteExpense(expense, 'user1', 'couple2');

      expect(result.canDelete).toBe(false);
      expect(result.reason).toContain('does not belong');
    });

    it('should handle null expense', () => {
      const result = canDeleteExpense(null, 'user1', 'couple1');

      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe('Missing required data');
    });

    it('should handle missing user ID', () => {
      const expense = {
        coupleId: 'couple1',
        settledAt: null,
      };

      const result = canDeleteExpense(expense, null, 'couple1');

      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe('Missing required data');
    });

    it('should handle missing couple ID', () => {
      const expense = {
        coupleId: 'couple1',
        settledAt: null,
      };

      const result = canDeleteExpense(expense, 'user1', null);

      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe('Missing required data');
    });
  });

  describe('Integration - Full CRUD Cycle', () => {
    it('should handle complete expense lifecycle', async () => {
      // Create
      const expenseData = {
        coupleId: 'couple1',
        paidBy: 'user1',
        amount: 100,
        description: 'Groceries',
      };

      addDoc.mockResolvedValue({ id: 'expense1' });
      const created = await addExpense(expenseData);
      expect(created.id).toBe('expense1');

      // Read
      getDoc.mockResolvedValue({
        exists: () => true,
        id: 'expense1',
        data: () => ({ ...expenseData }),
      });

      const fetched = await getExpenseById('expense1');
      expect(fetched.description).toBe('Groceries');

      // Check edit permission
      const expense = { paidBy: 'user1', settledAt: null };
      expect(canEditExpense(expense, 'user1')).toBe(true);

      // Update
      updateDoc.mockResolvedValue();
      await updateExpense('expense1', { amount: 150 });
      expect(updateDoc).toHaveBeenCalled();

      // Check delete permission
      const deleteCheck = canDeleteExpense(
        { coupleId: 'couple1', settledAt: null },
        'user1',
        'couple1'
      );
      expect(deleteCheck.canDelete).toBe(true);

      // Delete
      deleteDoc.mockResolvedValue();
      const deleted = await deleteExpense('expense1');
      expect(deleted.success).toBe(true);
    });
  });

  describe('Validation and Edge Cases', () => {
    it('should handle expense with all fields', async () => {
      const completeExpense = {
        coupleId: 'couple1',
        paidBy: 'user1',
        amount: 99.99,
        description: 'Full expense',
        category: 'food',
        categoryKey: 'food',
        date: new Date(),
        splitDetails: {
          user1Amount: 60,
          user2Amount: 39.99,
          user1Percentage: 60,
          user2Percentage: 40,
        },
        notes: 'Additional notes',
      };

      addDoc.mockResolvedValue({ id: 'expense1' });

      const result = await addExpense(completeExpense);
      expect(result.id).toBe('expense1');
    });

    it('should handle expense with minimal fields', async () => {
      const minimalExpense = {
        coupleId: 'couple1',
        amount: 50,
      };

      addDoc.mockResolvedValue({ id: 'expense1' });

      const result = await addExpense(minimalExpense);
      expect(result.id).toBe('expense1');
    });

    it('should handle decimal amounts correctly', async () => {
      const expense = {
        coupleId: 'couple1',
        amount: 99.99,
      };

      addDoc.mockResolvedValue({ id: 'expense1' });

      await addExpense(expense);

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.amount).toBe(99.99);
    });
  });
});
