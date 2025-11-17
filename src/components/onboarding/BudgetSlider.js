// src/components/onboarding/BudgetSlider.js
// Interactive slider for budget allocation with real-time value display

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

export default function BudgetSlider({
  category,
  value,
  min = 0,
  max = 10000,
  onChange,
  showMonthly = true,
  showProgress = true,
  totalBudget = null,
  style,
}) {
  const formatCurrency = (num) => {
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}k`;
    }
    return `$${num.toFixed(0)}`;
  };

  const monthlyAmount = Math.round(value / 12);
  const percentage = ((value / max) * 100).toFixed(0);

  // Color coding based on allocation
  const getColorCode = () => {
    const percent = (value / max) * 100;
    if (percent >= 75) {
      return {
        color: '#ef4444', // Red
        label: 'High',
      };
    } else if (percent >= 40) {
      return {
        color: '#f59e0b', // Yellow/Orange
        label: 'Moderate',
      };
    } else {
      return {
        color: COLORS.success, // Green
        label: 'Low',
      };
    }
  };

  const colorCode = getColorCode();

  // Calculate percentage of total budget if provided
  const totalPercentage = totalBudget && totalBudget > 0
    ? ((value / totalBudget) * 100).toFixed(1)
    : null;

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryInfo}>
          {category?.icon && <Text style={styles.icon}>{category.icon}</Text>}
          <Text style={styles.categoryName}>{category?.name || 'Category'}</Text>
        </View>
        {showProgress && (
          <View style={styles.allocationBadge}>
            <View
              style={[
                styles.allocationDot,
                { backgroundColor: colorCode.color },
              ]}
            />
            <Text style={styles.allocationLabel}>{colorCode.label}</Text>
          </View>
        )}
      </View>

      {/* Value Display */}
      <View style={styles.valueContainer}>
        <View style={styles.amountRow}>
          <Text style={styles.valueAmount}>${value.toFixed(0)}</Text>
          <Text style={styles.valueLabel}> / year</Text>
        </View>
        {showMonthly && (
          <Text style={styles.monthlyAmount}>
            ${monthlyAmount.toFixed(0)} / month
          </Text>
        )}
        {totalPercentage && (
          <Text style={styles.totalPercentage}>
            {totalPercentage}% of total budget
          </Text>
        )}
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={colorCode.color}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={colorCode.color}
          step={100}
        />
      </View>

      {/* Range Labels */}
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>{formatCurrency(min)}</Text>
        <Text style={styles.rangeLabel}>{formatCurrency(max)}</Text>
      </View>

      {/* Progress Bar (mirrors slider) */}
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: colorCode.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{percentage}% of maximum</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 28,
    marginRight: SPACING.small,
  },
  categoryName: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  allocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SPACING.small,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadius.small,
  },
  allocationDot: {
    width: 8,
    height: 8,
    borderRadius: SIZES.borderRadius.round,
    marginRight: SPACING.tiny,
  },
  allocationLabel: {
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  valueContainer: {
    marginBottom: SPACING.base,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  valueLabel: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  monthlyAmount: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  totalPercentage: {
    fontSize: FONTS.sizes.small,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
    marginTop: SPACING.tiny,
  },
  sliderContainer: {
    marginVertical: SPACING.small,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -SPACING.small,
    marginBottom: SPACING.small,
  },
  rangeLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textTertiary,
    fontWeight: FONTS.weights.medium,
  },
  progressContainer: {
    marginTop: SPACING.medium,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.borderRadius.small,
    overflow: 'hidden',
    marginBottom: SPACING.tiny,
  },
  progressFill: {
    height: '100%',
    borderRadius: SIZES.borderRadius.small,
  },
  progressText: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
