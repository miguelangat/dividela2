// src/screens/auth/ConnectScreen.js
// Connect screen - Choose to invite partner or join with code
// Partner pairing is required for new users

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function ConnectScreen({ navigation }) {
  const { t } = useTranslation();
  const { signOut, userDetails } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleContinueToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleInvitePartner = () => {
    try {
      navigation.navigate('Invite');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleJoinPartner = () => {
    try {
      navigation.navigate('Join');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Icon */}
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons
            name="account-group"
            size={60}
            color={COLORS.textWhite}
          />
        </View>

        {/* Title */}
        <Text style={styles.headerTitle}>{t('auth.connect.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('auth.connect.subtitle')}
        </Text>
      </LinearGradient>

      {/* Form Card */}
      <View style={styles.formCard}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Option Cards */}
          <View style={styles.optionsContainer}>
            {/* Invite Partner - Primary Option with Gradient */}
            <TouchableOpacity
              style={styles.primaryCardWrapper}
              onPress={handleInvitePartner}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryCard}
              >
                <View style={styles.cardIconContainer}>
                  <MaterialCommunityIcons
                    name="send"
                    size={40}
                    color={COLORS.textWhite}
                  />
                </View>
                <Text style={styles.cardTitle}>{t('auth.connect.invitePartner')}</Text>
                <Text style={styles.cardDescription}>
                  {t('auth.connect.inviteDescription')}
                </Text>
                <View style={styles.cardArrow}>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={24}
                    color={COLORS.textWhite}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Join Partner - Secondary Option */}
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={handleJoinPartner}
              activeOpacity={0.9}
            >
              <View style={styles.cardIconContainerSecondary}>
                <MaterialCommunityIcons
                  name="download"
                  size={40}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.cardTitleSecondary}>{t('auth.connect.joinPartner')}</Text>
              <Text style={styles.cardDescriptionSecondary}>
                {t('auth.connect.joinDescription')}
              </Text>
              <View style={styles.cardArrowSecondary}>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={24}
                  color={COLORS.primary}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Info Text - partner is required */}
          <View style={styles.infoContainer}>
            <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {t('auth.connect.partnerRequired', { defaultValue: 'Dividela is designed for couples. Connect with your partner to start tracking expenses together!' })}
            </Text>
          </View>

          {/* Continue to Home - only if user has coupleId (existing data) */}
          {userDetails?.coupleId && (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinueToHome}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="home" size={20} color={COLORS.primary} />
              <Text style={styles.continueButtonText}>
                {t('auth.connect.continueToHome', { defaultValue: 'Continue to Home' })}
              </Text>
            </TouchableOpacity>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <>
                <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
                <Text style={styles.logoutButtonText}>
                  {t('auth.connect.logout', { defaultValue: 'Log Out' })}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxlarge * 2,
    paddingHorizontal: SPACING.screenPadding,
    borderBottomLeftRadius: SIZES.borderRadius.xlarge * 2,
    borderBottomRightRadius: SIZES.borderRadius.xlarge * 2,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.large,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
    marginHorizontal: SPACING.screenPadding,
    marginTop: -SPACING.xxlarge,
    marginBottom: SPACING.base,
    ...SHADOWS.large,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: SPACING.large,
    paddingTop: SPACING.xlarge,
  },
  optionsContainer: {
    gap: SPACING.base,
    marginBottom: SPACING.xlarge,
  },
  primaryCardWrapper: {
    borderRadius: SIZES.borderRadius.large,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  primaryCard: {
    padding: SPACING.xlarge,
    alignItems: 'center',
    position: 'relative',
  },
  secondaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.xlarge,
    alignItems: 'center',
    position: 'relative',
  },
  cardIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
  },
  cardIconContainerSecondary: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
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
    lineHeight: 20,
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
    lineHeight: 20,
  },
  cardArrow: {
    position: 'absolute',
    right: SPACING.base,
    top: '50%',
    marginTop: -12,
  },
  cardArrowSecondary: {
    position: 'absolute',
    right: SPACING.base,
    top: '50%',
    marginTop: -12,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    gap: SPACING.small,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.small,
    color: COLORS.primary,
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginTop: SPACING.large,
    gap: SPACING.small,
  },
  continueButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginTop: SPACING.large,
    gap: SPACING.small,
  },
  logoutButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.error,
  },
});
