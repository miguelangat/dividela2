/**
 * AddExpenseScreen.js
 *
 * Screen for adding new shared expenses with:
 * - Amount input
 * - Description field
 * - Category selection
 * - "Paid by" selector
 * - Split options (50/50 or custom)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';
import { calculateEqualSplit, calculateSplit, roundCurrency } from '../../utils/calculations';
import * as expenseService from '../../services/expenseService';
import CurrencyPicker from '../../components/CurrencyPicker';
import ExchangeRateInput from '../../components/ExchangeRateInput';
import { getCurrencyInfo, getCurrencySymbol } from '../../constants/currencies';
import { createMultiCurrencyExpense } from '../../utils/currencyUtils';
import {
  getPrimaryCurrency,
  saveRecentExchangeRate,
  getRecentExchangeRate,
} from '../../services/coupleSettingsService';

export default function AddExpenseScreen({ navigation, route }) {
  const { user, userDetails } = useAuth();
  const { categories: budgetCategories, budgetProgress, isBudgetEnabled } = useBudget();

  // Check if we're editing an existing expense
  const editingExpense = route.params?.expense;
  const isEditMode = !!editingExpense;

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(user.uid); // Who paid
  const [splitType, setSplitType] = useState('equal'); // 'equal' or 'custom'
  const [userSplitPercentage, setUserSplitPercentage] = useState('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Multi-currency state
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');
  const [expenseCurrency, setExpenseCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [convertedAmount, setConvertedAmount] = useState(0);

  // Fetch primary currency on mount
  useEffect(() => {
    const fetchPrimaryCurrency = async () => {
      if (userDetails?.coupleId) {
        try {
          const currency = await getPrimaryCurrency(userDetails.coupleId);
          setPrimaryCurrency(currency.code);
          setExpenseCurrency(currency.code); // Default to primary currency
        } catch (error) {
          console.error('Error fetching primary currency:', error);
        }
      }
    };
    fetchPrimaryCurrency();
  }, [userDetails?.coupleId]);

  // Pre-populate form when editing
  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      setDescription(editingExpense.description);
      setSelectedCategory(editingExpense.categoryKey || editingExpense.category || 'food');
      setPaidBy(editingExpense.paidBy);

      // Set currency fields if available
      if (editingExpense.currency) {
        setExpenseCurrency(editingExpense.currency);
      }
      if (editingExpense.exchangeRate) {
        setExchangeRate(editingExpense.exchangeRate);
      }
      if (editingExpense.primaryCurrencyAmount) {
        setConvertedAmount(editingExpense.primaryCurrencyAmount);
      }

      // Determine split type from split details
      const userPercentage = editingExpense.splitDetails?.user1Percentage || 50;
      if (userPercentage === 50) {
        setSplitType('equal');
      } else {
        setSplitType('custom');
        setUserSplitPercentage(userPercentage.toString());
      }
    }
  }, [editingExpense]);

  const handleAmountChange = (text) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
    setError('');
  };

  const handleSplitPercentageChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setUserSplitPercentage('');
      return;
    }
    const num = parseInt(cleaned);
    if (num > 100) return;
    setUserSplitPercentage(String(num));
  };

  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setError('Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    // Critical null checks
    if (!user || !user.uid) {
      setError('Authentication error. Please sign in again.');
      return;
    }

    if (!userDetails || !userDetails.coupleId) {
      setError('You must be paired with a partner to add expenses.');
      return;
    }

    if (!userDetails.partnerId) {
      setError('Partner information missing. Please reconnect with your partner.');
      return;
    }

    if (!paidBy) {
      setError('Please select who paid for this expense.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const expenseAmount = parseFloat(amount);

      // Additional validation: ensure amount is reasonable
      if (expenseAmount > 1000000) {
        setError('Amount seems too large. Please check and try again.');
        setLoading(false);
        return;
      }

      // Calculate split
      let splitDetails;
      if (splitType === 'equal') {
        splitDetails = calculateEqualSplit(expenseAmount);
      } else {
        const parsedPercentage = parseInt(userSplitPercentage);
        const userPercentage = !isNaN(parsedPercentage) ? parsedPercentage : 50;
        const partnerPercentage = 100 - userPercentage;
        splitDetails = calculateSplit(expenseAmount, userPercentage, partnerPercentage);
      }

      // Use converted amount for split calculation if different currency
      const amountForSplit = expenseCurrency !== primaryCurrency ? convertedAmount : expenseAmount;

      // Recalculate split with the amount in primary currency
      if (splitType === 'equal') {
        splitDetails = calculateEqualSplit(amountForSplit);
      } else {
        const parsedPercentage = parseInt(userSplitPercentage);
        const userPercentage = !isNaN(parsedPercentage) ? parsedPercentage : 50;
        const partnerPercentage = 100 - userPercentage;
        splitDetails = calculateSplit(amountForSplit, userPercentage, partnerPercentage);
      }

      if (isEditMode) {
        // Update existing expense
        const updates = {
          amount: expenseAmount,
          currency: expenseCurrency,
          primaryCurrencyAmount: amountForSplit,
          primaryCurrency,
          exchangeRate,
          exchangeRateSource: expenseCurrency === primaryCurrency ? 'none' : 'manual',
          description: description.trim(),
          category: selectedCategory,
          categoryKey: selectedCategory,
          paidBy: paidBy,
          splitDetails: {
            user1Amount: roundCurrency(paidBy === user.uid ? splitDetails.user1Amount : splitDetails.user2Amount),
            user2Amount: roundCurrency(paidBy === user.uid ? splitDetails.user2Amount : splitDetails.user1Amount),
            user1Percentage: paidBy === user.uid ? splitDetails.user1Percentage : splitDetails.user2Percentage,
            user2Percentage: paidBy === user.uid ? splitDetails.user2Percentage : splitDetails.user1Percentage,
          },
        };

        console.log('Updating expense:', editingExpense.id, updates);
        await expenseService.updateExpense(editingExpense.id, updates);

        console.log('✓ Expense updated successfully');
      } else {
        // Create new expense with multi-currency data
        const baseExpenseData = {
          amount: expenseAmount,
          currency: expenseCurrency,
          exchangeRate,
          description: description.trim(),
          category: selectedCategory, // Legacy field for backward compatibility
          categoryKey: selectedCategory, // New field for budget tracking
          paidBy: paidBy,
          coupleId: userDetails.coupleId,
          date: new Date().toISOString(),
          splitDetails: {
            user1Amount: roundCurrency(paidBy === user.uid ? splitDetails.user1Amount : splitDetails.user2Amount),
            user2Amount: roundCurrency(paidBy === user.uid ? splitDetails.user2Amount : splitDetails.user1Amount),
            user1Percentage: paidBy === user.uid ? splitDetails.user1Percentage : splitDetails.user2Percentage,
            user2Percentage: paidBy === user.uid ? splitDetails.user2Percentage : splitDetails.user1Percentage,
          },
        };

        // Add multi-currency fields
        const expenseData = createMultiCurrencyExpense(baseExpenseData, primaryCurrency);

        console.log('Creating expense:', expenseData);
        await expenseService.addExpense(expenseData);

        // Save exchange rate for future reuse
        if (expenseCurrency !== primaryCurrency) {
          try {
            await saveRecentExchangeRate(userDetails.coupleId, expenseCurrency, primaryCurrency, exchangeRate);
          } catch (err) {
            console.warn('Could not save exchange rate:', err);
          }
        }

        console.log('✓ Expense created successfully');
      }

      // Update couple's lastActivity
      await updateDoc(doc(db, 'couples', userDetails.coupleId), {
        lastActivity: serverTimestamp(),
      });

      // Navigate back to home
      navigation.goBack();
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} expense:`, err);
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} expense. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const parsedUserPercentage = parseInt(userSplitPercentage);
  const partnerPercentage = splitType === 'custom'
    ? (100 - (!isNaN(parsedUserPercentage) ? parsedUserPercentage : 0))
    : 50;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Expense' : 'Add Expense'}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.currencySymbol}>{getCurrencySymbol(expenseCurrency)}</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0.00"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Currency Selection */}
        <View style={styles.section}>
          <CurrencyPicker
            selectedCurrency={expenseCurrency}
            onSelect={setExpenseCurrency}
            label="Expense Currency"
          />
        </View>

        {/* Exchange Rate Input (only if different from primary) */}
        {expenseCurrency !== primaryCurrency && parseFloat(amount) > 0 && (
          <ExchangeRateInput
            fromAmount={parseFloat(amount) || 0}
            fromCurrency={expenseCurrency}
            toCurrency={primaryCurrency}
            onRateChange={setExchangeRate}
            onConvertedAmountChange={setConvertedAmount}
            initialRate={exchangeRate !== 1.0 ? exchangeRate : null}
            style={styles.exchangeRateSection}
          />
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="What did you pay for?"
            placeholderTextColor={COLORS.textSecondary}
            maxLength={100}
          />
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoriesGrid}>
            {Object.entries(budgetCategories).map(([key, category]) => {
              const progress = budgetProgress?.categoryProgress[key];
              const nearBudget = progress && progress.percentage >= 80;
              const overBudget = progress && progress.percentage >= 100;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryButton,
                    selectedCategory === key && styles.categoryButtonSelected,
                    selectedCategory === key && { backgroundColor: COLORS.primary + '20' },
                  ]}
                  onPress={() => setSelectedCategory(key)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  {isBudgetEnabled && nearBudget && (
                    <Text style={[styles.budgetWarning, overBudget && styles.budgetWarningOver]}>
                      {overBudget ? '!' : '⚠'}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Paid By */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Paid by</Text>
          <View style={styles.paidByContainer}>
            <TouchableOpacity
              style={[
                styles.paidByButton,
                paidBy === user.uid && styles.paidByButtonSelected,
              ]}
              onPress={() => setPaidBy(user.uid)}
            >
              <Text style={[
                styles.paidByText,
                paidBy === user.uid && styles.paidByTextSelected,
              ]}>
                You
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paidByButton,
                paidBy === userDetails.partnerId && styles.paidByButtonSelected,
              ]}
              onPress={() => setPaidBy(userDetails.partnerId)}
            >
              <Text style={[
                styles.paidByText,
                paidBy === userDetails.partnerId && styles.paidByTextSelected,
              ]}>
                Partner
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Split Options */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Split</Text>
          <View style={styles.splitTypeContainer}>
            <TouchableOpacity
              style={[
                styles.splitTypeButton,
                splitType === 'equal' && styles.splitTypeButtonSelected,
              ]}
              onPress={() => setSplitType('equal')}
            >
              <Text style={[
                styles.splitTypeText,
                splitType === 'equal' && styles.splitTypeTextSelected,
              ]}>
                50/50
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.splitTypeButton,
                splitType === 'custom' && styles.splitTypeButtonSelected,
              ]}
              onPress={() => setSplitType('custom')}
            >
              <Text style={[
                styles.splitTypeText,
                splitType === 'custom' && styles.splitTypeTextSelected,
              ]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {splitType === 'custom' && (
            <View style={styles.customSplitContainer}>
              <View style={styles.splitInputRow}>
                <Text style={styles.splitLabel}>Your share:</Text>
                <View style={styles.splitInputContainer}>
                  <TextInput
                    style={styles.splitInput}
                    value={userSplitPercentage}
                    onChangeText={handleSplitPercentageChange}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.splitPercentSymbol}>%</Text>
                </View>
              </View>
              <View style={styles.splitInputRow}>
                <Text style={styles.splitLabel}>Partner's share:</Text>
                <Text style={styles.splitValue}>{partnerPercentage}%</Text>
              </View>
            </View>
          )}
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            COMMON_STYLES.primaryButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>
              {isEditMode ? 'Save Changes' : 'Add Expense'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    padding: SPACING.screenPadding,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    marginBottom: SPACING.large,
  },
  backButton: {
    padding: SPACING.small,
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 20,
    color: COLORS.text,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  currencySymbol: {
    ...FONTS.heading,
    fontSize: 48,
    color: COLORS.textSecondary,
    marginRight: SPACING.small,
  },
  amountInput: {
    ...FONTS.heading,
    fontSize: 48,
    color: COLORS.text,
    fontWeight: 'bold',
    minWidth: 120,
    textAlign: 'left',
  },
  section: {
    marginBottom: SPACING.large,
  },
  exchangeRateSection: {
    marginBottom: SPACING.large,
  },
  sectionLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.base,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  descriptionInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    ...FONTS.body,
    color: COLORS.text,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.base,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.small,
  },
  categoryButtonSelected: {
    borderWidth: 2,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: SPACING.small,
  },
  categoryName: {
    ...FONTS.small,
    color: COLORS.text,
    textAlign: 'center',
  },
  budgetWarning: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 16,
  },
  budgetWarningOver: {
    fontSize: 18,
  },
  paidByContainer: {
    flexDirection: 'row',
    gap: SPACING.base,
  },
  paidByButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paidByButtonSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  paidByText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  paidByTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  splitTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.base,
    marginBottom: SPACING.base,
  },
  splitTypeButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  splitTypeButtonSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  splitTypeText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  splitTypeTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  customSplitContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    gap: SPACING.base,
  },
  splitInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitLabel: {
    ...FONTS.body,
    color: COLORS.text,
  },
  splitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: SPACING.base,
  },
  splitInput: {
    ...FONTS.body,
    color: COLORS.text,
    padding: SPACING.small,
    width: 60,
    textAlign: 'right',
  },
  splitPercentSymbol: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: SPACING.tiny,
  },
  splitValue: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    marginBottom: SPACING.base,
    gap: SPACING.small,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
