// src/navigation/AppNavigator.js
// Main navigation structure for the app

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import ConnectScreen from '../screens/auth/ConnectScreen';
import InviteScreen from '../screens/auth/InviteScreen';
import JoinScreen from '../screens/auth/JoinScreen';
import SuccessScreen from '../screens/auth/SuccessScreen';

// Main app screens
import TabNavigator from './TabNavigator';
import AddExpenseScreen from '../screens/main/AddExpenseScreen';
import SettlementHistoryScreen from '../screens/main/SettlementHistoryScreen';
import SettlementDetailScreen from '../screens/main/SettlementDetailScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, userDetails, loading } = useAuth();

  // Debug logging
  console.log('AppNavigator - user:', user?.uid);
  console.log('AppNavigator - userDetails:', userDetails);
  console.log('AppNavigator - loading:', loading);

  // Show loading screen while checking auth state
  if (loading) {
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
        ) : (
          // Main App Stack - User logged in with partner
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
              name="SettlementHistory"
              component={SettlementHistoryScreen}
              options={{
                headerShown: true,
                title: 'Settlement History',
                headerStyle: {
                  backgroundColor: COLORS.background,
                  elevation: 0,
                  shadowOpacity: 0,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                },
                headerTintColor: COLORS.primary,
                headerTitleStyle: {
                  fontSize: 20,
                  fontWeight: '600',
                  color: COLORS.text,
                },
              }}
            />
            <Stack.Screen
              name="SettlementDetail"
              component={SettlementDetailScreen}
              options={{
                headerShown: true,
                title: 'Settlement Details',
                headerStyle: {
                  backgroundColor: COLORS.background,
                  elevation: 0,
                  shadowOpacity: 0,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                },
                headerTintColor: COLORS.primary,
                headerTitleStyle: {
                  fontSize: 20,
                  fontWeight: '600',
                  color: COLORS.text,
                },
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
