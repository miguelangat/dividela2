// src/screens/onboarding/simple/SimpleSmartBudgetScreen.js
// Step 2 of Simple Mode: Smart Budget configuration and preview

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';
import ProgressStepper from '../../../components/onboarding/ProgressStepper';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DEFAULT_CATEGORIES } from '../../../constants/defaultCategories';
import * as onboardingService from '../../../services/onboardingService';

export default function SimpleSmartBudgetScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userDetails } = useAuth();
  const { setBudgetStyle, setIsComplete } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const defaultBudgets = onboardingService.getDefaultBudgetConfiguration();
  const totalBudget = Object.values(defaultBudgets).reduce((sum, amount) => sum + amount, 0);

  const handleStartTracking = async () => {
    try {
      setLoading(true);
      
      // Save smart budget configuration
      await onboardingService.saveSmartBudgetConfiguration(userDetails.coupleId);
      
      // Mark onboarding as complete
      setIsComplete(true);
      
      // Navigate to success screen
      navigation.navigate('SimpleSuccess');
    } catch (error) {
      console.error('Error saving smart budget:', error);
      alert('Failed to save budget configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomize = () => {
    // Navigate to manual allocation screen (would be advanced mode)
    navigation.navigate('AdvancedOnboarding');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Stepper */}
        <ProgressStepper currentStep={2} totalSteps={2} style={styles.progressStepper} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>All Set! Here's the plan:</Text>
        </View>

        {/* Explanation */}
        <View style={styles.explanationCard}>
          <View style={styles.explanationItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.explanationText}>We'll track your spending</Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.explanationText}>Suggest budgets after first month</Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.explanationText}>Adjust anytime in settings</Text>
          </View>
        </View>

        {/* Default Budget Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Starting Budgets</Text>
          <Text style={styles.previewSubtitle}>Based on industry averages</Text>

          <View style={styles.categoriesList}>
            {Object.entries(DEFAULT_CATEGORIES).map(([key, category]) => (
              <View key={key} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <Text style={styles.categoryAmount}>
                  ${category.defaultBudget.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Monthly Budget</Text>
            <Text style={styles.totalAmount}>${totalBudget.toLocaleString()}</Text>
          </View>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              💡 Industry averages - We'll adjust based on YOUR spending
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.base) }]}>
        {/* Primary Button */}
        <TouchableOpacity
          style={[COMMON_STYLES.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleStartTracking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>Start Tracking</Text>
          )}
        </TouchableOpacity>

        {/* Secondary Link */}
        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={handleCustomize}
          disabled={loading}
        >
          <Text style={styles.secondaryLinkText}>Customize These Amounts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingBottom: SPACING.xxlarge,
  },
  progressStepper: {
    marginBottom: SPACING.base,
  },
  header: {
    marginTop: SPACING.base,
    marginBottom: SPACING.base,
  },
  title: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  explanationCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginBottom: SPACING.large,
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  checkmark: {
    fontSize: FONTS.sizes.title,
    color: COLORS.success,
    marginRight: SPACING.small,
  },
  explanationText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    flex: 1,
  },
  previewCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.base,
    ...SHADOWS.card,
  },
  previewTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  previewSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.base,
  },
  categoriesList: {
    marginBottom: SPACING.base,
  },
  categoryRow: {
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
  categoryAmount: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.base,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    marginTop: SPACING.base,
  },
  totalLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  noteContainer: {
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: SIZES.borderRadius.small,
    padding: SPACING.small,
    marginTop: SPACING.base,
  },
  noteText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: SPACING.screenPadding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: SPACING.base,
  },
  secondaryLinkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
});
