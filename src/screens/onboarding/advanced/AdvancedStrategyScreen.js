// src/screens/onboarding/advanced/AdvancedStrategyScreen.js
// Advanced Mode Strategy Selection - Step 3/7

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';

export default function AdvancedStrategyScreen({ navigation, route }) {
  const { timeframeData } = route.params || {};
  const [selectedStrategy, setSelectedStrategy] = useState('equal'); // 'equal', 'seasonal', 'custom'

  const handleContinue = () => {
    const strategyData = {
      ...timeframeData,
      strategy: selectedStrategy,
    };

    navigation.navigate('AdvancedCategories', { strategyData });
  };

  const strategies = [
    {
      id: 'equal',
      icon: '⚖️',
      title: 'Equal Monthly',
      description: 'Same amount every month, simple & predictable',
      details: 'Perfect for consistent monthly expenses',
      badge: 'Most Popular',
    },
    {
      id: 'seasonal',
      icon: '🌤️',
      title: 'Seasonal Budgets',
      description: 'Vary by month/season, more flexible',
      details: 'Great for expenses that change with seasons',
      badge: null,
    },
    {
      id: 'custom',
      icon: '🎯',
      title: 'Custom Plan',
      description: 'Set each month individually, maximum control',
      details: 'Full flexibility for unique planning needs',
      badge: null,
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step 3 of 7</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '42.9%' }]} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>How do you plan?</Text>
        <Text style={styles.subtitle}>
          Choose your budgeting strategy for the year
        </Text>

        {/* Strategy Cards */}
        <View style={styles.strategiesContainer}>
          {strategies.map((strategy) => (
            <TouchableOpacity
              key={strategy.id}
              style={[
                styles.strategyCard,
                selectedStrategy === strategy.id && styles.strategyCardSelected,
              ]}
              onPress={() => setSelectedStrategy(strategy.id)}
              activeOpacity={0.7}
            >
              {strategy.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{strategy.badge}</Text>
                </View>
              )}

              <View style={styles.strategyHeader}>
                <View style={styles.strategyIcon}>
                  <Text style={styles.strategyIconText}>{strategy.icon}</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedStrategy === strategy.id && styles.radioButtonSelected,
                  ]}
                >
                  {selectedStrategy === strategy.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>

              <Text style={styles.strategyTitle}>{strategy.title}</Text>
              <Text style={styles.strategyDescription}>{strategy.description}</Text>
              <Text style={styles.strategyDetails}>{strategy.details}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Don't worry, you can change this later in settings
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.screenPadding,
    paddingTop: SPACING.huge,
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
  strategiesContainer: {
    marginBottom: SPACING.large,
  },
  strategyCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.card,
    position: 'relative',
  },
  strategyCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f3ff',
  },
  badge: {
    position: 'absolute',
    top: SPACING.medium,
    right: SPACING.medium,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.tiny,
    borderRadius: SIZES.borderRadius.small,
  },
  badgeText: {
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.medium,
  },
  strategyIcon: {
    width: 60,
    height: 60,
    borderRadius: SIZES.borderRadius.medium,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strategyIconText: {
    fontSize: 32,
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
  strategyTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  strategyDescription: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  strategyDetails: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.xlarge,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: SPACING.small,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  continueButton: {
    ...COMMON_STYLES.primaryButton,
    marginTop: 'auto',
  },
  continueButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
});
