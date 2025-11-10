// src/components/CategoryCard.js
// Reusable category display card component

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';

export default function CategoryCard({
  category,
  expenseCount = 0,
  onEdit,
  onDelete,
  showActions = false,
  style,
}) {
  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{category.icon}</Text>
        <Text style={styles.name}>{category.name}</Text>
      </View>

      {/* Default Budget */}
      <Text style={styles.budgetText}>
        Default budget: ${category.defaultBudget}
      </Text>

      {/* Badge */}
      <View style={[styles.badge, !category.isDefault && styles.badgeCustom]}>
        <Text style={[styles.badgeText, !category.isDefault && styles.badgeTextCustom]}>
          {category.isDefault ? 'Default' : 'Custom'}
        </Text>
      </View>

      {/* Expense Count */}
      <Text style={styles.expenseCount}>
        {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
      </Text>

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>

          {!category.isDefault && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  budgetText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginVertical: SPACING.small,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.small,
    paddingVertical: 4,
    backgroundColor: '#f0f9ff',
    borderRadius: SIZES.borderRadius.small,
    marginTop: SPACING.small,
  },
  badgeCustom: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FONTS.weights.semibold,
    color: '#0284c7',
  },
  badgeTextCustom: {
    color: '#d97706',
  },
  expenseCount: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textTertiary,
    marginTop: SPACING.tiny,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.small,
    marginTop: SPACING.medium,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: SIZES.borderRadius.small,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#e0e7ff',
  },
  editButtonText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    color: '#ef4444',
  },
});
