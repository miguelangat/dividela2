// src/components/AccountSwitcher.js
// Component for displaying and switching between multiple accounts
// Supports both solo and couple accounts

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { switchActiveAccount } from '../services/accountService';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTranslation } from 'react-i18next';

export default function AccountSwitcher({ onAddAccount }) {
  const { user, userDetails, setActiveAccount } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [switchingAccountId, setSwitchingAccountId] = useState(null);
  const [partnerNames, setPartnerNames] = useState({});

  // Fetch partner names for couple accounts
  useEffect(() => {
    const fetchPartnerNames = async () => {
      if (!userDetails?.accounts) return;

      const names = {};
      for (const account of userDetails.accounts) {
        if (account.type === 'couple' && account.partnerId) {
          try {
            const partnerDoc = await getDoc(doc(db, 'users', account.partnerId));
            if (partnerDoc.exists()) {
              names[account.partnerId] = partnerDoc.data().displayName || 'Partner';
            }
          } catch (error) {
            console.error(`Error fetching partner name for ${account.partnerId}:`, error);
          }
        }
      }
      setPartnerNames(names);
    };

    fetchPartnerNames();
  }, [userDetails?.accounts]);

  const handleSwitchAccount = async (accountId) => {
    if (accountId === userDetails?.activeAccountId) {
      console.log('Already on this account');
      return;
    }

    setSwitchingAccountId(accountId);
    setLoading(true);

    try {
      console.log(`Switching to account: ${accountId}`);

      // Use the accountService to switch
      const result = await switchActiveAccount(user.uid, accountId);

      if (result.success) {
        // Update the local context
        await setActiveAccount(accountId);
        console.log('Account switched successfully');

        // Optional: Show success feedback
        // Alert.alert(t('common.success'), t('settings.accounts.switchSuccess'));
      } else {
        throw new Error(result.error || 'Failed to switch account');
      }
    } catch (error) {
      console.error('Error switching account:', error);
      Alert.alert(
        t('common.error'),
        t('settings.accounts.switchError', { defaultValue: 'Failed to switch account. Please try again.' })
      );
    } finally {
      setLoading(false);
      setSwitchingAccountId(null);
    }
  };

  const renderAccountCard = (account) => {
    const isActive = account.accountId === userDetails?.activeAccountId;
    const isSwitching = switchingAccountId === account.accountId;
    const isCoupleAccount = account.type === 'couple';
    const partnerName = partnerNames[account.partnerId] || t('common.partner', { defaultValue: 'Partner' });

    return (
      <TouchableOpacity
        key={account.accountId}
        style={[
          styles.accountCard,
          isActive && styles.accountCardActive,
        ]}
        onPress={() => handleSwitchAccount(account.accountId)}
        disabled={loading || isActive}
        activeOpacity={0.7}
      >
        {/* Left: Icon */}
        <View style={[
          styles.accountIcon,
          isActive && styles.accountIconActive,
        ]}>
          {isSwitching ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <MaterialCommunityIcons
              name={isCoupleAccount ? 'account-multiple' : 'account'}
              size={24}
              color={isActive ? COLORS.background : COLORS.primary}
            />
          )}
        </View>

        {/* Middle: Account Info */}
        <View style={styles.accountInfo}>
          <View style={styles.accountNameRow}>
            <Text style={[
              styles.accountName,
              isActive && styles.accountNameActive,
            ]} numberOfLines={1}>
              {account.accountName || t('settings.accounts.defaultName', { defaultValue: 'Budget' })}
            </Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>
                  {t('settings.accounts.active', { defaultValue: 'Active' })}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.accountDetailsRow}>
            <Ionicons
              name={isCoupleAccount ? 'people' : 'person'}
              size={14}
              color={isActive ? COLORS.background : COLORS.textSecondary}
              style={styles.accountDetailIcon}
            />
            <Text style={[
              styles.accountType,
              isActive && styles.accountTypeActive,
            ]}>
              {isCoupleAccount
                ? t('settings.accounts.coupleWith', { defaultValue: 'Shared with {{partner}}', partner: partnerName })
                : t('settings.accounts.solo', { defaultValue: 'Solo' })
              }
            </Text>
          </View>
        </View>

        {/* Right: Chevron or checkmark */}
        <View style={styles.accountAction}>
          {isActive ? (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.background} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const accounts = userDetails?.accounts || [];

  if (accounts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="wallet-outline" size={48} color={COLORS.textTertiary} />
        <Text style={styles.emptyText}>
          {t('settings.accounts.noAccounts', { defaultValue: 'No accounts found' })}
        </Text>
        <Text style={styles.emptySubtext}>
          {t('settings.accounts.createFirst', { defaultValue: 'Create your first account to get started' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Account List */}
      <View style={styles.accountsList}>
        {accounts.map(renderAccountCard)}
      </View>

      {/* Add Account Button */}
      <TouchableOpacity
        style={styles.addAccountButton}
        onPress={onAddAccount}
        activeOpacity={0.7}
        disabled={loading}
      >
        <View style={styles.addAccountIcon}>
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
        </View>
        <Text style={styles.addAccountText}>
          {t('settings.accounts.addAccount', { defaultValue: 'Add Another Account' })}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Info Note */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
        <Text style={styles.infoText}>
          {t('settings.accounts.switchInfo', {
            defaultValue: 'Switch between accounts to manage different budgets. All your data is saved separately for each account.'
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  accountsList: {
    gap: SPACING.small,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accountCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  accountIconActive: {
    backgroundColor: COLORS.background + '30',
  },
  accountInfo: {
    flex: 1,
    marginRight: SPACING.small,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.tiny,
  },
  accountName: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.small,
    flex: 1,
  },
  accountNameActive: {
    color: COLORS.background,
  },
  activeBadge: {
    backgroundColor: COLORS.background + '30',
    paddingHorizontal: SPACING.small,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    ...FONTS.small,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountDetailIcon: {
    marginRight: 4,
  },
  accountType: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  accountTypeActive: {
    color: COLORS.background + 'DD',
  },
  accountAction: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginTop: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addAccountIcon: {
    marginRight: SPACING.base,
  },
  addAccountText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.small,
    borderRadius: SIZES.borderRadius.small,
    marginTop: SPACING.base,
    gap: SPACING.small,
  },
  infoText: {
    ...FONTS.small,
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 18,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xlarge,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.base,
    fontWeight: '600',
  },
  emptySubtext: {
    ...FONTS.small,
    color: COLORS.textTertiary,
    marginTop: SPACING.tiny,
    textAlign: 'center',
  },
});
