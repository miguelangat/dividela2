/**
 * PaywallScreen.js
 *
 * Premium upgrade screen shown when users try to access premium features
 * Displays pricing, features, and handles subscription purchases
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { COLORS, FONTS, SPACING, SIZES } from '../../constants/theme';

export default function PaywallScreen({ navigation, route }) {
  const { feature } = route?.params || {};
  const { offerings, purchase, restore, loading, isPremium } = useSubscription();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Redirect if already premium
  useEffect(() => {
    if (isPremium) {
      navigation.goBack();
    }
  }, [isPremium, navigation]);

  // Select annual package by default (better value)
  useEffect(() => {
    if (offerings?.availablePackages && offerings.availablePackages.length > 0) {
      // Try to find annual package
      const annualPkg = offerings.availablePackages.find(
        pkg => pkg.identifier.includes('annual') || pkg.identifier.includes('yearly')
      );
      setSelectedPackage(annualPkg || offerings.availablePackages[0]);
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchase(selectedPackage);

      if (result.success) {
        Alert.alert(
          'Welcome to Premium! 🎉',
          'You now have access to all premium features. Enjoy!',
          [
            {
              text: 'Get Started',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (result.cancelled) {
        // User cancelled, do nothing
      } else {
        Alert.alert('Purchase Failed', result.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to process purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restore();

      if (result.success) {
        if (result.isPremium) {
          Alert.alert(
            'Purchases Restored! 🎉',
            'Your premium subscription has been restored.',
            [
              {
                text: 'Continue',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        } else {
          Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
        }
      } else {
        Alert.alert('Restore Failed', result.error || 'Failed to restore purchases.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const getFeatureTitle = () => {
    const titles = {
      unlimited_budgets: 'Unlimited Budgets',
      annual_view: 'Annual View',
      advanced_analytics: 'Advanced Analytics',
      export_data: 'Export Data',
      custom_categories: 'Custom Categories',
      receipt_scanning: 'Receipt Scanning',
      import_expenses: 'CSV Import',
    };

    return titles[feature] || 'Premium Features';
  };

  const premiumFeatures = [
    { icon: 'infinite', title: 'Unlimited Budgets', description: 'Create as many budgets as you need' },
    { icon: 'camera', title: 'Receipt Scanning', description: 'Scan receipts with AI-powered OCR' },
    { icon: 'calendar', title: 'Annual View', description: 'Track expenses across the entire year' },
    { icon: 'stats-chart', title: 'Advanced Analytics', description: 'Insights and trends for smarter spending' },
    { icon: 'download', title: 'Export Data', description: 'Download expenses for taxes or records' },
    { icon: 'cloud-upload', title: 'CSV Import', description: 'Bulk import expenses from bank statements' },
    { icon: 'pricetag', title: 'Custom Categories', description: 'Create your own expense categories' },
    { icon: 'repeat', title: 'Recurring Expenses', description: 'Automate regular bills and subscriptions' },
    { icon: 'heart', title: 'Relationship Insights', description: 'Financial health scores for couples' },
    { icon: 'shield-checkmark', title: 'Priority Support', description: 'Get help when you need it' },
  ];

  if (loading && !offerings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.premiumBadge}>
            <Ionicons name="sparkles" size={24} color="#FFD700" />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
          <Text style={styles.title}>Upgrade to{'\n'}Dividela Premium</Text>
          <Text style={styles.subtitle}>
            Unlock powerful features to manage your finances as a couple
          </Text>
        </View>

        {/* Feature Highlight if triggered from specific feature */}
        {feature && (
          <View style={styles.featureHighlight}>
            <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
            <Text style={styles.featureHighlightText}>
              <Text style={styles.featureHighlightBold}>{getFeatureTitle()}</Text> requires Premium
            </Text>
          </View>
        )}

        {/* Pricing Cards */}
        {offerings?.availablePackages && offerings.availablePackages.length > 0 && (
          <View style={styles.pricingContainer}>
            {offerings.availablePackages.map((pkg) => {
              const isAnnual = pkg.identifier.includes('annual') || pkg.identifier.includes('yearly');
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const monthlyPrice = isAnnual
                ? (pkg.product.price / 12).toFixed(2)
                : pkg.product.price.toFixed(2);

              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.pricingCard, isSelected && styles.pricingCardSelected]}
                  onPress={() => setSelectedPackage(pkg)}
                >
                  {isAnnual && (
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                  )}

                  <View style={styles.pricingHeader}>
                    <Text style={styles.pricingTitle}>
                      {isAnnual ? 'Annual' : 'Monthly'}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </View>

                  <View style={styles.pricingAmount}>
                    <Text style={styles.price}>${pkg.product.price.toFixed(2)}</Text>
                    <Text style={styles.pricePeriod}>
                      {isAnnual ? '/year' : '/month'}
                    </Text>
                  </View>

                  {isAnnual && (
                    <Text style={styles.monthlyEquivalent}>
                      Just ${monthlyPrice}/month
                    </Text>
                  )}

                  {isAnnual && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>Save 33%</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's Included</Text>

          {premiumFeatures.map((item, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name={item.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDescription}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Fine Print */}
        <Text style={styles.finePrint}>
          Subscription automatically renews unless auto-renew is turned off at least 24 hours before
          the end of the current period. Payment will be charged to your {Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : 'Stripe'} account.
        </Text>
      </ScrollView>

      {/* Purchase Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.purchaseButton, (purchasing || !selectedPackage) && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Start Premium{selectedPackage && ` - $${selectedPackage.product.price.toFixed(2)}`}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  loadingText: {
    marginTop: SPACING.medium,
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.medium,
    paddingTop: SPACING.large,
  },
  closeButton: {
    padding: SPACING.small,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.large,
  },
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.xLarge,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderRadius: SIZES.borderRadius.large,
    marginBottom: SPACING.medium,
  },
  premiumBadgeText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
    color: '#FFD700',
    marginLeft: SPACING.small,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.small,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featureHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.large,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  featureHighlightText: {
    marginLeft: SPACING.small,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    flex: 1,
  },
  featureHighlightBold: {
    fontWeight: FONTS.weights.bold,
  },
  pricingContainer: {
    marginBottom: SPACING.xLarge,
  },
  pricingCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    marginBottom: SPACING.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(102, 51, 153, 0.05)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.medium,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadius.small,
  },
  bestValueText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  pricingTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  pricingAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.small,
  },
  price: {
    fontSize: 36,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  pricePeriod: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    marginLeft: SPACING.small,
  },
  monthlyEquivalent: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: SPACING.medium,
    paddingVertical: 4,
    borderRadius: SIZES.borderRadius.small,
  },
  savingsText: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    color: '#FFFFFF',
  },
  featuresSection: {
    marginBottom: SPACING.xLarge,
  },
  featuresTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.large,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: SPACING.large,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.medium,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  finePrint: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.large,
  },
  footer: {
    padding: SPACING.large,
    paddingBottom: SPACING.xLarge,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadius.large,
    paddingVertical: SPACING.medium,
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: '#FFFFFF',
  },
  restoreButton: {
    paddingVertical: SPACING.small,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
});
