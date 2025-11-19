// src/utils/validators.js
// Form validation utilities for Dividela

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate password
 * Requirements: minimum 8 characters
 */
export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate display name
 */
export const validateDisplayName = (name) => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate invite code
 * Format: 6 alphanumeric characters
 */
export const validateInviteCode = (code) => {
  if (!code || code.trim() === '') {
    return { isValid: false, error: 'Invite code is required' };
  }

  const codeRegex = /^[A-Z0-9]{6}$/;
  if (!codeRegex.test(code.toUpperCase())) {
    return { isValid: false, error: 'Invite code must be 6 characters (letters and numbers)' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate expense amount
 */
export const validateExpenseAmount = (amount) => {
  if (!amount || amount === '') {
    return { isValid: false, error: 'Amount is required' };
  }

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (numAmount > 999999.99) {
    return { isValid: false, error: 'Amount is too large' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate expense description
 */
export const validateExpenseDescription = (description) => {
  if (!description || description.trim() === '') {
    return { isValid: false, error: 'Description is required' };
  }

  if (description.trim().length < 2) {
    return { isValid: false, error: 'Description must be at least 2 characters' };
  }

  if (description.trim().length > 100) {
    return { isValid: false, error: 'Description must be less than 100 characters' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate custom split percentage
 */
export const validateSplitPercentage = (percentage) => {
  const num = parseInt(percentage);
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  if (num < 0 || num > 100) {
    return { isValid: false, error: 'Percentage must be between 0 and 100' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate that two percentages add up to 100
 */
export const validateSplitTotal = (percentage1, percentage2) => {
  const total = parseInt(percentage1) + parseInt(percentage2);
  
  if (total !== 100) {
    return { isValid: false, error: 'Split percentages must add up to 100%' };
  }

  return { isValid: true, error: null };
};

/**
 * General form validator
 * Takes an object of values and validation rules
 */
export const validateForm = (fields) => {
  const errors = {};
  let isValid = true;

  Object.keys(fields).forEach(fieldName => {
    const { value, validator } = fields[fieldName];
    const validation = validator(value);
    
    if (!validation.isValid) {
      errors[fieldName] = validation.error;
      isValid = false;
    }
  });

  return { isValid, errors };
};

/**
 * Validate budget amount
 * Checks for valid positive numbers, not NaN, not negative, reasonable range
 */
export const validateBudgetAmount = (amount, fieldName = 'Budget amount') => {
  // Check if amount exists
  if (amount === null || amount === undefined || amount === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Check if valid number
  if (typeof numAmount !== 'number' || isNaN(numAmount)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  // Check if positive
  if (numAmount < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }

  // Check if zero (warning, not error)
  if (numAmount === 0) {
    return { isValid: true, warning: `${fieldName} is set to zero`, error: null };
  }

  // Check reasonable upper limit (1 million)
  if (numAmount > 1000000) {
    return { isValid: false, error: `${fieldName} exceeds maximum allowed (1,000,000)` };
  }

  // Check for excessive decimal places
  const decimalPlaces = numAmount.toString().split('.')[1]?.length || 0;
  if (decimalPlaces > 2) {
    return {
      isValid: true,
      warning: `${fieldName} has more than 2 decimal places (will be rounded)`,
      error: null
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate category name
 */
export const validateCategoryName = (name) => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Category name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Category name must be at least 2 characters' };
  }

  if (name.trim().length > 30) {
    return { isValid: false, error: 'Category name must be less than 30 characters' };
  }

  // Check for invalid characters (only allow letters, numbers, spaces, hyphens, underscores)
  const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validNameRegex.test(name)) {
    return { isValid: false, error: 'Category name contains invalid characters' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate total budget allocation
 * Ensures sum of category budgets doesn't exceed total budget
 */
export const validateBudgetAllocation = (categoryBudgets, totalBudget) => {
  const warnings = [];
  const errors = [];

  // Validate totalBudget
  const totalValidation = validateBudgetAmount(totalBudget, 'Total budget');
  if (!totalValidation.isValid) {
    errors.push({ field: 'totalBudget', message: totalValidation.error });
  }

  // Validate categoryBudgets is an object
  if (!categoryBudgets || typeof categoryBudgets !== 'object') {
    errors.push({ field: 'categoryBudgets', message: 'Category budgets must be an object' });
    return { isValid: false, warnings, errors };
  }

  // Validate each category budget
  let sumOfCategories = 0;
  Object.entries(categoryBudgets).forEach(([key, amount]) => {
    const validation = validateBudgetAmount(amount, `Budget for ${key}`);
    if (!validation.isValid) {
      errors.push({ field: key, message: validation.error });
    } else if (validation.warning) {
      warnings.push({ field: key, message: validation.warning });
    }

    // Add to sum if valid number
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (!isNaN(numAmount)) {
      sumOfCategories += numAmount;
    }
  });

  // Check if sum matches total (with small tolerance for floating point errors)
  const tolerance = 0.01;
  const difference = Math.abs(sumOfCategories - totalBudget);

  if (difference > tolerance) {
    if (sumOfCategories > totalBudget) {
      errors.push({
        field: 'allocation',
        message: `Category budgets ($${sumOfCategories.toFixed(2)}) exceed total budget ($${totalBudget.toFixed(2)})`
      });
    } else {
      warnings.push({
        field: 'allocation',
        message: `Unallocated budget: $${(totalBudget - sumOfCategories).toFixed(2)}`
      });
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    totalAllocated: sumOfCategories,
    unallocated: totalBudget - sumOfCategories,
  };
};

/**
 * Sanitize budget amount
 * Ensures amount is a clean number with max 2 decimal places
 */
export const sanitizeBudgetAmount = (amount) => {
  // Convert to number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Return 0 for invalid values
  if (typeof numAmount !== 'number' || isNaN(numAmount) || numAmount < 0) {
    return 0;
  }

  // Round to 2 decimal places
  return Math.round(numAmount * 100) / 100;
};

/**
 * Sanitize category budgets object
 * Ensures all values are valid numbers
 */
export const sanitizeCategoryBudgets = (categoryBudgets) => {
  if (!categoryBudgets || typeof categoryBudgets !== 'object') {
    return {};
  }

  const sanitized = {};
  Object.entries(categoryBudgets).forEach(([key, amount]) => {
    sanitized[key] = sanitizeBudgetAmount(amount);
  });

  return sanitized;
};

/**
 * Firebase error message handler
 * Converts Firebase error codes to user-friendly messages
 */
export const getFirebaseErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/weak-password': 'Password is too weak',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'permission-denied': 'Permission denied. Please check your account permissions',
    'unavailable': 'Service temporarily unavailable. Please try again',
    'unauthenticated': 'Authentication required. Please sign in again',
  };

  return errorMessages[errorCode] || 'An error occurred. Please try again';
};

export default {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateInviteCode,
  validateExpenseAmount,
  validateExpenseDescription,
  validateSplitPercentage,
  validateSplitTotal,
  validateForm,
  validateBudgetAmount,
  validateCategoryName,
  validateBudgetAllocation,
  sanitizeBudgetAmount,
  sanitizeCategoryBudgets,
  getFirebaseErrorMessage,
};
