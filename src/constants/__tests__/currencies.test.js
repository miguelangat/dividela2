// src/constants/__tests__/currencies.test.js
// Unit tests for currency constants and helper functions

import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencyInfo,
  getAllCurrencies,
  getPopularCurrencies,
  isSupportedCurrency,
  getCurrencySymbol,
  getCurrencyName,
  getCurrencyFlag,
  formatCurrencyDisplay,
  parseCurrencyCode,
} from '../currencies';

describe('Currency Constants', () => {
  describe('SUPPORTED_CURRENCIES', () => {
    it('should have all 8 priority currencies', () => {
      const expectedCurrencies = ['USD', 'EUR', 'MXN', 'COP', 'PEN', 'CNY', 'BRL', 'GBP'];
      expectedCurrencies.forEach(code => {
        expect(SUPPORTED_CURRENCIES).toHaveProperty(code);
      });
    });

    it('should have complete metadata for each currency', () => {
      Object.entries(SUPPORTED_CURRENCIES).forEach(([code, currency]) => {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('name');
        expect(currency).toHaveProperty('symbol');
        expect(currency).toHaveProperty('symbolNative');
        expect(currency).toHaveProperty('symbolPosition');
        expect(currency).toHaveProperty('locale');
        expect(currency).toHaveProperty('decimals');
        expect(currency).toHaveProperty('flag');
        expect(currency).toHaveProperty('popular');
      });
    });

    it('should have valid decimal places', () => {
      Object.values(SUPPORTED_CURRENCIES).forEach(currency => {
        expect(currency.decimals).toBeGreaterThanOrEqual(0);
        expect(currency.decimals).toBeLessThanOrEqual(4);
      });
    });

    it('should have valid symbol positions', () => {
      Object.values(SUPPORTED_CURRENCIES).forEach(currency => {
        expect(['prefix', 'suffix']).toContain(currency.symbolPosition);
      });
    });

    it('should mark all currencies as popular', () => {
      Object.values(SUPPORTED_CURRENCIES).forEach(currency => {
        expect(currency.popular).toBe(true);
      });
    });
  });

  describe('DEFAULT_CURRENCY', () => {
    it('should be USD', () => {
      expect(DEFAULT_CURRENCY).toBe('USD');
    });

    it('should be a supported currency', () => {
      expect(SUPPORTED_CURRENCIES).toHaveProperty(DEFAULT_CURRENCY);
    });
  });

  describe('getCurrencyInfo', () => {
    it('should return currency info for valid code', () => {
      const info = getCurrencyInfo('USD');
      expect(info.code).toBe('USD');
      expect(info.name).toBe('US Dollar');
      expect(info.symbol).toBe('$');
    });

    it('should return EUR info', () => {
      const info = getCurrencyInfo('EUR');
      expect(info.code).toBe('EUR');
      expect(info.name).toBe('Euro');
      expect(info.symbol).toBe('€');
    });

    it('should return default currency for invalid code', () => {
      const info = getCurrencyInfo('INVALID');
      expect(info.code).toBe('USD');
    });

    it('should return default currency for null', () => {
      const info = getCurrencyInfo(null);
      expect(info.code).toBe('USD');
    });
  });

  describe('getAllCurrencies', () => {
    it('should return array of all currencies', () => {
      const currencies = getAllCurrencies();
      expect(Array.isArray(currencies)).toBe(true);
      expect(currencies.length).toBe(8);
    });

    it('should return currency objects with all properties', () => {
      const currencies = getAllCurrencies();
      currencies.forEach(currency => {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('name');
        expect(currency).toHaveProperty('symbol');
      });
    });
  });

  describe('getPopularCurrencies', () => {
    it('should return array of currency codes', () => {
      const popular = getPopularCurrencies();
      expect(Array.isArray(popular)).toBe(true);
    });

    it('should return all supported currencies as popular', () => {
      const popular = getPopularCurrencies();
      expect(popular.length).toBe(8);
      expect(popular).toContain('USD');
      expect(popular).toContain('EUR');
      expect(popular).toContain('MXN');
    });
  });

  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isSupportedCurrency('USD')).toBe(true);
      expect(isSupportedCurrency('EUR')).toBe(true);
      expect(isSupportedCurrency('GBP')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isSupportedCurrency('JPY')).toBe(false);
      expect(isSupportedCurrency('CAD')).toBe(false);
      expect(isSupportedCurrency('INVALID')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isSupportedCurrency('usd')).toBe(false);
      expect(isSupportedCurrency('USD')).toBe(true);
    });
  });

  describe('getCurrencySymbol', () => {
    it('should return correct symbols', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('CNY')).toBe('¥');
    });

    it('should return USD symbol by default', () => {
      expect(getCurrencySymbol()).toBe('$');
    });

    it('should handle native symbols', () => {
      expect(getCurrencySymbol('USD', true)).toBe('$');
      expect(getCurrencySymbol('MXN', true)).toBe('$');
      expect(getCurrencySymbol('MXN', false)).toBe('MX$');
    });
  });

  describe('getCurrencyName', () => {
    it('should return correct currency names', () => {
      expect(getCurrencyName('USD')).toBe('US Dollar');
      expect(getCurrencyName('EUR')).toBe('Euro');
      expect(getCurrencyName('PEN')).toBe('Peruvian Sol');
      expect(getCurrencyName('CNY')).toBe('Chinese Yuan');
    });

    it('should return default name for invalid code', () => {
      expect(getCurrencyName('INVALID')).toBe('US Dollar');
    });
  });

  describe('getCurrencyFlag', () => {
    it('should return flag emojis', () => {
      expect(getCurrencyFlag('USD')).toBe('🇺🇸');
      expect(getCurrencyFlag('EUR')).toBe('🇪🇺');
      expect(getCurrencyFlag('MXN')).toBe('🇲🇽');
      expect(getCurrencyFlag('GBP')).toBe('🇬🇧');
    });

    it('should return US flag for invalid code', () => {
      expect(getCurrencyFlag('INVALID')).toBe('🇺🇸');
    });
  });

  describe('formatCurrencyDisplay', () => {
    it('should format currency with flag, symbol, and code', () => {
      const display = formatCurrencyDisplay('USD');
      expect(display).toContain('🇺🇸');
      expect(display).toContain('$');
      expect(display).toContain('USD');
    });

    it('should format EUR correctly', () => {
      const display = formatCurrencyDisplay('EUR');
      expect(display).toContain('🇪🇺');
      expect(display).toContain('€');
      expect(display).toContain('EUR');
    });
  });

  describe('parseCurrencyCode', () => {
    it('should parse direct currency codes', () => {
      expect(parseCurrencyCode('USD')).toBe('USD');
      expect(parseCurrencyCode('EUR')).toBe('EUR');
    });

    it('should be case-insensitive for codes', () => {
      expect(parseCurrencyCode('usd')).toBe('USD');
      expect(parseCurrencyCode('Eur')).toBe('EUR');
    });

    it('should parse from currency names', () => {
      expect(parseCurrencyCode('US Dollar')).toBe('USD');
      expect(parseCurrencyCode('Euro')).toBe('EUR');
    });

    it('should parse from symbols', () => {
      expect(parseCurrencyCode('$')).toBe('USD');
      expect(parseCurrencyCode('€')).toBe('EUR');
      expect(parseCurrencyCode('£')).toBe('GBP');
    });

    it('should return default for invalid input', () => {
      expect(parseCurrencyCode('INVALID')).toBe('USD');
      expect(parseCurrencyCode('')).toBe('USD');
      expect(parseCurrencyCode(null)).toBe('USD');
    });

    it('should handle whitespace', () => {
      expect(parseCurrencyCode('  USD  ')).toBe('USD');
    });
  });

  describe('Currency Metadata Validation', () => {
    it('should have unique currency codes', () => {
      const codes = Object.keys(SUPPORTED_CURRENCIES);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have valid locale formats', () => {
      Object.values(SUPPORTED_CURRENCIES).forEach(currency => {
        expect(currency.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      });
    });

    it('should have non-empty names', () => {
      Object.values(SUPPORTED_CURRENCIES).forEach(currency => {
        expect(currency.name.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty symbols', () => {
      Object.values(SUPPORTED_CURRENCIES).forEach(currency => {
        expect(currency.symbol.length).toBeGreaterThan(0);
        expect(currency.symbolNative.length).toBeGreaterThan(0);
      });
    });
  });
});
