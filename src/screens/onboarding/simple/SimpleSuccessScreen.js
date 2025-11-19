// src/screens/onboarding/simple/SimpleSuccessScreen.js
// Success screen for completed onboarding

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useBudget } from '../../../contexts/BudgetContext';
import { DEFAULT_CATEGORIES } from '../../../constants/defaultCategories';
import { useTranslation } from 'react-i18next';

export default function SimpleSuccessScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { budgetStyle: contextBudgetStyle, budgetData: contextBudgetData, selectedMode, completeOnboarding, loading: onboardingLoading, setCategoryBudgets, setMonthlyIncome, setBudgetStyle } = useOnboarding();
  const { currentBudget, totalBudget: budgetTotal, categories } = useBudget();
  const [completing, setCompleting] = useState(false);
  const [completionAttempted, setCompletionAttempted] = useState(false);
  const completionTimeoutRef = React.useRef(null);

  // Get budget data from route params (fallback if context is empty)
  const paramsBudgetData = route?.params?.budgetData;
  const paramsBudgetStyle = route?.params?.budgetStyle;

  // Use params data if context data is empty (timing issue workaround)
  const budgetData = contextBudgetData?.monthlyIncome > 0 ? contextBudgetData : paramsBudgetData;
  const budgetStyle = contextBudgetStyle || paramsBudgetStyle;

  // Animation values
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    console.log('🟢 === SimpleSuccessScreen Mounted ===');
    console.log('Context Budget Data:', JSON.stringify(contextBudgetData, null, 2));
    console.log('Params Budget Data:', JSON.stringify(paramsBudgetData, null, 2));
    console.log('Using Budget Data:', JSON.stringify(budgetData, null, 2));
    console.log('Budget Style:', budgetStyle);
    console.log('Selected Mode:', selectedMode);

    startAnimation();

    // If context data is empty but params data exists, set it in context
    if (paramsBudgetData && (!contextBudgetData || !contextBudgetData.monthlyIncome)) {
      console.log('⚠️ Context data empty, setting from params...');
      setCategoryBudgets(paramsBudgetData.categoryBudgets);
      setMonthlyIncome(paramsBudgetData.monthlyIncome);
      if (paramsBudgetStyle) {
        setBudgetStyle(paramsBudgetStyle);
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  const startAnimation = () => {
    // Animate checkmark scale
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Animate text fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleGoToDashboard = async () => {
    console.log('🔴 GO TO DASHBOARD BUTTON CLICKED');
    console.log('Current state - completing:', completing, 'completionAttempted:', completionAttempted);

    // Double-tap prevention: Check if already completing or recently completed
    if (completing || completionAttempted) {
      console.log('Preventing duplicate completion attempt');
      return;
    }

    console.log('=== Starting onboarding completion ===');
    console.log('Budget Data:', JSON.stringify(budgetData, null, 2));
    console.log('Budget Style:', budgetStyle);
    console.log('Selected Mode:', selectedMode);

    // CRITICAL: Validate budget data exists before attempting completion
    if (!budgetData || !budgetData.categoryBudgets || Object.keys(budgetData.categoryBudgets).length === 0) {
      console.error('❌ Budget data is empty!');
      console.error('This usually means state updates from previous screen did not propagate.');
      alert(t('onboarding.simple.success.budgetDataError'));
      return;
    }

    if (!budgetData.monthlyIncome || budgetData.monthlyIncome === 0) {
      console.error('❌ Monthly income is not set!');
      alert(t('onboarding.simple.success.incomeError'));
      return;
    }

    console.log('✅ Budget data validation passed');

    setCompleting(true);
    setCompletionAttempted(true);

    try {
      // Add 30-second timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Completion timed out after 30 seconds')), 30000)
      );

      // Complete onboarding with timeout protection
      const success = await Promise.race([
        completeOnboarding(categories),
        timeoutPromise
      ]);

      console.log('Onboarding completion result:', success);

      if (success) {
        console.log('✅ Simple onboarding completed successfully');
        console.log('⏳ Waiting for AppNavigator to detect completion (polls every 2 seconds)...');
        // Keep completion flag set to prevent further attempts
      } else {
        console.error('❌ Onboarding completion returned false');
        console.error('Likely causes: validation failed, Firebase save failed, or AsyncStorage failed');
        alert(t('onboarding.simple.success.completionError'));
        setCompleting(false);
        setCompletionAttempted(false);
      }
    } catch (error) {
      console.error('❌ Error completing simple onboarding:', error);
      console.error('Error stack:', error.stack);
      alert(`Error: ${error.message || 'Failed to complete onboarding'}`);
      setCompleting(false);

      // Reset completion attempted after delay to allow retry
      completionTimeoutRef.current = setTimeout(() => {
        setCompletionAttempted(false);
      }, 2000);
    }
  };

  const handleViewSettings = async () => {
    // Prevent double-tap on settings button too
    if (completing || completionAttempted) {
      console.log('Preventing duplicate settings navigation');
      return;
    }

    // Complete onboarding first, then navigate to budget settings
    await handleGoToDashboard();
    // Note: After completion, AppNavigator will show MainTabs
    // User can then navigate to Budget tab from there
  };

  // Get budget summary
  const getBudgetSummary = () => {
    // Get total from budgetData (most accurate)
    const dataTotal = budgetData?.monthlyIncome || 0;
    const fallbackTotal = budgetTotal || 2400;

    if (budgetStyle === 'smart') {
      return {
        type: t('onboarding.simple.success.smartBudgetType'),
        description: t('onboarding.simple.success.smartDescription'),
        total: dataTotal || fallbackTotal,
      };
    } else {
      return {
        type: t('onboarding.simple.success.fixedBudgetType'),
        description: t('onboarding.simple.success.fixedDescription'),
        total: dataTotal || fallbackTotal,
      };
    }
  };

  const summary = getBudgetSummary();

  // Safe area insets with proper fallbacks
  const safeBottomInset = React.useMemo(() => {
    // Guard against undefined, null, NaN, or negative values
    if (!insets || typeof insets.bottom !== 'number' || isNaN(insets.bottom) || insets.bottom < 0) {
      return SPACING.base;
    }
    return Math.max(insets.bottom, SPACING.base);
  }, [insets]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Success Checkmark */}
        <Animated.View
          style={[
            styles.checkmarkContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.checkmarkCircle}>
            <Ionicons name="checkmark" size={80} color={COLORS.background} />
          </View>
        </Animated.View>

        {/* Animated Text Content */}
        <Animated.View style={[styles.textContent, { opacity: fadeAnim }]}>
          {/* Title */}
          <Text style={styles.title}>{t('onboarding.simple.success.title')}</Text>

          {/* Message */}
          <Text style={styles.message}>
            {t('onboarding.simple.success.subtitle')}
          </Text>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{t('onboarding.simple.success.configTitle')}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('onboarding.simple.success.budgetTypeLabel')}</Text>
              <Text style={styles.summaryValue}>{summary.type}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('onboarding.simple.success.monthlyTotalLabel')}</Text>
              <Text style={styles.summaryValuePrimary}>
                ${summary.total.toLocaleString()}
              </Text>
            </View>

            <View style={styles.summaryDescription}>
              <Text style={styles.summaryDescriptionText}>
                {summary.description}
              </Text>
            </View>
          </View>

          {/* Preview Card */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{t('onboarding.simple.success.currentMonthTitle')}</Text>

            <View style={styles.previewStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('onboarding.simple.success.categoriesLabel')}</Text>
                <Text style={styles.statValue}>
                  {Object.keys(DEFAULT_CATEGORIES).length}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('onboarding.simple.success.budgetLabel')}</Text>
                <Text style={styles.statValue}>
                  ${summary.total.toLocaleString()}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('onboarding.simple.success.spentLabel')}</Text>
                <Text style={styles.statValue}>{t('onboarding.simple.success.zeroSpent')}</Text>
              </View>
            </View>
          </View>

          {/* Features Preview */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>{t('onboarding.simple.success.feature1')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>{t('onboarding.simple.success.feature2')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>{t('onboarding.simple.success.feature3')}</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={[
        styles.footer,
        {
          paddingBottom: Platform.select({
            ios: safeBottomInset + 85,      // safe area + iOS tab bar
            android: safeBottomInset + 60,  // safe area + Android tab bar
            web: 60,                         // just tab bar (no safe area on web)
          }),
        }
      ]}>
        {/* Primary Button */}
        <TouchableOpacity
          style={[COMMON_STYLES.primaryButton, (completing || completionAttempted) && styles.buttonDisabled]}
          onPress={handleGoToDashboard}
          disabled={completing || completionAttempted}
        >
          {completing ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>{t('onboarding.simple.success.continueButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Secondary Link */}
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={handleViewSettings}
          disabled={completing || completionAttempted}
        >
          <Text style={[styles.settingsLinkText, (completing || completionAttempted) && styles.linkDisabled]}>{t('onboarding.simple.success.settingsLink')}</Text>
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
    paddingTop: SPACING.large,
    // Extra padding for content scrollability + bottom tabs (tabs now always visible)
    paddingBottom: Platform.select({
      ios: SPACING.xxlarge * 3 + 85,      // content padding + iOS tab bar
      android: SPACING.xxlarge * 3 + 60,  // content padding + Android tab bar
      web: SPACING.xxlarge * 3 + 60,      // content padding + web tab bar
    }),
    alignItems: 'center',
  },
  checkmarkContainer: {
    marginVertical: SPACING.large,
  },
  checkmarkCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  textContent: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  message: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
    paddingHorizontal: SPACING.base,
    lineHeight: 22,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    ...SHADOWS.card,
  },
  summaryHeader: {
    marginBottom: SPACING.base,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.small,
  },
  summaryLabel: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  summaryValuePrimary: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  summaryDescription: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.small,
    padding: SPACING.small,
    marginTop: SPACING.small,
  },
  summaryDescriptionText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  previewCard: {
    width: '100%',
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  previewTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.base,
    textAlign: 'center',
  },
  previewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  statLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
  },
  statValue: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
  },
  featureText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    marginLeft: SPACING.small,
  },
  footer: {
    padding: SPACING.screenPadding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  settingsLink: {
    alignItems: 'center',
    paddingVertical: SPACING.base,
  },
  settingsLinkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkDisabled: {
    opacity: 0.5,
  },
});
