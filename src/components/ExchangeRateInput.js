// src/components/ExchangeRateInput.js
// Component for inputting and calculating exchange rates

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import {
  formatCurrency,
  calculateExchangeRate,
  convertCurrency,
  formatExchangeRate,
  parseCurrencyInput,
  validateExchangeRate,
  roundCurrency,
} from '../utils/currencyUtils';
import { getCurrencyInfo } from '../constants/currencies';

export default function ExchangeRateInput({
  fromAmount,
  fromCurrency,
  toCurrency,
  onRateChange,
  onConvertedAmountChange,
  initialRate = null,
  style,
}) {
  const [exchangeRate, setExchangeRate] = useState(initialRate || '');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [calculationMode, setCalculationMode] = useState('rate'); // 'rate' or 'amount'
  const [error, setError] = useState(null);

  const fromInfo = getCurrencyInfo(fromCurrency);
  const toInfo = getCurrencyInfo(toCurrency);

  // Same currency - no conversion needed
  if (fromCurrency === toCurrency) {
    useEffect(() => {
      onRateChange(1.0);
      onConvertedAmountChange(fromAmount);
    }, [fromAmount]);

    return null;
  }

  // Update converted amount when rate or fromAmount changes
  useEffect(() => {
    if (calculationMode === 'rate' && exchangeRate && fromAmount) {
      const rate = parseFloat(exchangeRate);
      if (!isNaN(rate) && rate > 0) {
        const converted = convertCurrency(fromAmount, rate);
        const rounded = roundCurrency(converted, toCurrency);
        setConvertedAmount(rounded.toString());
        onConvertedAmountChange(rounded);
      }
    }
  }, [exchangeRate, fromAmount, calculationMode, toCurrency]);

  // Update rate when converted amount changes
  useEffect(() => {
    if (calculationMode === 'amount' && convertedAmount && fromAmount > 0) {
      const converted = parseFloat(convertedAmount);
      if (!isNaN(converted) && converted > 0) {
        const rate = calculateExchangeRate(fromAmount, converted);
        setExchangeRate(rate.toFixed(6));
        onRateChange(rate);
      }
    }
  }, [convertedAmount, fromAmount, calculationMode]);

  const handleRateChange = (text) => {
    setError(null);
    setCalculationMode('rate');
    setExchangeRate(text);

    const rate = parseFloat(text);
    if (!isNaN(rate) && rate > 0) {
      const validation = validateExchangeRate(rate);
      if (!validation.isValid) {
        setError(validation.error);
      } else {
        onRateChange(rate);
      }
    }
  };

  const handleConvertedAmountChange = (text) => {
    setError(null);
    setCalculationMode('amount');
    setConvertedAmount(text);

    const amount = parseCurrencyInput(text);
    if (amount > 0) {
      onConvertedAmountChange(amount);
    }
  };

  const handleQuickRate = (rate) => {
    setCalculationMode('rate');
    setExchangeRate(rate.toString());
    onRateChange(rate);
  };

  // Suggested quick rates based on common conversions
  const getQuickRates = () => {
    // Common rate suggestions (you can make this dynamic based on historical data)
    const suggestions = [];

    // Simple round numbers for common pairs
    if (fromCurrency === 'EUR' && toCurrency === 'USD') {
      suggestions.push(1.10, 1.15, 1.20);
    } else if (fromCurrency === 'USD' && toCurrency === 'EUR') {
      suggestions.push(0.85, 0.90, 0.95);
    } else if (fromCurrency === 'GBP' && toCurrency === 'USD') {
      suggestions.push(1.25, 1.30, 1.35);
    } else if (fromCurrency === 'MXN' && toCurrency === 'USD') {
      suggestions.push(0.05, 0.055, 0.06);
    } else if (fromCurrency === 'USD' && toCurrency === 'MXN') {
      suggestions.push(16, 17, 18);
    }

    return suggestions;
  };

  const quickRates = getQuickRates();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionTitle}>Currency Conversion</Text>

      {/* From Amount Display */}
      <View style={styles.conversionDisplay}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>From:</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(fromAmount, fromCurrency)}
          </Text>
          <Text style={styles.currencyBadge}>{fromCurrency}</Text>
        </View>

        <Ionicons
          name="arrow-down"
          size={24}
          color={COLORS.primary}
          style={styles.arrowIcon}
        />

        {/* To Amount Input */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>To:</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>{toInfo.symbol}</Text>
            <TextInput
              style={styles.amountInput}
              value={convertedAmount}
              onChangeText={handleConvertedAmountChange}
              placeholder="0.00"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
          <Text style={styles.currencyBadge}>{toCurrency}</Text>
        </View>
      </View>

      {/* Exchange Rate Input */}
      <View style={styles.rateSection}>
        <Text style={styles.rateLabel}>Exchange Rate</Text>
        <View style={styles.rateInputContainer}>
          <Text style={styles.ratePrefix}>1 {fromCurrency} =</Text>
          <TextInput
            style={styles.rateInput}
            value={exchangeRate}
            onChangeText={handleRateChange}
            placeholder="0.0000"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Text style={styles.rateSuffix}>{toCurrency}</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Display formatted rate */}
        {exchangeRate && !error && (
          <Text style={styles.rateDisplay}>
            {formatExchangeRate(parseFloat(exchangeRate), fromCurrency, toCurrency)}
          </Text>
        )}
      </View>

      {/* Quick Rate Suggestions */}
      {quickRates.length > 0 && (
        <View style={styles.quickRates}>
          <Text style={styles.quickRatesLabel}>Quick rates:</Text>
          <View style={styles.quickRatesButtons}>
            {quickRates.map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[
                  styles.quickRateButton,
                  exchangeRate === rate.toString() && styles.quickRateButtonActive,
                ]}
                onPress={() => handleQuickRate(rate)}
              >
                <Text
                  style={[
                    styles.quickRateText,
                    exchangeRate === rate.toString() && styles.quickRateTextActive,
                  ]}
                >
                  {rate}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Helper Text */}
      <View style={styles.helperContainer}>
        <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
        <Text style={styles.helperText}>
          Enter the exchange rate or the converted amount. We'll calculate the other.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.base,
  },
  sectionTitle: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  conversionDisplay: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.small,
  },
  amountLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    width: 50,
  },
  amountValue: {
    ...FONTS.large,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  currencyBadge: {
    ...FONTS.small,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '30',
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.tiny,
    borderRadius: SIZES.borderRadius.small,
  },
  arrowIcon: {
    alignSelf: 'center',
    marginVertical: SPACING.tiny,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.small,
    paddingHorizontal: SPACING.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencySymbol: {
    ...FONTS.large,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: SPACING.tiny,
  },
  amountInput: {
    ...FONTS.large,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    paddingVertical: SPACING.small,
  },
  rateSection: {
    marginBottom: SPACING.base,
  },
  rateLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
    fontWeight: '600',
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.small,
  },
  ratePrefix: {
    ...FONTS.body,
    color: COLORS.text,
    marginRight: SPACING.small,
    fontWeight: '600',
  },
  rateInput: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    paddingVertical: SPACING.small,
    textAlign: 'center',
  },
  rateSuffix: {
    ...FONTS.body,
    color: COLORS.text,
    marginLeft: SPACING.small,
    fontWeight: '600',
  },
  rateDisplay: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.small,
    paddingHorizontal: SPACING.small,
  },
  errorText: {
    ...FONTS.small,
    color: COLORS.error,
    marginLeft: SPACING.tiny,
    flex: 1,
  },
  quickRates: {
    marginBottom: SPACING.base,
  },
  quickRatesLabel: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  quickRatesButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.small,
  },
  quickRateButton: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.small,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  quickRateButtonActive: {
    backgroundColor: COLORS.primaryLight + '30',
    borderColor: COLORS.primary,
  },
  quickRateText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  quickRateTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: SIZES.borderRadius.small,
    padding: SPACING.small,
  },
  helperText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginLeft: SPACING.small,
    flex: 1,
  },
});
