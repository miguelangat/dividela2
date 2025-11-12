/**
 * SettlementHistoryScreen.js
 *
 * Displays a list of all past settlements with budget insights
 * Shows settlement amounts, dates, budget performance, and top categories
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { formatCurrency, formatDate } from '../../utils/calculations';
import * as settlementService from '../../services/settlementService';

export default function SettlementHistoryScreen({ navigation }) {
  const { user, userDetails } = useAuth();
  const { categories } = useBudget();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userDetails?.coupleId) {
      loadSettlements();
    }
  }, [userDetails?.coupleId]);

  const loadSettlements = async () => {
    try {
      setLoading(true);
      const fetchedSettlements = await settlementService.getSettlements(userDetails.coupleId);
      setSettlements(fetchedSettlements);
    } catch (error) {
      console.error('Error loading settlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettlements();
    setRefreshing(false);
  };

  const handleSettlementPress = settlement => {
    navigation.navigate('SettlementDetail', { settlementId: settlement.id });
  };

  const renderSettlementItem = ({ item }) => {
    const settledDate = item.settledAt?.toDate ? item.settledAt.toDate() : new Date(item.settledAt);
    const isPaidByUser = item.settledBy === user.uid;
    const budgetSummary = item.budgetSummary || {};
    const topCategory =
      item.topCategories && item.topCategories.length > 0 ? item.topCategories[0] : null;

    // Calculate budget status
    let budgetStatus = null;
    let budgetStatusColor = COLORS.textSecondary;
    if (budgetSummary.includedInBudget) {
      const remaining = budgetSummary.budgetRemaining || 0;
      if (remaining >= 0) {
        budgetStatus = `Under budget: ${formatCurrency(remaining)}`;
        budgetStatusColor = COLORS.success;
      } else {
        budgetStatus = `Over budget: ${formatCurrency(Math.abs(remaining))}`;
        budgetStatusColor = COLORS.error;
      }
    }

    return (
      <TouchableOpacity
        style={styles.settlementCard}
        onPress={() => handleSettlementPress(item)}
        activeOpacity={0.7}
      >
        {/* Header: Amount and Date */}
        <View style={styles.settlementHeader}>
          <View style={styles.amountContainer}>
            <Text style={styles.settlementAmount}>{formatCurrency(item.amount)}</Text>
            <View
              style={[
                styles.directionBadge,
                isPaidByUser ? styles.paidBadge : styles.receivedBadge,
              ]}
            >
              <Ionicons
                name={isPaidByUser ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={isPaidByUser ? COLORS.error : COLORS.success}
              />
              <Text
                style={[styles.directionText, isPaidByUser ? styles.paidText : styles.receivedText]}
              >
                {isPaidByUser ? 'You paid' : 'You received'}
              </Text>
            </View>
          </View>
          <Text style={styles.settlementDate}>{formatDate(settledDate)}</Text>
        </View>

        {/* Expense Count and Period */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="receipt-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statText}>
              {item.expensesSettledCount || 0} expense{item.expensesSettledCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {item.settlementPeriodDays > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>
                {item.settlementPeriodDays} day{item.settlementPeriodDays !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Budget Status */}
        {budgetStatus && (
          <View style={[styles.budgetBadge, { backgroundColor: budgetStatusColor + '15' }]}>
            <Ionicons
              name={budgetSummary.budgetRemaining >= 0 ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={budgetStatusColor}
            />
            <Text style={[styles.budgetStatusText, { color: budgetStatusColor }]}>
              {budgetStatus}
            </Text>
          </View>
        )}

        {/* Top Category */}
        {topCategory && (
          <View style={styles.topCategoryContainer}>
            <Text style={styles.topCategoryLabel}>Top spending:</Text>
            <Text style={styles.topCategoryIcon}>{topCategory.icon}</Text>
            <Text style={styles.topCategoryName}>{topCategory.categoryName}</Text>
            <Text style={styles.topCategoryAmount}>({formatCurrency(topCategory.amount)})</Text>
          </View>
        )}

        {/* Note */}
        {item.note && (
          <Text style={styles.noteText} numberOfLines={2}>
            Note: {item.note}
          </Text>
        )}

        {/* View Details Arrow */}
        <View style={styles.viewDetailsContainer}>
          <Text style={styles.viewDetailsText}>View details</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading settlements...</Text>
      </View>
    );
  }

  if (settlements.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="wallet-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>No Settlements Yet</Text>
        <Text style={styles.emptySubtitle}>
          When you settle up with your partner, your settlement history will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.headerStats}>
        <View style={styles.headerStatItem}>
          <Text style={styles.headerStatValue}>{settlements.length}</Text>
          <Text style={styles.headerStatLabel}>Total Settlements</Text>
        </View>
        <View style={styles.headerStatDivider} />
        <View style={styles.headerStatItem}>
          <Text style={styles.headerStatValue}>
            {formatCurrency(settlements.reduce((sum, s) => sum + (s.amount || 0), 0))}
          </Text>
          <Text style={styles.headerStatLabel}>Total Amount</Text>
        </View>
      </View>

      {/* Settlement List */}
      <FlatList
        style={styles.flatList}
        data={settlements}
        renderItem={renderSettlementItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  emptyTitle: {
    ...FONTS.heading,
    fontSize: 20,
    color: COLORS.text,
    marginTop: SPACING.large,
    marginBottom: SPACING.small,
  },
  emptySubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  flatList: {
    flex: 1,
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.large,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.primary,
    marginBottom: SPACING.tiny,
  },
  headerStatLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.base,
  },
  listContent: {
    padding: SPACING.base,
    paddingBottom: SPACING.large,
  },
  settlementCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settlementHeader: {
    marginBottom: SPACING.base,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
    gap: SPACING.small,
  },
  settlementAmount: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
  },
  directionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paidBadge: {
    backgroundColor: COLORS.error + '15',
  },
  receivedBadge: {
    backgroundColor: COLORS.success + '15',
  },
  directionText: {
    ...FONTS.small,
    fontWeight: '600',
  },
  paidText: {
    color: COLORS.error,
  },
  receivedText: {
    color: COLORS.success,
  },
  settlementDate: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    marginBottom: SPACING.small,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.small,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: SPACING.small,
  },
  budgetStatusText: {
    ...FONTS.small,
    fontWeight: '600',
  },
  topCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.small,
    paddingTop: SPACING.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  topCategoryLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  topCategoryIcon: {
    fontSize: 16,
  },
  topCategoryName: {
    ...FONTS.small,
    color: COLORS.text,
    fontWeight: '600',
  },
  topCategoryAmount: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  noteText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.small,
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.small,
    gap: 4,
  },
  viewDetailsText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
