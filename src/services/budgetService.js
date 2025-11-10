// src/services/budgetService.js
// Service for managing monthly budgets and calculations

import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get current month and year
 */
const getCurrentMonthYear = () => {
  const now = new Date();
  return {
    month: now.getMonth() + 1, // 1-12
    year: now.getFullYear(),
  };
};

/**
 * Generate budget document ID
 */
const getBudgetDocId = (coupleId, month, year) => {
  return `${coupleId}_${year}_${month}`;
};

/**
 * Initialize budget for a month with default values
 */
export const initializeBudgetForMonth = async (coupleId, categories, month, year) => {
  try {
    const budgetsRef = collection(db, 'budgets');
    const docId = getBudgetDocId(coupleId, month, year);

    // Create category budgets from default values
    const categoryBudgets = {};
    Object.entries(categories).forEach(([key, category]) => {
      categoryBudgets[key] = category.defaultBudget;
    });

    const budgetDoc = {
      coupleId,
      month,
      year,
      categoryBudgets,
      enabled: true,
      includeSavings: true,
      createdAt: new Date(),
    };

    await setDoc(doc(budgetsRef, docId), budgetDoc);

    console.log(`✅ Budget initialized for ${month}/${year}`);
    return budgetDoc;
  } catch (error) {
    console.error('Error initializing budget:', error);
    throw error;
  }
};

/**
 * Get budget for a specific month
 * Creates one if it doesn't exist
 */
export const getBudgetForMonth = async (coupleId, categories, month, year) => {
  try {
    const budgetsRef = collection(db, 'budgets');
    const docId = getBudgetDocId(coupleId, month, year);
    const budgetDoc = await getDoc(doc(budgetsRef, docId));

    if (budgetDoc.exists()) {
      return { id: budgetDoc.id, ...budgetDoc.data() };
    }

    // Budget doesn't exist, initialize it
    return await initializeBudgetForMonth(coupleId, categories, month, year);
  } catch (error) {
    console.error('Error getting budget:', error);
    throw error;
  }
};

/**
 * Get budget for current month
 */
export const getCurrentMonthBudget = async (coupleId, categories) => {
  const { month, year } = getCurrentMonthYear();
  return getBudgetForMonth(coupleId, categories, month, year);
};

/**
 * Update budget for a month
 */
export const saveBudget = async (coupleId, month, year, categoryBudgets, options = {}) => {
  try {
    const budgetsRef = collection(db, 'budgets');
    const docId = getBudgetDocId(coupleId, month, year);

    const budgetDoc = await getDoc(doc(budgetsRef, docId));
    const existingData = budgetDoc.exists() ? budgetDoc.data() : {};

    const updatedBudget = {
      ...existingData,
      coupleId,
      month,
      year,
      categoryBudgets,
      ...(options.enabled !== undefined && { enabled: options.enabled }),
      ...(options.includeSavings !== undefined && { includeSavings: options.includeSavings }),
      updatedAt: new Date(),
    };

    await setDoc(doc(budgetsRef, docId), updatedBudget);

    console.log(`✅ Budget saved for ${month}/${year}`);
    return updatedBudget;
  } catch (error) {
    console.error('Error saving budget:', error);
    throw error;
  }
};

/**
 * Update budget settings (enabled, includeSavings)
 */
export const updateBudgetSettings = async (coupleId, month, year, settings) => {
  try {
    const budgetsRef = collection(db, 'budgets');
    const docId = getBudgetDocId(coupleId, month, year);

    const budgetDoc = await getDoc(doc(budgetsRef, docId));
    if (!budgetDoc.exists()) {
      throw new Error('Budget not found');
    }

    const updates = {
      ...budgetDoc.data(),
      ...settings,
      updatedAt: new Date(),
    };

    await setDoc(doc(budgetsRef, docId), updates);

    console.log(`✅ Budget settings updated for ${month}/${year}`);
    return updates;
  } catch (error) {
    console.error('Error updating budget settings:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time budget updates for current month
 */
export const subscribeToCurrentMonthBudget = (coupleId, callback) => {
  const { month, year } = getCurrentMonthYear();
  const budgetsRef = collection(db, 'budgets');
  const docId = getBudgetDocId(coupleId, month, year);

  return onSnapshot(doc(budgetsRef, docId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error in budget subscription:', error);
  });
};

/**
 * Calculate spending by category for a month
 */
export const calculateSpendingByCategory = (expenses, month, year) => {
  const spending = {};

  expenses.forEach((expense) => {
    const expenseDate = new Date(expense.createdAt?.seconds ? expense.createdAt.seconds * 1000 : expense.createdAt);
    const expenseMonth = expenseDate.getMonth() + 1;
    const expenseYear = expenseDate.getFullYear();

    // Only include expenses from the specified month/year
    if (expenseMonth === month && expenseYear === year) {
      const categoryKey = expense.categoryKey || expense.category || 'other';
      spending[categoryKey] = (spending[categoryKey] || 0) + expense.amount;
    }
  });

  return spending;
};

/**
 * Calculate budget progress for current month
 */
export const calculateBudgetProgress = (budget, expenses) => {
  if (!budget || !budget.categoryBudgets) {
    return {
      totalBudget: 0,
      totalSpent: 0,
      remaining: 0,
      categoryProgress: {},
    };
  }

  const { month, year } = getCurrentMonthYear();
  const spending = calculateSpendingByCategory(expenses, month, year);

  const categoryProgress = {};
  let totalBudget = 0;
  let totalSpent = 0;

  Object.entries(budget.categoryBudgets).forEach(([key, budgetAmount]) => {
    const spent = spending[key] || 0;
    const remaining = budgetAmount - spent;
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    totalBudget += budgetAmount;
    totalSpent += spent;

    categoryProgress[key] = {
      budget: budgetAmount,
      spent,
      remaining,
      percentage,
      status: percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'normal',
    };
  });

  return {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    categoryProgress,
  };
};

/**
 * Calculate budget savings/overage for current month
 */
export const calculateBudgetSavings = (budget, expenses) => {
  const progress = calculateBudgetProgress(budget, expenses);
  const savings = progress.remaining;

  return {
    savings: Math.max(0, savings),
    overage: Math.max(0, -savings),
    splitAmount: budget?.includeSavings ? Math.max(0, savings) / 2 : 0,
    categoryBreakdown: progress.categoryProgress,
  };
};

/**
 * Get total budget amount for current month
 */
export const getTotalBudget = (budget) => {
  if (!budget || !budget.categoryBudgets) {
    return 0;
  }

  return Object.values(budget.categoryBudgets).reduce((sum, amount) => sum + amount, 0);
};

/**
 * Copy budget from one month to another
 * Useful for creating next month's budget based on current month
 */
export const copyBudgetToMonth = async (coupleId, fromMonth, fromYear, toMonth, toYear) => {
  try {
    const fromDocId = getBudgetDocId(coupleId, fromMonth, fromYear);
    const fromBudgetDoc = await getDoc(doc(collection(db, 'budgets'), fromDocId));

    if (!fromBudgetDoc.exists()) {
      throw new Error('Source budget not found');
    }

    const fromBudget = fromBudgetDoc.data();
    const toBudget = {
      ...fromBudget,
      month: toMonth,
      year: toYear,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    delete toBudget.id;

    const toDocId = getBudgetDocId(coupleId, toMonth, toYear);
    await setDoc(doc(collection(db, 'budgets'), toDocId), toBudget);

    console.log(`✅ Budget copied from ${fromMonth}/${fromYear} to ${toMonth}/${toYear}`);
    return toBudget;
  } catch (error) {
    console.error('Error copying budget:', error);
    throw error;
  }
};

/**
 * Get budget history for a couple (last N months)
 */
export const getBudgetHistory = async (coupleId, numberOfMonths = 6) => {
  try {
    const budgetsRef = collection(db, 'budgets');
    const q = query(budgetsRef, where('coupleId', '==', coupleId));
    const snapshot = await getDocs(q);

    const budgets = [];
    snapshot.forEach((doc) => {
      budgets.push({ id: doc.id, ...doc.data() });
    });

    // Sort by year and month (newest first)
    budgets.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return budgets.slice(0, numberOfMonths);
  } catch (error) {
    console.error('Error getting budget history:', error);
    throw error;
  }
};

/**
 * Check if budget is enabled for current month
 */
export const isBudgetEnabled = (budget) => {
  return budget && budget.enabled !== false;
};

/**
 * Check if savings should be included in settlement
 */
export const shouldIncludeSavings = (budget) => {
  return budget && budget.includeSavings !== false;
};
