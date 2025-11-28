// src/services/subscriptionService.js
// Service for managing subscription and payment features via RevenueCat

import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// RevenueCat API Keys (to be configured in .env)
const REVENUECAT_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY || '',
};

// Feature entitlement IDs
export const ENTITLEMENT_IDS = {
  PREMIUM: 'premium',
};

// Product IDs (must match RevenueCat dashboard)
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'dividela_premium_monthly',
  PREMIUM_ANNUAL: 'dividela_premium_annual',
};

/**
 * Initialize RevenueCat SDK
 * Must be called once when the app starts
 */
export const initializeRevenueCat = async (userId) => {
  try {
    console.log('Initializing RevenueCat for user:', userId);

    // Get the appropriate API key for current platform
    let apiKey = '';
    if (Platform.OS === 'ios') {
      apiKey = REVENUECAT_KEYS.ios;
    } else if (Platform.OS === 'android') {
      apiKey = REVENUECAT_KEYS.android;
    } else {
      // Web platform
      apiKey = REVENUECAT_KEYS.web;
    }

    if (!apiKey) {
      console.warn('RevenueCat API key not configured for platform:', Platform.OS);
      // Allow tests to pass without API key
      if (process.env.NODE_ENV === 'test') {
        apiKey = 'test_api_key';
      } else {
        throw new Error('API key not configured');
      }
    }

    // Configure RevenueCat with user ID
    await Purchases.configure({
      apiKey,
      appUserID: userId, // Link RevenueCat to Firebase user
    });

    console.log('✅ RevenueCat initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
    throw error;
  }
};

/**
 * Get available subscription offerings
 */
export const getOfferings = async () => {
  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      console.warn('No current offerings available');
      return { current: null, all: [] };
    }

    console.log('Available offerings:', offerings.current.availablePackages);
    return offerings;
  } catch (error) {
    console.error('Error getting offerings:', error);
    throw error;
  }
};

/**
 * Purchase a subscription package
 */
export const purchasePackage = async (packageToPurchase, userId) => {
  try {
    console.log('Attempting to purchase package:', packageToPurchase.identifier);

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    console.log('✅ Purchase successful!');

    // Sync subscription status with Firebase
    await syncSubscriptionWithFirebase(customerInfo, userId);

    return {
      success: true,
      customerInfo,
    };
  } catch (error) {
    console.error('Error purchasing package:', error);

    // Handle user cancellation (check both userCancelled and code)
    if (error.userCancelled || error.code === 'PURCHASES_CANCELLED') {
      return {
        success: false,
        cancelled: true,
      };
    }

    return {
      success: false,
      cancelled: false,
      error: error.message,
    };
  }
};

/**
 * Check Firestore for manually granted premium status
 * This is used as a fallback when RevenueCat doesn't have subscription data
 */
export const checkFirestorePremiumStatus = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { isPremium: false, expirationDate: null };
    }

    const userData = userDoc.data();

    // Check if user has premium status in Firestore
    const isPremium = userData.subscriptionStatus === 'premium';

    // Check if subscription is still valid (not expired)
    let isValid = true;
    if (userData.subscriptionExpiresAt) {
      const expirationDate = userData.subscriptionExpiresAt.toDate();
      isValid = expirationDate > new Date();
    }

    return {
      isPremium: isPremium && isValid,
      expirationDate: userData.subscriptionExpiresAt?.toDate() || null,
      manuallyGranted: userData.manuallyGranted || false,
    };
  } catch (error) {
    console.error('Error checking Firestore premium status:', error);
    return { isPremium: false, expirationDate: null };
  }
};

/**
 * Check partner's premium status from Firestore
 * Used for couple premium sharing
 *
 * @param {string} partnerId - The partner's user ID
 * @returns {Promise<{isPremium: boolean, expirationDate: Date|null, source: string}>}
 */
export const checkPartnerPremiumStatus = async (partnerId) => {
  if (!partnerId) {
    return { isPremium: false, expirationDate: null, source: 'none' };
  }

  try {
    console.log('Checking partner premium status for:', partnerId);

    const partnerRef = doc(db, 'users', partnerId);
    const partnerDoc = await getDoc(partnerRef);

    if (!partnerDoc.exists()) {
      console.log('Partner document not found');
      return { isPremium: false, expirationDate: null, source: 'none' };
    }

    const partnerData = partnerDoc.data();

    // Check if partner has premium status
    const isPremium = partnerData.subscriptionStatus === 'premium';

    // Validate expiration
    let isValid = true;
    if (partnerData.subscriptionExpiresAt) {
      const expirationDate = partnerData.subscriptionExpiresAt.toDate();
      isValid = expirationDate > new Date();

      if (!isValid) {
        console.log('Partner subscription expired', { expirationDate });
      }
    }

    const finalPremium = isPremium && isValid;

    console.log('Partner premium check result:', {
      isPremium: finalPremium,
      subscriptionStatus: partnerData.subscriptionStatus,
      manuallyGranted: partnerData.manuallyGranted,
      expirationDate: partnerData.subscriptionExpiresAt?.toDate(),
    });

    return {
      isPremium: finalPremium,
      expirationDate: partnerData.subscriptionExpiresAt?.toDate() || null,
      source: partnerData.manuallyGranted ? 'partner_manual' : 'partner_revenuecat',
    };
  } catch (error) {
    console.error('Error checking partner premium status:', error);
    // Non-critical error - return false to not block own premium
    return { isPremium: false, expirationDate: null, source: 'error' };
  }
};

/**
 * Check current subscription status
 * Checks both RevenueCat and Firestore (for manually granted premium) in parallel
 */
export const checkSubscriptionStatus = async (userId) => {
  let revenueCatPremium = false;
  let firestorePremium = false;
  let expirationDate = null;

  // Check both sources in parallel
  const [revenueCatResult, firestoreResult] = await Promise.allSettled([
    // Check RevenueCat
    (async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;
        const expiration = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM]?.expirationDate;

        console.log('RevenueCat subscription status - Premium:', isPremium);

        // Sync to Firebase if has data
        if (isPremium) {
          await syncSubscriptionWithFirebase(customerInfo, userId);
        }

        return { isPremium, expirationDate: expiration, customerInfo, source: 'RevenueCat' };
      } catch (error) {
        console.error('RevenueCat check failed:', error);
        return { isPremium: false, expirationDate: null, customerInfo: null, source: 'RevenueCat', error };
      }
    })(),

    // Check Firestore
    checkFirestorePremiumStatus(userId)
  ]);

  // Process RevenueCat result
  if (revenueCatResult.status === 'fulfilled') {
    revenueCatPremium = revenueCatResult.value.isPremium;
    if (revenueCatPremium) {
      expirationDate = revenueCatResult.value.expirationDate;
    }
  }

  // Process Firestore result
  if (firestoreResult.status === 'fulfilled') {
    firestorePremium = firestoreResult.value.isPremium;
    if (!revenueCatPremium && firestorePremium) {
      expirationDate = firestoreResult.value.expirationDate;
      console.log('✅ Using manual premium grant from Firestore');
    }
  }

  // Premium if EITHER source says premium
  const isPremium = revenueCatPremium || firestorePremium;

  console.log('📊 Subscription status summary:', {
    revenueCat: revenueCatPremium,
    firestore: firestorePremium,
    final: isPremium,
    source: revenueCatPremium ? 'RevenueCat' : (firestorePremium ? 'Firestore' : 'None')
  });

  return {
    isPremium,
    customerInfo: revenueCatResult.status === 'fulfilled' ? revenueCatResult.value.customerInfo : null,
    expirationDate,
  };
};

/**
 * Restore previous purchases
 * Important for users who reinstall the app or switch devices
 */
export const restorePurchases = async (userId) => {
  try {
    console.log('Restoring purchases...');

    const { customerInfo } = await Purchases.restorePurchases();

    // Sync with Firebase
    await syncSubscriptionWithFirebase(customerInfo, userId);

    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;

    console.log('✅ Purchases restored. Premium:', isPremium);

    return {
      restored: isPremium,
      isPremium,
      customerInfo,
    };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return {
      restored: false,
      isPremium: false,
      error: error.message,
    };
  }
};

/**
 * Sync subscription status from RevenueCat to Firebase
 * This ensures Firebase always has the latest subscription state
 */
export const syncSubscriptionWithFirebase = async (customerInfo, userId) => {
  try {
    const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM];
    const isPremium = premiumEntitlement !== undefined;

    // Extract expiration date
    let expirationDate = null;
    if (premiumEntitlement?.expirationDate) {
      expirationDate = new Date(premiumEntitlement.expirationDate);
    }

    // Determine platform
    let platform = Platform.OS;
    if (premiumEntitlement?.store) {
      if (premiumEntitlement.store === 'APP_STORE') {
        platform = 'ios';
      } else if (premiumEntitlement.store === 'PLAY_STORE') {
        platform = 'android';
      } else {
        platform = 'web';
      }
    }

    // Prepare update data
    const updateData = {
      subscriptionStatus: isPremium ? 'premium' : 'free',
      subscriptionExpiresAt: expirationDate,
      subscriptionProductId: premiumEntitlement?.productIdentifier || null,
      subscriptionPlatform: platform,
      lastSyncedAt: new Date(),
    };

    // Update Firebase user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updateData);

    console.log('✅ Subscription synced to Firebase:', updateData);

    return { success: true };
  } catch (error) {
    console.error('Error syncing subscription to Firebase:', error);
    throw error;
  }
};

/**
 * Get subscription info for display
 */
export const getSubscriptionInfo = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM];

    if (!premiumEntitlement) {
      return {
        isPremium: false,
        status: 'free',
      };
    }

    return {
      isPremium: true,
      status: 'premium',
      expirationDate: premiumEntitlement.expirationDate,
      productId: premiumEntitlement.productIdentifier,
      willRenew: premiumEntitlement.willRenew,
      platform: premiumEntitlement.store,
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return {
      isPremium: false,
      status: 'free',
      error: error.message,
    };
  }
};

/**
 * Check if user has access to a specific feature
 * This is the main function to use for feature gating
 *
 * @param {string} featureId - The feature to check
 * @param {boolean} isPremium - Whether the user has premium status
 * @returns {boolean} - Whether the user has access to the feature
 */
export const hasFeatureAccess = (featureId, isPremium) => {
  // Define feature access rules
  const premiumFeatures = [
    'unlimited_budgets',
    'annual_view',
    'advanced_analytics',
    'export_data',
    'custom_categories',
    'receipt_photos',
    'receipt_scanning',     // OCR receipt scanning with AI
    'import_expenses',      // CSV/bank statement import
    'recurring_expenses',
    'relationship_insights',
  ];

  // Free features (always accessible)
  const freeFeatures = [
    'expense_tracking',
    'couple_pairing',
    'monthly_view',
    'basic_stats',
    'single_budget',
  ];

  if (freeFeatures.includes(featureId)) {
    return true;
  }

  if (premiumFeatures.includes(featureId)) {
    return isPremium;
  }

  // Unknown feature - default to requiring premium
  console.warn('Unknown feature ID:', featureId);
  return isPremium;
};

/**
 * Check if user can create another budget (feature gating logic)
 *
 * @param {number} currentBudgetCount - Current number of budgets
 * @param {boolean} isPremium - Whether the user has premium status
 * @returns {boolean} - Whether the user can create another budget
 */
export const canCreateBudget = (currentBudgetCount, isPremium) => {
  // Free tier: 3 budgets max
  // Premium: unlimited
  if (isPremium) {
    return true;
  }

  // Treat null/undefined as 0
  const budgetCount = currentBudgetCount || 0;

  return budgetCount < 3;
};

/**
 * Listen to subscription updates
 * Returns a cleanup function to unsubscribe
 */
export const subscribeToSubscriptionUpdates = (userId, callback) => {
  try {
    // RevenueCat provides a customer info update listener
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;

      console.log('Subscription status updated:', isPremium ? 'Premium' : 'Free');

      // Sync to Firebase
      syncSubscriptionWithFirebase(customerInfo, userId);

      // Call the callback with updated status
      callback({
        isPremium,
        customerInfo,
      });
    });

    // Return cleanup function
    return () => {
      // RevenueCat doesn't provide a remove listener method
      // The listener is automatically cleaned up when the app closes
      console.log('Subscription listener cleanup');
    };
  } catch (error) {
    console.error('Error setting up subscription listener:', error);
    return () => {};
  }
};
