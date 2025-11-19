/**
 * Duplicate detection for imported transactions
 * Prevents re-importing the same expenses
 */

/**
 * Calculate similarity score between two strings using Levenshtein distance
 * Returns value between 0 (completely different) and 1 (identical)
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} minSimilarity - Minimum similarity threshold (0-1) for early exit optimization
 * @returns {number} Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1, str2, minSimilarity = 0) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  // Early exit: if length difference is too large, similarity is too low
  const lengthRatio = shorter.length / longer.length;
  if (lengthRatio < minSimilarity) {
    return 0;
  }

  // Calculate max allowed distance for minimum similarity
  const maxDistance = minSimilarity > 0 ? Math.floor(longer.length * (1 - minSimilarity)) : Infinity;

  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase(), maxDistance);

  // If distance exceeds threshold, return 0
  if (distance > maxDistance) {
    return 0;
  }

  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings with early exit optimization
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} maxDistance - Maximum distance to calculate (early exit optimization)
 * @returns {number} Levenshtein distance or maxDistance+1 if exceeded
 */
function levenshteinDistance(str1, str2, maxDistance = Infinity) {
  // Early exit: if length difference is too large, strings are too different
  const lengthDiff = Math.abs(str1.length - str2.length);
  if (lengthDiff > maxDistance) {
    return maxDistance + 1;
  }

  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    let minInRow = Infinity;

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

      minInRow = Math.min(minInRow, matrix[i][j]);
    }

    // Early exit: if minimum distance in this row exceeds maxDistance, abort
    if (minInRow > maxDistance) {
      return maxDistance + 1;
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

  // Description check (with early exit optimization)
  const descSimilarity = calculateStringSimilarity(
    transaction.description,
    existingExpense.description,
    Math.min(descriptionSimilarity, 0.5) // Early exit if below minimum threshold
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
 * Build index for existing expenses by date and amount for fast lookups
 *
 * @param {Array} expenses - Expenses to index
 * @param {Object} options - Index options
 * @param {number} options.dateTolerance - Days tolerance for date bucketing
 * @param {number} options.amountTolerance - Percentage tolerance for amount bucketing
 * @returns {Map} Index map for fast lookups
 */
function buildExpenseIndex(expenses, options = {}) {
  const { dateTolerance = 2, amountTolerance = 1 } = options;
  const index = new Map();

  expenses.forEach(expense => {
    const expenseDate = new Date(expense.date);
    const dateKey = Math.floor(expenseDate.getTime() / (1000 * 60 * 60 * 24)); // Day-level bucket

    // Create buckets for date tolerance range
    for (let dayOffset = -dateTolerance; dayOffset <= dateTolerance; dayOffset++) {
      const bucketDateKey = dateKey + dayOffset;

      // Create buckets for amount tolerance range
      const amountBucket = Math.floor(expense.amount * 100); // Cent-level precision
      const amountToleranceCents = Math.ceil(expense.amount * amountTolerance); // 1% tolerance

      for (let amountOffset = -amountToleranceCents; amountOffset <= amountToleranceCents; amountOffset++) {
        const bucketAmountKey = amountBucket + amountOffset;
        const key = `${bucketDateKey}:${bucketAmountKey}`;

        if (!index.has(key)) {
          index.set(key, []);
        }
        index.get(key).push(expense);
      }
    }
  });

  return index;
}

/**
 * Find candidate expenses from index for a transaction
 *
 * @param {Object} transaction - Transaction to find candidates for
 * @param {Map} expenseIndex - Pre-built expense index
 * @returns {Array} Candidate expenses that match date and amount ranges
 */
function findCandidatesFromIndex(transaction, expenseIndex) {
  const transactionDate = new Date(transaction.date);
  const dateKey = Math.floor(transactionDate.getTime() / (1000 * 60 * 60 * 24));
  const amountKey = Math.floor(transaction.amount * 100);

  const key = `${dateKey}:${amountKey}`;
  const candidates = expenseIndex.get(key) || [];

  // Remove duplicates (same expense may be in multiple buckets)
  const uniqueCandidates = [...new Map(candidates.map(c => [c.id, c])).values()];

  return uniqueCandidates;
}

/**
 * Detect duplicates for multiple transactions (batch-optimized version)
 *
 * @param {Array} transactions - Transactions to check
 * @param {Array} existingExpenses - Existing expenses to compare against
 * @param {Object} options - Detection options
 * @param {number} options.duplicateWindowDays - Days to look back for duplicates (default: 90)
 * @param {boolean} options.useIndexOptimization - Use index-based optimization (default: true)
 * @param {Function} options.onProgress - Progress callback (processed, total)
 * @returns {Array} Array of results for each transaction
 */
export function detectDuplicatesForTransactions(transactions, existingExpenses, options = {}) {
  const {
    duplicateWindowDays = 90,
    useIndexOptimization = true,
    onProgress = null,
    ...detectionOptions
  } = options;

  // Filter existing expenses to specified window for performance
  const windowStartDate = new Date();
  windowStartDate.setDate(windowStartDate.getDate() - duplicateWindowDays);

  const recentExpenses = existingExpenses.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate >= windowStartDate;
  });

  // Build index for fast lookups if optimization is enabled
  const expenseIndex = useIndexOptimization
    ? buildExpenseIndex(recentExpenses, detectionOptions)
    : null;

  const results = transactions.map((transaction, index) => {
    // Get candidate expenses to check
    const candidates = useIndexOptimization && expenseIndex
      ? findCandidatesFromIndex(transaction, expenseIndex)
      : recentExpenses;

    const duplicates = findDuplicates(transaction, candidates, detectionOptions);

    // Report progress if callback provided
    if (onProgress && (index + 1) % 10 === 0) {
      onProgress(index + 1, transactions.length);
    }

    return {
      transaction,
      duplicates,
      hasDuplicates: duplicates.length > 0,
      highConfidenceDuplicate: duplicates.find(d => d.confidence >= 0.8),
    };
  });

  // Final progress callback
  if (onProgress) {
    onProgress(transactions.length, transactions.length);
  }

  return results;
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
