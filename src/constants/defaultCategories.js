// src/constants/defaultCategories.js
// Default expense categories for budget tracking

/**
 * Default categories provided to all couples
 * Structure: { key: { name, icon, defaultBudget, isDefault } }
 */
export const DEFAULT_CATEGORIES = {
  food: {
    name: 'Food & Dining',
    icon: '🍔',
    defaultBudget: 500,
    isDefault: true,
  },
  groceries: {
    name: 'Groceries',
    icon: '🛒',
    defaultBudget: 400,
    isDefault: true,
  },
  transport: {
    name: 'Transport',
    icon: '🚗',
    defaultBudget: 200,
    isDefault: true,
  },
  home: {
    name: 'Home & Utilities',
    icon: '🏠',
    defaultBudget: 800,
    isDefault: true,
  },
  fun: {
    name: 'Entertainment',
    icon: '🎉',
    defaultBudget: 300,
    isDefault: true,
  },
  other: {
    name: 'Other',
    icon: '💡',
    defaultBudget: 200,
    isDefault: true,
  },
};

/**
 * Get array of default category keys
 */
export const getDefaultCategoryKeys = () => Object.keys(DEFAULT_CATEGORIES);

/**
 * Get total default budget (sum of all default budgets)
 */
export const getTotalDefaultBudget = () => {
  return Object.values(DEFAULT_CATEGORIES).reduce(
    (sum, category) => sum + category.defaultBudget,
    0
  );
};

/**
 * Check if a category key is a default category
 */
export const isDefaultCategory = (key) => {
  return key in DEFAULT_CATEGORIES;
};

/**
 * Generate a unique key from a category name
 * Example: "Health & Fitness" -> "health_fitness"
 */
export const generateCategoryKey = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};
