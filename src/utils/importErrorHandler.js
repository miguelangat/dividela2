/**
 * Structured error handling for import operations
 * Provides user-friendly error messages with actionable suggestions
 */

/**
 * Error types for categorization
 */
export const ErrorType = {
  FILE_READ: 'FILE_READ',
  FILE_FORMAT: 'FILE_FORMAT',
  PARSING: 'PARSING',
  VALIDATION: 'VALIDATION',
  FIREBASE: 'FIREBASE',
  NETWORK: 'NETWORK',
  PERMISSION: 'PERMISSION',
  DUPLICATE: 'DUPLICATE',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Severity levels
 */
export const ErrorSeverity = {
  CRITICAL: 'CRITICAL', // Blocks all operations
  ERROR: 'ERROR',       // Operation failed
  WARNING: 'WARNING',   // Operation succeeded with issues
  INFO: 'INFO',         // Informational only
};

/**
 * Create structured error object
 */
export function createStructuredError(type, message, details = {}) {
  return {
    type,
    message,
    severity: details.severity || ErrorSeverity.ERROR,
    userMessage: details.userMessage || message,
    technicalDetails: details.technicalDetails || null,
    suggestions: details.suggestions || [],
    affectedItems: details.affectedItems || [],
    timestamp: new Date().toISOString(),
    recoverable: details.recoverable !== false,
  };
}

/**
 * Classify error from exception
 */
export function classifyError(error) {
  const message = error.message || String(error);
  const lowerMessage = message.toLowerCase();

  // File read errors
  if (lowerMessage.includes('file') && (lowerMessage.includes('read') || lowerMessage.includes('access'))) {
    return {
      type: ErrorType.FILE_READ,
      suggestions: [
        'Ensure the file exists and is accessible',
        'Try selecting the file again',
        'Check if the file is open in another application',
      ],
    };
  }

  // File format errors
  if (lowerMessage.includes('format') || lowerMessage.includes('invalid file') || lowerMessage.includes('unsupported')) {
    return {
      type: ErrorType.FILE_FORMAT,
      suggestions: [
        'Ensure your file is in CSV or PDF format',
        'Try exporting the file again from your bank',
        'Check that the file is not corrupted',
      ],
    };
  }

  // Parsing errors
  if (lowerMessage.includes('parse') || lowerMessage.includes('column') || lowerMessage.includes('header')) {
    return {
      type: ErrorType.PARSING,
      suggestions: [
        'Verify your bank statement has Date, Description, and Amount columns',
        'Ensure the CSV file uses comma or semicolon delimiters',
        'Check if the file has a header row',
      ],
    };
  }

  // Validation errors
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    return {
      type: ErrorType.VALIDATION,
      suggestions: [
        'Review the highlighted transactions for issues',
        'Check for missing or invalid amounts',
        'Verify all dates are in valid format',
      ],
    };
  }

  // Firebase/Firestore errors
  if (lowerMessage.includes('firestore') || lowerMessage.includes('firebase') || lowerMessage.includes('permission')) {
    return {
      type: ErrorType.FIREBASE,
      suggestions: [
        'Check your internet connection',
        'Try signing out and signing back in',
        'Contact support if the issue persists',
      ],
    };
  }

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
    return {
      type: ErrorType.NETWORK,
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Ensure you have a stable connection',
      ],
    };
  }

  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('denied') || lowerMessage.includes('unauthorized')) {
    return {
      type: ErrorType.PERMISSION,
      suggestions: [
        'Ensure you have permission to access this file',
        'Try signing out and signing back in',
        'Check your app permissions in device settings',
      ],
    };
  }

  // Default to unknown
  return {
    type: ErrorType.UNKNOWN,
    suggestions: [
      'Try the operation again',
      'Contact support if the issue persists',
    ],
  };
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error, context = {}) {
  // If already structured, use it
  if (error.type && error.userMessage) {
    return error;
  }

  // Classify the error
  const classification = classifyError(error);

  // Create user-friendly message
  let userMessage = error.message || 'An unexpected error occurred';

  // Enhance message based on context
  if (context.fileName) {
    userMessage = `Error processing ${context.fileName}: ${userMessage}`;
  }

  if (context.transactionCount) {
    userMessage += ` (${context.transactionCount} transactions affected)`;
  }

  return createStructuredError(
    classification.type,
    error.message,
    {
      userMessage,
      technicalDetails: {
        originalError: error.message,
        stack: error.stack,
        context,
      },
      suggestions: classification.suggestions,
      affectedItems: context.affectedItems || [],
    }
  );
}

/**
 * Create error summary for multiple errors
 */
export function createErrorSummary(errors) {
  const byType = {};
  const allSuggestions = new Set();

  errors.forEach(error => {
    const type = error.type || ErrorType.UNKNOWN;
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(error);

    // Collect unique suggestions
    if (error.suggestions) {
      error.suggestions.forEach(s => allSuggestions.add(s));
    }
  });

  return {
    totalErrors: errors.length,
    byType,
    suggestions: Array.from(allSuggestions),
    criticalCount: errors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
    recoverableCount: errors.filter(e => e.recoverable).length,
  };
}

/**
 * Get user-friendly title for error type
 */
export function getErrorTypeTitle(type) {
  const titles = {
    [ErrorType.FILE_READ]: 'File Access Error',
    [ErrorType.FILE_FORMAT]: 'Invalid File Format',
    [ErrorType.PARSING]: 'Parsing Error',
    [ErrorType.VALIDATION]: 'Validation Error',
    [ErrorType.FIREBASE]: 'Database Error',
    [ErrorType.NETWORK]: 'Network Error',
    [ErrorType.PERMISSION]: 'Permission Denied',
    [ErrorType.DUPLICATE]: 'Duplicate Detection',
    [ErrorType.UNKNOWN]: 'Unexpected Error',
  };

  return titles[type] || 'Error';
}

/**
 * Format validation errors from CSV parsing
 */
export function formatValidationErrors(csvErrors, csvWarnings = []) {
  const errors = [];

  // Process errors
  csvErrors.forEach(err => {
    errors.push(createStructuredError(
      ErrorType.VALIDATION,
      `Row ${err.row}: ${err.error}`,
      {
        severity: ErrorSeverity.ERROR,
        userMessage: `Transaction at row ${err.row} has an error: ${err.error}`,
        affectedItems: [{ row: err.row, value: err.value }],
        suggestions: [
          'Fix the data in your bank statement',
          'Or skip this transaction during import',
        ],
      }
    ));
  });

  // Process warnings
  csvWarnings.forEach(warn => {
    errors.push(createStructuredError(
      ErrorType.VALIDATION,
      warn.error || warn.message,
      {
        severity: ErrorSeverity.WARNING,
        userMessage: `Warning: ${warn.error || warn.message}`,
        affectedItems: warn.row ? [{ row: warn.row }] : [],
        suggestions: [],
        recoverable: true,
      }
    ));
  });

  return errors;
}

export default {
  ErrorType,
  ErrorSeverity,
  createStructuredError,
  classifyError,
  formatErrorForUser,
  createErrorSummary,
  getErrorTypeTitle,
  formatValidationErrors,
};
