// src/constants/budgetDefaults.js
// Budget defaults and industry benchmarks for onboarding

/**
 * Industry-standard minimum percentages by category
 * Used to validate budgets and provide recommendations
 */
export const INDUSTRY_MINIMUMS = {
  food: 0.05, // 5% minimum for food & dining
  groceries: 0.08, // 8% minimum for groceries
  transport: 0.05, // 5% minimum for transportation
  home: 0.25, // 25% minimum for housing & utilities
  fun: 0.02, // 2% minimum for entertainment
  healthcare: 0.05, // 5% minimum for healthcare
  savings: 0.10, // 10% minimum for savings
  other: 0.02, // 2% minimum for other expenses
};

/**
 * Industry-standard maximum percentages by category
 * Used to warn users about over-allocation
 */
export const INDUSTRY_MAXIMUMS = {
  food: 0.15, // 15% maximum for food & dining
  groceries: 0.20, // 20% maximum for groceries
  transport: 0.20, // 20% maximum for transportation
  home: 0.40, // 40% maximum for housing & utilities
  fun: 0.15, // 15% maximum for entertainment
  healthcare: 0.15, // 15% maximum for healthcare
  savings: 0.30, // 30% maximum for savings
  other: 0.20, // 20% maximum for other expenses
};

/**
 * Default categories with extended metadata for onboarding
 * Includes icons, colors, descriptions, and default amounts
 */
export const DEFAULT_CATEGORIES = {
  food: {
    name: 'Food & Dining',
    icon: '🍔',
    color: '#FF6B6B',
    description: 'Restaurants, takeout, and dining out',
    defaultBudget: 500,
    isDefault: true,
    sortOrder: 1,
  },
  groceries: {
    name: 'Groceries',
    icon: '🛒',
    color: '#4ECDC4',
    description: 'Supermarket and grocery shopping',
    defaultBudget: 400,
    isDefault: true,
    sortOrder: 2,
  },
  transport: {
    name: 'Transport',
    icon: '🚗',
    color: '#95E1D3',
    description: 'Gas, public transit, rideshares',
    defaultBudget: 200,
    isDefault: true,
    sortOrder: 3,
  },
  home: {
    name: 'Home & Utilities',
    icon: '🏠',
    color: '#F38181',
    description: 'Rent, mortgage, utilities, maintenance',
    defaultBudget: 800,
    isDefault: true,
    sortOrder: 4,
  },
  fun: {
    name: 'Entertainment',
    icon: '🎉',
    color: '#AA96DA',
    description: 'Movies, games, hobbies, going out',
    defaultBudget: 300,
    isDefault: true,
    sortOrder: 5,
  },
  healthcare: {
    name: 'Healthcare',
    icon: '💊',
    color: '#FFA07A',
    description: 'Medical, dental, prescriptions',
    defaultBudget: 150,
    isDefault: true,
    sortOrder: 6,
  },
  savings: {
    name: 'Savings',
    icon: '💰',
    color: '#98D8C8',
    description: 'Emergency fund, investments, goals',
    defaultBudget: 300,
    isDefault: true,
    sortOrder: 7,
  },
  other: {
    name: 'Other',
    icon: '💡',
    color: '#999999',
    description: 'Everything else',
    defaultBudget: 200,
    isDefault: true,
    sortOrder: 8,
  },
};

/**
 * Budget templates for simple mode onboarding
 * Pre-configured budget allocations for different income levels
 */
export const BUDGET_TEMPLATES = {
  starter: {
    name: 'Starter Budget',
    description: 'For monthly income under $3,000',
    incomeRange: { min: 0, max: 3000 },
    template: {
      food: 300,
      groceries: 250,
      transport: 150,
      home: 900,
      fun: 100,
      healthcare: 100,
      savings: 200,
      other: 100,
    },
  },
  moderate: {
    name: 'Moderate Budget',
    description: 'For monthly income $3,000-$6,000',
    incomeRange: { min: 3000, max: 6000 },
    template: {
      food: 500,
      groceries: 400,
      transport: 250,
      home: 1400,
      fun: 300,
      healthcare: 200,
      savings: 500,
      other: 200,
    },
  },
  comfortable: {
    name: 'Comfortable Budget',
    description: 'For monthly income $6,000-$10,000',
    incomeRange: { min: 6000, max: 10000 },
    template: {
      food: 700,
      groceries: 600,
      transport: 400,
      home: 2200,
      fun: 500,
      healthcare: 300,
      savings: 1000,
      other: 300,
    },
  },
  premium: {
    name: 'Premium Budget',
    description: 'For monthly income over $10,000',
    incomeRange: { min: 10000, max: Infinity },
    template: {
      food: 1000,
      groceries: 800,
      transport: 600,
      home: 3000,
      fun: 800,
      healthcare: 400,
      savings: 1500,
      other: 500,
    },
  },
};

/**
 * Quick amount suggestions for budget input
 * Rounded amounts that are easy to remember and adjust
 */
export const QUICK_AMOUNTS = [
  50, 100, 150, 200, 250, 300, 400, 500,
  600, 700, 800, 900, 1000, 1200, 1500, 2000,
  2500, 3000, 4000, 5000
];

/**
 * Complexity mode definitions
 */
export const COMPLEXITY_MODES = {
  NONE: 'none',
  SIMPLE: 'simple',
  ADVANCED: 'advanced',
};

/**
 * Onboarding steps by complexity mode
 */
export const ONBOARDING_STEPS = {
  none: ['welcome', 'complete'],
  simple: ['welcome', 'income', 'categories', 'amounts', 'review', 'complete'],
  advanced: ['welcome', 'income', 'categories', 'monthly', 'annual', 'review', 'complete'],
};

/**
 * Get budget template by total monthly income
 * @param {number} monthlyIncome - Total monthly household income
 * @returns {object} Budget template object
 */
export const getBudgetTemplateByIncome = (monthlyIncome) => {
  const templates = Object.values(BUDGET_TEMPLATES);
  const template = templates.find(
    t => monthlyIncome >= t.incomeRange.min && monthlyIncome < t.incomeRange.max
  );
  return template || BUDGET_TEMPLATES.moderate;
};

/**
 * Get total budget amount from template
 * @param {object} template - Budget template object
 * @returns {number} Total budget amount
 */
export const getTotalFromTemplate = (template) => {
  return Object.values(template).reduce((sum, amount) => sum + amount, 0);
};

/**
 * Validate budget allocation against industry standards
 * @param {object} budgets - Budget allocations by category
 * @param {number} totalIncome - Total monthly income
 * @returns {object} Validation results with warnings
 */
export const validateBudgetAllocation = (budgets, totalIncome) => {
  const warnings = [];
  const errors = [];
  const totalBudget = Object.values(budgets).reduce((sum, amount) => sum + amount, 0);

  // Check if total budget exceeds income
  if (totalBudget > totalIncome * 1.1) {
    errors.push({
      type: 'total_exceeded',
      message: 'Total budget exceeds monthly income by more than 10%',
      severity: 'high',
    });
  }

  // Check each category against industry standards
  Object.entries(budgets).forEach(([category, amount]) => {
    const percentage = amount / totalIncome;
    const min = INDUSTRY_MINIMUMS[category];
    const max = INDUSTRY_MAXIMUMS[category];

    if (min && percentage < min) {
      warnings.push({
        type: 'below_minimum',
        category,
        message: `${DEFAULT_CATEGORIES[category]?.name || category} is below recommended minimum (${(min * 100).toFixed(0)}%)`,
        severity: 'low',
        current: percentage,
        recommended: min,
      });
    }

    if (max && percentage > max) {
      warnings.push({
        type: 'above_maximum',
        category,
        message: `${DEFAULT_CATEGORIES[category]?.name || category} is above recommended maximum (${(max * 100).toFixed(0)}%)`,
        severity: 'medium',
        current: percentage,
        recommended: max,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    totalBudget,
    totalIncome,
    percentageAllocated: (totalBudget / totalIncome) * 100,
  };
};

/**
 * Round amount to friendly number
 * @param {number} amount - Amount to round
 * @returns {number} Rounded amount
 */
export const roundToFriendlyAmount = (amount) => {
  if (amount < 100) {
    return Math.round(amount / 10) * 10;
  } else if (amount < 500) {
    return Math.round(amount / 25) * 25;
  } else if (amount < 1000) {
    return Math.round(amount / 50) * 50;
  } else if (amount < 5000) {
    return Math.round(amount / 100) * 100;
  } else {
    return Math.round(amount / 250) * 250;
  }
};

/**
 * Get default category keys
 * @returns {string[]} Array of default category keys
 */
export const getDefaultCategoryKeys = () => Object.keys(DEFAULT_CATEGORIES);

/**
 * Get total default budget
 * @returns {number} Sum of all default budgets
 */
export const getTotalDefaultBudget = () => {
  return Object.values(DEFAULT_CATEGORIES).reduce(
    (sum, category) => sum + category.defaultBudget,
    0
  );
};

/**
 * Check if category key is a default category
 * @param {string} key - Category key
 * @returns {boolean} True if default category
 */
export const isDefaultCategory = (key) => {
  return key in DEFAULT_CATEGORIES;
};
