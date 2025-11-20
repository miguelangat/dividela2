// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// React 19 compatibility fix
// Suppress ReactDOM.render deprecation warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('ReactDOM.render') ||
        args[0].includes('not wrapped in act'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: Text,
    MaterialIcons: Text,
    FontAwesome: Text,
  };
});

// Mock react-navigation
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    NavigationContainer: ({ children }) => children,
  };
});

// Mock Firebase
jest.mock('./src/config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      // Simple mock translation that returns the key with params
      if (params) {
        return key + JSON.stringify(params);
      }
      return key;
    },
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  documentDirectory: 'file:///',
}));

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({
    text: 'Sample PDF text',
    numpages: 1,
    numrender: 1,
    info: {},
    metadata: {},
    version: '1.0',
  });
});

// Mock react-native-paper Portal
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const { View } = require('react-native');
  return {
    ...RealModule,
    Portal: ({ children }) => children,
  };
});

// Mock Intl.NumberFormat for currency formatting
// Ensures consistent formatting across test environments
if (!global.Intl) {
  global.Intl = {};
}

const originalNumberFormat = global.Intl.NumberFormat;
global.Intl.NumberFormat = function (locale, options) {
  // For currency formatting, return a simple mock
  if (options && options.style === 'currency') {
    return {
      format: (value) => {
        const symbol = options.currency === 'USD' ? '$'
          : options.currency === 'EUR' ? '€'
          : options.currency === 'GBP' ? '£'
          : options.currency === 'MXN' ? 'MX$'
          : options.currency === 'COP' ? 'COL$'
          : options.currency === 'PEN' ? 'S/'
          : options.currency === 'CNY' ? '¥'
          : options.currency === 'BRL' ? 'R$'
          : '$';

        const decimals = options.maximumFractionDigits || 2;
        return `${symbol}${Math.abs(value).toFixed(decimals)}`;
      },
    };
  }

  // For other number formats, use original or simple mock
  if (originalNumberFormat) {
    return new originalNumberFormat(locale, options);
  }

  return {
    format: (value) => String(value),
  };
};

// Mock exchange rate APIs (if implemented in future)
global.fetch = jest.fn((url) => {
  // Mock exchange rate API responses
  if (url.includes('exchangerate') || url.includes('currency')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        rates: {
          EUR: 0.92,
          USD: 1.0,
          GBP: 0.79,
          MXN: 17.5,
          COP: 4000,
          PEN: 3.7,
          CNY: 7.2,
          BRL: 5.0,
        },
        base: 'USD',
        date: '2025-01-15',
      }),
    });
  }

  // For other fetch calls, return empty success
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
});

// Currency test utilities
global.currencyTestUtils = {
  // Create mock expense with multi-currency data
  createMockExpense: (overrides = {}) => ({
    id: 'test-expense-1',
    amount: 100,
    currency: 'USD',
    primaryCurrency: 'USD',
    primaryCurrencyAmount: 100,
    exchangeRate: 1.0,
    exchangeRateSource: 'none',
    description: 'Test expense',
    category: 'food',
    categoryKey: 'food',
    paidBy: 'user1',
    coupleId: 'couple1',
    date: new Date('2025-01-15').toISOString(),
    splitDetails: {
      user1Amount: 50,
      user2Amount: 50,
      user1Percentage: 50,
      user2Percentage: 50,
    },
    ...overrides,
  }),

  // Create mock multi-currency expense
  createMockMultiCurrencyExpense: (amount, fromCurrency, toCurrency, rate) => ({
    id: 'test-expense-multicurrency',
    amount,
    currency: fromCurrency,
    primaryCurrency: toCurrency,
    primaryCurrencyAmount: amount * rate,
    exchangeRate: rate,
    exchangeRateSource: 'manual',
    description: 'Multi-currency test expense',
    category: 'food',
    categoryKey: 'food',
    paidBy: 'user1',
    coupleId: 'couple1',
    date: new Date().toISOString(),
    splitDetails: {
      user1Amount: (amount * rate) / 2,
      user2Amount: (amount * rate) / 2,
      user1Percentage: 50,
      user2Percentage: 50,
    },
  }),

  // Common currency codes for testing
  currencies: {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
    MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
    COP: { code: 'COP', symbol: 'COL$', name: 'Colombian Peso' },
    PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
    CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  },

  // Common exchange rates for testing
  exchangeRates: {
    EUR_TO_USD: 1.10,
    USD_TO_EUR: 0.91,
    GBP_TO_USD: 1.27,
    USD_TO_GBP: 0.79,
    MXN_TO_USD: 0.057,
    USD_TO_MXN: 17.5,
  },
};

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
