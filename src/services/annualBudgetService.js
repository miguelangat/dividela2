// src/services/annualBudgetService.js
// Service for managing annual budgets with variable monthly allocations

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentFiscalYear, getFiscalYearDates, getFiscalYearProgress } from './fiscalPeriodService';
import { getCategoriesForCouple } from './categoryService';

/**
 * Create or initialize annual budget for a fiscal year
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year (e.g., 2025)
 * @param {Object} settings - Fiscal year settings
 * @param {Object} categoryBudgets - Optional initial category budgets
 * @returns {Object} Created annual budget
 */
export const createAnnualBudget = async (coupleId, fiscalYear, settings, categoryBudgets = null) => {
  try {
    const budgetId = `${coupleId}_FY${fiscalYear}`;
    const budgetRef = doc(db, 'annualBudgets', budgetId);

    // Check if budget already exists
    const existingBudget = await getDoc(budgetRef);
    if (existingBudget.exists()) {
      throw new Error(`Annual budget for FY${fiscalYear} already exists`);
    }

    // Get fiscal year dates
    const { start, end } = getFiscalYearDates(fiscalYear, settings);

    // Get categories to initialize budgets
    const categories = await getCategoriesForCouple(coupleId);

    // Initialize category budgets
    const initialCategoryBudgets = {};
    Object.entries(categories).forEach(([key, category]) => {
      const annualAmount = categoryBudgets?.[key]?.annualTotal || category.annualBudget || category.defaultBudget * 12;
      const monthlyDefault = Math.round(annualAmount / 12);

      initialCategoryBudgets[key] = {
        annualTotal: annualAmount,
        monthlyDefault,
        monthlyVariations: categoryBudgets?.[key]?.monthlyVariations || {},
        spentToDate: 0,
        projectedYearEnd: 0,
        frequency: category.frequency || 'monthly',
      };
    });

    // Calculate total annual budget
    const totalAnnualBudget = Object.values(initialCategoryBudgets).reduce(
      (sum, cat) => sum + cat.annualTotal,
      0
    );

    const annualBudget = {
      id: budgetId,
      coupleId,
      fiscalYear,
      fiscalYearLabel: `FY${fiscalYear}`,
      fiscalYearStart: start,
      fiscalYearEnd: end,
      categoryBudgets: initialCategoryBudgets,
      savingsTargets: {},
      totalAnnualBudget,
      totalSpentToDate: 0,
      budgetRemaining: totalAnnualBudget,
      daysElapsed: 0,
      daysRemaining: 365,
      averageDailySpend: 0,
      projectedYearEndTotal: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      enableVariableMonthly: true,
      enableSavingsTargets: false,
      rolloverEnabled: false,
    };

    await setDoc(budgetRef, annualBudget);

    console.log('✅ Annual budget created:', budgetId);
    return annualBudget;
  } catch (error) {
    console.error('Error creating annual budget:', error);
    throw error;
  }
};

/**
 * Get annual budget for a specific fiscal year
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @returns {Object} Annual budget or null
 */
export const getAnnualBudget = async (coupleId, fiscalYear) => {
  try {
    const budgetId = `${coupleId}_FY${fiscalYear}`;
    const budgetRef = doc(db, 'annualBudgets', budgetId);
    const budgetDoc = await getDoc(budgetRef);

    if (!budgetDoc.exists()) {
      return null;
    }

    return {
      id: budgetDoc.id,
      ...budgetDoc.data(),
    };
  } catch (error) {
    console.error('Error getting annual budget:', error);
    throw error;
  }
};

/**
 * Get current fiscal year's annual budget
 *
 * @param {string} coupleId - The couple ID
 * @param {Object} settings - Fiscal year settings
 * @returns {Object} Current annual budget or null
 */
export const getCurrentAnnualBudget = async (coupleId, settings) => {
  try {
    const { fiscalYear } = getCurrentFiscalYear(settings);
    return getAnnualBudget(coupleId, fiscalYear);
  } catch (error) {
    console.error('Error getting current annual budget:', error);
    throw error;
  }
};

/**
 * Update monthly allocation for a specific category and month
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @param {string} categoryKey - The category key
 * @param {number} month - Month number (1-12 within fiscal year)
 * @param {number} amount - Budget amount for that month
 * @returns {Object} Success status
 */
export const updateMonthlyAllocation = async (coupleId, fiscalYear, categoryKey, month, amount) => {
  try {
    const budgetId = `${coupleId}_FY${fiscalYear}`;
    const budgetRef = doc(db, 'annualBudgets', budgetId);

    const budgetDoc = await getDoc(budgetRef);
    if (!budgetDoc.exists()) {
      throw new Error('Annual budget not found');
    }

    const budgetData = budgetDoc.data();
    const categoryBudget = budgetData.categoryBudgets[categoryKey];

    if (!categoryBudget) {
      throw new Error(`Category "${categoryKey}" not found in budget`);
    }

    // Update monthly variation
    const updatedVariations = {
      ...categoryBudget.monthlyVariations,
      [month]: parseFloat(amount),
    };

    // Calculate new annual total based on all monthly variations
    let newAnnualTotal = 0;
    for (let m = 1; m <= 12; m++) {
      newAnnualTotal += updatedVariations[m] || categoryBudget.monthlyDefault;
    }

    await updateDoc(budgetRef, {
      [`categoryBudgets.${categoryKey}.monthlyVariations`]: updatedVariations,
      [`categoryBudgets.${categoryKey}.annualTotal`]: newAnnualTotal,
      updatedAt: serverTimestamp(),
    });

    // Recalculate total annual budget
    await recalculateTotalBudget(coupleId, fiscalYear);

    console.log(`✅ Monthly allocation updated for ${categoryKey}, month ${month}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating monthly allocation:', error);
    throw error;
  }
};

/**
 * Update entire category budget (annual total and distribution)
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @param {string} categoryKey - The category key
 * @param {Object} updates - Budget updates
 * @returns {Object} Success status
 */
export const updateCategoryBudget = async (coupleId, fiscalYear, categoryKey, updates) => {
  try {
    const budgetId = `${coupleId}_FY${fiscalYear}`;
    const budgetRef = doc(db, 'annualBudgets', budgetId);

    const updateData = {};

    if (updates.annualTotal !== undefined) {
      updateData[`categoryBudgets.${categoryKey}.annualTotal`] = parseFloat(updates.annualTotal);
      // Recalculate monthly default
      updateData[`categoryBudgets.${categoryKey}.monthlyDefault`] = Math.round(parseFloat(updates.annualTotal) / 12);
    }

    if (updates.monthlyVariations !== undefined) {
      updateData[`categoryBudgets.${categoryKey}.monthlyVariations`] = updates.monthlyVariations;
    }

    updateData.updatedAt = serverTimestamp();

    await updateDoc(budgetRef, updateData);

    // Recalculate total annual budget
    await recalculateTotalBudget(coupleId, fiscalYear);

    console.log(`✅ Category budget updated for ${categoryKey}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating category budget:', error);
    throw error;
  }
};

/**
 * Distribute annual budget evenly across 12 months
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @param {string} categoryKey - The category key
 * @returns {Object} Success status
 */
export const distributeEvenly = async (coupleId, fiscalYear, categoryKey) => {
  try {
    const budgetId = `${coupleId}_FY${fiscalYear}`;
    const budgetRef = doc(db, 'annualBudgets', budgetId);

    await updateDoc(budgetRef, {
      [`categoryBudgets.${categoryKey}.monthlyVariations`]: {},
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Budget distributed evenly for ${categoryKey}`);
    return { success: true };
  } catch (error) {
    console.error('Error distributing budget:', error);
    throw error;
  }
};

/**
 * Copy budget from previous fiscal year
 *
 * @param {string} coupleId - The couple ID
 * @param {number} targetFiscalYear - Target fiscal year
 * @param {number} sourceFiscalYear - Source fiscal year to copy from
 * @param {Object} settings - Fiscal year settings
 * @returns {Object} Created annual budget
 */
export const copyFromPreviousYear = async (coupleId, targetFiscalYear, sourceFiscalYear, settings) => {
  try {
    // Get source budget
    const sourceBudget = await getAnnualBudget(coupleId, sourceFiscalYear);

    if (!sourceBudget) {
      throw new Error(`No budget found for FY${sourceFiscalYear}`);
    }

    // Create new budget with source's category budgets
    return createAnnualBudget(coupleId, targetFiscalYear, settings, sourceBudget.categoryBudgets);
  } catch (error) {
    console.error('Error copying from previous year:', error);
    throw error;
  }
};

/**
 * Recalculate total annual budget from all categories
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @returns {Object} Success status
 */
const recalculateTotalBudget = async (coupleId, fiscalYear) => {
  try {
    const budgetId = `${coupleId}_FY${fiscalYear}`;
    const budgetRef = doc(db, 'annualBudgets', budgetId);

    const budgetDoc = await getDoc(budgetRef);
    if (!budgetDoc.exists()) {
      return { success: false };
    }

    const budgetData = budgetDoc.data();
    const totalAnnualBudget = Object.values(budgetData.categoryBudgets).reduce(
      (sum, cat) => sum + (cat.annualTotal || 0),
      0
    );

    const budgetRemaining = totalAnnualBudget - (budgetData.totalSpentToDate || 0);

    await updateDoc(budgetRef, {
      totalAnnualBudget,
      budgetRemaining,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error recalculating total budget:', error);
    return { success: false };
  }
};

/**
 * Update year-to-date spending (called when expenses change)
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @param {Array} expenses - All expenses for the fiscal year
 * @param {Object} settings - Fiscal year settings
 * @returns {Object} Updated budget
 */
export const updateYearToDateSpending = async (coupleId, fiscalYear, expenses, settings) => {
  try {
    const budgetId = `${coupleId}_FY${fiscalYear}`;
    const budgetRef = doc(db, 'annualBudgets', budgetId);

    const budgetDoc = await getDoc(budgetRef);
    if (!budgetDoc.exists()) {
      return null;
    }

    const budgetData = budgetDoc.data();

    // Calculate spending by category
    const spendingByCategory = {};
    expenses.forEach((expense) => {
      const categoryKey = expense.categoryKey || expense.category;
      if (!spendingByCategory[categoryKey]) {
        spendingByCategory[categoryKey] = 0;
      }
      spendingByCategory[categoryKey] += expense.amount;
    });

    // Update category spending
    const updates = {};
    Object.entries(budgetData.categoryBudgets).forEach(([key, categoryBudget]) => {
      const spent = spendingByCategory[key] || 0;
      updates[`categoryBudgets.${key}.spentToDate`] = spent;

      // Calculate projection (simple linear projection)
      const progress = getFiscalYearProgress(settings);
      const daysElapsed = progress.daysElapsed || 1;
      const totalDays = progress.totalDays || 365;
      const projected = (spent / daysElapsed) * totalDays;
      updates[`categoryBudgets.${key}.projectedYearEnd`] = Math.round(projected);
    });

    // Calculate totals
    const totalSpentToDate = Object.values(spendingByCategory).reduce((sum, val) => sum + val, 0);
    const budgetRemaining = budgetData.totalAnnualBudget - totalSpentToDate;

    const progress = getFiscalYearProgress(settings);
    const averageDailySpend = totalSpentToDate / (progress.daysElapsed || 1);
    const projectedYearEndTotal = averageDailySpend * (progress.totalDays || 365);

    updates.totalSpentToDate = totalSpentToDate;
    updates.budgetRemaining = budgetRemaining;
    updates.daysElapsed = progress.daysElapsed;
    updates.daysRemaining = progress.daysRemaining;
    updates.averageDailySpend = Math.round(averageDailySpend * 100) / 100;
    updates.projectedYearEndTotal = Math.round(projectedYearEndTotal);
    updates.updatedAt = serverTimestamp();

    await updateDoc(budgetRef, updates);

    console.log('✅ Year-to-date spending updated');
    return { success: true };
  } catch (error) {
    console.error('Error updating year-to-date spending:', error);
    throw error;
  }
};

/**
 * Get budget for a specific month within the fiscal year
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @param {number} month - Month number (1-12 within fiscal year)
 * @returns {Object} Monthly budget breakdown
 */
export const getMonthlyBudgetFromAnnual = async (coupleId, fiscalYear, month) => {
  try {
    const annualBudget = await getAnnualBudget(coupleId, fiscalYear);

    if (!annualBudget) {
      return null;
    }

    const monthlyBudgets = {};
    Object.entries(annualBudget.categoryBudgets).forEach(([key, categoryBudget]) => {
      const monthlyAmount = categoryBudget.monthlyVariations[month] || categoryBudget.monthlyDefault;
      monthlyBudgets[key] = monthlyAmount;
    });

    return monthlyBudgets;
  } catch (error) {
    console.error('Error getting monthly budget from annual:', error);
    throw error;
  }
};

/**
 * Get all annual budgets for a couple
 *
 * @param {string} coupleId - The couple ID
 * @returns {Array} Array of annual budgets
 */
export const getAllAnnualBudgets = async (coupleId) => {
  try {
    const budgetsRef = collection(db, 'annualBudgets');
    const q = query(budgetsRef, where('coupleId', '==', coupleId));
    const snapshot = await getDocs(q);

    const budgets = [];
    snapshot.forEach((doc) => {
      budgets.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by fiscal year descending
    budgets.sort((a, b) => b.fiscalYear - a.fiscalYear);

    return budgets;
  } catch (error) {
    console.error('Error getting all annual budgets:', error);
    throw error;
  }
};

/**
 * Delete annual budget
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @returns {Object} Success status
 */
export const deleteAnnualBudget = async (coupleId, fiscalYear) => {
  try {
    const budgetId = `${coupleId}_FY${fiscalYear}`;
    const budgetRef = doc(db, 'annualBudgets', budgetId);

    await deleteDoc(budgetRef);

    console.log('✅ Annual budget deleted:', budgetId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting annual budget:', error);
    throw error;
  }
};
