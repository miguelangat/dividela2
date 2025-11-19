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
import { COMPLEXITY_MODES } from '../constants/budgetDefaults';

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
 * @param {string} coupleId - Couple ID
 * @param {object} categories - Categories object
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {object} options - Additional options (complexity, autoCalculated, etc.)
 */
export const initializeBudgetForMonth = async (coupleId, categories, month, year, options = {}) => {
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
      enabled: options.enabled !== undefined ? options.enabled : true,
      includeSavings: options.includeSavings !== undefined ? options.includeSavings : true,
      complexity: options.complexity || COMPLEXITY_MODES.SIMPLE,
      autoCalculated: options.autoCalculated || false,
      onboardingMode: options.onboardingMode || null,
      canAutoAdjust: options.canAutoAdjust || false,
      createdAt: new Date(),
    };

    await setDoc(doc(budgetsRef, docId), budgetDoc);

    console.log(`✅ Budget initialized for ${month}/${year} with complexity: ${budgetDoc.complexity}`);
    return budgetDoc;
  } catch (error) {
    console.error('Error initializing budget:', error);
    throw error;
  }
};

/**
 * Get budget for a specific month
 * Creates one if it doesn't exist
 * @param {string} coupleId - Couple ID
 * @param {object} categories - Categories object
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {object} options - Additional options for initialization
 */
export const getBudgetForMonth = async (coupleId, categories, month, year, options = {}) => {
  try {
    const budgetsRef = collection(db, 'budgets');
    const docId = getBudgetDocId(coupleId, month, year);
    const budgetDoc = await getDoc(doc(budgetsRef, docId));

    if (budgetDoc.exists()) {
      return { id: budgetDoc.id, ...budgetDoc.data() };
    }

    // Budget doesn't exist, initialize it
    return await initializeBudgetForMonth(coupleId, categories, month, year, options);
  } catch (error) {
    console.error('Error getting budget:', error);
    throw error;
  }
};

/**
 * Get budget for current month
 * Supports all complexity levels: 'none', 'simple', 'advanced'
 * @param {string} coupleId - Couple ID
 * @param {object} categories - Categories object
 * @param {object} options - Additional options for initialization
 */
export const getCurrentMonthBudget = async (coupleId, categories, options = {}) => {
  const { month, year } = getCurrentMonthYear();
  return getBudgetForMonth(coupleId, categories, month, year, options);
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

/**
 * Get annual budget for advanced mode
 * Returns budgets for the entire year (12 months)
 * @param {string} coupleId - Couple ID
 * @param {object} categories - Categories object
 * @param {number} year - Year to fetch (defaults to current year)
 * @returns {Array} Array of 12 budget objects, one per month
 */
export const getAnnualBudget = async (coupleId, categories, year = null) => {
  try {
    const targetYear = year || new Date().getFullYear();
    const budgets = [];

    // Fetch all 12 months
    for (let month = 1; month <= 12; month++) {
      const budget = await getBudgetForMonth(coupleId, categories, month, targetYear, {
        complexity: COMPLEXITY_MODES.ADVANCED,
      });
      budgets.push(budget);
    }

    console.log(`✅ Fetched annual budget for ${targetYear}`);
    return budgets;
  } catch (error) {
    console.error('Error getting annual budget:', error);
    throw error;
  }
};

/**
 * Convert budget complexity level (upgrade/downgrade)
 * @param {string} coupleId - Couple ID
 * @param {string} fromComplexity - Current complexity level
 * @param {string} toComplexity - Target complexity level
 * @param {object} categories - Categories object
 * @returns {object} Result of conversion
 */
export const convertComplexity = async (coupleId, fromComplexity, toComplexity, categories) => {
  try {
    const { month, year } = getCurrentMonthYear();
    const budgetsRef = collection(db, 'budgets');
    const docId = getBudgetDocId(coupleId, month, year);

    // Get current budget
    const currentBudgetDoc = await getDoc(doc(budgetsRef, docId));
    const currentBudget = currentBudgetDoc.exists() ? currentBudgetDoc.data() : null;

    let result = {
      success: true,
      fromComplexity,
      toComplexity,
      message: '',
    };

    // Converting to NONE - disable budgets but keep data
    if (toComplexity === COMPLEXITY_MODES.NONE) {
      if (currentBudget) {
        await updateBudgetSettings(coupleId, month, year, {
          enabled: false,
          complexity: COMPLEXITY_MODES.NONE,
        });
        result.message = 'Budget tracking disabled. Your budget data is preserved.';
      }
      return result;
    }

    // Converting from NONE to SIMPLE or ADVANCED - enable budgets
    if (fromComplexity === COMPLEXITY_MODES.NONE) {
      if (currentBudget) {
        await updateBudgetSettings(coupleId, month, year, {
          enabled: true,
          complexity: toComplexity,
        });
      } else {
        await initializeBudgetForMonth(coupleId, categories, month, year, {
          enabled: true,
          complexity: toComplexity,
        });
      }
      result.message = `Budget tracking enabled in ${toComplexity} mode.`;
      return result;
    }

    // Converting between SIMPLE and ADVANCED - keep data, just change mode
    if (currentBudget) {
      await updateBudgetSettings(coupleId, month, year, {
        complexity: toComplexity,
      });
      result.message = `Complexity changed from ${fromComplexity} to ${toComplexity}.`;
    } else {
      await initializeBudgetForMonth(coupleId, categories, month, year, {
        complexity: toComplexity,
      });
      result.message = `Budget initialized in ${toComplexity} mode.`;
    }

    console.log(`✅ Converted budget complexity from ${fromComplexity} to ${toComplexity}`);
    return result;
  } catch (error) {
    console.error('Error converting complexity:', error);
    return {
      success: false,
      fromComplexity,
      toComplexity,
      message: error.message,
      error,
    };
  }
};

/**
 * Get budget complexity level
 * @param {object} budget - Budget object
 * @returns {string} Complexity level: 'none', 'simple', or 'advanced'
 */
export const getBudgetComplexity = (budget) => {
  return budget?.complexity || COMPLEXITY_MODES.SIMPLE;
};

/**
 * Check if budget is auto-calculated
 * @param {object} budget - Budget object
 * @returns {boolean} True if auto-calculated
 */
export const isAutoCalculated = (budget) => {
  return budget?.autoCalculated === true;
};

/**
 * Check if budget can auto-adjust
 * @param {object} budget - Budget object
 * @returns {boolean} True if can auto-adjust
 */
export const canAutoAdjust = (budget) => {
  return budget?.canAutoAdjust === true;
};
