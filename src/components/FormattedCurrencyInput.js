// src/components/FormattedCurrencyInput.js
// Real-time currency input with automatic formatting

import React, { useState, useEffect, useRef } from 'react';
import { TextInput } from 'react-native';
import { formatCurrency, parseCurrencyInputSafe, getCurrencySymbol } from '../utils/currencyUtils';

/**
 * Currency input component with format-on-blur approach
 *
 * Features:
 * - Shows raw numbers while typing (no cursor jumping)
 * - Applies full currency formatting when input loses focus
 * - Handles decimal precision automatically
 * - Comprehensive input validation and sanitization
 * - Works with any supported currency
 *
 * @param {number} value - Raw numeric value
 * @param {function} onChangeValue - Callback with raw number
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
 * @param {string} placeholder - Placeholder text
 * @param {object} style - Custom styles
 * @param {object} props - Additional TextInput props (onFocus, onBlur, etc.)
 */
export default function FormattedCurrencyInput({
  value,
  onChangeValue,
  currency = 'USD',
  placeholder = '0.00',
  style,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const isInitialMount = useRef(true);

  // Update display value when external value changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Initialize with formatted value if provided
      if (value && value > 0) {
        setDisplayValue(isFocused ? value.toString() : formatCurrency(value, currency));
      }
    } else if (!isFocused && value > 0) {
      // Only update when not focused to avoid interfering with typing
      setDisplayValue(formatCurrency(value, currency));
    } else if (!isFocused && (!value || value === 0)) {
      setDisplayValue('');
    }
  }, [value, currency, isFocused]);

  const handleChangeText = (text) => {
    // Enhanced parsing with safety checks
    const cleaned = parseCurrencyInputSafe(text);

    // Parse to number
    const parsed = parseFloat(cleaned || '0');
    const finalValue = isNaN(parsed) ? 0 : Math.abs(parsed);

    // Update parent with raw number
    onChangeValue(finalValue);

    // Store raw input while focused (no formatting to prevent cursor jumping)
    setDisplayValue(text);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number for easy editing (no formatting while typing)
    if (value > 0) {
      setDisplayValue(value.toString());
    } else {
      setDisplayValue('');
    }
    // Call parent's onFocus if provided
    if (props.onFocus) {
      props.onFocus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Apply full formatting with currency symbol on blur
    if (value > 0) {
      setDisplayValue(formatCurrency(value, currency));
    } else {
      setDisplayValue('');
    }
    // Call parent's onBlur if provided
    if (props.onBlur) {
      props.onBlur();
    }
  };

  return (
    <TextInput
      value={displayValue}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      style={style}
      {...props}
    />
  );
}
