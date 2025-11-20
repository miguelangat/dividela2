import { calculateSplitAmounts } from './calculations';
import { createMultiCurrencyExpense } from './currencyUtils';

/**
 * Maps bank transactions to expense format
 * Converts parsed bank statement data to app's expense structure
 */

/**
 * Map a single transaction to expense format
 *
 * @param {Object} transaction - Parsed transaction from bank statement
 * @param {Object} config - Mapping configuration
 * @param {string} config.coupleId - Couple ID
 * @param {string} config.paidBy - User ID who paid
 * @param {string} config.partnerId - Partner's user ID
 * @param {Object} config.splitConfig - Split configuration
 * @param {string} config.splitConfig.type - '50/50' or 'custom'
 * @param {number} config.splitConfig.percentage - Percentage for custom split (0-100)
 * @param {string} config.categoryKey - Default category key
 * @param {string} config.suggestedCategory - Auto-mapped category (optional)
 * @param {string} config.currency - Currency code (defaults to 'USD')
 * @returns {Object} Expense object ready for Firestore
 */
export function mapTransactionToExpense(transaction, config) {
  const {
    coupleId,
    paidBy,
    partnerId,
    splitConfig = { type: '50/50' },
    categoryKey = 'other',
    suggestedCategory,
    currency = 'USD',
  } = config;

  // Use suggested category if available, otherwise use default
  const finalCategory = suggestedCategory || categoryKey;

  // Calculate split amounts with validation
  let splitDetails;
  let splitWarning = null;

  if (splitConfig.type === '50/50') {
    splitDetails = calculateSplitAmounts(transaction.amount, 50, paidBy);
  } else if (splitConfig.type === 'custom') {
    if (!splitConfig.percentage || splitConfig.percentage < 0 || splitConfig.percentage > 100) {
      // Invalid custom percentage - fallback to 50/50 with warning
      console.warn(`⚠️ Invalid split percentage (${splitConfig.percentage}). Defaulting to 50/50.`);
      splitDetails = calculateSplitAmounts(transaction.amount, 50, paidBy);
      splitWarning = `Invalid split percentage, defaulted to 50/50`;
    } else {
      splitDetails = calculateSplitAmounts(transaction.amount, splitConfig.percentage, paidBy);
    }
  } else {
    // Unknown split type - default to 50/50 with warning
    console.warn(`⚠️ Unknown split type "${splitConfig.type}". Defaulting to 50/50.`);
    splitDetails = calculateSplitAmounts(transaction.amount, 50, paidBy);
    splitWarning = `Unknown split type, defaulted to 50/50`;
  }

  // Validate split amounts sum to transaction amount
  const splitSum = (splitDetails.user1Amount || 0) + (splitDetails.user2Amount || 0);
  const tolerance = 0.01; // 1 cent tolerance for rounding
  if (Math.abs(splitSum - transaction.amount) > tolerance) {
    console.error(`❌ Split validation error: amounts don't sum to total (${splitSum} vs ${transaction.amount})`);
    // Recalculate with 50/50 to be safe
    splitDetails = calculateSplitAmounts(transaction.amount, 50, paidBy);
    splitWarning = `Split amounts didn't match total, recalculated with 50/50`;
  }

  const baseExpense = {
    coupleId,
    paidBy,
    amount: transaction.amount,
    description: transaction.description,
    categoryKey: finalCategory,
    category: finalCategory, // Legacy field
    date: transaction.date.toISOString(),
    splitDetails,
    settledAt: null,
    settledBySettlementId: null,
    // Store minimal import metadata (avoid large rawData to prevent Firestore size errors)
    importMetadata: {
      importedAt: new Date().toISOString(),
      originalDate: transaction.date.toISOString(),
      transactionType: transaction.type,
      source: 'bank_import',
      // Store only the row index instead of full rawData to avoid size limits
      rowIndex: transaction.rawData?.rowIndex,
      splitWarning, // Include warning if split had issues
    },
  };

  // Add multi-currency support fields
  // Imported expenses default to the couple's primary currency
  return createMultiCurrencyExpense(baseExpense, currency);
}

/**
 * Map multiple transactions to expenses
 *
 * @param {Array} transactions - Array of parsed transactions
 * @param {Object} config - Mapping configuration
 * @param {Function} getCategoryForTransaction - Function to get category for each transaction
 * @returns {Array} Array of expense objects
 */
export function mapTransactionsToExpenses(transactions, config, getCategoryForTransaction = null) {
  return transactions.map((transaction, index) => {
    // Get suggested category for this transaction
    const suggestedCategory = getCategoryForTransaction
      ? getCategoryForTransaction(transaction, index)
      : null;

    return mapTransactionToExpense(transaction, {
      ...config,
      suggestedCategory,
    });
  });
}

/**
 * Filter transactions based on criteria
 *
 * @param {Array} transactions - Array of transactions
 * @param {Object} filters - Filter criteria
 * @param {Date} filters.startDate - Start date
 * @param {Date} filters.endDate - End date
 * @param {number} filters.minAmount - Minimum amount
 * @param {number} filters.maxAmount - Maximum amount
 * @param {boolean} filters.excludeCredits - Exclude credit transactions
 * @param {Array<string>} filters.excludeDescriptions - Descriptions to exclude (partial match)
 * @returns {Array} Filtered transactions
 */
export function filterTransactions(transactions, filters = {}) {
  let filtered = [...transactions];

  // Date range filter
  if (filters.startDate) {
    filtered = filtered.filter(t => t.date >= filters.startDate);
  }

  if (filters.endDate) {
    filtered = filtered.filter(t => t.date <= filters.endDate);
  }

  // Amount filters
  if (filters.minAmount !== undefined && filters.minAmount > 0) {
    filtered = filtered.filter(t => t.amount >= filters.minAmount);
  }

  if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
    filtered = filtered.filter(t => t.amount <= filters.maxAmount);
  }

  // Exclude credits
  if (filters.excludeCredits) {
    filtered = filtered.filter(t => t.type !== 'credit');
  }

  // Exclude by description
  if (filters.excludeDescriptions && filters.excludeDescriptions.length > 0) {
    filtered = filtered.filter(t => {
      const desc = t.description.toLowerCase();
      return !filters.excludeDescriptions.some(exclude =>
        desc.includes(exclude.toLowerCase())
      );
    });
  }

  return filtered;
}

/**
 * Validate expense data before import
 *
 * @param {Object} expense - Expense object
 * @returns {Object} Validation result
 */
export function validateExpense(expense) {
  const errors = [];

  if (!expense.coupleId) {
    errors.push('Missing coupleId');
  }

  if (!expense.paidBy) {
    errors.push('Missing paidBy');
  }

  if (!expense.amount || expense.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (!expense.description || expense.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (!expense.categoryKey) {
    errors.push('Category is required');
  }

  if (!expense.date) {
    errors.push('Date is required');
  }

  if (!expense.splitDetails) {
    errors.push('Split details are required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Batch validate expenses
 *
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} Validation summary
 */
export function validateExpenses(expenses) {
  const results = expenses.map((expense, index) => ({
    index,
    expense,
    validation: validateExpense(expense),
  }));

  const valid = results.filter(r => r.validation.isValid);
  const invalid = results.filter(r => !r.validation.isValid);

  return {
    total: expenses.length,
    valid: valid.length,
    invalid: invalid.length,
    validExpenses: valid.map(r => r.expense),
    invalidExpenses: invalid.map(r => ({
      index: r.index,
      expense: r.expense,
      errors: r.validation.errors,
    })),
    allValid: invalid.length === 0,
  };
}

/**
 * Prepare expenses for batch import
 * Adds timestamps and ensures data consistency
 *
 * @param {Array} expenses - Array of expense objects
 * @returns {Array} Expenses ready for Firestore
 */
export function prepareExpensesForImport(expenses) {
  const now = new Date();

  return expenses.map(expense => ({
    ...expense,
    createdAt: now,
    updatedAt: now,
    // Ensure all required fields are present
    settledAt: expense.settledAt || null,
    settledBySettlementId: expense.settledBySettlementId || null,
  }));
}

export default {
  mapTransactionToExpense,
  mapTransactionsToExpenses,
  filterTransactions,
  validateExpense,
  validateExpenses,
  prepareExpensesForImport,
};
