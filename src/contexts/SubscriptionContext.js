// src/contexts/SubscriptionContext.js
// Subscription context for managing premium features and subscription state

import React, { createContext, useState, useEffect, useContext } from 'react';
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

  // Initialize RevenueCat when user logs in
  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        console.log('SubscriptionContext: No user, skipping RevenueCat initialization');
        setLoading(false);
        setIsPremium(false);
        return;
      }

      try {
        setLoading(true);
        console.log('SubscriptionContext: Initializing RevenueCat...');

        // Initialize RevenueCat SDK
        const initResult = await initializeRevenueCat(user.uid);

        if (!initResult.success) {
          console.warn('RevenueCat initialization failed:', initResult.error);
          // Continue with free tier if RevenueCat fails
          setIsPremium(false);
          setLoading(false);
          return;
        }

        // Check current subscription status
        const status = await checkSubscriptionStatus(user.uid);
        setIsPremium(status.isPremium);
        setSubscriptionInfo({
          expirationDate: status.expirationDate,
        });

        // Load available offerings
        const availableOfferings = await getOfferings();
        setOfferings(availableOfferings);

        console.log('✅ SubscriptionContext initialized. Premium:', status.isPremium);
      } catch (err) {
        console.error('Error initializing subscription:', err);
        setError(err.message);
        // Default to free tier on error
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user]);

  // Subscribe to real-time subscription updates
  useEffect(() => {
    if (!user) return;

    console.log('SubscriptionContext: Setting up subscription listener');

    const unsubscribe = subscribeToSubscriptionUpdates(user.uid, ({ isPremium: premium }) => {
      console.log('SubscriptionContext: Subscription updated -', premium ? 'Premium' : 'Free');
      setIsPremium(premium);
    });

    return () => {
      console.log('SubscriptionContext: Cleaning up subscription listener');
      unsubscribe();
    };
  }, [user]);

  // Also sync from userDetails (Firebase) as a fallback
  useEffect(() => {
    if (userDetails?.subscriptionStatus) {
      const premiumFromFirebase = userDetails.subscriptionStatus === 'premium';
      // Only update if different to avoid unnecessary re-renders
      if (premiumFromFirebase !== isPremium) {
        console.log('SubscriptionContext: Syncing from Firebase -', premiumFromFirebase ? 'Premium' : 'Free');
        setIsPremium(premiumFromFirebase);
      }
    }
  }, [userDetails?.subscriptionStatus]);

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

      const result = await purchasePackage(packageToPurchase, user.uid);

      if (result.success) {
        setIsPremium(true);
        console.log('✅ Purchase successful!');
      }

      return result;
    } catch (err) {
      console.error('Purchase error:', err);
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

      const result = await restorePurchases(user.uid);

      if (result.success) {
        setIsPremium(result.isPremium);
        console.log('✅ Purchases restored!');
      }

      return result;
    } catch (err) {
      console.error('Restore error:', err);
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
      const status = await checkSubscriptionStatus(user.uid);
      setIsPremium(status.isPremium);
      setSubscriptionInfo({
        expirationDate: status.expirationDate,
      });
    } catch (err) {
      console.error('Error refreshing subscription:', err);
      setError(err.message);
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
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
