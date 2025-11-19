// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// React 19 compatibility
global.IS_REACT_ACT_ENVIRONMENT = true;

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

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date) => ({ toDate: () => date })),
  },
}));

// Mock RevenueCat
jest.mock('react-native-purchases', () => ({
  configure: jest.fn().mockResolvedValue(undefined),
  getOfferings: jest.fn().mockResolvedValue({
    current: {
      monthly: {
        identifier: 'monthly_premium',
        product: {
          identifier: 'com.dividela.premium.monthly',
          price: 4.99,
          priceString: '$4.99',
          currencyCode: 'USD',
        },
      },
      annual: {
        identifier: 'annual_premium',
        product: {
          identifier: 'com.dividela.premium.annual',
          price: 39.99,
          priceString: '$39.99',
          currencyCode: 'USD',
        },
      },
    },
  }),
  purchasePackage: jest.fn().mockResolvedValue({
    customerInfo: {
      entitlements: {
        active: {},
      },
      activeSubscriptions: [],
    },
  }),
  getCustomerInfo: jest.fn().mockResolvedValue({
    entitlements: {
      active: {},
    },
    activeSubscriptions: [],
  }),
  restorePurchases: jest.fn().mockResolvedValue({
    customerInfo: {
      entitlements: {
        active: {},
      },
      activeSubscriptions: [],
    },
  }),
  setDebugLogsEnabled: jest.fn(),
  LOG_LEVEL: {
    VERBOSE: 'VERBOSE',
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
  },
}));

// Mock AppState
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  currentState: 'active',
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: console.log, // Keep log for debugging
};
