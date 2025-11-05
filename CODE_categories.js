// src/constants/categories.js
// Expense categories for Dividela

export const CATEGORIES = [
  {
    id: 'food',
    name: 'Food',
    icon: '🍕',
    color: '#FF6B6B',
  },
  {
    id: 'groceries',
    name: 'Groceries',
    icon: '🛒',
    color: '#4ECDC4',
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚗',
    color: '#95E1D3',
  },
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    color: '#F38181',
  },
  {
    id: 'fun',
    name: 'Fun',
    icon: '🎬',
    color: '#AA96DA',
  },
  {
    id: 'other',
    name: 'Other',
    icon: '➕',
    color: '#999999',
  },
];

// Helper function to get category by ID
export const getCategoryById = (id) => {
  return CATEGORIES.find(category => category.id === id) || CATEGORIES[5]; // Default to 'other'
};

// Helper function to get category icon
export const getCategoryIcon = (id) => {
  const category = getCategoryById(id);
  return category.icon;
};

// Helper function to get category name
export const getCategoryName = (id) => {
  const category = getCategoryById(id);
  return category.name;
};

// Helper function to get category color
export const getCategoryColor = (id) => {
  const category = getCategoryById(id);
  return category.color;
};

export default CATEGORIES;
