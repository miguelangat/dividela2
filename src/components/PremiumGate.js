// src/components/PremiumGate.js
// Premium feature gate - Shows paywall for non-premium users

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { hasActivePremium } from '../services/referralService';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';

export default function PremiumGate({
  children,
  featureName = 'This feature',
  featureDescription = 'Unlock premium to access this feature',
  onUnlock,
}) {
  const { userDetails } = useAuth();
  const [showPaywall, setShowPaywall] = React.useState(false);
  const isPremium = hasActivePremium(userDetails);

  // If user has premium, show the feature
  if (isPremium) {
    return children;
  }

  // Otherwise, show locked state
  return (
    <>
      <TouchableOpacity
        style={styles.lockedContainer}
        onPress={() => setShowPaywall(true)}
        activeOpacity={0.7}
      >
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.lockTitle}>{featureName}</Text>
        <Text style={styles.lockDescription}>{featureDescription}</Text>
        <View style={styles.unlockButton}>
          <Ionicons name="star" size={16} color={COLORS.textWhite} />
          <Text style={styles.unlockButtonText}>Unlock Premium</Text>
        </View>
      </TouchableOpacity>

      {/* Paywall Modal */}
      <Modal
        visible={showPaywall}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaywall(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPaywall(false)}
            >
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.modalIcon}>
              <Ionicons name="star" size={64} color={COLORS.primary} />
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Unlock Premium Features</Text>

            {/* Feature Name */}
            <Text style={styles.modalFeatureName}>{featureName}</Text>
            <Text style={styles.modalFeatureDescription}>{featureDescription}</Text>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                <Text style={styles.benefitText}>
                  Receipt OCR, Advanced Analytics, Recurring Expenses
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                <Text style={styles.benefitText}>
                  Custom exports and category trends
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                <Text style={styles.benefitText}>Priority customer support</Text>
              </View>
            </View>

            {/* Unlock Options */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[styles.optionButton, styles.optionButtonPrimary]}
                onPress={() => {
                  setShowPaywall(false);
                  if (onUnlock) onUnlock('referral');
                }}
              >
                <View style={styles.optionHeader}>
                  <Ionicons name="people" size={24} color={COLORS.textWhite} />
                  <Text style={styles.optionTitle}>Refer 1 Couple</Text>
                </View>
                <Text style={styles.optionPrice}>FREE Forever</Text>
                <Text style={styles.optionDescription}>
                  Share with friends and unlock Premium permanently
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  setShowPaywall(false);
                  if (onUnlock) onUnlock('subscribe');
                }}
              >
                <View style={styles.optionHeader}>
                  <Ionicons name="card" size={24} color={COLORS.primary} />
                  <Text style={[styles.optionTitle, { color: COLORS.text }]}>
                    Subscribe
                  </Text>
                </View>
                <Text style={[styles.optionPrice, { color: COLORS.primary }]}>
                  $2.99/month
                </Text>
                <Text style={styles.optionDescription}>
                  Coming soon - Instant access, cancel anytime
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xlarge,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  lockTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.small,
  },
  lockDescription: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.large,
    paddingVertical: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
  },
  unlockButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite,
    marginLeft: SPACING.small,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: SIZES.borderRadius.xlarge,
    borderTopRightRadius: SIZES.borderRadius.xlarge,
    padding: SPACING.xlarge,
    paddingBottom: SPACING.xxlarge,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.medium,
    right: SPACING.medium,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    zIndex: 10,
  },
  modalIcon: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.large,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.small,
  },
  modalFeatureName: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.tiny,
  },
  modalFeatureDescription: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  benefitsContainer: {
    marginBottom: SPACING.large,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.medium,
  },
  benefitText: {
    flex: 1,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    marginLeft: SPACING.medium,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: SPACING.medium,
  },
  optionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.large,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  optionTitle: {
    fontSize: FONTS.sizes.large,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginLeft: SPACING.small,
  },
  optionPrice: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.tiny,
  },
  optionDescription: {
    fontSize: FONTS.sizes.small,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
});
