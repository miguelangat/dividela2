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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';
import BudgetProgressCard from '../../components/BudgetProgressCard';
import * as expenseService from '../../services/expenseService';
import * as settlementService from '../../services/settlementService';
import { Ionicons } from '@expo/vector-icons';

export default function BudgetDashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const {
    categories,
    currentBudget,
    budgetProgress,
    loading: budgetLoading,
    isBudgetEnabled,
  } = useBudget();
  const { userDetails } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [recentSettlements, setRecentSettlements] = useState([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);

  const coupleId = userDetails?.coupleId;

  // Load recent settlements
  useEffect(() => {
    const loadRecentSettlements = async () => {
      if (!coupleId) return;

      try {
        setLoadingSettlements(true);
        const settlements = await settlementService.getSettlements(coupleId);
        // Get the 3 most recent settlements
        setRecentSettlements(settlements.slice(0, 3));
      } catch (error) {
        console.error('Error loading recent settlements:', error);
      } finally {
        setLoadingSettlements(false);
      }
    };

    loadRecentSettlements();
  }, [coupleId]);

  const handleRefresh = async () => {
    setRefreshing(true);

    // Reload settlements
    if (coupleId) {
      try {
        const settlements = await settlementService.getSettlements(coupleId);
        setRecentSettlements(settlements.slice(0, 3));
      } catch (error) {
        console.error('Error refreshing settlements:', error);
      }
    }

    // Budget progress updates automatically via context subscription
    setTimeout(() => setRefreshing(false), 500);
  };

  if (budgetLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('budget.dashboard.loadingDashboard')}</Text>
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
          <Text style={styles.emptyStateTitle}>{t('budget.dashboard.budgetDisabled')}</Text>
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

        {/* Recent Settlements Insights */}
        {recentSettlements.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('budget.dashboard.recentSettlements')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SettlementHistory')}>
                <Text style={styles.viewAllText}>{t('budget.dashboard.viewAll')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settlementsContainer}>
              {recentSettlements.map((settlement) => {
                const settledDate = settlement.settledAt?.toDate
                  ? settlement.settledAt.toDate()
                  : new Date(settlement.settledAt);
                const budgetSummary = settlement.budgetSummary || {};
                const topCategory = settlement.topCategories?.[0];

                return (
                  <TouchableOpacity
                    key={settlement.id}
                    style={styles.settlementCard}
                    onPress={() => navigation.navigate('SettlementDetail', { settlementId: settlement.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settlementHeader}>
                      <View style={styles.settlementDateContainer}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.settlementDate}>
                          {settledDate.toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.settlementAmount}>
                        <Text style={styles.settlementAmountText}>
                          ${settlement.amount?.toFixed(0) || 0}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.settlementDetails}>
                      <View style={styles.settlementStat}>
                        <Ionicons name="receipt-outline" size={14} color={COLORS.textTertiary} />
                        <Text style={styles.settlementStatText}>
                          {settlement.expensesSettledCount || 0} expenses
                        </Text>
                      </View>

                      {budgetSummary.includedInBudget && (
                        <View style={[
                          styles.budgetBadgeSmall,
                          budgetSummary.budgetRemaining >= 0 ? styles.budgetBadgeSuccess : styles.budgetBadgeError
                        ]}>
                          <Text style={[
                            styles.budgetBadgeText,
                            budgetSummary.budgetRemaining >= 0 ? styles.budgetBadgeTextSuccess : styles.budgetBadgeTextError
                          ]}>
                            {budgetSummary.budgetRemaining >= 0 ? 'Under Budget' : 'Over Budget'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {topCategory && (
                      <View style={styles.topCategorySmall}>
                        <Text style={styles.topCategoryIcon}>{topCategory.icon}</Text>
                        <Text style={styles.topCategoryText}>
                          Top: {topCategory.categoryName} (${topCategory.amount?.toFixed(0) || 0})
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

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

          <TouchableOpacity
            style={[styles.actionButton, styles.annualBudgetButton]}
            onPress={() => navigation.navigate('AnnualBudgetSetup')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>📅 Annual Budget</Text>
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
    flexGrow: 1,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  viewAllText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  settlementsContainer: {
    gap: SPACING.medium,
  },
  settlementCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  settlementDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settlementDate: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  settlementAmount: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.small,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadius.small,
  },
  settlementAmountText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  settlementDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginBottom: SPACING.small,
  },
  settlementStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settlementStatText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textTertiary,
  },
  budgetBadgeSmall: {
    paddingHorizontal: SPACING.small,
    paddingVertical: 3,
    borderRadius: SIZES.borderRadius.small,
  },
  budgetBadgeSuccess: {
    backgroundColor: COLORS.success + '15',
  },
  budgetBadgeError: {
    backgroundColor: COLORS.error + '15',
  },
  budgetBadgeText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
  },
  budgetBadgeTextSuccess: {
    color: COLORS.success,
  },
  budgetBadgeTextError: {
    color: COLORS.error,
  },
  topCategorySmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: SPACING.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  topCategoryIcon: {
    fontSize: 16,
  },
  topCategoryText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
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
