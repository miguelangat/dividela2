// src/components/FeatureGate.js
// Component to gate features behind premium subscription

import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * FeatureGate Component
 *
 * Wraps content that requires premium access.
 * Shows paywall if user doesn't have access.
 *
 * Usage:
 * <FeatureGate feature="unlimited_budgets" fallback={<PaywallScreen />}>
 *   <PremiumFeatureComponent />
 * </FeatureGate>
 */
export default function FeatureGate({
  feature,
  children,
  fallback,
  checkPartner = true, // Whether to check partner's subscription too
}) {
  const { isPremium, hasCoupleAccess } = useSubscription();
  const { userDetails } = useAuth();
  const [partnerDetails, setPartnerDetails] = React.useState(null);

  // Fetch partner details if needed
  React.useEffect(() => {
    const fetchPartner = async () => {
      if (checkPartner && userDetails?.partnerId) {
        const { getPartnerDetails } = require('../contexts/AuthContext');
        // This is a bit of a hack - ideally we'd pass this from parent
        // For now, we'll just check userDetails which should have partner info
      }
    };

    fetchPartner();
  }, [userDetails, checkPartner]);

  // Check if user has access
  // Either user is premium OR partner is premium (shared subscription)
  const hasAccess = React.useMemo(() => {
    if (isPremium) return true;

    if (checkPartner && userDetails?.partnerId) {
      // Check if either user or partner has premium
      return hasCoupleAccess(partnerDetails);
    }

    return false;
  }, [isPremium, checkPartner, userDetails, partnerDetails, hasCoupleAccess]);

  // Define free features that don't need premium
  const freeFeatures = [
    'expense_tracking',
    'couple_pairing',
    'monthly_view',
    'basic_stats',
    'single_budget',
  ];

  // If this is a free feature, always show it
  if (freeFeatures.includes(feature)) {
    return <>{children}</>;
  }

  // If user has access (premium or partner is premium), show content
  if (hasAccess) {
    return <>{children}</>;
  }

  // Otherwise, show fallback (paywall)
  return fallback || null;
}

/**
 * Hook version for programmatic access checking
 *
 * Usage:
 * const { hasAccess, isPremium } = useFeatureGate('unlimited_budgets');
 * if (hasAccess) {
 *   // Do something
 * }
 */
export function useFeatureGate(feature) {
  const { isPremium, hasCoupleAccess } = useSubscription();
  const { userDetails } = useAuth();

  const freeFeatures = [
    'expense_tracking',
    'couple_pairing',
    'monthly_view',
    'basic_stats',
    'single_budget',
  ];

  const hasAccess = React.useMemo(() => {
    // Free features always accessible
    if (freeFeatures.includes(feature)) {
      return true;
    }

    // Check if user is premium
    if (isPremium) return true;

    // Check if partner is premium (shared subscription)
    if (userDetails?.partnerId) {
      return hasCoupleAccess(userDetails);
    }

    return false;
  }, [feature, isPremium, userDetails, hasCoupleAccess]);

  return {
    hasAccess,
    isPremium,
    isLocked: !hasAccess,
  };
}
