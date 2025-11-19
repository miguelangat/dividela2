// src/navigation/AppNavigator.js
// Main navigation structure for the app

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { onboardingStorage } from '../utils/storage';
import { COLORS } from '../constants/theme';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import ConnectScreen from '../screens/auth/ConnectScreen';
import InviteScreen from '../screens/auth/InviteScreen';
import JoinScreen from '../screens/auth/JoinScreen';
import SuccessScreen from '../screens/auth/SuccessScreen';
import FiscalYearSetupScreen from '../screens/auth/FiscalYearSetupScreen';

// Onboarding
import OnboardingNavigator from './OnboardingNavigator';

// Main app screens
import TabNavigator from './TabNavigator';
import AddExpenseScreen from '../screens/main/AddExpenseScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, userDetails, loading } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [forceCheckCounter, setForceCheckCounter] = useState(0);
  const [isRestarting, setIsRestarting] = useState(false);
  const checkTimeoutRef = React.useRef(null);
  const navigationRef = useNavigationContainerRef();
  const hasNavigatedToOnboarding = useRef(false);

  // Debug logging
  console.log('AppNavigator - user:', user?.uid);
  console.log('AppNavigator - userDetails:', userDetails);
  console.log('AppNavigator - loading:', loading);
  console.log('AppNavigator - onboardingCompleted:', onboardingCompleted);

  // Check if budget onboarding has been completed
  useEffect(() => {
    checkOnboardingStatus();
  }, [user, userDetails?.coupleId, forceCheckCounter]);

  // Poll for onboarding status changes (for when completeOnboarding is called)
  // Using a more efficient polling strategy with debouncing
  useEffect(() => {
    if (!user || !userDetails?.coupleId) {
      return;
    }

    console.log('🔄 Setting up onboarding status polling (every 2 seconds)');

    // Set up interval to check onboarding status (in case it's updated)
    const interval = setInterval(() => {
      console.log('⏰ Polling tick - checking onboarding status...');
      // Only check if not already checking and not restarting (prevents race conditions)
      if (!isCheckingStatus && !isRestarting) {
        checkOnboardingStatus();
      } else {
        console.log('⏭️  Skipping check - already checking or restarting');
      }
    }, 2000); // Check every 2 seconds

    return () => {
      console.log('🛑 Cleaning up onboarding status polling');
      clearInterval(interval);
      // Clear any pending timeout on unmount
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [user, userDetails?.coupleId]); // Removed isCheckingStatus from dependencies!

  // Listen for storage events (in case completion happens in same session)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('onboarding_completed')) {
        console.log('🔔 Storage change detected! Force checking onboarding status...');
        setForceCheckCounter(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-navigate to onboarding modal when user has partner but hasn't completed onboarding
  useEffect(() => {
    if (!navigationRef.isReady()) return;
    if (!user || !userDetails?.partnerId) return;
    if (loading || checkingOnboarding || isRestarting) return; // Prevent race conditions during restart
    if (onboardingCompleted === null) return; // Still checking

    // Debug logging for state
    console.log('🔄 Effect #2 (Auto-navigation) state:', {
      onboardingCompleted,
      hasNavigatedToOnboarding: hasNavigatedToOnboarding.current,
      willOpenModal: !onboardingCompleted && !hasNavigatedToOnboarding.current,
      willCloseModal: onboardingCompleted && hasNavigatedToOnboarding.current,
      isRestarting,
    });

    // Navigate to onboarding modal if not completed and haven't navigated yet
    if (!onboardingCompleted && !hasNavigatedToOnboarding.current) {
      console.log('🎯 Auto-navigating to onboarding modal (tabs visible underneath)');
      hasNavigatedToOnboarding.current = true;
      setTimeout(() => {
        navigationRef.navigate('Onboarding');
      }, 100);
    }

    // Dismiss modal and navigate to home when onboarding completes
    if (onboardingCompleted && hasNavigatedToOnboarding.current) {
      console.log('🎉 Onboarding complete, dismissing modal and navigating to home');
      hasNavigatedToOnboarding.current = false;

      // Dismiss the onboarding modal and navigate to home tab
      if (navigationRef.canGoBack()) {
        // Modal is in stack, go back to dismiss it
        navigationRef.goBack();

        // Navigate to HomeTab after modal dismisses
        setTimeout(() => {
          navigationRef.navigate('MainTabs', {
            screen: 'HomeTab', // Navigate to home page where users add expenses
          });
        }, 100);
      } else {
        // Fallback: Navigate directly to MainTabs with HomeTab
        navigationRef.navigate('MainTabs', {
          screen: 'HomeTab',
        });
      }
    }
  }, [user, userDetails?.partnerId, onboardingCompleted, loading, checkingOnboarding, navigationRef]);

  // Listen for navigation to Onboarding with restartMode to force immediate state refresh
  useEffect(() => {
    if (!navigationRef.isReady()) return;

    const unsubscribe = navigationRef.addListener('state', () => {
      const currentRoute = navigationRef.getCurrentRoute();

      // Detect manual restart from Settings
      if (currentRoute?.name === 'Onboarding' && currentRoute?.params?.restartMode === true) {
        console.log('🔄 Restart mode detected! Forcing immediate state refresh...');

        // Set restarting flag to prevent polling interference
        setIsRestarting(true);

        // Reset the navigation flag to allow the onboarding to stay open
        hasNavigatedToOnboarding.current = true; // Mark as navigated so auto-nav doesn't interfere

        // Force immediate state update (don't wait for polling)
        setOnboardingCompleted(false);

        // Trigger a forced check to sync with storage
        setForceCheckCounter(prev => prev + 1);

        console.log('✅ State refreshed for restart');

        // Clear the restartMode param and isRestarting flag
        // Use setTimeout to avoid mutating during render
        setTimeout(() => {
          try {
            navigationRef.setParams({ restartMode: false });
            setIsRestarting(false); // Re-enable polling after restart completes
            console.log('✅ Restart flag cleared, polling re-enabled');
          } catch (error) {
            console.log('⚠️  Could not clear restartMode param:', error.message);
            setIsRestarting(false); // Clear flag even on error
          }
        }, 500); // Increased timeout for stability
      }
    });

    return unsubscribe;
  }, [navigationRef]);

  const checkOnboardingStatus = async () => {
    // Debounce: prevent multiple simultaneous checks
    if (isCheckingStatus) {
      console.log('⚠️  Already checking onboarding status, skipping...');
      return;
    }

    setIsCheckingStatus(true);
    console.log('🔍 Checking onboarding status...');

    try {
      if (!user || !userDetails?.coupleId) {
        console.log('❌ No user or coupleId, setting onboarding to null');
        setOnboardingCompleted(null);
        setCheckingOnboarding(false);
        return;
      }

      console.log(`📦 Checking AsyncStorage for key: onboarding_completed_${userDetails.coupleId}`);

      // Check if onboarding was completed or skipped using safe storage utility
      const completed = await onboardingStorage.getCompleted(userDetails.coupleId);

      console.log(`📦 AsyncStorage result: ${completed}`);
      console.log(`👤 userDetails.budgetOnboardingCompleted: ${userDetails?.budgetOnboardingCompleted}`);

      // Use AsyncStorage as the source of truth (not Firestore field)
      // The budgetOnboardingCompleted field in userDetails may be stale or undefined
      // AsyncStorage is managed by our onboarding flow and is reliable
      const completedFlag = completed;

      console.log(`✅ Final onboarding completed status: ${completedFlag}`);

      if (completedFlag && !onboardingCompleted) {
        console.log('🎉 ONBOARDING DETECTED AS COMPLETE! Updating state to navigate to MainTabs');
      }

      setOnboardingCompleted(completedFlag);
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      console.error('Error details:', error.message, error.stack);
      // Don't set to false on error - maintain current state to prevent unwanted navigation
      if (onboardingCompleted === null) {
        setOnboardingCompleted(false);
      }
    } finally {
      setCheckingOnboarding(false);
      // Use a timeout to reset the checking flag to prevent rapid successive calls
      checkTimeoutRef.current = setTimeout(() => {
        setIsCheckingStatus(false);
        console.log('✓ Check complete, ready for next poll');
      }, 100);
    }
  };

  // Show loading screen while checking auth state or onboarding status
  if (loading || checkingOnboarding) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
        }}
      >
        {!user ? (
          // Auth Stack - User not logged in
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
          </>
        ) : !userDetails?.partnerId ? (
          // Connect Stack - User logged in but no partner
          <>
            <Stack.Screen name="Connect" component={ConnectScreen} />
            <Stack.Screen name="Invite" component={InviteScreen} />
            <Stack.Screen name="Join" component={JoinScreen} />
            <Stack.Screen name="Success" component={SuccessScreen} />
            <Stack.Screen name="FiscalYearSetup" component={FiscalYearSetupScreen} />
          </>
        ) : (
          // Main App Stack - User has partner, always show MainTabs
          // Onboarding presented as modal overlay when not completed
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
              name="Onboarding"
              component={OnboardingNavigator}
              options={{
                presentation: 'transparentModal',
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' },
                cardOverlayEnabled: true,
                gestureEnabled: false, // Prevent dismissal by gesture
              }}
            />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              options={{
                presentation: 'modal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
