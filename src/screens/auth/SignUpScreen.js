// src/screens/auth/SignUpScreen.js
// Sign up screen - Create new account with email and password

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
import { validateEmail, validatePassword, validateDisplayName } from '../../utils/validators';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES, SHADOWS } from '../../constants/theme';

export default function SignUpScreen({ navigation }) {
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'apple' | null
  const [errors, setErrors] = useState({});

  const handleSignUp = async () => {
    // Reset errors
    setErrors({});

    // Validate all fields
    const nameValidation = validateDisplayName(name);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    const newErrors = {};
    if (!nameValidation.isValid) newErrors.name = nameValidation.error;
    if (!emailValidation.isValid) newErrors.email = emailValidation.error;
    if (!passwordValidation.isValid) newErrors.password = passwordValidation.error;
    if (!termsAccepted) newErrors.terms = 'You must accept the terms and privacy policy';

    // If there are errors, show them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Proceed with sign up
    try {
      setLoading(true);
      await signUp(email, password, name);
      // Navigation will happen automatically via AuthContext
      // User will be redirected to ConnectScreen (to pair with partner)
      navigation.replace('Connect');
    } catch (error) {
      console.error('Sign up error:', error);
      setErrors({ general: error.message || 'Failed to create account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleGoogleSignIn = async () => {
    console.log('🔵 Google sign-up button clicked');
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
        setErrors({ general: error.message || 'Failed to sign in with Google' });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    console.log('🍎 Apple sign-up button clicked');

    try {
      setErrors({});
      setSocialLoading('apple');
      await signInWithApple();
      // Navigation handled by AuthContext
    } catch (error) {
      console.error('Apple sign-in error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrors({ general: error.message || 'Failed to sign in with Apple' });
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'web' && { minHeight: '100%' }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...(Platform.OS === 'web' && {
          nestedScrollEnabled: true,
        })}
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
            onPress={handleBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textWhite} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          {/* Header Content */}
          <View style={styles.headerContent}>
            <MaterialCommunityIcons
              name="account-plus"
              size={60}
              color={COLORS.textWhite}
              style={styles.headerIcon}
            />
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSubtitle}>Join Dividela today</Text>
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

          {/* Name Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name</Text>
            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={errors.name ? COLORS.error : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={COLORS.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={errors.email ? COLORS.error : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
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
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={errors.password ? COLORS.error : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
              />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Terms and Privacy */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.6}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSignUp}
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
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
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
                <Text style={styles.socialButtonText}>Continue with Google</Text>
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
                <Text style={styles.socialButtonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Made in Colombia Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Made in Colombia 🇨🇴 with ♥
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  scrollContent: {
    paddingBottom: SPACING.xxlarge,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: SPACING.xxlarge * 2,
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
    paddingVertical: SPACING.large,
  },
  headerIcon: {
    marginBottom: SPACING.base,
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
  },
  formCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
    marginHorizontal: SPACING.screenPadding,
    marginTop: -SPACING.xxlarge,
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
  errorText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.error,
    marginTop: SPACING.tiny,
    marginLeft: SPACING.tiny,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.large,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.small,
    marginRight: SPACING.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: FONTS.weights.bold,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: FONTS.sizes.small,
    color: COLORS.text,
    lineHeight: 20,
  },
  link: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.large,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  generalErrorText: {
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xlarge,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    marginHorizontal: SPACING.base,
    fontSize: FONTS.sizes.small,
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
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    minHeight: SIZES.button.height,
    marginBottom: SPACING.medium,
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
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xxlarge,
    paddingVertical: SPACING.large,
    paddingBottom: SPACING.xxlarge,
  },
  footerText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textTertiary,
    fontWeight: FONTS.weights.medium,
    letterSpacing: 0.3,
    opacity: 0.8,
  },
});
