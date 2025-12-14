// src/utils/calculations.js
// Balance and expense calculation utilities for Dividela

/**
 * Calculate split amounts based on total and percentages
 * @param {number|string} amount - Total amount to split
 * @param {number|string} user1Percentage - User 1's percentage (0-100)
 * @param {number|string} user2Percentage - User 2's percentage (optional, calculated if not provided)
 * @returns {object} Split details with amounts and percentages
 * @throws {Error} If validation fails
 */
export const calculateSplit = (amount, user1Percentage, user2Percentage = null) => {
  // Validate amount (large amount warnings are handled at the UI level)
  const total = parseFloat(amount);
  if (isNaN(total) || total <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }

  // Validate user1Percentage
  const percentage1 = parseInt(user1Percentage);
  if (isNaN(percentage1) || percentage1 < 0 || percentage1 > 100) {
    throw new Error('Invalid percentage: must be between 0 and 100');
  }

  // Calculate or validate user2Percentage
  const percentage2 = user2Percentage !== null ? parseInt(user2Percentage) : (100 - percentage1);
  if (isNaN(percentage2) || percentage2 < 0 || percentage2 > 100) {
    throw new Error('Invalid percentage: must be between 0 and 100');
  }

  // Validate percentages sum to 100
  if (percentage1 + percentage2 !== 100) {
    throw new Error('Percentages must sum to 100');
  }

  return {
    user1Amount: (total * percentage1) / 100,
    user2Amount: (total * percentage2) / 100,
    user1Percentage: percentage1,
    user2Percentage: percentage2,
  };
};

/**
 * Calculate 50/50 split
 * @param {number|string} amount - Total amount to split
 * @returns {object} Split details with equal amounts
 * @throws {Error} If validation fails
 */
export const calculateEqualSplit = (amount) => {
  // Large amount warnings are handled at the UI level
  const total = parseFloat(amount);
  if (isNaN(total) || total <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }

  const half = total / 2;

  return {
    user1Amount: half,
    user2Amount: half,
    user1Percentage: 50,
    user2Percentage: 50,
  };
};

/**
 * Calculate split amounts for import transactions
 * This is a simplified version for transaction mapping that doesn't need paidBy
 *
 * @param {number|string} amount - Total amount to split
 * @param {number|string} percentage - Percentage for user1 (0-100)
 * @param {string} paidBy - User ID who paid (not currently used, kept for compatibility)
 * @returns {object} Split details with amounts and percentages
 * @throws {Error} If validation fails
 */
export const calculateSplitAmounts = (amount, percentage, paidBy = null) => {
  // Use the existing calculateSplit function
  return calculateSplit(amount, percentage);
};

/**
 * Calculate balance from expenses
 * Positive balance = user2 owes user1
 * Negative balance = user1 owes user2
 *
 * Multi-currency support: Uses primaryCurrencyAmount for calculations
 *
 * @param {Array} expenses - Array of expense objects
 * @param {string} user1Id - Current user's ID
 * @param {string} user2Id - Partner's ID
 * @returns {number} Balance amount
 */
export const calculateBalance = (expenses, user1Id, user2Id) => {
  // Validate inputs
  if (!Array.isArray(expenses)) {
    console.warn('calculateBalance: expenses must be an array');
    return 0;
  }

  if (!expenses || expenses.length === 0) return 0;

  if (!user1Id || !user2Id) {
    console.warn('calculateBalance: user IDs are required');
    return 0;
  }

  let balance = 0;

  expenses.forEach(expense => {
    // Validate expense object
    if (!expense || typeof expense !== 'object') {
      console.warn('calculateBalance: invalid expense object', expense);
      return;
    }

    const { paidBy, splitDetails } = expense;

    // Validate splitDetails exists
    if (!splitDetails || typeof splitDetails !== 'object') {
      console.warn('calculateBalance: missing or invalid splitDetails', expense);
      return;
    }

    // Validate amounts exist and are numbers
    if (typeof splitDetails.user1Amount !== 'number' || typeof splitDetails.user2Amount !== 'number') {
      console.warn('calculateBalance: invalid split amounts', expense);
      return;
    }

    // NOTE: splitDetails amounts are already in primary currency
    // because they're calculated from primaryCurrencyAmount in AddExpenseScreen

    // Determine who paid and who owes what
    if (paidBy === user1Id) {
      // User 1 paid, so user 2 owes their share
      balance += splitDetails.user2Amount;
    } else if (paidBy === user2Id) {
      // User 2 paid, so user 1 owes their share
      balance -= splitDetails.user1Amount;
    } else {
      console.warn('calculateBalance: expense paidBy unknown user', expense);
    }
  });

  return balance;
};

/**
 * Calculate balance from expenses AND settlements
 * This is the recommended function for accurate balance calculation.
 *
 * Positive balance = user2 owes user1
 * Negative balance = user1 owes user2
 *
 * @param {Array} expenses - Array of expense objects
 * @param {Array} settlements - Array of settlement objects
 * @param {string} user1Id - Current user's ID
 * @param {string} user2Id - Partner's ID
 * @param {string} coupleId - Optional couple ID for validation (recommended for security)
 * @returns {number} Balance amount (expenses minus settlements)
 */
export const calculateBalanceWithSettlements = (expenses, settlements, user1Id, user2Id, coupleId = null) => {
  // Start with expense-only balance
  let balance = calculateBalance(expenses, user1Id, user2Id);

  // Validate settlements input
  if (!Array.isArray(settlements)) {
    console.warn('calculateBalanceWithSettlements: settlements must be an array');
    return balance;
  }

  if (!settlements || settlements.length === 0) {
    return balance; // No settlements to factor in
  }

  // Factor in settlements
  settlements.forEach(settlement => {
    // Validate settlement object
    if (!settlement || typeof settlement !== 'object') {
      console.warn('calculateBalanceWithSettlements: invalid settlement object', settlement);
      return;
    }

    const { settledBy, amount, coupleId: settlementCoupleId } = settlement;

    // SECURITY: Validate settlement belongs to correct couple
    if (coupleId && settlementCoupleId && settlementCoupleId !== coupleId) {
      console.warn('calculateBalanceWithSettlements: skipping settlement from different couple', {
        expectedCoupleId: coupleId,
        settlementCoupleId: settlementCoupleId,
      });
      return;
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      console.warn('calculateBalanceWithSettlements: invalid settlement amount', settlement);
      return;
    }

    // SECURITY: Validate settledBy is one of the users
    if (settledBy !== user1Id && settledBy !== user2Id) {
      console.warn('calculateBalanceWithSettlements: settlement by unknown user', settlement);
      return;
    }

    // Apply settlement to balance
    // Settlements reduce the absolute balance since they represent payments made
    // When user1 settles (pays), it means user1 paid user2, so balance increases (user2 owes less)
    // When user2 settles (pays), it means user2 paid user1, so balance decreases (user2 owes less)
    if (settledBy === user1Id) {
      balance += amount;
    } else if (settledBy === user2Id) {
      balance -= amount;
    }
  });

  return balance;
};

/**
 * Format balance for display
 * @returns {object} { amount: number, text: string, status: 'positive'|'negative'|'settled' }
 */
export const formatBalance = (balance, user1Name = 'You', user2Name = 'Partner') => {
  const absBalance = Math.abs(balance);

  if (balance > 0) {
    return {
      amount: absBalance,
      text: `${user2Name} owes ${user1Name}`,
      status: 'positive',
    };
  } else if (balance < 0) {
    return {
      amount: absBalance,
      text: `${user1Name} owes ${user2Name}`,
      status: 'negative',
    };
  } else {
    return {
      amount: 0,
      text: "You're all settled up!",
      status: 'settled',
    };
  }
};

/**
 * Format currency amount
 * Legacy function - now uses currencyUtils for better formatting
 * Kept for backwards compatibility
 */
export const formatCurrency = (amount, currency = 'USD') => {
  const absAmount = Math.abs(amount);

  // Import dynamically to avoid circular dependencies
  try {
    // Try to use new currency utils if available
    const { formatCurrency: formatCurrencyNew } = require('./currencyUtils');
    return formatCurrencyNew(absAmount, currency);
  } catch (e) {
    // Fallback to simple formatting
    if (currency === 'USD') {
      return `$${absAmount.toFixed(2)}`;
    }
    return `${absAmount.toFixed(2)}`;
  }
};

/**
 * Calculate total expenses
 * Uses primaryCurrencyAmount for multi-currency support
 */
export const calculateTotalExpenses = (expenses) => {
  if (!expenses || expenses.length === 0) return 0;

  return expenses.reduce((total, expense) => {
    // Use primaryCurrencyAmount for multi-currency support, fallback to amount
    const amount = expense.primaryCurrencyAmount || expense.amount;
    return total + parseFloat(amount);
  }, 0);
};

/**
 * Calculate expenses by category
 * Uses primaryCurrencyAmount for multi-currency support
 */
export const calculateExpensesByCategory = (expenses) => {
  if (!expenses || expenses.length === 0) return {};

  const categoryTotals = {};

  expenses.forEach(expense => {
    const category = expense.category || 'other';
    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }
    // Use primaryCurrencyAmount for multi-currency support, fallback to amount
    const amount = expense.primaryCurrencyAmount || expense.amount;
    categoryTotals[category] += parseFloat(amount);
  });

  return categoryTotals;
};

/**
 * Calculate user's share of total expenses
 */
export const calculateUserShare = (expenses, userId) => {
  if (!expenses || expenses.length === 0) return 0;

  return expenses.reduce((total, expense) => {
    const splitDetails = expense.splitDetails;
    
    // Determine which amount belongs to this user
    if (expense.paidBy === userId) {
      // If user paid, their share is their amount
      return total + splitDetails.user1Amount;
    } else {
      // If partner paid, user's share is user2Amount
      return total + splitDetails.user2Amount;
    }
  }, 0);
};

/**
 * Calculate monthly statistics
 */
export const calculateMonthlyStats = (expenses, month, year) => {
  if (!expenses || expenses.length === 0) {
    return {
      total: 0,
      count: 0,
      byCategory: {},
    };
  }

  // Filter expenses for the specified month
  const monthlyExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
  });

  return {
    total: calculateTotalExpenses(monthlyExpenses),
    count: monthlyExpenses.length,
    byCategory: calculateExpensesByCategory(monthlyExpenses),
  };
};

/**
 * Sort expenses by date (newest first)
 */
export const sortExpensesByDate = (expenses, ascending = false) => {
  if (!expenses || expenses.length === 0) return [];

  const sorted = [...expenses].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return ascending ? dateA - dateB : dateB - dateA;
  });

  return sorted;
};

/**
 * Group expenses by date
 */
export const groupExpensesByDate = (expenses) => {
  if (!expenses || expenses.length === 0) return {};

  const grouped = {};

  expenses.forEach(expense => {
    const date = new Date(expense.date).toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(expense);
  });

  return grouped;
};

/**
 * Format date for display
 */
export const formatDate = (date) => {
  const expenseDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if today
  if (expenseDate.toDateString() === today.toDateString()) {
    return 'Today';
  }

  // Check if yesterday
  if (expenseDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  // Check if this week
  const daysDiff = Math.floor((today - expenseDate) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[expenseDate.getDay()];
  }

  // Otherwise, show date
  return expenseDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: expenseDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Round to 2 decimal places (for currency)
 */
export const roundCurrency = (amount) => {
  return Math.round(amount * 100) / 100;
};

/**
 * Validate settlement data before creating a settlement
 * This provides client-side validation before hitting Firestore rules
 *
 * @param {object} settlementData - Settlement data to validate
 * @param {string} currentUserId - Current user's ID
 * @param {string} currentUserCoupleId - Current user's coupleId
 * @returns {object} { valid: boolean, error: string|null }
 */
export const validateSettlement = (settlementData, currentUserId, currentUserCoupleId) => {
  // Validate required fields exist
  if (!settlementData) {
    return { valid: false, error: 'Settlement data is required' };
  }

  const { coupleId, user1Id, user2Id, amount, settledBy } = settlementData;

  // Validate coupleId
  if (!coupleId) {
    return { valid: false, error: 'Settlement must have a coupleId' };
  }

  if (coupleId !== currentUserCoupleId) {
    return { valid: false, error: 'Cannot create settlement for another couple' };
  }

  // Validate user IDs
  if (!user1Id || !user2Id) {
    return { valid: false, error: 'Settlement must have both user IDs' };
  }

  if (user1Id !== currentUserId && user2Id !== currentUserId) {
    return { valid: false, error: 'Current user must be a member of the couple' };
  }

  // Validate settledBy
  if (!settledBy) {
    return { valid: false, error: 'Settlement must have a settledBy field' };
  }

  if (settledBy !== user1Id && settledBy !== user2Id) {
    return { valid: false, error: 'settledBy must be one of the couple members' };
  }

  // Validate amount (large amount warnings are handled at the UI level)
  if (typeof amount !== 'number' || amount <= 0) {
    return { valid: false, error: 'Settlement amount must be a positive number' };
  }

  // All validations passed
  return { valid: true, error: null };
};

/**
 * Validate that a settlement belongs to the current user's couple
 * Used for filtering settlements from queries
 *
 * @param {object} settlement - Settlement object to validate
 * @param {string} currentUserId - Current user's ID
 * @param {string} currentUserCoupleId - Current user's coupleId
 * @returns {boolean} True if settlement is valid for this user
 */
export const isSettlementValid = (settlement, currentUserId, currentUserCoupleId) => {
  if (!settlement || typeof settlement !== 'object') {
    return false;
  }

  const { coupleId, user1Id, user2Id } = settlement;

  // Must match user's coupleId
  if (coupleId !== currentUserCoupleId) {
    return false;
  }

  // Must involve current user
  if (user1Id !== currentUserId && user2Id !== currentUserId) {
    return false;
  }

  return true;
};

export default {
  calculateSplit,
  calculateEqualSplit,
  calculateSplitAmounts,
  calculateBalance,
  calculateBalanceWithSettlements,
  formatBalance,
  formatCurrency,
  calculateTotalExpenses,
  calculateExpensesByCategory,
  calculateUserShare,
  calculateMonthlyStats,
  sortExpensesByDate,
  groupExpensesByDate,
  formatDate,
  roundCurrency,
  validateSettlement,
  isSettlementValid,
};
