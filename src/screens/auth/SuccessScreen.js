/**
 * SuccessScreen.js
 *
 * Celebration screen shown when couple successfully pairs
 * Features:
 * - Success animation/checkmark
 * - Display partner name
 * - Celebratory message
 * - Continue to main app button
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';

export default function SuccessScreen({ navigation, route }) {
  const { partnerId } = route.params || {};
  const { user } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [loading, setLoading] = useState(true);

  // Animation values
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchPartnerDetails();
    startAnimation();
  }, []);

  const fetchPartnerDetails = async () => {
    try {
      if (!partnerId) {
        console.error('No partnerId provided');
        setLoading(false);
        return;
      }

      const partnerDoc = await getDoc(doc(db, 'users', partnerId));

      if (partnerDoc.exists()) {
        const partnerData = partnerDoc.data();
        setPartnerName(partnerData.displayName || 'Your Partner');
      }
    } catch (err) {
      console.error('Error fetching partner details:', err);
    } finally {
      setLoading(false);
    }
  };

  const startAnimation = () => {
    // Animate checkmark scale
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Animate text fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleContinue = () => {
    // Since we've updated userDetails.partnerId via updatePartnerInfo(),
    // AppNavigator will automatically show the budget onboarding or main app
    // No need to navigate - AppNavigator handles routing based on state
    // The component will unmount and AppNavigator will show the appropriate screen
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Animated Success Checkmark */}
        <Animated.View
          style={[
            styles.checkmarkContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.checkmarkCircle}>
            <Ionicons name="checkmark" size={80} color={COLORS.background} />
          </View>
        </Animated.View>

        {/* Animated Text Content */}
        <Animated.View style={[styles.textContent, { opacity: fadeAnim }]}>
          {/* Title */}
          <Text style={styles.title}>Connected! 🎉</Text>

          {/* Message */}
          <Text style={styles.message}>
            You're now connected with{' '}
            <Text style={styles.partnerName}>{partnerName}</Text>
          </Text>

          <Text style={styles.subtitle}>
            Ready to track expenses together and keep your finances organized!
          </Text>

          {/* Visual Representation */}
          <View style={styles.avatarsContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>

            <View style={styles.linkIcon}>
              <Ionicons name="link" size={24} color={COLORS.primary} />
            </View>

            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          </View>

          {/* Next Steps */}
          <View style={styles.featuresContainer}>
            <Text style={styles.nextStepsTitle}>Next: Set Up Your Budget</Text>
            <View style={styles.featureItem}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>Track shared expenses</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="pie-chart-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>Monitor your budget together</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sync-outline" size={20} color={COLORS.primary} />
              <Text style={styles.featureText}>Stay on track with goals</Text>
            </View>
          </View>
        </Animated.View>

        {/* Continue Button */}
        <TouchableOpacity style={COMMON_STYLES.primaryButton} onPress={handleContinue}>
          <Text style={COMMON_STYLES.primaryButtonText}>Set Up Budget</Text>
        </TouchableOpacity>
        <Text style={styles.skipText}>You can skip this step later if you prefer</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.screenPadding,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  checkmarkContainer: {
    marginBottom: SPACING.xl,
  },
  checkmarkCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  textContent: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...FONTS.heading,
    fontSize: 32,
    color: COLORS.text,
    marginBottom: SPACING.base,
    textAlign: 'center',
  },
  message: {
    ...FONTS.body,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.small,
  },
  partnerName: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.base,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.base,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  linkIcon: {
    backgroundColor: COLORS.background,
    padding: SPACING.small,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.xl,
    gap: SPACING.small,
  },
  nextStepsTitle: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  skipText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.small,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    paddingVertical: SPACING.small,
  },
  featureText: {
    ...FONTS.body,
    color: COLORS.text,
  },
});
