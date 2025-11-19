// src/services/__tests__/receiptService.test.js
// Tests for receipt storage operations

import {
  uploadReceipt,
  deleteReceipt,
  getReceiptUrl,
} from '../receiptService';

import { ref, uploadBytesResumable, deleteObject, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';

// Mock Firebase modules
jest.mock('firebase/storage');
jest.mock('firebase/firestore');
jest.mock('../../config/firebase', () => ({
  storage: {},
  db: {},
}));

describe('receiptService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadReceipt', () => {
    it('should upload image to correct Firebase Storage path', async () => {
      const mockImageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';
      const mockDownloadUrl = 'https://storage.example.com/receipts/couple123/user456_1234567890.jpg';

      // Mock storage ref
      const mockStorageRef = { name: 'mock-ref' };
      ref.mockReturnValue(mockStorageRef);

      // Mock upload task
      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          // Simulate progress
          onProgress({ bytesTransferred: 512, totalBytes: 1024 });
          onProgress({ bytesTransferred: 1024, totalBytes: 1024 });
          // Simulate completion
          onComplete();
          return mockUploadTask;
        }),
        snapshot: {
          ref: mockStorageRef,
        },
      };

      uploadBytesResumable.mockReturnValue(mockUploadTask);
      getDownloadURL.mockResolvedValue(mockDownloadUrl);

      const result = await uploadReceipt(mockImageUri, coupleId, userId);

      // Verify storage reference was created with correct path
      expect(ref).toHaveBeenCalled();
      const refCall = ref.mock.calls[0];
      expect(refCall[1]).toMatch(/receipts\/couple123\/user456_\d+\.jpg/);

      // Verify upload was initiated
      expect(uploadBytesResumable).toHaveBeenCalled();

      // Verify download URL was retrieved
      expect(getDownloadURL).toHaveBeenCalledWith(mockStorageRef);

      // Verify result
      expect(result).toBe(mockDownloadUrl);
    });

    it('should handle upload progress callbacks', async () => {
      const mockImageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';
      const progressCallback = jest.fn();

      const mockStorageRef = { name: 'mock-ref' };
      ref.mockReturnValue(mockStorageRef);

      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          onProgress({ bytesTransferred: 250, totalBytes: 1000 });
          onProgress({ bytesTransferred: 500, totalBytes: 1000 });
          onProgress({ bytesTransferred: 1000, totalBytes: 1000 });
          onComplete();
          return mockUploadTask;
        }),
        snapshot: {
          ref: mockStorageRef,
        },
      };

      uploadBytesResumable.mockReturnValue(mockUploadTask);
      getDownloadURL.mockResolvedValue('https://storage.example.com/receipt.jpg');

      await uploadReceipt(mockImageUri, coupleId, userId, progressCallback);

      // Verify progress callback was called with correct percentages
      expect(progressCallback).toHaveBeenCalledWith(25);
      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it('should handle upload errors', async () => {
      const mockImageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';

      const mockStorageRef = { name: 'mock-ref' };
      ref.mockReturnValue(mockStorageRef);

      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          onError(new Error('Upload failed'));
          return mockUploadTask;
        }),
        snapshot: {
          ref: mockStorageRef,
        },
      };

      uploadBytesResumable.mockReturnValue(mockUploadTask);

      await expect(uploadReceipt(mockImageUri, coupleId, userId)).rejects.toThrow('Upload failed');
    });

    it('should validate couple ID', async () => {
      const mockImageUri = 'file:///local/receipt.jpg';
      const userId = 'user456';

      await expect(uploadReceipt(mockImageUri, null, userId)).rejects.toThrow('Couple ID is required');
      await expect(uploadReceipt(mockImageUri, '', userId)).rejects.toThrow('Couple ID is required');
    });

    it('should validate user ID', async () => {
      const mockImageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';

      await expect(uploadReceipt(mockImageUri, coupleId, null)).rejects.toThrow('User ID is required');
      await expect(uploadReceipt(mockImageUri, coupleId, '')).rejects.toThrow('User ID is required');
    });

    it('should validate image URI', async () => {
      const coupleId = 'couple123';
      const userId = 'user456';

      await expect(uploadReceipt(null, coupleId, userId)).rejects.toThrow('Image URI is required');
      await expect(uploadReceipt('', coupleId, userId)).rejects.toThrow('Image URI is required');
    });
  });

  describe('deleteReceipt', () => {
    it('should delete image from Firebase Storage', async () => {
      const receiptUrl = 'https://storage.example.com/receipts/couple123/receipt.jpg';

      const mockStorageRef = { name: 'mock-ref' };
      ref.mockReturnValue(mockStorageRef);
      deleteObject.mockResolvedValue();

      await deleteReceipt(receiptUrl);

      expect(ref).toHaveBeenCalled();
      expect(deleteObject).toHaveBeenCalledWith(mockStorageRef);
    });

    it('should handle delete errors', async () => {
      const receiptUrl = 'https://storage.example.com/receipts/couple123/receipt.jpg';

      const mockStorageRef = { name: 'mock-ref' };
      ref.mockReturnValue(mockStorageRef);
      deleteObject.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteReceipt(receiptUrl)).rejects.toThrow('Delete failed');
    });

    it('should handle null URL gracefully', async () => {
      await expect(deleteReceipt(null)).rejects.toThrow('Receipt URL is required');
    });

    it('should handle empty URL gracefully', async () => {
      await expect(deleteReceipt('')).rejects.toThrow('Receipt URL is required');
    });

    it('should handle invalid URL format', async () => {
      await expect(deleteReceipt('not-a-url')).rejects.toThrow('Invalid receipt URL');
    });
  });

  describe('getReceiptUrl', () => {
    it('should fetch receipt URL from expense document', async () => {
      const expenseId = 'expense123';
      const expectedUrl = 'https://storage.example.com/receipts/couple123/receipt.jpg';

      const mockExpenseDoc = {
        exists: () => true,
        data: () => ({
          receiptUrl: expectedUrl,
        }),
      };

      getDoc.mockResolvedValue(mockExpenseDoc);

      const result = await getReceiptUrl(expenseId);

      expect(doc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
      expect(result).toBe(expectedUrl);
    });

    it('should return null if expense has no receipt', async () => {
      const expenseId = 'expense123';

      const mockExpenseDoc = {
        exists: () => true,
        data: () => ({
          amount: 100,
          merchant: 'Test Store',
          // no receiptUrl
        }),
      };

      getDoc.mockResolvedValue(mockExpenseDoc);

      const result = await getReceiptUrl(expenseId);

      expect(result).toBeNull();
    });

    it('should handle missing expense document', async () => {
      const expenseId = 'nonexistent';

      const mockExpenseDoc = {
        exists: () => false,
      };

      getDoc.mockResolvedValue(mockExpenseDoc);

      await expect(getReceiptUrl(expenseId)).rejects.toThrow('Expense not found');
    });

    it('should validate expense ID', async () => {
      await expect(getReceiptUrl(null)).rejects.toThrow('Expense ID is required');
      await expect(getReceiptUrl('')).rejects.toThrow('Expense ID is required');
    });

    it('should handle Firestore errors', async () => {
      const expenseId = 'expense123';

      getDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(getReceiptUrl(expenseId)).rejects.toThrow('Firestore error');
    });
  });

  describe('Integration - Upload and Delete Cycle', () => {
    it('should handle complete upload and delete lifecycle', async () => {
      const mockImageUri = 'file:///local/receipt.jpg';
      const coupleId = 'couple123';
      const userId = 'user456';
      const mockDownloadUrl = 'https://storage.example.com/receipts/couple123/receipt.jpg';

      // Mock upload
      const mockStorageRef = { name: 'mock-ref' };
      ref.mockReturnValue(mockStorageRef);

      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          onComplete();
          return mockUploadTask;
        }),
        snapshot: { ref: mockStorageRef },
      };

      uploadBytesResumable.mockReturnValue(mockUploadTask);
      getDownloadURL.mockResolvedValue(mockDownloadUrl);

      // Upload
      const uploadedUrl = await uploadReceipt(mockImageUri, coupleId, userId);
      expect(uploadedUrl).toBe(mockDownloadUrl);

      // Mock delete
      deleteObject.mockResolvedValue();

      // Delete
      await deleteReceipt(uploadedUrl);
      expect(deleteObject).toHaveBeenCalled();
    });
  });
});
