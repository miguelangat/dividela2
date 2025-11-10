// src/screens/main/BudgetDashboardScreen.js
// Dashboard screen showing budget progress and statistics

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBudget } from '../../contexts/BudgetContext';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';
import BudgetProgressCard from '../../components/BudgetProgressCard';
import * as expenseService from '../../services/expenseService';

export default function BudgetDashboardScreen({ navigation }) {
  const {
    categories,
    currentBudget,
    budgetProgress,
    loading: budgetLoading,
    isBudgetEnabled,
  } = useBudget();
  const { userDetails } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const coupleId = userDetails?.coupleId;

  const handleRefresh = () => {
    // Budget progress updates automatically via context subscription
    // Just provide visual feedback for pull-to-refresh
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  if (budgetLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  if (!isBudgetEnabled) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>📊</Text>
          <Text style={styles.emptyStateTitle}>Budget Tracking Disabled</Text>
          <Text style={styles.emptyStateText}>
            Enable budget tracking in setup to see your progress
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('BudgetSetup')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Go to Setup</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalBudget = budgetProgress?.totalBudget || 0;
  const totalSpent = budgetProgress?.totalSpent || 0;
  const remaining = budgetProgress?.remaining || 0;

  const categoryArray = Object.entries(categories).map(([key, category]) => ({
    key,
    ...category,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Budget Dashboard</Text>
          <Text style={styles.subtitle}>
            Track your spending against monthly budgets
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
            <Text style={styles.summaryLabel}>Total Budget</Text>
            <Text style={styles.summaryValue}>${totalBudget.toFixed(0)}</Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardWarning]}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryValue}>${totalSpent.toFixed(0)}</Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardSuccess]}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={styles.summaryValue}>${remaining.toFixed(0)}</Text>
          </View>
        </View>

        {/* Category Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Progress by Category</Text>

          <View style={styles.progressGrid}>
            {categoryArray.map((category) => {
              const progress = budgetProgress?.categoryProgress[category.key] || {
                budget: 0,
                spent: 0,
                remaining: 0,
                percentage: 0,
                status: 'normal',
              };

              return (
                <BudgetProgressCard
                  key={category.key}
                  category={category}
                  progress={progress}
                  style={styles.progressCard}
                />
              );
            })}
          </View>

          {categoryArray.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📁</Text>
              <Text style={styles.emptyStateText}>No categories yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add categories to start tracking your budget
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('BudgetSetup')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>⚙️ Setup Budgets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CategoryManager')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📁 Manage Categories</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.medium,
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: SPACING.medium,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  emptyStateText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.screenPadding,
    paddingBottom: SPACING.xxlarge,
  },
  header: {
    marginBottom: SPACING.large,
  },
  title: {
    ...COMMON_STYLES.heading,
    marginBottom: SPACING.small,
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: SPACING.small,
    marginBottom: SPACING.large,
  },
  summaryCard: {
    flex: 1,
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    alignItems: 'center',
  },
  summaryCardPrimary: {
    backgroundColor: COLORS.primary,
  },
  summaryCardWarning: {
    backgroundColor: '#f59e0b',
  },
  summaryCardSuccess: {
    backgroundColor: '#10b981',
  },
  summaryLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textWhite,
    opacity: 0.9,
    marginBottom: SPACING.tiny,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
  },
  section: {
    marginBottom: SPACING.large,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  progressGrid: {
    gap: SPACING.medium,
  },
  progressCard: {
    marginBottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxlarge,
  },
  emptyStateSubtext: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.medium,
  },
  actionButton: {
    flex: 1,
    ...COMMON_STYLES.secondaryButton,
  },
  actionButtonText: {
    ...COMMON_STYLES.secondaryButtonText,
  },
  primaryButton: {
    ...COMMON_STYLES.primaryButton,
    marginTop: SPACING.large,
    paddingHorizontal: SPACING.xlarge,
  },
  primaryButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
});
