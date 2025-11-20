/**
 * Storage utilities for import settings and history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  IMPORT_SETTINGS: 'dividela_import_settings',
  IMPORT_HISTORY: 'dividela_import_history',
};

/**
 * Save import settings for future use
 *
 * @param {string} userId - User ID
 * @param {Object} settings - Import settings to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveImportSettings(userId, settings) {
  try {
    const key = `${STORAGE_KEYS.IMPORT_SETTINGS}_${userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving import settings:', error);
    return false;
  }
}

/**
 * Load saved import settings
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Saved settings or null
 */
export async function loadImportSettings(userId) {
  try {
    const key = `${STORAGE_KEYS.IMPORT_SETTINGS}_${userId}`;
    const settings = await AsyncStorage.getItem(key);
    return settings ? JSON.parse(settings) : null;
  } catch (error) {
    console.error('Error loading import settings:', error);
    return null;
  }
}

/**
 * Add entry to import history
 *
 * @param {string} userId - User ID
 * @param {Object} importRecord - Import record to add
 * @returns {Promise<boolean>} Success status
 */
export async function addImportHistory(userId, importRecord) {
  try {
    const key = `${STORAGE_KEYS.IMPORT_HISTORY}_${userId}`;
    const existing = await AsyncStorage.getItem(key);
    const history = existing ? JSON.parse(existing) : [];

    // Add new record at beginning
    history.unshift({
      ...importRecord,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 imports
    const trimmed = history.slice(0, 50);

    await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    return true;
  } catch (error) {
    console.error('Error adding import history:', error);
    return false;
  }
}

/**
 * Get import history
 *
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Import history
 */
export async function getImportHistory(userId, limit = 10) {
  try {
    const key = `${STORAGE_KEYS.IMPORT_HISTORY}_${userId}`;
    const history = await AsyncStorage.getItem(key);
    const records = history ? JSON.parse(history) : [];
    return records.slice(0, limit);
  } catch (error) {
    console.error('Error getting import history:', error);
    return [];
  }
}

/**
 * Clear import history
 *
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function clearImportHistory(userId) {
  try {
    const key = `${STORAGE_KEYS.IMPORT_HISTORY}_${userId}`;
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing import history:', error);
    return false;
  }
}

export default {
  saveImportSettings,
  loadImportSettings,
  addImportHistory,
  getImportHistory,
  clearImportHistory,
};
