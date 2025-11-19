// src/utils/currencyMigration.js
// Migration utilities for adding multi-currency support to existing data

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_CURRENCY } from '../constants/currencies';

/**
 * Migrate existing expenses to include currency fields
 * Sets all existing expenses to USD with 1.0 exchange rate
 *
 * @param {string} coupleId - Couple ID to migrate
 * @param {string} defaultCurrency - Default currency to set (default: USD)
 * @returns {object} Migration results
 */
export const migrateExpensesToMultiCurrency = async (coupleId, defaultCurrency = DEFAULT_CURRENCY) => {
  try {
    console.log(`🔄 Starting expense migration for couple: ${coupleId}`);

    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, where('coupleId', '==', coupleId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('✅ No expenses found to migrate');
      return {
        success: true,
        expensesMigrated: 0,
        message: 'No expenses found',
      };
    }

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    // Use batched writes for efficiency (max 500 per batch)
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationsInBatch = 0;

    snapshot.forEach((docSnapshot) => {
      const expense = docSnapshot.data();

      // Skip if already has currency fields
      if (expense.currency && expense.primaryCurrencyAmount) {
        skipped++;
        return;
      }

      try {
        const expenseRef = doc(db, 'expenses', docSnapshot.id);

        // Add currency fields
        const updates = {
          currency: defaultCurrency,
          primaryCurrency: defaultCurrency,
          primaryCurrencyAmount: expense.amount,
          exchangeRate: 1.0,
          exchangeRateSource: 'migration',
        };

        currentBatch.update(expenseRef, updates);
        operationsInBatch++;
        migrated++;

        // Commit batch if it reaches 500 operations
        if (operationsInBatch >= 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationsInBatch = 0;
        }
      } catch (error) {
        console.error(`Error preparing migration for expense ${docSnapshot.id}:`, error);
        failed++;
      }
    });

    // Add remaining operations to batches
    if (operationsInBatch > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    console.log(`📝 Committing ${batches.length} batch(es)...`);
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`✅ Batch ${i + 1}/${batches.length} committed`);
    }

    const results = {
      success: true,
      expensesMigrated: migrated,
      expensesSkipped: skipped,
      expensesFailed: failed,
      totalExpenses: snapshot.size,
      message: `Successfully migrated ${migrated} expenses to ${defaultCurrency}`,
    };

    console.log('✅ Expense migration complete:', results);
    return results;
  } catch (error) {
    console.error('❌ Expense migration failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Migration failed',
    };
  }
};

/**
 * Migrate existing budgets to include currency field
 * Sets all existing budgets to the specified currency
 *
 * @param {string} coupleId - Couple ID to migrate
 * @param {string} defaultCurrency - Default currency to set (default: USD)
 * @returns {object} Migration results
 */
export const migrateBudgetsToMultiCurrency = async (coupleId, defaultCurrency = DEFAULT_CURRENCY) => {
  try {
    console.log(`🔄 Starting budget migration for couple: ${coupleId}`);

    const budgetsRef = collection(db, 'budgets');
    const q = query(budgetsRef, where('coupleId', '==', coupleId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('✅ No budgets found to migrate');
      return {
        success: true,
        budgetsMigrated: 0,
        message: 'No budgets found',
      };
    }

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    const batch = writeBatch(db);

    snapshot.forEach((docSnapshot) => {
      const budget = docSnapshot.data();

      // Skip if already has currency field
      if (budget.currency) {
        skipped++;
        return;
      }

      try {
        const budgetRef = doc(db, 'budgets', docSnapshot.id);
        batch.update(budgetRef, { currency: defaultCurrency });
        migrated++;
      } catch (error) {
        console.error(`Error preparing migration for budget ${docSnapshot.id}:`, error);
        failed++;
      }
    });

    // Commit batch
    if (migrated > 0) {
      await batch.commit();
    }

    const results = {
      success: true,
      budgetsMigrated: migrated,
      budgetsSkipped: skipped,
      budgetsFailed: failed,
      totalBudgets: snapshot.size,
      message: `Successfully migrated ${migrated} budgets to ${defaultCurrency}`,
    };

    console.log('✅ Budget migration complete:', results);
    return results;
  } catch (error) {
    console.error('❌ Budget migration failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Migration failed',
    };
  }
};

/**
 * Complete migration for a couple
 * Migrates both expenses and budgets
 *
 * @param {string} coupleId - Couple ID to migrate
 * @param {string} defaultCurrency - Default currency to set (default: USD)
 * @returns {object} Combined migration results
 */
export const migrateCoupleToCurrency = async (coupleId, defaultCurrency = DEFAULT_CURRENCY) => {
  console.log(`🚀 Starting full currency migration for couple: ${coupleId}`);
  console.log(`📌 Default currency: ${defaultCurrency}`);

  try {
    // Migrate expenses
    const expenseResults = await migrateExpensesToMultiCurrency(coupleId, defaultCurrency);

    // Migrate budgets
    const budgetResults = await migrateBudgetsToMultiCurrency(coupleId, defaultCurrency);

    const combinedResults = {
      success: expenseResults.success && budgetResults.success,
      expenses: expenseResults,
      budgets: budgetResults,
      summary: {
        totalExpensesMigrated: expenseResults.expensesMigrated || 0,
        totalBudgetsMigrated: budgetResults.budgetsMigrated || 0,
        currency: defaultCurrency,
      },
    };

    console.log('🎉 Full migration complete:', combinedResults.summary);
    return combinedResults;
  } catch (error) {
    console.error('❌ Full migration failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Complete migration failed',
    };
  }
};

/**
 * Check if couple needs migration
 * Returns true if any expenses or budgets are missing currency fields
 *
 * @param {string} coupleId - Couple ID to check
 * @returns {object} Migration status
 */
export const checkMigrationNeeded = async (coupleId) => {
  try {
    // Check expenses
    const expensesRef = collection(db, 'expenses');
    const expensesQuery = query(expensesRef, where('coupleId', '==', coupleId));
    const expensesSnapshot = await getDocs(expensesQuery);

    let expensesNeedMigration = 0;
    expensesSnapshot.forEach((doc) => {
      const expense = doc.data();
      if (!expense.currency || !expense.primaryCurrencyAmount) {
        expensesNeedMigration++;
      }
    });

    // Check budgets
    const budgetsRef = collection(db, 'budgets');
    const budgetsQuery = query(budgetsRef, where('coupleId', '==', coupleId));
    const budgetsSnapshot = await getDocs(budgetsQuery);

    let budgetsNeedMigration = 0;
    budgetsSnapshot.forEach((doc) => {
      const budget = doc.data();
      if (!budget.currency) {
        budgetsNeedMigration++;
      }
    });

    const needsMigration = expensesNeedMigration > 0 || budgetsNeedMigration > 0;

    return {
      needsMigration,
      expensesNeedMigration,
      budgetsNeedMigration,
      totalExpenses: expensesSnapshot.size,
      totalBudgets: budgetsSnapshot.size,
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return {
      needsMigration: false,
      error: error.message,
    };
  }
};

/**
 * Dry run migration - check what would be migrated without making changes
 *
 * @param {string} coupleId - Couple ID to check
 * @returns {object} Dry run results
 */
export const dryRunMigration = async (coupleId) => {
  console.log(`🔍 Running dry-run migration check for couple: ${coupleId}`);

  const status = await checkMigrationNeeded(coupleId);

  console.log('📊 Dry run results:', {
    expensesToMigrate: status.expensesNeedMigration,
    budgetsToMigrate: status.budgetsNeedMigration,
    totalExpenses: status.totalExpenses,
    totalBudgets: status.totalBudgets,
  });

  return status;
};

export default {
  migrateExpensesToMultiCurrency,
  migrateBudgetsToMultiCurrency,
  migrateCoupleToCurrency,
  checkMigrationNeeded,
  dryRunMigration,
};
