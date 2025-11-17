/**
 * FiscalYearSetupScreen.js
 *
 * Fiscal year configuration screen shown during onboarding
 * Allows users to set their fiscal year start date
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { initializeCoupleSettings } from '../../services/coupleSettingsService';
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../../constants/theme';

const MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

export default function FiscalYearSetupScreen({ navigation }) {
  const { user, userDetails } = useAuth();
  const [selectedType, setSelectedType] = useState('calendar'); // 'calendar' or 'custom'
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);

  // Auto-correct day when month changes to prevent invalid combinations
  useEffect(() => {
    const maxDaysInMonth = selectedMonth === 2 ? 28 : new Date(2023, selectedMonth, 0).getDate();
    if (selectedDay > maxDaysInMonth) {
      setSelectedDay(maxDaysInMonth);
    }
  }, [selectedMonth]);

  const handleContinue = async () => {
    try {
      setLoading(true);

      if (!userDetails?.coupleId) {
        throw new Error('No couple ID found');
      }

      // Validate month/day combination for custom fiscal year
      if (selectedType === 'custom') {
        // Check for invalid date combinations
        const maxDaysInMonth = selectedMonth === 2 ? 28 : new Date(2023, selectedMonth, 0).getDate();
        if (selectedDay > maxDaysInMonth) {
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          alert(`Invalid date: ${months[selectedMonth - 1]} only has ${maxDaysInMonth} days`);
          setLoading(false);
          return;
        }
      }

      const settings = {
        fiscalYear: {
          type: selectedType,
          startMonth: selectedType === 'calendar' ? 1 : selectedMonth,
          startDay: selectedType === 'calendar' ? 1 : selectedDay,
        },
        budgetPreferences: {
          trackAnnual: true,
          trackMonthly: true,
          enableVariableMonthly: true,
          enableSavingsTargets: true,
          enableAnnualSettlements: true,
          budgetCurrency: 'USD',
        },
      };

      await initializeCoupleSettings(userDetails.coupleId, settings);

      console.log('✅ Fiscal year settings initialized');

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving fiscal year settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);

      if (!userDetails?.coupleId) {
        throw new Error('No couple ID found');
      }

      // Initialize with default calendar year settings
      const settings = {
        fiscalYear: {
          type: 'calendar',
          startMonth: 1,
          startDay: 1,
        },
        budgetPreferences: {
          trackAnnual: true,
          trackMonthly: true,
          enableVariableMonthly: true,
          enableSavingsTargets: true,
          enableAnnualSettlements: true,
          budgetCurrency: 'USD',
        },
      };

      await initializeCoupleSettings(userDetails.coupleId, settings);

      console.log('✅ Default fiscal year settings initialized');

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving default settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get days in selected month with leap year handling
  const getDaysInMonth = () => {
    const year = new Date().getFullYear();
    const daysInMonth = new Date(year, selectedMonth, 0).getDate();

    // Special handling for February to prevent Feb 29 in non-leap years
    if (selectedMonth === 2) {
      // Always limit to 28 to avoid leap year issues across different years
      return 28;
    }

    return daysInMonth;
  };

  const daysArray = Array.from({ length: getDaysInMonth() }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="calendar" size={64} color={COLORS.primary} />
          <Text style={styles.title}>Set Your Fiscal Year</Text>
          <Text style={styles.subtitle}>
            Choose when your budget year starts. This helps track annual budgets and goals.
          </Text>
        </View>

        {/* Fiscal Year Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fiscal Year Period</Text>

          {/* Calendar Year Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedType === 'calendar' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedType('calendar')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.radioOuter}>
                {selectedType === 'calendar' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Calendar Year</Text>
                <Text style={styles.optionDescription}>
                  January 1 - December 31
                </Text>
              </View>
            </View>
            <Text style={styles.optionNote}>
              📅 Standard calendar year (recommended for most users)
            </Text>
          </TouchableOpacity>

          {/* Custom Fiscal Year Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedType === 'custom' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedType('custom')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.radioOuter}>
                {selectedType === 'custom' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Custom Fiscal Year</Text>
                <Text style={styles.optionDescription}>
                  Choose your own start date
                </Text>
              </View>
            </View>
            <Text style={styles.optionNote}>
              ⚙️ For custom fiscal periods (e.g., April 1 - March 31)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Date Selection (only shown if custom selected) */}
        {selectedType === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Start Date</Text>

            {/* Month Selection */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Month</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                {MONTHS.map((month) => (
                  <TouchableOpacity
                    key={month.value}
                    style={[
                      styles.monthButton,
                      selectedMonth === month.value && styles.monthButtonSelected,
                    ]}
                    onPress={() => setSelectedMonth(month.value)}
                  >
                    <Text
                      style={[
                        styles.monthButtonText,
                        selectedMonth === month.value && styles.monthButtonTextSelected,
                      ]}
                    >
                      {month.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day Selection */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Day</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
              >
                {daysArray.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      selectedDay === day && styles.dayButtonSelected,
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selectedDay === day && styles.dayButtonTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Selected Date Preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Your fiscal year starts on:</Text>
              <Text style={styles.previewDate}>
                {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedDay}
              </Text>
              <Text style={styles.previewExample}>
                Example: FY2025 runs from {MONTHS.find(m => m.value === selectedMonth)?.short} {selectedDay}, 2025 to {MONTHS.find(m => m.value === selectedMonth)?.short} {selectedDay - 1}, 2026
              </Text>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            You can change this later in Settings. Your fiscal year helps organize annual budgets and reports.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, loading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  optionNote: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  pickerSection: {
    marginBottom: SPACING.lg,
  },
  pickerLabel: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  horizontalScroll: {
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  monthButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  monthButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  monthButtonText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  monthButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  dayButton: {
    width: 44,
    height: 44,
    marginRight: SPACING.xs,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  dayButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: COLORS.successLight,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  previewLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  previewDate: {
    ...FONTS.h3,
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  previewExample: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.md,
  },
  infoText: {
    ...FONTS.caption,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  skipButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    ...FONTS.button,
    color: COLORS.primary,
  },
  continueButton: {
    flex: 2,
    ...COMMON_STYLES.primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
