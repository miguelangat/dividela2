/**
 * FiscalYearSetupScreen.js
 *
 * Couple setup screen shown during onboarding
 * Allows users to set currency, fiscal year, and notification preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { initializeCoupleSettings } from '../../services/coupleSettingsService';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS, COMMON_STYLES } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import CurrencyPicker from '../../components/CurrencyPicker';
import ToggleRow from '../../components/ToggleRow';
import { getCurrencyInfo, DEFAULT_CURRENCY } from '../../constants/currencies';

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
  const { t } = useTranslation();

  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCY);

  // Fiscal year state
  const [selectedType, setSelectedType] = useState('calendar'); // 'calendar' or 'custom'
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    emailEnabled: true,
    monthlyBudgetAlert: true,
    savingsGoalMilestone: true,
  });

  const [loading, setLoading] = useState(false);

  // Toggle notification setting
  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

      // Get currency info for selected currency
      const currencyInfo = getCurrencyInfo(selectedCurrency);

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
          budgetCurrency: selectedCurrency,
          currencySymbol: currencyInfo.symbol,
          currencyLocale: currencyInfo.locale,
        },
        notifications: {
          emailEnabled: notifications.emailEnabled,
          monthlyBudgetAlert: notifications.monthlyBudgetAlert,
          savingsGoalMilestone: notifications.savingsGoalMilestone,
          fiscalYearEndReminder: true,
          partnerActivity: false,
        },
      };

      await initializeCoupleSettings(userDetails.coupleId, settings);

      console.log('✅ Fiscal year settings initialized');

      // Navigate to main app
      navigation.replace('MainTabs');
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

      // Initialize with user-selected currency but default fiscal year
      const currencyInfo = getCurrencyInfo(selectedCurrency);

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
          budgetCurrency: selectedCurrency,
          currencySymbol: currencyInfo.symbol,
          currencyLocale: currencyInfo.locale,
        },
        notifications: {
          emailEnabled: notifications.emailEnabled,
          monthlyBudgetAlert: notifications.monthlyBudgetAlert,
          savingsGoalMilestone: notifications.savingsGoalMilestone,
          fiscalYearEndReminder: true,
          partnerActivity: false,
        },
      };

      await initializeCoupleSettings(userDetails.coupleId, settings);

      console.log('✅ Settings initialized with selected currency');

      // Navigate to main app
      navigation.replace('MainTabs');
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
      {/* Gradient Header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Icon */}
        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons
            name="cog"
            size={50}
            color={COLORS.textWhite}
          />
        </View>

        {/* Title */}
        <Text style={styles.headerTitle}>{t('setup.title', 'Set Up Your Account')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('setup.subtitle', 'Configure your preferences to get started')}
        </Text>
      </LinearGradient>

      {/* Form Card */}
      <View style={styles.formCard}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Currency Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="wallet-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>{t('setup.currencySection', 'Primary Currency')}</Text>
                <Text style={styles.sectionDescription}>
                  {t('setup.currencyDescription', 'Choose the currency for tracking expenses and budgets')}
                </Text>
              </View>
            </View>
            <CurrencyPicker
              selectedCurrency={selectedCurrency}
              onSelect={setSelectedCurrency}
              label=""
            />
          </View>

          {/* Fiscal Year Type Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="calendar-month" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>{t('setup.fiscalYearSection', 'Fiscal Year')}</Text>
                <Text style={styles.sectionDescription}>
                  {t('setup.fiscalYearDescription', 'When does your budget year start?')}
                </Text>
              </View>
            </View>

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
              <View style={styles.optionNoteContainer}>
                <MaterialCommunityIcons name="calendar-check" size={16} color={COLORS.textSecondary} />
                <Text style={styles.optionNote}>
                  Standard calendar year (recommended for most users)
                </Text>
              </View>
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
              <View style={styles.optionNoteContainer}>
                <MaterialCommunityIcons name="cog-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.optionNote}>
                  For custom fiscal periods (e.g., April 1 - March 31)
                </Text>
              </View>
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

          {/* Notifications Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>{t('setup.notificationsSection', 'Notifications')}</Text>
                <Text style={styles.sectionDescription}>
                  {t('setup.notificationsDescription', 'Stay informed about your budget progress')}
                </Text>
              </View>
            </View>

            <View style={styles.toggleContainer}>
              <ToggleRow
                label={t('setup.emailAlerts', 'Email Alerts')}
                description={t('setup.emailAlertsDesc', 'Budget warnings and reminders via email')}
                value={notifications.emailEnabled}
                onToggle={() => toggleNotification('emailEnabled')}
              />
              <ToggleRow
                label={t('setup.budgetAlerts', 'Budget Alerts')}
                description={t('setup.budgetAlertsDesc', 'Get notified when nearing budget limits')}
                value={notifications.monthlyBudgetAlert}
                onToggle={() => toggleNotification('monthlyBudgetAlert')}
              />
              <ToggleRow
                label={t('setup.budgetMilestones', 'Budget Milestones')}
                description={t('setup.budgetMilestonesDesc', 'Celebrate savings goals and achievements')}
                value={notifications.savingsGoalMilestone}
                onToggle={() => toggleNotification('savingsGoalMilestone')}
                showBorder={false}
              />
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {t('setup.infoText', 'You can change all these settings later from the Settings menu.')}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>{t('setup.skipButton', 'Skip Fiscal Year')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueButton, loading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? [COLORS.textTertiary, COLORS.textTertiary] : [COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textWhite} />
            ) : (
              <>
                <Text style={styles.continueButtonText}>{t('setup.continueButton', 'Get Started')}</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.textWhite} />
              </>
            )}
          </LinearGradient>
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
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxlarge * 2,
    paddingHorizontal: SPACING.screenPadding,
    borderBottomLeftRadius: SIZES.borderRadius.xlarge * 2,
    borderBottomRightRadius: SIZES.borderRadius.xlarge * 2,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.large,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.small,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.xlarge,
    marginHorizontal: SPACING.screenPadding,
    marginTop: -SPACING.xxlarge,
    marginBottom: 0,
    ...SHADOWS.large,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: SPACING.large,
    paddingBottom: 120,
  },
  section: {
    marginBottom: SPACING.xlarge,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.base,
    gap: SPACING.small,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
    paddingTop: 2,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  toggleContainer: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    paddingHorizontal: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  optionCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginBottom: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.base,
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
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  optionNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    marginLeft: 40,
  },
  optionNote: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  pickerSection: {
    marginBottom: SPACING.large,
  },
  pickerLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  horizontalScroll: {
    marginHorizontal: -SPACING.large,
    paddingHorizontal: SPACING.large,
  },
  monthButton: {
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    marginRight: SPACING.small,
    borderRadius: SIZES.borderRadius.small,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  monthButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  monthButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
  monthButtonTextSelected: {
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.semibold,
  },
  dayButton: {
    width: 44,
    height: 44,
    marginRight: SPACING.tiny,
    borderRadius: SIZES.borderRadius.small,
    backgroundColor: COLORS.background,
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
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
  dayButtonTextSelected: {
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.semibold,
  },
  previewCard: {
    backgroundColor: COLORS.success + '15',
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginTop: SPACING.base,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  previewLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  previewDate: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.success,
    marginBottom: SPACING.tiny,
  },
  previewExample: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    marginTop: SPACING.base,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    gap: SPACING.small,
  },
  infoText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.primary,
    flex: 1,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: SPACING.large,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.large,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    gap: SPACING.base,
    ...SHADOWS.medium,
  },
  skipButton: {
    flex: 1,
    paddingVertical: SPACING.buttonPadding,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SIZES.button.height,
  },
  skipButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  continueButton: {
    flex: 2,
    borderRadius: SIZES.borderRadius.medium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonGradient: {
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.large,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.small,
    minHeight: SIZES.button.height,
  },
  continueButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
});
