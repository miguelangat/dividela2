/**
 * Service for importing expenses from bank statements
 * Handles batch operations and import tracking
 */

import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getExpenses } from './expenseService';
import { parseBankStatement } from '../utils/bankStatementParser';
import { mapTransactionsToExpenses, filterTransactions, validateExpenses } from '../utils/transactionMapper';
import { suggestCategoriesForTransactions } from '../utils/categoryAutoMapper';
import { detectDuplicatesForTransactions } from '../utils/duplicateDetector';

const MAX_BATCH_SIZE = 500; // Firestore batch limit
const MAX_IMPORT_SIZE = 1000; // User-defined limit

/**
 * Parse bank statement file
 *
 * @param {string} fileUri - URI of the file to parse
 * @returns {Promise<Object>} Parsed result
 */
export async function parseFile(fileUri) {
  try {
    const result = await parseBankStatement(fileUri);

    if (!result.success) {
      throw new Error(result.error || 'Failed to parse file');
    }

    return result;
  } catch (error) {
    throw new Error(`File parsing failed: ${error.message}`);
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
      throw new Error('Missing required configuration: coupleId, paidBy, or partnerId');
    }

    // Check max import size
    if (transactions.length > MAX_IMPORT_SIZE) {
      throw new Error(`Too many transactions. Maximum ${MAX_IMPORT_SIZE} allowed, found ${transactions.length}`);
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
    return {
      success: false,
      error: error.message,
      expenses: [],
    };
  }
}

/**
 * Import expenses in batches
 *
 * @param {Array} expenses - Expenses to import
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Object>} Import result
 */
export async function batchImportExpenses(expenses, onProgress = null) {
  try {
    if (!expenses || expenses.length === 0) {
      throw new Error('No expenses to import');
    }

    const totalExpenses = expenses.length;
    let importedCount = 0;
    const importedIds = [];
    const errors = [];

    // Split into batches (Firestore limit is 500 operations per batch)
    const batches = [];
    for (let i = 0; i < expenses.length; i += MAX_BATCH_SIZE) {
      batches.push(expenses.slice(i, i + MAX_BATCH_SIZE));
    }

    // Import each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batchExpenses = batches[batchIndex];

      try {
        const batch = writeBatch(db);

        batchExpenses.forEach((expense) => {
          const expenseRef = doc(collection(db, 'expenses'));
          batch.set(expenseRef, {
            ...expense,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
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
        errors.push({
          batch: batchIndex + 1,
          error: error.message,
          count: batchExpenses.length,
        });

        // Continue with next batch instead of failing completely
      }
    }

    const success = importedCount > 0;

    return {
      success,
      importedCount,
      totalExpenses,
      importedIds,
      errors,
      summary: {
        requested: totalExpenses,
        successful: importedCount,
        failed: totalExpenses - importedCount,
        batches: batches.length,
        errors: errors.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      importedCount: 0,
      totalExpenses: expenses.length,
      importedIds: [],
      errors: [{ error: error.message }],
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
export async function importFromFile(fileUri, config, onProgress = null) {
  try {
    // Step 1: Parse file
    if (onProgress) onProgress({ step: 'parsing', progress: 0 });

    const parseResult = await parseFile(fileUri);

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
export async function previewImport(fileUri, config) {
  try {
    // Parse file
    const parseResult = await parseFile(fileUri);

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
  importFromFile,
  previewImport,
  MAX_IMPORT_SIZE,
  MAX_BATCH_SIZE,
};
