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
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../utils/validators';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';

export default function SignInScreen({ navigation }) {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();

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
      setErrors({ general: 'Invalid email or password. Please try again.' });
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
        setErrors({ general: error.message || 'Failed to sign in with Google' });
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            activeOpacity={0.6}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign In (OAuth Ready)</Text>
          <Text style={styles.headerSubtitle}>Welcome back! Google & Apple login enabled.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            activeOpacity={0.6}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* General Error */}
          {errors.general && (
            <View style={styles.generalErrorContainer}>
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <Text style={styles.submitButtonText}>Sign In</Text>
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

          {/* Sign Up Link */}
          <TouchableOpacity
            style={styles.signUpLink}
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.6}
          >
            <Text style={styles.signUpLinkText}>
              Don't have an account?{' '}
              <Text style={styles.signUpLinkBold}>Sign up</Text>
            </Text>
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
    marginBottom: SPACING.small,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
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
  errorText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.error,
    marginTop: SPACING.tiny,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.large,
  },
  forgotPasswordText: {
    fontSize: FONTS.sizes.small,
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
  signUpLink: {
    alignSelf: 'center',
    marginTop: SPACING.large,
    paddingVertical: SPACING.medium,
  },
  signUpLinkText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  signUpLinkBold: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
});
