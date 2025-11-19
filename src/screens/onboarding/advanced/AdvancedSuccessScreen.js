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
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useBudget } from '../../../contexts/BudgetContext';

export default function AdvancedSuccessScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { finalData } = route.params || {};
  const { completeOnboarding, loading: onboardingLoading } = useOnboarding();
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

  useEffect(() => {
    // Check if data is valid before proceeding
    if (!isDataValid) {
      console.error('Invalid data detected - navigation back to previous screen');
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

  const handleGoToDashboard = async () => {
    // Double-tap prevention: Check if already completing or recently completed
    if (completing || completionAttempted) {
      console.log('Preventing duplicate completion attempt');
      return;
    }

    // Validate data before attempting completion
    if (!isDataValid) {
      console.error('Cannot complete onboarding with invalid data');
      return;
    }

    setCompleting(true);
    setCompletionAttempted(true);

    try {
      // Complete onboarding and save budget
      const success = await completeOnboarding(budgetCategories);

      if (success) {
        console.log('✅ Advanced onboarding completed successfully');
        console.log('🚀 Dismissing onboarding modal and navigating to home...');

        // Dismiss the onboarding modal and navigate to home
        // Use setTimeout to ensure AsyncStorage write completes first
        setTimeout(() => {
          try {
            // Get parent navigator (Stack navigator that contains the modal)
            const parentNav = navigation.getParent();
            if (parentNav && parentNav.canGoBack()) {
              console.log('📍 Dismissing modal via parent navigator');
              parentNav.goBack();

              // Navigate to home tab after modal dismisses
              setTimeout(() => {
                parentNav.navigate('MainTabs', { screen: 'HomeTab' });
              }, 100);
            } else if (navigation.canGoBack()) {
              console.log('📍 Dismissing modal via navigation.goBack()');
              navigation.goBack();
            } else {
              console.log('📍 Cannot go back, navigation will be handled by AppNavigator polling');
            }
          } catch (navError) {
            console.error('❌ Navigation error:', navError);
            // Fallback: AppNavigator polling will handle navigation
            console.log('⏳ Falling back to AppNavigator polling for navigation');
          }
        }, 500);

        // Keep completion flag set to prevent further attempts
        // Don't reset completing state to keep UI disabled
      } else {
        // Reset if not successful to allow retry
        setCompleting(false);
        setCompletionAttempted(false);
      }
    } catch (error) {
      console.error('Error completing advanced onboarding:', error);
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
          <Text style={styles.title}>Your Budget is Ready!</Text>
          <Text style={styles.subtitle}>
            You're all set to start tracking and managing your shared finances
          </Text>

          {/* Summary Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                ${formatCurrency(totalBudget)}
              </Text>
              <Text style={styles.statLabel}>
                {mode === 'annual' ? 'Annual Budget' : 'Monthly Budget'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {selectedCategories?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {includeSavings ? 'Yes' : 'No'}
              </Text>
              <Text style={styles.statLabel}>Split Savings</Text>
            </View>
          </View>

          {/* Preview Card */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>First Month Breakdown</Text>
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
                + {selectedCategories.length - 3} more categories
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
              <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, (completing || completionAttempted) && styles.buttonDisabled]}
            onPress={handleEditBudget}
            activeOpacity={0.7}
            disabled={completing || completionAttempted}
          >
            <Text style={[styles.secondaryButtonText, (completing || completionAttempted) && styles.textDisabled]}>Edit Budget</Text>
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
