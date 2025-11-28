/**
 * SubscriptionManagementScreen.js
 *
 * Screen for managing existing subscriptions
 * Shows subscription status, renewal date, and allows cancellation/management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

export default function SubscriptionManagementScreen({ navigation }) {
  const { isPremium, subscriptionInfo, refresh, loading, restore } = useSubscription();
  const { userDetails } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    // Refresh subscription status when screen loads
    handleRefresh();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restore();
      if (result.success) {
        Alert.alert(
          'Success',
          result.isPremium
            ? 'Your premium subscription has been restored!'
            : 'No previous purchases found.'
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to restore purchases.');
      }
    } catch (error) {
      console.error('Error restoring:', error);
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    const platform = userDetails?.subscriptionPlatform || Platform.OS;

    Alert.alert(
      'Manage Subscription',
      `To manage your subscription, please visit your ${
        platform === 'ios' ? 'App Store' : platform === 'android' ? 'Google Play' : 'Stripe'
      } account settings.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (platform === 'ios') {
              Linking.openURL('https://apps.apple.com/account/subscriptions');
            } else if (platform === 'android') {
              Linking.openURL('https://play.google.com/store/account/subscriptions');
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = () => {
    navigation.navigate('Paywall');
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlatformIcon = () => {
    const platform = userDetails?.subscriptionPlatform || Platform.OS;
    if (platform === 'ios') return 'logo-apple';
    if (platform === 'android') return 'logo-google-playstore';
    return 'card';
  };

  const getPlatformName = () => {
    const platform = userDetails?.subscriptionPlatform || Platform.OS;
    if (platform === 'ios') return 'App Store';
    if (platform === 'android') return 'Google Play';
    return 'Stripe';
  };

  if (loading && !userDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, isPremium && styles.statusCardPremium]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusBadge}>
              <Ionicons
                name={isPremium ? 'sparkles' : 'lock-closed'}
                size={24}
                color={isPremium ? '#FFD700' : COLORS.textSecondary}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {isPremium ? 'Premium Active' : 'Free Plan'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isPremium ? 'You have access to all features' : 'Upgrade to unlock premium features'}
              </Text>
            </View>
          </View>

          {isPremium && subscriptionInfo?.expirationDate && (
            <View style={styles.renewalInfo}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.renewalText}>
                Renews on {formatDate(subscriptionInfo.expirationDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Premium Features (if not premium) */}
        {!isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Features</Text>

            <View style={styles.featuresList}>
              <FeatureRow icon="infinite" text="Unlimited budgets" />
              <FeatureRow icon="calendar" text="Annual view & custom periods" />
              <FeatureRow icon="stats-chart" text="Advanced analytics & trends" />
              <FeatureRow icon="download" text="Export to CSV/PDF" />
              <FeatureRow icon="pricetag" text="Custom categories" />
              <FeatureRow icon="repeat" text="Recurring expenses" />
              <FeatureRow icon="heart" text="Relationship insights" />
              <FeatureRow icon="shield-checkmark" text="Priority support" />
            </View>

            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription Details (if premium) */}
        {isPremium && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription Details</Text>

            <View style={styles.detailsCard}>
              <DetailRow
                label="Status"
                value={userDetails?.subscriptionStatus || 'Active'}
                icon="checkmark-circle"
                iconColor="#10B981"
              />
              <DetailRow
                label="Platform"
                value={getPlatformName()}
                icon={getPlatformIcon()}
              />
              {subscriptionInfo?.expirationDate && (
                <DetailRow
                  label="Next Billing Date"
                  value={formatDate(subscriptionInfo.expirationDate)}
                  icon="calendar-outline"
                />
              )}
              {userDetails?.subscriptionProductId && (
                <DetailRow
                  label="Plan"
                  value={userDetails.subscriptionProductId.includes('annual') ? 'Annual' : 'Monthly'}
                  icon="pricetag-outline"
                />
              )}
            </View>

            <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
              <Ionicons name="open-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Shared Subscription Info */}
        {userDetails?.partnerId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Couples Subscription</Text>
            <View style={styles.infoCard}>
              <Ionicons name="heart" size={24} color={COLORS.primary} />
              <Text style={styles.infoText}>
                {isPremium
                  ? 'Your partner also has access to premium features!'
                  : 'When you upgrade, both you and your partner get premium features.'}
              </Text>
            </View>
          </View>
        )}

        {/* Restore Purchases */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={restoring || refreshing}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.restoreHint}>
            If you previously purchased premium, tap here to restore your subscription.
          </Text>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <FAQItem
            question="How does the couple subscription work?"
            answer="When one partner subscribes to premium, both users in the couple get access to all premium features. Only one subscription is needed!"
          />

          <FAQItem
            question="Can I cancel anytime?"
            answer="Yes! You can cancel your subscription at any time through your App Store or Google Play account settings. You'll continue to have access until the end of your billing period."
          />

          <FAQItem
            question="What happens if I cancel?"
            answer="After cancellation, you'll still have premium access until your subscription expires. Then your account will revert to the free plan."
          />

          <FAQItem
            question="How do I get a refund?"
            answer="Refunds are handled by Apple, Google, or Stripe depending on where you purchased. Contact their support team for refund requests."
          />
        </View>
      </ScrollView>
    </View>
  );
}

// Helper Components
function FeatureRow({ icon, text }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function DetailRow({ label, value, icon, iconColor }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabel}>
        <Ionicons name={icon} size={20} color={iconColor || COLORS.textSecondary} />
        <Text style={styles.detailLabelText}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function FAQItem({ question, answer }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </View>
      {expanded && <Text style={styles.faqAnswer}>{answer}</Text>}
    </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.medium,
    paddingTop: SPACING.large,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.small,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.large,
  },
  statusCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginTop: SPACING.large,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  statusCardPremium: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(102, 51, 153, 0.05)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.medium,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  renewalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.medium,
    paddingTop: SPACING.medium,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  renewalText: {
    marginLeft: SPACING.small,
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  section: {
    marginTop: SPACING.xLarge,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  featuresList: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.medium,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  featureText: {
    marginLeft: SPACING.medium,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.large,
    paddingVertical: SPACING.medium,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: '#FFFFFF',
    marginRight: SPACING.small,
  },
  detailsCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.medium,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabelText: {
    marginLeft: SPACING.small,
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  manageButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.large,
  },
  manageButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
    marginRight: SPACING.small,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.medium,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    lineHeight: 22,
  },
  restoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
  },
  restoreButtonText: {
    marginLeft: SPACING.small,
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  restoreHint: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.small,
  },
  faqItem: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.medium,
    marginBottom: SPACING.small,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  faqAnswer: {
    marginTop: SPACING.medium,
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});
