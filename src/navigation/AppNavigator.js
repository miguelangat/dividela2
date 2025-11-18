// src/navigation/AppNavigator.js
// Main navigation structure for the app

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
  const checkTimeoutRef = React.useRef(null);

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
      // Only check if not already checking (prevents race conditions)
      if (!isCheckingStatus) {
        checkOnboardingStatus();
      } else {
        console.log('⏭️  Skipping check - already checking');
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

      // Also check userDetails for budgetOnboardingCompleted flag
      const completedFlag = userDetails?.budgetOnboardingCompleted || completed;

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
    <NavigationContainer>
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
          </>
        ) : !onboardingCompleted ? (
          // Onboarding Stack - User has partner but hasn't completed onboarding
          <>
            <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
          </>
        ) : (
          // Main App Stack - User logged in with partner and completed onboarding
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
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
