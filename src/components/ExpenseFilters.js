/**
 * ExpenseFilters.js
 *
 * Comprehensive filter panel for expense reports
 * Includes date range, category, settlement status, and payer filters
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { useBudget } from '../contexts/BudgetContext';
import DateRangePicker, { PRESETS } from './DateRangePicker';
import { getDefaultFilters, countActiveFilters } from '../utils/reportFilters';

export default function ExpenseFilters({ onFiltersChange, initialFilters }) {
  const { t } = useTranslation();
  const { categories } = useBudget();
  const [expanded, setExpanded] = useState(false);
  const [filters, setFilters] = useState(initialFilters || getDefaultFilters());

  // Convert categories object to array for rendering
  const categoryArray = Object.entries(categories).map(([key, category]) => ({
    id: key,
    key: key,
    name: category.name,
    icon: category.icon,
    color: COLORS.primary, // Use primary color for all custom categories
  }));

  // Notify parent when filters change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters]);

  const handleDateRangeChange = ({ startDate, endDate, preset }) => {
    setFilters(prev => ({
      ...prev,
      startDate,
      endDate,
    }));
  };

  const handleCategoryToggle = (categoryId) => {
    setFilters(prev => {
      const categories = prev.categories || [];
      const isSelected = categories.includes(categoryId);

      return {
        ...prev,
        categories: isSelected
          ? categories.filter(id => id !== categoryId)
          : [...categories, categoryId],
      };
    });
  };

  const handleSettlementStatusChange = (status) => {
    setFilters(prev => ({
      ...prev,
      settlementStatus: status,
    }));
  };

  const handlePaidByChange = (paidBy) => {
    setFilters(prev => ({
      ...prev,
      paidBy,
    }));
  };

  const handleClearAll = () => {
    const defaultFilters = getDefaultFilters();
    // Keep the default date range as This Month instead of all time
    defaultFilters.settlementStatus = 'all';
    setFilters(defaultFilters);
  };

  const activeFilterCount = countActiveFilters(filters);

  return (
    <View style={styles.container}>
      {/* Toggle Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="filter" size={20} color={COLORS.primary} />
          <Text style={styles.headerText}>{t('components.expenseFilters.filters')}</Text>
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {/* Filter Options */}
      {expanded && (
        <View style={styles.filtersContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('components.expenseFilters.dateRange')}</Text>
              <DateRangePicker
                onDateRangeChange={handleDateRangeChange}
                initialPreset={PRESETS.THIS_MONTH}
              />
            </View>

            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('components.expenseFilters.categories')}</Text>
              <View style={styles.categoryGrid}>
                {categoryArray.map(category => {
                  const isSelected = filters.categories?.includes(category.key);
                  return (
                    <TouchableOpacity
                      key={category.key}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                        { borderColor: category.color },
                      ]}
                      onPress={() => handleCategoryToggle(category.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={category.color}
                          style={styles.checkmark}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Settlement Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('components.expenseFilters.settlementStatus')}</Text>
              <View style={styles.buttonGroup}>
                {['all', 'settled', 'pending'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterButton,
                      filters.settlementStatus === status && styles.filterButtonActive,
                    ]}
                    onPress={() => handleSettlementStatusChange(status)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        filters.settlementStatus === status && styles.filterButtonTextActive,
                      ]}
                    >
                      {t(`components.expenseFilters.${status}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Paid By Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('components.expenseFilters.paidBy')}</Text>
              <View style={styles.buttonGroup}>
                {[
                  { value: 'all', labelKey: 'all' },
                  { value: 'me', labelKey: 'me' },
                  { value: 'partner', labelKey: 'partner' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterButton,
                      filters.paidBy === option.value && styles.filterButtonActive,
                    ]}
                    onPress={() => handlePaidByChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        filters.paidBy === option.value && styles.filterButtonTextActive,
                      ]}
                    >
                      {t(`components.expenseFilters.${option.labelKey}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Clear All Button */}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearAll}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
                <Text style={styles.clearButtonText}>{t('components.expenseFilters.clearAllFilters')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Active Filter Chips */}
      {!expanded && activeFilterCount > 0 && (
        <ScrollView
          horizontal
          style={styles.activeFiltersScroll}
          contentContainerStyle={styles.activeFiltersContent}
          showsHorizontalScrollIndicator={false}
        >
          {filters.categories && filters.categories.length > 0 && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                {filters.categories.length} {filters.categories.length === 1 ? t('components.expenseFilters.category') : t('components.expenseFilters.category_plural')}
              </Text>
            </View>
          )}

          {filters.settlementStatus && filters.settlementStatus !== 'all' && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                {filters.settlementStatus === 'settled' ? t('components.expenseFilters.settled') : t('components.expenseFilters.pending')}
              </Text>
            </View>
          )}

          {filters.paidBy && filters.paidBy !== 'all' && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                {filters.paidBy === 'me' ? t('components.expenseFilters.paidByMe') : t('components.expenseFilters.paidByPartner')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.base,
    borderRadius: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  headerText: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.tiny,
  },
  badgeText: {
    ...FONTS.small,
    fontSize: 12,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginTop: SPACING.small,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    maxHeight: 400,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.small,
  },
  filterSection: {
    marginBottom: SPACING.large,
  },
  filterLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.small,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: COLORS.background,
    gap: SPACING.tiny,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryChipText: {
    ...FONTS.small,
    color: COLORS.text,
  },
  categoryChipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: SPACING.tiny,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.small,
  },
  filterButton: {
    flex: 1,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.small,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.base,
    gap: SPACING.small,
    marginTop: SPACING.small,
  },
  clearButtonText: {
    ...FONTS.body,
    color: COLORS.error,
    fontWeight: '600',
  },
  activeFiltersScroll: {
    marginTop: SPACING.small,
  },
  activeFiltersContent: {
    gap: SPACING.small,
    paddingHorizontal: SPACING.tiny,
  },
  activeFilterChip: {
    backgroundColor: COLORS.primary + '15',
    paddingVertical: SPACING.tiny,
    paddingHorizontal: SPACING.base,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  activeFilterChipText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
