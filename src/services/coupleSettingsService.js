// src/services/coupleSettingsService.js
// Service for managing couple-specific settings including fiscal year configuration

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Default couple settings
 */
export const DEFAULT_COUPLE_SETTINGS = {
  fiscalYear: {
    type: 'calendar', // 'calendar' or 'custom'
    startMonth: 1, // January
    startDay: 1,
    currentFiscalYear: null, // Will be calculated
    fiscalYearLabel: null, // Will be calculated
  },
  budgetPreferences: {
    trackAnnual: true,
    trackMonthly: true,
    enableVariableMonthly: true,
    enableSavingsTargets: true,
    enableAnnualSettlements: true,
    budgetCurrency: 'USD',
    currencySymbol: '$',
    currencyLocale: 'en-US',
  },
  notifications: {
    monthlyBudgetAlert: true,
    annualBudgetAlert: true,
    fiscalYearEndReminder: true,
    savingsGoalMilestone: true,
    daysBeforeFiscalYearEnd: 30,
  },
  display: {
    defaultView: 'monthly', // 'monthly' or 'annual'
    showFiscalYearProgress: true,
    showSavingsOnHome: true,
  },
  recentExchangeRates: {
    // Store recent exchange rates for quick reuse
    // Format: 'FROM-TO': { rate: number, lastUsed: timestamp }
  },
  importPreferences: {
    dateFormat: 'auto', // 'auto', 'MM/DD/YYYY', 'DD/MM/YYYY'
    defaultCategory: 'other',
    enableDuplicateDetection: true,
    enableCategorySuggestions: true,
    autoRollbackOnFailure: true,
  },
};

/**
 * Get couple settings
 *
 * @param {string} coupleId - The couple ID
 * @returns {Object} Couple settings
 */
export const getCoupleSettings = async (coupleId) => {
  try {
    const settingsRef = doc(db, 'coupleSettings', coupleId);
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      // Return defaults if no settings exist yet
      return DEFAULT_COUPLE_SETTINGS;
    }

    return settingsDoc.data();
  } catch (error) {
    console.error('Error getting couple settings:', error);
    throw error;
  }
};

/**
 * Initialize couple settings (called during onboarding)
 *
 * @param {string} coupleId - The couple ID
 * @param {Object} customSettings - Custom settings to override defaults
 * @returns {Object} Created settings
 */
export const initializeCoupleSettings = async (coupleId, customSettings = {}) => {
  try {
    const settingsRef = doc(db, 'coupleSettings', coupleId);

    const settings = {
      ...DEFAULT_COUPLE_SETTINGS,
      ...customSettings,
      coupleId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(settingsRef, settings);

    console.log('✅ Couple settings initialized:', coupleId);
    return settings;
  } catch (error) {
    console.error('Error initializing couple settings:', error);
    throw error;
  }
};

/**
 * Update fiscal year settings
 *
 * @param {string} coupleId - The couple ID
 * @param {Object} fiscalYearSettings - New fiscal year settings
 * @returns {Object} Success status
 */
export const updateFiscalYearSettings = async (coupleId, fiscalYearSettings) => {
  try {
    const settingsRef = doc(db, 'coupleSettings', coupleId);

    // Check if document exists
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      // Update existing document
      await updateDoc(settingsRef, {
        fiscalYear: fiscalYearSettings,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new document with defaults and provided fiscal year settings
      await setDoc(settingsRef, {
        ...DEFAULT_COUPLE_SETTINGS,
        fiscalYear: fiscalYearSettings,
        coupleId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('✅ Fiscal year settings updated:', coupleId);
    return { success: true };
  } catch (error) {
    console.error('Error updating fiscal year settings:', error);
    throw error;
  }
};

/**
 * Update budget preferences
 *
 * @param {string} coupleId - The couple ID
 * @param {Object} budgetPreferences - New budget preferences
 * @returns {Object} Success status
 */
export const updateBudgetPreferences = async (coupleId, budgetPreferences) => {
  console.log('🔄 updateBudgetPreferences START');
  console.log('📦 coupleId:', coupleId);
  console.log('📦 budgetPreferences:', budgetPreferences);

  try {
    const settingsRef = doc(db, 'coupleSettings', coupleId);
    console.log('🔄 Getting settingsRef for:', coupleId);

    // Check if document exists
    const settingsDoc = await getDoc(settingsRef);
    console.log('📦 settingsDoc exists:', settingsDoc.exists());

    if (settingsDoc.exists()) {
      // Update existing document
      console.log('🔄 Document exists, updating...');
      console.log('📦 Current document data:', settingsDoc.data());

      await updateDoc(settingsRef, {
        budgetPreferences,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Document updated successfully');
    } else {
      // Create new document with defaults and provided budget preferences
      console.log('🔄 Document does not exist, creating with setDoc...');
      await setDoc(settingsRef, {
        ...DEFAULT_COUPLE_SETTINGS,
        budgetPreferences,
        coupleId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Document created successfully');
    }

    console.log('✅ Budget preferences updated:', coupleId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating budget preferences:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    throw error;
  }
};

/**
 * Update notification preferences
 *
 * @param {string} coupleId - The couple ID
 * @param {Object} notifications - New notification preferences
 * @returns {Object} Success status
 */
export const updateNotificationPreferences = async (coupleId, notifications) => {
  try {
    const settingsRef = doc(db, 'coupleSettings', coupleId);

    // Check if document exists
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      // Update existing document
      await updateDoc(settingsRef, {
        notifications,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new document with defaults and provided notifications
      await setDoc(settingsRef, {
        ...DEFAULT_COUPLE_SETTINGS,
        notifications,
        coupleId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('✅ Notification preferences updated:', coupleId);
    return { success: true };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

/**
 * Update display preferences
 *
 * @param {string} coupleId - The couple ID
 * @param {Object} display - New display preferences
 * @returns {Object} Success status
 */
export const updateDisplayPreferences = async (coupleId, display) => {
  try {
    const settingsRef = doc(db, 'coupleSettings', coupleId);

    // Check if document exists
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      // Update existing document
      await updateDoc(settingsRef, {
        display,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new document with defaults and provided display preferences
      await setDoc(settingsRef, {
        ...DEFAULT_COUPLE_SETTINGS,
        display,
        coupleId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('✅ Display preferences updated:', coupleId);
    return { success: true };
  } catch (error) {
    console.error('Error updating display preferences:', error);
    throw error;
  }
};

/**
 * Update import preferences
 *
 * @param {string} coupleId - The couple ID
 * @param {Object} importPreferences - New import preferences
 * @returns {Object} Success status
 */
export const updateImportPreferences = async (coupleId, importPreferences) => {
  try {
    const settingsRef = doc(db, 'coupleSettings', coupleId);

    // Check if document exists
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      // Update existing document
      await updateDoc(settingsRef, {
        importPreferences,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new document with defaults and provided import preferences
      await setDoc(settingsRef, {
        ...DEFAULT_COUPLE_SETTINGS,
        importPreferences,
        coupleId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('✅ Import preferences updated:', coupleId);
    return { success: true };
  } catch (error) {
    console.error('Error updating import preferences:', error);
    throw error;
  }
};

/**
 * Get import preferences only
 *
 * @param {string} coupleId - The couple ID
 * @returns {Object} Import preferences
 */
export const getImportPreferences = async (coupleId) => {
  try {
    const settings = await getCoupleSettings(coupleId);
    return settings.importPreferences || DEFAULT_COUPLE_SETTINGS.importPreferences;
  } catch (error) {
    console.error('Error getting import preferences:', error);
    throw error;
  }
};

/**
 * Update date format preference for imports
 *
 * @param {string} coupleId - The couple ID
 * @param {string} dateFormat - Date format ('auto', 'MM/DD/YYYY', 'DD/MM/YYYY')
 * @returns {Object} Success status
 */
export const updateDateFormatPreference = async (coupleId, dateFormat) => {
  try {
    const validFormats = ['auto', 'MM/DD/YYYY', 'DD/MM/YYYY'];
    if (!validFormats.includes(dateFormat)) {
      throw new Error(`Invalid date format. Must be one of: ${validFormats.join(', ')}`);
    }

    const settings = await getCoupleSettings(coupleId);

    const importPreferences = {
      ...settings.importPreferences,
      dateFormat,
    };

    return updateImportPreferences(coupleId, importPreferences);
  } catch (error) {
    console.error('Error updating date format preference:', error);
    throw error;
  }
};

/**
 * Get fiscal year configuration only
 *
 * @param {string} coupleId - The couple ID
 * @returns {Object} Fiscal year config
 */
export const getFiscalYearConfig = async (coupleId) => {
  try {
    const settings = await getCoupleSettings(coupleId);
    return settings.fiscalYear || DEFAULT_COUPLE_SETTINGS.fiscalYear;
  } catch (error) {
    console.error('Error getting fiscal year config:', error);
    throw error;
  }
};

/**
 * Set fiscal year to calendar year (Jan 1 - Dec 31)
 *
 * @param {string} coupleId - The couple ID
 * @returns {Object} Success status
 */
export const setCalendarYearMode = async (coupleId) => {
  const fiscalYearSettings = {
    type: 'calendar',
    startMonth: 1,
    startDay: 1,
  };

  return updateFiscalYearSettings(coupleId, fiscalYearSettings);
};

/**
 * Set fiscal year to custom period
 *
 * @param {string} coupleId - The couple ID
 * @param {number} startMonth - Start month (1-12)
 * @param {number} startDay - Start day (1-31)
 * @returns {Object} Success status
 */
export const setCustomFiscalYear = async (coupleId, startMonth, startDay) => {
  // Validate inputs using comprehensive validation
  const validation = validateFiscalYearSettings(startMonth, startDay);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  const fiscalYearSettings = {
    type: 'custom',
    startMonth,
    startDay,
  };

  return updateFiscalYearSettings(coupleId, fiscalYearSettings);
};

/**
 * Toggle annual budget tracking
 *
 * @param {string} coupleId - The couple ID
 * @param {boolean} enabled - Enable or disable
 * @returns {Object} Success status
 */
export const toggleAnnualBudgetTracking = async (coupleId, enabled) => {
  try {
    const settings = await getCoupleSettings(coupleId);

    const budgetPreferences = {
      ...settings.budgetPreferences,
      trackAnnual: enabled,
    };

    return updateBudgetPreferences(coupleId, budgetPreferences);
  } catch (error) {
    console.error('Error toggling annual budget tracking:', error);
    throw error;
  }
};

/**
 * Toggle savings targets feature
 *
 * @param {string} coupleId - The couple ID
 * @param {boolean} enabled - Enable or disable
 * @returns {Object} Success status
 */
export const toggleSavingsTargets = async (coupleId, enabled) => {
  try {
    const settings = await getCoupleSettings(coupleId);

    const budgetPreferences = {
      ...settings.budgetPreferences,
      enableSavingsTargets: enabled,
    };

    return updateBudgetPreferences(coupleId, budgetPreferences);
  } catch (error) {
    console.error('Error toggling savings targets:', error);
    throw error;
  }
};

/**
 * Check if annual budget tracking is enabled
 *
 * @param {string} coupleId - The couple ID
 * @returns {boolean} True if enabled
 */
export const isAnnualBudgetEnabled = async (coupleId) => {
  try {
    const settings = await getCoupleSettings(coupleId);
    return settings.budgetPreferences?.trackAnnual ?? true;
  } catch (error) {
    console.error('Error checking annual budget status:', error);
    return false;
  }
};

/**
 * Validate fiscal year settings
 *
 * @param {number} startMonth - Start month (1-12)
 * @param {number} startDay - Start day (1-31)
 * @returns {Object} Validation result
 */
export const validateFiscalYearSettings = (startMonth, startDay) => {
  const errors = [];

  if (startMonth < 1 || startMonth > 12) {
    errors.push('Start month must be between 1 and 12');
  }

  if (startDay < 1 || startDay > 31) {
    errors.push('Start day must be between 1 and 31');
  }

  // Check if day is valid for the month
  // Use a non-leap year to be conservative, or limit February to 28
  let maxDaysInMonth;
  if (startMonth === 2) {
    maxDaysInMonth = 28; // Always limit February to 28 to avoid leap year issues
  } else {
    maxDaysInMonth = new Date(2023, startMonth, 0).getDate(); // Use non-leap year
  }

  if (startDay > maxDaysInMonth) {
    errors.push(`${getMonthName(startMonth)} only has ${maxDaysInMonth} days`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get month name from number
 *
 * @param {number} month - Month number (1-12)
 * @returns {string} Month name
 */
const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
};

/**
 * Update primary currency for couple
 *
 * @param {string} coupleId - The couple ID
 * @param {string} currencyCode - Currency code (e.g., 'USD')
 * @param {string} currencySymbol - Currency symbol (e.g., '$')
 * @param {string} currencyLocale - Currency locale (e.g., 'en-US')
 * @returns {Object} Success status
 */
export const updatePrimaryCurrency = async (coupleId, currencyCode, currencySymbol, currencyLocale) => {
  console.log('🔄 updatePrimaryCurrency START');
  console.log('📦 Params:', { coupleId, currencyCode, currencySymbol, currencyLocale });

  try {
    console.log('🔄 Fetching current settings...');
    const settings = await getCoupleSettings(coupleId);
    console.log('📦 Current settings:', settings);
    console.log('📦 Current budgetPreferences:', settings.budgetPreferences);

    const budgetPreferences = {
      ...settings.budgetPreferences,
      budgetCurrency: currencyCode,
      currencySymbol,
      currencyLocale,
    };

    console.log('📦 New budgetPreferences:', budgetPreferences);
    console.log('🔄 Calling updateBudgetPreferences...');

    const result = await updateBudgetPreferences(coupleId, budgetPreferences);

    console.log('✅ Primary currency updated:', currencyCode);
    console.log('📦 Update result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in updatePrimaryCurrency:', error);
    console.error('❌ Error details:', error.message, error.code);
    throw error;
  }
};

/**
 * Get primary currency for couple
 *
 * @param {string} coupleId - The couple ID
 * @returns {Object} Currency info { code, symbol, locale }
 */
export const getPrimaryCurrency = async (coupleId) => {
  try {
    const settings = await getCoupleSettings(coupleId);
    return {
      code: settings.budgetPreferences?.budgetCurrency || 'USD',
      symbol: settings.budgetPreferences?.currencySymbol || '$',
      locale: settings.budgetPreferences?.currencyLocale || 'en-US',
    };
  } catch (error) {
    console.error('Error getting primary currency:', error);
    return { code: 'USD', symbol: '$', locale: 'en-US' };
  }
};

/**
 * Save recent exchange rate for quick reuse
 *
 * @param {string} coupleId - The couple ID
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {number} rate - Exchange rate
 * @returns {Object} Success status
 */
export const saveRecentExchangeRate = async (coupleId, fromCurrency, toCurrency, rate) => {
  try {
    const settingsRef = doc(db, 'coupleSettings', coupleId);
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      console.warn('Couple settings not found, cannot save exchange rate');
      return { success: false };
    }

    const currentSettings = settingsDoc.data();
    const recentRates = currentSettings.recentExchangeRates || {};

    // Create key for rate pair
    const rateKey = `${fromCurrency}-${toCurrency}`;

    // Update rates
    const updatedRates = {
      ...recentRates,
      [rateKey]: {
        rate,
        lastUsed: serverTimestamp(),
      },
    };

    await updateDoc(settingsRef, {
      recentExchangeRates: updatedRates,
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ Saved exchange rate: ${rateKey} = ${rate}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    throw error;
  }
};

/**
 * Get recent exchange rate for currency pair
 *
 * @param {string} coupleId - The couple ID
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Object|null} Rate info or null if not found
 */
export const getRecentExchangeRate = async (coupleId, fromCurrency, toCurrency) => {
  try {
    const settings = await getCoupleSettings(coupleId);
    const recentRates = settings.recentExchangeRates || {};
    const rateKey = `${fromCurrency}-${toCurrency}`;

    return recentRates[rateKey] || null;
  } catch (error) {
    console.error('Error getting recent exchange rate:', error);
    return null;
  }
};
