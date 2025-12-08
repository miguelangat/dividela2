/**
 * ExportButton.js
 *
 * Button component for exporting expense data to CSV
 * Shows loading state and success feedback
 */

import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { exportExpenses } from '../utils/csvExport';

export default function ExportButton({
  expenses,
  userDetails,
  partnerDetails,
  filters,
  categories = {},
  disabled = false,
  style,
}) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!expenses || expenses.length === 0) {
      Alert.alert(
        t('components.exportButton.noExpenses'),
        t('components.exportButton.noExpensesMessage')
      );
      return;
    }

    if (!userDetails) {
      Alert.alert(t('common.error'), t('components.exportButton.userDetailsError'));
      return;
    }

    setExporting(true);

    try {
      const result = await exportExpenses(expenses, userDetails, partnerDetails, categories, {
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      });

      Alert.alert(
        t('components.exportButton.successTitle'),
        t(result.expenseCount !== 1 ? 'components.exportButton.successMessage_plural' : 'components.exportButton.successMessage', { count: result.expenseCount, filename: result.filename }),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        t('components.exportButton.failedTitle'),
        error.message || t('components.exportButton.failedMessage')
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={handleExport}
      disabled={disabled || exporting}
      activeOpacity={0.7}
    >
      {exporting ? (
        <ActivityIndicator size="small" color={COLORS.background} />
      ) : (
        <Ionicons name="download-outline" size={20} color={COLORS.background} />
      )}
      <Text style={styles.buttonText}>
        {exporting ? t('components.exportButton.exporting') : t('components.exportButton.exportToCsv')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.large,
    borderRadius: 12,
    gap: SPACING.small,
  },
  buttonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  buttonText: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
});
