/**
 * Mock subscription data fixtures for testing
 *
 * These fixtures represent common subscription states used across tests
 */

// Mock RevenueCat Offerings
export const MOCK_OFFERINGS = {
  current: {
    monthly: {
      identifier: 'monthly_premium',
      packageType: 'MONTHLY',
      product: {
        identifier: 'com.dividela.premium.monthly',
        price: 4.99,
        priceString: '$4.99',
        currencyCode: 'USD',
        title: 'Premium Monthly',
        description: 'Dividela Premium - Monthly Subscription',
      },
    },
    annual: {
      identifier: 'annual_premium',
      packageType: 'ANNUAL',
      product: {
        identifier: 'com.dividela.premium.annual',
        price: 39.99,
        priceString: '$39.99',
        currencyCode: 'USD',
        title: 'Premium Annual',
        description: 'Dividela Premium - Annual Subscription',
      },
    },
  },
  all: [],
};

// Mock RevenueCat CustomerInfo - Premium Active
export const MOCK_CUSTOMER_INFO_PREMIUM = {
  entitlements: {
    active: {
      premium: {
        identifier: 'premium',
        isActive: true,
        willRenew: true,
        productIdentifier: 'com.dividela.premium.monthly',
        purchaseDate: '2025-01-01T00:00:00Z',
        expirationDate: '2025-12-31T23:59:59Z',
        isSandbox: true,
        store: 'APP_STORE',
      },
    },
    all: {
      premium: {
        identifier: 'premium',
        isActive: true,
        willRenew: true,
        productIdentifier: 'com.dividela.premium.monthly',
        purchaseDate: '2025-01-01T00:00:00Z',
        expirationDate: '2025-12-31T23:59:59Z',
        isSandbox: true,
        store: 'APP_STORE',
      },
    },
  },
  activeSubscriptions: ['com.dividela.premium.monthly'],
  allPurchasedProductIdentifiers: ['com.dividela.premium.monthly'],
  latestExpirationDate: '2025-12-31T23:59:59Z',
  originalAppUserId: 'user123',
  requestDate: '2025-01-19T00:00:00Z',
};

// Mock RevenueCat CustomerInfo - Free Tier
export const MOCK_CUSTOMER_INFO_FREE = {
  entitlements: {
    active: {},
    all: {},
  },
  activeSubscriptions: [],
  allPurchasedProductIdentifiers: [],
  latestExpirationDate: null,
  originalAppUserId: 'user123',
  requestDate: '2025-01-19T00:00:00Z',
};

// Mock RevenueCat CustomerInfo - Expired
export const MOCK_CUSTOMER_INFO_EXPIRED = {
  entitlements: {
    active: {},
    all: {
      premium: {
        identifier: 'premium',
        isActive: false,
        willRenew: false,
        productIdentifier: 'com.dividela.premium.monthly',
        purchaseDate: '2024-01-01T00:00:00Z',
        expirationDate: '2024-12-31T23:59:59Z',
        isSandbox: true,
        store: 'APP_STORE',
      },
    },
  },
  activeSubscriptions: [],
  allPurchasedProductIdentifiers: ['com.dividela.premium.monthly'],
  latestExpirationDate: '2024-12-31T23:59:59Z',
  originalAppUserId: 'user123',
  requestDate: '2025-01-19T00:00:00Z',
};

// Mock RevenueCat CustomerInfo - Trial
export const MOCK_CUSTOMER_INFO_TRIAL = {
  entitlements: {
    active: {
      premium: {
        identifier: 'premium',
        isActive: true,
        willRenew: true,
        productIdentifier: 'com.dividela.premium.monthly',
        purchaseDate: '2025-01-15T00:00:00Z',
        expirationDate: '2025-01-22T00:00:00Z',
        isSandbox: true,
        store: 'APP_STORE',
        periodType: 'TRIAL',
      },
    },
    all: {
      premium: {
        identifier: 'premium',
        isActive: true,
        willRenew: true,
        productIdentifier: 'com.dividela.premium.monthly',
        purchaseDate: '2025-01-15T00:00:00Z',
        expirationDate: '2025-01-22T00:00:00Z',
        isSandbox: true,
        store: 'APP_STORE',
        periodType: 'TRIAL',
      },
    },
  },
  activeSubscriptions: ['com.dividela.premium.monthly'],
  allPurchasedProductIdentifiers: ['com.dividela.premium.monthly'],
  latestExpirationDate: '2025-01-22T00:00:00Z',
  originalAppUserId: 'user123',
  requestDate: '2025-01-19T00:00:00Z',
};

// Mock User Details - Free User
export const MOCK_USER_FREE = {
  uid: 'user123',
  email: 'user@example.com',
  displayName: 'Test User',
  partnerId: null,
  coupleId: null,
  subscriptionStatus: 'free',
  subscriptionPlatform: null,
  subscriptionExpiresAt: null,
  subscriptionProductId: null,
  revenueCatUserId: 'user123',
  trialUsed: false,
  trialEndsAt: null,
  lastSyncedAt: null,
  createdAt: new Date('2025-01-01'),
};

// Mock User Details - Premium User
export const MOCK_USER_PREMIUM = {
  uid: 'user123',
  email: 'user@example.com',
  displayName: 'Premium User',
  partnerId: null,
  coupleId: null,
  subscriptionStatus: 'premium',
  subscriptionPlatform: 'ios',
  subscriptionExpiresAt: new Date('2025-12-31'),
  subscriptionProductId: 'com.dividela.premium.monthly',
  revenueCatUserId: 'user123',
  trialUsed: false,
  trialEndsAt: null,
  lastSyncedAt: new Date(),
  createdAt: new Date('2025-01-01'),
};

// Mock User Details - Paired Users (Free + Premium)
export const MOCK_USER_A_FREE = {
  uid: 'userA',
  email: 'usera@example.com',
  displayName: 'User A',
  partnerId: 'userB',
  coupleId: 'couple123',
  subscriptionStatus: 'free',
  subscriptionPlatform: null,
  subscriptionExpiresAt: null,
  subscriptionProductId: null,
  revenueCatUserId: 'userA',
  trialUsed: false,
  trialEndsAt: null,
  lastSyncedAt: new Date(),
  createdAt: new Date('2025-01-01'),
};

export const MOCK_USER_B_PREMIUM = {
  uid: 'userB',
  email: 'userb@example.com',
  displayName: 'User B',
  partnerId: 'userA',
  coupleId: 'couple123',
  subscriptionStatus: 'premium',
  subscriptionPlatform: 'android',
  subscriptionExpiresAt: new Date('2025-12-31'),
  subscriptionProductId: 'com.dividela.premium.monthly',
  revenueCatUserId: 'userB',
  trialUsed: false,
  trialEndsAt: null,
  lastSyncedAt: new Date(),
  createdAt: new Date('2025-01-01'),
};

// Mock User Details - Broken Relationship (mismatched partner IDs)
export const MOCK_USER_A_BROKEN = {
  uid: 'userA',
  email: 'usera@example.com',
  displayName: 'User A',
  partnerId: 'userB',
  coupleId: 'couple123',
  subscriptionStatus: 'free',
  subscriptionPlatform: null,
  subscriptionExpiresAt: null,
  subscriptionProductId: null,
  revenueCatUserId: 'userA',
  trialUsed: false,
  trialEndsAt: null,
  lastSyncedAt: new Date(),
  createdAt: new Date('2025-01-01'),
};

export const MOCK_USER_B_BROKEN = {
  uid: 'userB',
  email: 'userb@example.com',
  displayName: 'User B',
  partnerId: 'userC', // Points to someone else!
  coupleId: 'couple456', // Different couple!
  subscriptionStatus: 'premium',
  subscriptionPlatform: 'android',
  subscriptionExpiresAt: new Date('2025-12-31'),
  subscriptionProductId: 'com.dividela.premium.monthly',
  revenueCatUserId: 'userB',
  trialUsed: false,
  trialEndsAt: null,
  lastSyncedAt: new Date(),
  createdAt: new Date('2025-01-01'),
};

// Mock AsyncStorage Cache - Premium
export const MOCK_CACHE_PREMIUM = {
  isPremium: true,
  subscriptionStatus: 'premium',
  subscriptionPlatform: 'ios',
  subscriptionExpiresAt: '2025-12-31T23:59:59.000Z',
  subscriptionProductId: 'com.dividela.premium.monthly',
  cachedAt: Date.now(),
};

// Mock AsyncStorage Cache - Free
export const MOCK_CACHE_FREE = {
  isPremium: false,
  subscriptionStatus: 'free',
  subscriptionPlatform: null,
  subscriptionExpiresAt: null,
  subscriptionProductId: null,
  cachedAt: Date.now(),
};

// Mock AsyncStorage Cache - Expired (older than 5 minutes)
export const MOCK_CACHE_EXPIRED = {
  isPremium: true,
  subscriptionStatus: 'premium',
  subscriptionPlatform: 'ios',
  subscriptionExpiresAt: '2025-12-31T23:59:59.000Z',
  subscriptionProductId: 'com.dividela.premium.monthly',
  cachedAt: Date.now() - (6 * 60 * 1000), // 6 minutes ago
};

// RevenueCat Error Codes
export const REVENUECAT_ERRORS = {
  USER_CANCELLED: {
    code: 'PURCHASES_CANCELLED',
    message: 'The user cancelled the purchase',
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed',
  },
  PRODUCT_NOT_AVAILABLE: {
    code: 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE',
    message: 'Product is not available for purchase',
  },
  PAYMENT_PENDING: {
    code: 'PAYMENT_PENDING',
    message: 'Payment is pending',
  },
  STORE_PROBLEM: {
    code: 'STORE_PROBLEM',
    message: 'There was a problem with the store',
  },
};

// Firebase Errors
export const FIREBASE_ERRORS = {
  PERMISSION_DENIED: {
    code: 'permission-denied',
    message: 'Missing or insufficient permissions',
  },
  NOT_FOUND: {
    code: 'not-found',
    message: 'Document not found',
  },
  UNAVAILABLE: {
    code: 'unavailable',
    message: 'The service is currently unavailable',
  },
};
