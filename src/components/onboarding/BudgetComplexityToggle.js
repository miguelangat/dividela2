// src/components/onboarding/BudgetComplexityToggle.js
// Segmented control for selecting budget complexity level

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

const COMPLEXITY_OPTIONS = [
  { value: 'none', label: 'None', icon: '🚫' },
  { value: 'simple', label: 'Simple', icon: '📊' },
  { value: 'advanced', label: 'Advanced', icon: '📈' },
];

export default function BudgetComplexityToggle({
  value = 'simple',
  onChange,
  descriptions = {
    none: 'Track expenses without budgets',
    simple: 'Set one overall annual budget',
    advanced: 'Create detailed category budgets',
  },
  variant = 'segmented', // 'segmented' or 'cards'
  style,
}) {
  const [animatedValue] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    const index = COMPLEXITY_OPTIONS.findIndex((opt) => opt.value === value);
    Animated.spring(animatedValue, {
      toValue: index,
      friction: 6,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const handlePress = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
  };

  if (variant === 'cards') {
    return (
      <View style={[styles.container, style]}>
        {COMPLEXITY_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => handlePress(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{option.icon}</Text>
                <Text
                  style={[
                    styles.cardLabel,
                    isSelected && styles.cardLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.cardDescription,
                  isSelected && styles.cardDescriptionSelected,
                ]}
              >
                {descriptions[option.value]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Segmented control variant
  return (
    <View style={[styles.container, style]}>
      <View style={styles.segmentedControl}>
        {COMPLEXITY_OPTIONS.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.segment,
                index === 0 && styles.segmentFirst,
                index === COMPLEXITY_OPTIONS.length - 1 && styles.segmentLast,
                isSelected && styles.segmentSelected,
              ]}
              onPress={() => handlePress(option.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.segmentIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.segmentLabel,
                  isSelected && styles.segmentLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Description */}
      {descriptions[value] && (
        <Animated.View style={styles.descriptionContainer}>
          <Text style={styles.description}>{descriptions[value]}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  // Segmented Control Styles
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    padding: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.borderRadius.small,
    flexDirection: 'column',
    gap: SPACING.tiny,
  },
  segmentFirst: {
    borderTopLeftRadius: SIZES.borderRadius.medium,
    borderBottomLeftRadius: SIZES.borderRadius.medium,
  },
  segmentLast: {
    borderTopRightRadius: SIZES.borderRadius.medium,
    borderBottomRightRadius: SIZES.borderRadius.medium,
  },
  segmentSelected: {
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentIcon: {
    fontSize: 24,
  },
  segmentLabel: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  segmentLabelSelected: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  descriptionContainer: {
    marginTop: SPACING.base,
    padding: SPACING.medium,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.medium,
  },
  description: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Card Variant Styles
  optionCard: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.medium,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
    backgroundColor: '#f5f7ff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: SPACING.medium,
  },
  cardLabel: {
    flex: 1,
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  cardLabelSelected: {
    color: COLORS.primary,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: SIZES.borderRadius.round,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold,
  },
  cardDescription: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  cardDescriptionSelected: {
    color: COLORS.text,
  },
});
