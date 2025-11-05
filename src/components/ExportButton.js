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
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { exportExpenses } from '../utils/csvExport';

export default function ExportButton({
  expenses,
  userDetails,
  partnerDetails,
  filters,
  disabled = false,
  style,
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!expenses || expenses.length === 0) {
      Alert.alert(
        'No Expenses',
        'There are no expenses to export. Add some expenses first!'
      );
      return;
    }

    if (!userDetails) {
      Alert.alert('Error', 'User details not available');
      return;
    }

    setExporting(true);

    try {
      const result = await exportExpenses(expenses, userDetails, partnerDetails, {
        startDate: filters?.startDate,
        endDate: filters?.endDate,
      });

      Alert.alert(
        'Export Successful!',
        `Exported ${result.expenseCount} expense${result.expenseCount !== 1 ? 's' : ''} to ${result.filename}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        error.message || 'Failed to export expenses. Please try again.'
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
        {exporting ? 'Exporting...' : 'Export to CSV'}
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
