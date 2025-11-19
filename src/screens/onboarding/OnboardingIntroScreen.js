// src/screens/onboarding/OnboardingIntroScreen.js
// Budget onboarding intro screen with three options: Simple, Advanced, or Skip

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';
import { useOnboarding } from '../../contexts/OnboardingContext';
import OnboardingCard from '../../components/onboarding/OnboardingCard';

export default function OnboardingIntroScreen({ navigation, route }) {
  const { afterPairing = false } = route.params || {};
  const { setMode } = useOnboarding();
  const [selectedOption, setSelectedOption] = useState(null);

  const handleSelectSimple = () => {
    setSelectedOption('simple');
    setMode('simple');
    // Navigate to simple budget setup flow
    navigation.navigate('SimpleChooseStyle');
  };

  const handleSelectAdvanced = () => {
    setSelectedOption('advanced');
    setMode('advanced');
    // Navigate to advanced budget setup flow
    navigation.navigate('AdvancedWelcome');
  };

  const handleSkip = () => {
    setMode('skip');
    // Navigate to skip confirmation screen
    navigation.navigate('OnboardingSkip');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Budget</Text>
          <Text style={styles.subtitle}>
            {afterPairing 
              ? 'Choose how you want to track your shared expenses'
              : 'Choose the setup that works best for you'
            }
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Simple Option (Recommended) */}
          <OnboardingCard
            icon="🎯"
            badge="RECOMMENDED"
            title="Keep It Simple"
            subtitle="Quick monthly budgets"
            duration="⏱️ 2 minutes"
            features={[
              'Auto-calculated',
              'Monthly only',
              'Easy to adjust',
            ]}
            onPress={handleSelectSimple}
            isSelected={selectedOption === 'simple'}
            style={styles.card}
          />

          {/* Advanced Option */}
          <OnboardingCard
            icon="📊"
            title="Annual Planning"
            subtitle="Full year budgets"
            duration="⏱️ 5 minutes"
            features={[
              'Annual budgets',
              'Monthly breakdowns',
              'Custom strategies',
            ]}
            onPress={handleSelectAdvanced}
            isSelected={selectedOption === 'advanced'}
            style={styles.card}
          />
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.6}
        >
          <Text style={styles.skipButtonText}>
            Skip for now
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          You can always set up budgets later from Settings
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.screenPadding,
    paddingTop: SPACING.xxlarge,
    paddingBottom: SPACING.huge,
  },
  header: {
    marginBottom: SPACING.xlarge,
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: SPACING.base,
    marginBottom: SPACING.xlarge,
  },
  card: {
    width: '100%',
  },
  skipButton: {
    paddingVertical: SPACING.medium,
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  skipButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  infoText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.small,
  },
});
