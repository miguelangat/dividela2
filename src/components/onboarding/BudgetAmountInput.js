// src/components/onboarding/BudgetAmountInput.js
// Input component for budget amount with quick suggestions

import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';
import { formatCurrency, getCurrencySymbol } from '../../utils/currencyUtils';

export default function BudgetAmountInput({
  value,
  onChangeValue,
  currency = 'USD',
  suggestions = [1000, 2000, 3000, 4000],
  placeholder = '0',
}) {

  const parseCurrency = (text) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const handleTextChange = (text) => {
    const amount = parseCurrency(text);
    onChangeValue(amount);
  };

  const handleSuggestionPress = (amount) => {
    onChangeValue(amount);
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <View style={styles.container}>
      {/* Amount Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.currencySymbol}>{currencySymbol}</Text>
        <TextInput
          style={styles.input}
          value={value ? value.toLocaleString() : ''}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          keyboardType="number-pad"
          returnKeyType="done"
        />
      </View>

      {/* Quick Suggestions */}
      <View style={styles.suggestionsContainer}>
        {suggestions.map((amount) => (
          <TouchableOpacity
            key={amount}
            style={[
              styles.suggestionButton,
              value === amount && styles.suggestionButtonSelected,
            ]}
            onPress={() => handleSuggestionPress(amount)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.suggestionText,
                value === amount && styles.suggestionTextSelected,
              ]}
            >
              {formatCurrency(amount, currency)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.base,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.base,
  },
  currencySymbol: {
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginRight: SPACING.tiny,
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.xlarge,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    paddingVertical: SPACING.base,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.small,
  },
  suggestionButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.border,
    minWidth: 80,
    alignItems: 'center',
  },
  suggestionButtonSelected: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  suggestionText: {
    fontSize: FONTS.sizes.body,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
  },
  suggestionTextSelected: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
});
