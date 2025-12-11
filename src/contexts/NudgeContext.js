// src/contexts/NudgeContext.js
// Context for managing nudge/prompt states across the app
// Handles persistence of dismissed nudges in AsyncStorage

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

// Nudge types
export const NUDGE_TYPES = {
  BUDGET_SETUP: 'budget',
  PUSH_NOTIFICATIONS: 'push',
  PARTNER_INVITE: 'partner',
  FIRST_EXPENSE: 'firstExpense',
};

// Create the context
const NudgeContext = createContext({});

// Custom hook to use the nudge context
export const useNudges = () => {
  const context = useContext(NudgeContext);
  if (!context) {
    throw new Error('useNudges must be used within a NudgeProvider');
  }
  return context;
};

// Storage key generator
const getStorageKey = (nudgeType, userId) => `nudge_dismissed_${nudgeType}_${userId}`;

/**
 * NudgeProvider - Manages nudge visibility and persistence
 */
export const NudgeProvider = ({ children }) => {
  const { user, userDetails } = useAuth();
  const [dismissedNudges, setDismissedNudges] = useState({
    [NUDGE_TYPES.BUDGET_SETUP]: false,
    [NUDGE_TYPES.PUSH_NOTIFICATIONS]: false,
    [NUDGE_TYPES.PARTNER_INVITE]: false,
    [NUDGE_TYPES.FIRST_EXPENSE]: false,
  });
  const [loading, setLoading] = useState(true);

  // Load dismissed states from AsyncStorage when user changes
  useEffect(() => {
    loadDismissedStates();
  }, [user?.uid]);

  const loadDismissedStates = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const states = {};
      for (const nudgeType of Object.values(NUDGE_TYPES)) {
        const key = getStorageKey(nudgeType, user.uid);
        const value = await AsyncStorage.getItem(key);
        states[nudgeType] = value === 'true';
      }
      setDismissedNudges(states);
      console.log('[NudgeContext] Loaded dismissed states:', states);
    } catch (error) {
      console.error('[NudgeContext] Error loading dismissed states:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Dismiss a nudge and persist the state
   */
  const dismissNudge = useCallback(async (nudgeType) => {
    if (!user?.uid) {
      console.warn('[NudgeContext] Cannot dismiss nudge: no user');
      return;
    }

    if (!Object.values(NUDGE_TYPES).includes(nudgeType)) {
      console.warn('[NudgeContext] Invalid nudge type:', nudgeType);
      return;
    }

    try {
      const key = getStorageKey(nudgeType, user.uid);
      await AsyncStorage.setItem(key, 'true');
      setDismissedNudges(prev => ({
        ...prev,
        [nudgeType]: true,
      }));
      console.log('[NudgeContext] Dismissed nudge:', nudgeType);
    } catch (error) {
      console.error('[NudgeContext] Error dismissing nudge:', error);
    }
  }, [user?.uid]);

  /**
   * Reset a nudge (make it visible again)
   */
  const resetNudge = useCallback(async (nudgeType) => {
    if (!user?.uid) {
      console.warn('[NudgeContext] Cannot reset nudge: no user');
      return;
    }

    if (!Object.values(NUDGE_TYPES).includes(nudgeType)) {
      console.warn('[NudgeContext] Invalid nudge type:', nudgeType);
      return;
    }

    try {
      const key = getStorageKey(nudgeType, user.uid);
      await AsyncStorage.removeItem(key);
      setDismissedNudges(prev => ({
        ...prev,
        [nudgeType]: false,
      }));
      console.log('[NudgeContext] Reset nudge:', nudgeType);
    } catch (error) {
      console.error('[NudgeContext] Error resetting nudge:', error);
    }
  }, [user?.uid]);

  /**
   * Reset all nudges for current user
   */
  const resetAllNudges = useCallback(async () => {
    if (!user?.uid) return;

    try {
      for (const nudgeType of Object.values(NUDGE_TYPES)) {
        const key = getStorageKey(nudgeType, user.uid);
        await AsyncStorage.removeItem(key);
      }
      setDismissedNudges({
        [NUDGE_TYPES.BUDGET_SETUP]: false,
        [NUDGE_TYPES.PUSH_NOTIFICATIONS]: false,
        [NUDGE_TYPES.PARTNER_INVITE]: false,
        [NUDGE_TYPES.FIRST_EXPENSE]: false,
      });
      console.log('[NudgeContext] Reset all nudges');
    } catch (error) {
      console.error('[NudgeContext] Error resetting all nudges:', error);
    }
  }, [user?.uid]);

  /**
   * Check if a nudge should be shown
   * This is the primary method components should use
   */
  const shouldShowNudge = useCallback((nudgeType) => {
    if (loading) return false;
    if (!user?.uid) return false;
    return !dismissedNudges[nudgeType];
  }, [loading, user?.uid, dismissedNudges]);

  /**
   * Check if a specific nudge has been dismissed
   */
  const isNudgeDismissed = useCallback((nudgeType) => {
    return dismissedNudges[nudgeType] || false;
  }, [dismissedNudges]);

  const value = {
    // State
    dismissedNudges,
    loading,
    // Actions
    dismissNudge,
    resetNudge,
    resetAllNudges,
    // Helpers
    shouldShowNudge,
    isNudgeDismissed,
    // Constants
    NUDGE_TYPES,
  };

  return (
    <NudgeContext.Provider value={value}>
      {children}
    </NudgeContext.Provider>
  );
};

export default NudgeContext;
