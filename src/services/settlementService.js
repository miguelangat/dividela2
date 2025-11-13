// src/services/settlementService.js
// Service for managing settlements with budget and category analytics

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Generate category breakdown from expenses
 * Groups expenses by category and calculates totals
 */
export const generateCategoryBreakdown = (expenses, categories) => {
  const breakdown = {};

  expenses.forEach((expense) => {
    const categoryKey = expense.categoryKey || expense.category || 'other';
    const category = categories[categoryKey];

    if (!breakdown[categoryKey]) {
      breakdown[categoryKey] = {
        categoryName: category?.name || 'Other',
        icon: category?.icon || '💡',
        totalAmount: 0,
        expenseCount: 0,
        user1Amount: 0,
        user2Amount: 0,
      };
    }

    breakdown[categoryKey].totalAmount += expense.amount;
    breakdown[categoryKey].expenseCount += 1;
    breakdown[categoryKey].user1Amount += expense.splitDetails?.user1Amount || expense.amount / 2;
    breakdown[categoryKey].user2Amount += expense.splitDetails?.user2Amount || expense.amount / 2;
  });

  return breakdown;
};

/**
 * Generate budget summary for the settlement period
 */
export const generateBudgetSummary = (expenses, currentBudget, categories) => {
  if (!currentBudget || !currentBudget.enabled) {
    return {
      totalBudget: 0,
      totalSpent: 0,
      budgetRemaining: 0,
      includedInBudget: false,
      monthYear: null,
    };
  }

  // Calculate total budget
  let totalBudget = 0;
  if (currentBudget.categoryBudgets) {
    totalBudget = Object.values(currentBudget.categoryBudgets).reduce((sum, amount) => sum + amount, 0);
  }

  // Calculate total spent on these expenses
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return {
    totalBudget,
    totalSpent,
    budgetRemaining: totalBudget - totalSpent,
    includedInBudget: true,
    monthYear,
  };
};

/**
 * Identify top spending categories
 */
export const identifyTopCategories = (categoryBreakdown, limit = 3) => {
  const categories = Object.entries(categoryBreakdown).map(([key, data]) => ({
    categoryKey: key,
    categoryName: data.categoryName,
    icon: data.icon,
    amount: data.totalAmount,
  }));

  // Sort by amount descending
  categories.sort((a, b) => b.amount - a.amount);

  return categories.slice(0, limit);
};

/**
 * Calculate days since last settlement
 */
const calculateSettlementPeriodDays = (settlements) => {
  if (settlements.length === 0) {
    return 0;
  }

  const lastSettlement = settlements[0]; // Already sorted by date desc
  const lastDate = lastSettlement.settledAt?.toDate ? lastSettlement.settledAt.toDate() : new Date(lastSettlement.settledAt);
  const now = new Date();
  const diffTime = Math.abs(now - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Create a new settlement with budget and category analytics
 */
export const createSettlement = async (
  coupleId,
  user1Id,
  user2Id,
  amount,
  settledBy,
  note,
  expenses,
  categories,
  currentBudget
) => {
  try {
    // Filter unsettled expenses
    const unsettledExpenses = expenses.filter(exp => !exp.settledAt);

    if (unsettledExpenses.length === 0) {
      throw new Error('No unsettled expenses to settle');
    }

    // Generate category breakdown
    const categoryBreakdown = generateCategoryBreakdown(unsettledExpenses, categories);

    // Generate budget summary
    const budgetSummary = generateBudgetSummary(unsettledExpenses, currentBudget, categories);

    // Identify top categories
    const topCategories = identifyTopCategories(categoryBreakdown);

    // Calculate total expense amount
    const totalExpensesAmount = unsettledExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Get previous settlements to calculate period
    const settlementsQuery = query(
      collection(db, 'settlements'),
      where('coupleId', '==', coupleId),
      orderBy('settledAt', 'desc')
    );
    const settlementsSnapshot = await getDocs(settlementsQuery);
    const previousSettlements = [];
    settlementsSnapshot.forEach((doc) => {
      previousSettlements.push({ id: doc.id, ...doc.data() });
    });

    const settlementPeriodDays = calculateSettlementPeriodDays(previousSettlements);

    // Use transaction to ensure atomicity
    const settlementData = await runTransaction(db, async (transaction) => {
      // Create settlement document
      const settlementRef = doc(collection(db, 'settlements'));
      const settlement = {
        coupleId,
        user1Id,
        user2Id,
        amount,
        settledBy,
        note: note || '',
        expensesSettledCount: unsettledExpenses.length,
        balanceAtSettlement: amount,
        settledAt: serverTimestamp(),

        // Budget & Category Analytics
        categoryBreakdown,
        budgetSummary,
        topCategories,
        totalExpensesAmount,
        settlementPeriodDays,
      };

      transaction.set(settlementRef, settlement);

      // Mark all unsettled expenses as settled
      unsettledExpenses.forEach((expense) => {
        const expenseRef = doc(db, 'expenses', expense.id);
        transaction.update(expenseRef, {
          settledAt: serverTimestamp(),
          settledBySettlementId: settlementRef.id,
        });
      });

      // Update couple's lastSettlementAt
      const coupleRef = doc(db, 'couples', coupleId);
      transaction.update(coupleRef, {
        lastSettlementAt: serverTimestamp(),
      });

      return { id: settlementRef.id, ...settlement };
    });

    console.log('✅ Settlement created with budget analytics:', settlementData.id);
    return settlementData;
  } catch (error) {
    console.error('Error creating settlement:', error);
    throw error;
  }
};

/**
 * Get all settlements for a couple
 */
export const getSettlements = async (coupleId) => {
  try {
    const settlementsQuery = query(
      collection(db, 'settlements'),
      where('coupleId', '==', coupleId),
      orderBy('settledAt', 'desc')
    );

    const snapshot = await getDocs(settlementsQuery);
    const settlements = [];

    snapshot.forEach((doc) => {
      settlements.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return settlements;
  } catch (error) {
    console.error('Error getting settlements:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time settlement updates
 */
export const subscribeToSettlements = (coupleId, callback, errorCallback) => {
  const settlementsQuery = query(
    collection(db, 'settlements'),
    where('coupleId', '==', coupleId),
    orderBy('settledAt', 'desc')
  );

  return onSnapshot(
    settlementsQuery,
    (snapshot) => {
      const settlements = [];
      snapshot.forEach((doc) => {
        settlements.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      callback(settlements);
    },
    (error) => {
      console.error('Error in settlements subscription:', error);
      if (errorCallback) {
        errorCallback(error);
      }
    }
  );
};

/**
 * Get a single settlement by ID
 */
export const getSettlementById = async (settlementId) => {
  try {
    const settlementDoc = await getDoc(doc(db, 'settlements', settlementId));

    if (!settlementDoc.exists()) {
      throw new Error('Settlement not found');
    }

    return {
      id: settlementDoc.id,
      ...settlementDoc.data(),
    };
  } catch (error) {
    console.error('Error getting settlement:', error);
    throw error;
  }
};

/**
 * Get expenses that were part of a settlement
 */
export const getExpensesForSettlement = async (settlementId) => {
  try {
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('settledBySettlementId', '==', settlementId)
    );

    const snapshot = await getDocs(expensesQuery);
    const expenses = [];

    snapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by date in JavaScript instead of Firestore to avoid needing a composite index
    expenses.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA; // descending order
    });

    return expenses;
  } catch (error) {
    console.error('Error getting expenses for settlement:', error);
    throw error;
  }
};

/**
 * Calculate settlement amount from expenses and previous settlements
 * Uses the same logic as HomeScreen's balance calculation
 */
export const calculateSettlementAmount = (expenses, settlements, user1Id, user2Id) => {
  let balance = 0;

  // Add up expense balances
  expenses.forEach((expense) => {
    if (expense.settledAt) return; // Skip settled expenses

    const user1Share = expense.splitDetails?.user1Amount || expense.amount / 2;
    const user2Share = expense.splitDetails?.user2Amount || expense.amount / 2;

    if (expense.paidBy === user1Id) {
      balance += user2Share; // User2 owes User1
    } else if (expense.paidBy === user2Id) {
      balance -= user1Share; // User1 owes User2
    }
  });

  // Factor in previous settlements
  settlements.forEach((settlement) => {
    if (settlement.settledBy === user1Id) {
      balance += settlement.amount;
    } else if (settlement.settledBy === user2Id) {
      balance -= settlement.amount;
    }
  });

  return Math.abs(balance);
};
