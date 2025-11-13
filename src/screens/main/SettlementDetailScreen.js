/**
 * SettlementDetailScreen.js
 *
 * Displays comprehensive details of a single settlement
 * Shows full category breakdown, expense list, budget performance, and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { formatCurrency, formatDate } from '../../utils/calculations';
import * as settlementService from '../../services/settlementService';

export default function SettlementDetailScreen({ route, navigation }) {
  const { settlementId } = route.params;
  const { user, userDetails } = useAuth();
  const { categories } = useBudget();
  const [settlement, setSettlement] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSettlementDetails();
  }, [settlementId]);

  const loadSettlementDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const [settlementData, expenseData] = await Promise.all([
        settlementService.getSettlementById(settlementId),
        settlementService.getExpensesForSettlement(settlementId),
      ]);
      setSettlement(settlementData);
      setExpenses(expenseData);
    } catch (error) {
      console.error('Error loading settlement details:', error);
      setError(error.message || 'Failed to load settlement details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading settlement details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorTitle}>Unable to Load Settlement</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadSettlementDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!settlement) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorTitle}>Settlement Not Found</Text>
        <Text style={styles.errorText}>This settlement may have been deleted.</Text>
      </View>
    );
  }

  const settledDate = settlement.settledAt?.toDate
    ? settlement.settledAt.toDate()
    : new Date(settlement.settledAt);
  const isPaidByUser = settlement.settledBy === user.uid;
  const budgetSummary = settlement.budgetSummary || {};
  const categoryBreakdown = settlement.categoryBreakdown || {};
  const topCategories = settlement.topCategories || [];

  // Calculate budget status
  let budgetStatus = null;
  let budgetStatusColor = COLORS.textSecondary;
  let budgetPercentage = 0;
  if (budgetSummary.includedInBudget) {
    const remaining = budgetSummary.budgetRemaining || 0;
    budgetPercentage = budgetSummary.totalBudget > 0
      ? (budgetSummary.totalSpent / budgetSummary.totalBudget) * 100
      : 0;
    if (remaining >= 0) {
      budgetStatus = 'Under Budget';
      budgetStatusColor = COLORS.success;
    } else {
      budgetStatus = 'Over Budget';
      budgetStatusColor = COLORS.error;
    }
  }

  const renderExpenseItem = ({ item }) => {
    const expenseDate = item.date ? new Date(item.date) : null;
    const categoryKey = item.categoryKey || item.category || 'other';
    const category = categories[categoryKey];
    const isPaidByCurrentUser = item.paidBy === user.uid;

    return (
      <View style={styles.expenseItem}>
        <View style={styles.expenseLeft}>
          <Text style={styles.expenseIcon}>{category?.icon || '💡'}</Text>
          <View style={styles.expenseDetails}>
            <Text style={styles.expenseDescription}>{item.description || 'No description'}</Text>
            <Text style={styles.expenseMeta}>
              {category?.name || 'Other'} • {expenseDate ? formatDate(expenseDate) : 'Unknown date'}
            </Text>
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.expensePaidBy}>
            {isPaidByCurrentUser ? 'You paid' : 'Partner paid'}
          </Text>
        </View>
      </View>
    );
  };

  const renderCategoryItem = ({ item }) => {
    const [categoryKey, data] = item;
    const percentage = settlement.totalExpensesAmount > 0
      ? (data.totalAmount / settlement.totalExpensesAmount) * 100
      : 0;

    return (
      <View style={styles.categoryItem}>
        <View style={styles.categoryLeft}>
          <Text style={styles.categoryIcon}>{data.icon}</Text>
          <View style={styles.categoryDetails}>
            <Text style={styles.categoryName}>{data.categoryName}</Text>
            <Text style={styles.categoryCount}>
              {data.expenseCount} expense{data.expenseCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.categoryRight}>
          <Text style={styles.categoryAmount}>{formatCurrency(data.totalAmount)}</Text>
          <Text style={styles.categoryPercentage}>{percentage.toFixed(0)}%</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Settlement Amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(settlement.amount)}</Text>
          <View style={[styles.directionBadge, isPaidByUser ? styles.paidBadge : styles.receivedBadge]}>
            <Ionicons
              name={isPaidByUser ? 'arrow-up' : 'arrow-down'}
              size={18}
              color={isPaidByUser ? COLORS.error : COLORS.success}
            />
            <Text style={[styles.directionText, isPaidByUser ? styles.paidText : styles.receivedText]}>
              {isPaidByUser ? 'You paid' : 'You received'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{formatDate(settledDate)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="receipt" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>
              {settlement.expensesSettledCount || 0} expense{settlement.expensesSettledCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {settlement.settlementPeriodDays > 0 && (
          <View style={styles.periodContainer}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.periodText}>
              Settlement period: {settlement.settlementPeriodDays} day{settlement.settlementPeriodDays !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {settlement.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Note:</Text>
            <Text style={styles.noteText}>{settlement.note}</Text>
          </View>
        )}
      </View>

      {/* Budget Summary */}
      {budgetSummary.includedInBudget && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Performance</Text>
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <View style={[styles.budgetStatusBadge, { backgroundColor: budgetStatusColor + '15' }]}>
                <Ionicons
                  name={budgetSummary.budgetRemaining >= 0 ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={budgetStatusColor}
                />
                <Text style={[styles.budgetStatusText, { color: budgetStatusColor }]}>
                  {budgetStatus}
                </Text>
              </View>
              <Text style={styles.budgetPercentageText}>{budgetPercentage.toFixed(0)}%</Text>
            </View>

            <View style={styles.budgetProgressBar}>
              <View
                style={[
                  styles.budgetProgressFill,
                  {
                    width: `${Math.min(budgetPercentage, 100)}%`,
                    backgroundColor: budgetStatusColor,
                  },
                ]}
              />
            </View>

            <View style={styles.budgetStats}>
              <View style={styles.budgetStatItem}>
                <Text style={styles.budgetStatLabel}>Spent</Text>
                <Text style={styles.budgetStatValue}>
                  {formatCurrency(budgetSummary.totalSpent)}
                </Text>
              </View>
              <View style={styles.budgetStatItem}>
                <Text style={styles.budgetStatLabel}>Budget</Text>
                <Text style={styles.budgetStatValue}>
                  {formatCurrency(budgetSummary.totalBudget)}
                </Text>
              </View>
              <View style={styles.budgetStatItem}>
                <Text style={styles.budgetStatLabel}>
                  {budgetSummary.budgetRemaining >= 0 ? 'Remaining' : 'Over'}
                </Text>
                <Text style={[styles.budgetStatValue, { color: budgetStatusColor }]}>
                  {formatCurrency(Math.abs(budgetSummary.budgetRemaining))}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Spending Categories</Text>
          <View style={styles.topCategoriesContainer}>
            {topCategories.map((category, index) => (
              <View key={category.categoryKey} style={styles.topCategoryCard}>
                <View style={styles.topCategoryRank}>
                  <Text style={styles.topCategoryRankText}>#{index + 1}</Text>
                </View>
                <Text style={styles.topCategoryIcon}>{category.icon}</Text>
                <Text style={styles.topCategoryName}>{category.categoryName}</Text>
                <Text style={styles.topCategoryAmount}>{formatCurrency(category.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <View style={styles.categoryList}>
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
              .map((item) => (
                <View key={item[0]}>
                  {renderCategoryItem({ item })}
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Expense List */}
      {expenses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settled Expenses ({expenses.length})</Text>
          <View style={styles.expenseList}>
            {expenses.map((expense) => (
              <View key={expense.id}>
                {renderExpenseItem({ item: expense })}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.base,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.large,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.base,
  },
  errorTitle: {
    ...FONTS.heading,
    fontSize: 20,
    color: COLORS.error,
    marginTop: SPACING.large,
    marginBottom: SPACING.small,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.small,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: SPACING.large,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    borderRadius: 8,
  },
  retryButtonText: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.large,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  amountLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.tiny,
  },
  amountValue: {
    ...FONTS.heading,
    fontSize: 36,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  paidBadge: {
    backgroundColor: COLORS.error + '15',
  },
  receivedBadge: {
    backgroundColor: COLORS.success + '15',
  },
  directionText: {
    ...FONTS.body,
    fontWeight: '600',
  },
  paidText: {
    color: COLORS.error,
  },
  receivedText: {
    color: COLORS.success,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.base,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.base,
  },
  periodText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  noteContainer: {
    marginTop: SPACING.base,
    paddingTop: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  noteLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
  },
  noteText: {
    ...FONTS.body,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: SPACING.base,
  },
  sectionTitle: {
    ...FONTS.title,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  budgetCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  budgetStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  budgetStatusText: {
    ...FONTS.body,
    fontWeight: '600',
  },
  budgetPercentageText: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
  },
  budgetProgressBar: {
    width: '100%',
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.borderRadius.small,
    overflow: 'hidden',
    marginBottom: SPACING.base,
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: SIZES.borderRadius.small,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  budgetStatItem: {
    alignItems: 'center',
  },
  budgetStatLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
  },
  budgetStatValue: {
    ...FONTS.body,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  topCategoriesContainer: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  topCategoryCard: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  topCategoryRank: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  topCategoryRankText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
  topCategoryIcon: {
    fontSize: 32,
    marginBottom: SPACING.tiny,
  },
  topCategoryName: {
    ...FONTS.small,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.tiny,
    textAlign: 'center',
  },
  topCategoryAmount: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  categoryList: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  categoryCount: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    ...FONTS.body,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryPercentage: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  expenseList: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    flex: 1,
  },
  expenseIcon: {
    fontSize: 24,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDescription: {
    ...FONTS.body,
    color: COLORS.text,
  },
  expenseMeta: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    ...FONTS.body,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  expensePaidBy: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
