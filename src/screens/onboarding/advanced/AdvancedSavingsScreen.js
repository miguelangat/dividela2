// src/screens/onboarding/advanced/AdvancedSavingsScreen.js
// Advanced Mode Savings Configuration - Step 6/7

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../../constants/theme';

export default function AdvancedSavingsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { allocationData } = route.params || {};
  const [includeSavings, setIncludeSavings] = useState(true);
  const [showSecondaryOption, setShowSecondaryOption] = useState(false);

  const handleFinish = async () => {
    const finalData = {
      ...allocationData,
      includeSavings,
    };

    // Here we would normally save to context/backend
    // For now, just navigate to success screen
    navigation.navigate('AdvancedSuccess', { finalData });
  };

  const exampleBudget = 2000;
  const exampleSpent = 1700;
  const exampleSavings = exampleBudget - exampleSpent;
  const exampleSplit = exampleSavings / 2;

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
          <Text style={styles.progressText}>Step 6 of 7</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '85.7%' }]} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>What happens to savings?</Text>
        <Text style={styles.subtitle}>
          Decide how to handle money saved under budget
        </Text>

        {/* Main Option Card */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <Text style={styles.mainCardIcon}>💰</Text>
            <View style={styles.mainCardTitleContainer}>
              <Text style={styles.mainCardTitle}>Split the Savings</Text>
              <Text style={styles.mainCardDescription}>
                Include budget savings in monthly settlement
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Explanation */}
          <Text style={styles.explanationTitle}>How it works:</Text>
          <Text style={styles.explanationText}>
            When you spend less than your budget, the savings are split equally
            between both partners in the settlement calculation.
          </Text>

          {/* Example Calculation */}
          <View style={styles.exampleCard}>
            <Text style={styles.exampleTitle}>Example</Text>

            <View style={styles.exampleRow}>
              <Text style={styles.exampleLabel}>Monthly budget:</Text>
              <Text style={styles.exampleValue}>${exampleBudget}</Text>
            </View>

            <View style={styles.exampleRow}>
              <Text style={styles.exampleLabel}>Total spent:</Text>
              <Text style={styles.exampleValue}>${exampleSpent}</Text>
            </View>

            <View style={styles.exampleDivider} />

            <View style={styles.exampleRow}>
              <Text style={styles.exampleLabelBold}>Savings:</Text>
              <Text style={styles.exampleValueHighlight}>
                ${exampleSavings}
              </Text>
            </View>

            <View style={styles.exampleRow}>
              <Text style={styles.exampleLabelBold}>Each gets:</Text>
              <Text style={styles.exampleValueHighlight}>
                ${exampleSplit}
              </Text>
            </View>
          </View>

          {/* Toggle Switch */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Include in settlement</Text>
              <Text style={styles.toggleHint}>
                {includeSavings
                  ? 'Savings will be split equally'
                  : 'Savings will not be included'}
              </Text>
            </View>
            <Switch
              value={includeSavings}
              onValueChange={setIncludeSavings}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={includeSavings ? COLORS.primary : COLORS.textTertiary}
            />
          </View>
        </View>

        {/* Secondary Option */}
        <TouchableOpacity
          style={styles.secondaryOption}
          onPress={() => setShowSecondaryOption(!showSecondaryOption)}
          activeOpacity={0.7}
        >
          <View style={styles.secondaryOptionHeader}>
            <Text style={styles.secondaryOptionTitle}>Track only, no split</Text>
            <Text style={styles.secondaryOptionIcon}>
              {showSecondaryOption ? '▼' : '▶'}
            </Text>
          </View>

          {showSecondaryOption && (
            <View style={styles.secondaryOptionContent}>
              <Text style={styles.secondaryOptionText}>
                This option lets you track budget vs. spending without
                including savings in settlements. Good for couples who handle
                leftover money differently.
              </Text>

              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setIncludeSavings(false)}
              >
                <Text style={styles.selectButtonText}>Use this option</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            You can change this setting anytime in budget preferences
          </Text>
        </View>
      </ScrollView>

      {/* Finish Button */}
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
          style={styles.finishButton}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text style={styles.finishButtonText}>Finish Setup</Text>
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
  mainCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.card,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  mainCardIcon: {
    fontSize: 40,
    marginRight: SPACING.medium,
  },
  mainCardTitleContainer: {
    flex: 1,
  },
  mainCardTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  mainCardDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.base,
  },
  explanationTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  explanationText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.base,
  },
  exampleCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  exampleTitle: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    textTransform: 'uppercase',
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.tiny,
  },
  exampleLabel: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  exampleLabelBold: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  exampleValue: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
  exampleValueHighlight: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.success,
  },
  exampleDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.small,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f3ff',
    padding: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
  },
  toggleInfo: {
    flex: 1,
    marginRight: SPACING.base,
  },
  toggleLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  toggleHint: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  secondaryOption: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryOptionTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  secondaryOptionIcon: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  secondaryOptionContent: {
    marginTop: SPACING.base,
    paddingTop: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  secondaryOptionText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.base,
  },
  selectButton: {
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.small,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.primary,
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
  footer: {
    padding: SPACING.screenPadding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  finishButton: {
    ...COMMON_STYLES.primaryButton,
  },
  finishButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
});
