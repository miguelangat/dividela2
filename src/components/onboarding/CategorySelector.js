// src/components/onboarding/CategorySelector.js
// Grid layout selector for categories with multi-select support

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

export default function CategorySelector({
  categories = [],
  selected = [],
  onSelectionChange,
  multiSelect = true,
  maxSelections = null,
  showProgress = true,
  style,
}) {
  const handleCategoryPress = (category) => {
    if (!onSelectionChange) return;

    // Simulate haptic feedback (would use Haptics.impactAsync in real app)
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isSelected = selected.includes(category.id);
    let newSelection;

    if (multiSelect) {
      if (isSelected) {
        // Deselect
        newSelection = selected.filter((id) => id !== category.id);
      } else {
        // Select (check max selections)
        if (maxSelections && selected.length >= maxSelections) {
          return; // Cannot select more
        }
        newSelection = [...selected, category.id];
      }
    } else {
      // Single select
      newSelection = isSelected ? [] : [category.id];
    }

    onSelectionChange(newSelection);
  };

  const renderCategory = (category) => {
    const isSelected = selected.includes(category.id);
    const scaleAnim = new Animated.Value(1);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    };

    return (
      <View key={category.id} style={styles.categoryWrapper}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleCategoryPress(category)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View
            style={[
              styles.categoryChip,
              isSelected && styles.categoryChipSelected,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryName,
                isSelected && styles.categoryNameSelected,
              ]}
            >
              {category.name}
            </Text>
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedCheck}>✓</Text>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const progressText = maxSelections
    ? `${selected.length} of ${maxSelections} selected`
    : `${selected.length} selected`;

  const isMaxReached = maxSelections && selected.length >= maxSelections;

  return (
    <View style={[styles.container, style]}>
      {/* Progress Indicator */}
      {showProgress && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{progressText}</Text>
          {maxSelections && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${(selected.length / maxSelections) * 100}%`,
                    backgroundColor: isMaxReached ? COLORS.success : COLORS.primary,
                  },
                ]}
              />
            </View>
          )}
        </View>
      )}

      {/* Categories Grid */}
      <View style={styles.grid}>
        {categories.map((category) => renderCategory(category))}
      </View>

      {/* Helper Text */}
      {maxSelections && (
        <Text style={styles.helperText}>
          {isMaxReached
            ? 'Maximum selections reached'
            : `Select up to ${maxSelections} categories`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  progressContainer: {
    marginBottom: SPACING.base,
  },
  progressText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.borderRadius.small,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: SIZES.borderRadius.small,
    transition: 'width 0.3s ease',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.tiny,
  },
  categoryWrapper: {
    width: '50%',
    paddingHorizontal: SPACING.tiny,
    marginBottom: SPACING.small,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    minHeight: 64,
    position: 'relative',
  },
  categoryChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: SPACING.small,
  },
  categoryName: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  categoryNameSelected: {
    color: COLORS.textWhite,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: SIZES.borderRadius.round,
    backgroundColor: COLORS.textWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.tiny,
  },
  selectedCheck: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  helperText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.small,
  },
});
