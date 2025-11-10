// src/screens/main/BudgetSetupScreen.js
// Screen for setting up monthly budgets per category

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBudget } from '../../contexts/BudgetContext';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';

export default function BudgetSetupScreen({ navigation }) {
  const {
    categories,
    currentBudget,
    loading,
    saveBudget,
    updateBudgetSettings,
    isBudgetEnabled,
    shouldIncludeSavings,
  } = useBudget();

  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [budgetEnabled, setBudgetEnabled] = useState(true);
  const [includeSavings, setIncludeSavings] = useState(true);
  const [saving, setSaving] = useState(false);

  // Initialize budgets from current budget or defaults
  useEffect(() => {
    if (currentBudget && currentBudget.categoryBudgets) {
      setCategoryBudgets(currentBudget.categoryBudgets);
      setBudgetEnabled(currentBudget.enabled !== false);
      setIncludeSavings(currentBudget.includeSavings !== false);
    } else if (categories) {
      // Initialize with default budgets
      const defaults = {};
      Object.entries(categories).forEach(([key, category]) => {
        defaults[key] = category.defaultBudget;
      });
      setCategoryBudgets(defaults);
    }
  }, [currentBudget, categories]);

  const handleBudgetChange = (categoryKey, value) => {
    const numValue = parseFloat(value) || 0;
    setCategoryBudgets(prev => ({
      ...prev,
      [categoryKey]: numValue,
    }));
  };

  const handleSaveBudgets = async () => {
    try {
      setSaving(true);
      await saveBudget(categoryBudgets, {
        enabled: budgetEnabled,
        includeSavings: includeSavings,
      });
      Alert.alert('Success', 'Budgets saved successfully!');
    } catch (error) {
      console.error('Error saving budgets:', error);
      Alert.alert('Error', error.message || 'Failed to save budgets');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBudgetEnabled = async (value) => {
    setBudgetEnabled(value);
    try {
      await updateBudgetSettings({ enabled: value });
    } catch (error) {
      console.error('Error updating budget settings:', error);
      setBudgetEnabled(!value); // Revert on error
    }
  };

  const handleToggleIncludeSavings = async (value) => {
    setIncludeSavings(value);
    try {
      await updateBudgetSettings({ includeSavings: value });
    } catch (error) {
      console.error('Error updating savings settings:', error);
      setIncludeSavings(!value); // Revert on error
    }
  };

  const getTotalBudget = () => {
    return Object.values(categoryBudgets).reduce((sum, val) => sum + val, 0);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading budget...</Text>
        </View>
      </View>
    );
  }

  const categoryArray = Object.entries(categories).map(([key, category]) => ({
    key,
    ...category,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Monthly Budget Setup</Text>
          <Text style={styles.subtitle}>
            Set your budget limits for each category
          </Text>
        </View>

        {/* Budget Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.toggleTitle}>Enable Budget Tracking</Text>
              <Text style={styles.toggleSubtitle}>
                Track spending against monthly budgets
              </Text>
            </View>
            <Switch
              value={budgetEnabled}
              onValueChange={handleToggleBudgetEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.background}
            />
          </View>
        </View>

        {/* Category Budgets */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Category Budgets</Text>

          {categoryArray.map((category) => (
            <View key={category.key} style={styles.budgetRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>

              <View style={styles.budgetInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.budgetInput}
                  value={String(categoryBudgets[category.key] || 0)}
                  onChangeText={(value) => handleBudgetChange(category.key, value)}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>
          ))}

          {/* Total Budget */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Monthly Budget</Text>
            <Text style={styles.totalAmount}>${getTotalBudget().toFixed(0)}</Text>
          </View>
        </View>

        {/* Settlement Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Settlement Settings</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Text style={styles.toggleTitle}>Include Budget Savings</Text>
              <Text style={styles.toggleSubtitle}>
                Split budget savings in monthly settlement
              </Text>
            </View>
            <Switch
              value={includeSavings}
              onValueChange={handleToggleIncludeSavings}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.background}
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              When enabled, if you stay under budget, the savings will be split
              equally and added to your monthly settlement calculation.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSaveBudgets}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={styles.saveButtonText}>Save Budgets</Text>
          )}
        </TouchableOpacity>

        {/* Manage Categories Link */}
        <TouchableOpacity
          style={styles.manageCategoriesButton}
          onPress={() => navigation.navigate('CategoryManager')}
          activeOpacity={0.6}
        >
          <Text style={styles.manageCategoriesText}>
            Manage Categories →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.medium,
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.screenPadding,
    paddingBottom: SPACING.xxlarge,
  },
  header: {
    marginBottom: SPACING.large,
  },
  title: {
    ...COMMON_STYLES.heading,
    marginBottom: SPACING.small,
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.medium,
    marginBottom: SPACING.medium,
    ...COMMON_STYLES.cardShadow,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    flex: 1,
    marginRight: SPACING.medium,
  },
  toggleTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  toggleSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: SPACING.small,
  },
  categoryName: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  budgetInput: {
    width: 100,
    height: 40,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.small,
    paddingHorizontal: SPACING.small,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.medium,
    paddingTop: SPACING.medium,
    borderTopWidth: 2,
    borderTopColor: COLORS.text,
  },
  totalLabel: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.small,
    marginTop: SPACING.medium,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: SPACING.small,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.small,
    color: COLORS.text,
    lineHeight: 20,
  },
  saveButton: {
    ...COMMON_STYLES.primaryButton,
    marginTop: SPACING.medium,
  },
  saveButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  manageCategoriesButton: {
    alignSelf: 'center',
    marginTop: SPACING.large,
    paddingVertical: SPACING.small,
  },
  manageCategoriesText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
});
