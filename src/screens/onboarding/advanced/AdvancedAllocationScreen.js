// src/screens/onboarding/advanced/AdvancedAllocationScreen.js
// Advanced Mode Budget Allocation - Step 5/7

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';

export default function AdvancedAllocationScreen({ navigation, route }) {
  const { categoriesData } = route.params || {};
  const { mode, annualAmount, monthlyAmount, selectedCategories } = categoriesData || {};

  const totalBudget = mode === 'annual' ? annualAmount : monthlyAmount * 12;
  const [allocations, setAllocations] = useState({});

  // Initialize with default budgets
  useEffect(() => {
    const initial = {};
    selectedCategories?.forEach((category) => {
      initial[category.key] = category.defaultBudget || 0;
    });
    setAllocations(initial);
  }, []);

  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const remaining = totalBudget - totalAllocated;
  const isValid = Math.abs(remaining) < 0.01; // Allow for small floating point errors

  const handleAllocationChange = (key, value) => {
    setAllocations({
      ...allocations,
      [key]: Math.round(value),
    });
  };

  const handleAutoDistribute = () => {
    const numCategories = selectedCategories.length;
    const perCategory = Math.floor(totalBudget / numCategories);
    const extra = totalBudget - perCategory * numCategories;

    const newAllocations = {};
    selectedCategories.forEach((category, index) => {
      newAllocations[category.key] = perCategory + (index === 0 ? extra : 0);
    });
    setAllocations(newAllocations);
  };

  const handleReset = () => {
    const initial = {};
    selectedCategories?.forEach((category) => {
      initial[category.key] = category.defaultBudget || 0;
    });
    setAllocations(initial);
  };

  const handleContinue = () => {
    if (!isValid) {
      alert('Please allocate the full budget before continuing');
      return;
    }

    const allocationData = {
      ...categoriesData,
      allocations,
      totalBudget,
    };

    navigation.navigate('AdvancedSavings', { allocationData });
  };

  const formatCurrency = (value) => {
    return Math.round(value).toLocaleString('en-US');
  };

  const getProgressColor = (percentage) => {
    if (percentage > 100) return COLORS.error;
    if (percentage > 80) return COLORS.warning;
    return COLORS.success;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step 5 of 7</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '71.4%' }]} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          Divide your ${formatCurrency(totalBudget)}
          {mode === 'annual' ? '/year' : ''}
        </Text>

        {/* Remaining Amount */}
        <View
          style={[
            styles.remainingCard,
            remaining < 0 && styles.remainingCardNegative,
          ]}
        >
          <Text style={styles.remainingLabel}>Remaining</Text>
          <Text
            style={[
              styles.remainingAmount,
              remaining < 0 && styles.remainingAmountNegative,
            ]}
          >
            ${formatCurrency(Math.abs(remaining))}
            {remaining < 0 && ' over'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAutoDistribute}
          >
            <Text style={styles.actionButtonText}>Auto-Distribute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
            <Text style={styles.actionButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Sliders */}
        {selectedCategories?.map((category) => {
          const allocation = allocations[category.key] || 0;
          const monthlyAllocation = mode === 'annual' ? allocation / 12 : allocation;
          const percentage = totalBudget > 0 ? (allocation / totalBudget) * 100 : 0;
          const progressColor = getProgressColor(percentage);

          return (
            <View key={category.key} style={styles.categorySlider}>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <View style={styles.categoryTitleContainer}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryMonthly}>
                      ${formatCurrency(monthlyAllocation)}/mo
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryAmount}>
                  <Text style={styles.categoryAmountText}>
                    ${formatCurrency(allocation)}
                  </Text>
                  {mode === 'annual' && (
                    <Text style={styles.categoryAmountLabel}>/year</Text>
                  )}
                </View>
              </View>

              {/* Slider */}
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={totalBudget}
                value={allocation}
                onValueChange={(value) =>
                  handleAllocationChange(category.key, value)
                }
                minimumTrackTintColor={progressColor}
                maximumTrackTintColor={COLORS.borderLight}
                thumbTintColor={progressColor}
              />

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressPercentage, { color: progressColor }]}>
                  {percentage.toFixed(0)}%
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isValid && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={!isValid}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  header: {
    padding: SPACING.screenPadding,
    paddingTop: SPACING.huge,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  progressContainer: {
    marginBottom: SPACING.large,
  },
  progressText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  title: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.base,
  },
  remainingCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    alignItems: 'center',
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  remainingCardNegative: {
    backgroundColor: '#fff5f5',
    borderColor: COLORS.error,
  },
  remainingLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
  },
  remainingAmount: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.success,
  },
  remainingAmountNegative: {
    color: COLORS.error,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.small,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.screenPadding,
  },
  categorySlider: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: SPACING.small,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  categoryMonthly: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  categoryAmountText: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  categoryAmountLabel: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    width: 40,
    textAlign: 'right',
  },
  footer: {
    padding: SPACING.screenPadding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  continueButton: {
    ...COMMON_STYLES.primaryButton,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
});
