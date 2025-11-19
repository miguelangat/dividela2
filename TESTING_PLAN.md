# Comprehensive Testing Plan: Multi-Account Feature

## Executive Summary

This document outlines a complete testing strategy for the multi-account feature implementation in DivideLa, covering unit tests, integration tests, E2E tests, and Firestore security rules testing. The plan ensures comprehensive coverage from the data layer through to user-facing functionality.

---

## Table of Contents

1. [Current Testing Infrastructure](#current-testing-infrastructure)
2. [Testing Pyramid Strategy](#testing-pyramid-strategy)
3. [Phase 1: Data Layer Testing](#phase-1-data-layer-testing)
4. [Phase 2: Context Layer Testing](#phase-2-context-layer-testing)
5. [Phase 3: Component & Screen Testing](#phase-3-component--screen-testing)
6. [Phase 4: Integration Testing](#phase-4-integration-testing)
7. [Phase 5: E2E Testing](#phase-5-e2e-testing)
8. [Phase 6: Firestore Rules Testing](#phase-6-firestore-rules-testing)
9. [Test Coverage Goals](#test-coverage-goals)
10. [Testing Tools & Setup](#testing-tools--setup)
11. [Implementation Timeline](#implementation-timeline)
12. [Continuous Integration](#continuous-integration)

---

## Current Testing Infrastructure

### ✅ Already In Place

- **Testing Framework**: Jest (configured and working)
- **React Testing**: @testing-library/react-native
- **Existing Test Suites**:
  - ✓ `budgetService.test.js` - Budget calculations
  - ✓ `expenseService.test.js` - Expense operations
  - ✓ `settlementService.test.js` - Settlement logic
  - ✓ `AuthContext.test.js` - User authentication
  - ✓ `calculations.test.js` - Utility calculations
  - ✓ `validators.test.js` - Input validation
  - ✓ Onboarding flow tests (navigation, UI flows)
  - ✓ Component tests (ScrollableContainer)

- **Mocking Setup**:
  - ✓ AsyncStorage
  - ✓ React Navigation
  - ✓ Firebase (basic mock)
  - ✓ Expo modules
  - ✓ Safe Area Context

- **Test Commands**:
  - `npm test` - Run all tests
  - `npm run test:watch` - Watch mode
  - `npm run test:coverage` - Coverage report

### ❌ Missing/Needed

- ❌ Firestore emulator testing
- ❌ Firestore security rules testing
- ❌ E2E tests for multi-account flows
- ❌ Integration tests for account switching
- ❌ Performance/load testing
- ❌ Visual regression testing
- ❌ Accessibility testing

---

## Testing Pyramid Strategy

```
                  ╱╲
                 ╱  ╲
                ╱ E2E╲           ~10% (5-10 tests)
               ╱      ╲          Critical user journeys
              ╱────────╲
             ╱          ╲
            ╱Integration╲        ~20% (20-30 tests)
           ╱             ╲       Cross-component flows
          ╱───────────────╲
         ╱                 ╲
        ╱   Unit Tests      ╲   ~70% (100+ tests)
       ╱                     ╲  Individual functions/components
      ╱───────────────────────╲
```

**Distribution for Multi-Account Feature:**

- **Unit Tests**: 70% (~50-60 tests)
  - Service functions
  - Utility functions
  - Context logic
  - Individual component behaviors

- **Integration Tests**: 20% (~15-20 tests)
  - Account creation flows
  - Account switching
  - Data persistence
  - Context interactions

- **E2E Tests**: 10% (~5-8 tests)
  - Complete user journeys
  - Critical paths
  - Cross-feature flows

---

## Phase 1: Data Layer Testing

### 1.1 Account Service Tests (`accountService.test.js`)

**Priority**: 🔴 **HIGH** (Core functionality)

**Test Coverage: 90%+**

#### Test Suite Structure

```javascript
describe('accountService.js', () => {
  describe('createSoloAccount', () => {
    it('should create a solo account with correct structure')
    it('should generate unique account ID')
    it('should set type as "solo" and partnerId as null')
    it('should add account to user\'s accounts array')
    it('should handle Firestore write errors')
    it('should return account data on success')
  });

  describe('createCoupleAccount', () => {
    it('should create couple account with both users')
    it('should fetch partner details from Firestore')
    it('should add account to both users\' arrays')
    it('should set correct roles (owner vs member)')
    it('should handle partner not found error')
    it('should handle Firestore transaction failures')
    it('should use partner\'s custom account name if provided')
  });

  describe('switchActiveAccount', () => {
    it('should update activeAccountId in Firestore')
    it('should verify account exists before switching')
    it('should throw error if account not found')
    it('should handle Firestore update errors')
  });

  describe('getUserAccounts', () => {
    it('should return empty array if user has no accounts')
    it('should return all user accounts')
    it('should handle Firestore read errors')
    it('should return empty array if user document does not exist')
  });

  describe('addAccountToUser', () => {
    it('should add account with correct structure')
    it('should use arrayUnion to prevent duplicates')
    it('should set joinedAt timestamp')
    it('should handle missing account data fields')
  });

  describe('removeAccountFromUser', () => {
    it('should remove account from array')
    it('should clear activeAccountId if removing active account')
    it('should set new active account after removal')
    it('should throw error if account not found')
    it('should not allow removing if it\'s the last account')
  });

  describe('updateAccountName', () => {
    it('should update account name')
    it('should preserve other account fields')
    it('should use array remove + add pattern')
    it('should validate new name before updating')
  });

  describe('getActiveAccount', () => {
    it('should return active account object')
    it('should return null if no active account')
    it('should return null if activeAccountId doesn\'t match any account')
  });

  describe('ensureActiveAccount', () => {
    it('should set first account as active if none selected')
    it('should not change if user already has active account')
    it('should return false if user has no accounts')
  });
});
```

**Mocking Strategy:**
```javascript
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((val) => ({ arrayUnion: val })),
  arrayRemove: jest.fn((val) => ({ arrayRemove: val })),
  serverTimestamp: jest.fn(() => ({ serverTimestamp: true })),
}));
```

**Estimated Tests**: 35-40 tests
**Lines of Code**: ~600-800 lines
**Time to Implement**: 2-3 days

---

### 1.2 Account Defaults/Constants Tests (`accountDefaults.test.js`)

**Priority**: 🟡 **MEDIUM**

**Test Coverage: 95%+**

#### Test Suite Structure

```javascript
describe('accountDefaults.js', () => {
  describe('getDefaultAccountName', () => {
    it('should return "My Budget" for first solo account')
    it('should return "Personal Budget" for additional solo accounts')
    it('should return "Budget with {partnerName}" for couple accounts')
    it('should handle null partner name gracefully')
  });

  describe('validateAccountName', () => {
    it('should accept valid account names')
    it('should reject empty names')
    it('should reject names exceeding max length')
    it('should trim whitespace before validation')
    it('should return correct error messages')
  });

  describe('canAddMoreAccounts', () => {
    it('should return true when below limit')
    it('should return false when at limit')
    it('should handle empty accounts array')
  });

  describe('formatAccountDisplayName', () => {
    it('should format solo account with "(Solo)" suffix')
    it('should format couple account with partner name')
    it('should handle missing partner name')
    it('should return empty string for null account')
  });

  describe('sortAccountsWithActive', () => {
    it('should put active account first')
    it('should sort remaining by creation date (newest first)')
    it('should handle no active account')
    it('should handle empty array')
  });
});
```

**Estimated Tests**: 15-20 tests
**Lines of Code**: ~200-300 lines
**Time to Implement**: 1 day

---

### 1.3 Updated AuthContext Tests (`AuthContext.test.js`)

**Priority**: 🔴 **HIGH**

**Update existing test suite to cover new multi-account structure**

#### Additional Test Cases

```javascript
describe('AuthContext - Multi-Account Support', () => {
  describe('User Signup with New Structure', () => {
    it('should create user with accounts array (empty)')
    it('should create user with activeAccountId as null')
    it('should not create partnerId or coupleId fields')
  });

  describe('setActiveAccount', () => {
    it('should update activeAccountId in Firestore and state')
    it('should verify account exists before setting')
    it('should throw error for non-existent account')
  });

  describe('hasActiveAccount', () => {
    it('should return true if activeAccountId is set')
    it('should return false if activeAccountId is null')
  });

  describe('hasPartner (Updated)', () => {
    it('should return true if user has at least one account')
    it('should return false if accounts array is empty')
    it('should return false if accounts is undefined')
  });

  describe('Backward Compatibility', () => {
    it('should handle old user format during auth state change')
    it('should not break with legacy partnerId/coupleId fields')
  });
});
```

**Estimated New Tests**: 10-12 tests
**Lines of Code**: ~150-200 lines (additions)
**Time to Implement**: 1 day

---

### 1.4 Updated BudgetContext Tests (`BudgetContext.test.js`)

**Priority**: 🟡 **MEDIUM**

**New test file needed**

```javascript
describe('BudgetContext - Multi-Account Support', () => {
  describe('Data Loading', () => {
    it('should load categories based on activeAccountId')
    it('should clear categories when activeAccountId is null')
    it('should reload data when activeAccountId changes')
  });

  describe('Budget Operations', () => {
    it('should use activeAccountId for budget queries')
    it('should clear budget when switching accounts')
  });

  describe('Real-time Subscriptions', () => {
    it('should subscribe to active account data only')
    it('should unsubscribe when account changes')
    it('should handle rapid account switching')
  });
});
```

**Estimated Tests**: 8-10 tests
**Lines of Code**: ~200-300 lines
**Time to Implement**: 1 day

---

## Phase 2: Context Layer Testing

### 2.1 AccountContext Tests (`AccountContext.test.js`)

**Priority**: 🔴 **HIGH** (New feature-critical context)

**Test Coverage: 90%+**

```javascript
describe('AccountContext', () => {
  describe('Initialization', () => {
    it('should initialize with empty accounts if user has none')
    it('should load user accounts from userDetails')
    it('should set activeAccount based on activeAccountId')
    it('should handle loading state correctly')
  });

  describe('switchAccount', () => {
    it('should call AuthContext.setActiveAccount')
    it('should update local state after switch')
    it('should clear budget cache when switching')
    it('should handle switch errors gracefully')
    it('should prevent switching to non-existent account')
  });

  describe('createSoloAccount', () => {
    it('should call accountService.createSoloAccount')
    it('should refresh accounts list after creation')
    it('should set new account as active')
    it('should handle creation errors')
    it('should validate account name before creating')
  });

  describe('createCoupleAccount', () => {
    it('should call accountService.createCoupleAccount')
    it('should pass correct parameters')
    it('should refresh accounts list')
    it('should handle partner not found error')
  });

  describe('removeAccount', () => {
    it('should call accountService.removeAccountFromUser')
    it('should prevent removing last account')
    it('should show confirmation before removal')
    it('should refresh accounts list after removal')
  });

  describe('updateAccountName', () => {
    it('should update account name in Firestore')
    it('should validate new name')
    it('should refresh accounts list')
    it('should handle update errors')
  });

  describe('Account List Management', () => {
    it('should sort accounts with active first')
    it('should filter accounts by type')
    it('should count solo vs couple accounts')
  });
});
```

**Estimated Tests**: 25-30 tests
**Lines of Code**: ~500-600 lines
**Time to Implement**: 2 days

---

## Phase 3: Component & Screen Testing

### 3.1 AccountSwitcher Component (`AccountSwitcher.test.js`)

**Priority**: 🟡 **MEDIUM**

```javascript
describe('AccountSwitcher Component', () => {
  describe('Rendering', () => {
    it('should render dropdown trigger button')
    it('should show current account name')
    it('should display account count badge')
    it('should render accounts list when opened')
  });

  describe('Account Display', () => {
    it('should show checkmark on active account')
    it('should display solo vs couple icons')
    it('should show partner names for couple accounts')
    it('should format account names correctly')
  });

  describe('Interactions', () => {
    it('should switch account when clicked')
    it('should close dropdown after selection')
    it('should navigate to Add Account screen')
    it('should navigate to Manage Accounts screen')
  });

  describe('Edge Cases', () => {
    it('should handle empty accounts list')
    it('should show "Create Account" message if no accounts')
    it('should disable switching during operation')
  });
});
```

**Estimated Tests**: 12-15 tests
**Time to Implement**: 1 day

---

### 3.2 CreateSoloAccountScreen Tests

**Priority**: 🟡 **MEDIUM**

```javascript
describe('CreateSoloAccountScreen', () => {
  describe('Form Rendering', () => {
    it('should render account name input')
    it('should show suggested account names')
    it('should render create button')
  });

  describe('User Input', () => {
    it('should update state when typing account name')
    it('should validate name on change')
    it('should show validation errors')
  });

  describe('Account Creation', () => {
    it('should call createSoloAccount on submit')
    it('should navigate to success screen')
    it('should handle creation errors')
    it('should show loading state during creation')
    it('should disable submit button while loading')
  });

  describe('Suggested Names', () => {
    it('should populate input when suggested name clicked')
    it('should show custom input for "Custom..." option')
  });
});
```

**Estimated Tests**: 10-12 tests
**Time to Implement**: 1 day

---

### 3.3 AccountsScreen (Management) Tests

**Priority**: 🟡 **MEDIUM**

```javascript
describe('AccountsScreen', () => {
  describe('Account List', () => {
    it('should render all user accounts')
    it('should show active indicator on current account')
    it('should display account types correctly')
    it('should show creation dates')
  });

  describe('Account Actions', () => {
    it('should switch active account when tapped')
    it('should open rename modal')
    it('should show delete confirmation')
    it('should navigate to add account screen')
  });

  describe('Deletion', () => {
    it('should prevent deleting last account')
    it('should show confirmation dialog')
    it('should remove account after confirmation')
    it('should update list after deletion')
  });

  describe('Empty State', () => {
    it('should show empty state if no accounts')
    it('should show create account button')
  });
});
```

**Estimated Tests**: 12-15 tests
**Time to Implement**: 1 day

---

### 3.4 Updated JoinScreen Tests

**Priority**: 🔴 **HIGH**

```javascript
describe('JoinScreen - Multi-Account Support', () => {
  describe('Couple Creation', () => {
    it('should add couple to accounts array instead of setting partnerId')
    it('should prompt for account name')
    it('should set new account as active')
    it('should handle user with existing accounts')
  });

  describe('Account Naming', () => {
    it('should suggest default name with partner name')
    it('should allow custom account name')
    it('should validate account name')
  });
});
```

**Estimated Tests**: 5-7 tests
**Time to Implement**: 0.5 days

---

## Phase 4: Integration Testing

### 4.1 Account Creation & Switching Flow

**Priority**: 🔴 **HIGH**

```javascript
describe('Integration: Account Creation & Switching', () => {
  it('should create solo account and set as active', async () => {
    // 1. User signs up
    // 2. Creates solo account
    // 3. Account appears in list
    // 4. Account is set as active
    // 5. Budget data loads for account
  });

  it('should create couple account via invite', async () => {
    // 1. User A creates invite
    // 2. User B joins with code
    // 3. Both users get account in their arrays
    // 4. Account set as active for both
  });

  it('should switch between multiple accounts', async () => {
    // 1. User has 3 accounts (2 solo, 1 couple)
    // 2. Switch to account 1
    // 3. Verify budget data loads
    // 4. Switch to account 2
    // 5. Verify data clears and reloads
    // 6. Switch to account 3
    // 7. Verify correct data shown
  });

  it('should maintain data isolation between accounts', async () => {
    // 1. Create expense in account 1
    // 2. Switch to account 2
    // 3. Verify expense not visible
    // 4. Switch back to account 1
    // 5. Verify expense still there
  });
});
```

**Estimated Tests**: 8-10 tests
**Time to Implement**: 2 days

---

### 4.2 Multi-User Collaboration

**Priority**: 🟡 **MEDIUM**

```javascript
describe('Integration: Multi-User Collaboration', () => {
  it('should sync data when partner adds expense', async () => {
    // 1. User A and B share account
    // 2. User A adds expense
    // 3. User B sees expense in real-time
  });

  it('should handle partner switching to different account', async () => {
    // 1. Both users on same account
    // 2. User A switches account
    // 3. User B still sees correct data
  });

  it('should handle partner removing shared account', async () => {
    // Verify graceful handling of account removal
  });
});
```

**Estimated Tests**: 6-8 tests
**Time to Implement**: 1.5 days

---

### 4.3 Data Migration & Backward Compatibility

**Priority**: 🟢 **LOW** (New app - no migration needed)

**Status**: ✅ **Not Required** - Building from scratch with new data model

---

## Phase 5: E2E Testing

### 5.1 Critical User Journeys

**Priority**: 🔴 **HIGH**

**Tool**: Detox or Maestro (recommended for React Native)

```javascript
describe('E2E: Multi-Account User Journeys', () => {
  it('Complete Solo User Journey', async () => {
    // 1. Sign up
    // 2. Create solo account
    // 3. Set up budget
    // 4. Add expenses
    // 5. View reports
    // 6. Create second solo account
    // 7. Switch between accounts
  });

  it('Complete Couple User Journey', async () => {
    // User A:
    // 1. Sign up
    // 2. Create invite
    // 3. Share code with User B

    // User B:
    // 4. Sign up
    // 5. Enter invite code
    // 6. Join couple account

    // Both:
    // 7. Add expenses
    // 8. View shared budget
    // 9. Create settlement
  });

  it('Mixed Accounts Journey', async () => {
    // 1. User has solo account
    // 2. Creates couple account with partner
    // 3. Switches between accounts
    // 4. Adds expenses to each
    // 5. Verifies data isolation
  });

  it('Account Management Journey', async () => {
    // 1. User with 3 accounts
    // 2. Renames account
    // 3. Deletes account
    // 4. Creates new account
    // 5. Switches active account
  });

  it('Error Recovery Journey', async () => {
    // 1. Try creating account offline
    // 2. Handle error gracefully
    // 3. Retry when back online
    // 4. Verify account created
  });
});
```

**Estimated Tests**: 5-8 E2E tests
**Time to Implement**: 3-4 days (includes E2E setup)

---

## Phase 6: Firestore Rules Testing

### 6.1 Security Rules Test Suite

**Priority**: 🔴 **HIGH** (Security critical)

**Tool**: @firebase/rules-unit-testing

**Setup Required:**
```bash
npm install --save-dev @firebase/rules-unit-testing
```

#### Test Structure

```javascript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

describe('Firestore Security Rules - Multi-Account', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('User Document Access', () => {
    it('should allow user to create their own document with accounts array', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          accounts: [],
          activeAccountId: null,
        })
      );
    });

    it('should allow updating own accounts array', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice.firestore().collection('users').doc('alice').update({
          accounts: [{ accountId: 'acc1', accountName: 'Test' }],
        })
      );
    });

    it('should allow updating activeAccountId', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice.firestore().collection('users').doc('alice').update({
          activeAccountId: 'acc1',
        })
      );
    });

    it('should deny updating another user\'s accounts', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertFails(
        alice.firestore().collection('users').doc('bob').update({
          accounts: [],
        })
      );
    });
  });

  describe('Couple/Account Document Access', () => {
    it('should allow creating solo account (user2Id = null)', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice.firestore().collection('couples').doc('solo_acc1').set({
          type: 'solo',
          user1Id: 'alice',
          user2Id: null,
          createdBy: 'alice',
        })
      );
    });

    it('should allow creating couple account', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice.firestore().collection('couples').doc('couple_acc1').set({
          type: 'couple',
          user1Id: 'alice',
          user2Id: 'bob',
          createdBy: 'alice',
        })
      );
    });

    it('should allow both users to read couple document', async () => {
      // Set up couple
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('couples').doc('couple_acc1').set({
          type: 'couple',
          user1Id: 'alice',
          user2Id: 'bob',
        });
      });

      const alice = testEnv.authenticatedContext('alice');
      const bob = testEnv.authenticatedContext('bob');

      await assertSucceeds(alice.firestore().collection('couples').doc('couple_acc1').get());
      await assertSucceeds(bob.firestore().collection('couples').doc('couple_acc1').get());
    });

    it('should deny reading solo account by non-member', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('couples').doc('solo_acc1').set({
          type: 'solo',
          user1Id: 'alice',
          user2Id: null,
        });
      });

      const bob = testEnv.authenticatedContext('bob');
      await assertFails(bob.firestore().collection('couples').doc('solo_acc1').get());
    });
  });

  describe('Expense Access with Active Account', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        // Set up test data
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          activeAccountId: 'acc1',
        });
        await context.firestore().collection('couples').doc('acc1').set({
          type: 'solo',
          user1Id: 'alice',
          user2Id: null,
        });
      });
    });

    it('should allow listing expenses if user has active account', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice.firestore().collection('expenses').where('coupleId', '==', 'acc1').get()
      );
    });

    it('should deny listing expenses if user has no active account', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('bob').set({
          uid: 'bob',
          activeAccountId: null,
        });
      });

      const bob = testEnv.authenticatedContext('bob');
      await assertFails(bob.firestore().collection('expenses').get());
    });

    it('should allow reading specific expense if user is member', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('expenses').doc('exp1').set({
          coupleId: 'acc1',
          amount: 100,
        });
      });

      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(alice.firestore().collection('expenses').doc('exp1').get());
    });
  });

  describe('Budget/Category Creation with Active Account', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          activeAccountId: 'acc1',
        });
        await context.firestore().collection('couples').doc('acc1').set({
          type: 'solo',
          user1Id: 'alice',
          user2Id: null,
        });
      });
    });

    it('should allow creating budget for active account', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice.firestore().collection('budgets').doc('budget1').set({
          coupleId: 'acc1',
          month: 1,
          year: 2024,
        })
      );
    });

    it('should deny creating budget for non-active account', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('couples').doc('acc2').set({
          type: 'solo',
          user1Id: 'alice',
          user2Id: null,
        });
      });

      const alice = testEnv.authenticatedContext('alice');
      await assertFails(
        alice.firestore().collection('budgets').doc('budget2').set({
          coupleId: 'acc2', // Not active account
          month: 1,
          year: 2024,
        })
      );
    });
  });

  describe('Settlement Creation with Active Account', () => {
    it('should allow creating settlement for active account only', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          activeAccountId: 'acc1',
        });
        await context.firestore().collection('couples').doc('acc1').set({
          type: 'couple',
          user1Id: 'alice',
          user2Id: 'bob',
        });
      });

      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice.firestore().collection('settlements').doc('settle1').set({
          coupleId: 'acc1',
          user1Id: 'alice',
          user2Id: 'bob',
          amount: 100,
        })
      );
    });

    it('should deny creating settlement if amount <= 0', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('alice').set({
          uid: 'alice',
          activeAccountId: 'acc1',
        });
      });

      const alice = testEnv.authenticatedContext('alice');
      await assertFails(
        alice.firestore().collection('settlements').doc('settle1').set({
          coupleId: 'acc1',
          user1Id: 'alice',
          user2Id: 'bob',
          amount: 0,
        })
      );
    });
  });
});
```

**Estimated Tests**: 30-40 rules tests
**Lines of Code**: ~800-1000 lines
**Time to Implement**: 3-4 days

---

## Test Coverage Goals

### Overall Coverage Targets

| Category | Target | Priority |
|----------|--------|----------|
| **Unit Tests** | 85%+ | 🔴 HIGH |
| **Integration Tests** | 75%+ | 🟡 MEDIUM |
| **E2E Tests** | Critical paths only | 🟡 MEDIUM |
| **Firestore Rules** | 100% | 🔴 HIGH |

### Per-File Coverage Targets

| File | Target | Priority |
|------|--------|----------|
| `accountService.js` | 90%+ | 🔴 HIGH |
| `accountDefaults.js` | 95%+ | 🟡 MEDIUM |
| `AuthContext.js` (new code) | 85%+ | 🔴 HIGH |
| `BudgetContext.js` (changes) | 85%+ | 🟡 MEDIUM |
| `AccountContext.js` | 90%+ | 🔴 HIGH |
| `AccountSwitcher.js` | 80%+ | 🟡 MEDIUM |
| `CreateSoloAccountScreen.js` | 80%+ | 🟡 MEDIUM |
| `AccountsScreen.js` | 80%+ | 🟡 MEDIUM |
| Firestore Rules | 100% | 🔴 HIGH |

---

## Testing Tools & Setup

### Required Dependencies

```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/jest-native": "^5.4.0",
    "@firebase/rules-unit-testing": "^3.0.0",
    "jest": "^29.0.0",
    "jest-expo": "^51.0.0",
    "detox": "^20.0.0"
  }
}
```

### Additional Setup Needed

1. **Firestore Emulator**
   ```bash
   npm install -g firebase-tools
   firebase init emulators
   ```

2. **E2E Testing (Optional but Recommended)**
   ```bash
   npm install --save-dev detox detox-cli
   detox init
   ```

3. **Test Configuration Files**
   - ✅ `jest.setup.js` - Already exists
   - ❌ `firestore.test.config.js` - Need to create
   - ❌ `.detoxrc.js` - Need to create (if doing E2E)

---

## Implementation Timeline

### Week 1: Unit Tests (Core)
- **Days 1-2**: `accountService.test.js` (35-40 tests)
- **Day 3**: `accountDefaults.test.js` (15-20 tests)
- **Days 4-5**: Update `AuthContext.test.js` (10-12 new tests)

**Deliverable**: 60-70 unit tests, ~80% service layer coverage

---

### Week 2: Context & Component Tests
- **Days 1-2**: `AccountContext.test.js` (25-30 tests)
- **Day 3**: `BudgetContext.test.js` updates (8-10 tests)
- **Days 4-5**: Component tests (AccountSwitcher, Screens) (30-35 tests)

**Deliverable**: 60-75 tests, component/context coverage

---

### Week 3: Integration & Firestore Rules
- **Days 1-2**: Integration tests (15-20 tests)
- **Days 3-4**: Firestore rules tests (30-40 tests)
- **Day 5**: Setup Firestore emulator, test refinement

**Deliverable**: 45-60 tests, security validation

---

### Week 4: E2E & Polish (Optional)
- **Days 1-2**: E2E setup (Detox/Maestro)
- **Days 3-4**: E2E test implementation (5-8 tests)
- **Day 5**: CI/CD integration, documentation

**Deliverable**: Complete test suite, CI ready

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Multi-Account Feature Tests

on:
  push:
    branches: [main, develop, claude/*]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  firestore-rules-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:rules

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx detox build -c ios.sim.release
      - run: npx detox test -c ios.sim.release
```

### Test Scripts to Add

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__/(services|utils|constants)",
    "test:integration": "jest --testPathPattern=__tests__/integration",
    "test:rules": "jest --testPathPattern=__tests__/firestore-rules",
    "test:e2e": "detox test",
    "test:e2e:build": "detox build",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:rules"
  }
}
```

---

## Test Execution Priority

### Phase 1 (Must Have - Before Shipping)
1. ✅ Unit tests for `accountService.js` - **CRITICAL**
2. ✅ Unit tests for `accountDefaults.js`
3. ✅ Updated `AuthContext.test.js` - **CRITICAL**
4. ✅ `AccountContext.test.js` - **CRITICAL**
5. ✅ Firestore rules tests - **CRITICAL (SECURITY)**
6. ✅ Integration tests for account creation & switching

### Phase 2 (Should Have - Post-Launch)
7. ⏳ `BudgetContext.test.js` updates
8. ⏳ Component tests (AccountSwitcher, CreateSoloAccountScreen)
9. ⏳ Screen tests (AccountsScreen, updated JoinScreen)
10. ⏳ Multi-user collaboration integration tests

### Phase 3 (Nice to Have - Future Iteration)
11. ⏳ E2E tests for critical user journeys
12. ⏳ Performance tests
13. ⏳ Accessibility tests
14. ⏳ Visual regression tests

---

## Success Metrics

### Code Coverage
- **Target**: 85% overall coverage
- **Minimum**: 80% coverage to merge PR
- **Critical files**: 90%+ coverage

### Test Performance
- **Unit tests**: < 30 seconds total
- **Integration tests**: < 2 minutes total
- **Firestore rules tests**: < 1 minute total
- **E2E tests**: < 5 minutes total

### Quality Metrics
- Zero critical bugs in production
- < 5% flaky test rate
- All security rules validated
- 100% of critical paths covered by tests

---

## Risk Assessment

| Risk | Impact | Mitigation | Priority |
|------|--------|------------|----------|
| Firestore rules vulnerability | 🔴 HIGH | Comprehensive rules testing | 🔴 HIGH |
| Data leakage between accounts | 🔴 HIGH | Integration tests for data isolation | 🔴 HIGH |
| Account switching bugs | 🟡 MEDIUM | Unit + integration tests | 🟡 MEDIUM |
| Poor test coverage | 🟡 MEDIUM | Enforce 80% minimum in CI | 🟡 MEDIUM |
| Flaky tests | 🟢 LOW | Proper mocking, async handling | 🟡 MEDIUM |
| Slow test execution | 🟢 LOW | Optimize test setup, parallel execution | 🟢 LOW |

---

## Next Steps

### Immediate Actions (This Week)

1. **Set up Firestore Rules Testing**
   ```bash
   npm install --save-dev @firebase/rules-unit-testing
   ```

2. **Create Test Files Structure**
   ```
   src/__tests__/
   ├── services/
   │   ├── accountService.test.js (NEW)
   ├── constants/
   │   └── accountDefaults.test.js (NEW)
   ├── contexts/
   │   ├── AccountContext.test.js (NEW)
   │   └── BudgetContext.test.js (NEW)
   ├── firestore-rules/
   │   └── multiAccount.rules.test.js (NEW)
   └── integration/
       └── accountFlows.test.js (NEW)
   ```

3. **Start with Highest Priority Tests**
   - Begin with `accountService.test.js`
   - Then `AuthContext.test.js` updates
   - Then Firestore rules tests

4. **Set up CI Pipeline**
   - Add GitHub Actions workflow
   - Configure coverage reporting
   - Set minimum coverage thresholds

---

## Summary

This comprehensive testing plan ensures:

✅ **Security**: Firestore rules thoroughly tested (100% coverage)
✅ **Reliability**: High unit test coverage (85%+) for core services
✅ **Quality**: Integration tests validate real-world flows
✅ **User Experience**: E2E tests cover critical user journeys
✅ **Maintainability**: Clear test structure and documentation
✅ **Continuous Quality**: CI/CD integration catches issues early

**Total Estimated Tests**: 150-200 tests
**Total Implementation Time**: 3-4 weeks
**Coverage Target**: 85%+ overall

**Ready to implement?** Start with Phase 1 (Data Layer Tests) immediately after Phase 1 code implementation.
