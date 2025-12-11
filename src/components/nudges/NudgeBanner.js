// src/components/nudges/NudgeBanner.js
// Generic dismissible banner component for nudges/prompts

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';

/**
 * NudgeBanner - A dismissible banner with icon, title, description, and CTA
 *
 * @param {Object} props
 * @param {string | React.ReactNode} props.icon - Ionicons name or custom node
 * @param {string} props.title - Banner title
 * @param {string} props.description - Banner description
 * @param {string} props.ctaText - Primary action button text
 * @param {Function} props.ctaAction - Primary action callback
 * @param {string} props.secondaryCtaText - Optional secondary action text
 * @param {Function} props.secondaryCtaAction - Optional secondary action callback
 * @param {Function} props.onDismiss - Dismiss callback (if omitted, no dismiss button)
 * @param {'info' | 'warning' | 'success' | 'primary'} props.variant - Color variant
 * @param {Object} props.style - Additional container styles
 * @param {string} props.testID - Test identifier
 */
export default function NudgeBanner({
  icon,
  title,
  description,
  ctaText,
  ctaAction,
  secondaryCtaText,
  secondaryCtaAction,
  onDismiss,
  variant = 'primary',
  style,
  testID,
}) {
  // Get variant colors
  const variantColors = getVariantColors(variant);

  // Render icon
  const renderIcon = () => {
    if (!icon) return null;

    if (typeof icon === 'string') {
      return (
        <View style={[styles.iconContainer, { backgroundColor: variantColors.iconBg }]}>
          <Ionicons name={icon} size={24} color={variantColors.iconColor} />
        </View>
      );
    }
    return icon;
  };

  return (
    <View
      style={[
        styles.container,
        { borderLeftColor: variantColors.accent },
        style,
      ]}
      testID={testID}
    >
      {/* Dismiss button */}
      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Content row */}
      <View style={styles.contentRow}>
        {renderIcon()}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      </View>

      {/* Action buttons */}
      {(ctaText || secondaryCtaText) && (
        <View style={styles.actionsContainer}>
          {secondaryCtaText && secondaryCtaAction && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={secondaryCtaAction}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>{secondaryCtaText}</Text>
            </TouchableOpacity>
          )}
          {ctaText && ctaAction && (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: variantColors.ctaBg }]}
              onPress={ctaAction}
              activeOpacity={0.8}
            >
              <Text style={[styles.ctaButtonText, { color: variantColors.ctaText }]}>
                {ctaText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// Get colors based on variant
function getVariantColors(variant) {
  switch (variant) {
    case 'warning':
      return {
        accent: COLORS.warning,
        iconBg: COLORS.warning + '20',
        iconColor: COLORS.warning,
        ctaBg: COLORS.warning,
        ctaText: COLORS.text,
      };
    case 'success':
      return {
        accent: COLORS.success,
        iconBg: COLORS.success + '20',
        iconColor: COLORS.success,
        ctaBg: COLORS.success,
        ctaText: COLORS.textWhite,
      };
    case 'info':
      return {
        accent: COLORS.info,
        iconBg: COLORS.info + '20',
        iconColor: COLORS.info,
        ctaBg: COLORS.info,
        ctaText: COLORS.textWhite,
      };
    case 'primary':
    default:
      return {
        accent: COLORS.primary,
        iconBg: COLORS.primary + '15',
        iconColor: COLORS.primary,
        ctaBg: COLORS.primary,
        ctaText: COLORS.textWhite,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    borderLeftWidth: 4,
    padding: SPACING.base,
    marginHorizontal: SPACING.screenPadding,
    marginBottom: SPACING.base,
    ...SHADOWS.medium,
  },
  dismissButton: {
    position: 'absolute',
    top: SPACING.small,
    right: SPACING.small,
    padding: SPACING.tiny,
    zIndex: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: SPACING.large, // Space for dismiss button
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.medium,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  description: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: SPACING.medium,
    gap: SPACING.small,
  },
  ctaButton: {
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.small,
  },
  ctaButtonText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
  },
  secondaryButton: {
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
  },
  secondaryButtonText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
  },
});
