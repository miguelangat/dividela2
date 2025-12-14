// src/screens/auth/ConnectScreen.js
// Connect screen - Choose to create solo account, invite partner, or join with code
// Multi-account support: users can start solo or pair with a partner

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { createSoloAccount } from '../../services/accountService';

export default function ConnectScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, setActiveAccount } = useAuth();
  const [loading, setLoading] = useState(false);

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

  const handleCreateSoloAccount = async () => {
    try {
      setLoading(true);
      console.log('Creating solo account for user:', user.uid);

      const accountName = t('auth.connect.soloAccountName', 'My Budget');
      const result = await createSoloAccount(user.uid, accountName);

      if (result.success) {
        console.log('Solo account created:', result.accountId);

        // Set as active account
        await setActiveAccount(result.accountId);
        console.log('Active account set to solo account');

        // Navigate to CoreSetup to configure the account
        navigation.replace('CoreSetup');
      }
    } catch (error) {
      console.error('Error creating solo account:', error);
      Alert.alert(
        t('common.error'),
        t('auth.connect.soloAccountError', 'Failed to create solo account. Please try again.')
      );
    } finally {
      setLoading(false);
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
        <Text style={styles.headerTitle}>{t('auth.connect.title', 'Get Started')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('auth.connect.subtitle', 'Choose how you want to track your budget')}
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
            {/* Create Solo Account - Primary Option with Gradient */}
            <TouchableOpacity
              style={styles.primaryCardWrapper}
              onPress={handleCreateSoloAccount}
              activeOpacity={0.9}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? [COLORS.textTertiary, COLORS.textTertiary] : [COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryCard}
              >
                <View style={styles.cardIconContainer}>
                  {loading ? (
                    <ActivityIndicator color={COLORS.textWhite} size="large" />
                  ) : (
                    <MaterialCommunityIcons
                      name="account"
                      size={40}
                      color={COLORS.textWhite}
                    />
                  )}
                </View>
                <Text style={styles.cardTitle}>
                  {t('auth.connect.createSolo', 'Start Solo')}
                </Text>
                <Text style={styles.cardDescription}>
                  {t('auth.connect.soloDescription', 'Track your personal budget independently')}
                </Text>
                {!loading && (
                  <View style={styles.cardArrow}>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={24}
                      color={COLORS.textWhite}
                    />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider with "OR" */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or', 'OR')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Invite Partner - Secondary Option */}
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={handleInvitePartner}
              activeOpacity={0.9}
              disabled={loading}
            >
              <View style={styles.cardIconContainerSecondary}>
                <MaterialCommunityIcons
                  name="send"
                  size={40}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.cardTitleSecondary}>
                {t('auth.connect.invitePartner', 'Invite Partner')}
              </Text>
              <Text style={styles.cardDescriptionSecondary}>
                {t('auth.connect.inviteDescription', 'Send an invite code to your partner')}
              </Text>
              <View style={styles.cardArrowSecondary}>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={24}
                  color={COLORS.primary}
                />
              </View>
            </TouchableOpacity>

            {/* Join Partner - Secondary Option */}
            <TouchableOpacity
              style={styles.secondaryCard}
              onPress={handleJoinPartner}
              activeOpacity={0.9}
              disabled={loading}
            >
              <View style={styles.cardIconContainerSecondary}>
                <MaterialCommunityIcons
                  name="download"
                  size={40}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.cardTitleSecondary}>
                {t('auth.connect.joinPartner', 'Join Partner')}
              </Text>
              <Text style={styles.cardDescriptionSecondary}>
                {t('auth.connect.joinDescription', 'Enter your partner\'s invite code')}
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

          {/* Info Text - both solo and couple supported */}
          <View style={styles.infoContainer}>
            <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {t('auth.connect.multiAccountInfo', 'You can add more accounts later, whether solo or shared with a partner.')}
            </Text>
          </View>
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.base,
    gap: SPACING.base,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textTertiary,
    fontWeight: FONTS.weights.semibold,
    paddingHorizontal: SPACING.small,
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
});
