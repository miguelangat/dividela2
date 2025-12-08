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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { doc, setDoc, onSnapshot, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { generateInviteCode, calculateExpirationDate, formatTimeRemaining } from '../../utils/inviteCode';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';

export default function InviteScreen({ navigation }) {
  const { user, userDetails, updatePartnerInfo } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const [error, setError] = useState('');
  const copiedTimeoutRef = useRef(null); // Track timeout for cleanup

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
            // Partner has joined! Fetch updated user document to get coupleId
            try {
              const userDocRef = doc(db, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const userData = userDoc.data();

                // Update local auth state with partner info
                await updatePartnerInfo(data.usedBy, userData.coupleId);
              }

              // Navigate to success screen
              navigation.replace('Success', { partnerId: data.usedBy });
            } catch (err) {
              console.error('Error updating partner info:', err);
              // Still navigate even if update fails - user can refresh
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

      // Check if user is authenticated
      if (!user || !user.uid) {
        console.error('No authenticated user found');
        setError('You must be signed in to generate an invite code.');
        setLoading(false);
        return;
      }

      // Validate that user document exists (self-healing)
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

      // Generate unique code
      let code = generateInviteCode();

      // In rare case of collision, regenerate
      // (Could check Firestore, but with 2B+ combinations, collision is extremely unlikely)

      const expirationDate = calculateExpirationDate();

      console.log('Attempting to save invite code:', code);
      console.log('User ID:', user.uid);

      // Save to Firestore
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
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);

      // Provide more specific error messages
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please check your Firestore security rules.');
      } else if (err.code === 'unavailable') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(`Failed to generate invite code: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);

      // Clear any existing timeout
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }

      // Reset "Copied!" message after 2 seconds
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);

      // Show native feedback
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.alert('Copied!', 'Invite code copied to clipboard');
      }
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      Alert.alert('Error', 'Failed to copy code');
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const handleShare = async () => {
    try {
      const message = `Join me on Dividela! Use this code to connect: ${inviteCode}\n\nDividela helps couples track shared expenses effortlessly.`;

      await Share.share({
        message: message,
        title: 'Join me on Dividela',
      });
    } catch (err) {
      console.error('Error sharing:', err);
      Alert.alert('Error', 'Failed to share invite code');
    }
  };

  const formatCode = (code) => {
    // Display code in groups of 3 for readability: ABC 123
    if (code.length === 6) {
      return `${code.substring(0, 3)} ${code.substring(3, 6)}`;
    }
    return code;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Generating invite code...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={COMMON_STYLES.primaryButton} onPress={generateAndSaveCode}>
          <Text style={COMMON_STYLES.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconEmoji}>📤</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Share Your Code</Text>
        <Text style={styles.subtitle}>
          Send this code to your partner so they can join you on Dividela
        </Text>

        {/* Invite Code Display */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Your Invite Code</Text>
          <Text style={styles.codeText}>{formatCode(inviteCode)}</Text>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={20}
              color={copied ? COLORS.success : COLORS.primary}
            />
            <Text style={[styles.copyButtonText, copied && styles.copiedText]}>
              {copied ? 'Copied!' : 'Copy Code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Share Options */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={COLORS.primary} />
          <Text style={styles.shareButtonText}>Share via SMS, Email, or More</Text>
        </TouchableOpacity>

        {/* Status */}
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>Waiting for your partner to join...</Text>
        </View>

        {/* Expiration Notice */}
        {expiresAt && (
          <View style={styles.expirationNotice}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.expirationText}>
              Code expires in {formatTimeRemaining(expiresAt)}
            </Text>
          </View>
        )}

        {/* Generate New Code */}
        <TouchableOpacity style={styles.regenerateButton} onPress={generateAndSaveCode}>
          <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
          <Text style={styles.regenerateText}>Generate New Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.screenPadding,
    justifyContent: 'center',
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
  codeContainer: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: SPACING.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  codeLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 42,
    fontWeight: 'bold',
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
    borderRadius: 8,
    gap: SPACING.small,
  },
  copyButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  copiedText: {
    color: COLORS.success,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.large,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    width: '100%',
    justifyContent: 'center',
    gap: SPACING.small,
    marginBottom: SPACING.xl,
  },
  shareButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginBottom: SPACING.base,
  },
  statusText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  expirationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    marginBottom: SPACING.large,
  },
  expirationText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    paddingVertical: SPACING.small,
  },
  regenerateText: {
    ...FONTS.body,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.base,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
    textAlign: 'center',
    marginVertical: SPACING.base,
    paddingHorizontal: SPACING.large,
  },
});
