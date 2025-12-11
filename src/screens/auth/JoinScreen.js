/**
 * JoinScreen.js
 *
 * Allows user to enter their partner's 6-digit invite code
 * Features:
 * - Code input with auto-formatting (uppercase, valid chars only)
 * - Real-time validation
 * - Error handling (invalid, expired, already used)
 * - Creates couple document and updates both users
 * - Navigates to success screen on successful pairing
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCodeInput, isValidCodeFormat } from '../../utils/inviteCode';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';
import { initializeCategoriesForCouple } from '../../services/categoryService';

export default function JoinScreen({ navigation }) {
  const { t } = useTranslation();
  const { user, userDetails, updatePartnerInfo } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeInputRef = useRef(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      codeInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleCodeChange = (text) => {
    const formatted = formatCodeInput(text);
    setCode(formatted);
    setError('');
  };

  const validateCode = async (enteredCode) => {
    try {
      const codeDoc = await getDoc(doc(db, 'inviteCodes', enteredCode));

      if (!codeDoc.exists()) {
        return { valid: false, error: t('auth.join.invalidCode') };
      }

      const codeData = codeDoc.data();

      if (codeData.createdBy === user.uid) {
        return { valid: false, error: t('auth.join.ownCodeError') };
      }

      if (codeData.isUsed) {
        return {
          valid: false,
          error: t('auth.join.codeAlreadyUsed'),
        };
      }

      const expiresAt = codeData.expiresAt.toDate();
      if (expiresAt < new Date()) {
        return {
          valid: false,
          error: t('auth.join.codeExpired'),
        };
      }

      return { valid: true, partnerId: codeData.createdBy };
    } catch (err) {
      console.error('Error validating code:', err);
      return { valid: false, error: t('auth.join.validationFailed') };
    }
  };

  const createCouple = async (partnerId) => {
    try {
      console.log('Starting couple creation...');
      console.log('Current user ID:', user.uid);
      console.log('Partner ID:', partnerId);

      console.log('Validating partner document...');
      const partnerDocRef = doc(db, 'users', partnerId);
      const partnerDoc = await getDoc(partnerDocRef);

      if (!partnerDoc.exists()) {
        console.error('⚠️ Partner document not found!');
        throw new Error(t('auth.join.partnerAccountIncomplete'));
      }
      console.log('✓ Partner document validated');

      if (!partnerId || !user.uid) {
        throw new Error(t('auth.join.invalidUserIds'));
      }

      const coupleId = `couple_${user.uid}_${partnerId}_${Date.now()}`;
      console.log('Generated couple ID:', coupleId);

      console.log('Creating atomic batch write...');
      const batch = writeBatch(db);

      const coupleRef = doc(db, 'couples', coupleId);
      batch.set(coupleRef, {
        user1Id: partnerId,
        user2Id: user.uid,
        inviteCode: code,
        createdAt: serverTimestamp(),
        currentBalance: 0,
        totalExpenses: 0,
        lastActivity: serverTimestamp(),
      });
      console.log('✓ Batch: couple document queued');

      const currentUserRef = doc(db, 'users', user.uid);
      batch.update(currentUserRef, {
        partnerId: partnerId,
        coupleId: coupleId,
      });
      console.log('✓ Batch: current user update queued');

      batch.update(partnerDocRef, {
        partnerId: user.uid,
        coupleId: coupleId,
      });
      console.log('✓ Batch: partner user update queued');

      const inviteCodeRef = doc(db, 'inviteCodes', code);
      batch.update(inviteCodeRef, {
        isUsed: true,
        usedBy: user.uid,
        usedAt: serverTimestamp(),
      });
      console.log('✓ Batch: invite code update queued');

      console.log('Committing batch (all or nothing)...');
      await batch.commit();
      console.log('✓ Batch committed successfully!');

      console.log('Initializing default categories for couple:', coupleId);
      await initializeCategoriesForCouple(coupleId);
      console.log('✓ Categories initialized');

      console.log('✓ Couple creation complete!');
      return { success: true, partnerId, coupleId };
    } catch (err) {
      console.error('Error creating couple:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);

      console.log('Full error object:', JSON.stringify(err, null, 2));

      if (err.code === 'permission-denied') {
        throw new Error(t('auth.join.permissionDenied'));
      } else if (err.code === 'not-found') {
        throw new Error(t('auth.join.databaseError'));
      } else if (err.code === 'unavailable') {
        throw new Error(t('auth.join.networkError'));
      } else if (err.message.includes('account is incomplete') || err.message.includes('Invalid user IDs')) {
        throw err;
      } else {
        throw new Error(t('auth.join.createCoupleFailed', { error: err.message }));
      }
    }
  };

  const handleConnect = async () => {
    if (!isValidCodeFormat(code)) {
      setError(t('auth.join.invalidFormat'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const validation = await validateCode(code);

      if (!validation.valid) {
        setError(validation.error);
        setLoading(false);
        return;
      }

      const result = await createCouple(validation.partnerId);

      if (result.success) {
        console.log('JoinScreen: Updating local state with partnerId:', validation.partnerId, 'coupleId:', result.coupleId);
        await updatePartnerInfo(validation.partnerId, result.coupleId);
        console.log('JoinScreen: Local state updated successfully');

        navigation.replace('Success', { partnerId: validation.partnerId });
      }
    } catch (err) {
      console.error('Error connecting:', err);
      setError(err.message || t('auth.join.connectFailed'));
    } finally {
      setLoading(false);
    }
  };

  const formatCodeDisplay = (inputCode) => {
    if (inputCode.length > 3) {
      return `${inputCode.substring(0, 3)} ${inputCode.substring(3, 6)}`;
    }
    return inputCode;
  };

  const isConnectEnabled = code.length === 6 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
            name="download"
            size={50}
            color={COLORS.textWhite}
          />
        </View>

        {/* Title */}
        <Text style={styles.headerTitle}>{t('auth.join.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('auth.join.subtitle')}
        </Text>
      </LinearGradient>

      {/* Form Card */}
      <View style={styles.formCard}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Code Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>{t('auth.join.inputLabel')}</Text>
            <View style={[styles.inputContainer, error && styles.inputError]}>
              <MaterialCommunityIcons
                name="key-variant"
                size={24}
                color={error ? COLORS.error : COLORS.primary}
                style={styles.inputIcon}
              />
              <TextInput
                ref={codeInputRef}
                style={styles.codeInput}
                value={formatCodeDisplay(code)}
                onChangeText={handleCodeChange}
                placeholder={t('auth.join.placeholder')}
                placeholderTextColor={COLORS.textTertiary}
                maxLength={7}
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                keyboardType="default"
                returnKeyType="done"
                onSubmitEditing={handleConnect}
                editable={!loading}
              />
            </View>

            {/* Hint */}
            <View style={styles.hintContainer}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textTertiary} />
              <Text style={styles.hintText}>
                {t('auth.join.hint')}
              </Text>
            </View>
          </View>

          {/* Connect Button - Gradient */}
          <TouchableOpacity
            style={[styles.connectButton, !isConnectEnabled && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={!isConnectEnabled}
          >
            <LinearGradient
              colors={isConnectEnabled ? [COLORS.gradientStart, COLORS.gradientEnd] : [COLORS.textTertiary, COLORS.textTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.connectButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textWhite} />
              ) : (
                <Text style={styles.connectButtonText}>{t('auth.join.connect')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>{t('auth.join.noCodeYet')}</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.helpLink}>{t('auth.join.goBackAndInvite')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.large,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    gap: SPACING.small,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: FONTS.sizes.small,
  },
  inputWrapper: {
    marginBottom: SPACING.large,
  },
  inputLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text,
    marginBottom: SPACING.small,
    fontWeight: FONTS.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
    paddingHorizontal: SPACING.base,
    minHeight: 60,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '08',
  },
  inputIcon: {
    marginRight: SPACING.medium,
  },
  codeInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingVertical: SPACING.medium,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginTop: SPACING.small,
    paddingHorizontal: SPACING.tiny,
  },
  hintText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textTertiary,
    flex: 1,
  },
  connectButton: {
    borderRadius: SIZES.borderRadius.medium,
    overflow: 'hidden',
    marginBottom: SPACING.xlarge,
    ...SHADOWS.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  connectButtonGradient: {
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  connectButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  helpLink: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
});
