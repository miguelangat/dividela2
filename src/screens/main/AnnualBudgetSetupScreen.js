/**
 * AnnualBudgetSetupScreen.js
 *
 * Main screen for setting up and managing annual budgets
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useBudget } from '../../contexts/BudgetContext';
import { useFeatureGate } from '../../components/FeatureGate';
import { getCoupleSettings, initializeCoupleSettings } from '../../services/coupleSettingsService';
import { getCurrentFiscalYear, formatFiscalYearDisplay } from '../../services/fiscalPeriodService';
import { createAnnualBudget, getCurrentAnnualBudget, updateCategoryBudget } from '../../services/annualBudgetService';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';

// Category color mapping for vibrant icons
const CATEGORY_COLORS = {
  food: { bg: '#FFE5D9', icon: '#FF6B35', name: 'Food & Dining' },
  transport: { bg: '#D4E4FF', icon: '#4A90E2', name: 'Transport' },
  entertainment: { bg: '#FFE5F4', icon: '#E91E63', name: 'Entertainment' },
  shopping: { bg: '#D4F1E8', icon: '#10B981', name: 'Shopping' },
  utilities: { bg: '#FFF4D9', icon: '#F59E0B', name: 'Utilities' },
  health: { bg: '#E5D4FF', icon: '#8B5CF6', name: 'Health' },
  default: { bg: COLORS.primary + '15', icon: COLORS.primary, name: 'Other' },
};

export default function AnnualBudgetSetupScreen({ navigation }) {
  const { userDetails } = useAuth();
  const { categories } = useBudget();
  const { hasAccess, isLocked } = useFeatureGate('annual_view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fiscalSettings, setFiscalSettings] = useState(null);
  const [currentFiscalYear, setCurrentFiscalYear] = useState(null);
  const [annualBudget, setAnnualBudget] = useState(null);
  const [categoryBudgets, setCategoryBudgets] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      if (!userDetails?.coupleId) {
        const errorMsg = 'You need to pair with a partner before setting up annual budgets. Please complete pairing first.';
        setError(errorMsg);
        alert(errorMsg);
        throw new Error('No couple ID found');
      }

      // Get fiscal year settings
      let settings = await getCoupleSettings(userDetails.coupleId);

      // Check if settings were properly initialized (existing users may not have this)
      if (!settings.coupleId) {
        console.log('⚙️ Initializing couple settings for existing user...');

        // Auto-initialize settings with defaults for existing users
        settings = await initializeCoupleSettings(userDetails.coupleId, {
          fiscalYear: {
            type: 'calendar',
            startMonth: 1,
            startDay: 1,
          },
          budgetPreferences: {
            trackAnnual: true,
            trackMonthly: true,
            enableVariableMonthly: true,
            enableSavingsTargets: true,
            enableAnnualSettlements: true,
            budgetCurrency: 'USD',
          },
        });

        console.log('✅ Couple settings initialized successfully');
      }

      setFiscalSettings(settings.fiscalYear);

      // Get current fiscal year
      const fiscalYear = getCurrentFiscalYear(settings.fiscalYear);
      setCurrentFiscalYear(fiscalYear);

      // Try to get existing annual budget
      const existing = await getCurrentAnnualBudget(userDetails.coupleId, settings.fiscalYear);

      if (existing) {
        setAnnualBudget(existing);
        setCategoryBudgets(existing.categoryBudgets);
      } else {
        // Initialize with category defaults
        const initial = {};
        Object.entries(categories).forEach(([key, category]) => {
          initial[key] = {
            annualTotal: category.annualBudget || category.defaultBudget * 12,
            monthlyDefault: category.defaultBudget,
            frequency: category.frequency || 'monthly',
          };
        });
        setCategoryBudgets(initial);
      }
    } catch (error) {
      console.error('Error loading annual budget data:', error);

      // Provide specific error messages
      let errorMessage = 'Failed to load data. ';

      if (error.message.includes('couple ID')) {
        errorMessage = 'Authentication error: Could not find your account. Please log out and log back in.';
      } else if (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'Permission error: Unable to access budget data. Please check your account settings.';
      } else if (error.message.includes('network') || error.message.includes('offline')) {
        errorMessage = 'Network error: Please check your internet connection and try again.';
      } else {
        errorMessage += error.message || 'An unexpected error occurred. Please try again.';
      }

      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = (categoryKey, annualAmount) => {
    // Sanitize input - remove non-numeric characters except decimal point
    const sanitized = annualAmount.replace(/[^0-9.]/g, '');

    // Parse and validate
    let numericValue = parseFloat(sanitized) || 0;

    // Enforce maximum value (e.g., 10 million)
    const MAX_BUDGET = 10000000;
    if (numericValue > MAX_BUDGET) {
      numericValue = MAX_BUDGET;
    }

    // Ensure non-negative
    if (numericValue < 0) {
      numericValue = 0;
    }

    setCategoryBudgets((prev) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        annualTotal: numericValue,
        monthlyDefault: Math.round(numericValue / 12),
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!userDetails?.coupleId || !currentFiscalYear) {
        throw new Error('Missing required data');
      }

      // Validate budgets (no negative values)
      for (const [key, budget] of Object.entries(categoryBudgets)) {
        if (budget.annualTotal < 0) {
          const category = categories[key];
          alert(`Budget for ${category?.name || key} cannot be negative`);
          setSaving(false);
          return;
        }
      }

      if (annualBudget) {
        // Update existing annual budget
        const updatePromises = [];

        // Update each category that has changed
        for (const [key, budget] of Object.entries(categoryBudgets)) {
          const existingBudget = annualBudget.categoryBudgets[key];

          // Check if budget changed
          if (!existingBudget || existingBudget.annualTotal !== budget.annualTotal) {
            updatePromises.push(
              updateCategoryBudget(
                userDetails.coupleId,
                currentFiscalYear.fiscalYear,
                key,
                {
                  annualTotal: budget.annualTotal,
                }
              )
            );
          }
        }

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          alert('✅ Annual budget updated successfully!');
        } else {
          alert('No changes detected');
        }

        navigation.goBack();
      } else {
        // Create new annual budget
        await createAnnualBudget(
          userDetails.coupleId,
          currentFiscalYear.fiscalYear,
          fiscalSettings,
          categoryBudgets
        );

        alert('✅ Annual budget created successfully!');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving annual budget:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const calculateTotal = () => {
    return Object.values(categoryBudgets).reduce(
      (sum, cat) => sum + (cat.annualTotal || 0),
      0
    );
  };

  // Check for premium access first
  if (isLocked) {
    return (
      <View style={styles.paywallContainer}>
        <View style={styles.paywallContent}>
          <View style={styles.paywallIcon}>
            <Ionicons name="lock-closed" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.paywallTitle}>Premium Feature</Text>
          <Text style={styles.paywallSubtitle}>
            Annual budget tracking is a premium feature. Upgrade to unlock:
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.featureText}>Track annual budgets across fiscal years</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.featureText}>Customize monthly allocations</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.featureText}>Advanced analytics & insights</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.featureText}>Unlimited budgets</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Paywall', { feature: 'annual_view' })}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeButtonGradient}
            >
              <Ionicons name="sparkles" size={24} color="#FFD700" />
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {!fiscalSettings ? 'Setting up fiscal year...' : 'Loading budget data...'}
        </Text>
      </View>
    );
  }

  // Show error state with retry button
  if (error && !fiscalSettings) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorTitle}>Unable to Load Budget</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadData}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalBudget = calculateTotal();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Fiscal Year Info - Gradient Header */}
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerIconContainer}>
            <Ionicons name="calendar" size={28} color="white" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerLabel}>Fiscal Year</Text>
            <Text style={styles.headerValue}>
              {currentFiscalYear && formatFiscalYearDisplay(currentFiscalYear.fiscalYear, fiscalSettings)}
            </Text>
          </View>
        </LinearGradient>

        {/* Total Budget Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="wallet" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.summaryLabel}>Total Annual Budget</Text>
          <Text style={styles.summaryValue}>${totalBudget.toLocaleString()}</Text>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryNote}>
            💰 ≈ ${Math.round(totalBudget / 12).toLocaleString()}/month
          </Text>
        </View>

        {/* Category Budgets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Ionicons name="apps" size={22} color={COLORS.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Category Budgets</Text>
          </View>

          {Object.entries(categoryBudgets).map(([key, budget]) => {
            const category = categories[key];
            if (!category) return null;

            // Get color scheme for this category
            const colorScheme = CATEGORY_COLORS[key] || CATEGORY_COLORS.default;

            return (
              <View key={key} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIconContainer, { backgroundColor: colorScheme.bg }]}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryFrequency}>
                      {budget.frequency === 'annual' ? '📅 Annual expense' : '📆 Monthly tracking'}
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Annual Budget</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={budget.annualTotal?.toString() || '0'}
                      onChangeText={(value) => handleUpdateCategory(key, value)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <Text style={styles.monthlyHint}>
                    ≈ ${budget.monthlyDefault || 0}/month
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Set your annual budget for each category. You can customize monthly allocations later for seasonal expenses.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={styles.saveButtonTouchable}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.saveButtonText}>
                  {annualBudget ? 'Update Budget' : 'Create Annual Budget'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorTitle: {
    ...FONTS.h2,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  retryButton: {
    ...COMMON_STYLES.primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 120,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  headerLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  headerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.xl,
    borderRadius: 12,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.md,
    letterSpacing: -1,
  },
  summaryDivider: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.primary + '30',
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  summaryNote: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionAccent: {
    width: 4,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: SPACING.sm,
  },
  sectionIcon: {
    marginRight: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryCard: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.base,
    borderRadius: 12,
    marginBottom: SPACING.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  categoryFrequency: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  inputGroup: {
    marginTop: SPACING.sm,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  monthlyHint: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: SPACING.sm,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.base,
    borderRadius: 12,
    marginTop: SPACING.lg,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonTouchable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Paywall styles
  paywallContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  paywallContent: {
    maxWidth: 400,
    alignItems: 'center',
  },
  paywallIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  paywallTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  paywallSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  featureList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: SPACING.base,
    flex: 1,
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: SPACING.base,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: SPACING.sm,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
