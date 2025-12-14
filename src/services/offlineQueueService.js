/**
 * Offline Queue Service
 *
 * Manages receipt upload queue when offline
 * This is a placeholder implementation for testing purposes
 * Full implementation required for production
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { uploadReceipt } from './receiptService';
import { scanReceiptInBackground } from './ocrService';

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES = 3;

let networkState = 'online';
let networkListener = null;

/**
 * Queue a receipt for upload when offline
 */
export const queueReceiptForUpload = async (receipt) => {
  // Validation
  if (!receipt.imageUri) {
    throw new Error('Invalid image URI');
  }
  if (!receipt.coupleId || !receipt.userId) {
    throw new Error('Missing required fields');
  }

  // If online, upload immediately
  if (await isOnline()) {
    try {
      const receiptUrl = await uploadReceipt(
        receipt.imageUri,
        receipt.coupleId,
        receipt.userId
      );

      const result = await scanReceiptInBackground(
        receipt.imageUri,
        receipt.coupleId,
        receipt.userId
      );

      return { uploaded: true, ...result };
    } catch (error) {
      // If immediate upload fails, queue it
      console.warn('Immediate upload failed, queuing:', error);
    }
  }

  // Queue for later
  const queue = await getQueue();
  const queueItem = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...receipt,
    status: 'pending',
    retryCount: 0,
    timestamp: Date.now(),
    priority: receipt.priority || 'normal',
  };

  queue.push(queueItem);
  await saveQueue(queue);

  return queueItem.id;
};

/**
 * Process all queued receipts
 */
export const processUploadQueue = async (options = {}) => {
  if (!(await isOnline())) {
    return { processed: 0, message: 'Device is offline' };
  }

  const queue = await getQueue();
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Clean up expired items if requested
  if (options.cleanupExpired) {
    const maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    queue.filter(item => (now - item.timestamp) <= maxAge);
  }

  // Sort by priority if requested
  if (options.respectPriority) {
    const priorityOrder = { high: 0, medium: 1, normal: 2, low: 3 };
    queue.sort((a, b) => priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal']);
  }

  // Process pending items
  const pendingItems = queue.filter(item => item.status === 'pending');

  for (const item of pendingItems) {
    results.processed++;

    try {
      // Update status
      item.status = 'uploading';
      await saveQueue(queue);

      // Upload
      const receiptUrl = await uploadReceipt(
        item.imageUri,
        item.coupleId,
        item.userId
      );

      await scanReceiptInBackground(
        item.imageUri,
        item.coupleId,
        item.userId
      );

      // Remove from queue on success
      const index = queue.findIndex(q => q.id === item.id);
      if (index > -1) {
        queue.splice(index, 1);
      }

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(error.message);

      // Mark as failed
      item.status = 'failed';
      item.retryCount++;
    }
  }

  await saveQueue(queue);
  return results;
};

/**
 * Retry failed uploads
 */
export const retryFailedUploads = async (options = {}) => {
  const maxRetries = options.maxRetries || MAX_RETRIES;
  const queue = await getQueue();

  const results = {
    retried: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  };

  const failedItems = queue.filter(
    item => item.status === 'failed' && item.retryCount < maxRetries
  );

  for (const item of failedItems) {
    // Exponential backoff if requested
    if (options.useExponentialBackoff) {
      const backoffMs = Math.pow(2, item.retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }

    results.retried++;

    try {
      await uploadReceipt(item.imageUri, item.coupleId, item.userId);
      await scanReceiptInBackground(item.imageUri, item.coupleId, item.userId);

      // Remove from queue
      const index = queue.findIndex(q => q.id === item.id);
      if (index > -1) {
        queue.splice(index, 1);
      }

      results.successful++;
    } catch (error) {
      item.retryCount++;
      results.failed++;
    }
  }

  // Count skipped items
  results.skipped = queue.filter(
    item => item.status === 'failed' && item.retryCount >= maxRetries
  ).length;

  await saveQueue(queue);
  return results;
};

/**
 * Get queue status
 */
export const getQueueStatus = async (options = {}) => {
  const queue = await getQueue();

  const status = {
    total: queue.length,
    pending: queue.filter(item => item.status === 'pending').length,
    uploading: queue.filter(item => item.status === 'uploading').length,
    failed: queue.filter(item => item.status === 'failed').length,
    completed: 0,
  };

  if (options.includeStats) {
    const attempts = queue.reduce((sum, item) => sum + (item.retryCount || 0), 0);
    status.totalAttempts = attempts;
    status.averageAttempts = queue.length > 0 ? attempts / queue.length : 0;

    const now = Date.now();
    const totalWait = queue.reduce((sum, item) => sum + (now - item.timestamp), 0);
    status.averageWaitTime = queue.length > 0 ? totalWait / queue.length : 0;
  }

  return status;
};

/**
 * Get all queued receipts
 */
export const getQueuedReceipts = async () => {
  return await getQueue();
};

/**
 * Clear entire queue
 */
export const clearQueue = async () => {
  await AsyncStorage.removeItem(QUEUE_KEY);
};

/**
 * Remove specific item from queue
 */
export const removeFromQueue = async (itemId) => {
  const queue = await getQueue();
  const filtered = queue.filter(item => item.id !== itemId);
  await saveQueue(filtered);
};

/**
 * Check if device is online
 */
export const isOnline = async () => {
  if (networkState) {
    return networkState === 'online';
  }

  const state = await NetInfo.fetch();
  return state.isConnected;
};

/**
 * Set network state (for testing)
 */
export const setNetworkState = (state) => {
  networkState = state;
};

/**
 * Initialize network listener
 */
export const initializeNetworkListener = async (options = {}) => {
  if (networkListener) {
    networkListener(); // Unsubscribe existing
  }

  networkListener = NetInfo.addEventListener(state => {
    const wasOffline = networkState === 'offline';
    networkState = state.isConnected ? 'online' : 'offline';

    // Auto-process queue when coming online
    if (wasOffline && state.isConnected && options.autoProcessOnOnline) {
      setTimeout(() => processUploadQueue(), 1000);
    }
  });

  return networkListener;
};

// Private helpers

async function getQueue() {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get queue:', error);
    // Reset corrupted queue
    await AsyncStorage.setItem(QUEUE_KEY, '[]');
    return [];
  }
}

async function saveQueue(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}
