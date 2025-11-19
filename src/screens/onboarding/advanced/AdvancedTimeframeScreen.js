// src/screens/onboarding/advanced/AdvancedTimeframeScreen.js
// Advanced Mode Timeframe Selection - Step 2/7

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';

export default function AdvancedTimeframeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [selectedMode, setSelectedMode] = useState('annual'); // 'annual' or 'monthly'
  const [annualAmount, setAnnualAmount] = useState('24000');
  const [monthlyAmount, setMonthlyAmount] = useState('2000');

  const handleContinue = () => {
    const timeframeData = {
      mode: selectedMode,
      annualAmount: selectedMode === 'annual' ? parseFloat(annualAmount) || 0 : null,
      monthlyAmount: selectedMode === 'monthly' ? parseFloat(monthlyAmount) || 0 : parseFloat(annualAmount) / 12 || 0,
    };

    // If annual mode, go to strategy screen, otherwise skip to categories
    if (selectedMode === 'annual') {
      navigation.navigate('AdvancedStrategy', { timeframeData });
    } else {
      navigation.navigate('AdvancedCategories', { timeframeData });
    }
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? '0' : num.toLocaleString('en-US');
  };

  const calculatedMonthly = selectedMode === 'annual'
    ? (parseFloat(annualAmount) / 12).toFixed(0)
    : monthlyAmount;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step 2 of 7</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '28.6%' }]} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Budget Timeframe</Text>
        <Text style={styles.subtitle}>
          Choose how you want to plan your budget
        </Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Annual Planning Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedMode === 'annual' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedMode('annual')}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>📅</Text>
              </View>
              <View style={styles.optionTitleContainer}>
                <Text style={styles.optionTitle}>Annual Planning</Text>
                <Text style={styles.optionDescription}>
                  Plan for the full year, see monthly breakdown
                </Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedMode === 'annual' && styles.radioButtonSelected,
                ]}
              >
                {selectedMode === 'annual' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>

            {selectedMode === 'annual' && (
              <View style={styles.optionContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Annual Budget</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={annualAmount}
                      onChangeText={setAnnualAmount}
                      keyboardType="numeric"
                      placeholder="24000"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                </View>

                <View style={styles.calculation}>
                  <Text style={styles.calculationLabel}>Per Month:</Text>
                  <Text style={styles.calculationValue}>
                    ${formatCurrency(calculatedMonthly)}/mo
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Monthly Only Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedMode === 'monthly' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedMode('monthly')}
            activeOpacity={0.7}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>📆</Text>
              </View>
              <View style={styles.optionTitleContainer}>
                <Text style={styles.optionTitle}>Monthly Only</Text>
                <Text style={styles.optionDescription}>
                  Simple monthly budgeting, one month at a time
                </Text>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedMode === 'monthly' && styles.radioButtonSelected,
                ]}
              >
                {selectedMode === 'monthly' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>

            {selectedMode === 'monthly' && (
              <View style={styles.optionContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Monthly Budget</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={monthlyAmount}
                      onChangeText={setMonthlyAmount}
                      keyboardType="numeric"
                      placeholder="2000"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
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
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: SPACING.huge,
    // Extra padding for content scrollability + bottom tabs (tabs now always visible)
    paddingBottom: Platform.select({
      ios: SPACING.xxlarge * 3 + 85,      // content padding + iOS tab bar
      android: SPACING.xxlarge * 3 + 60,  // content padding + Android tab bar
      web: SPACING.xxlarge * 3 + 60,      // content padding + web tab bar
    }),
  },
  progressContainer: {
    marginBottom: SPACING.xlarge,
  },
  progressText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
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
  },
  optionsContainer: {
    marginBottom: SPACING.xxlarge,
  },
  optionCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f3ff',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: SIZES.borderRadius.medium,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.medium,
  },
  optionIconText: {
    fontSize: 28,
  },
  optionTitleContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  optionDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  optionContent: {
    marginTop: SPACING.base,
    paddingTop: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  inputGroup: {
    marginBottom: SPACING.medium,
  },
  inputLabel: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
    paddingHorizontal: SPACING.base,
  },
  currencySymbol: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    marginRight: SPACING.tiny,
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    paddingVertical: SPACING.medium,
  },
  calculation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
  },
  calculationLabel: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  calculationValue: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  footer: {
    padding: SPACING.screenPadding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueButton: {
    ...COMMON_STYLES.primaryButton,
  },
  continueButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
});
