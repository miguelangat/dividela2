// src/components/BudgetProgressCard.js
// Component to display budget progress with visual progress bar

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';

export default function BudgetProgressCard({
  category,
  progress, // { budget, spent, remaining, percentage, status }
  style,
}) {
  const getProgressColor = () => {
    if (progress.status === 'danger') {
      return ['#ef4444', '#dc2626']; // Red gradient
    } else if (progress.status === 'warning') {
      return ['#f59e0b', '#f97316']; // Orange gradient
    } else {
      return [COLORS.primary, '#764ba2']; // Purple gradient (normal)
    }
  };

  const [colorStart, colorEnd] = getProgressColor();
  const progressPercentage = Math.min(progress.percentage, 100);

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{category.icon}</Text>
        <Text style={styles.name}>{category.name}</Text>
      </View>

      {/* Amount */}
      <View style={styles.amountContainer}>
        <Text style={styles.spentAmount}>
          {formatCurrency(progress.spent)}
        </Text>
        <Text style={styles.budgetAmount}>
          {' '}/ {formatCurrency(progress.budget)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: colorStart,
              },
            ]}
          />
        </View>
      </View>

      {/* Stats */}
      <Text style={styles.statsText}>
        {progress.percentage.toFixed(0)}% used • {formatCurrency(Math.abs(progress.remaining))} {progress.remaining >= 0 ? 'left' : 'over'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
    gap: SPACING.small,
  },
  icon: {
    fontSize: 24,
  },
  name: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: SPACING.small,
  },
  spentAmount: {
    fontSize: 24,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  budgetAmount: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    marginVertical: SPACING.small,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.borderRadius.small,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: SIZES.borderRadius.small,
  },
  statsText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.small,
  },
});
