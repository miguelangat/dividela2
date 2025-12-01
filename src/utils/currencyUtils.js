// src/utils/currencyUtils.js
// Currency formatting, conversion, and utility functions

import {
  getCurrencyInfo,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
} from '../constants/currencies';

/**
 * Format amount in specified currency using Intl.NumberFormat
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code (e.g., 'USD')
 * @param {object} options - Additional formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = DEFAULT_CURRENCY, options = {}) => {
  const currency = getCurrencyInfo(currencyCode);

  try {
    const formatter = new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: options.minimumFractionDigits ?? currency.decimals,
      maximumFractionDigits: options.maximumFractionDigits ?? currency.decimals,
      ...options,
    });

    return formatter.format(Math.abs(amount));
  } catch (error) {
    console.warn(`Currency formatting error for ${currencyCode}:`, error);
    // Fallback to simple formatting
    return `${currency.symbol}${Math.abs(amount).toFixed(currency.decimals)}`;
  }
};

/**
 * Format amount with compact notation (e.g., $1.2K, $1.5M)
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code
 * @returns {string} Formatted compact string
 */
export const formatCurrencyCompact = (amount, currencyCode = DEFAULT_CURRENCY) => {
  const currency = getCurrencyInfo(currencyCode);

  try {
    const formatter = new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      maximumFractionDigits: 1,
    });

    return formatter.format(Math.abs(amount));
  } catch (error) {
    console.warn(`Compact currency formatting error:`, error);
    return formatCurrency(amount, currencyCode);
  }
};

/**
 * Format dual currency display: "€50 (≈ $55)"
 * Shows original amount with converted amount in parentheses
 * @param {number} originalAmount - Original amount
 * @param {string} originalCurrency - Original currency code
 * @param {number} convertedAmount - Converted amount
 * @param {string} convertedCurrency - Converted currency code
 * @returns {string} Dual currency display string
 */
export const formatDualCurrency = (
  originalAmount,
  originalCurrency,
  convertedAmount,
  convertedCurrency
) => {
  // If same currency, only show once
  if (originalCurrency === convertedCurrency) {
    return formatCurrency(originalAmount, originalCurrency);
  }

  const original = formatCurrency(originalAmount, originalCurrency);
  const converted = formatCurrency(convertedAmount, convertedCurrency);

  return `${original} (≈ ${converted})`;
};

/**
 * Format currency with flag emoji
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code
 * @returns {string} Formatted string with flag
 */
export const formatCurrencyWithFlag = (amount, currencyCode = DEFAULT_CURRENCY) => {
  const currency = getCurrencyInfo(currencyCode);
  const formatted = formatCurrency(amount, currencyCode);
  return `${currency.flag} ${formatted}`;
};

/**
 * Calculate exchange rate from two amounts
 * @param {number} fromAmount - Amount in source currency
 * @param {number} toAmount - Amount in target currency
 * @returns {number} Exchange rate (toAmount / fromAmount)
 */
export const calculateExchangeRate = (fromAmount, toAmount) => {
  if (fromAmount === 0) return 0;
  return toAmount / fromAmount;
};

/**
 * Convert amount using exchange rate
 * @param {number} amount - Amount to convert
 * @param {number} exchangeRate - Exchange rate to apply
 * @returns {number} Converted amount
 */
export const convertCurrency = (amount, exchangeRate) => {
  return amount * exchangeRate;
};

/**
 * Calculate converted amount from source to target currency
 * @param {number} amount - Amount in source currency
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {number} exchangeRate - Exchange rate (1 FROM = X TO)
 * @returns {object} { convertedAmount, exchangeRate }
 */
export const convertWithRate = (amount, fromCurrency, toCurrency, exchangeRate) => {
  // Same currency, no conversion
  if (fromCurrency === toCurrency) {
    return {
      convertedAmount: amount,
      exchangeRate: 1.0,
    };
  }

  const convertedAmount = convertCurrency(amount, exchangeRate);

  return {
    convertedAmount: roundCurrency(convertedAmount),
    exchangeRate,
  };
};

/**
 * Format exchange rate for display
 * @param {number} rate - Exchange rate
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {string} Formatted rate string (e.g., "1 EUR = 1.10 USD")
 */
export const formatExchangeRate = (rate, fromCurrency, toCurrency) => {
  const fromInfo = getCurrencyInfo(fromCurrency);
  const toInfo = getCurrencyInfo(toCurrency);

  return `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
};

/**
 * Format exchange rate with symbols
 * @param {number} rate - Exchange rate
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {string} Formatted with symbols (e.g., "€1 = $1.10")
 */
export const formatExchangeRateWithSymbols = (rate, fromCurrency, toCurrency) => {
  const fromSymbol = getCurrencyInfo(fromCurrency).symbol;
  const toSymbol = getCurrencyInfo(toCurrency).symbol;

  return `${fromSymbol}1 = ${toSymbol}${rate.toFixed(4)}`;
};

/**
 * Parse currency input (remove symbols, commas, etc.)
 * @param {string} input - User input string
 * @returns {number} Parsed number
 */
export const parseCurrencyInput = (input) => {
  if (typeof input === 'number') return input;
  if (!input) return 0;

  // Remove currency symbols, commas, spaces
  const cleaned = String(input).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Parse currency input with comprehensive safety checks
 * Handles copy/paste, multiple decimals, whitespace, etc.
 * @param {string} input - User input string
 * @returns {string} Cleaned numeric string
 */
export const parseCurrencyInputSafe = (input) => {
  if (typeof input === 'number') return input.toString();
  if (!input) return '';

  // Trim whitespace
  let cleaned = String(input).trim();

  // Remove currency symbols, commas, spaces - keep numbers, decimal, minus
  cleaned = cleaned.replace(/[^0-9.-]/g, '');

  // Handle multiple decimal points - keep only first
  const firstDecimal = cleaned.indexOf('.');
  if (firstDecimal !== -1) {
    const before = cleaned.substring(0, firstDecimal);
    const after = cleaned.substring(firstDecimal + 1).replace(/\./g, '');
    cleaned = before + '.' + after;
  }

  // Remove extra minus signs (keep only leading one)
  if (cleaned.startsWith('-')) {
    cleaned = '-' + cleaned.substring(1).replace(/-/g, '');
  } else {
    cleaned = cleaned.replace(/-/g, '');
  }

  // Remove leading zeros (except "0." cases)
  if (cleaned.length > 1 && cleaned.startsWith('0') && !cleaned.startsWith('0.')) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  return cleaned;
};

/**
 * Round to currency decimals (typically 2)
 * @param {number} amount - Amount to round
 * @param {string} currencyCode - Currency code
 * @returns {number} Rounded amount
 */
export const roundCurrency = (amount, currencyCode = DEFAULT_CURRENCY) => {
  const currency = getCurrencyInfo(currencyCode);
  const decimals = currency.decimals;
  const multiplier = Math.pow(10, decimals);
  return Math.round(amount * multiplier) / multiplier;
};

/**
 * Validate currency amount
 * @param {number} amount - Amount to validate
 * @returns {object} { isValid: boolean, error: string|null }
 */
export const validateAmount = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }

  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero' };
  }

  if (amount > 1000000) {
    return { isValid: false, error: 'Amount exceeds maximum allowed value' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate exchange rate
 * @param {number} rate - Exchange rate to validate
 * @returns {object} { isValid: boolean, error: string|null }
 */
export const validateExchangeRate = (rate) => {
  if (typeof rate !== 'number' || isNaN(rate)) {
    return { isValid: false, error: 'Exchange rate must be a valid number' };
  }

  if (rate <= 0) {
    return { isValid: false, error: 'Exchange rate must be greater than zero' };
  }

  if (rate > 10000) {
    return { isValid: false, error: 'Exchange rate seems unusually high' };
  }

  return { isValid: true, error: null };
};

/**
 * Get currency symbol only (for input prefixes)
 * @param {string} currencyCode - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currencyCode = DEFAULT_CURRENCY) => {
  return getCurrencyInfo(currencyCode).symbol;
};

/**
 * Create expense with multi-currency data
 * Helper to structure expense data correctly
 * @param {object} expenseData - Base expense data
 * @param {string} primaryCurrency - Couple's primary currency
 * @returns {object} Enhanced expense with currency fields
 */
export const createMultiCurrencyExpense = (expenseData, primaryCurrency) => {
  const {
    amount,
    currency,
    exchangeRate,
    ...rest
  } = expenseData;

  // Same currency - no conversion needed
  if (currency === primaryCurrency) {
    return {
      ...rest,
      amount,
      currency,
      primaryCurrencyAmount: amount,
      primaryCurrency,
      exchangeRate: 1.0,
      exchangeRateSource: 'none',
    };
  }

  // Different currency - apply conversion
  const primaryCurrencyAmount = convertCurrency(amount, exchangeRate);

  return {
    ...rest,
    amount, // Original amount
    currency, // Original currency
    primaryCurrencyAmount: roundCurrency(primaryCurrencyAmount, primaryCurrency),
    primaryCurrency,
    exchangeRate,
    exchangeRateSource: 'manual',
  };
};

/**
 * Get display amount for expense (shows original currency)
 * @param {object} expense - Expense object
 * @returns {string} Formatted amount string
 */
export const getExpenseDisplayAmount = (expense) => {
  const amount = expense.amount;
  const currency = expense.currency || DEFAULT_CURRENCY;

  return formatCurrency(amount, currency);
};

/**
 * Get dual display for expense (original + converted)
 * @param {object} expense - Expense object
 * @returns {string} Dual currency display
 */
export const getExpenseDualDisplay = (expense) => {
  const originalAmount = expense.amount;
  const originalCurrency = expense.currency || DEFAULT_CURRENCY;
  const convertedAmount = expense.primaryCurrencyAmount || expense.amount;
  const convertedCurrency = expense.primaryCurrency || DEFAULT_CURRENCY;

  return formatDualCurrency(
    originalAmount,
    originalCurrency,
    convertedAmount,
    convertedCurrency
  );
};

export default {
  formatCurrency,
  formatCurrencyCompact,
  formatDualCurrency,
  formatCurrencyWithFlag,
  calculateExchangeRate,
  convertCurrency,
  convertWithRate,
  formatExchangeRate,
  formatExchangeRateWithSymbols,
  parseCurrencyInput,
  parseCurrencyInputSafe,
  roundCurrency,
  validateAmount,
  validateExchangeRate,
  getCurrencySymbol,
  createMultiCurrencyExpense,
  getExpenseDisplayAmount,
  getExpenseDualDisplay,
};
