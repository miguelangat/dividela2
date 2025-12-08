// src/screens/auth/ConnectScreen.js
// Connect screen - Choose to invite partner or join with code

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS, COMMON_STYLES } from '../../constants/theme';

import { useAuth } from '../../contexts/AuthContext';

export default function ConnectScreen({ navigation }) {
  const { t } = useTranslation();
  const { skipConnection } = useAuth();

  const handleInvitePartner = () => {
    // Check if navigation is possible (screen exists in current stack)
    try {
      navigation.navigate('Invite');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleJoinPartner = () => {
    // Check if navigation is possible (screen exists in current stack)
    try {
      navigation.navigate('Join');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleSkip = () => {
    skipConnection();
    // If we can navigate to MainTabs, it means we're already in the Main App stack
    // So navigate back instead of just setting the skip state
    try {
      navigation.navigate('MainTabs');
    } catch (error) {
      // If navigation fails, we're in the Connect stack and skipConnection() will trigger navigation
      console.log('Skip from Connect stack, will auto-navigate');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.connect.title')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.connect.subtitle')}
        </Text>
      </View>

      {/* Option Cards */}
      <View style={styles.optionsContainer}>
        {/* Invite Partner - Primary Option */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={handleInvitePartner}
          activeOpacity={0.9}
        >
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>📤</Text>
          </View>
          <Text style={styles.cardTitle}>{t('auth.connect.invitePartner')}</Text>
          <Text style={styles.cardDescription}>
            {t('auth.connect.inviteDescription')}
          </Text>
        </TouchableOpacity>

        {/* Join Partner - Secondary Option */}
        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={handleJoinPartner}
          activeOpacity={0.9}
        >
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>📥</Text>
          </View>
          <Text style={styles.cardTitleSecondary}>{t('auth.connect.joinPartner')}</Text>
          <Text style={styles.cardDescriptionSecondary}>
            {t('auth.connect.joinDescription')}
          </Text>
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>{t('auth.connect.skipForNow')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
    padding: SPACING.screenPadding,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.huge,
  },
  title: {
    ...COMMON_STYLES.heading,
    marginBottom: SPACING.medium,
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  optionsContainer: {
    width: '100%',
  },
  primaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.xxlarge,
    alignItems: 'center',
    marginBottom: SPACING.large,
    ...SHADOWS.large,
  },
  secondaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.xxlarge,
    alignItems: 'center',
  },
  cardIconContainer: {
    marginBottom: SPACING.base,
  },
  cardIcon: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.small,
  },
  cardDescription: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    textAlign: 'center',
    opacity: 0.9,
  },
  cardTitleSecondary: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  cardDescriptionSecondary: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  skipButton: {
    marginTop: SPACING.medium,
    padding: SPACING.medium,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
});
