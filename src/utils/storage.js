// src/utils/storage.js
// Safe AsyncStorage wrapper with comprehensive error handling

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage error types
 */
export const StorageErrorType = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_KEY: 'INVALID_KEY',
  INVALID_VALUE: 'INVALID_VALUE',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Custom storage error class
 */
export class StorageError extends Error {
  constructor(type, message, originalError = null) {
    super(message);
    this.name = 'StorageError';
    this.type = type;
    this.originalError = originalError;
  }
}

/**
 * Categorize error type based on error message
 */
const categorizeError = (error) => {
  const message = error?.message?.toLowerCase() || '';

  if (message.includes('quota') || message.includes('storage full')) {
    return StorageErrorType.QUOTA_EXCEEDED;
  }
  if (message.includes('permission') || message.includes('denied')) {
    return StorageErrorType.PERMISSION_DENIED;
  }
  if (message.includes('key')) {
    return StorageErrorType.INVALID_KEY;
  }

  return StorageErrorType.UNKNOWN;
};

/**
 * Safely get item from AsyncStorage with error handling
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key not found or error occurs
 * @returns {Promise<*>} Retrieved value or default value
 */
export const safeGetItem = async (key, defaultValue = null) => {
  try {
    // Validate key
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new StorageError(
        StorageErrorType.INVALID_KEY,
        `Invalid storage key: "${key}"`
      );
    }

    const value = await AsyncStorage.getItem(key);

    // Return default if null
    if (value === null) {
      return defaultValue;
    }

    // Try to parse JSON, return raw value if parsing fails
    try {
      return JSON.parse(value);
    } catch (parseError) {
      // Not JSON, return raw string
      return value;
    }
  } catch (error) {
    const errorType = categorizeError(error);
    console.error(`[Storage] Error getting item "${key}":`, error);
    console.error(`[Storage] Error type: ${errorType}`);

    // Log additional context for debugging
    if (errorType === StorageErrorType.QUOTA_EXCEEDED) {
      console.error('[Storage] Storage quota exceeded - consider cleaning up old data');
    } else if (errorType === StorageErrorType.PERMISSION_DENIED) {
      console.error('[Storage] Permission denied - check app permissions');
    }

    // Return default value on error
    return defaultValue;
  }
};

/**
 * Safely set item to AsyncStorage with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {Promise<boolean>} Success status
 */
export const safeSetItem = async (key, value) => {
  try {
    // Validate key
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new StorageError(
        StorageErrorType.INVALID_KEY,
        `Invalid storage key: "${key}"`
      );
    }

    // Validate value
    if (value === undefined) {
      throw new StorageError(
        StorageErrorType.INVALID_VALUE,
        'Cannot store undefined value - use null instead'
      );
    }

    // Convert value to string
    let stringValue;
    if (typeof value === 'string') {
      stringValue = value;
    } else {
      try {
        stringValue = JSON.stringify(value);
      } catch (stringifyError) {
        throw new StorageError(
          StorageErrorType.INVALID_VALUE,
          `Cannot stringify value for key "${key}": ${stringifyError.message}`,
          stringifyError
        );
      }
    }

    // Check if value is too large (AsyncStorage has a ~2MB limit on some platforms)
    const sizeInBytes = new Blob([stringValue]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 1.5) {
      console.warn(`[Storage] Large value being stored (${sizeInMB.toFixed(2)}MB) for key "${key}"`);
    }

    await AsyncStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    const errorType = categorizeError(error);
    console.error(`[Storage] Error setting item "${key}":`, error);
    console.error(`[Storage] Error type: ${errorType}`);

    // Log additional context
    if (errorType === StorageErrorType.QUOTA_EXCEEDED) {
      console.error('[Storage] Storage quota exceeded - attempting cleanup');
      // Could trigger automatic cleanup here
      await cleanupOldEntries();
    }

    // Throw custom error for handling upstream
    throw new StorageError(
      errorType,
      `Failed to set item "${key}": ${error.message}`,
      error
    );
  }
};

/**
 * Safely remove item from AsyncStorage
 * @param {string} key - Storage key
 * @returns {Promise<boolean>} Success status
 */
export const safeRemoveItem = async (key) => {
  try {
    // Validate key
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new StorageError(
        StorageErrorType.INVALID_KEY,
        `Invalid storage key: "${key}"`
      );
    }

    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    const errorType = categorizeError(error);
    console.error(`[Storage] Error removing item "${key}":`, error);
    console.error(`[Storage] Error type: ${errorType}`);
    return false;
  }
};

/**
 * Safely get multiple items from AsyncStorage
 * @param {string[]} keys - Array of storage keys
 * @returns {Promise<Object>} Object with key-value pairs
 */
export const safeMultiGet = async (keys) => {
  try {
    // Validate keys
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new StorageError(
        StorageErrorType.INVALID_KEY,
        'Keys must be a non-empty array'
      );
    }

    const result = {};
    const items = await AsyncStorage.multiGet(keys);

    items.forEach(([key, value]) => {
      if (value !== null) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      }
    });

    return result;
  } catch (error) {
    console.error('[Storage] Error getting multiple items:', error);
    return {};
  }
};

/**
 * Get all keys from AsyncStorage
 * @returns {Promise<string[]>} Array of all keys
 */
export const getAllKeys = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys || [];
  } catch (error) {
    console.error('[Storage] Error getting all keys:', error);
    return [];
  }
};

/**
 * Clear all items from AsyncStorage
 * @returns {Promise<boolean>} Success status
 */
export const clearAll = async () => {
  try {
    await AsyncStorage.clear();
    console.log('[Storage] All items cleared');
    return true;
  } catch (error) {
    console.error('[Storage] Error clearing storage:', error);
    return false;
  }
};

/**
 * Get storage size information
 * @returns {Promise<Object>} Storage size info
 */
export const getStorageInfo = async () => {
  try {
    const keys = await getAllKeys();
    const items = await AsyncStorage.multiGet(keys);

    let totalSize = 0;
    const itemSizes = {};

    items.forEach(([key, value]) => {
      const size = value ? new Blob([value]).size : 0;
      itemSizes[key] = size;
      totalSize += size;
    });

    return {
      totalKeys: keys.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      itemSizes,
      largestItems: Object.entries(itemSizes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, size]) => ({
          key,
          size,
          sizeMB: (size / (1024 * 1024)).toFixed(4),
        })),
    };
  } catch (error) {
    console.error('[Storage] Error getting storage info:', error);
    return null;
  }
};

/**
 * Clean up old or large entries to free space
 * @param {number} maxAgeDays - Max age in days for timestamp-based entries
 * @returns {Promise<number>} Number of items removed
 */
export const cleanupOldEntries = async (maxAgeDays = 30) => {
  try {
    const keys = await getAllKeys();
    let removedCount = 0;
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const key of keys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (!value) continue;

        // Try to parse and check for timestamp
        try {
          const parsed = JSON.parse(value);
          if (parsed.timestamp) {
            const timestamp = new Date(parsed.timestamp).getTime();
            if (now - timestamp > maxAgeMs) {
              await AsyncStorage.removeItem(key);
              removedCount++;
              console.log(`[Storage] Removed old entry: ${key}`);
            }
          }
        } catch {
          // Not JSON or no timestamp, skip
        }
      } catch (error) {
        console.error(`[Storage] Error cleaning up key "${key}":`, error);
      }
    }

    console.log(`[Storage] Cleanup complete - removed ${removedCount} items`);
    return removedCount;
  } catch (error) {
    console.error('[Storage] Error during cleanup:', error);
    return 0;
  }
};

/**
 * Check if storage is available
 * @returns {Promise<boolean>} Availability status
 */
export const isStorageAvailable = async () => {
  try {
    const testKey = '__storage_test__';
    const testValue = 'test';

    await AsyncStorage.setItem(testKey, testValue);
    const retrieved = await AsyncStorage.getItem(testKey);
    await AsyncStorage.removeItem(testKey);

    return retrieved === testValue;
  } catch (error) {
    console.error('[Storage] Storage not available:', error);
    return false;
  }
};

/**
 * Onboarding-specific storage helpers
 */
export const onboardingStorage = {
  /**
   * Save onboarding completion status
   */
  setCompleted: async (coupleId) => {
    if (!coupleId) {
      throw new StorageError(StorageErrorType.INVALID_KEY, 'Couple ID is required');
    }
    const key = `onboarding_completed_${coupleId}`;
    return await safeSetItem(key, 'true');
  },

  /**
   * Get onboarding completion status
   */
  getCompleted: async (coupleId) => {
    if (!coupleId) {
      return false;
    }
    const key = `onboarding_completed_${coupleId}`;
    const value = await safeGetItem(key, 'false');
    return value === 'true' || value === true;
  },

  /**
   * Clear onboarding completion status
   */
  clearCompleted: async (coupleId) => {
    if (!coupleId) {
      return false;
    }
    const key = `onboarding_completed_${coupleId}`;
    return await safeRemoveItem(key);
  },

  /**
   * Save onboarding state for recovery
   */
  saveState: async (state) => {
    return await safeSetItem('onboarding_state', {
      ...state,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Get onboarding state
   */
  getState: async () => {
    return await safeGetItem('onboarding_state', null);
  },

  /**
   * Clear onboarding state
   */
  clearState: async () => {
    return await safeRemoveItem('onboarding_state');
  },
};

export default {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeMultiGet,
  getAllKeys,
  clearAll,
  getStorageInfo,
  cleanupOldEntries,
  isStorageAvailable,
  onboardingStorage,
  StorageError,
  StorageErrorType,
};
