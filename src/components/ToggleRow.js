// src/components/ToggleRow.js
// Reusable toggle row component for settings and setup screens

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function ToggleRow({
  label,
  description,
  value,
  onToggle,
  disabled = false,
  showBorder = true,
}) {
  // Animated value for toggle thumb position
  const translateX = React.useRef(new Animated.Value(value ? 22 : 0)).current;

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 22 : 0,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [value, translateX]);

  const handlePress = () => {
    if (!disabled) {
      onToggle(!value);
    }
  };

  return (
    <View style={[styles.container, showBorder && styles.containerBorder]}>
      <View style={styles.content}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.description, disabled && styles.descriptionDisabled]}>
            {description}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={[
          styles.toggle,
          value && styles.toggleActive,
          disabled && styles.toggleDisabled,
        ]}>
          <Animated.View
            style={[
              styles.toggleThumb,
              { transform: [{ translateX }] },
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
  },
  containerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  content: {
    flex: 1,
    marginRight: SPACING.base,
  },
  label: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  labelDisabled: {
    color: COLORS.textTertiary,
  },
  description: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  descriptionDisabled: {
    color: COLORS.textTertiary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
