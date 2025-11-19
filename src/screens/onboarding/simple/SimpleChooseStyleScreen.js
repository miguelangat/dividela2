// src/screens/onboarding/simple/SimpleChooseStyleScreen.js
// Step 1 of Simple Mode: Choose between Smart Budget and Fixed Budget

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../../constants/theme';
import ProgressStepper from '../../../components/onboarding/ProgressStepper';
import OnboardingCard from '../../../components/onboarding/OnboardingCard';
import { useOnboarding } from '../../../contexts/OnboardingContext';
import { useTranslation } from 'react-i18next';

export default function SimpleChooseStyleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { budgetStyle, setBudgetStyle } = useOnboarding();
  const [selectedStyle, setSelectedStyle] = useState(budgetStyle || 'smart');

  const handleContinue = () => {
    // Save selection to context
    setBudgetStyle(selectedStyle);

    // Navigate to appropriate screen based on selection
    if (selectedStyle === 'smart') {
      navigation.navigate('SimpleSmartBudget');
    } else {
      navigation.navigate('SimpleFixedBudget');
    }
  };

  const handleSwitchToAdvanced = () => {
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
        <ProgressStepper currentStep={1} totalSteps={2} style={styles.progressStepper} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>How do you want to budget?</Text>
          <Text style={styles.subtitle}>
            Choose the approach that works best for you
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Smart Budget Option */}
          <OnboardingCard
            icon="💚"
            title={t('onboarding.simple.chooseStyle.smartTitle')}
            description={t('onboarding.simple.chooseStyle.smartDescription')}
            details="📊 Updates monthly"
            selected={selectedStyle === 'smart'}
            recommended={true}
            onPress={() => setSelectedStyle('smart')}
          />

          {/* Fixed Budget Option */}
          <OnboardingCard
            icon="📝"
            title={t('onboarding.simple.chooseStyle.fixedTitle')}
            description={t('onboarding.simple.chooseStyle.fixedDescription')}
            details="💰 You choose total"
            selected={selectedStyle === 'fixed'}
            onPress={() => setSelectedStyle('fixed')}
          />
        </View>

        {/* Advanced Mode Link */}
        <TouchableOpacity
          style={styles.advancedLink}
          onPress={handleSwitchToAdvanced}
        >
          <Text style={styles.advancedLinkText}>
            Switch to Advanced Mode
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Continue Button */}
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
        <TouchableOpacity
          style={COMMON_STYLES.primaryButton}
          onPress={handleContinue}
        >
          <Text style={COMMON_STYLES.primaryButtonText}>{t('onboarding.simple.chooseStyle.continue')}</Text>
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
    marginBottom: SPACING.large,
  },
  title: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: SPACING.base,
  },
  advancedLink: {
    alignItems: 'center',
    paddingVertical: SPACING.base,
  },
  advancedLinkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  footer: {
    padding: SPACING.screenPadding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
