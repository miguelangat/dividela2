// src/utils/inputValidation.js
// Input validation utilities for currency and numeric inputs

/**
 * Comprehensive validation for currency input
 * Note: Large amount warnings are handled at the UI level with currency-aware thresholds
 * The maxValue here is very high by default to allow any currency's typical values
 * @param {number} value - Numeric value to validate
 * @param {object} options - Validation options
 * @returns {object} Validation result with isValid, errors, warnings, and sanitizedValue
 */
export const validateCurrencyInput = (value, options = {}) => {
  const {
    maxValue = 999999999999, // Very high default to support any currency
    minValue = 0,
    allowNegative = false,
    allowZero = true,
  } = options;

  const errors = [];
  const warnings = [];

  // Type check
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push('Please enter a valid number');
    return { isValid: false, errors, warnings, sanitizedValue: 0 };
  }

  // Negative check
  if (!allowNegative && value < 0) {
    errors.push('Amount must be positive');
  }

  // Zero check
  if (!allowZero && value === 0) {
    warnings.push('Amount cannot be zero');
  }

  // Range checks
  if (value < minValue) {
    errors.push(`Amount must be at least ${minValue}`);
  }

  if (value > maxValue) {
    errors.push(`Amount cannot exceed ${maxValue.toLocaleString()}`);
  }

  // Precision check
  const decimalPlaces = (value.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    warnings.push('Decimals will be rounded to 2 places');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedValue: allowNegative ? value : Math.abs(value),
  };
};

/**
 * Sanitize numeric input by removing all non-numeric characters
 * except decimal point and minus sign
 * @param {string} text - Input text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeNumericInput = (text) => {
  // Remove all non-numeric except decimal and minus
  return text.replace(/[^0-9.-]/g, '');
};

/**
 * Validate percentage input (0-100)
 * @param {number} value - Percentage value to validate
 * @returns {object} Validation result
 */
export const validatePercentage = (value) => {
  const errors = [];

  if (typeof value !== 'number' || isNaN(value)) {
    errors.push('Please enter a valid percentage');
    return { isValid: false, errors };
  }

  if (value < 0) {
    errors.push('Percentage must be positive');
  }

  if (value > 100) {
    errors.push('Percentage cannot exceed 100');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: Math.max(0, Math.min(100, value)),
  };
};

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {object} Validation result
 */
export const validateEmail = (email) => {
  const errors = [];

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: email.trim().toLowerCase(),
  };
};

/**
 * Validate non-empty text input
 * @param {string} text - Text to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} minLength - Minimum length (default: 1)
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {object} Validation result
 */
export const validateTextField = (text, fieldName = 'Field', minLength = 1, maxLength = 100) => {
  const errors = [];

  if (!text || text.trim().length === 0) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: trimmed,
  };
};

export default {
  validateCurrencyInput,
  sanitizeNumericInput,
  validatePercentage,
  validateEmail,
  validateTextField,
};
