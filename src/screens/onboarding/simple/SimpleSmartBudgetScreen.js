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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';
import ProgressStepper from '../../../components/onboarding/ProgressStepper';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DEFAULT_CATEGORIES } from '../../../constants/defaultCategories';
import { useTranslation } from 'react-i18next';

export default function SimpleSmartBudgetScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { userDetails } = useAuth();
  const { setBudgetStyle, setCategoryBudgets, setMonthlyIncome } = useOnboarding();
  const [loading, setLoading] = useState(false);

  // Calculate budgets from default categories
  const categoryBudgets = React.useMemo(() => {
    const budgets = {};
    Object.entries(DEFAULT_CATEGORIES).forEach(([key, category]) => {
      budgets[key] = category.defaultBudget;
    });
    return budgets;
  }, []);

  // Calculate total budget from default categories
  const totalBudget = Object.values(DEFAULT_CATEGORIES).reduce(
    (sum, category) => sum + category.defaultBudget,
    0
  );

  const handleStartTracking = async () => {
    try {
      setLoading(true);

      console.log('Setting budget data in context...');
      // Set budget style to smart for simple mode
      setBudgetStyle('smart');

      // Set the budget data in context (required for validation)
      setCategoryBudgets(categoryBudgets);
      setMonthlyIncome(totalBudget); // Use total as monthly income for validation

      console.log('Budget data set:', { categoryBudgets, totalBudget });

      // Wait briefly for state to propagate (React batches updates)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to success screen with budget data as backup in params
      navigation.navigate('SimpleSuccess', {
        budgetData: {
          categoryBudgets,
          monthlyIncome: totalBudget,
        },
        budgetStyle: 'smart',
      });
    } catch (error) {
      console.error('Error navigating to success screen:', error);
      alert(t('onboarding.simple.smart.navigationError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomize = () => {
    // Navigate to advanced mode for full customization
    navigation.navigate('AdvancedWelcome');
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
          <Text style={styles.title}>{t('onboarding.simple.smart.title')}</Text>
        </View>

        {/* Explanation */}
        <View style={styles.explanationCard}>
          <View style={styles.explanationItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.explanationText}>{t('onboarding.simple.smart.feature1')}</Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.explanationText}>{t('onboarding.simple.smart.feature2')}</Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={styles.explanationText}>{t('onboarding.simple.smart.feature3')}</Text>
          </View>
        </View>

        {/* Default Budget Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>{t('onboarding.simple.smart.previewTitle')}</Text>
          <Text style={styles.previewSubtitle}>{t('onboarding.simple.smart.previewSubtitle')}</Text>

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
            <Text style={styles.totalLabel}>{t('onboarding.simple.smart.totalLabel')}</Text>
            <Text style={styles.totalAmount}>${totalBudget.toLocaleString()}</Text>
          </View>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              {t('onboarding.simple.smart.noteText')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[
        styles.footer,
        {
          paddingBottom: Platform.select({
            ios: Math.max(insets.bottom, SPACING.base) + 85,      // safe area + iOS tab bar
            android: Math.max(insets.bottom, SPACING.base) + 60,  // safe area + Android tab bar
            web: 60,                                               // just tab bar (no safe area on web)
          }),
        }
      ]}>
        {/* Primary Button */}
        <TouchableOpacity
          style={[COMMON_STYLES.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleStartTracking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textWhite} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>{t('onboarding.simple.smart.startButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Secondary Link */}
        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={handleCustomize}
          disabled={loading}
        >
          <Text style={styles.secondaryLinkText}>{t('onboarding.simple.smart.customizeLink')}</Text>
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
    // Extra padding for content scrollability + bottom tabs (tabs now always visible)
    paddingBottom: Platform.select({
      ios: SPACING.xxlarge * 3 + 85,      // content padding + iOS tab bar
      android: SPACING.xxlarge * 3 + 60,  // content padding + Android tab bar
      web: SPACING.xxlarge * 3 + 60,      // content padding + web tab bar
    }),
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
