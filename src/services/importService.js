/**
 * Service for importing expenses from bank statements
 * Handles batch operations, import tracking, resilience, and debugging
 */

import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getExpenses } from './expenseService';
import { parseBankStatement } from '../utils/bankStatementParser';
import { mapTransactionsToExpenses, mapTransactionToExpense, filterTransactions, validateExpenses } from '../utils/transactionMapper';
import { suggestCategoriesForTransactions } from '../utils/categoryAutoMapper';
import { detectDuplicatesForTransactions } from '../utils/duplicateDetector';
import { validateFile, validateTransactions, validateImportConfig } from '../utils/importValidation';
import { startTimer, logParsing, logDuplicateDetection, logCategorySuggestions, logValidation, logBatchProgress, info, error as logError } from '../utils/importDebug';
import { createSession, updateProgress, completeSession, failSession, SESSION_STATES, updateSession } from '../utils/importSession';
import { retryOperation, rollbackImport, CancellationToken, validateImportIntegrity } from '../utils/importResilience';
import { formatErrorForUser, createErrorSummary, formatValidationErrors } from '../utils/importErrorHandler';

const MAX_BATCH_SIZE = 500; // Firestore batch limit
const MAX_IMPORT_SIZE = 1000; // User-defined limit

/**
 * Parse bank statement file with validation and logging
 *
 * @param {string} fileUri - URI of the file to parse
 * @param {Object} fileInfo - File information for validation
 * @returns {Promise<Object>} Parsed result
 */
export async function parseFile(fileUri, fileInfo = null) {
  const timer = startTimer('PARSER', 'File parsing');

  try {
    // Validate file if info provided
    if (fileInfo) {
      const fileValidation = validateFile(fileInfo);
      if (!fileValidation.isValid) {
        const structuredError = formatErrorForUser(
          new Error(`File validation failed: ${fileValidation.errors.join(', ')}`),
          { fileName: fileInfo.name }
        );
        throw structuredError;
      }
      if (fileValidation.hasWarnings) {
        info('PARSER', 'File validation warnings', { warnings: fileValidation.warnings });
      }
    }

    // Parse with retry logic for network-related failures
    // Pass fileType if available from fileInfo to help with blob URL detection
    const options = fileInfo?.type ? { fileType: fileInfo.type } : {};
    const result = await retryOperation(
      () => parseBankStatement(fileUri, options),
      undefined,
      'Parse bank statement'
    );

    if (!result.success) {
      const structuredError = formatErrorForUser(
        new Error(result.error || 'Failed to parse file'),
        { fileName: fileInfo?.name }
      );
      throw structuredError;
    }

    // Log parsing result
    logParsing(result.metadata?.fileType || 'unknown', result);

    // Validate parsed transactions
    if (result.transactions && result.transactions.length > 0) {
      const transactionValidation = validateTransactions(result.transactions);

      if (!transactionValidation.isValid) {
        logError('PARSER', 'Transaction validation failed', {
          errors: transactionValidation.errors.slice(0, 5),
        });

        // Format validation errors with structured error handler
        const formattedErrors = formatValidationErrors(
          transactionValidation.errors,
          transactionValidation.warnings
        );
        result.structuredErrors = formattedErrors;
      }

      if (transactionValidation.hasWarnings) {
        info('PARSER', 'Transaction validation warnings', {
          warnings: transactionValidation.warnings.slice(0, 5),
        });
      }

      // Add validation info to result
      result.validation = transactionValidation;
    }

    timer.end({ transactionCount: result.transactions?.length || 0 });

    return result;
  } catch (error) {
    timer.end({ error: error.message });
    logError('PARSER', 'File parsing failed', { error: error.message });

    // If error is already structured, rethrow it; otherwise, format it
    if (error.type && error.userMessage) {
      throw error;
    }

    const structuredError = formatErrorForUser(error, {
      fileName: fileInfo?.name,
      operation: 'File parsing'
    });
    throw structuredError;
  }
}

/**
 * Process and prepare transactions for import
 *
 * @param {Array} transactions - Parsed transactions
 * @param {Object} config - Configuration for import
 * @param {string} config.coupleId - Couple ID
 * @param {string} config.paidBy - User ID who paid
 * @param {string} config.partnerId - Partner's user ID
 * @param {Object} config.splitConfig - Split configuration
 * @param {string} config.defaultCategoryKey - Default category
 * @param {Array} config.availableCategories - Available categories
 * @param {Object} config.filters - Filters to apply
 * @param {boolean} config.detectDuplicates - Whether to detect duplicates
 * @param {Array} config.existingExpenses - Existing expenses for duplicate detection
 * @param {Array} config.pastTransactions - Past transactions for learning
 * @returns {Promise<Object>} Processed transactions ready for import
 */
export async function processTransactions(transactions, config) {
  try {
    // Validate config
    if (!config.coupleId || !config.paidBy || !config.partnerId) {
      const structuredError = formatErrorForUser(
        new Error('Missing required configuration: coupleId, paidBy, or partnerId'),
        { operation: 'Transaction processing' }
      );
      return {
        success: false,
        error: structuredError,
        expenses: [],
      };
    }

    // Check max import size
    if (transactions.length > MAX_IMPORT_SIZE) {
      const structuredError = formatErrorForUser(
        new Error(`Too many transactions. Maximum ${MAX_IMPORT_SIZE} allowed, found ${transactions.length}`),
        { transactionCount: transactions.length, operation: 'Transaction processing' }
      );
      return {
        success: false,
        error: structuredError,
        expenses: [],
      };
    }

    let processedTransactions = [...transactions];

    // Apply filters
    if (config.filters) {
      processedTransactions = filterTransactions(processedTransactions, config.filters);
    }

    // Auto-suggest categories
    const categorySuggestions = suggestCategoriesForTransactions(
      processedTransactions,
      config.availableCategories || ['food', 'groceries', 'transport', 'home', 'fun', 'other'],
      {},
      config.pastTransactions
    );

    // Map transactions to expenses
    const expenses = mapTransactionsToExpenses(
      processedTransactions,
      {
        coupleId: config.coupleId,
        paidBy: config.paidBy,
        partnerId: config.partnerId,
        splitConfig: config.splitConfig || { type: '50/50' },
        categoryKey: config.defaultCategoryKey || 'other',
      },
      (transaction, index) => {
        // Return suggested category for this transaction
        const suggestion = categorySuggestions[index]?.suggestion;
        return suggestion && suggestion.confidence > 0.3 ? suggestion.categoryKey : null;
      }
    );

    // Validate expenses
    const validation = validateExpenses(expenses);

    if (!validation.allValid) {
      console.warn(`⚠️ ${validation.invalid} invalid expenses found`);
    }

    // Detect duplicates if requested
    let duplicateResults = null;
    if (config.detectDuplicates && config.existingExpenses) {
      duplicateResults = detectDuplicatesForTransactions(
        processedTransactions,
        config.existingExpenses,
        {
          strictDate: false,
          dateTolerance: 2,
          amountTolerance: 1,
          descriptionSimilarity: 0.8,
        }
      );
    }

    return {
      success: true,
      transactions: processedTransactions,
      expenses: validation.validExpenses,
      categorySuggestions,
      duplicateResults,
      validation,
      summary: {
        totalParsed: transactions.length,
        afterFilters: processedTransactions.length,
        valid: validation.valid,
        invalid: validation.invalid,
        duplicates: duplicateResults
          ? duplicateResults.filter(r => r.hasDuplicates).length
          : 0,
      },
    };
  } catch (error) {
    const structuredError = formatErrorForUser(error, {
      transactionCount: transactions.length,
      operation: 'Transaction processing'
    });

    return {
      success: false,
      error: structuredError,
      expenses: [],
    };
  }
}

/**
 * Import specific transactions with category overrides
 *
 * @param {Array} transactions - Transactions to import
 * @param {Object} config - Import configuration
 * @param {Object} categoryOverrides - Category overrides by transaction index
 * @param {Array} selectedIndices - Which transactions to import
 * @param {Array} categorySuggestions - Category suggestions
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Import result
 */
export async function importSelectedTransactions(
  transactions,
  config,
  categoryOverrides,
  selectedIndices,
  categorySuggestions,
  onProgress = null
) {
  try {
    // Filter to only selected transactions
    const selectedTransactions = transactions.filter((_, index) =>
      selectedIndices.includes(index)
    );

    if (selectedTransactions.length === 0) {
      throw new Error('No transactions selected for import');
    }

    // Map transactions to expenses with category overrides applied
    const expenses = selectedTransactions.map((transaction) => {
      const originalIndex = transactions.indexOf(transaction);
      const suggestion = categorySuggestions?.[originalIndex]?.suggestion;
      const overrideCategory = categoryOverrides[originalIndex];

      // Use override if present, otherwise use suggestion, otherwise use default
      const finalCategory = overrideCategory ||
        (suggestion && suggestion.confidence > 0.3 ? suggestion.categoryKey : null) ||
        config.defaultCategoryKey;

      return mapTransactionToExpense(transaction, {
        ...config,
        categoryKey: finalCategory,
      });
    });

    // Validate expenses
    const validation = validateExpenses(expenses);
    if (!validation.allValid) {
      console.warn(`⚠️ ${validation.invalid} invalid expenses found`);
      // Still proceed with valid ones
    }

    // Import valid expenses
    const result = await batchImportExpenses(validation.validExpenses, onProgress);

    return {
      ...result,
      totalRequested: selectedTransactions.length,
      validCount: validation.valid,
      invalidCount: validation.invalid,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      importedCount: 0,
      importedIds: [],
    };
  }
}

/**
 * Import expenses in batches with automatic rollback on failure
 *
 * @param {Array} expenses - Expenses to import
 * @param {Function} onProgress - Progress callback (current, total)
 * @param {Object} options - Import options
 * @param {boolean} options.rollbackOnFailure - Auto-rollback if any batch fails (default: true)
 * @param {string} options.sessionId - Import session ID for tracking
 * @param {CancellationToken} options.cancellationToken - Token to cancel import operation
 * @returns {Promise<Object>} Import result with structured errors
 */
export async function batchImportExpenses(expenses, onProgress = null, options = {}) {
  const { rollbackOnFailure = true, sessionId = null, cancellationToken = null } = options;

  try {
    if (!expenses || expenses.length === 0) {
      const structuredError = formatErrorForUser(
        new Error('No expenses to import'),
        { operation: 'Batch import' }
      );
      throw structuredError;
    }

    // Check for cancellation
    if (cancellationToken?.isCancelled()) {
      const structuredError = formatErrorForUser(
        new Error('Import cancelled by user'),
        { operation: 'Batch import' }
      );
      throw structuredError;
    }

    const totalExpenses = expenses.length;
    let importedCount = 0;
    const importedIds = [];
    const errors = [];
    const batchTimestamp = new Date().toISOString();

    // Split into batches (Firestore limit is 500 operations per batch)
    const batches = [];
    for (let i = 0; i < expenses.length; i += MAX_BATCH_SIZE) {
      batches.push(expenses.slice(i, i + MAX_BATCH_SIZE));
    }

    // Import each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      // Check for cancellation before each batch
      if (cancellationToken?.isCancelled()) {
        console.warn(`🛑 Import cancelled at batch ${batchIndex + 1}/${batches.length}`);

        // Rollback imported batches if cancellation occurs
        if (rollbackOnFailure && importedIds.length > 0) {
          const rollbackResult = await rollbackImport(sessionId || batchTimestamp, importedIds);
          return {
            success: false,
            error: formatErrorForUser(
              new Error('Import cancelled by user'),
              {
                operation: 'Batch import',
                importedCount: importedIds.length,
                rolledBack: rollbackResult.deletedCount
              }
            ),
            importedCount: 0,
            totalExpenses,
            importedIds: [],
            cancelled: true,
            rolledBack: true,
            rollbackResult,
            summary: {
              requested: totalExpenses,
              successful: 0,
              failed: totalExpenses,
              batches: batches.length,
              errors: 0,
              rolledBack: rollbackResult.deletedCount,
            },
          };
        }
      }

      const batchExpenses = batches[batchIndex];

      try {
        const batch = writeBatch(db);

        batchExpenses.forEach((expense) => {
          const expenseRef = doc(collection(db, 'expenses'));
          batch.set(expenseRef, {
            ...expense,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // Add session tracking for rollback capability
            importMetadata: {
              ...expense.importMetadata,
              sessionId: sessionId || batchTimestamp,
              batchIndex,
              importedAt: batchTimestamp,
            },
          });
          importedIds.push(expenseRef.id);
        });

        await batch.commit();

        importedCount += batchExpenses.length;

        // Report progress
        if (onProgress) {
          onProgress(importedCount, totalExpenses);
        }

        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} imported (${batchExpenses.length} expenses)`);
      } catch (error) {
        console.error(`❌ Error importing batch ${batchIndex + 1}:`, error);

        const structuredBatchError = formatErrorForUser(error, {
          operation: 'Batch import',
          batch: batchIndex + 1,
          totalBatches: batches.length,
          batchSize: batchExpenses.length
        });

        errors.push({
          batch: batchIndex + 1,
          error: structuredBatchError,
          count: batchExpenses.length,
        });

        // ROLLBACK: If rollbackOnFailure is enabled, rollback all previously imported batches
        if (rollbackOnFailure && importedIds.length > 0) {
          console.warn(`🔄 Rolling back ${importedIds.length} previously imported expenses due to batch failure...`);

          try {
            const rollbackResult = await rollbackImport(sessionId || batchTimestamp, importedIds);

            if (rollbackResult.success) {
              console.log(`✅ Successfully rolled back ${rollbackResult.deletedCount} expenses`);
            } else {
              console.error(`❌ Rollback partially failed: ${rollbackResult.message}`);
            }

            // Return failure with rollback info
            const rollbackError = formatErrorForUser(
              new Error(`Batch ${batchIndex + 1} failed: ${error.message}. All ${rollbackResult.deletedCount} previously imported expenses have been rolled back.`),
              {
                operation: 'Batch import with rollback',
                batch: batchIndex + 1,
                importedCount: importedIds.length,
                rolledBackCount: rollbackResult.deletedCount
              }
            );

            return {
              success: false,
              error: rollbackError,
              importedCount: 0,
              totalExpenses,
              importedIds: [],
              errors,
              rolledBack: true,
              rollbackResult,
              summary: {
                requested: totalExpenses,
                successful: 0,
                failed: totalExpenses,
                batches: batches.length,
                errors: errors.length,
                rolledBack: rollbackResult.deletedCount,
              },
            };
          } catch (rollbackError) {
            console.error('❌ Critical: Rollback failed:', rollbackError);

            // Return critical error - partial data left in database
            const criticalError = formatErrorForUser(
              new Error(`Batch ${batchIndex + 1} failed and rollback also failed. Database may be in inconsistent state. Please contact support with session ID: ${sessionId || batchTimestamp}`),
              {
                operation: 'Critical batch import failure',
                batch: batchIndex + 1,
                importedCount: importedIds.length,
                sessionId: sessionId || batchTimestamp
              }
            );

            return {
              success: false,
              error: criticalError,
              importedCount: importedIds.length,
              totalExpenses,
              importedIds,
              errors: [...errors, { error: formatErrorForUser(rollbackError, { operation: 'Rollback' }), critical: true }],
              rolledBack: false,
              rollbackError: rollbackError.message,
              summary: {
                requested: totalExpenses,
                successful: importedIds.length,
                failed: totalExpenses - importedIds.length,
                batches: batches.length,
                errors: errors.length,
                rolledBack: 0,
              },
            };
          }
        }

        // If rollbackOnFailure is disabled, stop import but don't rollback
        break;
      }
    }

    const success = importedCount > 0 && errors.length === 0;

    return {
      success,
      importedCount,
      totalExpenses,
      importedIds,
      errors,
      rolledBack: false,
      summary: {
        requested: totalExpenses,
        successful: importedCount,
        failed: totalExpenses - importedCount,
        batches: batches.length,
        errors: errors.length,
        rolledBack: 0,
      },
    };
  } catch (error) {
    // Format the final error with structured error handler
    const structuredError = error.type && error.userMessage
      ? error
      : formatErrorForUser(error, {
          operation: 'Batch import',
          expenseCount: expenses?.length || 0
        });

    return {
      success: false,
      error: structuredError,
      importedCount: 0,
      totalExpenses: expenses?.length || 0,
      importedIds: [],
      errors: [{ error: structuredError }],
      rolledBack: false,
    };
  }
}

/**
 * Complete import workflow
 * Parse file → Process → Import
 *
 * @param {string} fileUri - URI of file to import
 * @param {Object} config - Import configuration
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Complete import result
 */
export async function importFromFile(fileUri, config, onProgress = null, fileInfo = null) {
  try {
    // Step 1: Parse file
    if (onProgress) onProgress({ step: 'parsing', progress: 0 });

    const parseResult = await parseFile(fileUri, fileInfo);

    if (!parseResult.success) {
      throw new Error(parseResult.error);
    }

    if (onProgress) onProgress({ step: 'parsing', progress: 100 });

    // Step 2: Fetch existing expenses for duplicate detection
    let existingExpenses = [];
    if (config.detectDuplicates !== false) {
      if (onProgress) onProgress({ step: 'checking_duplicates', progress: 0 });

      try {
        existingExpenses = await getExpenses(config.coupleId);
      } catch (error) {
        console.warn('Could not fetch existing expenses for duplicate detection:', error);
      }

      if (onProgress) onProgress({ step: 'checking_duplicates', progress: 100 });
    }

    // Step 3: Process transactions
    if (onProgress) onProgress({ step: 'processing', progress: 0 });

    const processResult = await processTransactions(parseResult.transactions, {
      ...config,
      existingExpenses,
      detectDuplicates: config.detectDuplicates !== false,
    });

    if (!processResult.success) {
      throw new Error(processResult.error);
    }

    if (onProgress) onProgress({ step: 'processing', progress: 100 });

    // Step 4: Import expenses
    if (onProgress) onProgress({ step: 'importing', progress: 0 });

    const importResult = await batchImportExpenses(
      processResult.expenses,
      (current, total) => {
        if (onProgress) {
          onProgress({
            step: 'importing',
            progress: Math.round((current / total) * 100),
            current,
            total,
          });
        }
      }
    );

    if (onProgress) onProgress({ step: 'importing', progress: 100 });

    return {
      success: importResult.success,
      parseResult,
      processResult,
      importResult,
      summary: {
        fileName: parseResult.metadata.fileName,
        fileType: parseResult.metadata.fileType,
        totalTransactions: parseResult.transactions.length,
        imported: importResult.importedCount,
        duplicates: processResult.summary.duplicates,
        errors: importResult.errors.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      summary: {
        fileName: 'Unknown',
        totalTransactions: 0,
        imported: 0,
        duplicates: 0,
        errors: 1,
      },
    };
  }
}

/**
 * Preview import without actually importing
 * Useful for showing user what will be imported
 *
 * @param {string} fileUri - URI of file to preview
 * @param {Object} config - Preview configuration
 * @returns {Promise<Object>} Preview result
 */
export async function previewImport(fileUri, config, fileInfo = null) {
  try {
    // Parse file - pass fileInfo for validation and type detection
    const parseResult = await parseFile(fileUri, fileInfo);

    if (!parseResult.success) {
      throw new Error(parseResult.error);
    }

    // Fetch existing expenses for duplicate detection
    let existingExpenses = [];
    if (config.detectDuplicates !== false && config.coupleId) {
      try {
        existingExpenses = await getExpenses(config.coupleId);
      } catch (error) {
        console.warn('Could not fetch existing expenses:', error);
      }
    }

    // Process transactions
    const processResult = await processTransactions(parseResult.transactions, {
      ...config,
      existingExpenses,
      detectDuplicates: config.detectDuplicates !== false,
    });

    return {
      success: true,
      transactions: parseResult.transactions,
      metadata: parseResult.metadata,
      processedExpenses: processResult.expenses,
      categorySuggestions: processResult.categorySuggestions,
      duplicateResults: processResult.duplicateResults,
      summary: processResult.summary,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      transactions: [],
      processedExpenses: [],
    };
  }
}

export default {
  parseFile,
  processTransactions,
  batchImportExpenses,
  importSelectedTransactions,
  importFromFile,
  previewImport,
  MAX_IMPORT_SIZE,
  MAX_BATCH_SIZE,
};
