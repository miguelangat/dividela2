// src/screens/auth/ForgotPasswordScreen.js
// Forgot password screen - Send password reset email

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../../config/firebase';
import { validateEmail } from '../../utils/validators';
import AppLogo from '../../components/AppLogo';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    // Reset state
    setError('');

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error);
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError(t('auth.forgotPassword.errorNotFound', 'No account found with this email'));
      } else if (err.code === 'auth/invalid-email') {
        setError(t('auth.forgotPassword.errorInvalidEmail', 'Please enter a valid email address'));
      } else if (err.code === 'auth/too-many-requests') {
        setError(t('auth.forgotPassword.errorTooMany', 'Too many attempts. Please try again later'));
      } else {
        setError(t('auth.forgotPassword.errorGeneric', 'Failed to send reset email. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Success state
  if (success) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.successContainer}>
            {/* Success icon */}
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.textWhite} />
            </View>

            <Text style={styles.successTitle}>
              {t('auth.forgotPassword.successTitle', 'Email Sent!')}
            </Text>
            <Text style={styles.successMessage}>
              {t('auth.forgotPassword.successMessage', 'Check your inbox for the password reset link')}
            </Text>
            <Text style={styles.successEmail}>{email}</Text>

            <TouchableOpacity
              style={styles.backToSignInButton}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.8}
            >
              <Text style={styles.backToSignInText}>
                {t('auth.forgotPassword.backToSignIn', 'Back to Sign In')}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.contentWrapper}>
          {/* Gradient Header */}
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientHeader}
          >
            {/* Back Button */}
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textWhite} />
              <Text style={styles.backButtonText}>{t('navigation.back', 'Back')}</Text>
            </TouchableOpacity>

            {/* Header Content */}
            <View style={styles.headerContent}>
              <AppLogo size="medium" variant="light" style={styles.headerLogo} />
              <Text style={styles.headerTitle}>
                {t('auth.forgotPassword.title', 'Reset Password')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('auth.forgotPassword.subtitle', 'Enter your email to receive a reset link')}
              </Text>
            </View>
          </LinearGradient>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('auth.forgotPassword.email', 'Email')}
              </Text>
              <View style={[styles.inputContainer, error && styles.inputError]}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={error ? COLORS.error : COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.forgotPassword.emailPlaceholder', 'your@email.com')}
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  autoFocus
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textWhite} />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {t('auth.forgotPassword.sendButton', 'Send Reset Link')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Back to Sign In */}
            <TouchableOpacity
              style={styles.backToSignInLink}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
              <Text style={styles.backToSignInLinkText}>
                {t('auth.forgotPassword.backToSignIn', 'Back to Sign In')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: SPACING.xxlarge,
    paddingHorizontal: SPACING.screenPadding,
    borderBottomLeftRadius: SIZES.borderRadius.xlarge * 2,
    borderBottomRightRadius: SIZES.borderRadius.xlarge * 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xlarge,
  },
  backButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.medium,
    marginLeft: SPACING.small,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: SPACING.medium,
  },
  headerLogo: {
    marginBottom: SPACING.medium,
  },
  headerTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.tiny,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textWhite,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 280,
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
    marginHorizontal: SPACING.screenPadding,
    marginTop: -SPACING.large,
    marginBottom: SPACING.base,
    padding: SPACING.xlarge,
    ...SHADOWS.large,
  },
  formGroup: {
    marginBottom: SPACING.large,
  },
  label: {
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
    minHeight: SIZES.input.height,
  },
  inputIcon: {
    marginRight: SPACING.medium,
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    paddingVertical: SPACING.medium,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '08',
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
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: FONTS.sizes.small,
    marginLeft: SPACING.small,
  },
  submitButton: {
    marginBottom: SPACING.large,
    borderRadius: SIZES.borderRadius.medium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  submitButtonGradient: {
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  backToSignInLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.medium,
  },
  backToSignInLinkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
    marginLeft: SPACING.tiny,
  },
  // Success state styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.screenPadding,
  },
  successIconContainer: {
    marginBottom: SPACING.large,
  },
  successTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: SPACING.small,
  },
  successEmail: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.semibold,
    marginBottom: SPACING.xlarge,
  },
  backToSignInButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.xlarge,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backToSignInText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold,
  },
});
