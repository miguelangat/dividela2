/**
 * Resilience utilities for import operations
 * Provides retry logic, rollback capability, and error recovery
 */

import { collection, writeBatch, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { warn, error as logError, info } from './importDebug';

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'network',
    'timeout',
    'unavailable',
    'deadline-exceeded',
    'resource-exhausted',
  ],
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error, config = DEFAULT_RETRY_CONFIG) {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';

  return config.retryableErrors.some(
    retryable =>
      errorMessage.includes(retryable) || errorCode.includes(retryable)
  );
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt, config = DEFAULT_RETRY_CONFIG) {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;

  return delay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param {Function} operation - Async function to retry
 * @param {Object} config - Retry configuration
 * @param {string} operationName - Name for logging
 * @returns {Promise} Result of the operation
 */
export async function retryOperation(
  operation,
  config = DEFAULT_RETRY_CONFIG,
  operationName = 'operation'
) {
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateDelay(attempt - 1, config);
        info('RETRY', `Retrying ${operationName} (attempt ${attempt}/${config.maxRetries}) after ${Math.round(delay)}ms`);
        await sleep(delay);
      }

      const result = await operation();


      if (attempt > 0) {
        info('RETRY', `${operationName} succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error, config)) {
        warn('RETRY', `${operationName} failed with non-retryable error`, { error: error.message });
        throw error;
      }

      if (attempt === config.maxRetries) {
        logError('RETRY', `${operationName} failed after ${config.maxRetries} retries`, {
          error: error.message,
        });
        throw new Error(`${operationName} failed after ${config.maxRetries} retries: ${error.message}`);
      }

      warn('RETRY', `${operationName} failed (attempt ${attempt + 1}/${config.maxRetries + 1})`, {
        error: error.message,
      });
    }
  }

  throw lastError;
}

/**
 * Rollback imported expenses by session ID
 *
 * @param {string} sessionId - Import session ID
 * @param {Array<string>} importedIds - IDs of imported expenses
 * @returns {Promise<Object>} Rollback result
 */
export async function rollbackImport(sessionId, importedIds) {
  if (!importedIds || importedIds.length === 0) {
    return {
      success: true,
      deletedCount: 0,
      message: 'No expenses to rollback',
    };
  }

  info('ROLLBACK', `Starting rollback for session ${sessionId}`, {
    expenseCount: importedIds.length,
  });

  let deletedCount = 0;
  const errors = [];

  try {
    // Delete in batches (Firestore limit is 500 operations per batch)
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < importedIds.length; i += batchSize) {
      batches.push(importedIds.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batchIds = batches[batchIndex];

      try {
        const batch = writeBatch(db);

        batchIds.forEach(expenseId => {
          const expenseRef = doc(db, 'expenses', expenseId);
          batch.delete(expenseRef);
        });

        await batch.commit();

        deletedCount += batchIds.length;

        info('ROLLBACK', `Deleted batch ${batchIndex + 1}/${batches.length}`, {
          count: batchIds.length,
        });
      } catch (error) {
        logError('ROLLBACK', `Failed to delete batch ${batchIndex + 1}`, {
          error: error.message,
        });
        errors.push({
          batch: batchIndex + 1,
          error: error.message,
          count: batchIds.length,
        });
      }
    }

    const success = deletedCount === importedIds.length;

    if (success) {
      info('ROLLBACK', `Successfully rolled back all ${deletedCount} expenses`);
    } else {
      warn('ROLLBACK', `Partially rolled back: ${deletedCount}/${importedIds.length} expenses deleted`, {
        errors,
      });
    }

    return {
      success,
      deletedCount,
      totalRequested: importedIds.length,
      errors,
      message: success
        ? `Rolled back ${deletedCount} expenses`
        : `Partially rolled back: ${deletedCount}/${importedIds.length} expenses deleted`,
    };
  } catch (error) {
    logError('ROLLBACK', 'Rollback failed', { error: error.message });
    return {
      success: false,
      deletedCount,
      totalRequested: importedIds.length,
      errors: [{ error: error.message }],
      message: `Rollback failed: ${error.message}`,
    };
  }
}

/**
 * Find and delete expenses by import metadata
 *
 * @param {string} coupleId - Couple ID
 * @param {string} importTimestamp - Import timestamp to match
 * @returns {Promise<Object>} Deletion result
 */
export async function rollbackByTimestamp(coupleId, importTimestamp) {
  try {
    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef,
      where('coupleId', '==', coupleId),
      where('importMetadata.importedAt', '==', importTimestamp)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No expenses found for this import',
      };
    }

    const expenseIds = snapshot.docs.map(doc => doc.id);

    return await rollbackImport('timestamp_rollback', expenseIds);
  } catch (error) {
    logError('ROLLBACK', 'Failed to rollback by timestamp', { error: error.message });
    return {
      success: false,
      deletedCount: 0,
      errors: [{ error: error.message }],
      message: `Rollback failed: ${error.message}`,
    };
  }
}

/**
 * Cancellation token for long-running operations
 */
export class CancellationToken {
  constructor() {
    this.cancelled = false;
    this.reason = null;
  }

  cancel(reason = 'Operation cancelled') {
    this.cancelled = true;
    this.reason = reason;
    info('CANCELLATION', reason);
  }

  throwIfCancelled() {
    if (this.cancelled) {
      throw new Error(this.reason || 'Operation cancelled');
    }
  }

  isCancelled() {
    return this.cancelled;
  }
}

/**
 * Create a cancellable operation wrapper
 *
 * @param {Function} operation - Async operation to wrap
 * @param {CancellationToken} token - Cancellation token
 * @returns {Promise} Result of operation
 */
export async function cancellable(operation, token) {
  token.throwIfCancelled();

  const result = await operation();

  token.throwIfCancelled();

  return result;
}

/**
 * Validate data integrity after import
 *
 * @param {Array} importedIds - IDs of imported expenses
 * @param {string} coupleId - Couple ID to verify
 * @returns {Promise<Object>} Validation result
 */
export async function validateImportIntegrity(importedIds, coupleId) {
  try {
    const validationErrors = [];

    // Sample check: verify a few random expenses exist
    const sampleSize = Math.min(5, importedIds.length);
    const sampleIds = [];

    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * importedIds.length);
      sampleIds.push(importedIds[randomIndex]);
    }

    for (const expenseId of sampleIds) {
      try {
        const expenseRef = doc(db, 'expenses', expenseId);
        const expenseDoc = await expenseRef.get();

        if (!expenseDoc.exists()) {
          validationErrors.push(`Expense ${expenseId} not found`);
        } else {
          const data = expenseDoc.data();
          if (data.coupleId !== coupleId) {
            validationErrors.push(`Expense ${expenseId} has wrong coupleId`);
          }
        }
      } catch (error) {
        validationErrors.push(`Failed to verify expense ${expenseId}: ${error.message}`);
      }
    }

    const isValid = validationErrors.length === 0;

    if (isValid) {
      info('INTEGRITY', 'Import integrity validation passed');
    } else {
      warn('INTEGRITY', 'Import integrity validation found issues', {
        errors: validationErrors,
      });
    }

    return {
      isValid,
      errors: validationErrors,
      sampleSize,
      totalCount: importedIds.length,
    };
  } catch (error) {
    logError('INTEGRITY', 'Integrity validation failed', { error: error.message });
    return {
      isValid: false,
      errors: [error.message],
      sampleSize: 0,
      totalCount: importedIds.length,
    };
  }
}

export default {
  retryOperation,
  rollbackImport,
  rollbackByTimestamp,
  CancellationToken,
  cancellable,
  validateImportIntegrity,
  isRetryableError,
  DEFAULT_RETRY_CONFIG,
};
