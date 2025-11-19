// src/services/subscriptionService.js
// Service for managing subscription and payment features via RevenueCat

import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
      return { success: false, error: 'API key not configured' };
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
    return { success: false, error: error.message };
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
      return null;
    }

    console.log('Available offerings:', offerings.current.availablePackages);
    return offerings.current;
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

    // Handle user cancellation
    if (error.userCancelled) {
      return {
        success: false,
        cancelled: true,
        error: 'Purchase cancelled',
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check current subscription status
 */
export const checkSubscriptionStatus = async (userId) => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    // Check if user has active premium entitlement
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;

    console.log('Subscription status - Premium:', isPremium);

    // Sync with Firebase
    await syncSubscriptionWithFirebase(customerInfo, userId);

    return {
      isPremium,
      customerInfo,
      expirationDate: customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM]?.expirationDate,
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    throw error;
  }
};

/**
 * Restore previous purchases
 * Important for users who reinstall the app or switch devices
 */
export const restorePurchases = async (userId) => {
  try {
    console.log('Restoring purchases...');

    const customerInfo = await Purchases.restorePurchases();

    // Sync with Firebase
    await syncSubscriptionWithFirebase(customerInfo, userId);

    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;

    console.log('✅ Purchases restored. Premium:', isPremium);

    return {
      success: true,
      isPremium,
      customerInfo,
    };
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sync subscription status from RevenueCat to Firebase
 * This ensures Firebase always has the latest subscription state
 */
const syncSubscriptionWithFirebase = async (customerInfo, userId) => {
  try {
    const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM];
    const isPremium = premiumEntitlement !== undefined;

    // Prepare update data
    const updateData = {
      subscriptionStatus: isPremium ? 'premium' : 'free',
      subscriptionExpiresAt: premiumEntitlement?.expirationDate || null,
      subscriptionProductId: premiumEntitlement?.productIdentifier || null,
      subscriptionPlatform: Platform.OS,
      lastSyncedAt: serverTimestamp(),
    };

    // Update Firebase user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updateData);

    console.log('✅ Subscription synced to Firebase:', updateData);

    return { success: true };
  } catch (error) {
    console.error('Error syncing subscription to Firebase:', error);
    return { success: false, error: error.message };
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
 */
export const hasFeatureAccess = async (featureId) => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;

    // Define feature access rules
    const premiumFeatures = [
      'unlimited_budgets',
      'annual_view',
      'advanced_analytics',
      'export_data',
      'custom_categories',
      'receipt_photos',
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
  } catch (error) {
    console.error('Error checking feature access:', error);
    // On error, default to free tier (safer)
    return false;
  }
};

/**
 * Check if user can create another budget (feature gating logic)
 */
export const canCreateBudget = async (currentBudgetCount) => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_IDS.PREMIUM] !== undefined;

    // Free tier: 1 budget max
    // Premium: unlimited
    if (isPremium) {
      return {
        canCreate: true,
        isPremium: true,
      };
    }

    return {
      canCreate: currentBudgetCount < 1,
      isPremium: false,
      limitReached: currentBudgetCount >= 1,
    };
  } catch (error) {
    console.error('Error checking budget creation:', error);
    return {
      canCreate: false,
      error: error.message,
    };
  }
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
