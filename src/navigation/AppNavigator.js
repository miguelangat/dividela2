// src/navigation/AppNavigator.js
// Main navigation structure for the app
// Updated: Streamlined onboarding - partner required, then CoreSetup before main app

import React, { useState, useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { onboardingStorage } from '../utils/storage';
import { subscribeToCoupleSettings } from '../services/coupleSettingsService';
import { COLORS } from '../constants/theme';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ConnectScreen from '../screens/auth/ConnectScreen';
import InviteScreen from '../screens/auth/InviteScreen';
import JoinScreen from '../screens/auth/JoinScreen';
import SuccessScreen from '../screens/auth/SuccessScreen';
import FiscalYearSetupScreen from '../screens/auth/FiscalYearSetupScreen';
import CoreSetupScreen from '../screens/onboarding/CoreSetupScreen';

// Main app screens
import TabNavigator from './TabNavigator';
import AddExpenseScreen from '../screens/main/AddExpenseScreen';
import ImportExpensesScreen from '../screens/main/ImportExpensesScreen';
import PaywallScreen from '../screens/main/PaywallScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, userDetails, loading } = useAuth();
  const [coreSetupComplete, setCoreSetupComplete] = useState(null);
  const navigationRef = useNavigationContainerRef();

  // Subscribe to account settings for real-time updates (including coreSetupComplete)
  useEffect(() => {
    if (!user || !userDetails?.activeAccountId) {
      setCoreSetupComplete(null);
      return;
    }

    // Initial check from AsyncStorage for migration support
    const checkMigration = async () => {
      const oldCompleted = await onboardingStorage.getCompleted(userDetails.activeAccountId);
      if (oldCompleted) {
        setCoreSetupComplete(true);
      }
    };
    checkMigration();

    // Subscribe to real-time updates from Firestore
    const unsubscribe = subscribeToCoupleSettings(userDetails.activeAccountId, (settings) => {
      console.log('[AppNavigator] Account settings updated, coreSetupComplete:', settings?.coreSetupComplete);
      if (settings?.coreSetupComplete) {
        setCoreSetupComplete(true);
      } else {
        // Only set to false if not already true from migration check
        setCoreSetupComplete((prev) => prev === true ? true : false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, userDetails?.activeAccountId]);

  // Determine which stack to show (calculate early for useEffect)
  const showMainStack = !!(user && userDetails?.activeAccountId && coreSetupComplete);
  const showSetupStack = !!(user && userDetails?.activeAccountId && !coreSetupComplete);

  // Determine navigation key - forces complete re-mount when stack changes
  const navKey = showMainStack ? 'main' : showSetupStack ? 'setup' : 'auth';

  // Debug log current navigation state
  console.log('[AppNavigator] Render state:', {
    user: !!user,
    accountsCount: userDetails?.accounts?.length || 0,
    activeAccountId: userDetails?.activeAccountId,
    // Legacy fields (for backward compatibility logging)
    partnerId: userDetails?.partnerId,
    coupleId: userDetails?.coupleId,
    coreSetupComplete,
    loading,
    showMainStack,
    navKey,
  });

  // Show loading screen while checking auth state or core setup status
  if (loading || (user && userDetails?.activeAccountId && coreSetupComplete === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Determine remaining stack decisions
  const showAuthStack = !user;
  const showConnectStack = user && !userDetails?.activeAccountId;

  console.log('[AppNavigator] Stack decision:', { showAuthStack, showConnectStack, showSetupStack, showMainStack });

  return (
    <NavigationContainer ref={navigationRef} key={navKey}>
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
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : !userDetails?.activeAccountId ? (
          // Connect Stack - User logged in but no active account
          // User must create solo account OR pair with partner
          <>
            <Stack.Screen name="Connect" component={ConnectScreen} />
            <Stack.Screen name="Invite" component={InviteScreen} />
            <Stack.Screen name="Join" component={JoinScreen} />
            <Stack.Screen name="Success" component={SuccessScreen} />
            <Stack.Screen name="CoreSetup" component={CoreSetupScreen} />
            <Stack.Screen name="FiscalYearSetup" component={FiscalYearSetupScreen} />
          </>
        ) : !coreSetupComplete ? (
          // Setup Stack - User has active account but hasn't completed core setup
          <>
            <Stack.Screen name="CoreSetup" component={CoreSetupScreen} />
            <Stack.Screen name="FiscalYearSetup" component={FiscalYearSetupScreen} />
          </>
        ) : (
          // Main App Stack - User has active account and completed setup
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              options={{
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="ImportExpenses"
              component={ImportExpensesScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Import Expenses',
                headerStyle: {
                  backgroundColor: COLORS.background,
                },
                headerTintColor: COLORS.primary,
              }}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                title: 'Upgrade to Premium',
                headerStyle: {
                  backgroundColor: COLORS.background,
                },
                headerTintColor: COLORS.primary,
              }}
            />
            {/* Connect screens - for unpaired users who want to find new partner */}
            <Stack.Screen name="Connect" component={ConnectScreen} />
            <Stack.Screen name="Invite" component={InviteScreen} />
            <Stack.Screen name="Join" component={JoinScreen} />
            <Stack.Screen name="Success" component={SuccessScreen} />
            <Stack.Screen name="CoreSetup" component={CoreSetupScreen} />
            <Stack.Screen name="FiscalYearSetup" component={FiscalYearSetupScreen} />
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
