/**
 * Comprehensive validation for import data
 * Handles edge cases and provides detailed error messages
 */

import { warn, error as logError } from './importDebug';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

/**
 * Validation result structure
 */
function createValidationResult(isValid, errors = [], warnings = []) {
  return {
    isValid,
    errors,
    warnings,
    hasWarnings: warnings.length > 0,
  };
}

/**
 * Validate file before parsing
 */
export function validateFile(fileInfo) {
  const errors = [];
  const warnings = [];

  // Check if file exists
  if (!fileInfo || !fileInfo.uri) {
    errors.push('No file selected');
    return createValidationResult(false, errors, warnings);
  }

  // Check file name
  if (!fileInfo.name || fileInfo.name.trim().length === 0) {
    warnings.push('File has no name');
  }

  // Check file size
  if (fileInfo.size === 0) {
    errors.push('File is empty (0 bytes)');
  } else if (fileInfo.size > 10 * 1024 * 1024) {
    // 10MB limit (reduced from 50MB for mobile device compatibility)
    errors.push('File is too large (max 10MB)');
  } else if (fileInfo.size < 100) {
    // Suspiciously small
    warnings.push('File is very small, may not contain valid data');
  }

  // Check file type
  if (!fileInfo.type || (!fileInfo.type.includes('csv') && !fileInfo.type.includes('pdf'))) {
    const extension = fileInfo.name.toLowerCase().split('.').pop();
    if (extension !== 'csv' && extension !== 'pdf' && extension !== 'txt') {
      errors.push(`Unsupported file type: ${fileInfo.type || 'unknown'}`);
    }
  }

  // Check for suspicious file names
  const suspiciousPatterns = ['.exe', '.dll', '.bat', '.sh', '.app'];
  if (suspiciousPatterns.some(pattern => fileInfo.name.toLowerCase().includes(pattern))) {
    errors.push('Suspicious file type detected');
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate date value
 */
export function validateDate(date, fieldName = 'date') {
  const errors = [];
  const warnings = [];

  if (!date) {
    errors.push(`${fieldName} is required`);
    return createValidationResult(false, errors, warnings);
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    errors.push(`${fieldName} is not a valid date`);
    return createValidationResult(false, errors, warnings);
  }

  // Check for future dates
  const now = new Date();
  if (dateObj > now) {
    warnings.push(`${fieldName} is in the future`);
  }

  // Check for very old dates (before 1900)
  if (dateObj.getFullYear() < 1900) {
    errors.push(`${fieldName} is too old (before 1900)`);
  }

  // Check for dates more than 10 years in the past
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  if (dateObj < tenYearsAgo) {
    warnings.push(`${fieldName} is more than 10 years old`);
  }

  // Check for dates in the next year (might be wrong)
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  if (dateObj > nextYear) {
    errors.push(`${fieldName} is more than a year in the future`);
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate amount value
 */
export function validateAmount(amount, fieldName = 'amount') {
  const errors = [];
  const warnings = [];

  if (amount === undefined || amount === null) {
    errors.push(`${fieldName} is required`);
    return createValidationResult(false, errors, warnings);
  }

  // Check if numeric
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push(`${fieldName} must be a valid number`);
    return createValidationResult(false, errors, warnings);
  }

  // Check if positive
  if (amount <= 0) {
    errors.push(`${fieldName} must be greater than 0`);
  }

  // Check for suspiciously large amounts
  if (amount > 1000000) {
    // $1M
    warnings.push(`${fieldName} is very large ($${amount.toFixed(2)}). Please verify.`);
  }

  // Check for very small amounts
  if (amount > 0 && amount < 0.01) {
    warnings.push(`${fieldName} is less than $0.01`);
  }

  // Check for precision issues
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    warnings.push(`${fieldName} has more than 2 decimal places, will be rounded`);
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate Firestore field name
 *
 * Firestore field name restrictions:
 * - Cannot contain '.' (dot)
 * - Cannot start with '__' (double underscore)
 * - Cannot be exactly '__name__'
 * - Cannot be empty
 * - Must be <= 1500 bytes when UTF-8 encoded
 *
 * @param {string} fieldName - Field name to validate
 * @returns {Object} Validation result with isValid and error message
 */
export function validateFirestoreFieldName(fieldName) {
  const errors = [];

  if (!fieldName || fieldName.trim().length === 0) {
    errors.push('Field name cannot be empty');
    return { isValid: false, errors };
  }

  // Check for dots
  if (fieldName.includes('.')) {
    errors.push(`Field name "${fieldName}" contains illegal character '.' (dot)`);
  }

  // Check for double underscore prefix
  if (fieldName.startsWith('__')) {
    errors.push(`Field name "${fieldName}" cannot start with '__' (reserved by Firestore)`);
  }

  // Check for reserved __name__ field
  if (fieldName === '__name__') {
    errors.push(`Field name "__name__" is reserved by Firestore`);
  }

  // Check byte length (UTF-8 encoding)
  const byteLength = new TextEncoder().encode(fieldName).length;
  if (byteLength > 1500) {
    errors.push(`Field name "${fieldName}" exceeds 1500 bytes (${byteLength} bytes)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all field names in an object (recursively)
 *
 * @param {Object} obj - Object to validate
 * @param {string} prefix - Prefix for nested field paths (for error messages)
 * @returns {Object} Validation result with all errors
 */
export function validateFirestoreFieldNames(obj, prefix = '') {
  const errors = [];

  if (!obj || typeof obj !== 'object') {
    return { isValid: true, errors: [] };
  }

  Object.keys(obj).forEach((key) => {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    // Validate this field name
    const validation = validateFirestoreFieldName(key);
    if (!validation.isValid) {
      errors.push(...validation.errors.map(e => `${fullPath}: ${e}`));
    }

    // Recursively validate nested objects
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
      const nestedValidation = validateFirestoreFieldNames(obj[key], fullPath);
      errors.push(...nestedValidation.errors);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate description
 */
export function validateDescription(description, fieldName = 'description') {
  const errors = [];
  const warnings = [];

  if (!description || description.trim().length === 0) {
    errors.push(`${fieldName} is required`);
    return createValidationResult(false, errors, warnings);
  }

  // Check length
  if (description.length > 500) {
    warnings.push(`${fieldName} is very long (${description.length} characters)`);
  }

  // Check for suspicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /\<iframe/i,
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(description))) {
    errors.push(`${fieldName} contains suspicious content`);
  }

  // Check for control characters
  if (/[\x00-\x1F\x7F]/.test(description)) {
    warnings.push(`${fieldName} contains control characters`);
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate transaction object
 */
export function validateTransaction(transaction, index) {
  const errors = [];
  const warnings = [];

  // Validate date
  const dateValidation = validateDate(transaction.date, 'date');
  errors.push(...dateValidation.errors.map(e => `Transaction ${index + 1}: ${e}`));
  warnings.push(...dateValidation.warnings.map(w => `Transaction ${index + 1}: ${w}`));

  // Validate amount
  const amountValidation = validateAmount(transaction.amount, 'amount');
  errors.push(...amountValidation.errors.map(e => `Transaction ${index + 1}: ${e}`));
  warnings.push(...amountValidation.warnings.map(w => `Transaction ${index + 1}: ${w}`));

  // Validate description
  const descValidation = validateDescription(transaction.description, 'description');
  errors.push(...descValidation.errors.map(e => `Transaction ${index + 1}: ${e}`));
  warnings.push(...descValidation.warnings.map(w => `Transaction ${index + 1}: ${w}`));

  // Validate type
  if (transaction.type && !['debit', 'credit'].includes(transaction.type)) {
    warnings.push(`Transaction ${index + 1}: Unknown type '${transaction.type}'`);
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate multiple transactions
 */
export function validateTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    return createValidationResult(false, ['Transactions must be an array'], []);
  }

  if (transactions.length === 0) {
    return createValidationResult(false, ['No transactions to validate'], []);
  }

  if (transactions.length > 1000) {
    return createValidationResult(
      false,
      [`Too many transactions (${transactions.length}). Maximum is 1000.`],
      []
    );
  }

  const allErrors = [];
  const allWarnings = [];
  const validTransactions = [];
  const invalidTransactions = [];

  transactions.forEach((transaction, index) => {
    const validation = validateTransaction(transaction, index);

    if (validation.isValid) {
      validTransactions.push(transaction);
    } else {
      invalidTransactions.push({ index, transaction, errors: validation.errors });
    }

    allErrors.push(...validation.errors);
    allWarnings.push(...validation.warnings);
  });

  // Check for duplicates within the import
  const duplicatesWithinImport = findDuplicatesWithinSet(transactions);
  if (duplicatesWithinImport.length > 0) {
    allWarnings.push(
      `Found ${duplicatesWithinImport.length} duplicate transactions within this import`
    );
  }

  const isValid = allErrors.length === 0;

  if (!isValid) {
    logError('VALIDATION', `Found ${allErrors.length} validation errors`, {
      errors: allErrors.slice(0, 10), // Log first 10
    });
  }

  if (allWarnings.length > 0) {
    warn('VALIDATION', `Found ${allWarnings.length} validation warnings`, {
      warnings: allWarnings.slice(0, 10), // Log first 10
    });
  }

  return {
    ...createValidationResult(isValid, allErrors, allWarnings),
    validCount: validTransactions.length,
    invalidCount: invalidTransactions.length,
    validTransactions,
    invalidTransactions,
    duplicatesWithinImport,
  };
}

/**
 * Find duplicates within a set of transactions
 */
function findDuplicatesWithinSet(transactions) {
  const seen = new Map();
  const duplicates = [];

  transactions.forEach((transaction, index) => {
    const key = `${transaction.date}-${transaction.amount}-${transaction.description}`;

    if (seen.has(key)) {
      duplicates.push({
        index,
        originalIndex: seen.get(key),
        transaction,
      });
    } else {
      seen.set(key, index);
    }
  });

  return duplicates;
}

/**
 * Validate expense object before import
 */
export function validateExpense(expense) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!expense.coupleId) errors.push('Missing coupleId');
  if (!expense.paidBy) errors.push('Missing paidBy');
  if (!expense.categoryKey) errors.push('Missing categoryKey');
  if (!expense.splitDetails) errors.push('Missing splitDetails');

  // Validate Firestore field names
  const firestoreValidation = validateFirestoreFieldNames(expense);
  if (!firestoreValidation.isValid) {
    errors.push(...firestoreValidation.errors.map(e => `Invalid field name: ${e}`));
  }

  // Validate amounts in splitDetails
  if (expense.splitDetails) {
    const total =
      (expense.splitDetails.user1Amount || 0) + (expense.splitDetails.user2Amount || 0);

    // Check amounts sum to transaction total (1 cent tolerance)
    if (Math.abs(total - expense.amount) > 0.01) {
      errors.push(`Split amounts don't match total: $${total.toFixed(2)} vs $${expense.amount.toFixed(2)}`);
    }

    // Check percentages sum to 100
    const totalPercentage =
      (expense.splitDetails.user1Percentage || 0) + (expense.splitDetails.user2Percentage || 0);

    if (Math.abs(totalPercentage - 100) > 0.1) {
      errors.push(`Split percentages don't add up to 100: ${totalPercentage.toFixed(1)}%`);
    }

    // Check that amounts are non-negative
    if (expense.splitDetails.user1Amount < 0 || expense.splitDetails.user2Amount < 0) {
      errors.push(`Split amounts cannot be negative`);
    }

    // Check that percentages are non-negative
    if (expense.splitDetails.user1Percentage < 0 || expense.splitDetails.user2Percentage < 0) {
      errors.push(`Split percentages cannot be negative`);
    }
  } else {
    errors.push('Missing splitDetails object');
  }

  // Validate date
  const dateValidation = validateDate(expense.date);
  errors.push(...dateValidation.errors);
  warnings.push(...dateValidation.warnings);

  // Validate amount
  const amountValidation = validateAmount(expense.amount);
  errors.push(...amountValidation.errors);
  warnings.push(...amountValidation.warnings);

  // Validate description
  const descValidation = validateDescription(expense.description);
  errors.push(...descValidation.errors);
  warnings.push(...descValidation.warnings);

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate import configuration
 */
export function validateImportConfig(config) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!config.coupleId) errors.push('Missing coupleId');
  if (!config.paidBy) errors.push('Missing paidBy (user ID)');
  if (!config.partnerId) errors.push('Missing partnerId');

  // Validate split config
  if (!config.splitConfig) {
    warnings.push('No split configuration, defaulting to 50/50');
  } else {
    if (!['50/50', 'custom'].includes(config.splitConfig.type)) {
      errors.push(`Invalid split type: ${config.splitConfig.type}`);
    }

    if (config.splitConfig.type === 'custom' && !config.splitConfig.percentage) {
      errors.push('Custom split requires percentage');
    }

    if (
      config.splitConfig.percentage &&
      (config.splitConfig.percentage < 0 || config.splitConfig.percentage > 100)
    ) {
      errors.push('Split percentage must be between 0 and 100');
    }
  }

  // Validate category
  if (!config.defaultCategoryKey) {
    warnings.push('No default category, will use "other"');
  }

  // Validate available categories
  if (!config.availableCategories || config.availableCategories.length === 0) {
    errors.push('No available categories provided');
  }

  return createValidationResult(errors.length === 0, errors, warnings);
}

/**
 * Validate partner existence in Firestore (async)
 *
 * @param {string} partnerId - Partner user ID to validate
 * @param {string} coupleId - Couple ID to validate partner belongs to
 * @returns {Promise<Object>} Validation result
 */
export async function validatePartnerExists(partnerId, coupleId) {
  const errors = [];
  const warnings = [];

  if (!partnerId) {
    errors.push('Missing partnerId');
    return createValidationResult(false, errors, warnings);
  }

  if (!coupleId) {
    errors.push('Missing coupleId for partner validation');
    return createValidationResult(false, errors, warnings);
  }

  try {
    const db = getFirestore();

    // Check if partner user exists
    const partnerRef = doc(db, 'users', partnerId);
    const partnerDoc = await getDoc(partnerRef);

    if (!partnerDoc.exists()) {
      errors.push(`Partner with ID "${partnerId}" does not exist`);
      return createValidationResult(false, errors, warnings);
    }

    // Check if partner belongs to the couple
    const partnerData = partnerDoc.data();
    if (partnerData.coupleId !== coupleId) {
      errors.push(`Partner "${partnerId}" does not belong to couple "${coupleId}"`);
      return createValidationResult(false, errors, warnings);
    }

    // Success
    return createValidationResult(true, errors, warnings);
  } catch (error) {
    // If validation fails due to network/permissions, warn but don't block
    warnings.push(`Could not verify partner existence: ${error.message}`);
    logError('Partner validation failed', error);
    return createValidationResult(true, errors, warnings);
  }
}

/**
 * Validate import configuration with async checks (partner existence)
 *
 * @param {Object} config - Import configuration
 * @returns {Promise<Object>} Validation result
 */
export async function validateImportConfigAsync(config) {
  // First, run synchronous validation
  const syncResult = validateImportConfig(config);

  if (!syncResult.isValid) {
    return syncResult;
  }

  // Then run async validation for partner existence
  const partnerResult = await validatePartnerExists(config.partnerId, config.coupleId);

  // Combine results
  return createValidationResult(
    syncResult.isValid && partnerResult.isValid,
    [...syncResult.errors, ...partnerResult.errors],
    [...syncResult.warnings, ...partnerResult.warnings]
  );
}

export default {
  validateFile,
  validateDate,
  validateAmount,
  validateDescription,
  validateTransaction,
  validateTransactions,
  validateExpense,
  validateImportConfig,
  validateImportConfigAsync,
  validatePartnerExists,
  validateFirestoreFieldName,
  validateFirestoreFieldNames,
};
