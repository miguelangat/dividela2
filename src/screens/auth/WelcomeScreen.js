// src/screens/auth/WelcomeScreen.js
// Welcome screen - First screen users see when opening the app

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../constants/theme';
import LanguageSelectorButton from '../../components/LanguageSelectorButton';

export default function WelcomeScreen({ navigation }) {
  const { t } = useTranslation();

  const handleGetStarted = () => {
    navigation.navigate('SignUp');
  };

  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient Background */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Language Selector */}
        <View style={styles.languageSelectorContainer}>
          <LanguageSelectorButton variant="icon" />
        </View>

        <View style={styles.contentWrapper}>
          {/* Top Section - Logo and Title */}
          <View style={styles.topSection}>
            {/* Logo with gradient border */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="finance" size={50} color={COLORS.textWhite} />
              </View>
            </View>

            {/* Title and Tagline */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{t('auth.welcome.title')}</Text>
              <Text style={styles.tagline}>
                {t('auth.welcome.tagline')}
              </Text>
            </View>
          </View>

          {/* Bottom Section - Buttons */}
          <View style={styles.bottomSection}>
            <ScrollView
              style={styles.bottomSectionScroll}
              contentContainerStyle={styles.bottomSectionContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
            {/* Feature Highlights Card */}
            <View style={styles.featuresCard}>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.primary} />
                <Text style={styles.featureText}>{t('auth.welcome.feature1', 'Privacy Focused')}</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="account-group" size={24} color={COLORS.primary} />
                <Text style={styles.featureText}>{t('auth.welcome.feature2', 'Perfect for Couples')}</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons name="chart-line" size={24} color={COLORS.primary} />
                <Text style={styles.featureText}>{t('auth.welcome.feature3', 'Easy Tracking')}</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <View style={styles.primaryButtonContent}>
                  <Text style={styles.primaryButtonText}>{t('auth.welcome.getStarted')}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.textWhite} />
                </View>
              </TouchableOpacity>

              {/* Sign In Link */}
              <TouchableOpacity
                style={styles.signInLink}
                onPress={handleSignIn}
                activeOpacity={0.7}
              >
                <Text style={styles.signInLinkText}>
                  {t('auth.welcome.alreadyHaveAccount')} <Text style={styles.signInLinkBold}>{t('auth.welcome.signIn')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>

        {/* Made in Colombia Footer - Fixed at bottom */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made in Colombia 🇨🇴 with ♥
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: 60,
    paddingBottom: SPACING.base,
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: 40,
    right: SPACING.screenPadding,
    zIndex: 1000,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.small,
  },
  logoContainer: {
    marginBottom: SPACING.base,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.large,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
  },
  title: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.medium,
    textAlign: 'center',
  },
  tagline: {
    fontSize: FONTS.sizes.subtitle,
    color: COLORS.textWhite,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
    opacity: 0.9,
  },
  bottomSection: {
    flex: 1,
    width: '100%',
  },
  bottomSectionScroll: {
    flex: 1,
  },
  bottomSectionContent: {
    flexGrow: 1,
  },
  featuresCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    ...SHADOWS.medium,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.tiny,
  },
  featureText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
    marginLeft: SPACING.small,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.base,
    width: '100%',
    minHeight: 48,
    marginBottom: SPACING.small,
    ...SHADOWS.medium,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
    marginRight: SPACING.tiny,
  },
  signInLink: {
    paddingVertical: SPACING.small,
  },
  signInLinkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    opacity: 0.9,
  },
  signInLinkBold: {
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold,
    opacity: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.base,
    paddingBottom: Platform.OS === 'ios' ? SPACING.large : SPACING.base,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Semi-transparent white on gradient
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)', // Subtle white border
  },
  footerText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.medium,
    letterSpacing: 0.3,
    opacity: 0.8, // Increased opacity for better visibility
  },
});
