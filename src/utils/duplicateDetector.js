/**
 * Duplicate detection for imported transactions
 * Prevents re-importing the same expenses
 */

/**
 * Calculate similarity score between two strings using Levenshtein distance
 * Returns value between 0 (completely different) and 1 (identical)
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if two dates are within N days of each other
 */
function isWithinDays(date1, date2, days) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
}

/**
 * Detect if a transaction is a duplicate of an existing expense
 *
 * @param {Object} transaction - New transaction to check
 * @param {Object} existingExpense - Existing expense to compare against
 * @param {Object} options - Detection options
 * @param {boolean} options.strictDate - Require exact date match (default: false)
 * @param {number} options.dateTolerance - Days tolerance for date matching (default: 2)
 * @param {number} options.amountTolerance - Percentage tolerance for amount (default: 1)
 * @param {number} options.descriptionSimilarity - Required similarity 0-1 (default: 0.8)
 * @returns {Object} Detection result
 */
export function isDuplicate(transaction, existingExpense, options = {}) {
  const {
    strictDate = false,
    dateTolerance = 2,
    amountTolerance = 1, // 1% tolerance
    descriptionSimilarity = 0.8,
  } = options;

  const result = {
    isDuplicate: false,
    confidence: 0,
    reasons: [],
  };

  // Date check
  const transactionDate = new Date(transaction.date);
  const expenseDate = new Date(existingExpense.date);

  let dateMatch = false;

  if (strictDate) {
    dateMatch = isSameDay(transactionDate, expenseDate);
  } else {
    dateMatch = isWithinDays(transactionDate, expenseDate, dateTolerance);
  }

  if (!dateMatch) {
    return result; // Not a duplicate if dates don't match
  }

  result.reasons.push('Date matches');
  result.confidence += 0.3;

  // Amount check
  const amountDiff = Math.abs(transaction.amount - existingExpense.amount);
  const amountPercentDiff = (amountDiff / existingExpense.amount) * 100;

  const amountMatch = amountPercentDiff <= amountTolerance;

  if (amountMatch) {
    result.reasons.push('Amount matches');
    result.confidence += 0.4;
  } else {
    return result; // Not a duplicate if amounts don't match closely
  }

  // Description check
  const descSimilarity = calculateStringSimilarity(
    transaction.description,
    existingExpense.description
  );

  if (descSimilarity >= descriptionSimilarity) {
    result.reasons.push(`Description similar (${(descSimilarity * 100).toFixed(0)}%)`);
    result.confidence += 0.3;
    result.isDuplicate = true;
  } else if (descSimilarity >= 0.5) {
    result.reasons.push(`Description partially similar (${(descSimilarity * 100).toFixed(0)}%)`);
    result.confidence += 0.15;
    // Still might be a duplicate if date and amount match exactly
    if (isSameDay(transactionDate, expenseDate) && amountDiff === 0) {
      result.isDuplicate = true;
    }
  }

  return result;
}

/**
 * Find duplicates for a transaction in existing expenses
 *
 * @param {Object} transaction - Transaction to check
 * @param {Array} existingExpenses - Array of existing expenses
 * @param {Object} options - Detection options
 * @returns {Array} Array of potential duplicates with confidence scores
 */
export function findDuplicates(transaction, existingExpenses, options = {}) {
  const duplicates = [];

  for (const expense of existingExpenses) {
    const result = isDuplicate(transaction, expense, options);

    if (result.isDuplicate || result.confidence > 0.5) {
      duplicates.push({
        expense,
        ...result,
      });
    }
  }

  // Sort by confidence (highest first)
  duplicates.sort((a, b) => b.confidence - a.confidence);

  return duplicates;
}

/**
 * Detect duplicates for multiple transactions
 *
 * @param {Array} transactions - Transactions to check
 * @param {Array} existingExpenses - Existing expenses to compare against
 * @param {Object} options - Detection options
 * @returns {Array} Array of results for each transaction
 */
export function detectDuplicatesForTransactions(transactions, existingExpenses, options = {}) {
  // Filter existing expenses to last 90 days for performance
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentExpenses = existingExpenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate >= ninetyDaysAgo;
  });

  return transactions.map(transaction => {
    const duplicates = findDuplicates(transaction, recentExpenses, options);

    return {
      transaction,
      duplicates,
      hasDuplicates: duplicates.length > 0,
      highConfidenceDuplicate: duplicates.find(d => d.confidence >= 0.8),
    };
  });
}

/**
 * Get duplicate detection summary
 *
 * @param {Array} detectionResults - Results from detectDuplicatesForTransactions
 * @returns {Object} Summary statistics
 */
export function getDuplicateSummary(detectionResults) {
  const summary = {
    total: detectionResults.length,
    noDuplicates: 0,
    possibleDuplicates: 0,
    likelyDuplicates: 0,
    definitelyDuplicates: 0,
  };

  detectionResults.forEach(result => {
    if (!result.hasDuplicates) {
      summary.noDuplicates++;
    } else if (result.highConfidenceDuplicate) {
      if (result.highConfidenceDuplicate.confidence >= 0.95) {
        summary.definitelyDuplicates++;
      } else {
        summary.likelyDuplicates++;
      }
    } else {
      summary.possibleDuplicates++;
    }
  });

  return summary;
}

/**
 * Filter out transactions that are definite duplicates
 *
 * @param {Array} detectionResults - Results from detectDuplicatesForTransactions
 * @param {number} confidenceThreshold - Confidence threshold for filtering (default: 0.95)
 * @returns {Object} Filtered transactions and duplicates
 */
export function filterOutDuplicates(detectionResults, confidenceThreshold = 0.95) {
  const unique = [];
  const duplicates = [];

  detectionResults.forEach(result => {
    if (result.highConfidenceDuplicate && result.highConfidenceDuplicate.confidence >= confidenceThreshold) {
      duplicates.push(result);
    } else {
      unique.push(result);
    }
  });

  return {
    unique: unique.map(r => r.transaction),
    duplicates: duplicates.map(r => ({
      transaction: r.transaction,
      matchedExpense: r.highConfidenceDuplicate.expense,
      confidence: r.highConfidenceDuplicate.confidence,
    })),
  };
}

/**
 * Mark transactions for review if they might be duplicates
 *
 * @param {Array} detectionResults - Results from detectDuplicatesForTransactions
 * @returns {Array} Transactions with duplicate flags
 */
export function markDuplicatesForReview(detectionResults) {
  return detectionResults.map(result => ({
    ...result.transaction,
    duplicateStatus: {
      hasDuplicates: result.hasDuplicates,
      duplicateCount: result.duplicates.length,
      highestConfidence: result.duplicates[0]?.confidence || 0,
      needsReview: result.hasDuplicates && result.duplicates[0]?.confidence < 0.95,
      autoSkip: result.highConfidenceDuplicate?.confidence >= 0.95,
      matchedExpenses: result.duplicates.map(d => ({
        id: d.expense.id,
        description: d.expense.description,
        amount: d.expense.amount,
        date: d.expense.date,
        confidence: d.confidence,
        reasons: d.reasons,
      })),
    },
  }));
}

export default {
  isDuplicate,
  findDuplicates,
  detectDuplicatesForTransactions,
  getDuplicateSummary,
  filterOutDuplicates,
  markDuplicatesForReview,
};
