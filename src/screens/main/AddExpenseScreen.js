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

import React, { useState } from 'react';
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
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';
import { CATEGORIES } from '../../constants/categories';
import { calculateEqualSplit, calculateSplit, roundCurrency } from '../../utils/calculations';

export default function AddExpenseScreen({ navigation }) {
  const { user, userDetails } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [paidBy, setPaidBy] = useState(user.uid); // Who paid
  const [splitType, setSplitType] = useState('equal'); // 'equal' or 'custom'
  const [userSplitPercentage, setUserSplitPercentage] = useState('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    const num = parseInt(cleaned) || 0;
    if (num > 100) return;
    setUserSplitPercentage(cleaned);
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
        const userPercentage = parseInt(userSplitPercentage) || 50;
        const partnerPercentage = 100 - userPercentage;
        splitDetails = calculateSplit(expenseAmount, userPercentage, partnerPercentage);
      }

      // Create expense document
      const expenseData = {
        amount: expenseAmount,
        description: description.trim(),
        category: selectedCategory,
        paidBy: paidBy,
        coupleId: userDetails.coupleId,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        splitDetails: {
          user1Amount: roundCurrency(paidBy === user.uid ? splitDetails.user1Amount : splitDetails.user2Amount),
          user2Amount: roundCurrency(paidBy === user.uid ? splitDetails.user2Amount : splitDetails.user1Amount),
          user1Percentage: paidBy === user.uid ? splitDetails.user1Percentage : splitDetails.user2Percentage,
          user2Percentage: paidBy === user.uid ? splitDetails.user2Percentage : splitDetails.user1Percentage,
        },
      };

      console.log('Creating expense:', expenseData);
      await addDoc(collection(db, 'expenses'), expenseData);

      // Update couple's lastActivity
      await updateDoc(doc(db, 'couples', userDetails.coupleId), {
        lastActivity: serverTimestamp(),
      });

      console.log('✓ Expense created successfully');

      // Navigate back to home
      navigation.goBack();
    } catch (err) {
      console.error('Error creating expense:', err);
      setError(err.message || 'Failed to create expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const partnerPercentage = splitType === 'custom'
    ? (100 - (parseInt(userSplitPercentage) || 0))
    : 50;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.currencySymbol}>$</Text>
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
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonSelected,
                  { borderColor: category.color },
                  selectedCategory === category.id && { backgroundColor: category.color + '20' },
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
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
            <Text style={COMMON_STYLES.primaryButtonText}>Add Expense</Text>
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
  scrollContent: {
    padding: SPACING.screenPadding,
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
