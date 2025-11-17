// src/screens/onboarding/simple/SimpleChooseStyleScreen.js
// Step 1 of Simple Mode: Choose between Smart Budget and Fixed Budget

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../../constants/theme';
import ProgressStepper from '../../../components/onboarding/ProgressStepper';
import OnboardingCard from '../../../components/onboarding/OnboardingCard';
import { useOnboarding } from '../../../contexts/OnboardingContext';

export default function SimpleChooseStyleScreen({ navigation }) {
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
    navigation.navigate('AdvancedOnboarding');
  };

  return (
    <View style={styles.container}>
      {/* Progress Stepper */}
      <ProgressStepper currentStep={1} totalSteps={2} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            title="Smart Budget"
            description="We'll suggest budgets based on your spending patterns"
            details="📊 Updates monthly"
            selected={selectedStyle === 'smart'}
            recommended={true}
            onPress={() => setSelectedStyle('smart')}
          />

          {/* Fixed Budget Option */}
          <OnboardingCard
            icon="📝"
            title="Fixed Budget"
            description="Set a total monthly amount, we'll divide it across categories"
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
      <View style={styles.footer}>
        <TouchableOpacity
          style={COMMON_STYLES.primaryButton}
          onPress={handleContinue}
        >
          <Text style={COMMON_STYLES.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
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
