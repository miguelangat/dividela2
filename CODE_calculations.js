// src/utils/calculations.js
// Balance and expense calculation utilities for Dividela

/**
 * Calculate split amounts based on total and percentages
 */
export const calculateSplit = (amount, user1Percentage, user2Percentage = null) => {
  const total = parseFloat(amount);
  const percentage1 = parseInt(user1Percentage);
  const percentage2 = user2Percentage !== null ? parseInt(user2Percentage) : (100 - percentage1);

  return {
    user1Amount: (total * percentage1) / 100,
    user2Amount: (total * percentage2) / 100,
    user1Percentage: percentage1,
    user2Percentage: percentage2,
  };
};

/**
 * Calculate 50/50 split
 */
export const calculateEqualSplit = (amount) => {
  const total = parseFloat(amount);
  const half = total / 2;

  return {
    user1Amount: half,
    user2Amount: half,
    user1Percentage: 50,
    user2Percentage: 50,
  };
};

/**
 * Calculate balance from expenses
 * Positive balance = user2 owes user1
 * Negative balance = user1 owes user2
 * 
 * @param {Array} expenses - Array of expense objects
 * @param {string} user1Id - Current user's ID
 * @param {string} user2Id - Partner's ID
 * @returns {number} Balance amount
 */
export const calculateBalance = (expenses, user1Id, user2Id) => {
  if (!expenses || expenses.length === 0) return 0;

  let balance = 0;

  expenses.forEach(expense => {
    const { paidBy, splitDetails } = expense;

    // Determine who paid and who owes what
    if (paidBy === user1Id) {
      // User 1 paid, so user 2 owes their share
      balance += splitDetails.user2Amount;
    } else if (paidBy === user2Id) {
      // User 2 paid, so user 1 owes their share
      balance -= splitDetails.user1Amount;
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
 */
export const formatCurrency = (amount, currency = 'USD') => {
  const absAmount = Math.abs(amount);
  
  // Simple USD formatting
  if (currency === 'USD') {
    return `$${absAmount.toFixed(2)}`;
  }

  // For other currencies, you can add more formatting options
  return `${absAmount.toFixed(2)}`;
};

/**
 * Calculate total expenses
 */
export const calculateTotalExpenses = (expenses) => {
  if (!expenses || expenses.length === 0) return 0;

  return expenses.reduce((total, expense) => {
    return total + parseFloat(expense.amount);
  }, 0);
};

/**
 * Calculate expenses by category
 */
export const calculateExpensesByCategory = (expenses) => {
  if (!expenses || expenses.length === 0) return {};

  const categoryTotals = {};

  expenses.forEach(expense => {
    const category = expense.category || 'other';
    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }
    categoryTotals[category] += parseFloat(expense.amount);
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

export default {
  calculateSplit,
  calculateEqualSplit,
  calculateBalance,
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
};
