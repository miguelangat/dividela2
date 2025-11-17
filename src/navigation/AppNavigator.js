// src/navigation/AppNavigator.js
// Main navigation structure for the app

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  // Debug logging
  console.log('AppNavigator - user:', user?.uid);
  console.log('AppNavigator - userDetails:', userDetails);
  console.log('AppNavigator - loading:', loading);

  // Check if budget onboarding has been completed
  useEffect(() => {
    checkOnboardingStatus();
  }, [user, userDetails?.coupleId]);

  const checkOnboardingStatus = async () => {
    try {
      if (!user || !userDetails?.coupleId) {
        setOnboardingCompleted(null);
        setCheckingOnboarding(false);
        return;
      }

      // Check if onboarding was completed or skipped
      const key = `onboarding_completed_${userDetails.coupleId}`;
      const completed = await AsyncStorage.getItem(key);

      // Also check userDetails for budgetOnboardingCompleted flag
      const completedFlag = userDetails?.budgetOnboardingCompleted || completed === 'true';

      setOnboardingCompleted(completedFlag);
      console.log('AppNavigator - onboarding completed:', completedFlag);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setOnboardingCompleted(false);
    } finally {
      setCheckingOnboarding(false);
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
