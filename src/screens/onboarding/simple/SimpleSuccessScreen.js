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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useBudget } from '../../../contexts/BudgetContext';
import { DEFAULT_CATEGORIES } from '../../../constants/defaultCategories';

export default function SimpleSuccessScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { budgetStyle, totalBudget, completeOnboarding, loading: onboardingLoading } = useOnboarding();
  const { currentBudget, totalBudget: budgetTotal, categories } = useBudget();
  const [completing, setCompleting] = useState(false);
  const [completionAttempted, setCompletionAttempted] = useState(false);
  const completionTimeoutRef = React.useRef(null);

  // Animation values
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    startAnimation();

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
    // Double-tap prevention: Check if already completing or recently completed
    if (completing || completionAttempted) {
      console.log('Preventing duplicate completion attempt');
      return;
    }

    console.log('=== Starting onboarding completion ===');
    console.log('Budget style:', budgetStyle);
    console.log('Categories from BudgetContext:', categories);

    setCompleting(true);
    setCompletionAttempted(true);

    try {
      // Complete onboarding and save budget
      // Note: categories parameter is not actually used in completeOnboarding
      // The budget data comes from OnboardingContext.budgetData
      const success = await completeOnboarding(categories);

      console.log('Onboarding completion result:', success);

      if (success) {
        // AppNavigator will automatically navigate to MainTabs
        // after onboarding is marked as complete
        console.log('✅ Simple onboarding completed successfully');

        // Keep completion flag set to prevent further attempts
        // Don't reset completing state to keep UI disabled
      } else {
        console.error('❌ Onboarding completion returned false');
        alert('Failed to complete onboarding. Please try again.');
        // Reset if not successful to allow retry
        setCompleting(false);
        setCompletionAttempted(false);
      }
    } catch (error) {
      console.error('❌ Error completing simple onboarding:', error);
      alert(`Error: ${error.message || 'Failed to complete onboarding'}`);
      // Reset on error to allow retry
      setCompleting(false);

      // Reset completion attempted after a delay to allow retry
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
    if (budgetStyle === 'smart') {
      return {
        type: 'Smart Budget',
        description: 'Industry averages, adjusts to your spending',
        total: budgetTotal || 2400,
      };
    } else {
      return {
        type: 'Fixed Budget',
        description: 'Custom amount distributed across categories',
        total: totalBudget || budgetTotal || 2400,
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
          <Text style={styles.title}>Budget Setup Complete!</Text>

          {/* Message */}
          <Text style={styles.message}>
            You're all set to start tracking expenses and managing your budget together
          </Text>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Your Configuration</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Budget Type</Text>
              <Text style={styles.summaryValue}>{summary.type}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Monthly Total</Text>
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
            <Text style={styles.previewTitle}>Current Month Budget</Text>
            
            <View style={styles.previewStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Categories</Text>
                <Text style={styles.statValue}>
                  {Object.keys(DEFAULT_CATEGORIES).length}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Budget</Text>
                <Text style={styles.statValue}>
                  ${summary.total.toLocaleString()}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Spent</Text>
                <Text style={styles.statValue}>$0</Text>
              </View>
            </View>
          </View>

          {/* Features Preview */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>Track expenses by category</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>Monitor budget progress</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>Get spending alerts</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: safeBottomInset }]}>
        {/* Primary Button */}
        <TouchableOpacity
          style={[COMMON_STYLES.primaryButton, (completing || completionAttempted) && styles.buttonDisabled]}
          onPress={handleGoToDashboard}
          disabled={completing || completionAttempted}
        >
          {completing ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>Go to Dashboard</Text>
          )}
        </TouchableOpacity>

        {/* Secondary Link */}
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={handleViewSettings}
          disabled={completing || completionAttempted}
        >
          <Text style={[styles.settingsLinkText, (completing || completionAttempted) && styles.linkDisabled]}>View Budget Settings</Text>
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
    paddingVertical: SPACING.large,
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
