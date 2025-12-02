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
import CurrencyPicker from '../../components/CurrencyPicker';
import { getCurrencyInfo } from '../../constants/currencies';
import {
  updatePrimaryCurrency,
  getPrimaryCurrency,
  updateNotificationPreferences,
  getCoupleSettings,
} from '../../services/coupleSettingsService';
import MerchantAliasManager from '../../components/MerchantAliasManager';
import { useTranslation } from 'react-i18next';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isMediumScreen = screenWidth >= 375 && screenWidth < 768;
const isLargeScreen = screenWidth >= 768;

export default function SettingsScreen({ navigation }) {
  const { user, userDetails, signOut, getPartnerDetails, changePassword, deleteAccount } = useAuth();
  const { isPremium, subscriptionInfo } = useSubscription();
  const { currentLanguage, changeLanguage, availableLanguages, getCurrentLanguageInfo } = useLanguage();
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(userDetails?.displayName || '');
  const [partnerName, setPartnerName] = useState('Partner');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [primaryCurrency, setPrimaryCurrency] = useState('USD');
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [restartOnboardingModalVisible, setRestartOnboardingModalVisible] = useState(false);
  const [showAliasManager, setShowAliasManager] = useState(false);
  const [currencyChangeModalVisible, setCurrencyChangeModalVisible] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState(null);
  const [notifications, setNotifications] = useState({
    emailEnabled: true,
    monthlyBudgetAlert: true,
    annualBudgetAlert: true,
    fiscalYearEndReminder: true,
    savingsGoalMilestone: true,
    partnerActivity: false,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Change password modal state
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account modal state
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  // Fetch primary currency and notification settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (userDetails?.coupleId) {
        try {
          // Fetch currency
          const currency = await getPrimaryCurrency(userDetails.coupleId);
          setPrimaryCurrency(currency.code);

          // Fetch notification preferences
          const settings = await getCoupleSettings(userDetails.coupleId);
          if (settings.notifications) {
            setNotifications(settings.notifications);
          }
        } catch (error) {
          console.error('Error fetching settings:', error);
        }
      }
    };
    fetchSettings();
  }, [userDetails?.coupleId]);

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

  const handleCurrencyChange = async (newCurrency) => {
    console.log('🔍 handleCurrencyChange called with:', newCurrency);
    console.log('🔍 Current primaryCurrency:', primaryCurrency);
    console.log('🔍 userDetails?.coupleId:', userDetails?.coupleId);

    if (!userDetails?.coupleId) {
      console.log('❌ No coupleId, returning early');
      return;
    }

    console.log('🔍 Comparing currencies:', newCurrency, '!==', primaryCurrency, '=', newCurrency !== primaryCurrency);

    // Show warning if changing from current currency
    if (newCurrency !== primaryCurrency) {
      console.log('✅ Showing confirmation modal');
      setPendingCurrency(newCurrency);
      setCurrencyChangeModalVisible(true);
    } else {
      console.log('ℹ️ Same currency selected, no change needed');
    }
  };

  const confirmCurrencyChange = async () => {
    console.log('✅ User confirmed currency change');
    setCurrencyChangeModalVisible(false);
    setCurrencyLoading(true);

    try {
      console.log('🔄 Fetching currency info for:', pendingCurrency);
      const currencyInfo = getCurrencyInfo(pendingCurrency);
      console.log('📦 Currency info:', currencyInfo);

      console.log('🔄 Calling updatePrimaryCurrency...');
      await updatePrimaryCurrency(
        userDetails.coupleId,
        pendingCurrency,
        currencyInfo.symbol,
        currencyInfo.locale
      );
      console.log('✅ updatePrimaryCurrency completed');

      setPrimaryCurrency(pendingCurrency);
      console.log(`✅ Primary currency successfully changed to ${pendingCurrency}`);
    } catch (error) {
      console.error('❌ Error updating currency:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Failed to update currency. Please try again.');
    } finally {
      console.log('🔄 Setting currencyLoading to false');
      setCurrencyLoading(false);
      setPendingCurrency(null);
    }
  };

  const cancelCurrencyChange = () => {
    console.log('❌ User cancelled currency change');
    setCurrencyChangeModalVisible(false);
    setPendingCurrency(null);
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
                placeholder={t('settings.namePlaceholder')}
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
      <Text style={styles.sectionTitle}>{t('settings.subscription.title')}</Text>

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
            <Text style={styles.settingLabel}>{t('settings.subscription.plan')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.settingValue, isPremium && { color: COLORS.primary, fontWeight: '600' }]}>
                {isPremium ? t('settings.subscription.planPremium') : t('settings.subscription.planFree')}
              </Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumBadgeText}>{t('settings.subscription.active')}</Text>
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
              {isPremium ? t('settings.subscription.manage') : t('settings.subscription.upgrade')}
            </Text>
            {!isPremium && (
              <Text style={styles.settingDescription}>
                {t('settings.subscription.description')}
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
              ? t('settings.subscription.partnerHasPremium')
              : t('settings.subscription.bothGetPremium')}
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
      Alert.alert(t('common.error'), t('settings.languageChangeFailed'));
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

  const handleNotificationToggle = async (key, value) => {
    if (!userDetails?.coupleId) return;

    setNotificationsLoading(true);
    try {
      const updatedNotifications = {
        ...notifications,
        [key]: value,
      };
      setNotifications(updatedNotifications);

      await updateNotificationPreferences(userDetails.coupleId, updatedNotifications);
      console.log(`✅ Updated ${key} to ${value}`);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      // Revert on error
      setNotifications(notifications);
      Alert.alert(t('common.error'), t('settings.notificationUpdateFailed'));
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword.trim()) {
      Alert.alert(t('common.error'), t('settings.changePasswordModal.currentPasswordEmpty'));
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert(t('common.error'), t('settings.changePasswordModal.newPasswordEmpty'));
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('settings.changePasswordModal.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('settings.changePasswordModal.passwordMismatch'));
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);

      // Success - clear form and close modal
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordModalVisible(false);

      Alert.alert(t('common.success'), t('settings.changePasswordModal.success'));
    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('settings.changePasswordModal.error')
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Check if user signed in with OAuth
    const providerData = user?.providerData || [];
    const hasEmailProvider = providerData.some(p => p.providerId === 'password');

    // Validation for email/password users
    if (hasEmailProvider && !deletePassword.trim()) {
      Alert.alert(t('common.error'), t('settings.deleteAccountModal.passwordEmpty'));
      return;
    }

    // Require typing "DELETE" to confirm
    if (deleteConfirmation.trim() !== 'DELETE') {
      Alert.alert(t('common.error'), t('settings.deleteAccountModal.confirmationMismatch'));
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteAccount(hasEmailProvider ? deletePassword : null);

      // Success - account deleted, user will be signed out automatically
      Alert.alert(t('common.success'), t('settings.deleteAccountModal.success'));
    } catch (error) {
      console.error('Account deletion error:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('settings.deleteAccountModal.error')
      );
      setDeletingAccount(false);
    }
  };

  const renderAccountManagementSection = () => {
    // Check if user signed in with email/password
    const providerData = user?.providerData || [];
    const hasEmailProvider = providerData.some(p => p.providerId === 'password');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.accountManagement')}</Text>

        <View style={styles.card}>
          {/* Change Password - only for email/password users */}
          {hasEmailProvider && (
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setChangePasswordModalVisible(true)}
              activeOpacity={0.6}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="key" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{t('settings.changePassword')}</Text>
                <Text style={styles.settingDescription}>
                  {t('settings.changePasswordDescription')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Delete Account */}
          <TouchableOpacity
            style={[styles.settingRow, styles.settingRowLast, styles.dangerRow]}
            onPress={() => setDeleteAccountModalVisible(true)}
            activeOpacity={0.6}
          >
            <View style={[styles.settingIcon, styles.dangerIcon]}>
              <Ionicons name="trash" size={20} color={COLORS.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, styles.dangerText]}>
                {t('settings.deleteAccount')}
              </Text>
              <Text style={styles.settingDescription}>
                {t('settings.deleteAccountDescription')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderNotificationsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.notifications.title')}</Text>

      <View style={styles.card}>
        {/* Master Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons
              name={notifications.emailEnabled ? "mail" : "mail-outline"}
              size={20}
              color={notifications.emailEnabled ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.notifications.emailEnabled')}</Text>
            <Text style={styles.settingDescription}>{t('settings.notifications.emailEnabledDesc')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleNotificationToggle('emailEnabled', !notifications.emailEnabled)}
            disabled={notificationsLoading}
            activeOpacity={0.7}
          >
            <View style={[
              styles.toggle,
              notifications.emailEnabled && styles.toggleActive
            ]}>
              <View style={[
                styles.toggleThumb,
                notifications.emailEnabled && styles.toggleThumbActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Only show other options if email is enabled */}
        {notifications.emailEnabled && (
          <>
            {/* Monthly Budget Alert */}
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="calendar"
                  size={20}
                  color={notifications.monthlyBudgetAlert ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{t('settings.notifications.monthlyBudget')}</Text>
                <Text style={styles.settingDescription}>{t('settings.notifications.monthlyBudgetDesc')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleNotificationToggle('monthlyBudgetAlert', !notifications.monthlyBudgetAlert)}
                disabled={notificationsLoading}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggle,
                  notifications.monthlyBudgetAlert && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    notifications.monthlyBudgetAlert && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Fiscal Year End Reminder */}
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={notifications.fiscalYearEndReminder ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{t('settings.notifications.fiscalYearEnd')}</Text>
                <Text style={styles.settingDescription}>{t('settings.notifications.fiscalYearEndDesc')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleNotificationToggle('fiscalYearEndReminder', !notifications.fiscalYearEndReminder)}
                disabled={notificationsLoading}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggle,
                  notifications.fiscalYearEndReminder && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    notifications.fiscalYearEndReminder && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Savings Goal Milestone */}
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="trophy"
                  size={20}
                  color={notifications.savingsGoalMilestone ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{t('settings.notifications.savingsGoal')}</Text>
                <Text style={styles.settingDescription}>{t('settings.notifications.savingsGoalDesc')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleNotificationToggle('savingsGoalMilestone', !notifications.savingsGoalMilestone)}
                disabled={notificationsLoading}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggle,
                  notifications.savingsGoalMilestone && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    notifications.savingsGoalMilestone && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Partner Activity */}
            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="person-add"
                  size={20}
                  color={notifications.partnerActivity ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>{t('settings.notifications.partnerActivity')}</Text>
                <Text style={styles.settingDescription}>{t('settings.notifications.partnerActivityDesc')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleNotificationToggle('partnerActivity', !notifications.partnerActivity)}
                disabled={notificationsLoading}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggle,
                  notifications.partnerActivity && styles.toggleActive
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    notifications.partnerActivity && styles.toggleThumbActive
                  ]} />
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Info note */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={16} color={COLORS.primary} />
        <Text style={styles.infoCardText}>
          {t('settings.notifications.infoText')}
        </Text>
      </View>
    </View>
  );

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

        <View style={[styles.settingRow, styles.currencyPickerRow]}>
          <View style={styles.settingIcon}>
            <Ionicons name="cash" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <CurrencyPicker
              selectedCurrency={primaryCurrency}
              onSelect={handleCurrencyChange}
              label={t('settings.currencyLabel')}
              disabled={currencyLoading}
              style={styles.currencyPicker}
            />
          </View>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="pie-chart" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.defaultSplit')}</Text>
            <Text style={styles.settingValue}>{t('settings.defaultSplitValue')}</Text>
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

  const renderReceiptScanningSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.receiptScanning.title')}</Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.settingRow, styles.settingRowLast]}
          onPress={() => setShowAliasManager(true)}
          activeOpacity={0.6}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="storefront" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{t('settings.receiptScanning.merchantAliases')}</Text>
            <Text style={styles.settingValue}>{t('settings.receiptScanning.merchantAliasesDescription')}</Text>
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

        {/* Email Notifications Section */}
        {renderNotificationsSection()}

        {/* Preferences Section */}
        {renderPreferencesSection()}

        {/* Receipt Scanning Section */}
        {renderReceiptScanningSection()}

        {/* About Section */}
        {renderAboutSection()}

        {/* Account Management Section */}
        {renderAccountManagementSection()}

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

      {/* Currency Change Confirmation Modal */}
      <Modal
        visible={currencyChangeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelCurrencyChange}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="cash" size={32} color={COLORS.primary} />
            </View>

            <Text style={styles.modalTitle}>{t('settings.currencyChange.title')}</Text>
            <Text style={styles.modalMessage}>
              {t('settings.currencyChange.message', { from: primaryCurrency, to: pendingCurrency })}
              {'\n\n'}
              {t('settings.currencyChange.note', { currency: pendingCurrency })}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={cancelCurrencyChange}
              >
                <Text style={styles.modalButtonTextSecondary}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={confirmCurrencyChange}
                disabled={currencyLoading}
              >
                {currencyLoading ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>{t('settings.currencyChange.change')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Merchant Alias Manager Modal */}
      <Modal
        visible={showAliasManager}
        animationType="slide"
        onRequestClose={() => setShowAliasManager(false)}
      >
        <MerchantAliasManager
          coupleId={userDetails?.coupleId}
          onClose={() => setShowAliasManager(false)}
        />
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setChangePasswordModalVisible(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="key" size={32} color={COLORS.primary} />
            </View>

            <Text style={styles.modalTitle}>{t('settings.changePasswordModal.title')}</Text>

            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('settings.changePasswordModal.currentPassword')}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={t('settings.changePasswordModal.currentPasswordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                editable={!changingPassword}
              />
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('settings.changePasswordModal.newPassword')}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t('settings.changePasswordModal.newPasswordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                editable={!changingPassword}
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('settings.changePasswordModal.confirmPassword')}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('settings.changePasswordModal.confirmPasswordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                editable={!changingPassword}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setChangePasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={changingPassword}
              >
                <Text style={styles.modalButtonTextSecondary}>
                  {t('settings.changePasswordModal.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>
                    {t('settings.changePasswordModal.change')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteAccountModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setDeleteAccountModalVisible(false);
          setDeletePassword('');
          setDeleteConfirmation('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: COLORS.errorLight }]}>
              <Ionicons name="warning" size={32} color={COLORS.error} />
            </View>

            <Text style={styles.modalTitle}>{t('settings.deleteAccountModal.title')}</Text>
            <Text style={[styles.modalMessage, { fontWeight: '600', color: COLORS.error }]}>
              {t('settings.deleteAccountModal.warning')}
            </Text>

            <Text style={styles.modalMessage}>
              {t('settings.deleteAccountModal.message')}
            </Text>

            <View style={styles.consequencesList}>
              <Text style={styles.consequenceText}>
                {t('settings.deleteAccountModal.consequence1')}
              </Text>
              <Text style={styles.consequenceText}>
                {t('settings.deleteAccountModal.consequence2')}
              </Text>
              <Text style={styles.consequenceText}>
                {t('settings.deleteAccountModal.consequence3')}
              </Text>
              <Text style={styles.consequenceText}>
                {t('settings.deleteAccountModal.consequence4')}
              </Text>
            </View>

            {/* Password input for email/password users */}
            {user?.providerData?.some(p => p.providerId === 'password') ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t('settings.deleteAccountModal.passwordLabel')}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder={t('settings.deleteAccountModal.passwordPlaceholder')}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!deletingAccount}
                />
              </View>
            ) : (
              <Text style={[styles.modalMessage, { fontSize: 13, fontStyle: 'italic' }]}>
                {t('settings.deleteAccountModal.oauthMessage')}
              </Text>
            )}

            {/* Confirmation text */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t('settings.deleteAccountModal.confirmText')}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                placeholder={t('settings.deleteAccountModal.confirmPlaceholder')}
                autoCapitalize="characters"
                editable={!deletingAccount}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setDeleteAccountModalVisible(false);
                  setDeletePassword('');
                  setDeleteConfirmation('');
                }}
                disabled={deletingAccount}
              >
                <Text style={styles.modalButtonTextSecondary}>
                  {t('settings.deleteAccountModal.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>
                    {t('settings.deleteAccountModal.delete')}
                  </Text>
                )}
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
  currencyPickerRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  currencyPicker: {
    marginVertical: 0,
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
  // Toggle switch styles
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  // Account management styles
  dangerRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border || '#E5E5E5',
  },
  dangerIcon: {
    backgroundColor: COLORS.errorLight,
  },
  dangerText: {
    color: COLORS.error,
  },
  inputGroup: {
    width: '100%',
    marginBottom: SPACING.base,
  },
  inputLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
    fontWeight: '600',
  },
  modalInput: {
    ...FONTS.body,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E5E5',
    color: COLORS.text,
  },
  modalButtonDanger: {
    backgroundColor: COLORS.error,
  },
  consequencesList: {
    width: '100%',
    backgroundColor: COLORS.errorLight,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  consequenceText: {
    ...FONTS.body,
    fontSize: 13,
    color: COLORS.error,
    marginBottom: SPACING.tiny,
    lineHeight: 20,
  },
});
