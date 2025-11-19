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
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, validateDisplayName } from '../../utils/validators';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';
import { isValidReferralCode } from '../../services/referralService';

export default function SignUpScreen({ navigation, route }) {
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(route.params?.referralCode || '');
  const [referralCodeValid, setReferralCodeValid] = useState(null); // null | true | false
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
      await signUp(email, password, name, referralCode || null);
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

  const handleReferralCodeChange = (text) => {
    const upperCode = text.toUpperCase();
    setReferralCode(upperCode);

    // Validate format in real-time
    if (upperCode.length === 0) {
      setReferralCodeValid(null);
    } else if (upperCode.length === 6) {
      const isValid = isValidReferralCode(upperCode);
      setReferralCodeValid(isValid);
      if (!isValid) {
        setErrors(prev => ({
          ...prev,
          referralCode: 'Invalid code format (use A-Z, 2-9, no 0/1/O/I)'
        }));
      } else {
        setErrors(prev => {
          const { referralCode, ...rest } = prev;
          return rest;
        });
      }
    } else {
      setReferralCodeValid(null);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('🔵 Google sign-up button clicked');
    console.log('🔵 signInWithGoogle function:', typeof signInWithGoogle);

    try {
      setErrors({});
      setSocialLoading('google');
      console.log('🔵 Calling signInWithGoogle...');
      await signInWithGoogle(referralCode || null);
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
      await signInWithApple(referralCode || null);
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton} activeOpacity={0.6}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Referral Code (Optional) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Referral Code (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                errors.referralCode && styles.inputError,
                referralCodeValid === true && styles.inputValid,
              ]}
              placeholder="Enter code from a friend"
              value={referralCode}
              onChangeText={handleReferralCodeChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            {errors.referralCode && (
              <Text style={styles.errorText}>{errors.referralCode}</Text>
            )}
            {referralCodeValid === true && (
              <Text style={styles.helperText}>
                ✓ Valid code! You and your friend will both get rewards
              </Text>
            )}
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

          {/* General Error */}
          {errors.general && (
            <View style={styles.generalErrorContainer}>
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <Text style={styles.submitButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Social Sign In Buttons */}
          <TouchableOpacity
            style={[styles.socialButton, socialLoading === 'apple' && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleAppleSignIn}
            disabled={socialLoading !== null}
          >
            {socialLoading === 'apple' ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, socialLoading === 'google' && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={socialLoading !== null}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.screenPadding,
  },
  header: {
    marginTop: SPACING.large,
    marginBottom: SPACING.xxlarge,
  },
  backButton: {
    marginBottom: SPACING.large,
  },
  backButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
  headerTitle: {
    ...COMMON_STYLES.heading,
  },
  form: {
    width: '100%',
  },
  formGroup: {
    marginBottom: SPACING.large,
  },
  label: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    fontWeight: FONTS.weights.medium,
  },
  input: {
    ...COMMON_STYLES.input,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputValid: {
    borderColor: COLORS.success,
  },
  errorText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.error,
    marginTop: SPACING.tiny,
  },
  helperText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.success,
    marginTop: SPACING.tiny,
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
    backgroundColor: COLORS.error + '15',
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.large,
  },
  generalErrorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.small,
    textAlign: 'center',
  },
  submitButton: {
    ...COMMON_STYLES.primaryButton,
    marginBottom: SPACING.large,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.large,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.base,
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  socialButton: {
    ...COMMON_STYLES.secondaryButton,
    marginBottom: SPACING.medium,
  },
  socialButtonText: {
    ...COMMON_STYLES.secondaryButtonText,
  },
});
