// src/navigation/OnboardingNavigator.js
// Navigation for budget onboarding flow (simple and advanced modes)

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS, FONTS } from '../constants/theme';
import { OnboardingProvider } from '../contexts/OnboardingContext';

// Onboarding screens
import OnboardingIntroScreen from '../screens/onboarding/OnboardingIntroScreen';
import OnboardingSkipScreen from '../screens/onboarding/OnboardingSkipScreen';

// Simple mode screens
import SimpleChooseStyleScreen from '../screens/onboarding/simple/SimpleChooseStyleScreen';
import SimpleSmartBudgetScreen from '../screens/onboarding/simple/SimpleSmartBudgetScreen';
import SimpleFixedBudgetScreen from '../screens/onboarding/simple/SimpleFixedBudgetScreen';
import SimpleSuccessScreen from '../screens/onboarding/simple/SimpleSuccessScreen';

// Advanced mode screens
import AdvancedWelcomeScreen from '../screens/onboarding/advanced/AdvancedWelcomeScreen';
import AdvancedTimeframeScreen from '../screens/onboarding/advanced/AdvancedTimeframeScreen';
import AdvancedStrategyScreen from '../screens/onboarding/advanced/AdvancedStrategyScreen';
import AdvancedCategoriesScreen from '../screens/onboarding/advanced/AdvancedCategoriesScreen';
import AdvancedAllocationScreen from '../screens/onboarding/advanced/AdvancedAllocationScreen';
import AdvancedSavingsScreen from '../screens/onboarding/advanced/AdvancedSavingsScreen';
import AdvancedSuccessScreen from '../screens/onboarding/advanced/AdvancedSuccessScreen';

const Stack = createStackNavigator();

function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontSize: FONTS.sizes.title,
          fontWeight: FONTS.weights.semibold,
          color: COLORS.text,
        },
        headerBackTitleVisible: false,
      }}
    >
      {/* Entry point - Choose mode */}
      <Stack.Screen
        name="OnboardingIntro"
        component={OnboardingIntroScreen}
        options={{ title: 'Budget Setup' }}
      />

      {/* Skip confirmation */}
      <Stack.Screen
        name="OnboardingSkip"
        component={OnboardingSkipScreen}
        options={{ title: 'Skip Setup' }}
      />

      {/* Simple mode flow */}
      <Stack.Screen
        name="SimpleChooseStyle"
        component={SimpleChooseStyleScreen}
        options={{
          title: 'Choose Budget Style',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="SimpleSmartBudget"
        component={SimpleSmartBudgetScreen}
        options={{
          title: 'Smart Budget',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="SimpleFixedBudget"
        component={SimpleFixedBudgetScreen}
        options={{
          title: 'Fixed Budget',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="SimpleSuccess"
        component={SimpleSuccessScreen}
        options={{ title: 'Success' }}
      />

      {/* Advanced mode flow */}
      <Stack.Screen
        name="AdvancedWelcome"
        component={AdvancedWelcomeScreen}
        options={{ title: 'Annual Planning' }}
      />
      <Stack.Screen
        name="AdvancedTimeframe"
        component={AdvancedTimeframeScreen}
        options={{
          title: 'Timeframe',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AdvancedStrategy"
        component={AdvancedStrategyScreen}
        options={{
          title: 'Budget Strategy',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AdvancedCategories"
        component={AdvancedCategoriesScreen}
        options={{
          title: 'Categories',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AdvancedAllocation"
        component={AdvancedAllocationScreen}
        options={{
          title: 'Budget Allocation',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AdvancedSavings"
        component={AdvancedSavingsScreen}
        options={{
          title: 'Savings Goals',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AdvancedSuccess"
        component={AdvancedSuccessScreen}
        options={{ title: 'Success' }}
      />
    </Stack.Navigator>
  );
}

// Export with OnboardingProvider wrapper and modal container
export default function OnboardingNavigator() {
  return (
    <View style={styles.modalContainer}>
      <OnboardingProvider>
        <OnboardingStack />
      </OnboardingProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    // Add padding for bottom tabs - they should be visible underneath
    paddingBottom: Platform.select({
      ios: 85,      // iOS tab bar height
      android: 60,  // Android tab bar height
      web: 60,      // Web tab bar height
    }),
  },
});
