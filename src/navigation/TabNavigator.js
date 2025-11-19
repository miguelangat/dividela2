// src/navigation/TabNavigator.js
// Bottom tab navigation for main app screens

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS } from '../constants/theme';

// Main app screens
import HomeScreen from '../screens/main/HomeScreen';
import ChatScreen from '../screens/main/ChatScreen';
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
  const { t } = useTranslation();

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
        options={{ title: t('navigation.budgetDashboard') }}
      />
      <BudgetStack.Screen
        name="BudgetSetup"
        component={BudgetSetupScreen}
        options={{ title: t('navigation.budgetSetup') }}
      />
      <BudgetStack.Screen
        name="CategoryManager"
        component={CategoryManagerScreen}
        options={{ title: t('navigation.categoryManager') }}
      />
      <BudgetStack.Screen
        name="AnnualBudgetSetup"
        component={AnnualBudgetSetupScreen}
        options={{ title: t('navigation.annualBudget') }}
      />
    </BudgetStack.Navigator>
  );
}

// Settlement Stack Navigator
function SettlementStackNavigator() {
  const { t } = useTranslation();

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
        options={{ title: t('navigation.settlementHistory') }}
      />
      <SettlementStack.Screen
        name="SettlementDetail"
        component={SettlementDetailScreen}
        options={{ title: t('navigation.settlementDetails') }}
      />
    </SettlementStack.Navigator>
  );
}

export default function TabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ChatTab') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
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
          tabBarLabel: t('navigation.home'),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
        }}
      />
      <Tab.Screen
        name="SettlementsTab"
        component={SettlementStackNavigator}
        options={{
          tabBarLabel: t('navigation.settlements'),
        }}
      />
      <Tab.Screen
        name="BudgetTab"
        component={BudgetStackNavigator}
        options={{
          tabBarLabel: t('navigation.budget'),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          tabBarLabel: t('navigation.stats'),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('navigation.settings'),
        }}
      />
    </Tab.Navigator>
  );
}
