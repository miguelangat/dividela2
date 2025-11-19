// src/components/CurrencyDisplay.js
// Simple component to display currency information

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { getCurrencyInfo, DEFAULT_CURRENCY } from '../constants/currencies';

export default function CurrencyDisplay({
  currencyCode = DEFAULT_CURRENCY,
  showFlag = true,
  showCode = true,
  showName = false,
  showSymbol = false,
  size = 'medium',
  style,
}) {
  const currency = getCurrencyInfo(currencyCode);

  const sizeStyles = {
    small: {
      flag: 16,
      code: FONTS.sizes.small,
      name: FONTS.sizes.tiny,
    },
    medium: {
      flag: 24,
      code: FONTS.sizes.body,
      name: FONTS.sizes.small,
    },
    large: {
      flag: 32,
      code: FONTS.sizes.large,
      name: FONTS.sizes.body,
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.medium;

  return (
    <View style={[styles.container, style]}>
      {showFlag && (
        <Text style={[styles.flag, { fontSize: currentSize.flag }]}>
          {currency.flag}
        </Text>
      )}
      <View style={styles.info}>
        {showCode && (
          <Text style={[styles.code, { fontSize: currentSize.code }]}>
            {currency.code}
          </Text>
        )}
        {showName && (
          <Text style={[styles.name, { fontSize: currentSize.name }]}>
            {currency.name}
          </Text>
        )}
        {showSymbol && (
          <Text style={[styles.symbol, { fontSize: currentSize.code }]}>
            {currency.symbol}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    marginRight: SPACING.small,
  },
  info: {
    flexDirection: 'column',
  },
  code: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  name: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  symbol: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
