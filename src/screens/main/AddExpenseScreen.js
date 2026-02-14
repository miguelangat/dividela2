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
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';
import { calculateEqualSplit, calculateSplit, roundCurrency } from '../../utils/calculations';
import * as expenseService from '../../services/expenseService';
import CurrencyPicker from '../../components/CurrencyPicker';
import ExchangeRateInput from '../../components/ExchangeRateInput';
import { getCurrencyInfo, getCurrencySymbol } from '../../constants/currencies';
import { createMultiCurrencyExpense, formatCurrency } from '../../utils/currencyUtils';
import {
  getPrimaryCurrency,
  saveRecentExchangeRate,
  getRecentExchangeRate,
} from '../../services/coupleSettingsService';
import { scanReceiptDirect, recordOCRFeedback } from '../../services/ocrService';
import { createMerchantAlias } from '../../services/merchantAliasService';
import OCRSuggestionCard from '../../components/OCRSuggestionCard';
import OCRProcessingBanner from '../../components/OCRProcessingBanner';
import FieldLabel from '../../components/FieldLabel';
import SplitPreviewCard from '../../components/SplitPreviewCard';

export default function AddExpenseScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { user, userDetails } = useAuth();
  const { categories: budgetCategories, budgetProgress, isBudgetEnabled } = useBudget();
  const { isPremium } = useSubscription();

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
  const [confirmedLargeAmount, setConfirmedLargeAmount] = useState(false);

  // Multi-currency state
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');
  const [expenseCurrency, setExpenseCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [convertedAmount, setConvertedAmount] = useState(0);

  // OCR state (simplified - no upload/storage needed)
  const [ocrState, setOcrState] = useState({
    status: 'idle', // idle | processing | ready | failed
    suggestions: null,
    error: null,
  });

  // Date picker state
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Focus state management
  const [focusStates, setFocusStates] = useState({
    amount: false,
    description: false,
  });

  // Fetch primary currency on mount and when screen comes into focus
  // This ensures currency updates when changed in Settings
  useFocusEffect(
    React.useCallback(() => {
      const fetchPrimaryCurrency = async () => {
        if (userDetails?.coupleId) {
          try {
            const currency = await getPrimaryCurrency(userDetails.coupleId);
            setPrimaryCurrency(currency.code);
            // Only update expense currency if not editing and not already set
            if (!isEditMode && expenseCurrency === primaryCurrency) {
              setExpenseCurrency(currency.code);
            }
          } catch (error) {
            console.error('Error fetching primary currency:', error);
          }
        }
      };
      fetchPrimaryCurrency();
    }, [userDetails?.coupleId, isEditMode, expenseCurrency, primaryCurrency])
  );

  // Pre-populate form when editing
  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString());
      setDescription(editingExpense.description);
      setSelectedCategory(editingExpense.categoryKey || editingExpense.category || 'food');
      setPaidBy(editingExpense.paidBy);

      // Set date if available
      if (editingExpense.date) {
        setExpenseDate(new Date(editingExpense.date));
      }

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
      } else if (userPercentage === 100 || userPercentage === 0) {
        setSplitType('full');
      } else {
        setSplitType('custom');
        setUserSplitPercentage(userPercentage.toString());
      }
    }
  }, [editingExpense]);

  const handleAmountChange = (text) => {
    // Remove all non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');

    // Handle multiple decimal points - only allow one
    const parts = cleaned.split('.');
    if (parts.length > 2) return;

    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) return;

    // Store the raw value (without formatting)
    setAmount(cleaned);
    setError('');
    // Reset large amount confirmation when amount changes
    setConfirmedLargeAmount(false);
  };

  // Format number with thousands separator for display
  const formatAmountForDisplay = (value) => {
    if (!value) return '';

    const parts = value.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add thousands separator
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Return with decimal part if it exists
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart}`
      : formattedInteger;
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

  // OCR Handlers
  const handleScanReceipt = async () => {
    try {
      console.log('=== SCAN RECEIPT BUTTON TAPPED ===');
      console.log('Current OCR state:', ocrState.status);
      console.log('User isPremium:', isPremium);

      // Check premium status before proceeding
      if (!isPremium) {
        console.log('User is not premium, redirecting to paywall');
        navigation.navigate('Paywall', { feature: 'receipt_scanning' });
        return;
      }

      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('addExpense.ocr.permissionTitle'),
          t('addExpense.ocr.permissionMessage'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets[0].uri;
      console.log('📸 Photo captured:', imageUri);
      await processImageReceipt(imageUri);
    } catch (err) {
      console.error('❌ Error capturing photo:', err);
      setOcrState({
        status: 'failed',
        suggestions: null,
        error: err.message || 'Failed to capture photo',
      });
    }
  };

  const processImageReceipt = async (imageUri) => {
    try {
      // Set processing state
      setOcrState({
        status: 'processing',
        suggestions: null,
        error: null,
      });
      setError('');

      console.log('🔍 Starting OCR processing...');

      // Call Cloud Function directly with image
      const ocrData = await scanReceiptDirect(
        imageUri,
        userDetails.coupleId,
        user.uid
      );

      console.log('✅ OCR completed successfully');

      // Update state with suggestions
      setOcrState({
        status: 'ready',
        suggestions: {
          merchant: ocrData.merchant,
          amount: ocrData.amount,
          date: ocrData.date,
          // Currency detection (NEW)
          currency: ocrData.currency,
          currencyConfidence: ocrData.currencyConfidence,
          currencyDetected: ocrData.currencyDetected,
          // Category prediction - structured as object for OCRSuggestionCard
          category: {
            category: ocrData.suggestedCategory || 'other',
            confidence: ocrData.categoryConfidence || 0,
            reasoning: ocrData.categoryReasoning || null,
            alternatives: ocrData.alternativeCategories || [],
            belowThreshold: (ocrData.categoryConfidence || 0) < 0.55,
          },
          confidence: ocrData.ocrConfidence,
          source: 'direct-ocr',
        },
        error: null,
      });

      // Show success message
      Alert.alert(
        t('addExpense.ocr.successTitle'),
        t('addExpense.ocr.successMessage'),
        [{ text: t('common.ok') }]
      );
    } catch (err) {
      console.error('❌ Error processing image receipt:', err);
      setOcrState({
        status: 'failed',
        suggestions: null,
        error: err.message || t('addExpense.ocr.failedMessage'),
      });

      Alert.alert(
        t('addExpense.ocr.failedTitle'),
        err.message || t('addExpense.ocr.failedMessage'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const handleAcceptSuggestions = (suggestions) => {
    // Pre-fill form fields
    if (suggestions.amount) {
      setAmount(suggestions.amount.toString());
    }
    if (suggestions.merchant) {
      setDescription(suggestions.merchant);
    }
    if (suggestions.category?.category) {
      setSelectedCategory(suggestions.category.category.toLowerCase());
    }
    // Set currency if detected with good confidence (>= 70%)
    // This allows OCR to override the default currency when confident
    if (suggestions.currency && suggestions.currencyConfidence >= 0.7) {
      setExpenseCurrency(suggestions.currency);
    }

    // Clear OCR state
    setOcrState({
      status: 'idle',
      expenseId: null,
      receiptUrl: null,
      suggestions: null,
      error: null,
    });
  };

  const handleDismissSuggestions = () => {
    setOcrState({
      status: 'idle',
      expenseId: null,
      receiptUrl: null,
      suggestions: null,
      error: null,
    });
  };

  const handleCreateAlias = async (ocrMerchant, userAlias) => {
    try {
      await createMerchantAlias(ocrMerchant, userAlias, userDetails.coupleId);
      Alert.alert(t('common.success'), t('addExpense.ocr.aliasSuccess'));
    } catch (err) {
      console.error('Error creating alias:', err);
      Alert.alert(t('common.error'), err.message || t('addExpense.ocr.aliasError'));
    }
  };

  // Note: OCR processing is now direct/immediate, no subscription needed

  // Handle cancel with confirmation if form has data
  const handleCancel = () => {
    const hasData = amount || description || selectedCategory !== 'food' || splitType !== 'equal';

    if (hasData) {
      Alert.alert(
        t('addExpense.discard.title'),
        t('addExpense.discard.message'),
        [
          { text: t('addExpense.discard.keepEditing'), style: 'cancel' },
          {
            text: t('addExpense.discard.discard'),
            style: 'destructive',
            onPress: () => navigation.goBack()
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

      // Currency-aware large amount warning (soft validation)
      const currencyInfo = getCurrencyInfo(expenseCurrency);
      const warningThreshold = currencyInfo.warningThreshold || 10000;

      if (expenseAmount > warningThreshold && !confirmedLargeAmount) {
        const formattedAmount = formatCurrency(expenseAmount, expenseCurrency);
        Alert.alert(
          t('addExpense.largeAmount.title'),
          t('addExpense.largeAmount.message', { amount: formattedAmount }),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
              onPress: () => setLoading(false),
            },
            {
              text: t('addExpense.largeAmount.confirm'),
              onPress: () => {
                setConfirmedLargeAmount(true);
                // Re-trigger submit after confirmation
                setTimeout(() => handleSubmit(), 0);
              },
            },
          ]
        );
        setLoading(false);
        return;
      }

      // Calculate split
      let splitDetails;
      if (splitType === 'equal') {
        splitDetails = calculateEqualSplit(expenseAmount);
      } else if (splitType === 'full') {
        // NEW: Paid in Full - "All Mine" / "All Theirs"
        if (paidBy === user.uid) {
          splitDetails = {
            user1Amount: expenseAmount,
            user2Amount: 0,
            user1Percentage: 100,
            user2Percentage: 0,
          };
        } else {
          splitDetails = {
            user1Amount: 0,
            user2Amount: expenseAmount,
            user1Percentage: 0,
            user2Percentage: 100,
          };
        }
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
      } else if (splitType === 'full') {
        // Paid in Full with converted amount
        if (paidBy === user.uid) {
          splitDetails = {
            user1Amount: amountForSplit,
            user2Amount: 0,
            user1Percentage: 100,
            user2Percentage: 0,
          };
        } else {
          splitDetails = {
            user1Amount: 0,
            user2Amount: amountForSplit,
            user1Percentage: 0,
            user2Percentage: 100,
          };
        }
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
          date: expenseDate.toISOString(), // Use selected date
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

      // Record OCR feedback if suggestions were used
      if (ocrState.suggestions && !isEditMode) {
        try {
          await recordOCRFeedback(
            ocrState.suggestions,
            {
              amount: expenseAmount,
              description: description.trim(),
              category: selectedCategory,
            },
            userDetails.coupleId
          );
          console.log('✓ OCR feedback recorded');
        } catch (feedbackErr) {
          console.error('Error recording OCR feedback:', feedbackErr);
          // Don't fail the expense creation if feedback recording fails
        }
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
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{isEditMode ? t('addExpense.editTitle') : t('addExpense.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('addExpense.subtitle')}</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
        </LinearGradient>

        {/* Description */}
        <View style={styles.section}>
          <FieldLabel label={t('addExpense.addNoteLabel')} optional />
          <Text style={styles.helperText}>
            {t('addExpense.noteHelper')}
          </Text>
          <TextInput
            style={[
              styles.descriptionInput,
              focusStates.description && styles.descriptionInputFocused
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('addExpense.notePlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
            maxLength={200}
            onFocus={() => setFocusStates(s => ({ ...s, description: true }))}
            onBlur={() => setFocusStates(s => ({ ...s, description: false }))}
            autoFocus
          />
        </View>

        {/* Currency Selection */}
        <View style={styles.section}>
          <CurrencyPicker
            selectedCurrency={expenseCurrency}
            onSelect={setExpenseCurrency}
            label={t('addExpense.expenseCurrency')}
          />
        </View>

        {/* Amount Input */}
        <View style={[
          styles.amountSection,
          focusStates.amount && styles.amountSectionFocused
        ]}>
          <Text style={styles.currencySymbol}>{getCurrencySymbol(expenseCurrency)}</Text>
          <TextInput
            style={styles.amountInput}
            value={formatAmountForDisplay(amount)}
            onChangeText={handleAmountChange}
            placeholder={t('addExpense.amountPlaceholder')}
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="decimal-pad"
            onFocus={() => setFocusStates(s => ({ ...s, amount: true }))}
            onBlur={() => setFocusStates(s => ({ ...s, amount: false }))}
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

        {/* Scan Receipt Section - MOVED from top to below amount */}
        {!isEditMode && (
          <View style={styles.scanSection}>
            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('addExpense.scanDivider')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Scan Receipt Button */}
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanReceipt}
              testID="scan-receipt-button"
              disabled={ocrState.status === 'processing'}
            >
              <Ionicons name="camera" size={24} color={COLORS.primary} />
              <Text style={styles.scanButtonText}>{t('addExpense.scanReceipt')}</Text>
              {!isPremium && (
                <Ionicons name="lock-closed" size={16} color={COLORS.warning} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>

            {/* OCR Processing Banner */}
            {ocrState.status === 'processing' && (
              <OCRProcessingBanner
                status={ocrState.status}
                style={styles.ocrBanner}
              />
            )}

            {/* OCR Suggestion Card */}
            {ocrState.status === 'ready' && ocrState.suggestions && (
              <OCRSuggestionCard
                receiptUrl={ocrState.receiptUrl}
                suggestions={ocrState.suggestions}
                currency={primaryCurrency}
                onAccept={handleAcceptSuggestions}
                onDismiss={handleDismissSuggestions}
                onCreateAlias={handleCreateAlias}
                style={styles.ocrSuggestion}
              />
            )}

            {/* OCR Error Banner */}
            {ocrState.status === 'failed' && ocrState.error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{ocrState.error}</Text>
              </View>
            )}
          </View>
        )}

        {/* Category Selection */}
        <View style={styles.section}>
          <FieldLabel label={t('addExpense.categoryLabel')} required />
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
                  testID={`category-button-${key}`}
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

        {/* Date Selection */}
        <View style={styles.section}>
          <FieldLabel label={t('addExpense.dateLabel')} required />
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.dateText}>
              {formatDate(expenseDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker - Platform specific */}
        {Platform.OS === 'ios' && showDatePicker && (
          <Modal visible={showDatePicker} transparent animationType="slide">
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerButton}>{t('addExpense.dateDone')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={expenseDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setExpenseDate(selectedDate);
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={expenseDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setExpenseDate(selectedDate);
            }}
          />
        )}

        {/* Paid By */}
        <View style={styles.section}>
          <FieldLabel label={t('addExpense.whoPaid')} required />
          <View style={styles.paidByContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.paidByCard,
                paidBy === user.uid && styles.paidByCardSelected,
                pressed && paidBy !== user.uid && styles.paidByCardPressed,
              ]}
              onPress={() => setPaidBy(user.uid)}
            >
              <Ionicons
                name="person"
                size={32}
                color={paidBy === user.uid ? COLORS.background : COLORS.primary}
              />
              <Text style={[
                styles.paidByText,
                paidBy === user.uid && styles.paidByTextSelected,
              ]}>
                {t('addExpense.you')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.paidByCard,
                paidBy === userDetails.partnerId && styles.paidByCardSelected,
                pressed && paidBy !== userDetails.partnerId && styles.paidByCardPressed,
              ]}
              onPress={() => setPaidBy(userDetails.partnerId)}
            >
              <Ionicons
                name="person"
                size={32}
                color={paidBy === userDetails.partnerId ? COLORS.background : COLORS.primary}
              />
              <Text style={[
                styles.paidByText,
                paidBy === userDetails.partnerId && styles.paidByTextSelected,
              ]}>
                {t('addExpense.partner')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Split Options */}
        <View style={styles.section}>
          <FieldLabel label={t('addExpense.splitMethod')} required />
          <View style={styles.splitTypeContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.splitTypeButton,
                splitType === 'equal' && styles.splitTypeButtonSelected,
                pressed && splitType !== 'equal' && styles.splitTypeButtonPressed,
              ]}
              onPress={() => setSplitType('equal')}
            >
              <Text style={styles.splitIcon}>⚖️</Text>
              <Text style={[
                styles.splitTypeText,
                splitType === 'equal' && styles.splitTypeTextSelected,
              ]}>
                {t('addExpense.splitEqual')}
              </Text>
              <Text style={styles.splitDescription}>{t('addExpense.splitEqually')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.splitTypeButton,
                splitType === 'full' && styles.splitTypeButtonSelected,
                pressed && splitType !== 'full' && styles.splitTypeButtonPressed,
              ]}
              onPress={() => setSplitType('full')}
            >
              <Text style={styles.splitIcon}>💯</Text>
              <Text style={[
                styles.splitTypeText,
                splitType === 'full' && styles.splitTypeTextSelected,
              ]}>
                {paidBy === user.uid ? t('addExpense.splitFull') : t('addExpense.splitFullTheirs')}
              </Text>
              <Text style={styles.splitDescription}>{t('addExpense.splitFullDescription')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.splitTypeButton,
                splitType === 'custom' && styles.splitTypeButtonSelected,
                pressed && splitType !== 'custom' && styles.splitTypeButtonPressed,
              ]}
              onPress={() => setSplitType('custom')}
            >
              <Text style={styles.splitIcon}>🎯</Text>
              <Text style={[
                styles.splitTypeText,
                splitType === 'custom' && styles.splitTypeTextSelected,
              ]}>
                {t('addExpense.custom')}
              </Text>
              <Text style={styles.splitDescription}>{t('addExpense.customDescription')}</Text>
            </Pressable>
          </View>

          {splitType === 'custom' && (
            <View style={styles.customSplitContainer}>
              <View style={styles.splitInputRow}>
                <Text style={styles.splitLabel}>{t('addExpense.yourShare')}</Text>
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
                <Text style={styles.splitLabel}>{t('addExpense.partnerShare')}</Text>
                <Text style={styles.splitValue}>{partnerPercentage}%</Text>
              </View>
            </View>
          )}

          {/* Split Preview - only show AFTER split type is selected */}
          {amount && parseFloat(amount) > 0 && paidBy && splitType && (
            <SplitPreviewCard
              amount={parseFloat(amount)}
              currency={expenseCurrency}
              splitType={splitType}
              userPercentage={splitType === 'custom' ? parseInt(userSplitPercentage) || 50 : 50}
              paidBy={paidBy}
              userId={user.uid}
              userName="You"
              partnerName={userDetails.partnerName || "Partner"}
            />
          )}
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
            ]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>{t('addExpense.cancel')}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && !loading && styles.submitButtonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? t('addExpense.saveChanges') : t('addExpense.create')}
              </Text>
            )}
          </Pressable>
        </View>
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
  headerGradient: {
    marginHorizontal: -SPACING.screenPadding,
    marginTop: -SPACING.screenPadding,
    marginBottom: SPACING.large,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: SPACING.xlarge,
    paddingHorizontal: SPACING.screenPadding,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    padding: SPACING.small,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textWhite,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textWhite,
    opacity: 0.9,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingVertical: SPACING.large,
    paddingHorizontal: SPACING.base,
  },
  amountSectionFocused: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  currencySymbol: {
    ...FONTS.heading,
    fontSize: 56,
    color: COLORS.primary,
    marginRight: SPACING.small,
    fontWeight: '600',
  },
  amountInput: {
    ...FONTS.heading,
    fontSize: 56,
    color: COLORS.text,
    fontWeight: 'bold',
    minWidth: 150,
    textAlign: 'left',
    letterSpacing: -1,
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
    backgroundColor: COLORS.descriptionBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: SPACING.base,
    ...FONTS.body,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  descriptionInputFocused: {
    borderStyle: 'solid',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    fontStyle: 'italic',
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
  paidByCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.large,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: SPACING.small,
  },
  paidByCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  paidByCardPressed: {
    backgroundColor: COLORS.backgroundLight,
    transform: [{ scale: 0.98 }],
  },
  paidByText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  paidByTextSelected: {
    color: COLORS.background,
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
    gap: SPACING.tiny,
  },
  splitTypeButtonSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  splitTypeButtonPressed: {
    backgroundColor: COLORS.backgroundLight,
    transform: [{ scale: 0.98 }],
  },
  splitIcon: {
    fontSize: 20,
  },
  splitDescription: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.8,
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
    backgroundColor: COLORS.errorBackground,
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
  // OCR Styles
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    gap: SPACING.small,
  },
  scanButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ocrBanner: {
    marginBottom: SPACING.base,
  },
  ocrSuggestion: {
    marginBottom: SPACING.base,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.large,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.base,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  // Scan section styles
  scanSection: {
    marginBottom: SPACING.xlarge,
  },
  // Date picker styles
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.base,
    gap: SPACING.small,
  },
  dateText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: SPACING.xlarge,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datePickerButton: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  // Action button styles
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.base,
    marginTop: SPACING.xlarge,
    paddingTop: SPACING.large,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  cancelButtonPressed: {
    backgroundColor: COLORS.backgroundLight,
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonPressed: {
    shadowOpacity: 0.6,
    shadowRadius: 16,
    transform: [{ scale: 0.98 }],
  },
  submitButtonText: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
