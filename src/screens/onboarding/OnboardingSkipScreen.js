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
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';

export default function OnboardingSkipScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { completeOnboarding, loading: onboardingLoading } = useOnboarding();
  const [completing, setCompleting] = useState(false);

  // Animation values
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    startAnimation();
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
    setCompleting(true);
    try {
      // Complete onboarding in skip mode
      const success = await completeOnboarding(null);

      if (success) {
        // AppNavigator will automatically navigate to MainTabs
        // after onboarding is marked as complete
        console.log('Onboarding skipped successfully');
      }
    } catch (error) {
      console.error('Error completing skip onboarding:', error);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, SPACING.base) }]}>
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
          style={[COMMON_STYLES.primaryButton, completing && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={completing}
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
