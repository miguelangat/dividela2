// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Polyfill for TextEncoder/TextDecoder (required for jest-expo)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Workaround for jest-expo issue with Node 22+
// Patch Object.defineProperty to handle null/undefined objects gracefully
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
  if (obj === null || obj === undefined) {
    console.warn(`Attempted to defineProperty on ${obj} for property ${prop}`);
    return obj;
  }
  return originalDefineProperty(obj, prop, descriptor);
};

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

// React 19 ACT environment flag
global.IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill for fetch API
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      blob: () => Promise.resolve({
        data: 'mock-image-data',
        type: 'image/jpeg',
        size: 1024,
      }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  );
  global.Headers = jest.fn();
  global.Request = jest.fn();
  global.Response = jest.fn();
} else {
  // Override existing fetch for testing
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      blob: () => Promise.resolve({
        data: 'mock-image-data',
        type: 'image/jpeg',
        size: 1024,
      }),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  );
}

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
  auth: {
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  },
  db: {},
  storage: {},
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // Call callback with null user by default
    setTimeout(() => callback(null), 0);
    return jest.fn(); // unsubscribe function
  }),
  updateProfile: jest.fn(),
  updateEmail: jest.fn(),
  updatePassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  deleteUser: jest.fn(),
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  deleteObject: jest.fn(),
  getDownloadURL: jest.fn(),
  getStorage: jest.fn(() => ({})),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  increment: jest.fn((n) => n),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 })),
    fromDate: jest.fn((date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 })),
  },
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

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  getCameraPermissionsAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
  FlipType: {
    Horizontal: 'horizontal',
    Vertical: 'vertical',
  },
  manipulateAsync: jest.fn(),
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock-documents/',
  cacheDirectory: 'file:///mock-cache/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  moveAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
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

// Mock string-similarity
jest.mock('string-similarity', () => ({
  compareTwoStrings: jest.fn((str1, str2) => {
    // Simple similarity calculation for testing
    const similarity = str1.toLowerCase() === str2.toLowerCase() ? 1.0 : 0.5;
    return similarity;
  }),
  findBestMatch: jest.fn((mainString, targetStrings) => {
    return {
      ratings: targetStrings.map((target) => ({
        target,
        rating: mainString.toLowerCase() === target.toLowerCase() ? 1.0 : 0.5,
      })),
      bestMatch: {
        target: targetStrings[0],
        rating: 0.8,
      },
    };
  }),
}));

// Mock react-native-purchases
jest.mock('react-native-purchases', () => {
  const mockCustomerInfo = {
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    latestExpirationDate: null,
    entitlements: {
      active: {},
      all: {},
    },
  };

  return {
    __esModule: true,
    default: {
      configure: jest.fn(),
      setLogLevel: jest.fn(),
      getCustomerInfo: jest.fn().mockResolvedValue(mockCustomerInfo),
      logIn: jest.fn().mockResolvedValue({ customerInfo: mockCustomerInfo, created: false }),
      logOut: jest.fn().mockResolvedValue(mockCustomerInfo),
      getOfferings: jest.fn().mockResolvedValue({ all: {}, current: null }),
      purchasePackage: jest.fn(),
      restorePurchases: jest.fn().mockResolvedValue(mockCustomerInfo),
      syncPurchases: jest.fn().mockResolvedValue(mockCustomerInfo),
    },
    LOG_LEVEL: {
      VERBOSE: 'VERBOSE',
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR',
    },
    PURCHASES_ERROR_CODE: {
      UNKNOWN_ERROR: 0,
      PURCHASE_CANCELLED_ERROR: 1,
      STORE_PROBLEM_ERROR: 2,
      PURCHASE_NOT_ALLOWED_ERROR: 3,
      PURCHASE_INVALID_ERROR: 4,
      PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: 5,
      PRODUCT_ALREADY_PURCHASED_ERROR: 6,
      RECEIPT_ALREADY_IN_USE_ERROR: 7,
      INVALID_RECEIPT_ERROR: 8,
      MISSING_RECEIPT_FILE_ERROR: 9,
      NETWORK_ERROR: 10,
      INVALID_CREDENTIALS_ERROR: 11,
      UNEXPECTED_BACKEND_RESPONSE_ERROR: 12,
      INVALID_APP_USER_ID_ERROR: 14,
      OPERATION_ALREADY_IN_PROGRESS_ERROR: 15,
      UNKNOWN_BACKEND_ERROR: 16,
    },
  };
});
// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
