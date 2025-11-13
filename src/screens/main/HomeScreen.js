/**
 * HomeScreen.js
 *
 * Main dashboard displaying:
 * - Balance card showing who owes whom
 * - List of recent expenses
 * - Floating "Add Expense" button
 * - Real-time sync with partner
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, writeBatch, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';
import {
  calculateBalance,
  calculateBalanceWithSettlements,
  formatBalance,
  formatCurrency,
  formatDate,
  sortExpensesByDate,
  validateSettlement,
} from '../../utils/calculations';
import ExpenseDetailModal from '../../components/ExpenseDetailModal';
import * as settlementService from '../../services/settlementService';

export default function HomeScreen({ navigation }) {
  const { user, userDetails, getPartnerDetails } = useAuth();
  const { categories, currentBudget } = useBudget();
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]); // Track settlements for balance calculation
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerName, setPartnerName] = useState('Partner');
  const [error, setError] = useState(null); // Track errors for UI display
  const [settleUpModalVisible, setSettleUpModalVisible] = useState(false);
  const [settling, setSettling] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState('active'); // 'all', 'active', 'settled'
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseDetailModalVisible, setExpenseDetailModalVisible] = useState(false);
  const [partnerDetails, setPartnerDetails] = useState(null);

  // Fetch partner's name and details
  useEffect(() => {
    const fetchPartnerName = async () => {
      if (userDetails?.partnerId) {
        try {
          const partner = await getPartnerDetails();
          if (partner) {
            setPartnerDetails(partner);
            if (partner.displayName) {
              setPartnerName(partner.displayName);
            } else {
              console.warn('Partner details not found or missing displayName');
              setPartnerName('Partner');
            }
          }
        } catch (error) {
          console.error('Error fetching partner details:', error);
          setPartnerName('Partner'); // Fallback to generic name
        }
      }
    };
    fetchPartnerName();
  }, [userDetails?.partnerId]);

  // Real-time expenses listener
  useEffect(() => {
    if (!userDetails?.coupleId) {
      setLoading(false);
      return;
    }

    console.log('Setting up expenses listener for couple:', userDetails.coupleId);

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('coupleId', '==', userDetails.coupleId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expensesList = [];
        snapshot.forEach((doc) => {
          expensesList.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Loaded ${expensesList.length} expenses`);
        setExpenses(expensesList);

        setError(null); // Clear any previous errors
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error fetching expenses:', error);

        // Set user-friendly error message
        if (error.code === 'permission-denied') {
          setError('Permission denied. Please check your connection with your partner.');
        } else if (error.code === 'unavailable') {
          setError('Network error. Please check your internet connection.');
        } else {
          setError('Failed to load expenses. Pull down to retry.');
        }

        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [userDetails?.coupleId, user?.uid, userDetails?.partnerId]);

  // Real-time settlements listener
  useEffect(() => {
    if (!userDetails?.coupleId) {
      return;
    }

    console.log('Setting up settlements listener for couple:', userDetails.coupleId);

    const settlementsQuery = query(
      collection(db, 'settlements'),
      where('coupleId', '==', userDetails.coupleId),
      orderBy('settledAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      settlementsQuery,
      (snapshot) => {
        const settlementsList = [];
        snapshot.forEach((doc) => {
          settlementsList.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Loaded ${settlementsList.length} settlements`);
        setSettlements(settlementsList);
      },
      (error) => {
        console.error('Error fetching settlements:', error);
        // Don't show error to user for settlements - non-critical
      }
    );

    return () => unsubscribe();
  }, [userDetails?.coupleId]);

  // Calculate balance whenever expenses or settlements change
  useEffect(() => {
    if (!user || !user.uid || !userDetails || !userDetails.partnerId || !userDetails.coupleId) {
      console.warn('Cannot calculate balance: missing user, partner ID, or couple ID');
      setBalance(0);
      return;
    }

    // Use the new function that factors in settlements with coupleId validation
    const currentBalance = calculateBalanceWithSettlements(
      expenses,
      settlements,
      user.uid,
      userDetails.partnerId,
      userDetails.coupleId // Pass coupleId for security validation
    );

    console.log(`Balance calculated: ${currentBalance} (from ${expenses.length} expenses and ${settlements.length} settlements)`);
    setBalance(currentBalance);
  }, [expenses, settlements, user?.uid, userDetails?.partnerId, userDetails?.coupleId]);

  const handleRefresh = () => {
    setRefreshing(true);
    // The onSnapshot listener will automatically refresh
  };

  const handleAddExpense = () => {
    navigation.navigate('AddExpense');
  };

  const handleExpensePress = (expense) => {
    setSelectedExpense(expense);
    setExpenseDetailModalVisible(true);
  };

  const handleEditExpense = (expense) => {
    navigation.navigate('AddExpense', { expense });
  };

  const handleDeleteExpense = (expenseId) => {
    // The expense is already deleted by ExpenseDetailModal
    // Just close the modal - real-time listener will update the list
    console.log('Expense deleted:', expenseId);
  };

  // Filter expenses based on selected filter
  const getFilteredExpenses = () => {
    if (expenseFilter === 'active') {
      return expenses.filter(exp => !exp.settledAt);
    } else if (expenseFilter === 'settled') {
      return expenses.filter(exp => exp.settledAt);
    }
    return expenses; // 'all'
  };

  const handleSettleUp = async () => {
    if (!user || !userDetails || !userDetails.coupleId) {
      Alert.alert('Error', 'Unable to settle up. Please try again.');
      return;
    }

    // Check if balance is already zero
    if (balance === 0) {
      Alert.alert('Already Settled', 'Your balance is already at zero. No need to settle up!');
      setSettleUpModalVisible(false);
      return;
    }

    setSettling(true);
    try {
      // Use the settlementService with budget integration
      const settlement = await settlementService.createSettlement(
        userDetails.coupleId,
        user.uid,
        userDetails.partnerId,
        Math.abs(balance),
        user.uid,
        'You settled up',
        expenses,
        categories,
        currentBudget
      );

      setSettleUpModalVisible(false);

      // Show success message with budget insights if available
      let message = `You paid ${formatCurrency(Math.abs(balance))}.\n\n${settlement.expensesSettledCount} expense${settlement.expensesSettledCount !== 1 ? 's' : ''} marked as settled.`;

      if (settlement.budgetSummary?.includedInBudget) {
        const budgetStatus = settlement.budgetSummary.budgetRemaining >= 0 ? 'under budget' : 'over budget';
        message += `\n\nYou spent ${formatCurrency(settlement.budgetSummary.totalSpent)} of your ${formatCurrency(settlement.budgetSummary.totalBudget)} budget (${budgetStatus}).`;
      }

      if (settlement.topCategories && settlement.topCategories.length > 0) {
        const topCategory = settlement.topCategories[0];
        message += `\n\nTop category: ${topCategory.icon} ${topCategory.categoryName} (${formatCurrency(topCategory.amount)})`;
      }

      Alert.alert('Settled Up! 💰', message, [{ text: 'OK' }]);
    } catch (error) {
      console.error('Error settling up:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to settle up. Please try again.';
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account settings.';
      } else if (error.message && error.message.includes('settlement')) {
        errorMessage = error.message;
      }

      Alert.alert('Settlement Failed', errorMessage);
    } finally {
      setSettling(false);
    }
  };

  const renderSettleUpModal = () => {
    const balanceInfo = formatBalance(balance, 'You', partnerName);

    // Calculate preview data
    const unsettledExpenses = expenses.filter(exp => !exp.settledAt);
    const totalExpensesAmount = unsettledExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Generate category breakdown preview
    const categoryBreakdown = settlementService.generateCategoryBreakdown(unsettledExpenses, categories);
    const topCategories = settlementService.identifyTopCategories(categoryBreakdown, 3);

    // Generate budget summary
    const budgetSummary = settlementService.generateBudgetSummary(unsettledExpenses, currentBudget, categories);

    return (
      <Modal
        visible={settleUpModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettleUpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="cash" size={32} color={COLORS.success} />
              <Text style={styles.modalTitle}>Settle Up</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSettleUpModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalDescription}>
                Record that {balanceInfo.status === 'positive' ? partnerName : 'you'} {balanceInfo.status === 'settled' ? 'are all settled' : 'paid'}:
              </Text>

              <View style={styles.modalAmountContainer}>
                <Text style={styles.modalAmount}>{formatCurrency(balanceInfo.amount)}</Text>
              </View>

              {/* Settlement Summary */}
              <View style={styles.settlementSummary}>
                <View style={styles.summaryRow}>
                  <Ionicons name="receipt-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.summaryText}>
                    Settling {unsettledExpenses.length} expense{unsettledExpenses.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.summaryText}>
                    Total: {formatCurrency(totalExpensesAmount)}
                  </Text>
                </View>
              </View>

              {/* Budget Performance */}
              {budgetSummary.includedInBudget && (
                <View style={styles.budgetPreview}>
                  <Text style={styles.budgetPreviewTitle}>Budget Performance</Text>
                  <View style={styles.budgetPreviewContent}>
                    <View style={styles.budgetPreviewRow}>
                      <Text style={styles.budgetPreviewLabel}>Spent</Text>
                      <Text style={styles.budgetPreviewValue}>
                        {formatCurrency(budgetSummary.totalSpent)}
                      </Text>
                    </View>
                    <View style={styles.budgetPreviewRow}>
                      <Text style={styles.budgetPreviewLabel}>Budget</Text>
                      <Text style={styles.budgetPreviewValue}>
                        {formatCurrency(budgetSummary.totalBudget)}
                      </Text>
                    </View>
                    <View style={[
                      styles.budgetPreviewRow,
                      styles.budgetPreviewRowHighlight,
                      budgetSummary.budgetRemaining < 0 && styles.budgetPreviewRowNegative
                    ]}>
                      <Text style={[
                        styles.budgetPreviewLabel,
                        styles.budgetPreviewLabelBold
                      ]}>
                        {budgetSummary.budgetRemaining >= 0 ? 'Remaining' : 'Over Budget'}
                      </Text>
                      <Text style={[
                        styles.budgetPreviewValue,
                        styles.budgetPreviewValueBold,
                        budgetSummary.budgetRemaining < 0 && styles.budgetPreviewValueNegative
                      ]}>
                        {formatCurrency(Math.abs(budgetSummary.budgetRemaining))}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Top Categories Preview */}
              {topCategories.length > 0 && (
                <View style={styles.topCategoriesPreview}>
                  <Text style={styles.topCategoriesTitle}>Top Spending</Text>
                  <View style={styles.topCategoriesContent}>
                    {topCategories.slice(0, 3).map((cat, index) => (
                      <View key={cat.categoryKey} style={styles.topCategoryPreviewItem}>
                        <Text style={styles.topCategoryPreviewIcon}>{cat.icon}</Text>
                        <Text style={styles.topCategoryPreviewName}>{cat.categoryName}</Text>
                        <Text style={styles.topCategoryPreviewAmount}>
                          {formatCurrency(cat.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.modalNote}>
                This will create a settlement record. Your expense tracking will continue with a balanced slate.
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setSettleUpModalVisible(false)}
                disabled={settling}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSettleUp}
                disabled={settling}
              >
                {settling ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderExpenseItem = ({ item }) => {
    // Validate expense data
    if (!item || !item.amount || !item.description) {
      console.warn('Invalid expense item:', item);
      return null;
    }

    const isPaidByUser = user && item.paidBy === user.uid;
    const categoryKey = item.category || item.categoryKey || 'other';
    const category = categories[categoryKey]?.icon || '💡';
    const categoryColor = COLORS.primary;
    const dateStr = item.date ? formatDate(item.date) : 'Unknown date';
    const isSettled = !!item.settledAt;
    const settledDateStr = isSettled && item.settledAt?.toDate ? item.settledAt.toDate().toLocaleDateString() : null;

    return (
      <TouchableOpacity
        style={[styles.expenseItem, isSettled && styles.expenseItemSettled]}
        onPress={() => handleExpensePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
          <Text style={styles.categoryEmoji}>{category}</Text>
        </View>

        <View style={styles.expenseDetails}>
          <View style={styles.expenseDescriptionRow}>
            <Text style={[styles.expenseDescription, isSettled && styles.expenseDescriptionSettled]}>
              {item.description}
            </Text>
            {isSettled && (
              <View style={styles.settledBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              </View>
            )}
          </View>
          <View style={styles.expenseMetaRow}>
            <Text style={[styles.expenseDate, isSettled && styles.expenseMetaSettled]}>{dateStr}</Text>
            <Text style={[styles.expenseSeparator, isSettled && styles.expenseMetaSettled]}>•</Text>
            <Text style={[styles.expensePaidBy, isSettled && styles.expenseMetaSettled]}>
              {isPaidByUser ? 'You paid' : `${partnerName} paid`}
            </Text>
            {isSettled && settledDateStr && (
              <>
                <Text style={[styles.expenseSeparator, styles.expenseMetaSettled]}>•</Text>
                <Text style={styles.settledText}>Settled {settledDateStr}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.expenseAmountContainer}>
          <Text style={[styles.expenseAmount, isSettled && styles.expenseAmountSettled]}>
            {formatCurrency(item.amount)}
          </Text>
          {item.splitDetails && item.splitDetails.user1Amount !== undefined && item.splitDetails.user2Amount !== undefined && (
            <Text style={[styles.expenseYourShare, isSettled && styles.expenseMetaSettled]}>
              Your share: {formatCurrency(isPaidByUser ? item.splitDetails.user1Amount : item.splitDetails.user2Amount)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>💸</Text>
      <Text style={styles.emptyStateTitle}>No Expenses Yet</Text>
      <Text style={styles.emptyStateText}>
        Start tracking your shared expenses by tapping the + button below
      </Text>
    </View>
  );

  const balanceInfo = formatBalance(balance, 'You', partnerName);
  const filteredExpenses = getFilteredExpenses();
  const unsettledCount = expenses.filter(exp => !exp.settledAt).length;
  const settledCount = expenses.filter(exp => exp.settledAt).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
  }

  const renderFilterToggle = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, expenseFilter === 'active' && styles.filterButtonActive]}
        onPress={() => setExpenseFilter('active')}
      >
        <Text style={[styles.filterButtonText, expenseFilter === 'active' && styles.filterButtonTextActive]}>
          Active ({unsettledCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, expenseFilter === 'all' && styles.filterButtonActive]}
        onPress={() => setExpenseFilter('all')}
      >
        <Text style={[styles.filterButtonText, expenseFilter === 'all' && styles.filterButtonTextActive]}>
          All ({expenses.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, expenseFilter === 'settled' && styles.filterButtonActive]}
        onPress={() => setExpenseFilter('settled')}
      >
        <Text style={[styles.filterButtonText, expenseFilter === 'settled' && styles.filterButtonTextActive]}>
          Settled ({settledCount})
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {userDetails?.displayName || 'there'}!</Text>
            <Text style={styles.subtitle}>Here's your balance with {partnerName}</Text>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('SettlementsTab')}
          >
            <Ionicons name="time-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={[
          styles.balanceCard,
          balanceInfo.status === 'positive' && styles.balanceCardPositive,
          balanceInfo.status === 'negative' && styles.balanceCardNegative,
        ]}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(balanceInfo.amount)}
          </Text>
          <Text style={styles.balanceStatus}>{balanceInfo.text}</Text>

          <View style={styles.balanceActions}>
            {balanceInfo.status !== 'settled' && (
              <TouchableOpacity
                style={styles.settleButton}
                onPress={() => setSettleUpModalVisible(true)}
              >
                <Text style={styles.settleButtonText}>Settle Up</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.historyButtonCard, balanceInfo.status === 'settled' && styles.historyButtonFull]}
              onPress={() => navigation.navigate('SettlementsTab')}
            >
              <Ionicons name="list-outline" size={18} color={COLORS.primary} />
              <Text style={styles.historyButtonText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Expenses List */}
        <View style={styles.expensesSection}>
          <View style={styles.expensesSectionHeader}>
            <Text style={styles.sectionTitle}>Expenses</Text>
          </View>

          {/* Filter Toggle */}
          {renderFilterToggle()}

          <FlatList
            style={styles.flatList}
            data={sortExpensesByDate(filteredExpenses).slice(0, 50)}
            renderItem={renderExpenseItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={filteredExpenses.length === 0 ? styles.emptyListContent : styles.listContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          />
        </View>

        {/* Floating Add Button */}
        <TouchableOpacity style={styles.fab} onPress={handleAddExpense}>
          <Ionicons name="add" size={32} color={COLORS.background} />
        </TouchableOpacity>

        {/* Settle Up Modal */}
        {renderSettleUpModal()}

        {/* Expense Detail Modal */}
        <ExpenseDetailModal
          visible={expenseDetailModalVisible}
          expense={selectedExpense}
          userDetails={userDetails}
          partnerDetails={partnerDetails}
          onClose={() => setExpenseDetailModalVisible(false)}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
        />
      </View>
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 768;
const isLargeScreen = screenWidth >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: Platform.OS === 'web' ? SPACING.base : 10,
    paddingBottom: SPACING.base,
  },
  historyButton: {
    padding: SPACING.small,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  greeting: {
    ...FONTS.heading,
    fontSize: isSmallScreen ? 22 : isMediumScreen ? 26 : 28,
    color: COLORS.text,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  balanceCard: {
    backgroundColor: COLORS.backgroundSecondary,
    marginHorizontal: SPACING.screenPadding,
    borderRadius: 16,
    padding: isSmallScreen ? SPACING.base : SPACING.large,
    marginBottom: SPACING.base,
    alignItems: 'center',
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
  },
  balanceCardPositive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  balanceCardNegative: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  balanceLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  balanceAmount: {
    ...FONTS.heading,
    fontSize: isSmallScreen ? 36 : isMediumScreen ? 42 : 48,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  balanceStatus: {
    ...FONTS.body,
    color: COLORS.text,
    marginTop: SPACING.small,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.small,
    marginTop: SPACING.base,
    width: '100%',
  },
  settleButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.large,
    borderRadius: 8,
    alignItems: 'center',
  },
  settleButtonText: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
  historyButtonCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  historyButtonFull: {
    flex: 0,
    minWidth: '100%',
  },
  historyButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
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
  expensesSection: {
    flex: 1,
    paddingHorizontal: SPACING.screenPadding,
    minHeight: 0, // Critical for scrolling to work properly
  },
  flatList: {
    flex: 1,
  },
  expensesSectionHeader: {
    marginBottom: SPACING.small,
  },
  listContent: {
    paddingBottom: 80, // Space for FAB
    flexGrow: 1,
  },
  sectionTitle: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.small,
    marginBottom: SPACING.base,
    marginTop: SPACING.small,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.tiny,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    ...FONTS.small,
    fontSize: isSmallScreen ? 11 : 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  expenseItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: isSmallScreen ? SPACING.small : SPACING.base,
    marginBottom: SPACING.small,
    alignItems: 'center',
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
  },
  expenseItemSettled: {
    opacity: 0.7,
    backgroundColor: COLORS.backgroundSecondary + 'CC',
  },
  categoryIcon: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? SPACING.small : SPACING.base,
  },
  categoryEmoji: {
    fontSize: isSmallScreen ? 20 : 24,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDescriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.tiny,
  },
  expenseDescription: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  expenseDescriptionSettled: {
    color: COLORS.textSecondary,
  },
  settledBadge: {
    marginLeft: SPACING.tiny,
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseDate: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  expenseSeparator: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.small,
  },
  expensePaidBy: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  expenseMetaSettled: {
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
  settledText: {
    ...FONTS.small,
    color: COLORS.success,
    fontWeight: '600',
  },
  expenseAmountContainer: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 18,
  },
  expenseAmountSettled: {
    color: COLORS.textSecondary,
  },
  expenseYourShare: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.huge,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
    paddingHorizontal: SPACING.large,
  },
  fab: {
    position: 'absolute',
    right: SPACING.screenPadding,
    bottom: SPACING.screenPadding + (Platform.OS === 'ios' ? 60 : 50), // Account for tab bar
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Settle Up Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: SPACING.large,
    maxWidth: isLargeScreen ? 500 : '100%',
    width: '100%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalScrollContent: {
    paddingBottom: SPACING.small,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 0,
    padding: SPACING.tiny,
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
    marginLeft: SPACING.small,
  },
  modalDescription: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.base,
  },
  modalAmountContainer: {
    backgroundColor: COLORS.success + '10',
    borderRadius: 12,
    padding: SPACING.large,
    alignItems: 'center',
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  modalAmount: {
    ...FONTS.heading,
    fontSize: isSmallScreen ? 36 : 48,
    color: COLORS.success,
    fontWeight: 'bold',
  },
  settlementSummary: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginVertical: SPACING.tiny,
  },
  summaryText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  budgetPreview: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  budgetPreviewTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  budgetPreviewContent: {
    gap: SPACING.tiny,
  },
  budgetPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  budgetPreviewRowHighlight: {
    marginTop: SPACING.tiny,
    paddingTop: SPACING.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  budgetPreviewRowNegative: {
    backgroundColor: COLORS.error + '10',
    marginHorizontal: -SPACING.small,
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.small,
    borderRadius: 6,
  },
  budgetPreviewLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  budgetPreviewLabelBold: {
    fontWeight: '600',
    color: COLORS.text,
  },
  budgetPreviewValue: {
    ...FONTS.small,
    color: COLORS.text,
  },
  budgetPreviewValueBold: {
    ...FONTS.body,
    fontWeight: '600',
  },
  budgetPreviewValueNegative: {
    color: COLORS.error,
  },
  topCategoriesPreview: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  topCategoriesTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  topCategoriesContent: {
    gap: SPACING.small,
  },
  topCategoryPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.tiny,
  },
  topCategoryPreviewIcon: {
    fontSize: 20,
    marginRight: SPACING.small,
  },
  topCategoryPreviewName: {
    ...FONTS.small,
    color: COLORS.text,
    flex: 1,
  },
  topCategoryPreviewAmount: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  modalNote: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.base,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.base,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonSecondary: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.success,
  },
  modalButtonTextSecondary: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
});
