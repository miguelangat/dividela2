/**
 * Offline Queue Implementation Tests
 *
 * Tests the system's ability to:
 * - Queue receipts when offline
 * - Retry failed uploads on reconnection
 * - Persist queue across app restarts
 * - Handle concurrent offline/online transitions
 * - Manage queue priority and expiration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  queueReceiptForUpload,
  processUploadQueue,
  getQueueStatus,
  clearQueue,
  removeFromQueue,
  getQueuedReceipts,
  retryFailedUploads,
  isOnline,
  setNetworkState,
} from '../offlineQueueService';
import { uploadReceipt } from '../receiptService';
import { scanReceiptInBackground } from '../ocrService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
}));

// Mock receipt and OCR services
jest.mock('../receiptService');
jest.mock('../ocrService');

// Mock network info
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

describe('Offline Queue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('Queue Management', () => {
    it('should queue receipt when offline', async () => {
      setNetworkState('offline');

      const receipt = {
        imageUri: 'file:///path/to/receipt.jpg',
        coupleId: 'couple-123',
        userId: 'user-123',
        timestamp: Date.now(),
      };

      const queueId = await queueReceiptForUpload(receipt);

      expect(queueId).toBeDefined();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.stringContaining(receipt.imageUri)
      );
    });

    it('should not queue receipt when online', async () => {
      setNetworkState('online');
      uploadReceipt.mockResolvedValue('https://receipt-url.com');
      scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense-123',
        receiptUrl: 'https://receipt-url.com',
      });

      const receipt = {
        imageUri: 'file:///path/to/receipt.jpg',
        coupleId: 'couple-123',
        userId: 'user-123',
      };

      const result = await queueReceiptForUpload(receipt);

      expect(result.uploaded).toBe(true);
      expect(uploadReceipt).toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should get queue status', async () => {
      const queue = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'uploading' },
        { id: '3', status: 'failed' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const status = await getQueueStatus();

      expect(status.total).toBe(3);
      expect(status.pending).toBe(1);
      expect(status.uploading).toBe(1);
      expect(status.failed).toBe(1);
      expect(status.completed).toBe(0);
    });

    it('should get all queued receipts', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', status: 'pending' },
        { id: '2', imageUri: 'file:///receipt2.jpg', status: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const receipts = await getQueuedReceipts();

      expect(receipts).toHaveLength(2);
      expect(receipts[0].id).toBe('1');
      expect(receipts[1].id).toBe('2');
    });

    it('should clear entire queue', async () => {
      await clearQueue();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_queue');
    });

    it('should remove specific item from queue', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg' },
        { id: '2', imageUri: 'file:///receipt2.jpg' },
        { id: '3', imageUri: 'file:///receipt3.jpg' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      await removeFromQueue('2');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.not.stringContaining('receipt2.jpg')
      );
    });
  });

  describe('Queue Processing', () => {
    it('should process queue when coming back online', async () => {
      const queue = [
        {
          id: '1',
          imageUri: 'file:///receipt1.jpg',
          coupleId: 'couple-123',
          userId: 'user-123',
          status: 'pending'
        },
        {
          id: '2',
          imageUri: 'file:///receipt2.jpg',
          coupleId: 'couple-123',
          userId: 'user-123',
          status: 'pending'
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));
      uploadReceipt.mockResolvedValue('https://receipt-url.com');
      scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense-123',
        receiptUrl: 'https://receipt-url.com',
      });

      setNetworkState('online');
      const results = await processUploadQueue();

      expect(results.processed).toBe(2);
      expect(results.successful).toBe(2);
      expect(results.failed).toBe(0);
      expect(uploadReceipt).toHaveBeenCalledTimes(2);
    });

    it('should handle partial queue processing failures', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'pending' },
        { id: '2', imageUri: 'file:///receipt2.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'pending' },
        { id: '3', imageUri: 'file:///receipt3.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      uploadReceipt
        .mockResolvedValueOnce('https://receipt-url.com')
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce('https://receipt-url.com');

      scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense-123',
        receiptUrl: 'https://receipt-url.com',
      });

      setNetworkState('online');
      const results = await processUploadQueue();

      expect(results.processed).toBe(3);
      expect(results.successful).toBe(2);
      expect(results.failed).toBe(1);
    });

    it('should not process queue when offline', async () => {
      setNetworkState('offline');

      const results = await processUploadQueue();

      expect(results.processed).toBe(0);
      expect(results.message).toContain('offline');
      expect(uploadReceipt).not.toHaveBeenCalled();
    });

    it('should update queue item status during processing', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));
      uploadReceipt.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('url'), 100)));

      setNetworkState('online');

      // Start processing
      const processPromise = processUploadQueue();

      // Check status immediately (should be uploading)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Complete processing
      await processPromise;

      // Should have updated status to uploading, then completed/removed
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed uploads', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'failed', retryCount: 0 },
        { id: '2', imageUri: 'file:///receipt2.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'failed', retryCount: 1 },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));
      uploadReceipt.mockResolvedValue('https://receipt-url.com');
      scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense-123',
        receiptUrl: 'https://receipt-url.com',
      });

      setNetworkState('online');
      const results = await retryFailedUploads();

      expect(results.retried).toBe(2);
      expect(results.successful).toBe(2);
    });

    it('should respect max retry limit', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'failed', retryCount: 5 },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      setNetworkState('online');
      const results = await retryFailedUploads({ maxRetries: 3 });

      expect(results.retried).toBe(0);
      expect(results.skipped).toBe(1);
      expect(uploadReceipt).not.toHaveBeenCalled();
    });

    it('should implement exponential backoff', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'failed', retryCount: 2 },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));
      uploadReceipt.mockRejectedValue(new Error('Still failing'));

      setNetworkState('online');
      const startTime = Date.now();

      await retryFailedUploads({ useExponentialBackoff: true });

      const duration = Date.now() - startTime;

      // With retry count 2, backoff should be at least 4 seconds (2^2)
      expect(duration).toBeGreaterThan(4000);
    });

    it('should increment retry count on failure', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'failed', retryCount: 1 },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));
      uploadReceipt.mockRejectedValue(new Error('Upload failed'));

      setNetworkState('online');
      await retryFailedUploads();

      // Should have saved queue with incremented retry count
      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedQueue[0].retryCount).toBe(2);
    });
  });

  describe('Queue Persistence', () => {
    it('should persist queue across app restarts', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', timestamp: Date.now() },
      ];

      // Simulate app restart by clearing mocks
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const receipts = await getQueuedReceipts();

      expect(receipts).toHaveLength(1);
      expect(receipts[0].id).toBe('1');
    });

    it('should clean up expired queue items', async () => {
      const now = Date.now();
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', timestamp: now - (8 * 24 * 60 * 60 * 1000) }, // 8 days old
        { id: '2', imageUri: 'file:///receipt2.jpg', timestamp: now - (1 * 24 * 60 * 60 * 1000) }, // 1 day old
        { id: '3', imageUri: 'file:///receipt3.jpg', timestamp: now }, // Fresh
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      await processUploadQueue({ cleanupExpired: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days

      // Should have removed expired item
      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedQueue).toHaveLength(2);
      expect(savedQueue.find(item => item.id === '1')).toBeUndefined();
    });

    it('should handle corrupted queue data gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValue('{ invalid json }');

      const receipts = await getQueuedReceipts();

      expect(receipts).toEqual([]);
      // Should have reset the queue
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('offline_queue', '[]');
    });
  });

  describe('Network State Handling', () => {
    it('should detect network state changes', async () => {
      const NetInfo = require('@react-native-community/netinfo');

      let networkCallback;
      NetInfo.addEventListener.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn(); // unsubscribe function
      });

      // Initialize network listener
      const { initializeNetworkListener } = require('../offlineQueueService');
      await initializeNetworkListener();

      // Simulate going offline
      networkCallback({ isConnected: false });
      expect(await isOnline()).toBe(false);

      // Simulate coming back online
      networkCallback({ isConnected: true });
      expect(await isOnline()).toBe(true);
    });

    it('should automatically process queue when coming online', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      let networkCallback;
      NetInfo.addEventListener.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn();
      });

      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));
      uploadReceipt.mockResolvedValue('https://receipt-url.com');
      scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense-123',
        receiptUrl: 'https://receipt-url.com',
      });

      const { initializeNetworkListener } = require('../offlineQueueService');
      await initializeNetworkListener({ autoProcessOnOnline: true });

      // Simulate coming online
      networkCallback({ isConnected: true });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(uploadReceipt).toHaveBeenCalled();
    });

    it('should handle rapid online/offline transitions', async () => {
      const transitions = [];

      for (let i = 0; i < 10; i++) {
        setNetworkState(i % 2 === 0 ? 'online' : 'offline');
        transitions.push(await isOnline());
      }

      // Should accurately track all transitions
      expect(transitions).toEqual([true, false, true, false, true, false, true, false, true, false]);
    });
  });

  describe('Queue Priority', () => {
    it('should process high priority items first', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', priority: 'low', status: 'pending' },
        { id: '2', imageUri: 'file:///receipt2.jpg', coupleId: 'couple-123', userId: 'user-123', priority: 'high', status: 'pending' },
        { id: '3', imageUri: 'file:///receipt3.jpg', coupleId: 'couple-123', userId: 'user-123', priority: 'medium', status: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const processOrder = [];
      uploadReceipt.mockImplementation((uri) => {
        processOrder.push(uri);
        return Promise.resolve('https://receipt-url.com');
      });

      setNetworkState('online');
      await processUploadQueue({ respectPriority: true });

      // Should process in order: high, medium, low
      expect(processOrder[0]).toContain('receipt2.jpg');
      expect(processOrder[1]).toContain('receipt3.jpg');
      expect(processOrder[2]).toContain('receipt1.jpg');
    });

    it('should allow setting priority when queuing', async () => {
      setNetworkState('offline');

      const receipt = {
        imageUri: 'file:///receipt.jpg',
        coupleId: 'couple-123',
        userId: 'user-123',
        priority: 'high',
      };

      await queueReceiptForUpload(receipt);

      const savedQueue = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedQueue[0].priority).toBe('high');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage quota exceeded', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('QuotaExceededError'));

      const receipt = {
        imageUri: 'file:///receipt.jpg',
        coupleId: 'couple-123',
        userId: 'user-123',
      };

      await expect(queueReceiptForUpload(receipt)).rejects.toThrow('QuotaExceededError');
    });

    it('should handle network errors during processing', async () => {
      const queue = [
        { id: '1', imageUri: 'file:///receipt1.jpg', coupleId: 'couple-123', userId: 'user-123', status: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));
      uploadReceipt.mockRejectedValue(new Error('Network request failed'));

      setNetworkState('online');
      const results = await processUploadQueue();

      expect(results.failed).toBe(1);
      expect(results.errors[0]).toContain('Network request failed');
    });

    it('should handle invalid image URIs', async () => {
      setNetworkState('offline');

      const receipt = {
        imageUri: null,
        coupleId: 'couple-123',
        userId: 'user-123',
      };

      await expect(queueReceiptForUpload(receipt)).rejects.toThrow('Invalid image URI');
    });

    it('should handle missing required fields', async () => {
      setNetworkState('offline');

      const receipt = {
        imageUri: 'file:///receipt.jpg',
        // Missing coupleId and userId
      };

      await expect(queueReceiptForUpload(receipt)).rejects.toThrow('Missing required fields');
    });
  });

  describe('Queue Statistics', () => {
    it('should track upload success rate', async () => {
      const queue = [
        { id: '1', status: 'pending', attempts: [] },
        { id: '2', status: 'failed', attempts: [{ success: false }] },
        { id: '3', status: 'failed', attempts: [{ success: false }, { success: false }] },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const stats = await getQueueStatus({ includeStats: true });

      expect(stats.successRate).toBeDefined();
      expect(stats.averageAttempts).toBeDefined();
      expect(stats.totalAttempts).toBe(3);
    });

    it('should calculate average wait time', async () => {
      const now = Date.now();
      const queue = [
        { id: '1', timestamp: now - 5000, status: 'pending' },
        { id: '2', timestamp: now - 10000, status: 'pending' },
        { id: '3', timestamp: now - 15000, status: 'pending' },
      ];

      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(queue));

      const stats = await getQueueStatus({ includeStats: true });

      expect(stats.averageWaitTime).toBeGreaterThan(9000);
      expect(stats.averageWaitTime).toBeLessThan(11000);
    });
  });
});
