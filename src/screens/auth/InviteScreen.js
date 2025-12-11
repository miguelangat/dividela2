/**
 * InviteScreen.js
 *
 * Allows user to generate and share a 6-digit invite code for their partner
 * Features:
 * - Generate unique invite code
 * - Copy code to clipboard
 * - Share via SMS/Email
 * - Real-time listener for when partner joins
 * - Auto-navigate to success screen when partner uses code
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { doc, setDoc, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { generateInviteCode, calculateExpirationDate, formatTimeRemaining } from '../../utils/inviteCode';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';

export default function InviteScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, userDetails, updatePartnerInfo } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [error, setError] = useState('');
  const copiedTimeoutRef = useRef(null);

  useEffect(() => {
    generateAndSaveCode();
  }, []);

  // Real-time listener for when partner joins
  useEffect(() => {
    if (!inviteCode) return;

    const unsubscribe = onSnapshot(
      doc(db, 'inviteCodes', inviteCode),
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          if (data.isUsed) {
            try {
              const userDocRef = doc(db, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const userData = userDoc.data();
                await updatePartnerInfo(data.usedBy, userData.coupleId);
              }

              navigation.replace('Success', { partnerId: data.usedBy });
            } catch (err) {
              console.error('Error updating partner info:', err);
              navigation.replace('Success', { partnerId: data.usedBy });
            }
          }
        }
      },
      (err) => {
        console.error('Error listening to invite code:', err);
      }
    );

    return () => unsubscribe();
  }, [inviteCode]);

  const generateAndSaveCode = async () => {
    try {
      setLoading(true);
      setError('');

      if (!user || !user.uid) {
        console.error('No authenticated user found');
        setError(t('invite.authError'));
        setLoading(false);
        return;
      }

      console.log('Validating user document exists...');
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.warn('⚠️ User document not found. Creating it now...');
        const newUserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          partnerId: null,
          coupleId: null,
          createdAt: new Date().toISOString(),
          settings: {
            notifications: true,
            defaultSplit: 50,
            currency: 'USD',
          },
          subscriptionStatus: 'free',
          subscriptionPlatform: null,
          subscriptionExpiresAt: null,
          subscriptionProductId: null,
          revenueCatUserId: user.uid,
          trialUsed: false,
          trialEndsAt: null,
        };

        await setDoc(userDocRef, newUserData);
        console.log('✓ User document created successfully');
      } else {
        console.log('✓ User document validated');
      }

      let code = generateInviteCode();
      const expirationDate = calculateExpirationDate();

      console.log('Attempting to save invite code:', code);

      await setDoc(doc(db, 'inviteCodes', code), {
        code: code,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: expirationDate,
        isUsed: false,
        usedBy: null,
        usedAt: null,
      });

      console.log('Invite code saved successfully:', code);

      setInviteCode(code);
      setExpiresAt(expirationDate);
    } catch (err) {
      console.error('Error generating invite code:', err);

      if (err.code === 'permission-denied') {
        setError(t('invite.permissionError'));
      } else if (err.code === 'unavailable') {
        setError(t('invite.networkError'));
      } else {
        setError(t('errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);

      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }

      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert(t('auth.invite.copied'), t('auth.invite.copySuccess'));
      }
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      Alert.alert(t('common.error'), t('auth.invite.copyError'));
    }
  };

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const handleShare = async () => {
    try {
      const message = t('auth.invite.shareMessage', { code: inviteCode });

      await Share.share({
        message: message,
        title: t('auth.invite.shareTitle'),
      });
    } catch (err) {
      console.error('Error sharing:', err);
      Alert.alert(t('common.error'), t('auth.invite.shareError'));
    }
  };

  const formatCode = (code) => {
    if (code.length === 6) {
      return `${code.substring(0, 3)} ${code.substring(3, 6)}`;
    }
    return code;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('auth.invite.generating')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color={COLORS.error} />
        </View>
        <Text style={styles.errorTitle}>{t('common.error')}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={generateAndSaveCode}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.retryButtonGradient}
          >
            <Text style={styles.retryButtonText}>{t('auth.invite.tryAgain')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons
            name="send"
            size={50}
            color={COLORS.textWhite}
          />
        </View>

        {/* Title */}
        <Text style={styles.headerTitle}>{t('auth.invite.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('auth.invite.subtitle')}
        </Text>
      </LinearGradient>

      {/* Form Card */}
      <View style={styles.formCard}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Invite Code Display */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>{t('auth.invite.codeLabel')}</Text>
            <Text style={styles.codeText}>{formatCode(inviteCode)}</Text>

            {/* Copy Button */}
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={20}
                color={copied ? COLORS.success : COLORS.primary}
              />
              <Text style={[styles.copyButtonText, copied && styles.copiedText]}>
                {copied ? t('auth.invite.copied') : t('auth.invite.copyCode')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Share Button - Gradient */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shareButtonGradient}
            >
              <Ionicons name="share-outline" size={20} color={COLORS.textWhite} />
              <Text style={styles.shareButtonText}>{t('auth.invite.shareVia')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Status */}
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.statusText}>{t('auth.invite.waiting')}</Text>
          </View>

          {/* Expiration Notice */}
          {expiresAt && (
            <View style={styles.expirationNotice}>
              <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.expirationText}>
                {t('auth.invite.expiresIn', { time: formatTimeRemaining(expiresAt) })}
              </Text>
            </View>
          )}

          {/* Generate New Code */}
          <TouchableOpacity style={styles.regenerateButton} onPress={generateAndSaveCode}>
            <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
            <Text style={styles.regenerateText}>{t('auth.invite.generateNew')}</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.base,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  errorIconContainer: {
    marginBottom: SPACING.base,
  },
  errorTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  errorText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xlarge,
    paddingHorizontal: SPACING.large,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: SIZES.borderRadius.medium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  retryButtonGradient: {
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  retryButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxlarge * 2,
    paddingHorizontal: SPACING.screenPadding,
    borderBottomLeftRadius: SIZES.borderRadius.xlarge * 2,
    borderBottomRightRadius: SIZES.borderRadius.xlarge * 2,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: SPACING.screenPadding,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
    alignItems: 'center',
  },
  codeContainer: {
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.xlarge,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.large,
    borderWidth: 2,
    borderColor: COLORS.primary + '40',
  },
  codeLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: FONTS.weights.semibold,
  },
  codeText: {
    fontSize: 42,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    letterSpacing: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: SPACING.base,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    gap: SPACING.small,
    ...SHADOWS.small,
  },
  copyButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  copiedText: {
    color: COLORS.success,
  },
  shareButton: {
    width: '100%',
    borderRadius: SIZES.borderRadius.medium,
    overflow: 'hidden',
    marginBottom: SPACING.xlarge,
    ...SHADOWS.medium,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    minHeight: SIZES.button.height,
    gap: SPACING.small,
  },
  shareButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginBottom: SPACING.base,
  },
  statusText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  expirationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.large,
  },
  expirationText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    paddingVertical: SPACING.small,
  },
  regenerateText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
});
