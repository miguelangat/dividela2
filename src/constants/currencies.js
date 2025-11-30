// src/constants/currencies.js
// Multi-currency support constants and configuration

/**
 * Supported currencies with metadata
 * Priority currencies based on user requirements:
 * USD, EUR, MXN, COP, PEN (Sol), CNY (Yuan), BRL, GBP
 */
export const SUPPORTED_CURRENCIES = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    symbolNative: '$',
    symbolPosition: 'prefix',
    locale: 'en-US',
    decimals: 2,
    flag: '🇺🇸',
    popular: true,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    symbolNative: '€',
    symbolPosition: 'suffix',
    locale: 'de-DE',
    decimals: 2,
    flag: '🇪🇺',
    popular: true,
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: 'MX$',
    symbolNative: '$',
    symbolPosition: 'prefix',
    locale: 'es-MX',
    decimals: 2,
    flag: '🇲🇽',
    popular: true,
  },
  COP: {
    code: 'COP',
    name: 'Colombian Peso',
    symbol: 'COL$',
    symbolNative: '$',
    symbolPosition: 'prefix',
    locale: 'es-CO',
    decimals: 2,
    flag: '🇨🇴',
    popular: true,
  },
  PEN: {
    code: 'PEN',
    name: 'Peruvian Sol',
    symbol: 'S/',
    symbolNative: 'S/',
    symbolPosition: 'prefix',
    locale: 'es-PE',
    decimals: 2,
    flag: '🇵🇪',
    popular: true,
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    symbolNative: '¥',
    symbolPosition: 'prefix',
    locale: 'zh-CN',
    decimals: 2,
    flag: '🇨🇳',
    popular: true,
  },
  BRL: {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    symbolNative: 'R$',
    symbolPosition: 'prefix',
    locale: 'pt-BR',
    decimals: 2,
    flag: '🇧🇷',
    popular: true,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    symbolNative: '£',
    symbolPosition: 'prefix',
    locale: 'en-GB',
    decimals: 2,
    flag: '🇬🇧',
    popular: true,
  },
};

/**
 * Default currency (fallback)
 */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Get currency info by code
 * @param {string} code - Currency code (e.g., 'USD')
 * @returns {object} Currency info or default
 */
export const getCurrencyInfo = (code) => {
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
};

/**
 * Get array of all supported currencies
 * @returns {Array} Array of currency objects
 */
export const getAllCurrencies = () => {
  return Object.values(SUPPORTED_CURRENCIES);
};

/**
 * Get popular currencies (sorted by usage)
 * @returns {Array} Array of popular currency codes
 */
export const getPopularCurrencies = () => {
  return Object.keys(SUPPORTED_CURRENCIES).filter(
    (code) => SUPPORTED_CURRENCIES[code].popular
  );
};

/**
 * Validate if currency code is supported
 * @param {string} code - Currency code
 * @returns {boolean} True if supported
 */
export const isSupportedCurrency = (code) => {
  return code in SUPPORTED_CURRENCIES;
};

/**
 * Get currency symbol
 * @param {string} code - Currency code
 * @param {boolean} native - Use native symbol (e.g., $ instead of MX$)
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (code, native = false) => {
  const currency = getCurrencyInfo(code);
  return native ? currency.symbolNative : currency.symbol;
};

/**
 * Get currency name
 * @param {string} code - Currency code
 * @returns {string} Currency name
 */
export const getCurrencyName = (code) => {
  return getCurrencyInfo(code).name;
};

/**
 * Get currency flag emoji
 * @param {string} code - Currency code
 * @returns {string} Flag emoji
 */
export const getCurrencyFlag = (code) => {
  return getCurrencyInfo(code).flag;
};

/**
 * Format currency for display in UI (with symbol and code)
 * @param {string} code - Currency code
 * @returns {string} Display string (e.g., "$ USD", "€ EUR")
 */
export const formatCurrencyDisplay = (code) => {
  const currency = getCurrencyInfo(code);
  return `${currency.flag} ${currency.symbol} ${code}`;
};

/**
 * Parse currency code from various inputs
 * @param {string} input - Currency input (code, symbol, name)
 * @returns {string} Currency code or default
 */
export const parseCurrencyCode = (input) => {
  if (!input) return DEFAULT_CURRENCY;

  const normalized = input.toUpperCase().trim();

  // Direct code match
  if (isSupportedCurrency(normalized)) {
    return normalized;
  }

  // Search by symbol or name
  const found = Object.entries(SUPPORTED_CURRENCIES).find(
    ([code, info]) =>
      info.symbol === input ||
      info.symbolNative === input ||
      info.name.toUpperCase() === normalized
  );

  return found ? found[0] : DEFAULT_CURRENCY;
};

export default {
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
};
