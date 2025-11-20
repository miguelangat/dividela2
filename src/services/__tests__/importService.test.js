/**
 * Tests for Import Service
 * Critical business logic for bank statement import functionality
 */

import { jest } from '@jest/globals';
import {
  parseFile,
  processTransactions,
  importExpenses,
  cancelImport,
} from '../importService';

import {
  createMockTransaction,
  createMockTransactions,
  createMockExpense,
  createMockExpenses,
  createMockFileInfo,
  mockFirestore,
} from '../../__tests__/utils/testHelpers';

// Mock dependencies
jest.mock('../expenseService');
jest.mock('../../utils/bankStatementParser');
jest.mock('../../utils/transactionMapper');
jest.mock('../../utils/categoryAutoMapper');
jest.mock('../../utils/duplicateDetector');
jest.mock('../../utils/importValidation');
jest.mock('../../utils/importDebug');
jest.mock('../../utils/importSession');
jest.mock('../../utils/importResilience');
jest.mock('firebase/firestore');

import { getExpenses } from '../expenseService';
import { parseBankStatement } from '../../utils/bankStatementParser';
import {
  mapTransactionsToExpenses,
  validateExpenses,
} from '../../utils/transactionMapper';
import { suggestCategoriesForTransactions } from '../../utils/categoryAutoMapper';
import { detectDuplicatesForTransactions } from '../../utils/duplicateDetector';
import { validateFile, validateTransactions } from '../../utils/importValidation';
import {
  startTimer,
  logParsing,
  logDuplicateDetection,
  logCategorySuggestions,
  logValidation,
  logBatchProgress,
  info,
  error as logError,
} from '../../utils/importDebug';
import {
  createSession,
  updateProgress,
  completeSession,
  failSession,
  updateSession,
} from '../../utils/importSession';
import {
  retryOperation,
  rollbackImport,
  CancellationToken,
  validateImportIntegrity,
} from '../../utils/importResilience';
import { writeBatch, doc, collection } from 'firebase/firestore';

describe('Import Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseFile', () => {
    it('should parse valid CSV file successfully', async () => {
      const mockFileInfo = createMockFileInfo();
      const mockTransactions = createMockTransactions(5);

      validateFile.mockReturnValue({ isValid: true, errors: [], warnings: [] });
      startTimer.mockReturnValue({ stop: jest.fn() });
      retryOperation.mockImplementation((fn) => fn());
      parseBankStatement.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        metadata: { totalRows: 5, fileName: 'statement.csv' },
      });

      const result = await parseFile('file:///statement.csv', mockFileInfo);

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(5);
      expect(validateFile).toHaveBeenCalledWith(mockFileInfo);
      expect(parseBankStatement).toHaveBeenCalled();
    });

    it('should reject invalid file', async () => {
      const mockFileInfo = createMockFileInfo({ size: 0 });

      validateFile.mockReturnValue({
        isValid: false,
        errors: ['File is empty'],
        warnings: [],
      });

      await expect(parseFile('file:///empty.csv', mockFileInfo)).rejects.toThrow(
        'File validation failed'
      );
    });

    it('should log warnings for suspicious files', async () => {
      const mockFileInfo = createMockFileInfo({ size: 50 });
      const mockTransactions = createMockTransactions(1);

      validateFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['File is very small'],
      });
      startTimer.mockReturnValue({ stop: jest.fn() });
      retryOperation.mockImplementation((fn) => fn());
      parseBankStatement.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        metadata: {},
      });

      await parseFile('file:///tiny.csv', mockFileInfo);

      expect(info).toHaveBeenCalledWith(
        'PARSER',
        'File validation warnings',
        expect.any(Object)
      );
    });

    it('should retry on transient failures', async () => {
      const mockFileInfo = createMockFileInfo();
      const mockTransactions = createMockTransactions(2);

      validateFile.mockReturnValue({ isValid: true, errors: [], warnings: [] });
      startTimer.mockReturnValue({ stop: jest.fn() });

      let attemptCount = 0;
      retryOperation.mockImplementation(async (fn) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network error');
        }
        return fn();
      });

      parseBankStatement.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        metadata: {},
      });

      const result = await parseFile('file:///statement.csv', mockFileInfo);

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(2);
    });

    it('should handle parsing errors', async () => {
      const mockFileInfo = createMockFileInfo();

      validateFile.mockReturnValue({ isValid: true, errors: [], warnings: [] });
      startTimer.mockReturnValue({ stop: jest.fn() });
      retryOperation.mockImplementation((fn) => fn());
      parseBankStatement.mockResolvedValue({
        success: false,
        error: 'Invalid CSV format',
      });

      await expect(parseFile('file:///bad.csv', mockFileInfo)).rejects.toThrow(
        'Invalid CSV format'
      );
    });
  });

  describe('processTransactions', () => {
    it('should process transactions with all checks', async () => {
      const mockTransactions = createMockTransactions(3);
      const mockExistingExpenses = createMockExpenses(2);
      const mockCategories = ['food', 'groceries', 'transport'];

      getExpenses.mockResolvedValue(mockExistingExpenses);
      validateTransactions.mockReturnValue({
        isValid: true,
        validCount: 3,
        invalidCount: 0,
        warnings: [],
      });
      detectDuplicatesForTransactions.mockReturnValue([
        { hasDuplicates: false },
        { hasDuplicates: false },
        { hasDuplicates: true, highConfidenceDuplicate: { confidence: 0.95 } },
      ]);
      suggestCategoriesForTransactions.mockReturnValue([
        { suggestion: { categoryKey: 'food', confidence: 0.8 } },
        { suggestion: { categoryKey: 'groceries', confidence: 0.9 } },
        { suggestion: { categoryKey: 'transport', confidence: 0.7 } },
      ]);

      const result = await processTransactions(
        mockTransactions,
        'user-1',
        mockCategories,
        true
      );

      expect(result.success).toBe(true);
      expect(result.validTransactions).toHaveLength(3);
      expect(result.suggestions).toHaveLength(3);
      expect(result.duplicateResults).toHaveLength(3);
      expect(getExpenses).toHaveBeenCalledWith('user-1');
    });

    it('should skip duplicate detection when disabled', async () => {
      const mockTransactions = createMockTransactions(2);
      const mockCategories = ['food'];

      validateTransactions.mockReturnValue({
        isValid: true,
        validCount: 2,
        invalidCount: 0,
        warnings: [],
      });
      suggestCategoriesForTransactions.mockReturnValue([
        { suggestion: { categoryKey: 'food', confidence: 0.8 } },
        { suggestion: { categoryKey: 'food', confidence: 0.7 } },
      ]);

      const result = await processTransactions(
        mockTransactions,
        'user-1',
        mockCategories,
        false // detectDuplicates = false
      );

      expect(result.success).toBe(true);
      expect(detectDuplicatesForTransactions).not.toHaveBeenCalled();
      expect(result.duplicateResults).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      const mockTransactions = createMockTransactions(3);

      validateTransactions.mockReturnValue({
        isValid: false,
        errors: ['Invalid transaction data'],
        validCount: 1,
        invalidCount: 2,
      });

      await expect(
        processTransactions(mockTransactions, 'user-1', ['food'], true)
      ).rejects.toThrow('Invalid transaction data');
    });

    it('should log all processing steps', async () => {
      const mockTransactions = createMockTransactions(1);

      validateTransactions.mockReturnValue({
        isValid: true,
        validCount: 1,
        invalidCount: 0,
        warnings: [],
      });
      suggestCategoriesForTransactions.mockReturnValue([
        { suggestion: { categoryKey: 'food', confidence: 0.8 } },
      ]);

      await processTransactions(mockTransactions, 'user-1', ['food'], false);

      expect(logValidation).toHaveBeenCalled();
      expect(logCategorySuggestions).toHaveBeenCalled();
    });
  });

  describe('importExpenses', () => {
    it('should import expenses successfully', async () => {
      const mockTransactions = createMockTransactions(3);
      const mockConfig = {
        paidBy: 'user-1',
        splitMethod: '50/50',
        defaultCategory: 'other',
      };
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      writeBatch.mockReturnValue(mockBatch);
      doc.mockReturnValue({ id: 'expense-123' });
      collection.mockReturnValue({});
      mapTransactionsToExpenses.mockReturnValue([
        createMockExpense(),
        createMockExpense(),
        createMockExpense(),
      ]);
      validateExpenses.mockReturnValue({ isValid: true, errors: [] });
      createSession.mockResolvedValue('session-123');
      validateImportIntegrity.mockResolvedValue({ isValid: true, errors: [] });

      const result = await importExpenses(
        mockTransactions,
        'user-1',
        mockConfig,
        null,
        null
      );

      expect(result.success).toBe(true);
      expect(result.imported).toBe(3);
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(completeSession).toHaveBeenCalledWith('session-123', {
        imported: 3,
        failed: 0,
        duplicates: 0,
      });
    });

    it('should handle batches larger than 500 transactions', async () => {
      const mockTransactions = createMockTransactions(600);
      const mockConfig = {
        paidBy: 'user-1',
        splitMethod: '50/50',
        defaultCategory: 'other',
      };
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      writeBatch.mockReturnValue(mockBatch);
      doc.mockReturnValue({ id: 'expense-123' });
      collection.mockReturnValue({});
      mapTransactionsToExpenses.mockReturnValue(
        createMockExpenses(600)
      );
      validateExpenses.mockReturnValue({ isValid: true, errors: [] });
      createSession.mockResolvedValue('session-123');
      validateImportIntegrity.mockResolvedValue({ isValid: true, errors: [] });

      const result = await importExpenses(
        mockTransactions,
        'user-1',
        mockConfig,
        null,
        null
      );

      expect(result.success).toBe(true);
      expect(result.imported).toBe(600);
      // Should commit 2 batches (500 + 100)
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
    });

    it('should skip high-confidence duplicates', async () => {
      const mockTransactions = createMockTransactions(3);
      const mockDuplicateResults = [
        { hasDuplicates: false },
        { hasDuplicates: true, highConfidenceDuplicate: { confidence: 0.95 } },
        { hasDuplicates: false },
      ];
      const mockConfig = {
        paidBy: 'user-1',
        splitMethod: '50/50',
        defaultCategory: 'other',
      };
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      writeBatch.mockReturnValue(mockBatch);
      doc.mockReturnValue({ id: 'expense-123' });
      collection.mockReturnValue({});
      mapTransactionsToExpenses.mockReturnValue([
        createMockExpense(),
        createMockExpense(),
      ]);
      validateExpenses.mockReturnValue({ isValid: true, errors: [] });
      createSession.mockResolvedValue('session-123');
      validateImportIntegrity.mockResolvedValue({ isValid: true, errors: [] });

      const result = await importExpenses(
        mockTransactions,
        'user-1',
        mockConfig,
        null,
        mockDuplicateResults
      );

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.duplicates).toBe(1);
    });

    it('should rollback on failure', async () => {
      const mockTransactions = createMockTransactions(2);
      const mockConfig = {
        paidBy: 'user-1',
        splitMethod: '50/50',
        defaultCategory: 'other',
      };
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockRejectedValue(new Error('Firestore error')),
      };

      writeBatch.mockReturnValue(mockBatch);
      doc.mockReturnValue({ id: 'expense-123' });
      collection.mockReturnValue({});
      mapTransactionsToExpenses.mockReturnValue(createMockExpenses(2));
      validateExpenses.mockReturnValue({ isValid: true, errors: [] });
      createSession.mockResolvedValue('session-123');

      await expect(
        importExpenses(mockTransactions, 'user-1', mockConfig, null, null)
      ).rejects.toThrow('Firestore error');

      expect(rollbackImport).toHaveBeenCalled();
      expect(failSession).toHaveBeenCalledWith('session-123', expect.any(String));
    });

    it('should respect cancellation token', async () => {
      const mockTransactions = createMockTransactions(2);
      const mockConfig = {
        paidBy: 'user-1',
        splitMethod: '50/50',
        defaultCategory: 'other',
      };
      const mockCancellationToken = {
        isCancelled: true,
        throwIfCancelled: jest.fn(() => {
          throw new Error('Import cancelled');
        }),
      };

      createSession.mockResolvedValue('session-123');

      await expect(
        importExpenses(
          mockTransactions,
          'user-1',
          mockConfig,
          mockCancellationToken,
          null
        )
      ).rejects.toThrow('Import cancelled');

      expect(failSession).toHaveBeenCalledWith(
        'session-123',
        expect.stringContaining('cancelled')
      );
    });

    it('should update progress during import', async () => {
      const mockTransactions = createMockTransactions(100);
      const mockConfig = {
        paidBy: 'user-1',
        splitMethod: '50/50',
        defaultCategory: 'other',
      };
      const mockBatch = {
        set: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };

      writeBatch.mockReturnValue(mockBatch);
      doc.mockReturnValue({ id: 'expense-123' });
      collection.mockReturnValue({});
      mapTransactionsToExpenses.mockReturnValue(createMockExpenses(100));
      validateExpenses.mockReturnValue({ isValid: true, errors: [] });
      createSession.mockResolvedValue('session-123');
      validateImportIntegrity.mockResolvedValue({ isValid: true, errors: [] });

      await importExpenses(mockTransactions, 'user-1', mockConfig, null, null);

      expect(updateProgress).toHaveBeenCalled();
      expect(logBatchProgress).toHaveBeenCalled();
    });
  });

  describe('cancelImport', () => {
    it('should cancel in-progress import', () => {
      const mockCancellationToken = {
        cancel: jest.fn(),
      };

      cancelImport(mockCancellationToken);

      expect(mockCancellationToken.cancel).toHaveBeenCalled();
    });
  });
});
