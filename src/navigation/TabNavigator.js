// src/navigation/TabNavigator.js
// Bottom tab navigation for main app screens

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

// Main app screens
import HomeScreen from '../screens/main/HomeScreen';
import StatsScreen from '../screens/main/StatsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

// Budget screens
import BudgetDashboardScreen from '../screens/main/BudgetDashboardScreen';
import BudgetSetupScreen from '../screens/main/BudgetSetupScreen';
import CategoryManagerScreen from '../screens/main/CategoryManagerScreen';
import AnnualBudgetSetupScreen from '../screens/main/AnnualBudgetSetupScreen';

// Settlement screens
import SettlementHistoryScreen from '../screens/main/SettlementHistoryScreen';
import SettlementDetailScreen from '../screens/main/SettlementDetailScreen';

const Tab = createBottomTabNavigator();
const BudgetStack = createStackNavigator();
const SettlementStack = createStackNavigator();

// Budget Stack Navigator
function BudgetStackNavigator() {
  return (
    <BudgetStack.Navigator
      screenOptions={{
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
      <BudgetStack.Screen
        name="BudgetDashboard"
        component={BudgetDashboardScreen}
        options={{ title: 'Budget' }}
      />
      <BudgetStack.Screen
        name="BudgetSetup"
        component={BudgetSetupScreen}
        options={{ title: 'Budget Setup' }}
      />
      <BudgetStack.Screen
        name="CategoryManager"
        component={CategoryManagerScreen}
        options={{ title: 'Manage Categories' }}
      />
      <BudgetStack.Screen
        name="AnnualBudgetSetup"
        component={AnnualBudgetSetupScreen}
        options={{ title: 'Annual Budget' }}
      />
    </BudgetStack.Navigator>
  );
}

// Settlement Stack Navigator
function SettlementStackNavigator() {
  return (
    <SettlementStack.Navigator
      screenOptions={{
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
      <SettlementStack.Screen
        name="SettlementHistory"
        component={SettlementHistoryScreen}
        options={{ title: 'Settlement History' }}
      />
      <SettlementStack.Screen
        name="SettlementDetail"
        component={SettlementDetailScreen}
        options={{ title: 'Settlement Details' }}
      />
    </SettlementStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'SettlementsTab') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'BudgetTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'StatsTab') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'SettingsTab') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border || '#E5E5E5',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarLabelStyle: {
          ...FONTS.small,
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="SettlementsTab"
        component={SettlementStackNavigator}
        options={{
          tabBarLabel: 'Settlements',
        }}
      />
      <Tab.Screen
        name="BudgetTab"
        component={BudgetStackNavigator}
        options={{
          tabBarLabel: 'Budget',
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}
