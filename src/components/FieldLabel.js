// src/components/FieldLabel.js
// Reusable field label with required/optional badges

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function FieldLabel({ label, required = false, optional = false, style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      {required && (
        <View style={styles.requiredBadge}>
          <Text style={styles.requiredText}>REQUIRED</Text>
        </View>
      )}
      {optional && (
        <View style={styles.optionalBadge}>
          <Text style={styles.optionalText}>OPTIONAL</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  label: {
    ...FONTS.small,
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
  requiredBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.small,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: SPACING.small,
  },
  requiredText: {
    ...FONTS.tiny,
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  optionalBadge: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.small,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: SPACING.small,
  },
  optionalText: {
    ...FONTS.tiny,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
