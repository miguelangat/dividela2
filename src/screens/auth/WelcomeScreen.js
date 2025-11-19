// src/screens/auth/WelcomeScreen.js
// Welcome screen - First screen users see when opening the app

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../constants/theme';
import LanguageSelectorButton from '../../components/LanguageSelectorButton';
import ScrollableContainer from '../../components/common/ScrollableContainer';

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

        <ScrollableContainer
          containerStyle={styles.scrollableContainer}
          contentStyle={styles.scrollableContent}
          showsVerticalScrollIndicator={true}
          footer={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Made in Colombia 🇨🇴 with ♥
              </Text>
            </View>
          }
        >
          {/* Top Section - Logo and Title */}
          <View style={styles.topSection}>
            {/* Logo with gradient border */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="finance" size={80} color={COLORS.textWhite} />
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
          </View>
        </ScrollableContainer>
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
  scrollableContainer: {
    backgroundColor: 'transparent', // Transparent to show gradient
  },
  scrollableContent: {
    paddingTop: 50,
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: 50,
    right: SPACING.screenPadding,
    zIndex: 1000,
  },
  topSection: {
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.xxlarge,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...SHADOWS.large,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.large,
  },
  title: {
    fontSize: FONTS.sizes.xxlarge,
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
    width: '100%',
  },
  featuresCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
    padding: SPACING.large,
    marginBottom: SPACING.xlarge,
    ...SHADOWS.large,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
  },
  featureText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
    marginLeft: SPACING.base,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    width: '100%',
    minHeight: SIZES.button.height,
    marginBottom: SPACING.base,
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
    marginRight: SPACING.small,
  },
  signInLink: {
    paddingVertical: SPACING.medium,
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
    paddingHorizontal: 0, // Override ScrollableContainer padding
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
