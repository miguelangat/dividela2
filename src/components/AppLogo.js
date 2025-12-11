// src/components/AppLogo.js
// Reusable app logo component that renders the Dividela gradient logo programmatically
// Matches the design from assets/favicon.svg

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';

// Size presets matching common usage
const SIZE_PRESETS = {
  small: 32,
  medium: 48,
  large: 100,
};

/**
 * AppLogo - Renders the Dividela logo with gradient background
 *
 * @param {Object} props
 * @param {'small' | 'medium' | 'large' | number} props.size - Logo size (preset name or custom number)
 * @param {Object} props.style - Additional container styles
 * @param {boolean} props.showShadow - Whether to show shadow (default: true)
 * @param {'dark' | 'light'} props.variant - Color variant for different backgrounds
 */
export default function AppLogo({
  size = 'medium',
  style,
  showShadow = true,
  variant = 'dark' // 'dark' = gradient bg, 'light' = for dark backgrounds
}) {
  // Resolve size to number
  const resolvedSize = typeof size === 'number' ? size : SIZE_PRESETS[size] || SIZE_PRESETS.medium;

  // Calculate proportional values
  const borderRadius = Math.round(resolvedSize * 0.167); // ~8/48 ratio from favicon
  const fontSize = Math.round(resolvedSize * 0.667); // ~32/48 ratio from favicon
  const borderWidth = resolvedSize >= 64 ? 3 : resolvedSize >= 40 ? 2 : 1;

  // Light variant for use on gradient backgrounds (like WelcomeScreen)
  if (variant === 'light') {
    return (
      <View
        style={[
          styles.container,
          {
            width: resolvedSize,
            height: resolvedSize,
            borderRadius,
          },
          showShadow && styles.shadow,
          style,
        ]}
      >
        <View
          style={[
            styles.lightBackground,
            {
              width: resolvedSize,
              height: resolvedSize,
              borderRadius,
              borderWidth,
            },
          ]}
        >
          <Text
            style={[
              styles.slash,
              {
                fontSize,
                color: COLORS.textWhite,
              },
            ]}
          >
            /
          </Text>
        </View>
      </View>
    );
  }

  // Default dark variant with gradient
  return (
    <View
      style={[
        styles.container,
        {
          width: resolvedSize,
          height: resolvedSize,
          borderRadius,
        },
        showShadow && styles.shadow,
        style,
      ]}
    >
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            width: resolvedSize,
            height: resolvedSize,
            borderRadius,
          },
        ]}
      >
        <Text
          style={[
            styles.slash,
            {
              fontSize,
            },
          ]}
        >
          /
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slash: {
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginTop: -2, // Visual centering adjustment
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
