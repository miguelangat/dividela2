// src/screens/onboarding/OnboardingSkipScreen.js
// Simple success screen shown when users skip budget setup

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useTranslation } from 'react-i18next';

export default function OnboardingSkipScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { completeOnboarding, loading: onboardingLoading } = useOnboarding();
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

  const handleContinue = async () => {
    // Double-tap prevention: Check if already completing or recently completed
    if (completing || completionAttempted) {
      console.log('Preventing duplicate skip completion attempt');
      return;
    }

    setCompleting(true);
    setCompletionAttempted(true);

    try {
      // Complete onboarding in skip mode
      const success = await completeOnboarding(null);

      if (success) {
        console.log('✅ Onboarding skipped successfully');
        console.log('🚀 Resetting navigation to MainTabs > HomeTab...');

        // Use setTimeout to ensure AsyncStorage write completes
        setTimeout(() => {
          try {
            // Get root navigator (go up 2 levels)
            const onboardingStack = navigation.getParent();
            const rootNav = onboardingStack?.getParent();

            if (rootNav) {
              console.log('📍 [OnboardingSkip] Resetting navigation state...');

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

              console.log('✅ [OnboardingSkip] Navigation reset complete');
            } else {
              console.log('⚠️ [OnboardingSkip] Could not get root navigator');
            }
          } catch (error) {
            console.error('❌ [OnboardingSkip] Navigation reset error:', error);
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
      console.error('Error completing skip onboarding:', error);
      // Reset on error to allow retry
      setCompleting(false);

      // Reset completion attempted after a delay to allow retry
      completionTimeoutRef.current = setTimeout(() => {
        setCompletionAttempted(false);
      }, 2000);
    }
  };

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
      <StatusBar style="dark" />

      <View style={[styles.content, { paddingBottom: safeBottomInset }]}>
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
          <Text style={styles.title}>You're all set!</Text>

          {/* Message */}
          <Text style={styles.message}>
            Start tracking expenses with your partner
          </Text>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              You can enable budgets anytime from Settings
            </Text>
          </View>
        </Animated.View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[COMMON_STYLES.primaryButton, (completing || completionAttempted) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={completing || completionAttempted}
        >
          {completing ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>
              Go to Dashboard
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.screenPadding,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  checkmarkContainer: {
    marginBottom: SPACING.xxlarge,
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
    marginBottom: SPACING.xxlarge,
  },
  title: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.medium,
    textAlign: 'center',
  },
  message: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xlarge,
    paddingHorizontal: SPACING.base,
    lineHeight: 22,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    gap: SPACING.small,
    width: '100%',
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
