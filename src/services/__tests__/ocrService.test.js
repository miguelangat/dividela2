// src/services/__tests__/ocrService.test.js
// Tests for OCR receipt scanning operations

import {
  scanReceiptInBackground,
  subscribeToOCRResults,
  recordOCRFeedback,
} from '../ocrService';

import { uploadReceipt } from '../receiptService';
import { doc, addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { groceryReceipt, poorQualityReceipt } from '../../../test-fixtures';

// Mock dependencies
jest.mock('../receiptService');
jest.mock('firebase/firestore');
jest.mock('../../config/firebase', () => ({
  db: {},
  storage: {},
}));

// Mock image compression utility
jest.mock('../../utils/imageCompression', () => ({
  compressImage: jest.fn(async (uri) => ({
    uri: uri.replace('.jpg', '_compressed.jpg'),
    size: 512000,
  })),
}));

import { compressImage } from '../../utils/imageCompression';

describe('ocrService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scanReceiptInBackground', () => {
    it('should compress image before upload', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';
      const compressedUri = 'file:///local/receipt_compressed.jpg';

      compressImage.mockResolvedValue({
        uri: compressedUri,
        size: 512000,
      });

      uploadReceipt.mockResolvedValue('https://storage.example.com/receipt.jpg');

      const mockDocRef = { id: 'expense123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      await scanReceiptInBackground(imageUri, coupleId, userId);

      expect(compressImage).toHaveBeenCalledWith(imageUri);
      expect(uploadReceipt).toHaveBeenCalledWith(compressedUri, coupleId, userId, undefined);
    });

    it('should upload compressed image to Firebase Storage', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';
      const receiptUrl = 'https://storage.example.com/receipt.jpg';

      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      uploadReceipt.mockResolvedValue(receiptUrl);

      const mockDocRef = { id: 'expense123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      const result = await scanReceiptInBackground(imageUri, coupleId, userId);

      expect(uploadReceipt).toHaveBeenCalled();
      expect(result.receiptUrl).toBe(receiptUrl);
    });

    it('should create pending expense document in Firestore', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';
      const receiptUrl = 'https://storage.example.com/receipt.jpg';

      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      uploadReceipt.mockResolvedValue(receiptUrl);

      const mockDocRef = { id: 'expense123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      await scanReceiptInBackground(imageUri, coupleId, userId);

      expect(collection).toHaveBeenCalled();
      const addDocCalls = addDoc.mock.calls[0];
      expect(addDocCalls[1]).toMatchObject({
        coupleId,
        paidBy: userId,
        receiptUrl,
        ocrStatus: 'processing',
        createdAt: 'mock-timestamp',
      });
    });

    it('should return expenseId and receiptUrl', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';
      const receiptUrl = 'https://storage.example.com/receipt.jpg';
      const expenseId = 'expense123';

      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      uploadReceipt.mockResolvedValue(receiptUrl);

      const mockDocRef = { id: expenseId };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      const result = await scanReceiptInBackground(imageUri, coupleId, userId);

      expect(result).toEqual({
        expenseId,
        receiptUrl,
      });
    });

    it('should handle compression errors', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';

      compressImage.mockRejectedValue(new Error('Compression failed'));

      await expect(
        scanReceiptInBackground(imageUri, coupleId, userId)
      ).rejects.toThrow('Compression failed');
    });

    it('should handle upload errors', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';

      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      uploadReceipt.mockRejectedValue(new Error('Upload failed'));

      await expect(
        scanReceiptInBackground(imageUri, coupleId, userId)
      ).rejects.toThrow('Upload failed');
    });

    it('should handle Firestore errors when creating expense', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';

      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      uploadReceipt.mockResolvedValue('https://storage.example.com/receipt.jpg');
      addDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(
        scanReceiptInBackground(imageUri, coupleId, userId)
      ).rejects.toThrow('Firestore error');
    });

    it('should validate required parameters', async () => {
      await expect(
        scanReceiptInBackground(null, 'couple123', 'user456')
      ).rejects.toThrow('Image URI is required');

      await expect(
        scanReceiptInBackground('file:///receipt.jpg', null, 'user456')
      ).rejects.toThrow('Couple ID is required');

      await expect(
        scanReceiptInBackground('file:///receipt.jpg', 'couple123', null)
      ).rejects.toThrow('User ID is required');
    });

    it('should track upload progress', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';
      const progressCallback = jest.fn();

      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      uploadReceipt.mockImplementation((uri, cId, uId, onProgress) => {
        // Simulate progress callbacks
        if (onProgress) {
          onProgress(25);
          onProgress(50);
          onProgress(100);
        }
        return Promise.resolve('https://storage.example.com/receipt.jpg');
      });

      const mockDocRef = { id: 'expense123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      await scanReceiptInBackground(imageUri, coupleId, userId, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(25);
      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(100);
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

  describe('Integration - Full OCR Workflow', () => {
    it('should handle complete scan-to-result workflow', async () => {
      const imageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';

      // Mock compression
      compressImage.mockResolvedValue({
        uri: 'file:///local/receipt_compressed.jpg',
        size: 512000,
      });

      // Mock upload
      uploadReceipt.mockResolvedValue('https://storage.example.com/receipt.jpg');

      // Mock expense creation
      const mockDocRef = { id: 'expense123' };
      addDoc.mockResolvedValue(mockDocRef);
      serverTimestamp.mockReturnValue('mock-timestamp');

      // Scan receipt
      const scanResult = await scanReceiptInBackground(imageUri, coupleId, userId);
      expect(scanResult.expenseId).toBe('expense123');

      // Subscribe to results
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();
      let snapshotHandler;

      onSnapshot.mockImplementation((docRef, handler) => {
        snapshotHandler = handler;
        return mockUnsubscribe;
      });

      const unsubscribe = subscribeToOCRResults(scanResult.expenseId, callback);

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
        }),
      });

      // Cleanup
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
