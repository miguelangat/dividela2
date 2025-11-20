// src/utils/__tests__/currencyUtils.test.js
// Unit tests for currency utility functions

import {
  formatCurrency,
  formatCurrencyCompact,
  formatDualCurrency,
  formatCurrencyWithFlag,
  calculateExchangeRate,
  convertCurrency,
  convertWithRate,
  formatExchangeRate,
  formatExchangeRateWithSymbols,
  parseCurrencyInput,
  roundCurrency,
  validateAmount,
  validateExchangeRate,
  getCurrencySymbol,
  createMultiCurrencyExpense,
  getExpenseDisplayAmount,
  getExpenseDualDisplay,
} from '../currencyUtils';

describe('currencyUtils', () => {
  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('should format EUR correctly', () => {
      const result = formatCurrency(1234.56, 'EUR');
      expect(result).toContain('1,234.56');
      expect(result).toContain('€');
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('should use absolute value for negative amounts', () => {
      const result = formatCurrency(-100, 'USD');
      expect(result).not.toContain('-');
      expect(result).toContain('100');
    });

    it('should default to USD if no currency provided', () => {
      const result = formatCurrency(100);
      expect(result).toContain('$');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('should format large numbers compactly', () => {
      const result = formatCurrencyCompact(1500, 'USD');
      expect(result).toMatch(/1.5K/i);
    });

    it('should format millions compactly', () => {
      const result = formatCurrencyCompact(1500000, 'USD');
      expect(result).toMatch(/1.5M/i);
    });
  });

  describe('formatDualCurrency', () => {
    it('should format dual currency display', () => {
      const result = formatDualCurrency(50, 'EUR', 55, 'USD');
      expect(result).toContain('€');
      expect(result).toContain('$');
      expect(result).toContain('≈');
    });

    it('should show only one amount if same currency', () => {
      const result = formatDualCurrency(50, 'USD', 50, 'USD');
      expect(result).not.toContain('≈');
      expect(result.match(/\$/g) || []).toHaveLength(1);
    });
  });

  describe('formatCurrencyWithFlag', () => {
    it('should include flag emoji', () => {
      const result = formatCurrencyWithFlag(100, 'USD');
      expect(result).toContain('🇺🇸');
      expect(result).toContain('$');
    });
  });

  describe('calculateExchangeRate', () => {
    it('should calculate correct exchange rate', () => {
      const rate = calculateExchangeRate(50, 55);
      expect(rate).toBe(1.1);
    });

    it('should handle zero fromAmount', () => {
      const rate = calculateExchangeRate(0, 55);
      expect(rate).toBe(0);
    });

    it('should calculate rate for currency pairs', () => {
      // 100 EUR = 110 USD, so 1 EUR = 1.10 USD
      const rate = calculateExchangeRate(100, 110);
      expect(rate).toBe(1.1);
    });
  });

  describe('convertCurrency', () => {
    it('should convert amount using exchange rate', () => {
      const converted = convertCurrency(50, 1.1);
      expect(converted).toBe(55);
    });

    it('should handle zero amount', () => {
      const converted = convertCurrency(0, 1.1);
      expect(converted).toBe(0);
    });

    it('should handle rate of 1.0', () => {
      const converted = convertCurrency(100, 1.0);
      expect(converted).toBe(100);
    });
  });

  describe('convertWithRate', () => {
    it('should return converted amount and rate', () => {
      const result = convertWithRate(50, 'EUR', 'USD', 1.1);
      expect(result.exchangeRate).toBe(1.1);
      expect(result.convertedAmount).toBe(55);
    });

    it('should handle same currency conversion', () => {
      const result = convertWithRate(50, 'USD', 'USD', 1.0);
      expect(result.exchangeRate).toBe(1.0);
      expect(result.convertedAmount).toBe(50);
    });

    it('should round the converted amount', () => {
      const result = convertWithRate(33.33, 'EUR', 'USD', 1.1);
      expect(result.convertedAmount).toBe(36.66);
    });
  });

  describe('formatExchangeRate', () => {
    it('should format exchange rate correctly', () => {
      const result = formatExchangeRate(1.1, 'EUR', 'USD');
      expect(result).toBe('1 EUR = 1.1000 USD');
    });

    it('should handle high precision rates', () => {
      const result = formatExchangeRate(0.05123, 'MXN', 'USD');
      expect(result).toContain('0.0512');
    });
  });

  describe('formatExchangeRateWithSymbols', () => {
    it('should format with currency symbols', () => {
      const result = formatExchangeRateWithSymbols(1.1, 'EUR', 'USD');
      expect(result).toContain('€');
      expect(result).toContain('$');
      expect(result).toContain('1.1000');
    });
  });

  describe('parseCurrencyInput', () => {
    it('should parse number string', () => {
      expect(parseCurrencyInput('123.45')).toBe(123.45);
    });

    it('should remove currency symbols', () => {
      expect(parseCurrencyInput('$123.45')).toBe(123.45);
    });

    it('should remove commas', () => {
      expect(parseCurrencyInput('1,234.56')).toBe(1234.56);
    });

    it('should handle already numeric input', () => {
      expect(parseCurrencyInput(100)).toBe(100);
    });

    it('should return 0 for empty input', () => {
      expect(parseCurrencyInput('')).toBe(0);
      expect(parseCurrencyInput(null)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(parseCurrencyInput('-123.45')).toBe(-123.45);
    });
  });

  describe('roundCurrency', () => {
    it('should round to 2 decimal places by default', () => {
      expect(roundCurrency(123.456)).toBe(123.46);
      expect(roundCurrency(123.454)).toBe(123.45);
    });

    it('should handle exact values', () => {
      expect(roundCurrency(123.45)).toBe(123.45);
    });

    it('should round with specified currency', () => {
      expect(roundCurrency(123.456, 'USD')).toBe(123.46);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive amounts', () => {
      const result = validateAmount(100);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject negative amounts', () => {
      const result = validateAmount(-100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject zero', () => {
      const result = validateAmount(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than zero');
    });

    it('should reject NaN', () => {
      const result = validateAmount(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject non-numeric values', () => {
      const result = validateAmount('abc');
      expect(result.isValid).toBe(false);
    });

    it('should reject amounts over maximum', () => {
      const result = validateAmount(2000000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('maximum');
    });
  });

  describe('validateExchangeRate', () => {
    it('should validate positive rates', () => {
      const result = validateExchangeRate(1.1);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject negative rates', () => {
      const result = validateExchangeRate(-1.1);
      expect(result.isValid).toBe(false);
    });

    it('should reject zero', () => {
      const result = validateExchangeRate(0);
      expect(result.isValid).toBe(false);
    });

    it('should reject unusually high rates', () => {
      const result = validateExchangeRate(15000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('unusually high');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return USD symbol', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it('should return EUR symbol', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    it('should default to USD if no currency provided', () => {
      expect(getCurrencySymbol()).toBe('$');
    });
  });

  describe('createMultiCurrencyExpense', () => {
    it('should create expense with same currency', () => {
      const expenseData = {
        amount: 100,
        currency: 'USD',
        exchangeRate: 1.0,
        description: 'Test',
      };

      const result = createMultiCurrencyExpense(expenseData, 'USD');

      expect(result.amount).toBe(100);
      expect(result.currency).toBe('USD');
      expect(result.primaryCurrencyAmount).toBe(100);
      expect(result.primaryCurrency).toBe('USD');
      expect(result.exchangeRate).toBe(1.0);
      expect(result.exchangeRateSource).toBe('none');
    });

    it('should create expense with different currency', () => {
      const expenseData = {
        amount: 50,
        currency: 'EUR',
        exchangeRate: 1.1,
        description: 'Test',
      };

      const result = createMultiCurrencyExpense(expenseData, 'USD');

      expect(result.amount).toBe(50);
      expect(result.currency).toBe('EUR');
      expect(result.primaryCurrencyAmount).toBe(55);
      expect(result.primaryCurrency).toBe('USD');
      expect(result.exchangeRate).toBe(1.1);
      expect(result.exchangeRateSource).toBe('manual');
    });

    it('should round converted amount', () => {
      const expenseData = {
        amount: 33.33,
        currency: 'EUR',
        exchangeRate: 1.1,
        description: 'Test',
      };

      const result = createMultiCurrencyExpense(expenseData, 'USD');

      expect(result.primaryCurrencyAmount).toBe(36.66);
    });
  });

  describe('getExpenseDisplayAmount', () => {
    it('should format expense amount in original currency', () => {
      const expense = {
        amount: 50,
        currency: 'EUR',
      };

      const result = getExpenseDisplayAmount(expense);
      expect(result).toContain('€');
      expect(result).toContain('50');
    });

    it('should default to USD if no currency', () => {
      const expense = {
        amount: 50,
      };

      const result = getExpenseDisplayAmount(expense);
      expect(result).toContain('$');
    });
  });

  describe('getExpenseDualDisplay', () => {
    it('should show dual currency for foreign expense', () => {
      const expense = {
        amount: 50,
        currency: 'EUR',
        primaryCurrencyAmount: 55,
        primaryCurrency: 'USD',
      };

      const result = getExpenseDualDisplay(expense);
      expect(result).toContain('€');
      expect(result).toContain('$');
      expect(result).toContain('≈');
    });

    it('should show single currency for same currency', () => {
      const expense = {
        amount: 50,
        currency: 'USD',
        primaryCurrencyAmount: 50,
        primaryCurrency: 'USD',
      };

      const result = getExpenseDualDisplay(expense);
      expect(result).not.toContain('≈');
    });
  });
});
