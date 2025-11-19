// src/screens/auth/SignInScreen.js
// Sign in screen - Login with existing account

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSelectorButton from '../../components/LanguageSelectorButton';
import { validateEmail, validatePassword } from '../../utils/validators';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../constants/theme';

export default function SignInScreen({ navigation }) {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'apple' | null
  const [errors, setErrors] = useState({});

  const handleSignIn = async () => {
    // Reset errors
    setErrors({});

    // Validate fields
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    const newErrors = {};
    if (!emailValidation.isValid) newErrors.email = emailValidation.error;
    if (!passwordValidation.isValid) newErrors.password = passwordValidation.error;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Proceed with sign in
    try {
      setLoading(true);
      await signIn(email, password);
      // Navigation handled by AuthContext
      // User will be redirected based on whether they have a partner
    } catch (error) {
      console.error('Sign in error:', error);
      setErrors({ general: t('auth.signIn.invalidCredentials') });
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password flow
    console.log('Forgot password pressed');
  };

  const handleGoogleSignIn = async () => {
    console.log('🔵 Google sign-in button clicked');
    console.log('🔵 signInWithGoogle function:', typeof signInWithGoogle);

    try {
      setErrors({});
      setSocialLoading('google');
      console.log('🔵 Calling signInWithGoogle...');
      await signInWithGoogle();
      console.log('🔵 Google sign-in successful');
      // Navigation handled by AuthContext
    } catch (error) {
      console.error('🔴 Google sign-in error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrors({ general: error.message || t('auth.signIn.signInError') });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setErrors({});
      setSocialLoading('apple');
      await signInWithApple();
      // Navigation handled by AuthContext
    } catch (error) {
      console.error('Apple sign-in error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrors({ general: error.message || t('auth.signIn.signInError') });
      }
    } finally {
      setSocialLoading(null);
    }
  };

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
          {/* Language Selector */}
          <View style={styles.languageSelectorContainer}>
            <LanguageSelectorButton variant="icon" />
          </View>

          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textWhite} />
            <Text style={styles.backButtonText}>{t('navigation.back')}</Text>
          </TouchableOpacity>

          {/* Header Content */}
          <View style={styles.headerContent}>
            <MaterialCommunityIcons
              name="finance"
              size={60}
              color={COLORS.textWhite}
              style={styles.headerIcon}
            />
            <Text style={styles.headerTitle}>{t('auth.signIn.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('auth.signIn.subtitle')}</Text>
          </View>
        </LinearGradient>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* General Error */}
          {errors.general && (
            <View style={styles.generalErrorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('auth.signIn.email')}</Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={errors.email ? COLORS.error : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={t('auth.signIn.emailPlaceholder')}
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('auth.signIn.password')}</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={errors.password ? COLORS.error : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={t('auth.signIn.passwordPlaceholder')}
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotPasswordText}>{t('auth.signIn.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSignIn}
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
                <Text style={styles.submitButtonText}>{t('auth.signIn.signInButton')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{t('auth.signIn.orDivider')}</Text>
            <View style={styles.divider} />
          </View>

          {/* Social Sign In Buttons */}
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton, socialLoading === 'google' && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={socialLoading !== null}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color="#DB4437" />
            ) : (
              <>
                <View style={styles.socialIconContainer}>
                  <AntDesign name="google" size={20} color="#DB4437" />
                </View>
                <Text style={styles.socialButtonText}>{t('auth.signIn.continueWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton, socialLoading === 'apple' && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleAppleSignIn}
            disabled={socialLoading !== null}
          >
            {socialLoading === 'apple' ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <View style={styles.socialIconContainer}>
                  <Ionicons name="logo-apple" size={20} color="#000000" />
                </View>
                <Text style={styles.socialButtonText}>{t('auth.signIn.continueWithApple')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <TouchableOpacity
            style={styles.signUpLink}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.7}
          >
            <Text style={styles.signUpLinkText}>
              {t('auth.signIn.dontHaveAccount')}{' '}
              <Text style={styles.signUpLinkBold}>{t('auth.signIn.signUp')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
        </View>

        {/* Made in Colombia Footer - Fixed at bottom */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made in Colombia 🇨🇴 with ♥
          </Text>
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
    justifyContent: 'space-between',
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: SPACING.xlarge,
    paddingHorizontal: SPACING.screenPadding,
    borderBottomLeftRadius: SIZES.borderRadius.xlarge * 2,
    borderBottomRightRadius: SIZES.borderRadius.xlarge * 2,
  },
  languageSelectorContainer: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.medium,
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
  headerIcon: {
    marginBottom: SPACING.small,
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
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
    marginHorizontal: SPACING.screenPadding,
    marginTop: -SPACING.large,
    marginBottom: SPACING.base,
    padding: SPACING.base,
    paddingTop: SPACING.large,
    ...SHADOWS.large,
    maxHeight: '70%',
  },
  formGroup: {
    marginBottom: SPACING.base,
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
  errorText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.error,
    marginTop: SPACING.tiny,
    marginLeft: SPACING.tiny,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.medium,
  },
  forgotPasswordText: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    padding: SPACING.small,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.medium,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  generalErrorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: FONTS.sizes.tiny,
    marginLeft: SPACING.small,
  },
  submitButton: {
    marginBottom: SPACING.medium,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.medium,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    marginHorizontal: SPACING.base,
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    minHeight: 44,
    marginBottom: SPACING.small,
    ...SHADOWS.small,
  },
  googleButton: {
    borderColor: '#DB4437' + '30',
    backgroundColor: '#DB4437' + '08',
  },
  appleButton: {
    borderColor: '#000000' + '30',
    backgroundColor: '#000000' + '05',
  },
  socialIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.medium,
  },
  socialButtonText: {
    color: COLORS.text,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
  },
  signUpLink: {
    alignSelf: 'center',
    marginTop: SPACING.small,
    paddingVertical: SPACING.small,
  },
  signUpLinkText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  signUpLinkBold: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.base,
    paddingBottom: Platform.OS === 'ios' ? SPACING.large : SPACING.base,
    backgroundColor: COLORS.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '30', // 30% opacity
  },
  footerText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textTertiary,
    fontWeight: FONTS.weights.medium,
    letterSpacing: 0.3,
    opacity: 0.8,
  },
});
