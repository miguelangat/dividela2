# Testing Quick Start Guide - Payment Gating

**Goal**: Get from 0% to 60%+ test coverage in 1-2 weeks

---

## 🚀 Quick Start: First Hour

### Step 1: Fix Test Infrastructure (30 minutes)

```bash
# 1. Verify current test status
npm test

# 2. If tests fail with "Object.defineProperty" error:
npm install --save-dev react-test-renderer@19.1.0
npm install --save-dev jest-expo@latest

# 3. Verify fix
npm test -- --no-coverage

# 4. Run coverage baseline
npm run test:coverage
```

### Step 2: Set Up Test Structure (30 minutes)

```bash
# Create test directories
mkdir -p src/__tests__/services
mkdir -p src/__tests__/contexts
mkdir -p src/__tests__/components
mkdir -p src/__tests__/integration
mkdir -p src/__tests__/__mocks__
mkdir -p src/__tests__/__fixtures__

# Create placeholder files
touch src/__tests__/services/subscriptionService.test.js
touch src/__tests__/contexts/SubscriptionContext.test.js
touch src/__tests__/components/FeatureGate.test.js
```

---

## 📝 Day 1: First 5 Critical Tests (4 hours)

### Create: subscriptionService.test.js

```javascript
// src/__tests__/services/subscriptionService.test.js
import {
  initializeRevenueCat,
  purchasePackage,
  checkSubscriptionStatus,
  restorePurchases,
  syncSubscriptionWithFirebase,
} from '../../services/subscriptionService';

import Purchases from 'react-native-purchases';

// Mock RevenueCat
jest.mock('react-native-purchases');

describe('subscriptionService - Critical Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1: Purchase succeeds
  test('purchasePackage successfully completes purchase', async () => {
    // Arrange
    const mockPackage = { identifier: 'monthly' };
    const mockCustomerInfo = {
      entitlements: { active: { premium: {} } },
    };
    Purchases.purchasePackage.mockResolvedValue({
      customerInfo: mockCustomerInfo,
    });

    // Act
    const result = await purchasePackage(mockPackage, 'user123');

    // Assert
    expect(result.success).toBe(true);
    expect(Purchases.purchasePackage).toHaveBeenCalledWith(mockPackage);
  });

  // TEST 2: Purchase handles cancellation
  test('purchasePackage handles user cancellation gracefully', async () => {
    // Arrange
    const mockPackage = { identifier: 'monthly' };
    Purchases.purchasePackage.mockRejectedValue({
      code: 'PURCHASES_CANCELLED',
    });

    // Act
    const result = await purchasePackage(mockPackage, 'user123');

    // Assert
    expect(result.success).toBe(false);
    expect(result.cancelled).toBe(true);
  });

  // TEST 3: Check subscription status
  test('checkSubscriptionStatus returns correct premium status', async () => {
    // Arrange
    const mockCustomerInfo = {
      entitlements: { active: { premium: {} } },
    };
    Purchases.getCustomerInfo.mockResolvedValue(mockCustomerInfo);

    // Act
    const result = await checkSubscriptionStatus('user123');

    // Assert
    expect(result.isPremium).toBe(true);
  });

  // TEST 4: Restore purchases
  test('restorePurchases restores active subscriptions', async () => {
    // Arrange
    const mockCustomerInfo = {
      entitlements: { active: { premium: {} } },
    };
    Purchases.restorePurchases.mockResolvedValue({
      customerInfo: mockCustomerInfo,
    });

    // Act
    const result = await restorePurchases('user123');

    // Assert
    expect(result.restored).toBe(true);
    expect(result.isPremium).toBe(true);
  });

  // TEST 5: Initialize RevenueCat
  test('initializeRevenueCat configures with correct settings', async () => {
    // Act
    await initializeRevenueCat('user123');

    // Assert
    expect(Purchases.configure).toHaveBeenCalledWith({
      apiKey: expect.any(String),
      appUserID: 'user123',
    });
  });
});
```

### Run Your First Tests

```bash
npm test -- subscriptionService.test.js
```

**Expected**: 5 tests passing ✅

---

## 📝 Day 2: Partner Access Tests (4 hours)

### Add to: SubscriptionContext.test.js

```javascript
// src/__tests__/contexts/SubscriptionContext.test.js
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SubscriptionProvider, useSubscription } from '../../contexts/SubscriptionContext';
import Purchases from 'react-native-purchases';

jest.mock('react-native-purchases');

describe('SubscriptionContext - Partner Access', () => {

  // TEST 6: Partner premium access granted
  test('hasCoupleAccess grants premium when partner is premium', async () => {
    // Arrange: User A (free) paired with User B (premium)
    const userDetails = {
      uid: 'userA',
      partnerId: 'userB',
      coupleId: 'couple1',
      subscriptionStatus: 'free',
    };

    const partnerDetails = {
      uid: 'userB',
      partnerId: 'userA',
      coupleId: 'couple1',
      subscriptionStatus: 'premium',
    };

    // Mock getPartnerDetails
    jest.spyOn(AuthContext, 'getPartnerDetails').mockResolvedValue(partnerDetails);

    // Act
    const { result } = renderHook(() => useSubscription(), {
      wrapper: ({ children }) => (
        <SubscriptionProvider>{children}</SubscriptionProvider>
      ),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isPremium).toBe(true);
      expect(result.current.subscriptionInfo.source).toBe('partner');
    });
  });

  // TEST 7: Partner breakup detection
  test('hasCoupleAccess detects partner breakup (bidirectional validation)', async () => {
    // Arrange: User A points to User B, but User B points elsewhere
    const userDetails = {
      uid: 'userA',
      partnerId: 'userB',
      coupleId: 'couple1',
      subscriptionStatus: 'free',
    };

    const partnerDetails = {
      uid: 'userB',
      partnerId: 'userC', // Points to someone else!
      coupleId: 'couple2',
      subscriptionStatus: 'premium',
    };

    jest.spyOn(AuthContext, 'getPartnerDetails').mockResolvedValue(partnerDetails);

    // Act
    const { result } = renderHook(() => useSubscription());

    // Assert
    await waitFor(() => {
      expect(result.current.isPremium).toBe(false);
      expect(result.current.debugInfo.partnerRelationshipBroken).toBe(true);
    });
  });

  // TEST 8: Null partner handled
  test('hasCoupleAccess handles null partnerId gracefully', () => {
    // Arrange
    const userDetails = {
      uid: 'userA',
      partnerId: null,
      coupleId: null,
      subscriptionStatus: 'free',
    };

    // Act
    const { result } = renderHook(() => useSubscription());

    // Assert
    expect(result.current.isPremium).toBe(false);
  });

  // TEST 9: Mismatched coupleId
  test('hasCoupleAccess denies when coupleId mismatched', async () => {
    // Arrange
    const userDetails = {
      uid: 'userA',
      partnerId: 'userB',
      coupleId: 'couple1',
      subscriptionStatus: 'free',
    };

    const partnerDetails = {
      uid: 'userB',
      partnerId: 'userA',
      coupleId: 'couple2', // Different couple!
      subscriptionStatus: 'premium',
    };

    jest.spyOn(AuthContext, 'getPartnerDetails').mockResolvedValue(partnerDetails);

    // Act
    const { result } = renderHook(() => useSubscription());

    // Assert
    await waitFor(() => {
      expect(result.current.isPremium).toBe(false);
    });
  });

  // TEST 10: Both users premium
  test('hasCoupleAccess grants when user is premium (regardless of partner)', () => {
    // Arrange
    const userDetails = {
      uid: 'userA',
      subscriptionStatus: 'premium',
    };

    // Act
    const { result } = renderHook(() => useSubscription());

    // Assert
    expect(result.current.isPremium).toBe(true);
  });
});
```

### Run Tests

```bash
npm test -- SubscriptionContext.test.js
```

**Expected**: 5 tests passing (10 total) ✅

---

## 📝 Day 3: Feature Gating Tests (4 hours)

### Create: FeatureGate.test.js

```javascript
// src/__tests__/components/FeatureGate.test.js
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import FeatureGate, { useFeatureGate } from '../../components/FeatureGate';
import { SubscriptionContext } from '../../contexts/SubscriptionContext';

describe('FeatureGate - Component', () => {

  // TEST 11: Renders children when premium
  test('renders children when user has premium access', () => {
    // Arrange
    const mockSubscription = { isPremium: true, isLocked: false };

    // Act
    const { getByText, queryByText } = render(
      <SubscriptionContext.Provider value={mockSubscription}>
        <FeatureGate feature="annual_view">
          <Text>Premium Content</Text>
        </FeatureGate>
      </SubscriptionContext.Provider>
    );

    // Assert
    expect(getByText('Premium Content')).toBeTruthy();
    expect(queryByText('Upgrade to Premium')).toBeNull();
  });

  // TEST 12: Renders fallback when free
  test('renders fallback when user lacks access', () => {
    // Arrange
    const mockSubscription = { isPremium: false, isLocked: true };

    // Act
    const { getByText, queryByText } = render(
      <SubscriptionContext.Provider value={mockSubscription}>
        <FeatureGate
          feature="annual_view"
          fallback={<Text>Upgrade Required</Text>}
        >
          <Text>Premium Content</Text>
        </FeatureGate>
      </SubscriptionContext.Provider>
    );

    // Assert
    expect(getByText('Upgrade Required')).toBeTruthy();
    expect(queryByText('Premium Content')).toBeNull();
  });

  // TEST 13: Uses default fallback
  test('uses default fallback if none provided', () => {
    // Arrange
    const mockSubscription = { isPremium: false, isLocked: true };

    // Act
    const { getByText } = render(
      <SubscriptionContext.Provider value={mockSubscription}>
        <FeatureGate feature="annual_view">
          <Text>Premium Content</Text>
        </FeatureGate>
      </SubscriptionContext.Provider>
    );

    // Assert
    expect(getByText(/premium feature/i)).toBeTruthy();
  });

  // TEST 14: Handles loading state
  test('shows loading indicator during subscription check', () => {
    // Arrange
    const mockSubscription = { isPremium: false, loading: true };

    // Act
    const { getByTestId } = render(
      <SubscriptionContext.Provider value={mockSubscription}>
        <FeatureGate feature="annual_view">
          <Text>Premium Content</Text>
        </FeatureGate>
      </SubscriptionContext.Provider>
    );

    // Assert
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  // TEST 15: Updates when subscription changes
  test('updates when subscription status changes', async () => {
    // Arrange
    const mockSubscription = { isPremium: false, isLocked: true };

    const { rerender, queryByText } = render(
      <SubscriptionContext.Provider value={mockSubscription}>
        <FeatureGate feature="annual_view">
          <Text>Premium Content</Text>
        </FeatureGate>
      </SubscriptionContext.Provider>
    );

    // Verify paywall shown
    expect(queryByText('Premium Content')).toBeNull();

    // Act: Update to premium
    const updatedSubscription = { isPremium: true, isLocked: false };
    rerender(
      <SubscriptionContext.Provider value={updatedSubscription}>
        <FeatureGate feature="annual_view">
          <Text>Premium Content</Text>
        </FeatureGate>
      </SubscriptionContext.Provider>
    );

    // Assert: Content now visible
    expect(queryByText('Premium Content')).toBeTruthy();
  });
});
```

### Run Tests

```bash
npm test -- FeatureGate.test.js
```

**Expected**: 5 tests passing (15 total) ✅

---

## 📊 Progress Tracking

### After Day 3

```bash
npm run test:coverage
```

**Expected Coverage**:
- subscriptionService.js: ~40%
- SubscriptionContext.js: ~30%
- FeatureGate.js: ~60%
- Overall: ~20-25%

**Tests**: 15 passing ✅

---

## 📝 Week 1 Goal: 30 Tests

Continue adding tests following the patterns above:

### Day 4-5: Add 15 more tests
- Caching tests (5)
- Retry logic tests (5)
- Offline mode tests (5)

**Week 1 Target**:
- ✅ 30 tests passing
- ✅ 40%+ coverage
- ✅ Critical business logic verified

---

## 🎯 Success Criteria

### Week 1 (Minimum Viable)
- [ ] 30+ tests passing
- [ ] 40%+ coverage
- [ ] Purchase flow tested
- [ ] Partner access tested
- [ ] Feature gating tested

### Week 2 (Production Ready)
- [ ] 85+ tests passing
- [ ] 60%+ coverage
- [ ] Integration tests added
- [ ] CI/CD pipeline green

### Week 3 (Comprehensive)
- [ ] 116+ tests passing
- [ ] 85%+ coverage
- [ ] E2E tests added
- [ ] All edge cases covered

---

## 🐛 Troubleshooting

### Issue: Tests fail with "Cannot find module"
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Issue: Mock not working
```javascript
// Use jest.mock at top of file
jest.mock('react-native-purchases');

// Reset before each test
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Issue: Async tests timing out
```javascript
// Increase timeout
test('async test', async () => {
  // ...
}, 10000); // 10 second timeout
```

---

## 📚 Resources

- **React Native Testing Library**: https://callstack.github.io/react-native-testing-library/
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **RevenueCat Testing**: https://www.revenuecat.com/docs/test-and-launch
- **Existing Test Examples**: `src/__tests__/services/expenseService.test.js`

---

## 🚀 Quick Commands Reference

```bash
# Run all tests
npm test

# Run specific test file
npm test -- subscriptionService.test.js

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests matching pattern
npm test -- --testNamePattern="purchase"

# Update snapshots
npm test -- -u
```

---

**Next**: Start with Day 1 - First 5 critical tests!
