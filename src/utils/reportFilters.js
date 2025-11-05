/**
 * reportFilters.js
 *
 * Utility functions for filtering, sorting, and grouping expenses for reporting
 */

/**
 * Filter expenses by date range
 * @param {Array} expenses - Array of expense objects
 * @param {Date|string} startDate - Start date (inclusive)
 * @param {Date|string} endDate - End date (inclusive)
 * @returns {Array} Filtered expenses
 */
export const filterExpensesByDateRange = (expenses, startDate, endDate) => {
  if (!Array.isArray(expenses)) return [];
  if (!startDate || !endDate) return expenses;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set start to beginning of day, end to end of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return expenses.filter(expense => {
    if (!expense.date) return false;
    const expenseDate = new Date(expense.date);
    return expenseDate >= start && expenseDate <= end;
  });
};

/**
 * Filter expenses by categories
 * @param {Array} expenses - Array of expense objects
 * @param {Array} categoryIds - Array of category IDs to include
 * @returns {Array} Filtered expenses
 */
export const filterExpensesByCategories = (expenses, categoryIds) => {
  if (!Array.isArray(expenses)) return [];
  if (!categoryIds || categoryIds.length === 0) return expenses;

  return expenses.filter(expense =>
    categoryIds.includes(expense.category)
  );
};

/**
 * Filter expenses by settlement status
 * @param {Array} expenses - Array of expense objects
 * @param {string} status - 'all', 'settled', or 'pending'
 * @returns {Array} Filtered expenses
 */
export const filterExpensesBySettlementStatus = (expenses, status) => {
  if (!Array.isArray(expenses)) return [];
  if (status === 'all') return expenses;

  if (status === 'settled') {
    return expenses.filter(expense => expense.settledAt);
  } else if (status === 'pending') {
    return expenses.filter(expense => !expense.settledAt);
  }

  return expenses;
};

/**
 * Filter expenses by who paid
 * @param {Array} expenses - Array of expense objects
 * @param {string} userId - User ID to filter by
 * @param {string} paidByFilter - 'all', 'me', 'partner'
 * @param {string} partnerId - Partner's user ID
 * @returns {Array} Filtered expenses
 */
export const filterExpensesByPayer = (expenses, userId, paidByFilter, partnerId) => {
  if (!Array.isArray(expenses)) return [];
  if (paidByFilter === 'all') return expenses;

  if (paidByFilter === 'me') {
    return expenses.filter(expense => expense.paidBy === userId);
  } else if (paidByFilter === 'partner') {
    return expenses.filter(expense => expense.paidBy === partnerId);
  }

  return expenses;
};

/**
 * Filter expenses by amount range
 * @param {Array} expenses - Array of expense objects
 * @param {number} minAmount - Minimum amount (inclusive)
 * @param {number} maxAmount - Maximum amount (inclusive)
 * @returns {Array} Filtered expenses
 */
export const filterExpensesByAmountRange = (expenses, minAmount, maxAmount) => {
  if (!Array.isArray(expenses)) return [];
  if (minAmount === null && maxAmount === null) return expenses;

  return expenses.filter(expense => {
    const amount = expense.amount || 0;
    if (minAmount !== null && amount < minAmount) return false;
    if (maxAmount !== null && amount > maxAmount) return false;
    return true;
  });
};

/**
 * Apply all filters to expenses
 * @param {Array} expenses - Array of expense objects
 * @param {Object} filters - Filter object with all filter criteria
 * @returns {Array} Filtered expenses
 */
export const applyAllFilters = (expenses, filters, userId, partnerId) => {
  let filtered = expenses;

  // Apply date range filter
  if (filters.startDate && filters.endDate) {
    filtered = filterExpensesByDateRange(filtered, filters.startDate, filters.endDate);
  }

  // Apply category filter
  if (filters.categories && filters.categories.length > 0) {
    filtered = filterExpensesByCategories(filtered, filters.categories);
  }

  // Apply settlement status filter
  if (filters.settlementStatus && filters.settlementStatus !== 'all') {
    filtered = filterExpensesBySettlementStatus(filtered, filters.settlementStatus);
  }

  // Apply payer filter
  if (filters.paidBy && filters.paidBy !== 'all') {
    filtered = filterExpensesByPayer(filtered, userId, filters.paidBy, partnerId);
  }

  // Apply amount range filter
  if (filters.minAmount !== null || filters.maxAmount !== null) {
    filtered = filterExpensesByAmountRange(filtered, filters.minAmount, filters.maxAmount);
  }

  return filtered;
};

/**
 * Sort expenses by various criteria
 * @param {Array} expenses - Array of expense objects
 * @param {string} sortBy - Sort criteria: 'date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'category'
 * @returns {Array} Sorted expenses (does not mutate original)
 */
export const sortExpenses = (expenses, sortBy = 'date-desc') => {
  if (!Array.isArray(expenses)) return [];

  const sorted = [...expenses];

  switch (sortBy) {
    case 'date-desc':
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));

    case 'date-asc':
      return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));

    case 'amount-desc':
      return sorted.sort((a, b) => (b.amount || 0) - (a.amount || 0));

    case 'amount-asc':
      return sorted.sort((a, b) => (a.amount || 0) - (b.amount || 0));

    case 'category':
      return sorted.sort((a, b) => {
        const catA = a.category || 'other';
        const catB = b.category || 'other';
        return catA.localeCompare(catB);
      });

    default:
      return sorted;
  }
};

/**
 * Group expenses by month
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} Object with month keys and expense arrays
 */
export const groupExpensesByMonth = (expenses) => {
  if (!Array.isArray(expenses)) return {};

  const grouped = {};

  expenses.forEach(expense => {
    if (!expense.date) return;

    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        label: monthLabel,
        key: monthKey,
        expenses: [],
      };
    }

    grouped[monthKey].expenses.push(expense);
  });

  // Sort groups by date (newest first)
  return Object.fromEntries(
    Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
  );
};

/**
 * Group expenses by category
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} Object with category keys and expense arrays
 */
export const groupExpensesByCategory = (expenses) => {
  if (!Array.isArray(expenses)) return {};

  // Import getCategoryName dynamically to avoid circular dependency
  const getCategoryName = (category) => {
    const categoryNames = {
      groceries: 'Groceries',
      dining: 'Dining Out',
      utilities: 'Utilities',
      rent: 'Rent/Mortgage',
      transport: 'Transportation',
      entertainment: 'Entertainment',
      healthcare: 'Healthcare',
      shopping: 'Shopping',
      travel: 'Travel',
      other: 'Other',
    };
    return categoryNames[category] || 'Other';
  };

  const grouped = {};

  expenses.forEach(expense => {
    const category = expense.category || 'other';

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        label: getCategoryName(category),
        expenses: [],
      };
    }

    grouped[category].expenses.push(expense);
  });

  return grouped;
};

/**
 * Group expenses by settlement status
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} Object with 'settled' and 'pending' keys
 */
export const groupExpensesBySettlementStatus = (expenses) => {
  if (!Array.isArray(expenses)) return { settled: [], pending: [] };

  const settled = expenses.filter(exp => exp.settledAt);
  const pending = expenses.filter(exp => !exp.settledAt);

  return {
    settled: {
      label: 'Settled',
      expenses: settled,
    },
    pending: {
      label: 'Pending',
      expenses: pending,
    },
  };
};

/**
 * Generate report summary statistics
 * @param {Array} expenses - Array of expense objects
 * @param {string} user1Id - Current user's ID
 * @param {string} user2Id - Partner's ID
 * @returns {Object} Summary statistics
 */
export const generateReportSummary = (expenses, user1Id, user2Id) => {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return {
      totalExpenses: 0,
      expenseCount: 0,
      averageExpense: 0,
      user1Total: 0,
      user2Total: 0,
      settledCount: 0,
      pendingCount: 0,
    };
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const expenseCount = expenses.length;
  const averageExpense = totalExpenses / expenseCount;

  const user1Total = expenses.reduce((sum, exp) => {
    if (exp.paidBy === user1Id) return sum + (exp.amount || 0);
    return sum;
  }, 0);

  const user2Total = expenses.reduce((sum, exp) => {
    if (exp.paidBy === user2Id) return sum + (exp.amount || 0);
    return sum;
  }, 0);

  const settledCount = expenses.filter(exp => exp.settledAt).length;
  const pendingCount = expenses.filter(exp => !exp.settledAt).length;

  return {
    totalExpenses,
    expenseCount,
    averageExpense,
    user1Total,
    user2Total,
    settledCount,
    pendingCount,
  };
};

/**
 * Get default filter object
 * @returns {Object} Default filters
 */
export const getDefaultFilters = () => ({
  startDate: null,
  endDate: null,
  categories: [],
  settlementStatus: 'all',
  paidBy: 'all',
  minAmount: null,
  maxAmount: null,
});

/**
 * Count active filters
 * @param {Object} filters - Filter object
 * @returns {number} Number of active filters
 */
export const countActiveFilters = (filters) => {
  let count = 0;

  if (filters.startDate && filters.endDate) count++;
  if (filters.categories && filters.categories.length > 0) count++;
  if (filters.settlementStatus && filters.settlementStatus !== 'all') count++;
  if (filters.paidBy && filters.paidBy !== 'all') count++;
  if (filters.minAmount !== null || filters.maxAmount !== null) count++;

  return count;
};

export default {
  filterExpensesByDateRange,
  filterExpensesByCategories,
  filterExpensesBySettlementStatus,
  filterExpensesByPayer,
  filterExpensesByAmountRange,
  applyAllFilters,
  sortExpenses,
  groupExpensesByMonth,
  groupExpensesByCategory,
  groupExpensesBySettlementStatus,
  generateReportSummary,
  getDefaultFilters,
  countActiveFilters,
};
