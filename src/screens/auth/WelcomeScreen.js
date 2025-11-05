// src/screens/auth/WelcomeScreen.js
// Welcome screen - First screen users see when opening the app

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';

export default function WelcomeScreen({ navigation }) {
  const handleGetStarted = () => {
    navigation.navigate('SignUp');
  };

  const handleSignIn = () => {
    navigation.navigate('SignIn');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Logo/Icon */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>💑</Text>
      </View>

      {/* Title and Tagline */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>Dividela</Text>
        <Text style={styles.tagline}>
          Track shared expenses with your partner, effortlessly
        </Text>
      </View>

      {/* Primary CTA */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <TouchableOpacity
          style={styles.signInLink}
          onPress={handleSignIn}
          activeOpacity={0.6}
        >
          <Text style={styles.signInLinkText}>
            Already have an account? <Text style={styles.signInLinkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  logoContainer: {
    marginBottom: SPACING.xxlarge,
  },
  logoEmoji: {
    fontSize: 80,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SPACING.huge,
  },
  title: {
    fontSize: FONTS.sizes.xxlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginBottom: SPACING.medium,
  },
  tagline: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    ...COMMON_STYLES.primaryButton,
    width: '100%',
    marginBottom: SPACING.large,
  },
  primaryButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
  signInLink: {
    paddingVertical: SPACING.medium,
  },
  signInLinkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  signInLinkBold: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
});
