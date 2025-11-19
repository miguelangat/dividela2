// src/screens/main/ReferralScreen.js
// Referral program dashboard - Share referral link and track progress

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../contexts/AuthContext';
import { getReferralStats, hasActivePremium } from '../../services/referralService';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';

export default function ReferralScreen({ navigation }) {
  const { userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadReferralStats();
  }, [userDetails]);

  const loadReferralStats = async () => {
    try {
      setLoading(true);
      if (!userDetails?.uid) return;

      const referralStats = await getReferralStats(userDetails.uid);
      setStats(referralStats);
    } catch (error) {
      console.error('Error loading referral stats:', error);
      Alert.alert('Error', 'Failed to load referral statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!stats?.referralLink) return;

    try {
      await Clipboard.setStringAsync(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (!stats?.referralLink) return;

    try {
      await Share.share({
        message: `Join me on Dividela! Track shared expenses with your partner effortlessly. Sign up with my referral link and get 1 month of Premium free: ${stats.referralLink}`,
        url: stats.referralLink,
        title: 'Join Dividela',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewPremiumFeatures = () => {
    navigation.navigate('PremiumFeatures');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isPremium = hasActivePremium(userDetails);
  const referralCount = stats?.referralCount || 0;
  const pendingCount = stats?.pendingReferrals?.length || 0;
  const progress = Math.min(referralCount, 1);
  const progressPercentage = progress * 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referral Program</Text>
        <View style={styles.backButton} />
      </View>

      {/* Premium Status Card */}
      {isPremium ? (
        <View style={[styles.card, styles.premiumCard]}>
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={20} color={COLORS.textWhite} />
            <Text style={styles.premiumBadgeText}>Premium Active</Text>
          </View>
          <Text style={styles.premiumCardTitle}>You're a Premium Member! 🎉</Text>
          <Text style={styles.premiumCardSubtitle}>
            {userDetails.premiumSource === 'referral'
              ? 'Unlocked by referring friends'
              : userDetails.premiumSource === 'referral_bonus'
              ? 'Thanks for joining via referral!'
              : 'Thank you for your support'}
          </Text>
          {userDetails.premiumExpiresAt && (
            <Text style={styles.premiumExpiry}>
              Expires:{' '}
              {new Date(userDetails.premiumExpiresAt.toDate()).toLocaleDateString()}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Unlock Premium Features</Text>
          <Text style={styles.cardSubtitle}>
            Refer just 1 couple and get Premium forever!
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Your Progress</Text>
              <Text style={styles.progressCount}>{referralCount}/1</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressDescription}>
              {referralCount === 0
                ? 'Refer your first couple to unlock Premium!'
                : 'Premium unlocked! 🎉'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewFeaturesButton}
            onPress={handleViewPremiumFeatures}
          >
            <Text style={styles.viewFeaturesButtonText}>View Premium Features</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Share Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Share Your Referral Link</Text>
        <Text style={styles.cardSubtitle}>
          When they sign up and pair with their partner, you both win!
        </Text>

        {/* Referral Link */}
        <View style={styles.linkContainer}>
          <View style={styles.linkBox}>
            <Text style={styles.linkText} numberOfLines={1}>
              {stats?.referralLink}
            </Text>
          </View>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={24}
              color={copied ? COLORS.success : COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Share Buttons */}
        <View style={styles.shareButtons}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={20} color={COLORS.textWhite} />
            <Text style={styles.shareButtonText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Referral Code Display */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Referral Code</Text>
        <View style={styles.codeDisplay}>
          <Text style={styles.codeText}>{stats?.referralCode}</Text>
        </View>
        <Text style={styles.codeDescription}>
          Friends can also enter this code during signup
        </Text>
      </View>

      {/* Rewards Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <View style={styles.rewardItem}>
          <View style={styles.rewardIcon}>
            <Ionicons name="person-add" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.rewardContent}>
            <Text style={styles.rewardTitle}>1. Share your link</Text>
            <Text style={styles.rewardDescription}>
              Send your referral link to friends
            </Text>
          </View>
        </View>

        <View style={styles.rewardItem}>
          <View style={styles.rewardIcon}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.rewardContent}>
            <Text style={styles.rewardTitle}>2. They pair up</Text>
            <Text style={styles.rewardDescription}>
              Your friends sign up and connect with their partner
            </Text>
          </View>
        </View>

        <View style={styles.rewardItem}>
          <View style={styles.rewardIcon}>
            <Ionicons name="star" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.rewardContent}>
            <Text style={styles.rewardTitle}>3. Everyone wins!</Text>
            <Text style={styles.rewardDescription}>
              You get Premium forever, they get 1 month free
            </Text>
          </View>
        </View>
      </View>

      {/* Activity */}
      {(pendingCount > 0 || stats?.completedReferrals?.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Referral Activity</Text>

          {pendingCount > 0 && (
            <View style={styles.activitySection}>
              <Text style={styles.activityLabel}>Pending ({pendingCount})</Text>
              <Text style={styles.activityDescription}>
                {pendingCount} {pendingCount === 1 ? 'person has' : 'people have'} signed up
                with your link. They have 24 hours to pair with their partner.
              </Text>
            </View>
          )}

          {stats?.completedReferrals?.length > 0 && (
            <View style={styles.activitySection}>
              <Text style={styles.activityLabel}>
                Completed ({stats.completedReferrals.length})
              </Text>
              {stats.completedReferrals.slice(0, 3).map((referral, index) => (
                <View key={referral.id} style={styles.activityItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.activityItemText}>
                    Referral completed on{' '}
                    {referral.completedAt?.toDate
                      ? new Date(referral.completedAt.toDate()).toLocaleDateString()
                      : 'Unknown date'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Bottom Spacing */}
      <View style={{ height: SPACING.xxlarge }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.screenPadding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.large,
    marginTop: SPACING.medium,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.medium,
    ...COMMON_STYLES.shadow,
  },
  premiumCard: {
    backgroundColor: COLORS.primary,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.medium,
  },
  premiumBadgeText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    marginLeft: SPACING.small,
  },
  premiumCardTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.small,
  },
  premiumCardSubtitle: {
    fontSize: FONTS.sizes.body,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: SPACING.small,
  },
  premiumExpiry: {
    fontSize: FONTS.sizes.small,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.small,
  },
  cardTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  cardSubtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.large,
  },
  progressSection: {
    marginBottom: SPACING.large,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  progressLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  progressCount: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.borderRadius.small,
    overflow: 'hidden',
    marginBottom: SPACING.small,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.small,
  },
  progressDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  viewFeaturesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.medium,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.medium,
  },
  viewFeaturesButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
    marginRight: SPACING.tiny,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  linkBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.medium,
    marginRight: SPACING.small,
  },
  linkText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  copyButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
  },
  shareButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite,
    marginLeft: SPACING.small,
  },
  codeDisplay: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.large,
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  codeText: {
    fontSize: 32,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    letterSpacing: 4,
  },
  codeDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.medium,
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: SIZES.borderRadius.medium,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.medium,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.tiny,
  },
  rewardDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  activitySection: {
    marginBottom: SPACING.medium,
  },
  activityLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  activityDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
  },
  activityItemText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text,
    marginLeft: SPACING.small,
  },
});
