// src/screens/onboarding/advanced/AdvancedCategoriesScreen.js
// Advanced Mode Category Selection - Step 4/7

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';
import { DEFAULT_CATEGORIES } from '../../../constants/defaultCategories';

export default function AdvancedCategoriesScreen({ navigation, route }) {
  const { timeframeData, strategyData } = route.params || {};
  const [useCommonCategories, setUseCommonCategories] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState(
    Object.keys(DEFAULT_CATEGORIES)
  );
  const [customCategories, setCustomCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('💡');

  const allCategories = [
    ...Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => ({
      key,
      ...cat,
      isDefault: true,
    })),
    ...customCategories,
  ];

  const toggleCategory = (key) => {
    if (selectedCategories.includes(key)) {
      setSelectedCategories(selectedCategories.filter((k) => k !== key));
    } else {
      setSelectedCategories([...selectedCategories, key]);
    }
  };

  const handleUseCommonToggle = () => {
    if (!useCommonCategories) {
      // Switching to common categories
      setSelectedCategories(Object.keys(DEFAULT_CATEGORIES));
    }
    setUseCommonCategories(!useCommonCategories);
  };

  const handleAddCustomCategory = () => {
    if (newCategoryName.trim()) {
      const key = newCategoryName.toLowerCase().replace(/\s+/g, '_');
      const newCategory = {
        key,
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        defaultBudget: 0,
        isDefault: false,
      };
      setCustomCategories([...customCategories, newCategory]);
      setSelectedCategories([...selectedCategories, key]);
      setNewCategoryName('');
      setNewCategoryIcon('💡');
      setShowAddModal(false);
    }
  };

  const handleContinue = () => {
    const categoriesData = {
      ...(strategyData || timeframeData),
      selectedCategories: selectedCategories.map((key) => {
        const category = allCategories.find((c) => c.key === key);
        return {
          key,
          name: category.name,
          icon: category.icon,
          defaultBudget: category.defaultBudget || 0,
        };
      }),
    };

    navigation.navigate('AdvancedAllocation', { categoriesData });
  };

  const commonIcons = ['🍔', '🛒', '🚗', '🏠', '🎉', '💡', '✈️', '🏥', '📚', '👕'];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step 4 of 7</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '57.1%' }]} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Pick your categories</Text>
        <Text style={styles.subtitle}>
          Choose what you want to track and budget for
        </Text>

        {/* Quick Toggle */}
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={handleUseCommonToggle}
          activeOpacity={0.7}
        >
          <View style={styles.toggleLeft}>
            <View
              style={[
                styles.checkbox,
                useCommonCategories && styles.checkboxChecked,
              ]}
            >
              {useCommonCategories && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.toggleText}>Use Common Categories</Text>
          </View>
          <Text style={styles.toggleHint}>Recommended for most couples</Text>
        </TouchableOpacity>

        {/* Category Grid */}
        {!useCommonCategories && (
          <View style={styles.categoriesGrid}>
            {allCategories.map((category) => {
              const isSelected = selectedCategories.includes(category.key);
              return (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() => toggleCategory(category.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {category.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Add Custom Category Button */}
            <TouchableOpacity
              style={styles.addCategoryCard}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.addCategoryIcon}>+</Text>
              <Text style={styles.addCategoryText}>Add Custom</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Indicator */}
        <View style={styles.progressIndicator}>
          <Text style={styles.progressIndicatorText}>
            Selected: {selectedCategories.length} of {allCategories.length}
          </Text>
        </View>

        {/* Hint */}
        <View style={styles.hintBox}>
          <Text style={styles.hintIcon}>💡</Text>
          <Text style={styles.hintText}>
            Most couples track 5-7 categories
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedCategories.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={selectedCategories.length === 0}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Custom Category Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Category</Text>

            {/* Icon Selector */}
            <Text style={styles.modalLabel}>Choose an icon</Text>
            <View style={styles.iconGrid}>
              {commonIcons.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newCategoryIcon === icon && styles.iconOptionSelected,
                  ]}
                  onPress={() => setNewCategoryIcon(icon)}
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name Input */}
            <Text style={styles.modalLabel}>Category name</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g., Health & Fitness"
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
            />

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                  setNewCategoryIcon('💡');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleAddCustomCategory}
              >
                <Text style={styles.modalAddButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.screenPadding,
    paddingTop: SPACING.huge,
  },
  progressContainer: {
    marginBottom: SPACING.xlarge,
  },
  progressText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  title: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xlarge,
  },
  toggleContainer: {
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.large,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.tiny,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.small,
    backgroundColor: COLORS.background,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold,
  },
  toggleText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  toggleHint: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginLeft: 32,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.tiny,
    marginBottom: SPACING.base,
  },
  categoryCard: {
    width: '31%',
    aspectRatio: 1,
    margin: SPACING.tiny,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
    position: 'relative',
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f3ff',
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: SPACING.tiny,
  },
  categoryName: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    fontSize: 10,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold,
  },
  addCategoryCard: {
    width: '31%',
    aspectRatio: 1,
    margin: SPACING.tiny,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addCategoryIcon: {
    fontSize: 32,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
  },
  addCategoryText: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  progressIndicator: {
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  progressIndicatorText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.primary,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.xlarge,
  },
  hintIcon: {
    fontSize: 20,
    marginRight: SPACING.small,
  },
  hintText: {
    flex: 1,
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  continueButton: {
    ...COMMON_STYLES.primaryButton,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.xlarge,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.large,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.base,
  },
  iconOption: {
    width: 50,
    height: 50,
    margin: SPACING.tiny,
    borderRadius: SIZES.borderRadius.small,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f3ff',
  },
  iconOptionText: {
    fontSize: 24,
  },
  modalInput: {
    ...COMMON_STYLES.input,
    marginBottom: SPACING.large,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.medium,
  },
  modalCancelButton: {
    flex: 1,
    ...COMMON_STYLES.secondaryButton,
  },
  modalCancelButtonText: {
    ...COMMON_STYLES.secondaryButtonText,
  },
  modalAddButton: {
    flex: 1,
    ...COMMON_STYLES.primaryButton,
  },
  modalAddButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
});
