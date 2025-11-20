/**
 * Integration Test: CSV Import Flow
 * Tests the complete CSV import workflow from file parsing to Firebase storage
 */

import { parseFile, processTransactions, importExpenses } from '../../services/importService';
import { createMockFileInfo, createMockExpenses } from '../utils/testHelpers';
import * as FileSystem from 'expo-file-system';
import { db } from '../../config/firebase';

// Mock Firebase with more realistic behavior
jest.mock('../../config/firebase', () => {
  const mockExpenses = new Map();
  const mockBatch = {
    operations: [],
    set: jest.fn((ref, data) => {
      mockBatch.operations.push({ type: 'set', ref, data });
    }),
    update: jest.fn((ref, data) => {
      mockBatch.operations.push({ type: 'update', ref, data });
    }),
    delete: jest.fn((ref) => {
      mockBatch.operations.push({ type: 'delete', ref });
    }),
    commit: jest.fn(async () => {
      // Simulate batch commit by storing all operations
      mockBatch.operations.forEach(op => {
        if (op.type === 'set') {
          mockExpenses.set(op.ref.id, op.data);
        }
      });
      mockBatch.operations = [];
    }),
  };

  return {
    db: {
      collection: jest.fn((path) => ({
        doc: jest.fn((id) => ({
          id,
          get: jest.fn(async () => ({
            exists: mockExpenses.has(id),
            data: () => mockExpenses.get(id),
          })),
          set: jest.fn(async (data) => {
            mockExpenses.set(id, data);
          }),
        })),
        where: jest.fn(() => ({
          get: jest.fn(async () => ({
            docs: Array.from(mockExpenses.values()).map(data => ({
              id: data.id,
              data: () => data,
            })),
          })),
        })),
      })),
    },
    writeBatch: jest.fn(() => mockBatch),
    mockExpenses, // Expose for test assertions
    mockBatch, // Expose for test assertions
  };
});

describe('Integration: CSV Import Flow', () => {
  const mockCoupleId = 'couple-1';
  const mockUserId = 'user-1';
  const mockPartnerId = 'user-2';

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock Firebase data
    const { mockExpenses } = require('../../config/firebase');
    mockExpenses.clear();
  });

  describe('Complete Import Workflow', () => {
    it('should successfully import CSV file end-to-end', async () => {
      // Step 1: Parse CSV file
      const mockFileInfo = createMockFileInfo({
        name: 'bank-statement.csv',
        type: 'text/csv',
        size: 1024,
      });

      const csvContent = `Date,Description,Amount,Type
2024-01-15,Starbucks Coffee,5.50,debit
2024-01-16,Grocery Store,125.00,debit
2024-01-17,Gas Station,45.00,debit`;

      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const parseResult = await parseFile('file:///statement.csv', mockFileInfo);

      expect(parseResult.success).toBe(true);
      expect(parseResult.transactions).toHaveLength(3);

      // Step 2: Process transactions (validation, duplicate detection, category mapping)
      const processResult = await processTransactions(
        parseResult.transactions,
        mockUserId,
        ['food', 'groceries', 'transport'],
        true // detectDuplicates
      );

      expect(processResult.success).toBe(true);
      expect(processResult.validTransactions).toHaveLength(3);

      // Step 3: Import to Firebase
      const importResult = await importExpenses({
        coupleId: mockCoupleId,
        transactions: processResult.validTransactions,
        suggestions: processResult.suggestions,
        duplicateResults: processResult.duplicateResults,
        selectedTransactions: { 0: true, 1: true, 2: true },
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: mockPartnerId,
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress: jest.fn(),
      });

      expect(importResult.success).toBe(true);
      expect(importResult.summary.imported).toBe(3);
      expect(importResult.summary.errors).toBe(0);

      // Verify Firebase batch operations
      const { mockBatch } = require('../../config/firebase');
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(mockBatch.operations).toHaveLength(0); // Should be cleared after commit
    });

    it('should handle large CSV files (100+ transactions)', async () => {
      const mockFileInfo = createMockFileInfo({
        name: 'large-statement.csv',
        type: 'text/csv',
        size: 50000,
      });

      // Generate 150 transactions
      const csvRows = ['Date,Description,Amount,Type'];
      for (let i = 1; i <= 150; i++) {
        csvRows.push(`2024-01-${String(i % 28 + 1).padStart(2, '0')},Transaction ${i},${(Math.random() * 100).toFixed(2)},debit`);
      }
      const csvContent = csvRows.join('\n');

      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const parseResult = await parseFile('file:///large-statement.csv', mockFileInfo);
      expect(parseResult.success).toBe(true);
      expect(parseResult.transactions).toHaveLength(150);

      const processResult = await processTransactions(
        parseResult.transactions,
        mockUserId,
        ['food'],
        false // Skip duplicate detection for performance
      );

      const selectedTransactions = {};
      for (let i = 0; i < 150; i++) {
        selectedTransactions[i] = true;
      }

      const startTime = Date.now();
      const importResult = await importExpenses({
        coupleId: mockCoupleId,
        transactions: processResult.validTransactions,
        suggestions: processResult.suggestions,
        duplicateResults: [],
        selectedTransactions,
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: mockPartnerId,
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress: jest.fn(),
      });
      const duration = Date.now() - startTime;

      expect(importResult.success).toBe(true);
      expect(importResult.summary.imported).toBe(150);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should track progress during import', async () => {
      const mockFileInfo = createMockFileInfo();
      const csvContent = `Date,Description,Amount,Type
2024-01-15,Transaction 1,10.00,debit
2024-01-16,Transaction 2,20.00,debit
2024-01-17,Transaction 3,30.00,debit
2024-01-18,Transaction 4,40.00,debit
2024-01-19,Transaction 5,50.00,debit`;

      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const parseResult = await parseFile('file:///statement.csv', mockFileInfo);
      const processResult = await processTransactions(
        parseResult.transactions,
        mockUserId,
        ['food'],
        false
      );

      const progressUpdates = [];
      const onProgress = jest.fn((progress) => {
        progressUpdates.push(progress);
      });

      await importExpenses({
        coupleId: mockCoupleId,
        transactions: processResult.validTransactions,
        suggestions: processResult.suggestions,
        duplicateResults: [],
        selectedTransactions: { 0: true, 1: true, 2: true, 3: true, 4: true },
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: mockPartnerId,
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalled();
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Verify progress goes from 0 to 100
      const firstProgress = progressUpdates[0];
      const lastProgress = progressUpdates[progressUpdates.length - 1];
      expect(firstProgress.progress).toBeLessThanOrEqual(20);
      expect(lastProgress.progress).toBe(100);
    });

    it('should handle partial selection of transactions', async () => {
      const mockFileInfo = createMockFileInfo();
      const csvContent = `Date,Description,Amount,Type
2024-01-15,Transaction 1,10.00,debit
2024-01-16,Transaction 2,20.00,debit
2024-01-17,Transaction 3,30.00,debit
2024-01-18,Transaction 4,40.00,debit
2024-01-19,Transaction 5,50.00,debit`;

      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const parseResult = await parseFile('file:///statement.csv', mockFileInfo);
      const processResult = await processTransactions(
        parseResult.transactions,
        mockUserId,
        ['food'],
        false
      );

      // Select only transactions 0, 2, and 4
      const importResult = await importExpenses({
        coupleId: mockCoupleId,
        transactions: processResult.validTransactions,
        suggestions: processResult.suggestions,
        duplicateResults: [],
        selectedTransactions: { 0: true, 1: false, 2: true, 3: false, 4: true },
        categoryOverrides: {},
        paidBy: mockUserId,
        partnerId: mockPartnerId,
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress: jest.fn(),
      });

      expect(importResult.success).toBe(true);
      expect(importResult.summary.imported).toBe(3); // Only 3 were selected
      expect(importResult.summary.totalTransactions).toBe(5);
    });

    it('should apply category overrides correctly', async () => {
      const mockFileInfo = createMockFileInfo();
      const csvContent = `Date,Description,Amount,Type
2024-01-15,Starbucks,5.00,debit
2024-01-16,Walmart,100.00,debit`;

      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const parseResult = await parseFile('file:///statement.csv', mockFileInfo);
      const processResult = await processTransactions(
        parseResult.transactions,
        mockUserId,
        ['food', 'groceries'],
        false
      );

      // Override first transaction category
      const categoryOverrides = {
        0: 'transport', // Override Starbucks to transport
      };

      const importResult = await importExpenses({
        coupleId: mockCoupleId,
        transactions: processResult.validTransactions,
        suggestions: processResult.suggestions,
        duplicateResults: [],
        selectedTransactions: { 0: true, 1: true },
        categoryOverrides,
        paidBy: mockUserId,
        partnerId: mockPartnerId,
        splitConfig: { type: '50/50' },
        userId: mockUserId,
        onProgress: jest.fn(),
      });

      expect(importResult.success).toBe(true);

      // Verify category override was applied
      const { mockBatch } = require('../../config/firebase');
      const firstExpense = mockBatch.operations[0].data;
      expect(firstExpense.categoryKey).toBe('transport');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid CSV format', async () => {
      const mockFileInfo = createMockFileInfo({
        name: 'invalid.csv',
      });

      const invalidCsvContent = 'Not a valid CSV format\nRandom text';
      FileSystem.readAsStringAsync.mockResolvedValue(invalidCsvContent);

      await expect(
        parseFile('file:///invalid.csv', mockFileInfo)
      ).rejects.toThrow();
    });

    it('should rollback on Firebase commit failure', async () => {
      const mockFileInfo = createMockFileInfo();
      const csvContent = `Date,Description,Amount,Type
2024-01-15,Transaction 1,10.00,debit`;

      FileSystem.readAsStringAsync.mockResolvedValue(csvContent);

      const parseResult = await parseFile('file:///statement.csv', mockFileInfo);
      const processResult = await processTransactions(
        parseResult.transactions,
        mockUserId,
        ['food'],
        false
      );

      // Mock Firebase commit to fail
      const { mockBatch } = require('../../config/firebase');
      mockBatch.commit.mockRejectedValueOnce(new Error('Firebase network error'));

      await expect(
        importExpenses({
          coupleId: mockCoupleId,
          transactions: processResult.validTransactions,
          suggestions: processResult.suggestions,
          duplicateResults: [],
          selectedTransactions: { 0: true },
          categoryOverrides: {},
          paidBy: mockUserId,
          partnerId: mockPartnerId,
          splitConfig: { type: '50/50' },
          userId: mockUserId,
          onProgress: jest.fn(),
        })
      ).rejects.toThrow('Firebase network error');

      // Verify no data was committed
      const { mockExpenses } = require('../../config/firebase');
      expect(mockExpenses.size).toBe(0);
    });

    it('should handle file read errors gracefully', async () => {
      const mockFileInfo = createMockFileInfo();

      FileSystem.readAsStringAsync.mockRejectedValue(
        new Error('File read permission denied')
      );

      await expect(
        parseFile('file:///statement.csv', mockFileInfo)
      ).rejects.toThrow();
    });
  });
});
