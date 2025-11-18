// src/screens/onboarding/simple/SimpleFixedBudgetScreen.js
// Step 2 of Simple Mode: Fixed Budget configuration with amount input

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';
import ProgressStepper from '../../../components/onboarding/ProgressStepper';
import BudgetAmountInput from '../../../components/onboarding/BudgetAmountInput';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DEFAULT_CATEGORIES } from '../../../constants/defaultCategories';

export default function SimpleFixedBudgetScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userDetails } = useAuth();
  const { totalBudget, setTotalBudget, setCategoryBudgets, setBudgetStyle } = useOnboarding();
  const [amount, setAmount] = useState(totalBudget || 2400);
  const [distributedBudget, setDistributedBudget] = useState({});
  const [loading, setLoading] = useState(false);

  // Helper function to distribute budget proportionally across categories
  const calculateDistributedBudget = (totalAmount) => {
    // Calculate total of default budgets
    const defaultTotal = Object.values(DEFAULT_CATEGORIES).reduce(
      (sum, category) => sum + category.defaultBudget,
      0
    );

    // Distribute proportionally
    const distributed = {};
    Object.entries(DEFAULT_CATEGORIES).forEach(([key, category]) => {
      const percentage = category.defaultBudget / defaultTotal;
      distributed[key] = Math.round(totalAmount * percentage);
    });

    return distributed;
  };

  // Calculate distributed budget whenever amount changes
  useEffect(() => {
    if (amount > 0) {
      const distributed = calculateDistributedBudget(amount);
      setDistributedBudget(distributed);
    } else {
      setDistributedBudget({});
    }
  }, [amount]);

  const handleStartTracking = async () => {
    if (amount <= 0) {
      alert('Please enter a budget amount greater than zero.');
      return;
    }

    try {
      setLoading(true);

      // Save to context
      setTotalBudget(amount);
      setCategoryBudgets(distributedBudget);
      setBudgetStyle('fixed');

      // Navigate to success screen which will handle completion
      navigation.navigate('SimpleSuccess');
    } catch (error) {
      console.error('Error navigating to success screen:', error);
      alert('Failed to proceed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustDistribution = () => {
    // Navigate to advanced mode for custom distribution
    setTotalBudget(amount);
    setCategoryBudgets(distributedBudget);
    navigation.navigate('AdvancedOnboarding');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Progress Stepper */}
      <ProgressStepper currentStep={2} totalSteps={2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What's your monthly budget?</Text>
          <Text style={styles.subtitle}>
            We'll automatically distribute it across categories
          </Text>
        </View>

        {/* Budget Amount Input */}
        <BudgetAmountInput
          value={amount}
          onChangeValue={setAmount}
          suggestions={[1000, 2000, 3000, 4000]}
        />

        {/* Distribution Preview */}
        {amount > 0 && Object.keys(distributedBudget).length > 0 && (
          <View style={styles.distributionCard}>
            <Text style={styles.distributionTitle}>Budget Distribution</Text>
            <Text style={styles.distributionSubtitle}>
              Auto-calculated based on typical priorities
            </Text>

            <View style={styles.categoriesList}>
              {Object.entries(DEFAULT_CATEGORIES).map(([key, category]) => {
                const categoryBudget = distributedBudget[key] || 0;
                const percentage = amount > 0 ? ((categoryBudget / amount) * 100).toFixed(0) : 0;

                return (
                  <View key={key} style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <View style={styles.categoryTextContainer}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryPercentage}>{percentage}%</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryAmount}>
                      ${categoryBudget.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Note */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>
                💡 Based on recommended spending percentages
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.base) }]}>
        {/* Primary Button */}
        <TouchableOpacity
          style={[
            COMMON_STYLES.primaryButton,
            (loading || amount <= 0) && styles.buttonDisabled,
          ]}
          onPress={handleStartTracking}
          disabled={loading || amount <= 0}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>Start Tracking</Text>
          )}
        </TouchableOpacity>

        {/* Secondary Link */}
        {amount > 0 && (
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={handleAdjustDistribution}
            disabled={loading}
          >
            <Text style={styles.secondaryLinkText}>Adjust Distribution</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.xxlarge,
  },
  header: {
    marginTop: SPACING.base,
    marginBottom: SPACING.base,
  },
  title: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  distributionCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.base,
    marginTop: SPACING.large,
    ...SHADOWS.card,
  },
  distributionTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  distributionSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.base,
  },
  categoriesList: {
    marginBottom: SPACING.base,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: SPACING.small,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
  categoryPercentage: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  categoryAmount: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  noteContainer: {
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: SIZES.borderRadius.small,
    padding: SPACING.small,
    marginTop: SPACING.base,
  },
  noteText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: SPACING.screenPadding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: SPACING.base,
  },
  secondaryLinkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
});
