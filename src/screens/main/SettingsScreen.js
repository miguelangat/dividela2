/**
 * SettingsScreen.js
 *
 * User preferences and settings:
 * - Profile information (editable display name)
 * - Partner information
 * - App preferences
 * - Sign out
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { onboardingStorage } from '../../utils/storage';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { formatCurrency, calculateBalance } from '../../utils/calculations';
import { useTranslation } from 'react-i18next';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 768;
const isLargeScreen = screenWidth >= 768;

export default function SettingsScreen({ navigation }) {
  const { user, userDetails, signOut, getPartnerDetails } = useAuth();
  const { isPremium, subscriptionInfo } = useSubscription();
  const { currentLanguage, changeLanguage, availableLanguages, getCurrentLanguageInfo } = useLanguage();
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(userDetails?.displayName || '');
  const [partnerName, setPartnerName] = useState('Partner');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [restartOnboardingModalVisible, setRestartOnboardingModalVisible] = useState(false);

  // Fetch partner details
  useEffect(() => {
    const fetchPartner = async () => {
      if (userDetails?.partnerId) {
        try {
          const partner = await getPartnerDetails();
          if (partner && partner.displayName) {
            setPartnerName(partner.displayName);
          }
        } catch (error) {
          console.error('Error fetching partner details:', error);
        }
      }
    };
    fetchPartner();
  }, [userDetails?.partnerId]);

  // Update display name when userDetails changes
  useEffect(() => {
    if (userDetails?.displayName) {
      setDisplayName(userDetails.displayName);
    }
  }, [userDetails?.displayName]);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      Alert.alert(t('common.error'), t('settings.nameEmpty'));
      return;
    }

    if (displayName === userDetails?.displayName) {
      setEditingName(false);
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
      });

      setEditingName(false);
      Alert.alert(t('common.success'), t('settings.nameUpdated'));
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert(t('common.error'), t('settings.nameUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    console.log('Sign out button pressed');
    setSignOutModalVisible(true);
  };

  const confirmSignOut = async () => {
    console.log('Signing out...');
    setLoading(true);
    setSignOutModalVisible(false);
    try {
      await signOut();
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert(t('common.error'), `Failed to sign out: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>

      <View style={styles.card}>
        {/* Display Name */}
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.displayName')}</Text>
            {editingName ? (
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                autoFocus
                maxLength={50}
              />
            ) : (
              <Text style={styles.settingValue}>{displayName}</Text>
            )}
          </View>
          {editingName ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={() => {
                  setDisplayName(userDetails?.displayName || '');
                  setEditingName(false);
                }}
                style={styles.iconButton}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                style={styles.iconButton}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.success} />
                ) : (
                  <Ionicons name="checkmark" size={24} color={COLORS.success} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setEditingName(true)}
              style={styles.iconButton}
            >
              <Ionicons name="pencil" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Email (read-only) */}
        <View style={[styles.settingRow, styles.settingRowLast]}>
          <View style={styles.settingIcon}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.email')}</Text>
            <Text style={styles.settingValue}>{user?.email}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPartnerSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.partner')}</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="people" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.partnerName')}</Text>
            <Text style={styles.settingValue}>{partnerName}</Text>
          </View>
        </View>

        {userDetails?.coupleId && (
          <View style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.settingIcon}>
              <Ionicons name="heart" size={20} color={COLORS.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>{t('settings.coupleId')}</Text>
              <Text style={[styles.settingValue, styles.settingValueSmall]}>
                {userDetails.coupleId.substring(0, 20)}...
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderSubscriptionSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Subscription</Text>

      <View style={styles.card}>
        {/* Subscription Status */}
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons
              name={isPremium ? 'sparkles' : 'lock-closed'}
              size={20}
              color={isPremium ? '#FFD700' : COLORS.textSecondary}
            />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Plan</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.settingValue, isPremium && { color: COLORS.primary, fontWeight: '600' }]}>
                {isPremium ? 'Premium' : 'Free'}
              </Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Manage/Upgrade Button */}
        <TouchableOpacity
          style={[styles.settingRow, styles.settingRowLast]}
          onPress={() => navigation.navigate(isPremium ? 'SubscriptionManagement' : 'Paywall')}
          activeOpacity={0.7}
        >
          <View style={styles.settingIcon}>
            <Ionicons
              name={isPremium ? 'settings' : 'arrow-up-circle'}
              size={20}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>
              {isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
            </Text>
            {!isPremium && (
              <Text style={styles.settingDescription}>
                Unlock unlimited budgets, analytics, and more
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Couples Subscription Info */}
      {userDetails?.partnerId && (
        <View style={styles.infoCard}>
          <Ionicons name="heart" size={16} color={COLORS.primary} />
          <Text style={styles.infoCardText}>
            {isPremium
              ? 'Your partner also has premium access!'
              : 'When you upgrade, both you and your partner get premium features.'}
          </Text>
        </View>
      )}
    </View>
  );

  const handleLanguageSelect = async (languageCode) => {
    try {
      await changeLanguage(languageCode);
      setLanguageModalVisible(false);
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(t('common.error'), 'Failed to change language. Please try again.');
    }
  };

  const handleRestartOnboarding = async () => {
    console.log('🚨 RESTART BUTTON CLICKED - HANDLER CALLED');
    setRestartOnboardingModalVisible(true);
  };

  const confirmRestartOnboarding = async () => {
    try {
      setRestartOnboardingModalVisible(false);
      console.log('🔄 Restarting onboarding...');

      // Clear the onboarding completion flag using storage utility
      if (userDetails?.coupleId) {
        await onboardingStorage.clearCompleted(userDetails.coupleId);
        await onboardingStorage.clearState();
        console.log('✅ Cleared onboarding storage');
      }

      // Log navigation state for debugging
      console.log('📍 Navigation state before restart:', {
        hasNavigation: !!navigation,
        hasParent: !!navigation.getParent,
        hasGetParent: typeof navigation.getParent === 'function',
      });

      // Navigate to onboarding modal
      // CRITICAL: SettingsScreen is in TabNavigator, 'Onboarding' is in parent Stack
      // Must explicitly access parent navigator
      try {
        const parentNav = navigation.getParent();
        if (parentNav) {
          console.log('🎯 Navigating via parent navigator');
          parentNav.navigate('Onboarding', { restartMode: true });
        } else {
          console.log('🎯 Navigating directly (no parent found)');
          navigation.navigate('Onboarding', { restartMode: true });
        }
        console.log('✅ Navigation command executed');
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        throw navError;
      }
    } catch (error) {
      console.error('❌ Error restarting onboarding:', error);
      Alert.alert(t('common.error'), t('settings.restartError'));
    }
  };

  const renderPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setLanguageModalVisible(true)}
          activeOpacity={0.6}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="language" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.language')}</Text>
            <Text style={styles.settingValue}>{getCurrentLanguageInfo().nativeName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="cash" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.currency')}</Text>
            <Text style={styles.settingValue}>USD ($)</Text>
          </View>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="pie-chart" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.defaultSplit')}</Text>
            <Text style={styles.settingValue}>50 / 50</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingRow, styles.settingRowLast]}
          onPress={handleRestartOnboarding}
          activeOpacity={0.6}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.budgetSetup')}</Text>
            <Text style={styles.settingValue}>{t('settings.restartOnboarding')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.about')}</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.appVersion')}</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        <View style={[styles.settingRow, styles.settingRowLast]}>
          <View style={styles.settingIcon}>
            <Ionicons name="code-slash" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.appName')}</Text>
            <Text style={[styles.settingValue, styles.settingValueSmall]}>
              {t('settings.appDescription')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderLanguageModal = () => (
    <Modal
      visible={languageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setLanguageModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="language" size={32} color={COLORS.primary} />
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.languageList}
            showsVerticalScrollIndicator={true}
          >
            {availableLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  currentLanguage === lang.code && styles.languageOptionSelected,
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <View style={styles.languageOptionContent}>
                  <Text style={styles.languageOptionName}>{lang.nativeName}</Text>
                  <Text style={styles.languageOptionSubname}>{lang.name}</Text>
                </View>
                {currentLanguage === lang.code && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('settings.subtitle')}</Text>
        </View>

        {/* Profile Section */}
        {renderProfileSection()}

        {/* Partner Section */}
        {renderPartnerSection()}

        {/* Subscription Section */}
        {renderSubscriptionSection()}

        {/* Preferences Section */}
        {renderPreferencesSection()}

        {/* About Section */}
        {renderAboutSection()}

        {/* Sign Out Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.signOutButton, loading && styles.signOutButtonDisabled]}
            onPress={handleSignOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <Ionicons name="log-out" size={20} color={COLORS.error} />
            )}
            <Text style={styles.signOutButtonText}>
              {loading ? t('settings.signingOut') : t('settings.signOut')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={signOutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSignOutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="log-out" size={32} color={COLORS.error} />
            </View>

            <Text style={styles.modalTitle}>{t('settings.signOutConfirmTitle')}</Text>
            <Text style={styles.modalMessage}>
              {t('settings.signOutConfirmMessage')}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  console.log('Sign out cancelled');
                  setSignOutModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={confirmSignOut}
              >
                <Text style={styles.modalButtonTextPrimary}>{t('settings.signOut')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selector Modal */}
      {renderLanguageModal()}

      {/* Restart Onboarding Confirmation Modal */}
      <Modal
        visible={restartOnboardingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRestartOnboardingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="refresh" size={32} color={COLORS.primary} />
            </View>

            <Text style={styles.modalTitle}>{t('settings.restartOnboardingTitle')}</Text>
            <Text style={styles.modalMessage}>
              {t('settings.restartOnboardingMessage')}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  console.log('Restart onboarding cancelled');
                  setRestartOnboardingModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={confirmRestartOnboarding}
              >
                <Text style={styles.modalButtonTextPrimary}>{t('settings.restart')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: Platform.OS === 'web' ? SPACING.base : 10,
    paddingBottom: SPACING.base,
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: isSmallScreen ? 24 : 28,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  section: {
    paddingHorizontal: SPACING.screenPadding,
    marginTop: SPACING.base,
  },
  sectionTitle: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E5E5',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
  },
  settingValue: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  settingValueSmall: {
    fontSize: 12,
  },
  input: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    padding: SPACING.small,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  iconButton: {
    padding: SPACING.small,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorLight,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.large,
    borderRadius: 12,
    gap: SPACING.small,
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
    width: isLargeScreen ? '100%' : 'auto',
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    ...FONTS.body,
    color: COLORS.error,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: SPACING.large,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  modalMessage: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.large,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.base,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.large,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.error,
  },
  modalButtonTextSecondary: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
  // Subscription styles
  premiumBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: SPACING.small,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: SPACING.small,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  settingDescription: {
    ...FONTS.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.base,
    borderRadius: 12,
    marginTop: SPACING.small,
    maxWidth: isLargeScreen ? 600 : '100%',
    alignSelf: isLargeScreen ? 'center' : 'stretch',
  },
  infoCardText: {
    ...FONTS.body,
    fontSize: 13,
    color: COLORS.primary,
    marginLeft: SPACING.small,
    flex: 1,
    lineHeight: 18,
  },
  // Language styles
  languageList: {
    maxHeight: 400,
    width: '100%',
    marginTop: SPACING.base,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.base,
    borderRadius: 12,
    marginBottom: SPACING.small,
    backgroundColor: COLORS.backgroundSecondary,
  },
  languageOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  languageOptionContent: {
    flex: 1,
  },
  languageOptionName: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.tiny,
  },
  languageOptionSubname: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
