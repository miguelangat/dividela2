// src/services/onboardingService.js
// Service for handling budget onboarding logic and calculations

import {
  DEFAULT_CATEGORIES,
  INDUSTRY_MINIMUMS,
  INDUSTRY_MAXIMUMS,
  BUDGET_TEMPLATES,
  getBudgetTemplateByIncome,
  roundToFriendlyAmount,
  validateBudgetAllocation as validateAllocation,
  COMPLEXITY_MODES,
} from '../constants/budgetDefaults';

/**
 * Calculate average spending per category from historical expenses
 * @param {Array} expenses - Array of expense objects
 * @param {number} numberOfMonths - Number of months to analyze (default: 3)
 * @returns {object} Average spending by category
 */
const calculateAverageSpending = (expenses, numberOfMonths = 3) => {
  if (!expenses || expenses.length === 0) {
    return {};
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - numberOfMonths);

  // Filter expenses within timeframe
  const recentExpenses = expenses.filter(expense => {
    const expenseDate = new Date(
      expense.createdAt?.seconds
        ? expense.createdAt.seconds * 1000
        : expense.createdAt
    );
    return expenseDate >= cutoffDate;
  });

  if (recentExpenses.length === 0) {
    return {};
  }

  // Calculate total spending per category
  const categoryTotals = {};
  recentExpenses.forEach(expense => {
    const categoryKey = expense.categoryKey || expense.category || 'other';
    categoryTotals[categoryKey] = (categoryTotals[categoryKey] || 0) + expense.amount;
  });

  // Calculate averages
  const averages = {};
  Object.entries(categoryTotals).forEach(([category, total]) => {
    averages[category] = total / numberOfMonths;
  });

  return averages;
};

/**
 * Get recommended complexity mode based on user details and spending history
 * @param {object} userDetails - User profile information
 * @param {Array} expenses - Historical expenses
 * @returns {string} Recommended mode: 'none', 'simple', or 'advanced'
 */
export const getRecommendedMode = (userDetails, expenses = []) => {
  // If user has significant expense history, recommend simple mode
  if (expenses.length > 20) {
    return COMPLEXITY_MODES.SIMPLE;
  }

  // If user has some expenses but not many, recommend simple mode
  if (expenses.length > 5) {
    return COMPLEXITY_MODES.SIMPLE;
  }

  // For users with no history or very little, recommend starting with none
  return COMPLEXITY_MODES.NONE;
};

/**
 * Calculate smart budget suggestions based on spending history
 * @param {Array} expenses - Historical expenses
 * @param {string} timeframe - Timeframe to analyze: '1month', '3months', '6months'
 * @returns {object} Smart budget suggestions with metadata
 */
export const calculateSmartBudgets = (expenses, timeframe = '3months') => {
  const monthsMap = {
    '1month': 1,
    '3months': 3,
    '6months': 6,
  };

  const numberOfMonths = monthsMap[timeframe] || 3;
  const averages = calculateAverageSpending(expenses, numberOfMonths);

  // If no spending history, return defaults
  if (Object.keys(averages).length === 0) {
    return {
      budgets: {},
      confidence: 'low',
      dataPoints: 0,
      timeframe,
      source: 'default',
    };
  }

  // Round averages to friendly amounts and add 10% buffer
  const smartBudgets = {};
  Object.entries(averages).forEach(([category, average]) => {
    const buffered = average * 1.1; // Add 10% buffer
    smartBudgets[category] = roundToFriendlyAmount(buffered);
  });

  // Ensure all default categories are present
  Object.keys(DEFAULT_CATEGORIES).forEach(key => {
    if (!smartBudgets[key]) {
      smartBudgets[key] = DEFAULT_CATEGORIES[key].defaultBudget;
    }
  });

  // Calculate confidence based on expense count
  let confidence = 'low';
  if (expenses.length > 50) {
    confidence = 'high';
  } else if (expenses.length > 20) {
    confidence = 'medium';
  }

  return {
    budgets: smartBudgets,
    confidence,
    dataPoints: expenses.length,
    timeframe,
    source: 'calculated',
    averages,
  };
};

/**
 * Get default budgets based on complexity mode
 * @param {string} complexity - Complexity mode: 'none', 'simple', 'advanced'
 * @param {number} monthlyIncome - Optional monthly income for template selection
 * @returns {object} Default budget configuration
 */
export const getDefaultBudgets = (complexity, monthlyIncome = null) => {
  if (complexity === COMPLEXITY_MODES.NONE) {
    // Return minimal configuration for no budget mode
    return {
      complexity: COMPLEXITY_MODES.NONE,
      categoryBudgets: {},
      enabled: false,
      autoCalculated: false,
    };
  }

  if (complexity === COMPLEXITY_MODES.SIMPLE || complexity === COMPLEXITY_MODES.ADVANCED) {
    let budgets = {};

    if (monthlyIncome) {
      // Use template based on income
      const template = getBudgetTemplateByIncome(monthlyIncome);
      budgets = { ...template.template };
    } else {
      // Use default budgets from constants
      Object.entries(DEFAULT_CATEGORIES).forEach(([key, category]) => {
        budgets[key] = category.defaultBudget;
      });
    }

    return {
      complexity,
      categoryBudgets: budgets,
      enabled: true,
      autoCalculated: false,
      onboardingMode: complexity,
      canAutoAdjust: false,
    };
  }

  // Fallback to simple mode
  return getDefaultBudgets(COMPLEXITY_MODES.SIMPLE, monthlyIncome);
};

/**
 * Validate budget allocation and provide warnings
 * @param {object} budgets - Budget allocations by category
 * @param {number} totalIncome - Total monthly income
 * @returns {object} Validation results with warnings and errors
 */
export const validateBudgetAllocation = (budgets, totalIncome) => {
  return validateAllocation(budgets, totalIncome);
};

/**
 * Calculate recommended budget adjustments based on validation
 * @param {object} budgets - Current budget allocations
 * @param {number} totalIncome - Total monthly income
 * @returns {object} Recommended adjustments
 */
export const getRecommendedAdjustments = (budgets, totalIncome) => {
  const validation = validateBudgetAllocation(budgets, totalIncome);
  const adjustments = {};

  validation.warnings.forEach(warning => {
    if (warning.type === 'below_minimum' || warning.type === 'above_maximum') {
      const recommended = warning.recommended * totalIncome;
      adjustments[warning.category] = {
        current: budgets[warning.category],
        recommended: roundToFriendlyAmount(recommended),
        reason: warning.message,
        severity: warning.severity,
      };
    }
  });

  return {
    hasAdjustments: Object.keys(adjustments).length > 0,
    adjustments,
    validation,
  };
};

/**
 * Auto-balance budget to match total income
 * Proportionally adjusts all categories to fit within income
 * @param {object} budgets - Budget allocations by category
 * @param {number} totalIncome - Target total income
 * @returns {object} Balanced budget allocations
 */
export const autoBalanceBudget = (budgets, totalIncome) => {
  const currentTotal = Object.values(budgets).reduce((sum, amount) => sum + amount, 0);

  if (currentTotal === 0 || totalIncome === 0) {
    return budgets;
  }

  const ratio = totalIncome / currentTotal;
  const balanced = {};

  Object.entries(budgets).forEach(([category, amount]) => {
    balanced[category] = roundToFriendlyAmount(amount * ratio);
  });

  return balanced;
};

/**
 * Distribute remaining income across categories
 * @param {object} budgets - Current budget allocations
 * @param {number} totalIncome - Total monthly income
 * @param {Array} priorityCategories - Categories to prioritize (default: ['savings'])
 * @returns {object} Updated budget allocations
 */
export const distributeRemainingIncome = (
  budgets,
  totalIncome,
  priorityCategories = ['savings', 'healthcare']
) => {
  const currentTotal = Object.values(budgets).reduce((sum, amount) => sum + amount, 0);
  const remaining = totalIncome - currentTotal;

  if (remaining <= 0) {
    return budgets;
  }

  const distributed = { ...budgets };

  // Add to priority categories first
  const availablePriorities = priorityCategories.filter(cat => cat in distributed);
  if (availablePriorities.length > 0) {
    const perCategory = Math.floor(remaining / availablePriorities.length);
    availablePriorities.forEach(category => {
      distributed[category] = roundToFriendlyAmount(distributed[category] + perCategory);
    });
  } else {
    // If no priority categories, add to savings or other
    const fallbackCategory = distributed.savings ? 'savings' : 'other';
    if (distributed[fallbackCategory]) {
      distributed[fallbackCategory] = roundToFriendlyAmount(
        distributed[fallbackCategory] + remaining
      );
    }
  }

  return distributed;
};

/**
 * Generate budget summary statistics
 * @param {object} budgets - Budget allocations by category
 * @param {number} totalIncome - Total monthly income
 * @returns {object} Budget summary with statistics
 */
export const generateBudgetSummary = (budgets, totalIncome) => {
  const total = Object.values(budgets).reduce((sum, amount) => sum + amount, 0);
  const percentageAllocated = totalIncome > 0 ? (total / totalIncome) * 100 : 0;
  const remaining = totalIncome - total;

  const categoryBreakdown = Object.entries(budgets).map(([key, amount]) => ({
    category: key,
    name: DEFAULT_CATEGORIES[key]?.name || key,
    icon: DEFAULT_CATEGORIES[key]?.icon || '💡',
    amount,
    percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
  }));

  // Sort by amount descending
  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  return {
    totalBudget: total,
    totalIncome,
    percentageAllocated,
    remaining,
    categoryCount: Object.keys(budgets).length,
    categoryBreakdown,
    isBalanced: Math.abs(remaining) < 10, // Within $10
    isOverBudget: total > totalIncome,
  };
};

/**
 * Get onboarding recommendations based on user state
 * @param {object} userDetails - User profile information
 * @param {Array} expenses - Historical expenses
 * @param {object} categories - User's categories
 * @returns {object} Onboarding recommendations
 */
export const getOnboardingRecommendations = (userDetails, expenses, categories) => {
  const recommendedMode = getRecommendedMode(userDetails, expenses);
  const smartBudgets = calculateSmartBudgets(expenses, '3months');
  const hasExpenseHistory = expenses.length > 5;
  const hasCategories = Object.keys(categories).length > 0;

  return {
    recommendedMode,
    smartBudgets,
    hasExpenseHistory,
    hasCategories,
    shouldShowSmartSuggestions: smartBudgets.confidence !== 'low',
    expenseCount: expenses.length,
    categoryCount: Object.keys(categories).length,
    message: getRecommendationMessage(recommendedMode, hasExpenseHistory),
  };
};

/**
 * Get recommendation message based on mode and history
 * @param {string} mode - Recommended complexity mode
 * @param {boolean} hasHistory - Whether user has expense history
 * @returns {string} Recommendation message
 */
const getRecommendationMessage = (mode, hasHistory) => {
  if (mode === COMPLEXITY_MODES.ADVANCED) {
    return hasHistory
      ? 'Based on your spending history, we recommend advanced budgeting with monthly and annual tracking.'
      : 'For detailed financial planning, try advanced mode with monthly and annual budgets.';
  }

  if (mode === COMPLEXITY_MODES.SIMPLE) {
    return hasHistory
      ? 'We can create smart budget suggestions based on your spending history.'
      : 'Start with simple monthly budgets to track your spending by category.';
  }

  return 'Start tracking expenses without budgets, or set up simple budgets when ready.';
};

/**
 * Helper function to round to friendly numbers
 * @param {number} amount - Amount to round
 * @returns {number} Rounded amount
 */
export const roundBudgetAmount = roundToFriendlyAmount;

/**
 * Get industry benchmark for category
 * @param {string} category - Category key
 * @param {number} totalIncome - Total monthly income
 * @returns {object} Benchmark information
 */
export const getIndustryBenchmark = (category, totalIncome) => {
  const min = INDUSTRY_MINIMUMS[category];
  const max = INDUSTRY_MAXIMUMS[category];

  if (!min || !max) {
    return null;
  }

  return {
    category,
    minAmount: roundToFriendlyAmount(totalIncome * min),
    maxAmount: roundToFriendlyAmount(totalIncome * max),
    minPercentage: min * 100,
    maxPercentage: max * 100,
    recommendedRange: `${(min * 100).toFixed(0)}% - ${(max * 100).toFixed(0)}%`,
  };
};

/**
 * Get all industry benchmarks
 * @param {number} totalIncome - Total monthly income
 * @returns {object} All benchmarks by category
 */
export const getAllBenchmarks = (totalIncome) => {
  const benchmarks = {};
  Object.keys(INDUSTRY_MINIMUMS).forEach(category => {
    benchmarks[category] = getIndustryBenchmark(category, totalIncome);
  });
  return benchmarks;
};
