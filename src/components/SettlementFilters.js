/**
 * SettlementFilters.js
 *
 * Collapsible filter panel for settlements
 * Allows filtering by date range, amount, direction, budget performance, and notes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import AmountRangePicker from './AmountRangePicker';
import DateRangePicker from './DateRangePicker';
import {
  countActiveFilters,
  getActiveFilterDescriptions,
} from '../utils/settlementFilters';

export default function SettlementFilters({ onFiltersChange, initialFilters }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const activeCount = countActiveFilters(filters);
  const activeDescriptions = getActiveFilterDescriptions(filters);

  const updateFilters = (updates) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    const defaultFilters = {
      startDate: null,
      endDate: null,
      minAmount: null,
      maxAmount: null,
      direction: 'all',
      budgetPerformance: 'all',
      searchNotes: '',
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const handleDateRangeChange = (startDate, endDate) => {
    updateFilters({ startDate, endDate });
  };

  const handleAmountRangeChange = (minAmount, maxAmount) => {
    updateFilters({ minAmount, maxAmount });
  };

  const handleDirectionChange = (direction) => {
    updateFilters({ direction });
  };

  const handleBudgetPerformanceChange = (budgetPerformance) => {
    updateFilters({ budgetPerformance });
  };

  const handleSearchNotesChange = (searchNotes) => {
    updateFilters({ searchNotes });
  };

  const removeFilter = (filterKey) => {
    const updates = {};
    switch (filterKey) {
      case 'dateRange':
        updates.startDate = null;
        updates.endDate = null;
        break;
      case 'amountRange':
        updates.minAmount = null;
        updates.maxAmount = null;
        break;
      case 'direction':
        updates.direction = 'all';
        break;
      case 'budgetPerformance':
        updates.budgetPerformance = 'all';
        break;
      case 'searchNotes':
        updates.searchNotes = '';
        break;
    }
    updateFilters(updates);
  };

  return (
    <View style={styles.container}>
      {/* Filter Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name="filter"
            size={20}
            color={activeCount > 0 ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.headerTitle,
              activeCount > 0 && { color: COLORS.primary, fontWeight: '600' },
            ]}
          >
            Filters
          </Text>
          {activeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {/* Active Filters (when collapsed) */}
      {!isExpanded && activeCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersContainer}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {activeDescriptions.map((desc) => (
            <TouchableOpacity
              key={desc.key}
              style={styles.activeFilterChip}
              onPress={() => removeFilter(desc.key)}
            >
              <Text style={styles.activeFilterText}>{desc.label}</Text>
              <Ionicons name="close-circle" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Filter Panel (when expanded) */}
      {isExpanded && (
        <View style={styles.filtersPanel}>
          {/* Date Range Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date Range</Text>
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onDateRangeChange={handleDateRangeChange}
            />
          </View>

          {/* Amount Range Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount Range</Text>
            <AmountRangePicker
              minAmount={filters.minAmount}
              maxAmount={filters.maxAmount}
              onRangeChange={handleAmountRangeChange}
            />
          </View>

          {/* Settlement Direction Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settlement Direction</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.button,
                  filters.direction === 'all' && styles.buttonSelected,
                ]}
                onPress={() => handleDirectionChange('all')}
              >
                <Text
                  style={[
                    styles.buttonText,
                    filters.direction === 'all' && styles.buttonTextSelected,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  filters.direction === 'paid' && styles.buttonSelected,
                ]}
                onPress={() => handleDirectionChange('paid')}
              >
                <Ionicons
                  name="arrow-up"
                  size={16}
                  color={filters.direction === 'paid' ? COLORS.background : COLORS.error}
                />
                <Text
                  style={[
                    styles.buttonText,
                    filters.direction === 'paid' && styles.buttonTextSelected,
                  ]}
                >
                  You Paid
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  filters.direction === 'received' && styles.buttonSelected,
                ]}
                onPress={() => handleDirectionChange('received')}
              >
                <Ionicons
                  name="arrow-down"
                  size={16}
                  color={filters.direction === 'received' ? COLORS.background : COLORS.success}
                />
                <Text
                  style={[
                    styles.buttonText,
                    filters.direction === 'received' && styles.buttonTextSelected,
                  ]}
                >
                  You Received
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Budget Performance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Performance</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.button,
                  filters.budgetPerformance === 'all' && styles.buttonSelected,
                ]}
                onPress={() => handleBudgetPerformanceChange('all')}
              >
                <Text
                  style={[
                    styles.buttonText,
                    filters.budgetPerformance === 'all' && styles.buttonTextSelected,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  filters.budgetPerformance === 'under' && styles.buttonSelected,
                ]}
                onPress={() => handleBudgetPerformanceChange('under')}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={
                    filters.budgetPerformance === 'under' ? COLORS.background : COLORS.success
                  }
                />
                <Text
                  style={[
                    styles.buttonText,
                    filters.budgetPerformance === 'under' && styles.buttonTextSelected,
                  ]}
                >
                  Under Budget
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  filters.budgetPerformance === 'over' && styles.buttonSelected,
                ]}
                onPress={() => handleBudgetPerformanceChange('over')}
              >
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={filters.budgetPerformance === 'over' ? COLORS.background : COLORS.error}
                />
                <Text
                  style={[
                    styles.buttonText,
                    filters.budgetPerformance === 'over' && styles.buttonTextSelected,
                  ]}
                >
                  Over Budget
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  filters.budgetPerformance === 'none' && styles.buttonSelected,
                ]}
                onPress={() => handleBudgetPerformanceChange('none')}
              >
                <Text
                  style={[
                    styles.buttonText,
                    filters.budgetPerformance === 'none' && styles.buttonTextSelected,
                  ]}
                >
                  No Budget
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Notes</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search settlement notes..."
                placeholderTextColor={COLORS.textSecondary}
                value={filters.searchNotes}
                onChangeText={handleSearchNotesChange}
              />
              {filters.searchNotes !== '' && (
                <TouchableOpacity onPress={() => handleSearchNotesChange('')}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Clear All Button */}
          {activeCount > 0 && (
            <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
              <Text style={styles.clearAllText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.base,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  headerTitle: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...FONTS.small,
    fontSize: 11,
    color: COLORS.background,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    maxHeight: 50,
  },
  activeFiltersContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.base,
    gap: SPACING.small,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.small,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  activeFilterText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
  filtersPanel: {
    padding: SPACING.base,
    paddingTop: 0,
  },
  section: {
    marginBottom: SPACING.large,
  },
  sectionTitle: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.small,
    marginTop: SPACING.small,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.small,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  buttonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  buttonText: {
    ...FONTS.small,
    color: COLORS.text,
  },
  buttonTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.small,
    height: 44,
    gap: SPACING.small,
    marginTop: SPACING.small,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
    padding: 0,
  },
  clearAllButton: {
    backgroundColor: COLORS.error + '15',
    borderRadius: 8,
    padding: SPACING.base,
    alignItems: 'center',
    marginTop: SPACING.base,
    marginBottom: SPACING.small,
  },
  clearAllText: {
    ...FONTS.body,
    color: COLORS.error,
    fontWeight: '600',
  },
});
