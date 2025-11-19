// src/contexts/SubscriptionContext.js
// Subscription context for managing premium features and subscription state

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  initializeRevenueCat,
  checkSubscriptionStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasFeatureAccess,
  canCreateBudget,
  subscribeToSubscriptionUpdates,
} from '../services/subscriptionService';

// Constants
const SUBSCRIPTION_CACHE_KEY = '@dividela:subscription_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

// Debug mode (enable for detailed logging)
const DEBUG_MODE = __DEV__; // Only in development

// Debug logger
const debugLog = (message, data = null) => {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString();
    console.log(`[SubscriptionContext ${timestamp}]`, message, data || '');
  }
};

// Error logger (always logs)
const errorLog = (message, error = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[SubscriptionContext ${timestamp}]`, message, error || '');
};

// Cache helpers
const saveToCache = async (data) => {
  try {
    const cacheData = {
      ...data,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(cacheData));
    debugLog('Subscription status cached', cacheData);
  } catch (error) {
    errorLog('Failed to cache subscription status', error);
  }
};

const loadFromCache = async () => {
  try {
    const cached = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - data.cachedAt;

    if (age > CACHE_EXPIRY_MS) {
      debugLog('Cache expired', { age, expiry: CACHE_EXPIRY_MS });
      return null;
    }

    debugLog('Loaded from cache', { age, data });
    return data;
  } catch (error) {
    errorLog('Failed to load cache', error);
    return null;
  }
};

const clearCache = async () => {
  try {
    await AsyncStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    debugLog('Cache cleared');
  } catch (error) {
    errorLog('Failed to clear cache', error);
  }
};

// Retry helper with exponential backoff
const retryWithBackoff = async (fn, maxAttempts = MAX_RETRY_ATTEMPTS, delay = RETRY_DELAY_MS) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        debugLog(`Retry successful on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      const waitTime = delay * Math.pow(2, attempt - 1);
      debugLog(`Attempt ${attempt} failed, retrying in ${waitTime}ms`, error.message);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Create the context
const SubscriptionContext = createContext({});

// Custom hook to use the subscription context
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Subscription Provider Component
export const SubscriptionProvider = ({ children }) => {
  const { user, userDetails } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Refs for tracking state
  const isInitialized = useRef(false);
  const appState = useRef(AppState.currentState);
  const syncInProgress = useRef(false);

  // Initialize RevenueCat when user logs in
  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        debugLog('No user, clearing state');
        setLoading(false);
        setIsPremium(false);
        setIsOffline(false);
        isInitialized.current = false;
        await clearCache();
        return;
      }

      if (isInitialized.current) {
        debugLog('Already initialized, skipping');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        debugLog('Starting initialization for user:', user.uid);

        // Step 1: Try to load from cache first (instant feedback)
        const cached = await loadFromCache();
        if (cached) {
          debugLog('Using cached subscription status');
          setIsPremium(cached.isPremium || false);
          setSubscriptionInfo(cached.subscriptionInfo || null);
          setLastSyncTime(cached.cachedAt);
          // Continue to sync in background
        }

        // Step 2: Initialize RevenueCat with retry
        const initResult = await retryWithBackoff(async () => {
          return await initializeRevenueCat(user.uid);
        });

        if (!initResult.success) {
          errorLog('RevenueCat initialization failed', initResult.error);
          setIsOffline(true);
          // Use cached value if available, otherwise default to free
          if (!cached) {
            setIsPremium(false);
          }
          setLoading(false);
          return;
        }

        // Step 3: Check subscription status with retry
        const status = await retryWithBackoff(async () => {
          return await checkSubscriptionStatus(user.uid);
        });

        setIsPremium(status.isPremium);
        setSubscriptionInfo({
          expirationDate: status.expirationDate,
        });
        setLastSyncTime(Date.now());
        setIsOffline(false);

        // Cache the result
        await saveToCache({
          isPremium: status.isPremium,
          subscriptionInfo: { expirationDate: status.expirationDate },
        });

        // Step 4: Load offerings (non-critical, don't fail on error)
        try {
          const availableOfferings = await getOfferings();
          setOfferings(availableOfferings);
        } catch (offerError) {
          errorLog('Failed to load offerings (non-critical)', offerError);
        }

        isInitialized.current = true;
        debugLog('✅ Initialization complete', { isPremium: status.isPremium });
      } catch (err) {
        errorLog('Initialization error', err);
        setError(err.message);
        setIsOffline(true);

        // Fallback to cache or free tier
        const cached = await loadFromCache();
        if (cached) {
          debugLog('Using cached data after error');
          setIsPremium(cached.isPremium || false);
        } else {
          debugLog('No cache available, defaulting to free tier');
          setIsPremium(false);
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user]);

  // Subscribe to real-time subscription updates
  useEffect(() => {
    if (!user) return;

    debugLog('Setting up subscription listener');

    const unsubscribe = subscribeToSubscriptionUpdates(user.uid, async ({ isPremium: premium }) => {
      debugLog('Subscription updated via listener', { isPremium: premium });
      setIsPremium(premium);
      // Update cache
      await saveToCache({
        isPremium: premium,
        subscriptionInfo,
      });
    });

    return () => {
      debugLog('Cleaning up subscription listener');
      unsubscribe();
    };
  }, [user, subscriptionInfo]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    if (!user) return;

    const reconcileSubscription = async () => {
      if (syncInProgress.current) {
        debugLog('Sync already in progress, skipping reconciliation');
        return;
      }

      try {
        syncInProgress.current = true;
        debugLog('App came to foreground, reconciling subscription');

        const status = await retryWithBackoff(async () => {
          return await checkSubscriptionStatus(user.uid);
        }, 2); // Only 2 retries for foreground sync

        const hasChanged = status.isPremium !== isPremium;

        if (hasChanged) {
          debugLog('Subscription status changed', {
            old: isPremium,
            new: status.isPremium
          });
          setIsPremium(status.isPremium);
          setSubscriptionInfo({ expirationDate: status.expirationDate });

          // Update cache
          await saveToCache({
            isPremium: status.isPremium,
            subscriptionInfo: { expirationDate: status.expirationDate },
          });
        } else {
          debugLog('Subscription status unchanged');
        }

        setLastSyncTime(Date.now());
        setIsOffline(false);
      } catch (error) {
        errorLog('Failed to reconcile subscription on foreground', error);
        setIsOffline(true);
        // Keep current state, don't revert to free
      } finally {
        syncInProgress.current = false;
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      debugLog('App state changed', { from: appState.current, to: nextAppState });

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground
        reconcileSubscription();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, isPremium]);

  // Also sync from userDetails (Firebase) as a fallback
  useEffect(() => {
    if (userDetails?.subscriptionStatus) {
      const premiumFromFirebase = userDetails.subscriptionStatus === 'premium';
      // Check for expiration
      const isExpired = userDetails.subscriptionExpiresAt &&
                       new Date(userDetails.subscriptionExpiresAt.toDate()) < new Date();

      const shouldBePremium = premiumFromFirebase && !isExpired;

      // Only update if different to avoid unnecessary re-renders
      if (shouldBePremium !== isPremium) {
        debugLog('Syncing from Firebase', {
          status: premiumFromFirebase,
          isExpired,
          shouldBePremium
        });
        setIsPremium(shouldBePremium);
      }
    }
  }, [userDetails?.subscriptionStatus, userDetails?.subscriptionExpiresAt, isPremium]);

  /**
   * Purchase a subscription package
   */
  const purchase = async (packageToPurchase) => {
    try {
      if (!user) {
        throw new Error('Must be logged in to purchase');
      }

      setError(null);
      setLoading(true);
      debugLog('Starting purchase', { package: packageToPurchase.identifier });

      const result = await purchasePackage(packageToPurchase, user.uid);

      if (result.success) {
        setIsPremium(true);
        setLastSyncTime(Date.now());
        debugLog('✅ Purchase successful!');

        // Update cache immediately
        await saveToCache({
          isPremium: true,
          subscriptionInfo: {
            expirationDate: result.customerInfo?.expirationDate,
          },
        });
      } else if (result.cancelled) {
        debugLog('Purchase cancelled by user');
      } else {
        errorLog('Purchase failed', result.error);
      }

      return result;
    } catch (err) {
      errorLog('Purchase error', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restore previous purchases
   */
  const restore = async () => {
    try {
      if (!user) {
        throw new Error('Must be logged in to restore purchases');
      }

      setError(null);
      setLoading(true);
      debugLog('Restoring purchases');

      const result = await retryWithBackoff(async () => {
        return await restorePurchases(user.uid);
      }, 2); // Only 2 retries for restore

      if (result.success) {
        setIsPremium(result.isPremium);
        setLastSyncTime(Date.now());
        debugLog('✅ Purchases restored!', { isPremium: result.isPremium });

        // Update cache
        await saveToCache({
          isPremium: result.isPremium,
          subscriptionInfo: result.customerInfo,
        });
      }

      return result;
    } catch (err) {
      errorLog('Restore error', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user has access to a specific feature
   */
  const hasAccess = async (featureId) => {
    // If not logged in, no premium features
    if (!user) return false;

    // Check via RevenueCat service
    return await hasFeatureAccess(featureId);
  };

  /**
   * Check if user has premium subscription
   */
  const checkPremium = () => {
    return isPremium;
  };

  /**
   * Check if user can create another budget
   */
  const checkCanCreateBudget = async (currentBudgetCount) => {
    if (!user) return { canCreate: false };

    return await canCreateBudget(currentBudgetCount);
  };

  /**
   * Refresh subscription status
   */
  const refresh = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      debugLog('Refreshing subscription status');

      const status = await retryWithBackoff(async () => {
        return await checkSubscriptionStatus(user.uid);
      }, 2);

      setIsPremium(status.isPremium);
      setSubscriptionInfo({
        expirationDate: status.expirationDate,
      });
      setLastSyncTime(Date.now());
      setIsOffline(false);

      // Update cache
      await saveToCache({
        isPremium: status.isPremium,
        subscriptionInfo: { expirationDate: status.expirationDate },
      });

      debugLog('Subscription refreshed', { isPremium: status.isPremium });
    } catch (err) {
      errorLog('Error refreshing subscription', err);
      setError(err.message);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Show paywall (helper to track when to show upgrade prompts)
   */
  const showPaywall = (feature) => {
    console.log('Paywall triggered for feature:', feature);
    // This can be extended to show analytics or custom behavior
    return {
      shouldShow: !isPremium,
      feature,
    };
  };

  /**
   * Get partner's premium status
   * If partner is premium, both users get premium features (shared subscription)
   */
  const checkPartnerPremium = async (partnerDetails) => {
    if (!partnerDetails) return false;

    return partnerDetails.subscriptionStatus === 'premium';
  };

  /**
   * Check if either user or partner has premium
   * This enables shared subscription for couples
   */
  const hasCoupleAccess = (partnerDetails) => {
    // Check if current user is premium
    if (isPremium) return true;

    // Check if partner is premium
    if (partnerDetails?.subscriptionStatus === 'premium') {
      return true;
    }

    return false;
  };

  // Value provided to consumers
  const value = {
    isPremium,
    loading,
    error,
    offerings,
    subscriptionInfo,
    purchase,
    restore,
    hasAccess,
    checkPremium,
    checkCanCreateBudget,
    refresh,
    showPaywall,
    checkPartnerPremium,
    hasCoupleAccess,
    // Debug/monitoring properties
    isOffline,
    lastSyncTime,
    debugMode: DEBUG_MODE,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
