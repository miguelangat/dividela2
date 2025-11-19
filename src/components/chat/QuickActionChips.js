// src/components/chat/QuickActionChips.js
// Quick action suggestion chips for common commands

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

const QUICK_ACTIONS = [
  { id: '1', label: '➕ Add expense', command: 'Add an expense' },
  { id: '2', label: '💰 Check budget', command: 'Show my budget status' },
  { id: '3', label: '⚖️ View balance', command: 'What\'s our balance?' },
  { id: '4', label: '📊 Top spending', command: 'Show top spending categories' },
  { id: '5', label: '📅 This month', command: 'How much did we spend this month?' },
];

export default function QuickActionChips({ onSelectAction, visible = true }) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick actions:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {QUICK_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.id}
            style={styles.chip}
            onPress={() => onSelectAction(action.command)}
          >
            <Text style={styles.chipText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SPACING.medium,
  },
  title: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    paddingHorizontal: SPACING.base,
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    gap: SPACING.small,
  },
  chip: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.small,
  },
  chipText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
});
