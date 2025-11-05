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
  getFirebaseErrorMessage,
};
