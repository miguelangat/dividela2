// src/components/onboarding/OnboardingCard.js
// Selectable card component for onboarding options

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';

export default function OnboardingCard({
  icon,
  title,
  description,
  details,
  selected = false,
  recommended = false,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Recommended Badge */}
      {recommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      )}

      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Description */}
      <Text style={styles.description}>{description}</Text>

      {/* Details */}
      {details && (
        <View style={styles.detailsContainer}>
          <Text style={styles.details}>{details}</Text>
        </View>
      )}

      {/* Selection Indicator */}
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
    ...SHADOWS.card,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  recommendedBadge: {
    position: 'absolute',
    top: SPACING.small,
    right: SPACING.small,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.tiny,
    borderRadius: SIZES.borderRadius.small,
  },
  recommendedText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.semibold,
  },
  iconContainer: {
    marginBottom: SPACING.small,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  description: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    lineHeight: 20,
  },
  detailsContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.small,
    padding: SPACING.small,
    marginTop: SPACING.tiny,
  },
  details: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  checkbox: {
    position: 'absolute',
    bottom: SPACING.base,
    right: SPACING.base,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
  },
});
