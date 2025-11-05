/**
 * DateRangePicker.js
 *
 * Date range selection component with preset options and custom range
 * Supports both preset periods and custom date selection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../constants/theme';

// Preset date range options
const PRESETS = {
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  LAST_30_DAYS: 'last_30_days',
  LAST_90_DAYS: 'last_90_days',
  THIS_YEAR: 'this_year',
  ALL_TIME: 'all_time',
};

const getPresetLabel = (preset) => {
  const labels = {
    [PRESETS.THIS_WEEK]: 'This Week',
    [PRESETS.THIS_MONTH]: 'This Month',
    [PRESETS.LAST_MONTH]: 'Last Month',
    [PRESETS.LAST_30_DAYS]: 'Last 30 Days',
    [PRESETS.LAST_90_DAYS]: 'Last 90 Days',
    [PRESETS.THIS_YEAR]: 'This Year',
    [PRESETS.ALL_TIME]: 'All Time',
  };
  return labels[preset] || 'Select Period';
};

/**
 * Calculate date range from preset
 */
const getDateRangeFromPreset = (preset) => {
  const now = new Date();
  let startDate, endDate;

  switch (preset) {
    case PRESETS.THIS_WEEK: {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day); // Sunday
      endDate = new Date();
      break;
    }

    case PRESETS.THIS_MONTH: {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date();
      break;
    }

    case PRESETS.LAST_MONTH: {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = lastMonth;
      endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of last month
      break;
    }

    case PRESETS.LAST_30_DAYS: {
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      endDate = new Date();
      break;
    }

    case PRESETS.LAST_90_DAYS: {
      startDate = new Date();
      startDate.setDate(now.getDate() - 90);
      endDate = new Date();
      break;
    }

    case PRESETS.THIS_YEAR: {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date();
      break;
    }

    case PRESETS.ALL_TIME:
    default:
      return { startDate: null, endDate: null };
  }

  // Set to start/end of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

/**
 * Format date range for display
 */
const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'All Time';

  const start = new Date(startDate);
  const end = new Date(endDate);

  const options = { month: 'short', day: 'numeric' };

  // Same year
  if (start.getFullYear() === end.getFullYear()) {
    // Same month
    if (start.getMonth() === end.getMonth()) {
      // Same day
      if (start.getDate() === end.getDate()) {
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return `${start.toLocaleDateString('en-US', options)} - ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
  }

  // Different years
  return `${start.toLocaleDateString('en-US', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
};

export default function DateRangePicker({ onDateRangeChange, initialPreset = PRESETS.THIS_MONTH }) {
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  const [expanded, setExpanded] = useState(false);

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    const { startDate, endDate } = getDateRangeFromPreset(preset);
    onDateRangeChange({ startDate, endDate, preset });
    setExpanded(false);
  };

  const currentRange = getDateRangeFromPreset(selectedPreset);
  const displayText = currentRange.startDate && currentRange.endDate
    ? formatDateRange(currentRange.startDate, currentRange.endDate)
    : getPresetLabel(selectedPreset);

  return (
    <View style={styles.container}>
      {/* Selected Range Display */}
      <TouchableOpacity
        style={styles.selectedButton}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.selectedContent}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
          <Text style={styles.selectedText}>{displayText}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {/* Preset Options */}
      {expanded && (
        <View style={styles.optionsContainer}>
          {Object.values(PRESETS).map(preset => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.option,
                selectedPreset === preset && styles.optionSelected,
              ]}
              onPress={() => handlePresetSelect(preset)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedPreset === preset && styles.optionTextSelected,
                ]}
              >
                {getPresetLabel(preset)}
              </Text>
              {selectedPreset === preset && (
                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.base,
  },
  selectedButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.base,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary + '40',
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    flex: 1,
  },
  selectedText: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  optionsContainer: {
    marginTop: SPACING.small,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E5E5',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E5E5',
  },
  optionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  optionText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

// Export preset constants for use in other components
export { PRESETS, getDateRangeFromPreset, formatDateRange };
