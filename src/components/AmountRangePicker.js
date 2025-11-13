/**
 * AmountRangePicker.js
 *
 * Reusable component for selecting amount ranges
 * Supports predefined ranges and custom min/max inputs
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { getPredefinedAmountRanges } from '../utils/settlementFilters';

export default function AmountRangePicker({ minAmount, maxAmount, onRangeChange }) {
  const [customMin, setCustomMin] = useState(minAmount?.toString() || '');
  const [customMax, setCustomMax] = useState(maxAmount?.toString() || '');
  const [selectedRange, setSelectedRange] = useState(null);

  const predefinedRanges = getPredefinedAmountRanges();

  useEffect(() => {
    // Update local state when props change
    setCustomMin(minAmount?.toString() || '');
    setCustomMax(maxAmount?.toString() || '');
  }, [minAmount, maxAmount]);

  const handlePredefinedRange = (range) => {
    setSelectedRange(range.label);
    setCustomMin(range.minAmount?.toString() || '');
    setCustomMax(range.maxAmount?.toString() || '');
    onRangeChange(range.minAmount, range.maxAmount);
  };

  const handleCustomMinChange = (text) => {
    setCustomMin(text);
    setSelectedRange(null);
    const value = text === '' ? null : parseFloat(text);
    if (text === '' || (!isNaN(value) && value >= 0)) {
      onRangeChange(value, maxAmount);
    }
  };

  const handleCustomMaxChange = (text) => {
    setCustomMax(text);
    setSelectedRange(null);
    const value = text === '' ? null : parseFloat(text);
    if (text === '' || (!isNaN(value) && value >= 0)) {
      onRangeChange(minAmount, value);
    }
  };

  const handleClear = () => {
    setCustomMin('');
    setCustomMax('');
    setSelectedRange(null);
    onRangeChange(null, null);
  };

  // Check if current values match a predefined range
  useEffect(() => {
    const matchingRange = predefinedRanges.find(
      (range) => range.minAmount === minAmount && range.maxAmount === maxAmount
    );
    if (matchingRange) {
      setSelectedRange(matchingRange.label);
    } else {
      setSelectedRange(null);
    }
  }, [minAmount, maxAmount]);

  return (
    <View style={styles.container}>
      {/* Predefined Ranges */}
      <View style={styles.chipsContainer}>
        {predefinedRanges.map((range) => (
          <TouchableOpacity
            key={range.label}
            style={[
              styles.chip,
              selectedRange === range.label && styles.chipSelected,
            ]}
            onPress={() => handlePredefinedRange(range)}
          >
            <Text
              style={[
                styles.chipText,
                selectedRange === range.label && styles.chipTextSelected,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Range */}
      <View style={styles.customRangeContainer}>
        <Text style={styles.customLabel}>Custom Range:</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="Min"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="decimal-pad"
              value={customMin}
              onChangeText={handleCustomMinChange}
            />
          </View>
          <Text style={styles.separator}>-</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="Max"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="decimal-pad"
              value={customMax}
              onChangeText={handleCustomMaxChange}
            />
          </View>
        </View>
      </View>

      {/* Clear Button */}
      {(minAmount !== null || maxAmount !== null) && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear Amount Filter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.small,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.small,
  },
  chip: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.small,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...FONTS.small,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.background,
    fontWeight: '600',
  },
  customRangeContainer: {
    marginTop: SPACING.base,
  },
  customLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.small,
    height: 40,
  },
  inputPrefix: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
    padding: 0,
  },
  separator: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  clearButton: {
    marginTop: SPACING.base,
    paddingVertical: SPACING.small,
    alignItems: 'center',
  },
  clearButtonText: {
    ...FONTS.small,
    color: COLORS.error,
    fontWeight: '600',
  },
});
