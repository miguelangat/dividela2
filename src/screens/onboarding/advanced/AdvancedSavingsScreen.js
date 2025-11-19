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
import { useTranslation } from 'react-i18next';

export default function AdvancedSavingsScreen({ navigation, route }) {
  const { t } = useTranslation();
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
          <Text style={styles.progressText}>{t('onboarding.advanced.savings.progressText')}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '85.7%' }]} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('onboarding.advanced.savings.title')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.advanced.savings.subtitle')}
        </Text>

        {/* Main Option Card */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <Text style={styles.mainCardIcon}>💰</Text>
            <View style={styles.mainCardTitleContainer}>
              <Text style={styles.mainCardTitle}>{t('onboarding.advanced.savings.mainOption')}</Text>
              <Text style={styles.mainCardDescription}>
                {t('onboarding.advanced.savings.mainDescription')}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Explanation */}
          <Text style={styles.explanationTitle}>{t('onboarding.advanced.savings.explanationTitle')}</Text>
          <Text style={styles.explanationText}>
            {t('onboarding.advanced.savings.explanationText')}
          </Text>

          {/* Example Calculation */}
          <View style={styles.exampleCard}>
            <Text style={styles.exampleTitle}>{t('onboarding.advanced.savings.exampleTitle')}</Text>

            <View style={styles.exampleRow}>
              <Text style={styles.exampleLabel}>{t('onboarding.advanced.savings.monthlyBudgetLabel')}</Text>
              <Text style={styles.exampleValue}>${exampleBudget}</Text>
            </View>

            <View style={styles.exampleRow}>
              <Text style={styles.exampleLabel}>{t('onboarding.advanced.savings.spentLabel')}</Text>
              <Text style={styles.exampleValue}>${exampleSpent}</Text>
            </View>

            <View style={styles.exampleDivider} />

            <View style={styles.exampleRow}>
              <Text style={styles.exampleLabelBold}>{t('onboarding.advanced.savings.savingsLabel')}</Text>
              <Text style={styles.exampleValueHighlight}>
                ${exampleSavings}
              </Text>
            </View>

            <View style={styles.exampleRow}>
              <Text style={styles.exampleLabelBold}>{t('onboarding.advanced.savings.eachGetsLabel')}</Text>
              <Text style={styles.exampleValueHighlight}>
                ${exampleSplit}
              </Text>
            </View>
          </View>

          {/* Toggle Switch */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('onboarding.advanced.savings.toggleLabel')}</Text>
              <Text style={styles.toggleHint}>
                {includeSavings
                  ? t('onboarding.advanced.savings.toggleHintOn')
                  : t('onboarding.advanced.savings.toggleHintOff')}
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
            <Text style={styles.secondaryOptionTitle}>{t('onboarding.advanced.savings.secondaryOption')}</Text>
            <Text style={styles.secondaryOptionIcon}>
              {showSecondaryOption ? '▼' : '▶'}
            </Text>
          </View>

          {showSecondaryOption && (
            <View style={styles.secondaryOptionContent}>
              <Text style={styles.secondaryOptionText}>
                {t('onboarding.advanced.savings.secondaryDescription')}
              </Text>

              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setIncludeSavings(false)}
              >
                <Text style={styles.selectButtonText}>{t('onboarding.advanced.savings.useSecondaryButton')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            {t('onboarding.advanced.savings.infoText')}
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
          <Text style={styles.finishButtonText}>{t('onboarding.advanced.savings.finishButton')}</Text>
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
