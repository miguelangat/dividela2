/**
 * CoreSetupScreen.js
 *
 * Multi-step onboarding wizard for new couples
 * Step 1: Currency + Notifications (essentials)
 * Step 2: Fiscal Year (calendar settings)
 * Step 3: Budget (optional, can skip)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { initializeCoupleSettings } from '../../services/coupleSettingsService';
import { initializeBudgetForMonth } from '../../services/budgetService';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import CurrencyPicker from '../../components/CurrencyPicker';
import ToggleRow from '../../components/ToggleRow';
import { getCurrencyInfo, DEFAULT_CURRENCY } from '../../constants/currencies';
import { DEFAULT_CATEGORIES } from '../../constants/defaultCategories';

const TOTAL_STEPS = 3;

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

const COMMON_ICONS = ['🍔', '🛒', '🚗', '🏠', '🎉', '💡', '✈️', '🏥', '📚', '👕', '💊', '🎬', '🏋️', '🐕', '👶', '💻'];

export default function CoreSetupScreen({ navigation }) {
  const { userDetails } = useAuth();
  const { t } = useTranslation();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Currency & Notifications
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCY);
  const [notifications, setNotifications] = useState({
    emailEnabled: true,
    monthlyBudgetAlert: true,
    savingsGoalMilestone: true,
    partnerActivity: true,
  });

  // Step 2: Fiscal year state
  const [selectedType, setSelectedType] = useState('calendar');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  // Step 3: Budget state
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [categories, setCategories] = useState(() => {
    return Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => ({
      key,
      name: cat.name,
      icon: cat.icon,
      amount: 0,
    }));
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('💡');
  const [editingAmount, setEditingAmount] = useState(null);
  const [tempAmount, setTempAmount] = useState('');

  const [loading, setLoading] = useState(false);

  // Get currency symbol for display
  const currencyInfo = getCurrencyInfo(selectedCurrency);
  const currencySymbol = currencyInfo?.symbol || '$';

  // Calculate totals for budget
  const totalAllocated = categories.reduce((sum, cat) => sum + (cat.amount || 0), 0);
  const incomeValue = parseFloat(monthlyIncome) || 0;

  // Toggle notification setting
  const toggleNotification = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Auto-correct day when month changes
  useEffect(() => {
    const maxDaysInMonth = selectedMonth === 2 ? 28 : new Date(2023, selectedMonth, 0).getDate();
    if (selectedDay > maxDaysInMonth) {
      setSelectedDay(maxDaysInMonth);
    }
  }, [selectedMonth]);

  // Get days in selected month
  const getDaysInMonth = () => {
    if (selectedMonth === 2) return 28;
    return new Date(2023, selectedMonth, 0).getDate();
  };

  const daysArray = Array.from({ length: getDaysInMonth() }, (_, i) => i + 1);

  // Category management functions
  const handleDeleteCategory = (key) => {
    setCategories(prev => prev.filter(cat => cat.key !== key));
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const key = newCategoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const newCategory = {
        key: `custom_${key}_${Date.now()}`,
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        amount: 0,
      };
      setCategories(prev => [...prev, newCategory]);
      setNewCategoryName('');
      setNewCategoryIcon('💡');
      setShowAddModal(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.icon);
    setShowEditModal(true);
  };

  const handleSaveEditCategory = () => {
    if (editingCategory && newCategoryName.trim()) {
      setCategories(prev => prev.map(cat =>
        cat.key === editingCategory.key
          ? { ...cat, name: newCategoryName.trim(), icon: newCategoryIcon }
          : cat
      ));
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryIcon('💡');
      setShowEditModal(false);
    }
  };

  const handleAmountPress = (category) => {
    setEditingAmount(category.key);
    setTempAmount(category.amount > 0 ? category.amount.toString() : '');
  };

  const handleAmountBlur = (key) => {
    const amount = parseFloat(tempAmount) || 0;
    setCategories(prev => prev.map(cat =>
      cat.key === key ? { ...cat, amount } : cat
    ));
    setEditingAmount(null);
    setTempAmount('');
  };

  // Navigation between steps
  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Skip budget and finish
  const handleSkipBudget = async () => {
    await handleFinish(true);
  };

  // Final submission
  const handleFinish = async (skipBudget = false) => {
    console.log('=== handleFinish called ===', { skipBudget, currentStep, loading });
    try {
      setLoading(true);
      console.log('Loading set to true');

      if (!userDetails?.coupleId) {
        console.error('No couple ID found!');
        throw new Error('No couple ID found');
      }
      console.log('coupleId:', userDetails.coupleId);

      // Validate fiscal year date if custom
      if (selectedType === 'custom') {
        const maxDaysInMonth = selectedMonth === 2 ? 28 : new Date(2023, selectedMonth, 0).getDate();
        if (selectedDay > maxDaysInMonth) {
          Alert.alert(
            t('common.error'),
            t('coreSetup.errors.invalidDate', { month: MONTHS[selectedMonth - 1].label, days: maxDaysInMonth })
          );
          setLoading(false);
          return;
        }
      }

      // Build settings object
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
          partnerActivity: notifications.partnerActivity,
        },
        coreSetupComplete: true,
        coreSetupCompletedAt: new Date(),
      };

      // Save couple settings
      console.log('Saving couple settings with coreSetupComplete: true');
      await initializeCoupleSettings(userDetails.coupleId, settings);
      console.log('Couple settings saved successfully');

      // If budget was configured (not skipped and has allocations), save it
      if (!skipBudget && totalAllocated > 0) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const categoryBudgets = {};
        categories.forEach(cat => {
          if (cat.amount > 0) {
            categoryBudgets[cat.key] = cat.amount;
          }
        });

        if (Object.keys(categoryBudgets).length > 0) {
          const categoriesForBudget = {};
          categories.forEach(cat => {
            categoriesForBudget[cat.key] = {
              name: cat.name,
              icon: cat.icon,
              defaultBudget: cat.amount,
            };
          });

          await initializeBudgetForMonth(
            userDetails.coupleId,
            categoriesForBudget,
            month,
            year,
            {
              currency: selectedCurrency,
              complexity: 'simple',
              onboardingMode: 'core_setup',
            }
          );
        }
      }

      console.log('Core setup completed successfully');

      // On web, force a page reload to ensure clean navigation state
      // React Navigation on web sometimes doesn't properly switch stacks
      if (Platform.OS === 'web') {
        console.log('Web platform detected - reloading page for clean navigation');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
      // On native, the AppNavigator uses conditional rendering based on coreSetupComplete
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(
        t('common.error'),
        t('coreSetup.errors.saveFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  // Step indicator component
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepDot,
            currentStep >= step && styles.stepDotActive,
            currentStep === step && styles.stepDotCurrent,
          ]}>
            {currentStep > step ? (
              <MaterialCommunityIcons name="check" size={14} color={COLORS.textWhite} />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}>{step}</Text>
            )}
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive,
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  // Get step title and subtitle
  const getStepInfo = () => {
    switch (currentStep) {
      case 1:
        return {
          icon: 'cog',
          title: t('coreSetup.step1.title', 'Essentials'),
          subtitle: t('coreSetup.step1.subtitle', 'Currency and notification preferences'),
        };
      case 2:
        return {
          icon: 'calendar-month',
          title: t('coreSetup.step2.title', 'Calendar'),
          subtitle: t('coreSetup.step2.subtitle', 'When does your budget year start?'),
        };
      case 3:
        return {
          icon: 'chart-pie',
          title: t('coreSetup.step3.title', 'Budget'),
          subtitle: t('coreSetup.step3.subtitle', 'Set up your spending categories'),
        };
      default:
        return { icon: 'cog', title: '', subtitle: '' };
    }
  };

  const stepInfo = getStepInfo();

  // Render Step 1 Content: Currency + Notifications (no ScrollView wrapper)
  const renderStep1Content = () => (
    <>
      {/* Currency Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <MaterialCommunityIcons name="wallet-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>{t('coreSetup.currency.title', 'Primary Currency')}</Text>
            <Text style={styles.sectionDescription}>
              {t('coreSetup.currency.description', 'Choose the currency for tracking expenses')}
            </Text>
          </View>
        </View>
        <CurrencyPicker
          selectedCurrency={selectedCurrency}
          onSelect={setSelectedCurrency}
          label=""
        />
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>{t('coreSetup.notifications.title', 'Notifications')}</Text>
            <Text style={styles.sectionDescription}>
              {t('coreSetup.notifications.description', 'Stay informed about your budget')}
            </Text>
          </View>
        </View>

        <View style={styles.toggleContainer}>
          <ToggleRow
            label={t('coreSetup.notifications.emailAlerts', 'Email Alerts')}
            description={t('coreSetup.notifications.emailAlertsDesc', 'Budget warnings via email')}
            value={notifications.emailEnabled}
            onToggle={() => toggleNotification('emailEnabled')}
          />
          <ToggleRow
            label={t('coreSetup.notifications.budgetAlerts', 'Budget Alerts')}
            description={t('coreSetup.notifications.budgetAlertsDesc', 'Alerts when nearing limits')}
            value={notifications.monthlyBudgetAlert}
            onToggle={() => toggleNotification('monthlyBudgetAlert')}
          />
          <ToggleRow
            label={t('coreSetup.notifications.milestones', 'Milestones')}
            description={t('coreSetup.notifications.milestonesDesc', 'Celebrate savings goals')}
            value={notifications.savingsGoalMilestone}
            onToggle={() => toggleNotification('savingsGoalMilestone')}
          />
          <ToggleRow
            label={t('coreSetup.notifications.partnerActivity', 'Partner Activity')}
            description={t('coreSetup.notifications.partnerActivityDesc', 'Notified when partner adds expenses')}
            value={notifications.partnerActivity}
            onToggle={() => toggleNotification('partnerActivity')}
            showBorder={false}
          />
        </View>
      </View>
    </>
  );

  // Render Step 2 Content: Fiscal Year (no ScrollView wrapper)
  const renderStep2Content = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <MaterialCommunityIcons name="calendar-month" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{t('coreSetup.fiscalYear.title', 'Fiscal Year')}</Text>
          <Text style={styles.sectionDescription}>
            {t('coreSetup.fiscalYear.description', 'When does your budget year start?')}
          </Text>
        </View>
      </View>

      {/* Calendar Year Option */}
      <TouchableOpacity
        style={[styles.optionCard, selectedType === 'calendar' && styles.optionCardSelected]}
        onPress={() => setSelectedType('calendar')}
      >
        <View style={styles.optionHeader}>
          <View style={styles.radioOuter}>
            {selectedType === 'calendar' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{t('coreSetup.fiscalYear.calendar', 'Calendar Year')}</Text>
            <Text style={styles.optionDescription}>January 1 - December 31</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Custom Fiscal Year Option */}
      <TouchableOpacity
        style={[styles.optionCard, selectedType === 'custom' && styles.optionCardSelected]}
        onPress={() => setSelectedType('custom')}
      >
        <View style={styles.optionHeader}>
          <View style={styles.radioOuter}>
            {selectedType === 'custom' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{t('coreSetup.fiscalYear.custom', 'Custom Start Date')}</Text>
            <Text style={styles.optionDescription}>{t('coreSetup.fiscalYear.customDesc', 'Choose your own start date')}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Custom Date Selection */}
      {selectedType === 'custom' && (
        <View style={styles.customDateContainer}>
          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>{t('coreSetup.fiscalYear.month', 'Month')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {MONTHS.map((month) => (
                <TouchableOpacity
                  key={month.value}
                  style={[styles.monthButton, selectedMonth === month.value && styles.monthButtonSelected]}
                  onPress={() => setSelectedMonth(month.value)}
                >
                  <Text style={[styles.monthButtonText, selectedMonth === month.value && styles.monthButtonTextSelected]}>
                    {month.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>{t('coreSetup.fiscalYear.day', 'Day')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {daysArray.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayButton, selectedDay === day && styles.dayButtonSelected]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextSelected]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>{t('coreSetup.fiscalYear.startsOn', 'Your fiscal year starts on:')}</Text>
            <Text style={styles.previewDate}>
              {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedDay}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  // Render Step 3 Content: Budget (no ScrollView wrapper)
  const renderStep3Content = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconContainer}>
          <MaterialCommunityIcons name="chart-pie" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>
            {t('coreSetup.budget.title', 'Monthly Budget')}
            <Text style={styles.optionalBadge}> ({t('common.optional', 'Optional')})</Text>
          </Text>
          <Text style={styles.sectionDescription}>
            {t('coreSetup.budget.description', 'Set up your spending categories')}
          </Text>
        </View>
      </View>

      {/* Monthly Income Input */}
      <View style={styles.incomeContainer}>
        <Text style={styles.incomeLabel}>{t('coreSetup.budget.monthlyIncome', 'Monthly Income')}</Text>
        <View style={styles.incomeInputContainer}>
          <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
          <TextInput
            style={styles.incomeInput}
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            placeholder="0"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Categories Header */}
      <View style={styles.categoriesHeader}>
        <Text style={styles.categoriesLabel}>
          {t('coreSetup.budget.categories', 'Customize your categories:')}
        </Text>
      </View>

      {/* Category List */}
      <View style={styles.categoriesList}>
        {categories.map((category) => (
          <View key={category.key} style={styles.categoryRow}>
            <TouchableOpacity
              style={styles.categoryInfo}
              onPress={() => handleEditCategory(category)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
            </TouchableOpacity>

            {editingAmount === category.key ? (
              <View style={styles.amountInputContainer}>
                <Text style={styles.amountPrefix}>{currencySymbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={tempAmount}
                  onChangeText={setTempAmount}
                  onBlur={() => handleAmountBlur(category.key)}
                  keyboardType="numeric"
                  autoFocus
                  selectTextOnFocus
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.amountButton}
                onPress={() => handleAmountPress(category)}
              >
                <Text style={styles.amountText}>
                  {currencySymbol}{(category.amount || 0).toLocaleString()}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteCategory(category.key)}
            >
              <MaterialCommunityIcons name="close" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Category Button */}
        <TouchableOpacity
          style={styles.addCategoryButton}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />
          <Text style={styles.addCategoryText}>
            {t('coreSetup.budget.addCategory', 'Add Category')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Budget Summary */}
      <View style={styles.budgetSummary}>
        <Text style={styles.summaryLabel}>{t('coreSetup.budget.allocated', 'Allocated:')}</Text>
        <Text style={[
          styles.summaryAmount,
          totalAllocated > incomeValue && incomeValue > 0 && styles.summaryAmountOver
        ]}>
          {currencySymbol}{totalAllocated.toLocaleString()} / {currencySymbol}{incomeValue.toLocaleString()}
        </Text>
      </View>
    </View>
  );

  // Render category modal (used for both add and edit)
  const renderCategoryModal = (isEdit = false) => {
    const visible = isEdit ? showEditModal : showAddModal;
    const onClose = () => {
      if (isEdit) {
        setShowEditModal(false);
        setEditingCategory(null);
      } else {
        setShowAddModal(false);
      }
      setNewCategoryName('');
      setNewCategoryIcon('💡');
    };
    const onSave = isEdit ? handleSaveEditCategory : handleAddCategory;
    const title = isEdit
      ? t('coreSetup.budget.editCategory', 'Edit Category')
      : t('coreSetup.budget.addCategory', 'Add Category');

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>

            {/* Icon Selector */}
            <Text style={styles.modalLabel}>{t('coreSetup.budget.chooseIcon', 'Choose an icon')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.iconScrollView}
              contentContainerStyle={styles.iconGrid}
            >
              {COMMON_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    newCategoryIcon === icon && styles.iconOptionSelected,
                  ]}
                  onPress={() => setNewCategoryIcon(icon)}
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Name Input */}
            <Text style={styles.modalLabel}>{t('coreSetup.budget.categoryName', 'Category name')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder={t('coreSetup.budget.categoryNamePlaceholder', 'e.g., Health & Fitness')}
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
            />

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
                <Text style={styles.modalCancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, !newCategoryName.trim() && styles.buttonDisabled]}
                onPress={onSave}
                disabled={!newCategoryName.trim()}
              >
                <Text style={styles.modalSaveButtonText}>
                  {isEdit ? t('common.save', 'Save') : t('common.add', 'Add')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header - OUTSIDE ScrollView (critical for web) */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Step Indicator */}
        {renderStepIndicator()}

        <View style={styles.headerIconContainer}>
          <MaterialCommunityIcons name={stepInfo.icon} size={40} color={COLORS.textWhite} />
        </View>
        <Text style={styles.headerTitle}>{stepInfo.title}</Text>
        <Text style={styles.headerSubtitle}>{stepInfo.subtitle}</Text>
      </LinearGradient>

      {/* Form Card - flexGrow/flexBasis for web ScrollView fix */}
      <View style={styles.formCard}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1Content()}
          {currentStep === 2 && renderStep2Content()}
          {currentStep === 3 && renderStep3Content()}
        </ScrollView>
      </View>

      {/* Bottom Actions - Absolute positioned like FiscalYearSetupScreen */}
      <View style={styles.bottomActions} pointerEvents="auto">
        {/* Back button (steps 2 and 3) */}
        {currentStep > 1 && (
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={handleBack}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.primary} />
            <Text style={styles.backButtonText}>{t('common.back', 'Back')}</Text>
          </Pressable>
        )}

        {/* Spacer when no back button */}
        {currentStep === 1 && <View style={styles.spacer} />}

        {/* Main action buttons */}
        <View style={styles.mainActions}>
          {/* Skip budget link (step 3 only) */}
          {currentStep === 3 && (
            <Pressable
              style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}
              onPress={() => {
                console.log('=== SKIP BUTTON PRESSED ===');
                handleSkipBudget();
              }}
              disabled={loading}
            >
              <Text style={styles.skipButtonText}>{t('coreSetup.budget.skip', 'Skip')}</Text>
            </Pressable>
          )}

          {/* Continue/Finish button - Using Pressable for better web compatibility */}
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              loading && styles.continueButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              console.log('=== BUTTON PRESSED ===', { currentStep, TOTAL_STEPS, loading });
              if (currentStep === TOTAL_STEPS) {
                handleFinish(false);
              } else {
                handleNext();
              }
            }}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? [COLORS.textTertiary, COLORS.textTertiary] : [COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueButtonGradient}
              pointerEvents="none"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textWhite} size="small" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {currentStep === TOTAL_STEPS
                      ? t('coreSetup.getStarted', 'Get Started')
                      : t('common.continue', 'Continue')}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color={COLORS.textWhite} />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* Modals */}
      {renderCategoryModal(false)}
      {renderCategoryModal(true)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative', // Required for absolute positioned children on web
    backgroundColor: COLORS.gradientStart, // Match gradient for seamless look
    // Web-specific: ensure container doesn't block pointer events to children
    ...(Platform.OS === 'web' ? { overflow: 'visible' } : {}),
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxlarge,
    paddingHorizontal: SPACING.screenPadding,
    alignItems: 'center',
  },
  formCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: SIZES.borderRadius.xlarge,
    borderTopRightRadius: SIZES.borderRadius.xlarge,
    marginTop: -SPACING.large,
    overflow: 'hidden', // Critical for web scrolling
    zIndex: 1, // Lower than bottomActions
    // Ensure formCard doesn't capture events meant for bottomActions
    ...(Platform.OS === 'web' ? { pointerEvents: 'auto' } : {}),
    ...SHADOWS.large,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.large,
    paddingBottom: 120, // Space for absolute-positioned bottom actions
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.large,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  stepDotCurrent: {
    backgroundColor: COLORS.textWhite,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: FONTS.weights.bold,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  stepNumberActive: {
    color: COLORS.primary,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: SPACING.small,
    borderRadius: 2,
  },
  stepLineActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  headerIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
  },
  headerTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.tiny,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 280,
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
  optionalBadge: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.regular,
    color: COLORS.textTertiary,
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
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
  },
  customDateContainer: {
    marginTop: SPACING.base,
  },
  pickerSection: {
    marginBottom: SPACING.base,
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
  },
  // Budget section styles
  incomeContainer: {
    marginBottom: SPACING.large,
  },
  incomeLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  incomeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
  },
  currencyPrefix: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginRight: SPACING.small,
  },
  incomeInput: {
    flex: 1,
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    paddingVertical: SPACING.base,
  },
  categoriesHeader: {
    marginBottom: SPACING.small,
  },
  categoriesLabel: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  categoriesList: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: SPACING.small,
  },
  categoryName: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    flex: 1,
  },
  amountButton: {
    paddingVertical: SPACING.tiny,
    paddingHorizontal: SPACING.small,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.small,
    minWidth: 80,
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: SIZES.borderRadius.small,
    paddingHorizontal: SPACING.small,
    minWidth: 80,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  amountPrefix: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
  },
  amountInput: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
    paddingVertical: SPACING.tiny,
    minWidth: 50,
    textAlign: 'right',
  },
  deleteButton: {
    padding: SPACING.small,
    marginLeft: SPACING.small,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.base,
    gap: SPACING.small,
  },
  addCategoryText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.primary,
  },
  budgetSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.base,
    padding: SPACING.base,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
  },
  summaryLabel: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
  summaryAmount: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  summaryAmountOver: {
    color: COLORS.error,
  },
  // Bottom actions - using absolute positioning like FiscalYearSetupScreen
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999, // Very high z-index to ensure buttons are on top
    elevation: 10, // For Android
    backgroundColor: COLORS.background,
    padding: SPACING.large,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.large,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.base,
    // Web-specific: create new stacking context
    ...(Platform.OS === 'web' ? { isolation: 'isolate' } : {}),
    ...SHADOWS.medium,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    paddingRight: SPACING.base,
    gap: SPACING.tiny,
  },
  backButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
  spacer: {
    width: 80,
  },
  mainActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
  },
  skipButton: {
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    cursor: 'pointer', // For web
  },
  skipButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  continueButton: {
    borderRadius: SIZES.borderRadius.medium,
    overflow: 'hidden',
    cursor: 'pointer', // For web
    ...SHADOWS.small,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonGradient: {
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.small,
  },
  continueButtonText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.bold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.xlarge,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.large,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  iconScrollView: {
    marginBottom: SPACING.base,
  },
  iconGrid: {
    flexDirection: 'row',
    gap: SPACING.tiny,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: SIZES.borderRadius.small,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '30',
  },
  iconOptionText: {
    fontSize: 24,
  },
  modalInput: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.large,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.medium,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: SPACING.buttonPadding,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: SPACING.buttonPadding,
    borderRadius: SIZES.borderRadius.medium,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
