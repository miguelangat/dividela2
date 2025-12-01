// src/components/__tests__/FormattedCurrencyInput.test.js
// Comprehensive test suite for FormattedCurrencyInput component

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FormattedCurrencyInput from '../FormattedCurrencyInput';

describe('FormattedCurrencyInput', () => {
  const mockOnChangeValue = jest.fn();

  beforeEach(() => {
    mockOnChangeValue.mockClear();
  });

  // ===========================
  // Basic Input Tests
  // ===========================
  describe('Basic Input', () => {
    it('should render with default props', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );
      expect(getByPlaceholderText('0.00')).toBeTruthy();
    });

    it('should handle simple integer input', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '123');

      expect(mockOnChangeValue).toHaveBeenCalledWith(123);
    });

    it('should handle decimal numbers', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '123.45');

      expect(mockOnChangeValue).toHaveBeenCalledWith(123.45);
    });

    it('should handle large numbers', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '1234567.89');

      expect(mockOnChangeValue).toHaveBeenCalledWith(1234567.89);
    });

    it('should handle zero values', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '0');

      expect(mockOnChangeValue).toHaveBeenCalledWith(0);
    });

    it('should clear input when empty string is provided', () => {
      const { getByDisplayValue } = render(
        <FormattedCurrencyInput
          value={100}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByDisplayValue('$100.00');
      fireEvent.focus(input);
      fireEvent.changeText(input, '');

      expect(mockOnChangeValue).toHaveBeenCalledWith(0);
    });
  });

  // ===========================
  // Decimal Handling Tests
  // ===========================
  describe('Decimal Handling', () => {
    it('should handle trailing decimal point', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '123.');

      expect(mockOnChangeValue).toHaveBeenCalledWith(123);
    });

    it('should handle two decimal places', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '123.45');

      expect(mockOnChangeValue).toHaveBeenCalledWith(123.45);
    });

    it('should handle multiple decimal points (keeps only first)', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '123.45.67');

      // parseCurrencyInputSafe should clean this to "123.4567"
      expect(mockOnChangeValue).toHaveBeenCalledWith(123.4567);
    });

    it('should handle leading decimal', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '.50');

      expect(mockOnChangeValue).toHaveBeenCalledWith(0.5);
    });

    it('should handle three decimal places', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '123.456');

      expect(mockOnChangeValue).toHaveBeenCalledWith(123.456);
    });
  });

  // ===========================
  // Copy/Paste Tests
  // ===========================
  describe('Copy/Paste Operations', () => {
    it('should handle pasting formatted currency', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '$1,234.56');

      expect(mockOnChangeValue).toHaveBeenCalledWith(1234.56);
    });

    it('should handle pasting plain numbers', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '1234.56');

      expect(mockOnChangeValue).toHaveBeenCalledWith(1234.56);
    });

    it('should handle pasting invalid text (filters to valid number)', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, 'abc123');

      expect(mockOnChangeValue).toHaveBeenCalledWith(123);
    });

    it('should handle pasting mixed content', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '$123abc');

      expect(mockOnChangeValue).toHaveBeenCalledWith(123);
    });

    it('should handle pasting with extra whitespace', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '  123.45  ');

      expect(mockOnChangeValue).toHaveBeenCalledWith(123.45);
    });
  });

  // ===========================
  // Focus/Blur Behavior Tests
  // ===========================
  describe('Focus/Blur Behavior', () => {
    it('should show formatted currency when blurred', () => {
      const { getByPlaceholderText, getByDisplayValue } = render(
        <FormattedCurrencyInput
          value={1500.5}
          onChangeValue={mockOnChangeValue}
          currency="USD"
        />
      );

      const input = getByDisplayValue('$1,500.50');
      expect(input.props.value).toBe('$1,500.50');
    });

    it('should show raw number when focused', () => {
      const { getByDisplayValue } = render(
        <FormattedCurrencyInput
          value={1500.5}
          onChangeValue={mockOnChangeValue}
          currency="USD"
        />
      );

      const input = getByDisplayValue('$1,500.50');
      fireEvent.focus(input);

      // After focus, should show raw number
      expect(input.props.value).toBe('1500.5');
    });

    it('should format on blur', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
          currency="USD"
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.focus(input);
      fireEvent.changeText(input, '1500.5');
      fireEvent.blur(input);

      expect(input.props.value).toBe('$1,500.50');
    });

    it('should clear display when blurred with zero value', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.focus(input);
      fireEvent.changeText(input, '100');
      fireEvent.changeText(input, '');
      fireEvent.blur(input);

      expect(input.props.value).toBe('');
    });

    it('should call parent onFocus handler', () => {
      const mockOnFocus = jest.fn();
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
          onFocus={mockOnFocus}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.focus(input);

      expect(mockOnFocus).toHaveBeenCalled();
    });

    it('should call parent onBlur handler', () => {
      const mockOnBlur = jest.fn();
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
          onBlur={mockOnBlur}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.blur(input);

      expect(mockOnBlur).toHaveBeenCalled();
    });
  });

  // ===========================
  // Negative Number Tests
  // ===========================
  describe('Negative Numbers', () => {
    it('should convert negative to positive (default behavior)', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '-100');

      expect(mockOnChangeValue).toHaveBeenCalledWith(100);
    });

    it('should remove extra minus signs', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '--100');

      expect(mockOnChangeValue).toHaveBeenCalledWith(100);
    });
  });

  // ===========================
  // Edge Case Tests
  // ===========================
  describe('Edge Cases', () => {
    it('should handle leading zeros', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '0123');

      // Should remove leading zeros
      expect(mockOnChangeValue).toHaveBeenCalledWith(123);
    });

    it('should handle only decimal point', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '.');

      expect(mockOnChangeValue).toHaveBeenCalledWith(0);
    });

    it('should handle multiple zeros', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '000');

      expect(mockOnChangeValue).toHaveBeenCalledWith(0);
    });

    it('should handle very small values', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '0.01');

      expect(mockOnChangeValue).toHaveBeenCalledWith(0.01);
    });

    it('should preserve "0." for decimal entry', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
        />
      );

      const input = getByPlaceholderText('0.00');
      fireEvent.changeText(input, '0.');

      expect(mockOnChangeValue).toHaveBeenCalledWith(0);
    });
  });

  // ===========================
  // Currency Tests
  // ===========================
  describe('Multiple Currencies', () => {
    it('should format USD correctly', () => {
      const { getByDisplayValue } = render(
        <FormattedCurrencyInput
          value={1234.56}
          onChangeValue={mockOnChangeValue}
          currency="USD"
        />
      );

      expect(getByDisplayValue('$1,234.56')).toBeTruthy();
    });

    it('should format EUR correctly', () => {
      const { getByDisplayValue } = render(
        <FormattedCurrencyInput
          value={1234.56}
          onChangeValue={mockOnChangeValue}
          currency="EUR"
        />
      );

      // EUR formatting may vary, just check it's formatted
      const input = getByDisplayValue(/1.*234.*56/);
      expect(input).toBeTruthy();
    });

    it('should update formatting when currency changes', () => {
      const { rerender, getByDisplayValue } = render(
        <FormattedCurrencyInput
          value={100}
          onChangeValue={mockOnChangeValue}
          currency="USD"
        />
      );

      expect(getByDisplayValue('$100.00')).toBeTruthy();

      rerender(
        <FormattedCurrencyInput
          value={100}
          onChangeValue={mockOnChangeValue}
          currency="EUR"
        />
      );

      // Should re-format in EUR
      const input = getByDisplayValue(/100/);
      expect(input).toBeTruthy();
    });
  });

  // ===========================
  // Custom Props Tests
  // ===========================
  describe('Custom Props', () => {
    it('should use custom placeholder', () => {
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
          placeholder="Enter amount"
        />
      );

      expect(getByPlaceholderText('Enter amount')).toBeTruthy();
    });

    it('should apply custom styles', () => {
      const customStyle = { fontSize: 24, color: 'red' };
      const { getByPlaceholderText } = render(
        <FormattedCurrencyInput
          value={0}
          onChangeValue={mockOnChangeValue}
          style={customStyle}
        />
      );

      const input = getByPlaceholderText('0.00');
      expect(input.props.style).toEqual(customStyle);
    });
  });
});
