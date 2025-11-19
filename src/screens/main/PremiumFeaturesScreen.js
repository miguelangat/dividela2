// src/screens/main/PremiumFeaturesScreen.js
// Premium features showcase and subscription options

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { hasActivePremium } from '../../services/referralService';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';

export default function PremiumFeaturesScreen({ navigation }) {
  const { userDetails } = useAuth();
  const isPremium = hasActivePremium(userDetails);
  const referralCount = userDetails?.referralCount || 0;

  const features = [
    {
      icon: 'camera',
      title: 'Receipt OCR',
      description: 'Scan receipts and automatically extract expense details',
      available: true,
    },
    {
      icon: 'analytics',
      title: 'Advanced Analytics',
      description: 'Deep insights into spending patterns and trends over time',
      available: true,
    },
    {
      icon: 'repeat',
      title: 'Recurring Expenses',
      description: 'Set up automatic recurring expenses (rent, subscriptions, etc.)',
      available: true,
    },
    {
      icon: 'trending-up',
      title: 'Category Trends',
      description: 'Visualize spending trends by category with charts',
      available: true,
    },
    {
      icon: 'document-text',
      title: 'Custom Export Templates',
      description: 'Export your data with custom formatting and filters',
      available: true,
    },
    {
      icon: 'color-palette',
      title: 'Custom Themes',
      description: 'Personalize your app with custom color themes (coming soon)',
      available: false,
    },
    {
      icon: 'people',
      title: 'Multiple Groups',
      description: 'Track expenses with multiple groups (friends, trips, etc.)',
      available: false,
    },
    {
      icon: 'headset',
      title: 'Priority Support',
      description: 'Get fast, priority customer support when you need help',
      available: true,
    },
  ];

  const handleReferFriends = () => {
    navigation.navigate('Referral');
  };

  const handleSubscribe = () => {
    // TODO: Implement subscription flow with Stripe/RevenueCat
    Alert.alert(
      'Coming Soon',
      'Subscription payments will be available soon! For now, refer 1 couple to unlock Premium forever.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Features</Text>
        <View style={styles.backButton} />
      </View>

      {/* Premium Status */}
      {isPremium && (
        <View style={styles.premiumBanner}>
          <Ionicons name="star" size={32} color={COLORS.textWhite} />
          <View style={styles.premiumBannerContent}>
            <Text style={styles.premiumBannerTitle}>You're Premium!</Text>
            <Text style={styles.premiumBannerSubtitle}>
              Enjoying all premium features
            </Text>
          </View>
        </View>
      )}

      {/* Pricing Cards */}
      {!isPremium && (
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Choose Your Path to Premium</Text>

          {/* Referral Option */}
          <TouchableOpacity
            style={[styles.pricingCard, styles.pricingCardRecommended]}
            onPress={handleReferFriends}
            activeOpacity={0.8}
          >
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
            </View>
            <View style={styles.pricingCardHeader}>
              <Ionicons name="people" size={32} color={COLORS.primary} />
              <View style={styles.pricingCardHeaderText}>
                <Text style={styles.pricingCardTitle}>Refer 1 Couple</Text>
                <Text style={styles.pricingCardPrice}>FREE Forever</Text>
              </View>
            </View>
            <View style={styles.pricingCardBody}>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>Unlock Premium permanently</Text>
              </View>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>
                  Your friend gets 1 month free
                </Text>
              </View>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>Support our growth</Text>
              </View>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  {referralCount}/1 couples referred
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(referralCount * 100, 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
            <View style={styles.pricingCardButton}>
              <Text style={styles.pricingCardButtonText}>Start Referring</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.textWhite} />
            </View>
          </TouchableOpacity>

          {/* Subscription Option */}
          <TouchableOpacity
            style={styles.pricingCard}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <View style={styles.pricingCardHeader}>
              <Ionicons name="card" size={32} color={COLORS.text} />
              <View style={styles.pricingCardHeaderText}>
                <Text style={styles.pricingCardTitle}>Monthly Subscription</Text>
                <Text style={styles.pricingCardPrice}>$2.99/month</Text>
              </View>
            </View>
            <View style={styles.pricingCardBody}>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>Cancel anytime</Text>
              </View>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>Instant activation</Text>
              </View>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>Support development</Text>
              </View>
              <Text style={styles.comingSoonBadge}>Coming Soon</Text>
            </View>
          </TouchableOpacity>

          {/* Annual Option */}
          <TouchableOpacity
            style={styles.pricingCard}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>SAVE 30%</Text>
            </View>
            <View style={styles.pricingCardHeader}>
              <Ionicons name="trophy" size={32} color={COLORS.text} />
              <View style={styles.pricingCardHeaderText}>
                <Text style={styles.pricingCardTitle}>Annual Subscription</Text>
                <Text style={styles.pricingCardPrice}>$24.99/year</Text>
                <Text style={styles.pricingCardSubprice}>($2.08/month)</Text>
              </View>
            </View>
            <View style={styles.pricingCardBody}>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>Best value</Text>
              </View>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>One simple payment</Text>
              </View>
              <View style={styles.pricingFeature}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.pricingFeatureText}>Save $11 per year</Text>
              </View>
              <Text style={styles.comingSoonBadge}>Coming Soon</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Features List */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>What's Included</Text>
        {features.map((feature, index) => (
          <View
            key={index}
            style={[
              styles.featureItem,
              !feature.available && styles.featureItemDisabled,
            ]}
          >
            <View style={styles.featureIcon}>
              <Ionicons
                name={feature.icon}
                size={24}
                color={feature.available ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
            <View style={styles.featureContent}>
              <View style={styles.featureTitleRow}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                {!feature.available && (
                  <View style={styles.comingSoonTag}>
                    <Text style={styles.comingSoonTagText}>Soon</Text>
                  </View>
                )}
              </View>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* FAQ */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>
            What happens after I refer 1 couple?
          </Text>
          <Text style={styles.faqAnswer}>
            You get Premium access permanently, with no expiration. All premium
            features are unlocked immediately.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>
            How long does my friend have to pair up?
          </Text>
          <Text style={styles.faqAnswer}>
            Your friend has 24 hours after signing up with your referral code to pair
            with their partner for the referral to count.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I cancel my subscription anytime?</Text>
          <Text style={styles.faqAnswer}>
            Yes! If you choose the subscription option, you can cancel anytime and keep
            access until the end of your billing period.
          </Text>
        </View>
      </View>

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
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.large,
  },
  premiumBannerContent: {
    marginLeft: SPACING.medium,
  },
  premiumBannerTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
  },
  premiumBannerSubtitle: {
    fontSize: FONTS.sizes.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.medium,
  },
  pricingSection: {
    marginBottom: SPACING.xlarge,
  },
  pricingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...COMMON_STYLES.shadow,
  },
  pricingCardRecommended: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    left: SPACING.large,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.tiny,
    borderRadius: SIZES.borderRadius.medium,
  },
  recommendedBadgeText: {
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    letterSpacing: 1,
  },
  savingsBadge: {
    position: 'absolute',
    top: -12,
    right: SPACING.large,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.tiny,
    borderRadius: SIZES.borderRadius.medium,
  },
  savingsBadgeText: {
    fontSize: FONTS.sizes.tiny,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    letterSpacing: 1,
  },
  pricingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  pricingCardHeaderText: {
    marginLeft: SPACING.medium,
    flex: 1,
  },
  pricingCardTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  pricingCardPrice: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  pricingCardSubprice: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  pricingCardBody: {
    marginBottom: SPACING.medium,
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  pricingFeatureText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    marginLeft: SPACING.small,
  },
  progressContainer: {
    marginTop: SPACING.medium,
  },
  progressText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: SIZES.borderRadius.small,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  comingSoonBadge: {
    marginTop: SPACING.small,
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  pricingCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
  },
  pricingCardButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite,
    marginRight: SPACING.small,
  },
  featuresSection: {
    marginBottom: SPACING.xlarge,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.medium,
    marginBottom: SPACING.small,
  },
  featureItemDisabled: {
    opacity: 0.6,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: SIZES.borderRadius.medium,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.medium,
  },
  featureContent: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.tiny,
  },
  featureTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginRight: SPACING.small,
  },
  comingSoonTag: {
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING.small,
    paddingVertical: 2,
    borderRadius: SIZES.borderRadius.small,
  },
  comingSoonTagText: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.semibold,
  },
  featureDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  faqSection: {
    marginBottom: SPACING.xlarge,
  },
  faqItem: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.medium,
    marginBottom: SPACING.small,
  },
  faqQuestion: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  faqAnswer: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
