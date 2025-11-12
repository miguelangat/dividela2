// src/services/expenseService.js
// Service for managing expenses

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
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get all expenses for a couple
 */
export const getExpenses = async (coupleId) => {
  try {
    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef,
      where('coupleId', '==', coupleId),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    const expenses = [];

    snapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return expenses;
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time expense updates
 */
export const subscribeToExpenses = (coupleId, callback) => {
  const expensesRef = collection(db, 'expenses');
  const q = query(
    expensesRef,
    where('coupleId', '==', coupleId),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const expenses = [];
    snapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    callback(expenses);
  }, (error) => {
    console.error('Error in expense subscription:', error);
  });
};

/**
 * Get a single expense by ID
 */
export const getExpenseById = async (expenseId) => {
  try {
    const expenseDoc = await getDoc(doc(db, 'expenses', expenseId));

    if (!expenseDoc.exists()) {
      throw new Error('Expense not found');
    }

    return {
      id: expenseDoc.id,
      ...expenseDoc.data(),
    };
  } catch (error) {
    console.error('Error getting expense:', error);
    throw error;
  }
};

/**
 * Add a new expense
 */
export const addExpense = async (expenseData) => {
  try {
    const expensesRef = collection(db, 'expenses');

    const newExpense = {
      ...expenseData,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(expensesRef, newExpense);

    console.log('✅ Expense added:', docRef.id);
    return {
      id: docRef.id,
      ...newExpense,
    };
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

/**
 * Update an existing expense
 */
export const updateExpense = async (expenseId, updates) => {
  try {
    const expenseRef = doc(db, 'expenses', expenseId);

    // Remove fields that shouldn't be updated
    const { id, createdAt, ...allowedUpdates } = updates;

    await updateDoc(expenseRef, {
      ...allowedUpdates,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Expense updated:', expenseId);
    return { success: true };
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

/**
 * Delete an expense
 */
export const deleteExpense = async (expenseId) => {
  try {
    const expenseRef = doc(db, 'expenses', expenseId);
    await deleteDoc(expenseRef);

    console.log('✅ Expense deleted:', expenseId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

/**
 * Check if a user can edit an expense
 * User can edit if they created it and it's not settled
 */
export const canEditExpense = (expense, currentUserId) => {
  if (!expense || !currentUserId) {
    return false;
  }

  // Check if expense is settled
  if (expense.settledAt) {
    return false;
  }

  // Check if user created the expense (paid for it)
  return expense.paidBy === currentUserId;
};

/**
 * Check if a user can delete an expense
 * Any couple member can delete, but warn if settled
 */
export const canDeleteExpense = (expense, currentUserId, coupleId) => {
  if (!expense || !currentUserId || !coupleId) {
    return { canDelete: false, reason: 'Missing required data' };
  }

  // Check if expense belongs to the couple
  if (expense.coupleId !== coupleId) {
    return { canDelete: false, reason: 'Expense does not belong to your couple' };
  }

  // Can delete, but warn if settled
  if (expense.settledAt) {
    return {
      canDelete: true,
      isSettled: true,
      warning: 'This expense is part of a settlement. Deleting it may affect your balance history.',
    };
  }

  return { canDelete: true, isSettled: false };
};
