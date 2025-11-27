// src/services/__tests__/ocrService.test.js
// Tests for OCR receipt scanning operations

import {
  scanReceiptDirect,
  scanReceiptInBackground,
  subscribeToOCRResults,
  recordOCRFeedback,
} from '../ocrService';

import { doc, addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { groceryReceipt, poorQualityReceipt } from '../../../test-fixtures';

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));

// Mock dependencies
jest.mock('firebase/firestore');
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));
jest.mock('../../config/firebase', () => ({
  db: {},
  storage: {},
  functions: {
    region: 'us-central1',
    app: {},
  },
}));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

// Mock image compression utility
jest.mock('../../utils/imageCompression', () => ({
  compressImage: jest.fn(async (uri) => ({
    uri: uri.replace('.jpg', '_compressed.jpg'),
    size: 512000,
  })),
}));

import { compressImage } from '../../utils/imageCompression';
import * as FileSystem from 'expo-file-system/legacy';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';

describe('ocrService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to default 'ios'
    Platform.OS = 'ios';
  });

  describe('scanReceiptDirect', () => {
    const mockCloudFunction = jest.fn();

    beforeEach(() => {
      httpsCallable.mockReturnValue(mockCloudFunction);
    });

    describe('Native Platform (iOS/Android)', () => {
      it('should use FileSystem.readAsStringAsync for base64 conversion', async () => {
        const imageUri = 'file:///local/receipt.jpg';
        const coupleId = 'couple123';
        const userId = 'user456';

        compressImage.mockResolvedValue({
          uri: 'file:///local/receipt_compressed.jpg',
          size: 512000,
        });

        FileSystem.readAsStringAsync.mockResolvedValue('base64ImageData');

        mockCloudFunction.mockResolvedValue({
          data: {
            success: true,
            data: {
              merchant: 'Test Store',
              amount: 25.50,
              date: '2025-11-23',
              tax: 2.50,
              subtotal: 23.00,
              suggestedCategory: 'Shopping',
              categoryConfidence: 0.85,
              alternativeCategories: [],
              ocrConfidence: 0.92,
              rawText: 'TEST RECEIPT',
              processedAt: '2025-11-23T12:00:00Z',
              processingTimeMs: 1500,
            },
          },
        });

        await scanReceiptDirect(imageUri, coupleId, userId);

        expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
          'file:///local/receipt_compressed.jpg',
          { encoding: 'base64' }
        );
      });

      it('should successfully process receipt on native platform', async () => {
        const imageUri = 'file:///local/receipt.jpg';
        const coupleId = 'couple123';
        const userId = 'user456';

        compressImage.mockResolvedValue({
          uri: 'file:///local/receipt_compressed.jpg',
          size: 512000,
        });

        FileSystem.readAsStringAsync.mockResolvedValue('base64ImageData');

        mockCloudFunction.mockResolvedValue({
          data: {
            success: true,
            data: {
              merchant: 'Test Store',
              amount: 25.50,
              date: '2025-11-23',
              tax: 2.50,
              subtotal: 23.00,
              suggestedCategory: 'Shopping',
              categoryConfidence: 0.85,
              alternativeCategories: ['Groceries', 'Food'],
              ocrConfidence: 0.92,
              rawText: 'TEST RECEIPT',
              processedAt: '2025-11-23T12:00:00Z',
              processingTimeMs: 1500,
            },
          },
        });

        const result = await scanReceiptDirect(imageUri, coupleId, userId);

        expect(result).toEqual({
          merchant: 'Test Store',
          amount: 25.50,
          date: '2025-11-23',
          tax: 2.50,
          subtotal: 23.00,
          suggestedCategory: 'Shopping',
          categoryConfidence: 0.85,
          alternativeCategories: ['Groceries', 'Food'],
          ocrConfidence: 0.92,
          rawText: 'TEST RECEIPT',
          processedAt: '2025-11-23T12:00:00Z',
          processingTimeMs: 1500,
        });
      });
    });

    describe('Web Platform', () => {
      beforeEach(() => {
        Platform.OS = 'web';
      });

      it('should use fetch + FileReader for base64 conversion on web', async () => {
        const imageUri = 'blob:http://localhost:19006/abc-123';
        const coupleId = 'couple123';
        const userId = 'user456';

        compressImage.mockResolvedValue({
          uri: imageUri,
          size: 512000,
        });

        // Mock fetch and FileReader
        const mockBlob = new Blob(['test image data'], { type: 'image/png' });
        global.fetch = jest.fn().mockResolvedValue({
          blob: () => Promise.resolve(mockBlob),
        });

        // Mock FileReader
        const mockFileReader = {
          readAsDataURL: jest.fn(),
          result: 'data:image/png;base64,base64ImageData',
          onloadend: null,
          onerror: null,
        };

        global.FileReader = jest.fn(() => mockFileReader);

        mockCloudFunction.mockResolvedValue({
          data: {
            success: true,
            data: {
              merchant: 'Test Store',
              amount: 25.50,
              date: '2025-11-23',
              tax: 2.50,
              subtotal: 23.00,
              suggestedCategory: 'Shopping',
              categoryConfidence: 0.85,
              alternativeCategories: [],
              ocrConfidence: 0.92,
              rawText: 'TEST RECEIPT',
              processedAt: '2025-11-23T12:00:00Z',
              processingTimeMs: 1500,
            },
          },
        });

        const scanPromise = scanReceiptDirect(imageUri, coupleId, userId);

        // Trigger FileReader onloadend
        setTimeout(() => {
          if (mockFileReader.onloadend) {
            mockFileReader.onloadend();
          }
        }, 0);

        await scanPromise;

        expect(fetch).toHaveBeenCalledWith(imageUri);
        expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockBlob);
        expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
      });

      it('should successfully process receipt on web platform', async () => {
        const imageUri = 'blob:http://localhost:19006/abc-123';
        const coupleId = 'couple123';
        const userId = 'user456';

        compressImage.mockResolvedValue({
          uri: imageUri,
          size: 512000,
        });

        // Mock fetch and FileReader
        const mockBlob = new Blob(['test image data'], { type: 'image/png' });
        global.fetch = jest.fn().mockResolvedValue({
          blob: () => Promise.resolve(mockBlob),
        });

        const mockFileReader = {
          readAsDataURL: jest.fn(),
          result: 'data:image/png;base64,base64ImageData',
          onloadend: null,
          onerror: null,
        };

        global.FileReader = jest.fn(() => mockFileReader);

        mockCloudFunction.mockResolvedValue({
          data: {
            success: true,
            data: {
              merchant: 'Web Store',
              amount: 42.00,
              date: '2025-11-23',
              tax: 3.50,
              subtotal: 38.50,
              suggestedCategory: 'Food',
              categoryConfidence: 0.90,
              alternativeCategories: ['Groceries'],
              ocrConfidence: 0.95,
              rawText: 'WEB RECEIPT TEST',
              processedAt: '2025-11-23T12:00:00Z',
              processingTimeMs: 1200,
            },
          },
        });

        const scanPromise = scanReceiptDirect(imageUri, coupleId, userId);

        // Trigger FileReader onloadend
        setTimeout(() => {
          if (mockFileReader.onloadend) {
            mockFileReader.onloadend();
          }
        }, 0);

        const result = await scanPromise;

        expect(result).toEqual({
          merchant: 'Web Store',
          amount: 42.00,
          date: '2025-11-23',
          tax: 3.50,
          subtotal: 38.50,
          suggestedCategory: 'Food',
          categoryConfidence: 0.90,
          alternativeCategories: ['Groceries'],
          ocrConfidence: 0.95,
          rawText: 'WEB RECEIPT TEST',
          processedAt: '2025-11-23T12:00:00Z',
          processingTimeMs: 1200,
        });
      });

      it('should handle FileReader errors on web', async () => {
        const imageUri = 'blob:http://localhost:19006/abc-123';
        const coupleId = 'couple123';
        const userId = 'user456';

        compressImage.mockResolvedValue({
          uri: imageUri,
          size: 512000,
        });

        const mockBlob = new Blob(['test image data'], { type: 'image/png' });
        global.fetch = jest.fn().mockResolvedValue({
          blob: () => Promise.resolve(mockBlob),
        });

        const mockFileReader = {
          readAsDataURL: jest.fn(),
          onloadend: null,
          onerror: null,
        };

        global.FileReader = jest.fn(() => mockFileReader);

        const scanPromise = scanReceiptDirect(imageUri, coupleId, userId);

        // Trigger FileReader error
        setTimeout(() => {
          if (mockFileReader.onerror) {
            mockFileReader.onerror(new Error('FileReader failed'));
          }
        }, 0);

        await expect(scanPromise).rejects.toThrow('FileReader failed');
      });
    });

    it('should validate required parameters', async () => {
      await expect(
        scanReceiptDirect('', 'couple123', 'user456')
      ).rejects.toThrow('Image URI is required');

      await expect(
        scanReceiptDirect('file:///receipt.jpg', '', 'user456')
      ).rejects.toThrow('Couple ID is required');

      await expect(
        scanReceiptDirect('file:///receipt.jpg', 'couple123', '')
      ).rejects.toThrow('User ID is required');
    });

    it('should handle cloud function errors', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';

      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      FileSystem.readAsStringAsync.mockResolvedValue('base64ImageData');

      mockCloudFunction.mockResolvedValue({
        data: {
          success: false,
          error: 'OCR processing failed',
        },
      });

      await expect(
        scanReceiptDirect(imageUri, coupleId, userId)
      ).rejects.toThrow('OCR processing failed');
    });

    it('should handle compression errors', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';

      compressImage.mockRejectedValue(new Error('Compression failed'));

      await expect(
        scanReceiptDirect(imageUri, coupleId, userId)
      ).rejects.toThrow('Compression failed');
    });
  });

  describe('scanReceiptInBackground (deprecated)', () => {
    const mockCloudFunction = jest.fn();

    beforeEach(() => {
      httpsCallable.mockReturnValue(mockCloudFunction);
    });

    it('should delegate to scanReceiptDirect', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';

      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      FileSystem.readAsStringAsync.mockResolvedValue('base64ImageData');

      mockCloudFunction.mockResolvedValue({
        data: {
          success: true,
          data: {
            merchant: 'Test Store',
            amount: 25.50,
            date: '2025-11-23',
            tax: 2.50,
            subtotal: 23.00,
            suggestedCategory: 'Shopping',
            categoryConfidence: 0.85,
            alternativeCategories: [],
            ocrConfidence: 0.92,
            rawText: 'TEST RECEIPT',
            processedAt: '2025-11-23T12:00:00Z',
            processingTimeMs: 1500,
          },
        },
      });

      const result = await scanReceiptInBackground(imageUri, coupleId, userId);

      expect(result).toEqual({
        merchant: 'Test Store',
        amount: 25.50,
        date: '2025-11-23',
        tax: 2.50,
        subtotal: 23.00,
        suggestedCategory: 'Shopping',
        categoryConfidence: 0.85,
        alternativeCategories: [],
        ocrConfidence: 0.92,
        rawText: 'TEST RECEIPT',
        processedAt: '2025-11-23T12:00:00Z',
        processingTimeMs: 1500,
      });
    });
  });

  describe('subscribeToOCRResults', () => {
    it('should subscribe to Firestore document changes', () => {
      const expenseId = 'expense123';
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      onSnapshot.mockReturnValue(unsubscribe);

      const result = subscribeToOCRResults(expenseId, callback);

      expect(doc).toHaveBeenCalled();
      expect(onSnapshot).toHaveBeenCalled();
      expect(result).toBe(unsubscribe);
    });

    it('should call callback when OCR completes successfully', () => {
      const expenseId = 'expense123';
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      let snapshotHandler;
      onSnapshot.mockImplementation((docRef, handler) => {
        snapshotHandler = handler;
        return unsubscribe;
      });

      subscribeToOCRResults(expenseId, callback);

      // Simulate OCR completion
      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          ocrStatus: 'completed',
          amount: 87.45,
          merchant: 'Whole Foods Market',
          date: '2025-11-15',
          ocrData: groceryReceipt,
        }),
      };

      snapshotHandler(mockSnapshot);

      expect(callback).toHaveBeenCalledWith({
        status: 'completed',
        data: expect.objectContaining({
          amount: 87.45,
          merchant: 'Whole Foods Market',
          date: '2025-11-15',
        }),
      });
    });

    it('should call callback with error on OCR failure', () => {
      const expenseId = 'expense123';
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      let snapshotHandler;
      onSnapshot.mockImplementation((docRef, handler) => {
        snapshotHandler = handler;
        return unsubscribe;
      });

      subscribeToOCRResults(expenseId, callback);

      // Simulate OCR failure
      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          ocrStatus: 'failed',
          ocrError: 'OCR processing failed',
        }),
      };

      snapshotHandler(mockSnapshot);

      expect(callback).toHaveBeenCalledWith({
        status: 'failed',
        error: 'OCR processing failed',
      });
    });

    it('should handle below-threshold confidence results', () => {
      const expenseId = 'expense123';
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      let snapshotHandler;
      onSnapshot.mockImplementation((docRef, handler) => {
        snapshotHandler = handler;
        return unsubscribe;
      });

      subscribeToOCRResults(expenseId, callback);

      // Simulate low confidence result
      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          ocrStatus: 'completed',
          amount: 12.50,
          merchant: 'Unknown Store',
          date: '2025-11-15',
          ocrData: {
            confidence: 0.45,
          },
          requiresManualReview: true,
        }),
      };

      snapshotHandler(mockSnapshot);

      expect(callback).toHaveBeenCalledWith({
        status: 'completed',
        data: expect.objectContaining({
          requiresManualReview: true,
        }),
      });
    });

    it('should handle processing status updates', () => {
      const expenseId = 'expense123';
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      let snapshotHandler;
      onSnapshot.mockImplementation((docRef, handler) => {
        snapshotHandler = handler;
        return unsubscribe;
      });

      subscribeToOCRResults(expenseId, callback);

      // Simulate processing status
      const mockSnapshot = {
        exists: () => true,
        data: () => ({
          ocrStatus: 'processing',
        }),
      };

      snapshotHandler(mockSnapshot);

      expect(callback).toHaveBeenCalledWith({
        status: 'processing',
      });
    });

    it('should handle snapshot errors', () => {
      const expenseId = 'expense123';
      const callback = jest.fn();
      const unsubscribe = jest.fn();

      let errorHandler;
      onSnapshot.mockImplementation((docRef, handler, errHandler) => {
        errorHandler = errHandler;
        return unsubscribe;
      });

      subscribeToOCRResults(expenseId, callback);

      // Simulate snapshot error
      errorHandler(new Error('Firestore connection error'));

      expect(callback).toHaveBeenCalledWith({
        status: 'error',
        error: 'Firestore connection error',
      });
    });

    it('should validate expense ID', () => {
      const callback = jest.fn();

      expect(() => subscribeToOCRResults(null, callback)).toThrow('Expense ID is required');
      expect(() => subscribeToOCRResults('', callback)).toThrow('Expense ID is required');
    });

    it('should validate callback function', () => {
      const expenseId = 'expense123';

      expect(() => subscribeToOCRResults(expenseId, null)).toThrow('Callback is required');
      expect(() => subscribeToOCRResults(expenseId, 'not-a-function')).toThrow('Callback must be a function');
    });

    it('should properly unsubscribe', () => {
      const expenseId = 'expense123';
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();

      onSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = subscribeToOCRResults(expenseId, callback);
      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('recordOCRFeedback', () => {
    it('should create ocrLearningData document', async () => {
      const suggestions = {
        merchant: 'Whole Foods Market',
        amount: 87.45,
        date: '2025-11-15',
      };

      const finalData = {
        merchant: 'Whole Foods',
        amount: 87.45,
        date: '2025-11-15',
      };

      const coupleId = 'couple123';

      const mockDocRef = { id: 'learning123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      const result = await recordOCRFeedback(suggestions, finalData, coupleId);

      expect(collection).toHaveBeenCalled();
      const addDocCalls = addDoc.mock.calls[0];
      expect(addDocCalls[1]).toMatchObject({
        coupleId,
        suggestions,
        finalData,
        createdAt: 'mock-timestamp',
      });

      expect(result.id).toBe('learning123');
    });

    it('should track edited fields', async () => {
      const suggestions = {
        merchant: 'WHOLE FOODS MKT',
        amount: 87.45,
        date: '2025-11-15',
        category: 'Food',
      };

      const finalData = {
        merchant: 'Whole Foods Market',
        amount: 87.50,
        date: '2025-11-15',
        category: 'Groceries',
      };

      const coupleId = 'couple123';

      const mockDocRef = { id: 'learning123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      await recordOCRFeedback(suggestions, finalData, coupleId);

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.editedFields).toContain('merchant');
      expect(callArgs.editedFields).toContain('amount');
      expect(callArgs.editedFields).toContain('category');
      expect(callArgs.editedFields).not.toContain('date');
    });

    it('should calculate accuracy metrics', async () => {
      const suggestions = {
        merchant: 'Whole Foods Market',
        amount: 87.45,
        date: '2025-11-15',
        category: 'Groceries',
      };

      const finalData = {
        merchant: 'Whole Foods Market',
        amount: 87.50,
        date: '2025-11-15',
        category: 'Groceries',
      };

      const coupleId = 'couple123';

      const mockDocRef = { id: 'learning123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      await recordOCRFeedback(suggestions, finalData, coupleId);

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.accuracy).toBeDefined();
      expect(callArgs.accuracy).toBeGreaterThan(0);
      expect(callArgs.accuracy).toBeLessThanOrEqual(1);
    });

    it('should handle null suggestions', async () => {
      const finalData = {
        merchant: 'Whole Foods Market',
        amount: 87.45,
        date: '2025-11-15',
      };

      const coupleId = 'couple123';

      await expect(
        recordOCRFeedback(null, finalData, coupleId)
      ).rejects.toThrow('Suggestions data is required');
    });

    it('should handle null final data', async () => {
      const suggestions = {
        merchant: 'Whole Foods Market',
        amount: 87.45,
        date: '2025-11-15',
      };

      const coupleId = 'couple123';

      await expect(
        recordOCRFeedback(suggestions, null, coupleId)
      ).rejects.toThrow('Final data is required');
    });

    it('should validate couple ID', async () => {
      const suggestions = {
        merchant: 'Whole Foods Market',
        amount: 87.45,
      };

      const finalData = {
        merchant: 'Whole Foods',
        amount: 87.45,
      };

      await expect(
        recordOCRFeedback(suggestions, finalData, null)
      ).rejects.toThrow('Couple ID is required');
    });

    it('should handle Firestore errors', async () => {
      const suggestions = {
        merchant: 'Whole Foods Market',
        amount: 87.45,
      };

      const finalData = {
        merchant: 'Whole Foods',
        amount: 87.45,
      };

      const coupleId = 'couple123';

      addDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        recordOCRFeedback(suggestions, finalData, coupleId)
      ).rejects.toThrow('Firestore error');
    });

    it('should track perfect accuracy when no changes made', async () => {
      const suggestions = {
        merchant: 'Whole Foods Market',
        amount: 87.45,
        date: '2025-11-15',
      };

      const finalData = {
        merchant: 'Whole Foods Market',
        amount: 87.45,
        date: '2025-11-15',
      };

      const coupleId = 'couple123';

      const mockDocRef = { id: 'learning123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      await recordOCRFeedback(suggestions, finalData, coupleId);

      const callArgs = addDoc.mock.calls[0][1];
      expect(callArgs.editedFields).toEqual([]);
      expect(callArgs.accuracy).toBe(1);
    });
  });
});
