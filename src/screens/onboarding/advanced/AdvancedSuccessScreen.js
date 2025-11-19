// src/screens/onboarding/advanced/AdvancedSuccessScreen.js
// Advanced Mode Success Screen - Step 7/7

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CommonActions } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useBudget } from '../../../contexts/BudgetContext';
import { useTranslation } from 'react-i18next';

export default function AdvancedSuccessScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { finalData } = route.params || {};
  const {
    completeOnboarding,
    loading: onboardingLoading,
    budgetData: contextBudgetData,
    setCategoryBudgets,
    setMonthlyIncome,
    setMode,
  } = useOnboarding();
  const { categories: budgetCategories } = useBudget();
  const [completing, setCompleting] = useState(false);
  const [completionAttempted, setCompletionAttempted] = useState(false);
  const completionTimeoutRef = useRef(null);

  // Validate and sanitize navigation params
  const {
    mode,
    totalBudget,
    selectedCategories,
    includeSavings,
    allocations,
  } = finalData || {};

  // Validate critical data
  const isDataValid = React.useMemo(() => {
    if (!finalData) {
      console.error('AdvancedSuccessScreen: No finalData provided');
      return false;
    }
    if (!mode || (mode !== 'monthly' && mode !== 'annual')) {
      console.error('AdvancedSuccessScreen: Invalid mode:', mode);
      return false;
    }
    if (typeof totalBudget !== 'number' || totalBudget <= 0 || isNaN(totalBudget)) {
      console.error('AdvancedSuccessScreen: Invalid totalBudget:', totalBudget);
      return false;
    }
    if (!Array.isArray(selectedCategories) || selectedCategories.length === 0) {
      console.error('AdvancedSuccessScreen: Invalid selectedCategories:', selectedCategories);
      return false;
    }
    return true;
  }, [finalData, mode, totalBudget, selectedCategories]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  // Log component mount and received data
  useEffect(() => {
    console.log('');
    console.log('========================================');
    console.log('🎬 [AdvancedSuccess] Component Mounted');
    console.log('========================================');
    console.log('📦 Route params:', route.params);
    console.log('📦 finalData:', finalData);
    console.log('✅ isDataValid:', isDataValid);
    console.log('========================================');
    console.log('');
  }, []);

  useEffect(() => {
    console.log('🟢 === AdvancedSuccessScreen Mounted ===');
    console.log('Final Data:', JSON.stringify(finalData, null, 2));
    console.log('isDataValid:', isDataValid);

    // Check if data is valid before proceeding
    if (!isDataValid) {
      console.error('❌ [AdvancedSuccess] Invalid data detected');
      console.error('mode:', mode);
      console.error('totalBudget:', totalBudget);
      console.error('selectedCategories:', selectedCategories);
      console.error('finalData:', finalData);
      // Could navigate back or show error
      // For now, just log - animations won't run
      return;
    }

    // Animate checkmark
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate confetti
    confettiAnims.forEach((anim, index) => {
      const delay = index * 50;
      const randomX = (Math.random() - 0.5) * 200;
      const randomRotate = Math.random() * 720;

      Animated.parallel([
        Animated.timing(anim.x, {
          toValue: randomX,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim.y, {
          toValue: 600,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: randomRotate,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Cleanup timeout on unmount
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, [isDataValid]);

  // CRITICAL: Initialize context with budget data from params
  // This is required for completeOnboarding() to work properly
  useEffect(() => {
    console.log('');
    console.log('========================================');
    console.log('🔄 [AdvancedSuccess] Context Initialization useEffect Running');
    console.log('========================================');
    console.log('isDataValid:', isDataValid);
    console.log('finalData:', finalData);
    console.log('contextBudgetData:', contextBudgetData);

    if (!isDataValid || !finalData) {
      console.error('❌ [AdvancedSuccess] Cannot initialize context - invalid data');
      console.error('isDataValid:', isDataValid);
      console.error('finalData:', finalData);
      return;
    }

    // Check if context already has budget data
    if (contextBudgetData?.monthlyIncome > 0 && Object.keys(contextBudgetData?.categoryBudgets || {}).length > 0) {
      console.log('✅ [AdvancedSuccess] Context already has budget data');
      console.log('contextBudgetData.monthlyIncome:', contextBudgetData.monthlyIncome);
      console.log('contextBudgetData.categoryBudgets keys:', Object.keys(contextBudgetData.categoryBudgets));
      return;
    }

    console.log('⚠️ [AdvancedSuccess] Context data empty, setting from params...');
    console.log('📦 Final Data received:', JSON.stringify(finalData, null, 2));

    try {
      // CRITICAL: Convert annual amounts to monthly if needed
      // The allocations might be ANNUAL amounts, but saveBudget expects MONTHLY budgets
      const isAnnual = finalData.mode === 'annual';
      const divisor = isAnnual ? 12 : 1;

      console.log('🔍 Mode:', finalData.mode);
      console.log('🔍 Is Annual?:', isAnnual);
      console.log('🔍 Divisor:', divisor);

      // Transform allocations into categoryBudgets format
      // If annual mode, divide by 12 to convert to monthly
      const categoryBudgets = {};
      if (finalData.allocations) {
        console.log('📊 Allocations from finalData (RAW):', finalData.allocations);
        Object.entries(finalData.allocations).forEach(([key, value]) => {
          const monthlyValue = value / divisor;
          categoryBudgets[key] = monthlyValue;
          console.log(`  ${key}: ${value} -> ${monthlyValue} (divided by ${divisor})`);
        });
      } else {
        console.error('❌ No allocations in finalData!');
      }

      const monthlyIncome = (finalData.totalBudget || 0) / divisor;

      console.log('💾 Setting category budgets (MONTHLY):', categoryBudgets);
      console.log('💾 Setting monthly income:', monthlyIncome, `(${finalData.totalBudget} / ${divisor})`);
      console.log('💾 Setting mode:', finalData.mode || 'advanced');

      // Set budget data in context (now in MONTHLY amounts)
      setCategoryBudgets(categoryBudgets);
      setMonthlyIncome(monthlyIncome);
      setMode(finalData.mode || 'advanced');

      console.log('✅ [AdvancedSuccess] Context data initialized successfully');
      console.log('========================================');
      console.log('');
    } catch (error) {
      console.error('❌ [AdvancedSuccess] Error setting context data:', error);
      console.error('Error stack:', error.stack);
    }
  }, [finalData, isDataValid, setCategoryBudgets, setMonthlyIncome, setMode]); // Removed contextBudgetData to prevent infinite loop

  const handleGoToDashboard = async () => {
    console.log('🔴 ADVANCED GO TO DASHBOARD BUTTON CLICKED');
    console.log('Current state - completing:', completing, 'completionAttempted:', completionAttempted);
    console.log('isDataValid:', isDataValid);

    // Double-tap prevention: Check if already completing or recently completed
    if (completing || completionAttempted) {
      console.log('⚠️ Preventing duplicate completion attempt');
      return;
    }

    // Validate data before attempting completion
    if (!isDataValid) {
      console.error('❌ Cannot complete onboarding with invalid data');
      console.error('finalData:', finalData);
      return;
    }

    console.log('=== Starting ADVANCED onboarding completion ===');
    setCompleting(true);
    setCompletionAttempted(true);

    try {
      console.log('🚀 Calling completeOnboarding with explicit budget data...');

      // Complete onboarding and save budget
      // Pass budget data explicitly to avoid React state timing issues
      // Reconstruct categoryBudgets and monthlyIncome from finalData
      const isAnnual = finalData.mode === 'annual';
      const divisor = isAnnual ? 12 : 1;

      const categoryBudgets = {};
      if (finalData.allocations) {
        Object.entries(finalData.allocations).forEach(([key, value]) => {
          categoryBudgets[key] = value / divisor;
        });
      }

      const monthlyIncome = (finalData.totalBudget || 0) / divisor;

      const explicitBudgetData = {
        categoryBudgets,
        monthlyIncome,
        annualBudgets: [],
      };

      console.log('📦 Explicit budget data:', JSON.stringify(explicitBudgetData, null, 2));

      // Validate that we have the necessary data
      if (!explicitBudgetData.categoryBudgets || Object.keys(explicitBudgetData.categoryBudgets).length === 0) {
        console.error('❌ Category budgets not defined');
        alert('Error: Category budgets are not defined. Please go back and ensure all categories have budget values.');
        setCompleting(false);
        setCompletionAttempted(false);
        return;
      }

      if (!explicitBudgetData.monthlyIncome || explicitBudgetData.monthlyIncome <= 0) {
        console.error('❌ Monthly income not defined');
        alert('Error: Monthly income is not defined. Please go back and enter your budget.');
        setCompleting(false);
        setCompletionAttempted(false);
        return;
      }

      console.log('✅ Budget data validation passed');

      const success = await completeOnboarding(budgetCategories, explicitBudgetData);

      console.log('📝 completeOnboarding returned:', success);

      if (success) {
        console.log('✅ Advanced onboarding completed successfully');
        console.log('🚀 Resetting navigation to MainTabs > HomeTab...');

        // Use setTimeout to ensure AsyncStorage write completes
        setTimeout(() => {
          try {
            // Get root navigator (go up 2 levels)
            const onboardingStack = navigation.getParent();
            const rootNav = onboardingStack?.getParent();

            if (rootNav) {
              console.log('📍 [AdvancedSuccess] Resetting navigation state...');

              // Use reset action to completely replace navigation state
              // This forces a clean navigation to MainTabs with HomeTab selected
              rootNav.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'MainTabs',
                      state: {
                        routes: [{ name: 'HomeTab' }],
                        index: 0,
                      },
                    },
                  ],
                })
              );

              console.log('✅ [AdvancedSuccess] Navigation reset complete');
            } else {
              console.log('⚠️ [AdvancedSuccess] Could not get root navigator');
            }
          } catch (error) {
            console.error('❌ [AdvancedSuccess] Navigation reset error:', error);
          }
        }, 500);

        // Keep completion flag set to prevent further attempts
        // Don't reset completing state to keep UI disabled
      } else {
        console.error('');
        console.error('❌❌❌ COMPLETION FAILED ❌❌❌');
        console.error('completeOnboarding returned false');
        console.error('This means validation or save failed');
        console.error('Check OnboardingContext logs above for details');
        console.error('');

        // Reset if not successful to allow retry
        setCompleting(false);
        setCompletionAttempted(false);
        alert('Failed to complete onboarding. Check browser console for details.');
      }
    } catch (error) {
      console.error('');
      console.error('❌❌❌ EXCEPTION IN COMPLETION ❌❌❌');
      console.error('Error completing advanced onboarding:', error);
      console.error('Error stack:', error.stack);
      console.error('');

      alert(`Error: ${error.message}`);

      // Reset on error to allow retry
      setCompleting(false);

      // Reset completion attempted after a delay to allow retry
      completionTimeoutRef.current = setTimeout(() => {
        setCompletionAttempted(false);
      }, 2000);
    }
  };

  const handleEditBudget = () => {
    // Prevent navigation if completing
    if (completing || completionAttempted) {
      console.log('Preventing navigation during completion');
      return;
    }

    // Navigate back to allocation screen to edit
    navigation.goBack();
  };

  const formatCurrency = (value) => {
    // Guard against invalid values
    if (typeof value !== 'number' || isNaN(value)) {
      return '0';
    }
    return Math.round(value).toLocaleString('en-US');
  };

  const monthlyBudget = mode === 'annual' ? (totalBudget || 0) / 12 : (totalBudget || 0);

  // Get first 3 categories for preview
  const previewCategories = selectedCategories?.slice(0, 3) || [];

  // Safe area insets with proper fallbacks
  const safeBottomInset = React.useMemo(() => {
    // Guard against undefined, null, NaN, or negative values
    if (!insets || typeof insets.bottom !== 'number' || isNaN(insets.bottom) || insets.bottom < 0) {
      return SPACING.base;
    }
    return Math.max(insets.bottom, SPACING.base);
  }, [insets]);

  const confettiColors = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.success,
    COLORS.warning,
    COLORS.info,
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Confetti Animation */}
      <View style={styles.confettiContainer}>
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor:
                  confettiColors[index % confettiColors.length],
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  {
                    rotate: anim.rotate.interpolate({
                      inputRange: [0, 720],
                      outputRange: ['0deg', '720deg'],
                    }),
                  },
                ],
                opacity: anim.opacity,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Checkmark */}
        <Animated.View
          style={[
            styles.checkmarkContainer,
            {
              transform: [{ scale: checkmarkScale }],
            },
          ]}
        >
          <View style={styles.checkmarkCircle}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        </Animated.View>

        {/* Title and Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.title}>{t('onboarding.advanced.success.title')}</Text>
          <Text style={styles.subtitle}>
            {t('onboarding.advanced.success.subtitle')}
          </Text>

          {/* Summary Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                ${formatCurrency(totalBudget)}
              </Text>
              <Text style={styles.statLabel}>
                {mode === 'annual' ? t('onboarding.advanced.success.annualBudget') : t('onboarding.advanced.success.monthlyBudget')}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {selectedCategories?.length || 0}
              </Text>
              <Text style={styles.statLabel}>{t('onboarding.advanced.success.categoriesLabel')}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {includeSavings ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.statLabel}>{t('onboarding.advanced.success.splitSavingsLabel')}</Text>
            </View>
          </View>

          {/* Preview Card */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{t('onboarding.advanced.success.firstMonthTitle')}</Text>
              <Text style={styles.previewAmount}>
                ${formatCurrency(monthlyBudget)}
              </Text>
            </View>

            <View style={styles.previewDivider} />

            {previewCategories.map((category) => {
              const allocation = allocations?.[category.key] || 0;
              const monthlyAllocation =
                mode === 'annual' ? allocation / 12 : allocation;

              return (
                <View key={category.key} style={styles.previewItem}>
                  <View style={styles.previewItemLeft}>
                    <Text style={styles.previewIcon}>{category.icon}</Text>
                    <Text style={styles.previewName}>{category.name}</Text>
                  </View>
                  <Text style={styles.previewValue}>
                    ${formatCurrency(monthlyAllocation)}
                  </Text>
                </View>
              );
            })}

            {selectedCategories?.length > 3 && (
              <Text style={styles.previewMore}>
                {t('onboarding.advanced.success.moreCategories', { count: selectedCategories.length - 3 })}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.primaryButton, (completing || completionAttempted || !isDataValid) && styles.buttonDisabled]}
            onPress={handleGoToDashboard}
            activeOpacity={0.8}
            disabled={completing || completionAttempted || !isDataValid}
          >
            {completing ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('onboarding.advanced.success.continueButton')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, (completing || completionAttempted) && styles.buttonDisabled]}
            onPress={handleEditBudget}
            activeOpacity={0.7}
            disabled={completing || completionAttempted}
          >
            <Text style={[styles.secondaryButtonText, (completing || completionAttempted) && styles.textDisabled]}>{t('onboarding.advanced.success.editButton')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.huge,
    alignItems: 'center',
    // Extra padding for content scrollability + bottom tabs (tabs now always visible)
    paddingBottom: Platform.select({
      ios: SPACING.xxlarge * 3 + 85,      // content padding + iOS tab bar
      android: SPACING.xxlarge * 3 + 60,  // content padding + Android tab bar
      web: SPACING.xxlarge * 3 + 60,      // content padding + web tab bar
    }),
  },
  checkmarkContainer: {
    marginBottom: SPACING.xlarge,
    marginTop: SPACING.xlarge,
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.large,
  },
  checkmarkText: {
    fontSize: 60,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold,
  },
  content: {
    width: '100%',
    alignItems: 'center',
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
    marginBottom: SPACING.xxlarge,
    maxWidth: 300,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: SPACING.xlarge,
    gap: SPACING.small,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginBottom: SPACING.tiny,
  },
  statLabel: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  previewCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.xlarge,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  previewTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  previewAmount: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  previewDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: SPACING.base,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.small,
  },
  previewItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewIcon: {
    fontSize: 24,
    marginRight: SPACING.small,
  },
  previewName: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    flex: 1,
  },
  previewValue: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
  },
  previewMore: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.small,
  },
  primaryButton: {
    ...COMMON_STYLES.primaryButton,
    width: '100%',
    marginBottom: SPACING.base,
  },
  primaryButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
  secondaryButton: {
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  textDisabled: {
    opacity: 0.5,
  },
});
