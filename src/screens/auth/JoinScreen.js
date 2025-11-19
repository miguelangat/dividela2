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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCodeInput, isValidCodeFormat } from '../../utils/inviteCode';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';
import { initializeCategoriesForCouple } from '../../services/categoryService';
import { checkAndCompleteReferral } from '../../services/referralService';

export default function JoinScreen({ navigation }) {
  const { user, userDetails, updatePartnerInfo } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeInputRef = useRef(null);

  useEffect(() => {
    // Auto-focus on code input when screen loads
    const timeoutId = setTimeout(() => {
      codeInputRef.current?.focus();
    }, 100);

    // Cleanup: clear timeout if component unmounts
    return () => clearTimeout(timeoutId);
  }, []);

  const handleCodeChange = (text) => {
    const formatted = formatCodeInput(text);
    setCode(formatted);
    setError(''); // Clear error when user types
  };

  const validateCode = async (enteredCode) => {
    try {
      // Check if code exists
      const codeDoc = await getDoc(doc(db, 'inviteCodes', enteredCode));

      if (!codeDoc.exists()) {
        return { valid: false, error: 'Invalid code. Please check and try again.' };
      }

      const codeData = codeDoc.data();

      // Check if user is trying to use their own code
      if (codeData.createdBy === user.uid) {
        return { valid: false, error: 'You cannot use your own invite code.' };
      }

      // Check if already used
      if (codeData.isUsed) {
        return {
          valid: false,
          error: 'This code has already been used. Ask your partner for a new code.',
        };
      }

      // Check if expired
      const expiresAt = codeData.expiresAt.toDate();
      if (expiresAt < new Date()) {
        return {
          valid: false,
          error: 'This code has expired. Ask your partner for a new code.',
        };
      }

      return { valid: true, partnerId: codeData.createdBy };
    } catch (err) {
      console.error('Error validating code:', err);
      return { valid: false, error: 'Failed to validate code. Please try again.' };
    }
  };

  const createCouple = async (partnerId) => {
    try {
      console.log('Starting couple creation...');
      console.log('Current user ID:', user.uid);
      console.log('Partner ID:', partnerId);

      // Validate that partner document exists BEFORE starting transaction
      console.log('Validating partner document...');
      const partnerDocRef = doc(db, 'users', partnerId);
      const partnerDoc = await getDoc(partnerDocRef);

      if (!partnerDoc.exists()) {
        console.error('⚠️ Partner document not found!');
        throw new Error(
          'Your partner\'s account is incomplete. Ask them to:\n' +
          '1. Sign out\n' +
          '2. Sign in again\n' +
          '3. Generate a new invite code\n' +
          'Then try joining again.'
        );
      }
      console.log('✓ Partner document validated');

      // Generate couple ID
      const coupleId = `couple_${user.uid}_${partnerId}_${Date.now()}`;
      console.log('Generated couple ID:', coupleId);

      // Use batched write for atomicity - all operations succeed or all fail
      console.log('Creating atomic batch write...');
      const batch = writeBatch(db);

      // Operation 1: Create couple document
      const coupleRef = doc(db, 'couples', coupleId);
      batch.set(coupleRef, {
        user1Id: partnerId, // Creator of invite code
        user2Id: user.uid, // User who joined with code
        inviteCode: code,
        createdAt: serverTimestamp(),
        currentBalance: 0,
        totalExpenses: 0,
        lastActivity: serverTimestamp(),
      });
      console.log('✓ Batch: couple document queued');

      // Operation 2: Update current user's partner reference
      const currentUserRef = doc(db, 'users', user.uid);
      batch.update(currentUserRef, {
        partnerId: partnerId,
        coupleId: coupleId,
      });
      console.log('✓ Batch: current user update queued');

      // Operation 3: Update partner's document with pairing info
      batch.update(partnerDocRef, {
        partnerId: user.uid,
        coupleId: coupleId,
      });
      console.log('✓ Batch: partner user update queued');

      // Operation 4: Mark invite code as used
      const inviteCodeRef = doc(db, 'inviteCodes', code);
      batch.update(inviteCodeRef, {
        isUsed: true,
        usedBy: user.uid,
        usedAt: serverTimestamp(),
      });
      console.log('✓ Batch: invite code update queued');

      // Commit all operations atomically
      console.log('Committing batch (all or nothing)...');
      await batch.commit();
      console.log('✓ Batch committed successfully!');

      // Initialize default categories for the couple
      console.log('Initializing default categories for couple:', coupleId);
      await initializeCategoriesForCouple(coupleId);
      console.log('✓ Categories initialized');

      // Check and complete any pending referrals
      console.log('Checking for pending referrals...');
      const referralResult = await checkAndCompleteReferral(coupleId, partnerId, user.uid);
      if (referralResult.success && referralResult.count > 0) {
        console.log(`✓ Completed ${referralResult.count} referral(s)`);
      }

      console.log('✓ Couple creation complete!');
      return { success: true, partnerId, coupleId };
    } catch (err) {
      console.error('Error creating couple:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);

      // Provide specific error messages
      if (err.code === 'permission-denied') {
        throw new Error('Permission denied. Please check Firestore security rules.');
      } else if (err.code === 'not-found') {
        throw new Error('Database connection issue. Please check your internet and try again.');
      } else if (err.code === 'unavailable') {
        throw new Error('Network error. Please check your internet connection.');
      } else if (err.message.includes('account is incomplete')) {
        // Re-throw our custom validation error
        throw err;
      } else {
        throw new Error(`Failed to create couple: ${err.message}`);
      }
    }
  };

  const handleConnect = async () => {
    // Validate format first
    if (!isValidCodeFormat(code)) {
      setError('Please enter a valid 6-character code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate code
      const validation = await validateCode(code);

      if (!validation.valid) {
        setError(validation.error);
        setLoading(false);
        return;
      }

      // Create couple and update users
      const result = await createCouple(validation.partnerId);

      if (result.success) {
        // Update local auth state with partner info
        console.log('JoinScreen: Updating local state with partnerId:', validation.partnerId, 'coupleId:', result.coupleId);
        await updatePartnerInfo(validation.partnerId, result.coupleId);
        console.log('JoinScreen: Local state updated successfully');

        // Success! Navigate to success screen
        navigation.replace('Success', { partnerId: validation.partnerId });
      }
    } catch (err) {
      console.error('Error connecting:', err);
      setError(err.message || 'Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCodeDisplay = (inputCode) => {
    // Display code in groups of 3 for readability: ABC 123
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
      {/* Header */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>📥</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Enter Invite Code</Text>
        <Text style={styles.subtitle}>
          Ask your partner for their 6-character invite code
        </Text>

        {/* Code Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Invite Code</Text>
          <TextInput
            ref={codeInputRef}
            style={styles.codeInput}
            value={formatCodeDisplay(code)}
            onChangeText={handleCodeChange}
            placeholder="ABC 123"
            placeholderTextColor={COLORS.textSecondary}
            maxLength={7} // 6 chars + 1 space
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            keyboardType="default"
            returnKeyType="done"
            onSubmitEditing={handleConnect}
            editable={!loading}
          />

          {/* Hint */}
          <View style={styles.hintContainer}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.hintText}>
              Enter the code exactly as your partner shared it
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Connect Button */}
        <TouchableOpacity
          style={[
            COMMON_STYLES.primaryButton,
            !isConnectEnabled && styles.buttonDisabled,
          ]}
          onPress={handleConnect}
          disabled={!isConnectEnabled}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={COMMON_STYLES.primaryButtonText}>Connect</Text>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>Don't have a code yet?</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.helpLink}>Go back and invite your partner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.screenPadding,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.screenPadding,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.large,
  },
  iconEmoji: {
    fontSize: 80,
  },
  title: {
    ...FONTS.heading,
    fontSize: 28,
    color: COLORS.text,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.base,
  },
  inputContainer: {
    width: '100%',
    marginBottom: SPACING.base,
  },
  inputLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeInput: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.base,
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: SPACING.small,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    paddingHorizontal: SPACING.small,
  },
  hintText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorLight,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    marginBottom: SPACING.base,
    gap: SPACING.small,
    width: '100%',
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helpContainer: {
    marginTop: SPACING.large,
    alignItems: 'center',
  },
  helpText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  helpLink: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
