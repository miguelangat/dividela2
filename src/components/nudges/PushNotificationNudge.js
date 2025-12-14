// src/components/nudges/PushNotificationNudge.js
// Nudge for enabling push notifications - can be used as banner or modal

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import NudgeBanner from './NudgeBanner';
import { useNudges, NUDGE_TYPES } from '../../contexts/NudgeContext';
import {
  requestPermissions,
  isPushNotificationSupported,
} from '../../services/pushNotificationService';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';

/**
 * PushNotificationNudge - Prompts user to enable push notifications
 *
 * @param {Object} props
 * @param {'banner' | 'signup'} props.mode - Display mode
 * @param {Function} props.onComplete - Callback when user completes the prompt (signup mode)
 * @param {Object} props.style - Additional styles
 */
export default function PushNotificationNudge({ mode = 'banner', onComplete, style }) {
  const { t } = useTranslation();
  const { dismissNudge } = useNudges();
  const [loading, setLoading] = useState(false);

  const handleEnableNotifications = async () => {
    if (!isPushNotificationSupported()) {
      console.log('[PushNotificationNudge] Push notifications not supported');
      handleDismiss();
      return;
    }

    try {
      setLoading(true);
      const granted = await requestPermissions();
      console.log('[PushNotificationNudge] Permission result:', granted);
    } catch (error) {
      console.error('[PushNotificationNudge] Error requesting permissions:', error);
    } finally {
      setLoading(false);
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    dismissNudge(NUDGE_TYPES.PUSH_NOTIFICATIONS);
    if (mode === 'signup' && onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    handleDismiss();
  };

  // Signup modal mode
  if (mode === 'signup') {
    return (
      <Modal
        visible={true}
        transparent
        animationType="fade"
        onRequestClose={handleSkip}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Icon */}
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name="notifications" size={40} color={COLORS.textWhite} />
              </LinearGradient>
            </View>

            {/* Title & Description */}
            <Text style={styles.modalTitle}>
              {t('nudges.push.title', 'Stay in the Loop')}
            </Text>
            <Text style={styles.modalDescription}>
              {t('nudges.push.description', 'Get notified when expenses are added or budgets are reached')}
            </Text>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleEnableNotifications}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.enableButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.textWhite} />
                  ) : (
                    <Text style={styles.enableButtonText}>
                      {t('nudges.push.cta', 'Enable Notifications')}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>
                  {t('nudges.push.later', 'Not Now')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Banner mode (for HomeScreen)
  return (
    <NudgeBanner
      icon="notifications-outline"
      title={t('nudges.push.title', 'Stay in the Loop')}
      description={t('nudges.push.description', 'Get notified when expenses are added')}
      ctaText={loading ? '...' : t('nudges.push.cta', 'Enable')}
      ctaAction={handleEnableNotifications}
      secondaryCtaText={t('nudges.push.later', 'Not Now')}
      secondaryCtaAction={handleSkip}
      onDismiss={handleDismiss}
      variant="info"
      style={style}
      testID="push-notification-nudge"
    />
  );
}

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
    padding: SPACING.xlarge,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    ...SHADOWS.large,
  },
  iconWrapper: {
    marginBottom: SPACING.large,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.small,
  },
  modalDescription: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xlarge,
  },
  modalActions: {
    width: '100%',
  },
  enableButton: {
    borderRadius: SIZES.borderRadius.medium,
    overflow: 'hidden',
    marginBottom: SPACING.medium,
    ...SHADOWS.small,
  },
  enableButtonGradient: {
    paddingVertical: SPACING.buttonPadding,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  enableButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
  },
  skipButton: {
    paddingVertical: SPACING.medium,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
});
