// src/components/SplitPreviewCard.js
// Real-time split calculation preview component

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { formatCurrency, roundCurrency } from '../utils/currencyUtils';

export default function SplitPreviewCard({
  amount,
  currency,
  splitType,
  userPercentage = 50,
  paidBy,
  userName = 'You',
  partnerName = 'Partner',
  userId,
  style,
}) {
  const { t } = useTranslation();
  // Calculate split amounts using useMemo for performance
  const splitAmounts = useMemo(() => {
    if (!amount || amount <= 0) {
      return { userAmount: 0, partnerAmount: 0 };
    }

    let userAmount, partnerAmount;

    if (splitType === 'equal') {
      userAmount = amount / 2;
      partnerAmount = amount / 2;
    } else if (splitType === 'full') {
      // If user paid, they get 100%, otherwise 0%
      if (paidBy === userId) {
        userAmount = amount;
        partnerAmount = 0;
      } else {
        userAmount = 0;
        partnerAmount = amount;
      }
    } else if (splitType === 'custom') {
      userAmount = (amount * userPercentage) / 100;
      partnerAmount = (amount * (100 - userPercentage)) / 100;
    }

    return {
      userAmount: roundCurrency(userAmount, currency),
      partnerAmount: roundCurrency(partnerAmount, currency),
    };
  }, [amount, splitType, userPercentage, paidBy, userId, currency]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💡</Text>
        <Text style={styles.headerText}>{t('components.splitPreview.title')}</Text>
      </View>

      <View style={styles.divider} />

      {/* User row */}
      <View style={styles.row}>
        <View style={styles.nameContainer}>
          <Ionicons name="person" size={16} color={COLORS.primary} />
          <Text style={styles.name}>{userName}</Text>
        </View>
        <Text style={styles.amount}>
          {formatCurrency(splitAmounts.userAmount, currency)}
        </Text>
      </View>

      {/* Partner row */}
      <View style={styles.row}>
        <View style={styles.nameContainer}>
          <Ionicons name="person" size={16} color={COLORS.primary} />
          <Text style={styles.name}>{partnerName}</Text>
        </View>
        <Text style={styles.amount}>
          {formatCurrency(splitAmounts.partnerAmount, currency)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.splitPreviewBackground,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: SPACING.base,
    marginTop: SPACING.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  headerIcon: {
    fontSize: 16,
    marginRight: SPACING.tiny,
  },
  headerText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.primary + '20',
    marginBottom: SPACING.small,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.small,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  name: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    fontSize: 14,
  },
  amount: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.primary,
    fontSize: 16,
  },
});
