// src/services/expenseService.js
// Service for managing expenses

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
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
