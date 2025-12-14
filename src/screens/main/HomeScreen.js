/**
 * HomeScreen.js
 *
 * Main dashboard displaying:
 * - Balance card showing who owes whom
 * - List of recent expenses
 * - Floating "Add Expense" button
 * - Real-time sync with partner
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, writeBatch, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useNudges, NUDGE_TYPES } from '../../contexts/NudgeContext';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, COMMON_STYLES, SHADOWS } from '../../constants/theme';
import { onboardingStorage } from '../../utils/storage';
import { getPermissionStatus, isPushNotificationSupported } from '../../services/pushNotificationService';
import { BudgetSetupNudge, PushNotificationNudge, FirstExpenseCoachMark } from '../../components/nudges';
import {
  calculateBalance,
  calculateBalanceWithSettlements,
  formatBalance,
  formatCurrency,
  formatDate,
  sortExpensesByDate,
  validateSettlement,
} from '../../utils/calculations';
import { getExpenseDualDisplay, formatCurrency as formatCurrencyNew } from '../../utils/currencyUtils';
import { getCurrencyFlag } from '../../constants/currencies';
import ExpenseDetailModal from '../../components/ExpenseDetailModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as settlementService from '../../services/settlementService';
import { getPrimaryCurrency, getCoupleSettings } from '../../services/coupleSettingsService';

export default function HomeScreen({ navigation }) {
  const { user, userDetails, getPartnerDetails } = useAuth();
  const { categories, currentBudget } = useBudget();
  const { isPremium } = useSubscription();
  const { shouldShowNudge, dismissNudge } = useNudges();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // FAB ref for coach mark targeting
  const fabRef = useRef(null);

  // State
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]); // Track settlements for balance calculation
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');
  const [refreshing, setRefreshing] = useState(false);
  const [partnerName, setPartnerName] = useState('Partner');
  const [error, setError] = useState(null); // Track errors for UI display
  const [settleUpModalVisible, setSettleUpModalVisible] = useState(false);
  const [settling, setSettling] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState('active'); // 'all', 'active', 'settled'
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseDetailModalVisible, setExpenseDetailModalVisible] = useState(false);
  const [partnerDetails, setPartnerDetails] = useState(null);

  // Nudge-related state
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [pushPermissionStatus, setPushPermissionStatus] = useState('granted');
  const [showFirstExpenseCoachMark, setShowFirstExpenseCoachMark] = useState(false);

  // Check onboarding and push notification status for nudges
  // Using useFocusEffect to re-check every time HomeScreen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkNudgeConditions = async () => {
        // Check onboarding status from Firestore coupleSettings (coreSetupComplete)
        if (userDetails?.coupleId) {
          const settings = await getCoupleSettings(userDetails.coupleId);
          setOnboardingCompleted(settings?.coreSetupComplete || false);
        }

        // Check push notification permission status
        if (isPushNotificationSupported()) {
          const status = await getPermissionStatus();
          setPushPermissionStatus(status);
        }
      };

      checkNudgeConditions();
    }, [userDetails?.coupleId])
  );

  // Show first expense coach mark when appropriate
  useEffect(() => {
    // Show coach mark if:
    // 1. User has partner
    // 2. No expenses yet
    // 3. Nudge not dismissed
    // 4. Not loading
    if (
      userDetails?.partnerId &&
      expenses.length === 0 &&
      shouldShowNudge(NUDGE_TYPES.FIRST_EXPENSE) &&
      !loading
    ) {
      // Small delay to ensure FAB is rendered and measured
      const timer = setTimeout(() => {
        setShowFirstExpenseCoachMark(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowFirstExpenseCoachMark(false);
    }
  }, [userDetails?.partnerId, expenses.length, shouldShowNudge, loading]);

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

  // Fetch primary currency on mount and when screen comes into focus
  // This ensures currency updates when changed in Settings
  useFocusEffect(
    React.useCallback(() => {
      const fetchCurrency = async () => {
        if (userDetails?.coupleId) {
          try {
            const currency = await getPrimaryCurrency(userDetails.coupleId);
            setPrimaryCurrency(currency.code);
          } catch (error) {
            console.error('Error fetching primary currency:', error);
          }
        }
      };
      fetchCurrency();
    }, [userDetails?.coupleId])
  );

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
          setError(t('home.errors.permissionDenied'));
        } else if (error.code === 'unavailable') {
          setError(t('home.errors.networkError'));
        } else {
          setError(t('home.errors.loadFailed'));
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
      Alert.alert(t('common.error'), t('home.alerts.settleUpError'));
      return;
    }

    // Check if balance is already zero
    if (balance === 0) {
      Alert.alert(t('home.alerts.alreadySettledTitle'), t('home.alerts.alreadySettledMessage'));
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

      Alert.alert(t('home.alerts.settledTitle'), message, [{ text: t('common.ok') }]);
    } catch (error) {
      console.error('Error settling up:', error);

      // Provide more specific error messages
      let errorMessage = t('home.alerts.settlementFailed');
      if (error.code === 'permission-denied') {
        errorMessage = t('home.alerts.permissionDenied');
      } else if (error.message && error.message.includes('settlement')) {
        errorMessage = error.message;
      }

      Alert.alert(t('home.alerts.settlementFailedTitle'), errorMessage);
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
                {t('home.modal.recordPayment', {
                  payer: balanceInfo.status === 'positive' ? partnerName : t('home.modal.you'),
                  action: balanceInfo.status === 'settled' ? t('home.modal.settled') : t('home.modal.paid')
                })}
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
            <Text
              style={[styles.expenseDescription, isSettled && styles.expenseDescriptionSettled]}
              numberOfLines={1}
            >
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
              {isPaidByUser ? t('home.list.youPaid') : t('home.list.partnerPaid', { partner: partnerName })}
            </Text>
            {isSettled && settledDateStr && (
              <>
                <Text style={[styles.expenseSeparator, styles.expenseMetaSettled]}>•</Text>
                <Text style={styles.settledText}>{t('home.list.settled', { date: settledDateStr })}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.expenseAmountContainer}>
          <View style={styles.expenseAmountRow}>
            {item.currency && item.currency !== primaryCurrency && (
              <Text style={styles.currencyFlag}>{getCurrencyFlag(item.currency)}</Text>
            )}
            <Text style={[styles.expenseAmount, isSettled && styles.expenseAmountSettled]}>
              {item.currency && item.primaryCurrencyAmount
                ? getExpenseDualDisplay(item)
                : formatCurrency(item.amount)}
            </Text>
          </View>
          {item.splitDetails && item.splitDetails.user1Amount !== undefined && item.splitDetails.user2Amount !== undefined && (
            <Text style={[styles.expenseYourShare, isSettled && styles.expenseMetaSettled]}>
              Your share: {formatCurrencyNew(isPaidByUser ? item.splitDetails.user1Amount : item.splitDetails.user2Amount, primaryCurrency)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>💸</Text>
      <Text style={styles.emptyStateTitle}>{t('home.noExpensesTitle')}</Text>
      <Text style={styles.emptyStateText}>
        {t('home.noExpensesText')}
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
        <Text style={styles.loadingText}>{t('home.loadingExpenses')}</Text>
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
          {t('home.active')} ({unsettledCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, expenseFilter === 'all' && styles.filterButtonActive]}
        onPress={() => setExpenseFilter('all')}
      >
        <Text style={[styles.filterButtonText, expenseFilter === 'all' && styles.filterButtonTextActive]}>
          {t('home.all')} ({expenses.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, expenseFilter === 'settled' && styles.filterButtonActive]}
        onPress={() => setExpenseFilter('settled')}
      >
        <Text style={[styles.filterButtonText, expenseFilter === 'settled' && styles.filterButtonTextActive]}>
          {t('home.settled')} ({settledCount})
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? SPACING.base : Math.max(insets.top, 10) }]}>
          <View>
            <Text style={styles.greeting}>{t('home.greeting', { name: userDetails?.displayName || 'there' })}</Text>
            <Text style={styles.subtitle}>{t('home.subtitle', { partnerName })}</Text>
          </View>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('SettlementsTab')}
          >
            <Ionicons name="time-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Unpaired User Banner - Enhanced */}
        {!userDetails?.partnerId && (
          <View style={styles.unpairedBanner}>
            <View style={styles.unpairedBannerIconContainer}>
              <Ionicons name="people" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.unpairedBannerContent}>
              <Text style={styles.unpairedBannerTitle}>{t('home.unpaired.title')}</Text>
              <Text style={styles.unpairedBannerMessage}>{t('home.unpaired.message')}</Text>
            </View>
            <View style={styles.unpairedBannerActions}>
              <TouchableOpacity
                style={styles.unpairedBannerButtonPrimary}
                onPress={() => navigation.navigate('Invite')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add-outline" size={16} color={COLORS.textWhite} />
                <Text style={styles.unpairedBannerButtonPrimaryText}>
                  {t('nudges.partnerInvite.inviteCta', 'Invite Partner')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.unpairedBannerButtonSecondary}
                onPress={() => navigation.navigate('Join')}
                activeOpacity={0.7}
              >
                <Ionicons name="enter-outline" size={16} color={COLORS.primary} />
                <Text style={styles.unpairedBannerButtonSecondaryText}>
                  {t('nudges.partnerInvite.joinCta', 'Join Partner')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Budget Setup Nudge - Show if onboarding not completed */}
        {userDetails?.partnerId && !onboardingCompleted && shouldShowNudge(NUDGE_TYPES.BUDGET_SETUP) && (
          <BudgetSetupNudge
            onSetup={() => navigation.navigate('Onboarding')}
            style={{ marginTop: 0 }}
          />
        )}

        {/* Push Notification Nudge - Show if permission not granted */}
        {userDetails?.partnerId && pushPermissionStatus === 'undetermined' && shouldShowNudge(NUDGE_TYPES.PUSH_NOTIFICATIONS) && (
          <PushNotificationNudge
            mode="banner"
            style={{ marginTop: 0 }}
          />
        )}

        {/* Balance Card */}
        <View style={[
          styles.balanceCard,
          balanceInfo.status === 'positive' && styles.balanceCardPositive,
          balanceInfo.status === 'negative' && styles.balanceCardNegative,
        ]}>
          <Text style={styles.balanceLabel}>{t('home.currentBalance')}</Text>
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
                <Text style={styles.settleButtonText}>{t('home.settleUp')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.historyButtonCard, balanceInfo.status === 'settled' && styles.historyButtonFull]}
              onPress={() => navigation.navigate('SettlementsTab')}
            >
              <Ionicons name="list-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.historyButtonText}>{t('home.viewHistory')}</Text>
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
            <Text style={styles.sectionTitle}>{t('home.expenses')}</Text>
            <TouchableOpacity
              style={styles.importButton}
              onPress={() => {
                try {
                  console.log('Import button pressed, isPremium:', isPremium);
                  // Check if user has premium access
                  if (!isPremium) {
                    console.log('User is not premium, redirecting to paywall');
                    navigation.navigate('Paywall', { feature: 'import_expenses' });
                    return;
                  }
                  console.log('Navigating to ImportExpenses screen');
                  navigation.navigate('ImportExpenses');
                } catch (error) {
                  console.error('Error navigating to ImportExpenses:', error);
                  Alert.alert(t('home.alerts.navigationErrorTitle'), t('home.alerts.navigationErrorMessage'));
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
              <Text style={styles.importButtonText}>{t('home.import') || 'Import'}</Text>
              {!isPremium && (
                <Ionicons name="lock-closed" size={14} color={COLORS.warning} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
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
            contentContainerStyle={filteredExpenses.length === 0 ? styles.emptyListContent : [styles.listContent, { paddingBottom: 100 + insets.bottom }]}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          />
        </View>

        {/* Floating Add Button */}
        <View ref={fabRef} collapsable={false} style={[styles.fabContainer, { bottom: SPACING.screenPadding + 60 + insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.fab,
              !userDetails?.partnerId && styles.fabDisabled
            ]}
            onPress={() => {
              // Dismiss coach mark if shown
              if (showFirstExpenseCoachMark) {
                setShowFirstExpenseCoachMark(false);
                dismissNudge(NUDGE_TYPES.FIRST_EXPENSE);
              }
              // Check if user is unpaired
              if (!userDetails?.partnerId) {
                Alert.alert(
                  t('home.unpaired.title'),
                  t('home.unpaired.readOnlyMode'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('home.unpaired.findPartner'),
                      onPress: () => navigation.navigate('Connect')
                    }
                  ]
                );
                return;
              }
              handleAddExpense();
            }}
            disabled={!userDetails?.partnerId}
          >
            <Ionicons name="add" size={32} color={COLORS.background} />
          </TouchableOpacity>
        </View>

        {/* First Expense Coach Mark */}
        {showFirstExpenseCoachMark && (
          <FirstExpenseCoachMark
            targetRef={fabRef}
            onDismiss={() => setShowFirstExpenseCoachMark(false)}
          />
        )}

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
    // paddingTop is set dynamically via inline style using safe area insets
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
    alignItems: 'center',
    marginTop: SPACING.base,
    width: '100%',
  },
  settleButton: {
    width: '48%',
    height: 44,
    marginRight: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleButtonText: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
  historyButtonCard: {
    width: '48%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  historyButtonFull: {
    width: '100%',
    marginRight: 0,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  importButtonText: {
    ...FONTS.small,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 4,
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
    minWidth: 0,  // Critical for text truncation in flex children
    overflow: 'hidden',
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
    flexWrap: 'wrap',
    gap: isSmallScreen ? 2 : undefined,
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
    flexShrink: 1,
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
    marginLeft: SPACING.small,
    flexShrink: 0,  // Don't let amount column shrink
  },
  expenseAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyFlag: {
    fontSize: 16,
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
  unpairedBanner: {
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.screenPadding,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.medium,
  },
  unpairedBannerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.medium,
    alignSelf: 'center',
  },
  unpairedBannerContent: {
    marginBottom: SPACING.medium,
  },
  unpairedBannerTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.tiny,
  },
  unpairedBannerMessage: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  unpairedBannerActions: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  unpairedBannerButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    gap: SPACING.tiny,
  },
  unpairedBannerButtonPrimaryText: {
    ...FONTS.small,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  unpairedBannerButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    gap: SPACING.tiny,
  },
  unpairedBannerButtonSecondaryText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    right: SPACING.screenPadding,
    // bottom is set dynamically via inline style using safe area insets
  },
  fabDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
});
