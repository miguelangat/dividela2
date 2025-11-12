/**
 * StatsScreen.js
 *
 * Comprehensive analytics dashboard displaying:
 * - Total expenses summary with filtering
 * - Detailed expense list with settlement status
 * - Category breakdown with percentages
 * - Advanced filtering (date range, category, status, payer)
 * - CSV export functionality
 * - Sorting and grouping options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import {
  calculateTotalExpenses,
  calculateExpensesByCategory,
  calculateUserShare,
  formatCurrency,
  formatDate,
} from '../../utils/calculations';
import {
  applyAllFilters,
  sortExpenses,
  groupExpensesByMonth,
  groupExpensesByCategory,
  groupExpensesBySettlementStatus,
  generateReportSummary,
  getDefaultFilters,
} from '../../utils/reportFilters';
import ExpenseFilters from '../../components/ExpenseFilters';
import ExportButton from '../../components/ExportButton';
import ExpenseDetailModal from '../../components/ExpenseDetailModal';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 768;
const isLargeScreen = screenWidth >= 768;

export default function StatsScreen() {
  const { user, userDetails, getPartnerDetails } = useAuth();
  const { categories } = useBudget();
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [partnerDetails, setPartnerDetails] = useState(null);

  // New state for advanced filtering and reporting
  const [filters, setFilters] = useState(getDefaultFilters());
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'category'
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'month', 'category', 'status'
  const [selectedExpense, setSelectedExpense] = useState(null); // For detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch partner details
  useEffect(() => {
    const fetchPartnerDetails = async () => {
      if (userDetails?.partnerId) {
        try {
          const partner = await getPartnerDetails();
          if (partner) {
            setPartnerDetails(partner);
            if (partner.displayName) {
              setPartnerName(partner.displayName);
            }
          }
        } catch (error) {
          console.error('Error fetching partner details:', error);
        }
      }
    };
    fetchPartnerDetails();
  }, [userDetails?.partnerId]);

  // Real-time expenses listener
  useEffect(() => {
    if (!userDetails?.coupleId) {
      setLoading(false);
      return;
    }

    console.log('Setting up expenses listener for stats');

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('coupleId', '==', userDetails.coupleId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      expensesQuery,
      snapshot => {
        const expensesList = [];
        snapshot.forEach(doc => {
          expensesList.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Stats: Loaded ${expensesList.length} expenses`);
        setExpenses(expensesList);
        setError(null);
        setLoading(false);
        setRefreshing(false);
      },
      error => {
        console.error('Error fetching expenses for stats:', error);
        setError('Failed to load statistics. Pull down to retry.');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [userDetails?.coupleId]);

  // Real-time settlements listener
  useEffect(() => {
    if (!userDetails?.coupleId) {
      return;
    }

    console.log('Setting up settlements listener for stats');

    const settlementsQuery = query(
      collection(db, 'settlements'),
      where('coupleId', '==', userDetails.coupleId),
      orderBy('settledAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      settlementsQuery,
      snapshot => {
        const settlementsList = [];
        snapshot.forEach(doc => {
          settlementsList.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Stats: Loaded ${settlementsList.length} settlements`);
        setSettlements(settlementsList);
      },
      error => {
        console.error('Error fetching settlements for stats:', error);
        // Don't show error to user for settlements - non-critical
      }
    );

    return () => unsubscribe();
  }, [userDetails?.coupleId]);

  const handleRefresh = () => {
    setRefreshing(true);
  };

  // Handler functions for new features
  const handleFiltersChange = newFilters => {
    setFilters(newFilters);
  };

  const handleExpenseTap = expense => {
    setSelectedExpense(expense);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedExpense(null);
  };

  // Apply filters and sorting to expenses
  const filteredExpenses = applyAllFilters(expenses, filters, user?.uid, userDetails?.partnerId);
  const sortedFilteredExpenses = sortExpenses(filteredExpenses, sortBy);

  // Calculate summary statistics from filtered expenses
  const reportSummary = generateReportSummary(filteredExpenses, user?.uid, userDetails?.partnerId);
  const totalExpenses = reportSummary.totalExpenses;
  const categoryTotals = calculateExpensesByCategory(filteredExpenses);
  const userShare = reportSummary.user1Total;
  const partnerShare = reportSummary.user2Total;

  // Group expenses if needed
  let groupedExpenses = null;
  if (groupBy === 'month') {
    groupedExpenses = groupExpensesByMonth(sortedFilteredExpenses);
  } else if (groupBy === 'category') {
    groupedExpenses = groupExpensesByCategory(sortedFilteredExpenses, categories);
  } else if (groupBy === 'status') {
    groupedExpenses = groupExpensesBySettlementStatus(sortedFilteredExpenses);
  }

  // Sort categories by total amount
  const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);

  // Render sorting controls
  const renderSortingControls = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date-desc' && styles.sortButtonActive]}
            onPress={() => setSortBy('date-desc')}
          >
            <Text
              style={[styles.sortButtonText, sortBy === 'date-desc' && styles.sortButtonTextActive]}
            >
              Latest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'amount-desc' && styles.sortButtonActive]}
            onPress={() => setSortBy('amount-desc')}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'amount-desc' && styles.sortButtonTextActive,
              ]}
            >
              Highest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'category' && styles.sortButtonActive]}
            onPress={() => setSortBy('category')}
          >
            <Text
              style={[styles.sortButtonText, sortBy === 'category' && styles.sortButtonTextActive]}
            >
              Category
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Group by:</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, groupBy === 'none' && styles.sortButtonActive]}
            onPress={() => setGroupBy('none')}
          >
            <Text
              style={[styles.sortButtonText, groupBy === 'none' && styles.sortButtonTextActive]}
            >
              None
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, groupBy === 'month' && styles.sortButtonActive]}
            onPress={() => setGroupBy('month')}
          >
            <Text
              style={[styles.sortButtonText, groupBy === 'month' && styles.sortButtonTextActive]}
            >
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, groupBy === 'status' && styles.sortButtonActive]}
            onPress={() => setGroupBy('status')}
          >
            <Text
              style={[styles.sortButtonText, groupBy === 'status' && styles.sortButtonTextActive]}
            >
              Status
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render individual expense item
  const renderExpenseItem = expense => {
    const isPaidByUser = expense.paidBy === user?.uid;
    const isSettled = !!expense.settledAt;
    const categoryKey = expense.category || expense.categoryKey || 'other';
    const categoryIcon = categories[categoryKey]?.icon || '💡';
    const categoryColor = COLORS.primary;

    return (
      <TouchableOpacity
        key={expense.id}
        style={styles.expenseItem}
        onPress={() => handleExpenseTap(expense)}
        activeOpacity={0.7}
      >
        <View style={[styles.expenseIconContainer, { backgroundColor: categoryColor + '20' }]}>
          <Text style={styles.expenseIcon}>{categoryIcon}</Text>
        </View>

        <View style={styles.expenseContent}>
          <View style={styles.expenseHeader}>
            <Text style={styles.expenseDescription} numberOfLines={1}>
              {expense.description || 'No description'}
            </Text>
            <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
          </View>

          <View style={styles.expenseFooter}>
            <View style={styles.expenseMetaRow}>
              <Ionicons
                name="person"
                size={14}
                color={isPaidByUser ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={styles.expenseMetaText}>
                {isPaidByUser ? 'You paid' : `${partnerName} paid`}
              </Text>
            </View>

            <View style={styles.expenseMetaRow}>
              <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
              <View
                style={[
                  styles.statusDot,
                  isSettled ? styles.statusDotSettled : styles.statusDotPending,
                ]}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
        <Ionicons name="wallet" size={24} color={COLORS.primary} />
        <Text style={styles.summaryLabel}>Total Expenses</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(totalExpenses)}</Text>
        <Text style={styles.summarySubtext}>{filteredExpenses.length} expenses</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCardSmall}>
          <Ionicons name="person" size={20} color={COLORS.success} />
          <Text style={styles.summaryLabelSmall}>Your Share</Text>
          <Text style={styles.summaryAmountSmall}>{formatCurrency(userShare)}</Text>
        </View>

        <View style={styles.summaryCardSmall}>
          <Ionicons name="people" size={20} color={COLORS.warning} />
          <Text style={styles.summaryLabelSmall}>Partner's Share</Text>
          <Text style={styles.summaryAmountSmall}>{formatCurrency(partnerShare)}</Text>
        </View>
      </View>
    </View>
  );

  const renderCategoryItem = ([categoryKey, amount]) => {
    const categoryName = categories[categoryKey]?.name || 'Other';
    const categoryIcon = categories[categoryKey]?.icon || '💡';
    const categoryColor = COLORS.primary;
    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;

    return (
      <View key={categoryKey} style={styles.categoryItem}>
        <View style={[styles.categoryIconContainer, { backgroundColor: categoryColor + '20' }]}>
          <Text style={styles.categoryIconText}>{categoryIcon}</Text>
        </View>

        <View style={styles.categoryDetails}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>{categoryName}</Text>
            <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${percentage}%`, backgroundColor: categoryColor },
              ]}
            />
          </View>

          <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}% of total</Text>
        </View>
      </View>
    );
  };

  const renderSettlementItem = settlement => {
    const settledAt = settlement.settledAt?.toDate ? settlement.settledAt.toDate() : new Date();
    const dateStr = settledAt.toLocaleDateString();
    const timeStr = settledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const whoSettled = settlement.settledBy === user?.uid ? 'You' : partnerName;
    const whoReceived = settlement.settledBy === user?.uid ? partnerName : 'You';

    return (
      <View key={settlement.id} style={styles.settlementItem}>
        <View style={styles.settlementIconContainer}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        </View>

        <View style={styles.settlementDetails}>
          <Text style={styles.settlementText}>
            <Text style={styles.settlementTextBold}>{whoSettled}</Text> paid{' '}
            <Text style={styles.settlementTextBold}>{whoReceived}</Text>
          </Text>
          <Text style={styles.settlementAmount}>{formatCurrency(settlement.amount)}</Text>
          <Text style={styles.settlementDate}>
            {dateStr} at {timeStr}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>📊</Text>
      <Text style={styles.emptyStateTitle}>No Expenses Yet</Text>
      <Text style={styles.emptyStateText}>
        Start adding expenses to see your spending statistics
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Statistics</Text>
          <Text style={styles.headerSubtitle}>Track your spending patterns</Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {expenses.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Summary Cards */}
            {renderSummaryCards()}

            {/* Filters Panel */}
            <View style={styles.section}>
              <ExpenseFilters onFiltersChange={handleFiltersChange} initialFilters={filters} />
            </View>

            {/* Export Button */}
            {filteredExpenses.length > 0 && (
              <View style={styles.section}>
                <ExportButton
                  expenses={filteredExpenses}
                  userDetails={userDetails}
                  partnerDetails={partnerDetails}
                  filters={filters}
                  categories={categories}
                />
              </View>
            )}

            {/* Detailed Expense List */}
            {filteredExpenses.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Expense Details ({filteredExpenses.length})
                  </Text>
                </View>

                {/* Sorting and Grouping Controls */}
                {renderSortingControls()}

                {/* Expense List */}
                <View style={styles.expenseList}>
                  {groupBy === 'none'
                    ? sortedFilteredExpenses.map(renderExpenseItem)
                    : Object.entries(groupedExpenses || {}).map(([groupKey, groupData]) => {
                        // Extract expenses array from groupData
                        const expensesArray = groupData.expenses || [];
                        const displayLabel = groupData.label || groupKey;

                        return (
                          <View key={groupKey} style={styles.expenseGroup}>
                            <Text style={styles.groupHeader}>{displayLabel}</Text>
                            {expensesArray.map(renderExpenseItem)}
                          </View>
                        );
                      })}
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <View style={styles.emptyFilterState}>
                  <Ionicons name="filter-outline" size={48} color={COLORS.textSecondary} />
                  <Text style={styles.emptyFilterTitle}>No Matching Expenses</Text>
                  <Text style={styles.emptyFilterText}>
                    Try adjusting your filters to see more results
                  </Text>
                </View>
              </View>
            )}

            {/* Category Breakdown */}
            {filteredExpenses.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category Breakdown</Text>
                {sortedCategories.length > 0 ? (
                  sortedCategories.map(renderCategoryItem)
                ) : (
                  <Text style={styles.emptyText}>No categories to display</Text>
                )}
              </View>
            )}

            {/* Settlement History */}
            {settlements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settlement History</Text>
                <Text style={styles.sectionSubtitle}>Record of when balances were settled</Text>
                {settlements.map(renderSettlementItem)}
              </View>
            )}
          </>
        )}

        {/* Expense Detail Modal */}
        <ExpenseDetailModal
          visible={showDetailModal}
          expense={selectedExpense}
          userDetails={userDetails}
          partnerDetails={partnerDetails}
          onClose={handleCloseModal}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.base,
  },
  header: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: Platform.OS === 'web' ? SPACING.base : 10,
    paddingBottom: SPACING.base,
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: isSmallScreen ? 24 : 28,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    marginHorizontal: SPACING.screenPadding,
    marginBottom: SPACING.base,
    borderRadius: 8,
    gap: SPACING.small,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  controlsContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  controlLabel: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    width: 80,
  },
  sortButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.small,
  },
  sortButton: {
    flex: 1,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.tiny,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
  },
  sortButtonText: {
    ...FONTS.small,
    color: COLORS.text,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: COLORS.background,
  },
  expenseList: {
    marginTop: SPACING.small,
  },
  expenseGroup: {
    marginBottom: SPACING.base,
  },
  groupHeader: {
    ...FONTS.title,
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: SPACING.small,
    paddingHorizontal: SPACING.small,
  },
  expenseItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.small,
  },
  expenseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  expenseIcon: {
    fontSize: 24,
  },
  expenseContent: {
    flex: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.small,
  },
  expenseDescription: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.small,
  },
  expenseAmount: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expenseMetaText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  expenseDate: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginRight: SPACING.tiny,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotSettled: {
    backgroundColor: COLORS.success,
  },
  statusDotPending: {
    backgroundColor: COLORS.warning || '#FFA500',
  },
  emptyFilterState: {
    alignItems: 'center',
    paddingVertical: SPACING.huge,
  },
  emptyFilterTitle: {
    ...FONTS.title,
    color: COLORS.text,
    marginTop: SPACING.base,
    marginBottom: SPACING.small,
  },
  emptyFilterText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.base,
  },
  summaryContainer: {
    paddingHorizontal: SPACING.screenPadding,
    marginBottom: SPACING.base,
  },
  summaryCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: SPACING.large,
    marginBottom: SPACING.small,
    alignItems: 'center',
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
  },
  summaryCardPrimary: {
    backgroundColor: COLORS.primary + '10',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  summaryLabel: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.small,
  },
  summaryAmount: {
    ...FONTS.heading,
    fontSize: isSmallScreen ? 32 : 40,
    color: COLORS.text,
    fontWeight: 'bold',
    marginTop: SPACING.tiny,
  },
  summarySubtext: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  summaryCardSmall: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    alignItems: 'center',
  },
  summaryLabelSmall: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
    textAlign: 'center',
  },
  summaryAmountSmall: {
    ...FONTS.title,
    fontSize: isSmallScreen ? 16 : 18,
    color: COLORS.text,
    fontWeight: 'bold',
    marginTop: SPACING.tiny,
  },
  section: {
    paddingHorizontal: SPACING.screenPadding,
    marginTop: SPACING.base,
  },
  sectionTitle: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: SPACING.base,
  },
  sectionSubtitle: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.base,
    marginTop: -SPACING.small,
  },
  categoryItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: isSmallScreen ? SPACING.small : SPACING.base,
    marginBottom: SPACING.small,
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
  },
  categoryIconContainer: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  categoryIconText: {
    fontSize: isSmallScreen ? 20 : 24,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.tiny,
  },
  categoryName: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  categoryAmount: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: SPACING.tiny,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercentage: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.huge,
    paddingHorizontal: SPACING.screenPadding,
  },
  emptyStateEmoji: {
    fontSize: 80,
    marginBottom: SPACING.base,
  },
  emptyStateTitle: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  emptyStateText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  settlementItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.small,
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  settlementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  settlementDetails: {
    flex: 1,
  },
  settlementText: {
    ...FONTS.body,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  settlementTextBold: {
    fontWeight: 'bold',
  },
  settlementAmount: {
    ...FONTS.title,
    fontSize: isSmallScreen ? 18 : 20,
    color: COLORS.success,
    fontWeight: 'bold',
    marginBottom: SPACING.tiny,
  },
  settlementDate: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
});
