# Dividela - Comprehensive Codebase Architecture Overview

**Project:** Dividela - Privacy-focused expense tracking app for couples
**Date Analyzed:** November 19, 2025
**Tech Stack:** React Native + Expo, Firebase, React Navigation

---

## 1. PROJECT STRUCTURE & TECH STACK

### Technology Stack
- **Frontend Framework:** React Native 0.82.1 + Expo 54.0.21
- **Platforms:** iOS, Android, Web (via Expo + Metro bundler)
- **Backend:** Firebase (Authentication + Firestore)
- **Navigation:** React Navigation 7.x (Stack, Tab, Bottom Tab navigators)
- **UI Components:** React Native Paper 5.14.5, Ionicons
- **Local Storage:** AsyncStorage 1.24.0 (async-storage)
- **Testing:** Jest 29.7.0 + React Test Renderer
- **Build/Deploy:** Firebase Hosting

### Directory Structure
```
dividela2/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Common utilities (ScrollableContainer, etc.)
│   │   ├── onboarding/     # Budget onboarding components
│   │   └── *.js            # Modal, Filter, Card components
│   ├── config/
│   │   └── firebase.js     # Firebase initialization
│   ├── constants/
│   │   ├── theme.js        # Design system (colors, fonts, spacing)
│   │   ├── budgetDefaults.js  # Budget templates & industry benchmarks
│   │   ├── categories.js   # Category definitions
│   │   └── defaultCategories.js
│   ├── contexts/           # React Context for global state
│   │   ├── AuthContext.js  # User authentication state
│   │   ├── BudgetContext.js   # Budget & category state
│   │   └── OnboardingContext.js
│   ├── navigation/
│   │   ├── AppNavigator.js    # Main app routing logic
│   │   ├── TabNavigator.js    # Bottom tab navigation
│   │   └── OnboardingNavigator.js
│   ├── screens/
│   │   ├── auth/           # Authentication flows
│   │   ├── onboarding/     # Budget onboarding
│   │   │   ├── advanced/   # Advanced mode screens
│   │   │   └── simple/     # Simple mode screens
│   │   └── main/           # Main app screens
│   │       ├── HomeScreen.js
│   │       ├── StatsScreen.js
│   │       ├── BudgetDashboardScreen.js
│   │       ├── SettingsScreen.js
│   │       └── [other screens]
│   ├── services/           # Business logic & API calls
│   │   ├── expenseService.js
│   │   ├── budgetService.js
│   │   ├── categoryService.js
│   │   ├── onboardingService.js
│   │   ├── settlementService.js
│   │   └── [other services]
│   ├── utils/
│   │   ├── storage.js      # AsyncStorage wrapper with error handling
│   │   ├── calculations.js # Math utilities (budgets, expenses)
│   │   ├── validators.js   # Form validation
│   │   ├── inviteCode.js   # Invite code generation
│   │   └── [other utils]
│   └── __tests__/          # Jest test files
├── App.js                  # Entry point
├── app.json                # Expo configuration
├── package.json
└── jest.setup.js

```

### Key Configuration Files
- **app.json:** Expo app config (iOS bundle ID: com.dividela.app, Android package: com.dividela.app)
- **firebase.js:** Reads from `.env` - Firebase API keys are environment-dependent
- **.env.example:** Template for Firebase credentials

---

## 2. EXISTING PAYMENT/SUBSCRIPTION/PREMIUM LOGIC

### Current Status
**NO payment, subscription, or premium features are currently implemented.**

#### What EXISTS (for reference):
- Budget complexity modes: `NONE`, `SIMPLE`, `ADVANCED` (feature-like infrastructure)
- Onboarding customization (smart vs fixed budgets)
- Annual budget tracking features
- Settlement calculation system

#### What DOES NOT EXIST:
- No payment provider integration (Stripe, RevenueCat, IAP)
- No subscription tiers/plans
- No premium/free feature gating
- No feature flag system
- No user plan tracking in Firestore
- No payment method management
- No billing history/invoicing

#### Implication for Payment Gating Task
This is a **greenfield opportunity** - you'll be implementing payment gating from scratch. The app currently uses complexity modes and onboarding customization, but these are not monetized.

---

## 3. PLATFORM SETUP & MULTIPLATFORM SUPPORT

### React Native + Expo Architecture
```
AppNavigator (main routing)
└── Stack Navigator (auth/main logic)
    ├── Auth Stack (WelcomeScreen, SignUpScreen, SignInScreen)
    ├── Connect Stack (ConnectScreen, InviteScreen, JoinScreen)
    └── Main App Stack
        ├── TabNavigator (5 tabs)
        │   ├── HomeTab → HomeScreen
        │   ├── SettlementsTab → SettlementStackNavigator
        │   ├── BudgetTab → BudgetStackNavigator
        │   ├── StatsTab → StatsScreen
        │   └── SettingsTab → SettingsScreen
        ├── Onboarding Modal (transparentModal overlay)
        └── AddExpense Modal
```

### Platform-Specific Handling
- **iOS:** Bundle ID `com.dividela.app`, tablet support enabled
- **Android:** Package `com.dividela.app`, portrait orientation
- **Web:** Metro bundler, custom theme color (#6366f1), localStorage fallback
- **Responsive Design:** Media queries (isSmallScreen, isMediumScreen, isLargeScreen)

### Native Module Usage
- **Expo Modules:**
  - `expo-clipboard` - Copy functionality
  - `expo-linear-gradient` - Gradient backgrounds
  - `expo-status-bar` - Status bar control
  - `expo-vector-icons` - Ionicons
  - `rn-emoji-keyboard` - Emoji picker for categories

---

## 4. USER AUTHENTICATION & PROFILE MANAGEMENT

### Authentication Flow
**Files:** `src/contexts/AuthContext.js`, `src/screens/auth/*.js`

#### Authentication Methods Implemented
1. **Email/Password**
   - Sign up: `createUserWithEmailAndPassword()`
   - Sign in: `signInWithEmailAndPassword()`
   - Sign out: `firebaseSignOut()`

2. **OAuth (Google & Apple)**
   - Google Sign-in: `GoogleAuthProvider` + `signInWithPopup()`
   - Apple Sign-in: `OAuthProvider('apple.com')` + `signInWithPopup()`
   - Note: OAuth buttons exist in UI but need Firebase setup

#### User Data Structure (Firestore)
```javascript
// Collection: users/{uid}
{
  uid: "firebase_uid",
  email: "user@example.com",
  displayName: "User Name",
  partnerId: "partner_uid",      // Set after pairing
  coupleId: "couple_id",         // Set after pairing
  createdAt: "ISO_TIMESTAMP",
  settings: {
    notifications: true,
    defaultSplit: 50,      // Default split percentage
    currency: "USD"
  }
}
```

#### Profile Management Features
- **Display Name:** Editable in SettingsScreen
- **Partner Info:** Fetched via `getPartnerDetails()`
- **Couple Info:** Updated via `updatePartnerInfo(partnerId, coupleId)`
- **Settings Management:** Basic settings object in user document

#### Pairing System
- **Invite Code Generation:** 6-digit alphanumeric codes, 7-day expiry
- **Invite Storage:** Firestore `inviteCodes` collection
- **Couple Creation:** `couples` collection when partner joins
- **Real-time Sync:** Firebase listeners on user documents

### Context API Usage
```javascript
const { 
  user,                    // Firebase Auth user object
  userDetails,             // Firestore user document
  loading,                 // Auth loading state
  error,                   // Auth error message
  signUp,                  // Register new user
  signIn,                  // Login
  signOut,                 // Logout
  signInWithGoogle,        // OAuth
  signInWithApple,         // OAuth
  updateUserDetails,       // Update Firestore user doc
  updatePartnerInfo,       // Set partnerId/coupleId
  getPartnerDetails,       // Fetch partner's user doc
  hasPartner               // Boolean check
} = useAuth();
```

---

## 5. FEATURE FLAGS & CONDITIONAL FEATURE ACCESS PATTERNS

### Current Implementation

#### NO Dedicated Feature Flag System
The codebase does NOT have a centralized feature flag management system.

#### Budget Complexity Modes (Feature-like Pattern)
Located in `src/constants/budgetDefaults.js`:
```javascript
export const COMPLEXITY_MODES = {
  NONE: 'none',       // No budgets
  SIMPLE: 'simple',   // Monthly fixed budgets
  ADVANCED: 'advanced' // Monthly + annual budgets
};
```

**Usage:**
- Stored in Firestore `budgets` collection: `{ complexity: "simple" }`
- Used in onboarding to show/hide budget screens
- Controls UI rendering in `BudgetDashboardScreen`, `StatsScreen`

#### Onboarding State Management
- **AsyncStorage Key:** `onboarding_completed_{coupleId}`
- **Location:** `src/utils/storage.js` → `onboardingStorage` object
- **Used for:** Showing/hiding onboarding modal overlay in `AppNavigator`

```javascript
// Helper functions in storage.js
onboardingStorage.setCompleted(coupleId)    // Mark onboarding done
onboardingStorage.getCompleted(coupleId)    // Check if done
onboardingStorage.clearCompleted(coupleId)  // Reset
```

#### Conditional Rendering Patterns
**Example from AppNavigator.js:**
```javascript
{!user ? (
  // Auth Stack - user not logged in
  <>...</>
) : !userDetails?.partnerId ? (
  // Connect Stack - user logged in, no partner
  <>...</>
) : (
  // Main App Stack - user has partner
  <>
    <Tab.Navigator />     {/* Always visible */}
    <Onboarding />        {/* Modal shown if not completed */}
  </>
)}
```

### What's Missing for Payment Gating
1. **User Plan/Subscription Field** - No `plan`, `subscription`, `tier`, or `membership` field in Firestore users collection
2. **Feature Flag Store** - No centralized config for which features are enabled per plan
3. **Permission Checks** - No functions like `canAccess(featureName)` or `isPremium()`
4. **Backend Validation** - Firestore rules don't check plan status
5. **Plan Change Listeners** - No subscription change handlers

---

## 6. DETAILED FEATURE INVENTORY

### Main App Features (Fully Implemented)

#### Expense Management
- **AddExpenseScreen:** Amount, description, category, payer selection, split options
- **HomeScreen:** List view of expenses, real-time sync with Firestore
- **Service:** `expenseService.js` (add, update, delete, query expenses)
- **Real-time Updates:** `subscribeToExpenses()` with `onSnapshot`

#### Budget System
- **BudgetDashboardScreen:** Visual budget vs actual spending
- **BudgetSetupScreen:** Manual budget configuration
- **CategoryManagerScreen:** Add/edit expense categories
- **Services:** `budgetService.js`, `categoryService.js`
- **Complexity Modes:** Simple (fixed monthly) vs Advanced (monthly + annual)
- **Smart Budgets:** Auto-calculated from spending history in `onboardingService.js`

#### Settlement System
- **SettlementHistoryScreen:** List of settlements between partners
- **SettlementDetailScreen:** Individual settlement details
- **Service:** `settlementService.js` - calculates who owes whom
- **Automatic Calculation:** Settles expenses based on splits and payments

#### Statistics & Analytics
- **StatsScreen:** Category breakdown, monthly summaries, trends
- **Fiscal Period Tracking:** Annual budget with start/end dates
- **Progress Calculation:** Budget vs actual spending visualization

#### Onboarding System
- **Two Complexity Paths:**
  - **Simple Mode:** Quick setup with fixed monthly budgets
  - **Advanced Mode:** Detailed setup with annual budgets, savings targets
- **Smart Suggestions:** Analyzes expense history, recommends budgets
- **Templates:** Income-based budget templates (Starter, Moderate, Comfortable, etc.)
- **Allocation Validation:** Industry benchmarks check for reasonable category splits

### Data Models

#### Expense Document
```javascript
{
  id: "expense_id",
  coupleId: "couple_id",
  amount: 50.00,
  description: "Dinner at restaurant",
  category: "food",           // or categoryKey
  paidBy: "user1_id",
  split: {
    user1_id: 25.00,
    user2_id: 25.00
  },
  date: "2025-11-19",
  createdAt: Timestamp,
  createdBy: "user1_id"
}
```

#### Budget Document
```javascript
{
  id: "couple_id_2025_11",    // coupleId_year_month
  coupleId: "couple_id",
  month: 11,
  year: 2025,
  complexity: "simple",         // or "advanced", "none"
  enabled: true,
  categoryBudgets: {
    food: 500,
    groceries: 400,
    transport: 200,
    // ...
  },
  autoCalculated: false,
  canAutoAdjust: false,
  createdAt: Timestamp
}
```

#### Couple Document
```javascript
{
  id: "couple_id",
  user1Id: "user1_uid",
  user2Id: "user2_uid",
  inviteCode: "ABC123",
  createdAt: Timestamp,
  currentBalance: -150.00,  // Who owes whom
  totalExpenses: 5000.00,
  lastActivity: Timestamp
}
```

---

## 7. FIREBASE & DATA PERSISTENCE

### Firebase Services
- **Authentication:** Email/Password + OAuth (Google, Apple)
- **Firestore Database:** Document-based, real-time sync
- **Storage:** Not currently used
- **Hosting:** Web deployment ready

### Firestore Collections
1. **users/** - User profiles and authentication metadata
2. **couples/** - Relationship documents linking two users
3. **inviteCodes/** - Temporary codes for partner pairing
4. **expenses/** - Transaction records
5. **budgets/** - Monthly/annual budget allocations
6. **categories/** - Custom expense categories
7. **settlements/** - Payment settlements between partners
8. **savingsTargets/** - Annual savings goals

### Security Rules (Published)
**Location:** `FIRESTORE-RULES-FINAL.md`

**Key Rules:**
- Users can only read/write their own documents
- Couple members can access shared collections (expenses, budgets)
- Anonymous read on inviteCodes (for validation)
- Query filtering by coupleId validated in rules
- Settlements are immutable (no updates/deletes)

### Real-time Subscriptions
- Expenses: `subscribeToExpenses(coupleId, callback)`
- Categories: `subscribeToCategoriesForCouple(coupleId, callback)`
- Budgets: `subscribeToCurrentMonthBudget(coupleId, callback)`
- Settlements: `subscribeToSettlements(coupleId, callback)`

### AsyncStorage (Local)
- **Onboarding Status:** `onboarding_completed_{coupleId}`
- **Onboarding State:** Backup for recovery
- **Error Handling:** Custom `StorageError` class with categorized error types

---

## 8. NAVIGATION FLOW

### Complete Navigation Structure

```
AppNavigator (root)
├── Auth State = null
│   ├── WelcomeScreen
│   ├── SignUpScreen
│   └── SignInScreen
│
├── Auth State = user, no partner
│   ├── ConnectScreen
│   ├── InviteScreen
│   ├── JoinScreen
│   ├── SuccessScreen
│   └── FiscalYearSetupScreen
│
└── Auth State = user + partner
    ├── MainTabs (TabNavigator)
    │   ├── HomeTab → HomeScreen
    │   ├── SettlementsTab → SettlementStackNavigator
    │   │   ├── SettlementHistoryScreen
    │   │   └── SettlementDetailScreen
    │   ├── BudgetTab → BudgetStackNavigator
    │   │   ├── BudgetDashboardScreen
    │   │   ├── BudgetSetupScreen
    │   │   ├── CategoryManagerScreen
    │   │   └── AnnualBudgetSetupScreen
    │   ├── StatsTab → StatsScreen
    │   └── SettingsTab → SettingsScreen
    │
    ├── Onboarding Modal (transparentModal)
    │   └── OnboardingNavigator
    │       ├── OnboardingIntroScreen
    │       ├── OnboardingSkipScreen
    │       ├── Simple or Advanced Mode flows
    │       └── Success screens
    │
    └── AddExpense Modal
        └── AddExpenseScreen
```

### Onboarding Modal Logic
- **Shown when:** User has partner but `onboarding_completed_{coupleId}` is not set
- **Dismissed when:** User completes onboarding (sets AsyncStorage flag)
- **Restartable:** Settings screen has "Reset Budget" option to restart flow
- **Polling:** AppNavigator checks every 2 seconds for onboarding completion

---

## 9. CODE ORGANIZATION & PATTERNS

### Service Layer Pattern
Services encapsulate Firestore operations:
```javascript
// Example: expenseService.js
export const getExpenses = async (coupleId) => { /* query */ }
export const addExpense = async (expenseData) => { /* write */ }
export const subscribeToExpenses = (coupleId, callback) => { /* listen */ }
```

### Context + Service Pattern
```
Context (manages state)
  ↓
Services (Firestore operations)
  ↓
Screens (consume via hooks)
```

Example:
```javascript
// In BudgetContext
const loadCategories = async () => {
  const loaded = await categoryService.getCategoriesForCouple(coupleId);
  setCategories(loaded);
};

// In screen
const { categories, currentBudget } = useBudget();
```

### Error Handling
- **AsyncStorage Errors:** Custom `StorageError` class with error types
- **Firestore Errors:** Logged with error codes (permission-denied, not-found)
- **Auth Errors:** Handled in AuthContext with user-friendly messages
- **Firebase Specific:** OAuth errors have specific guidance (domain authorization, etc.)

### Validation & Constants
- **Form Validation:** `utils/validators.js` - email, password, numeric inputs
- **Budget Validation:** Industry minimums/maximums in `budgetDefaults.js`
- **Calculation Utilities:** `utils/calculations.js` - balance, progress, percentage math
- **Design System:** `constants/theme.js` - centralized colors, fonts, spacing

---

## 10. KEY FILES FOR PAYMENT GATING IMPLEMENTATION

### Files You'll Need to Modify

#### 1. Firestore User Model
- **File:** `src/contexts/AuthContext.js`
- **Add Fields:** `subscription`, `plan`, `isPremium`, `planStartDate`, `planEndDate`, `features`

#### 2. Feature Gate Service
- **Create:** `src/services/featureService.js`
- **Functions:** `canAccessFeature(userId, featureName)`, `getUserPlan(userId)`, `getPlanFeatures(planName)`

#### 3. Feature Flag Context
- **Create:** `src/contexts/FeatureFlagContext.js`
- **Similar to:** `AuthContext` - provides `{ userPlan, hasAccess, features }` to app

#### 4. Payment Integration
- **Create:** `src/services/paymentService.js`
- **Choose Provider:** Stripe, RevenueCat, or native IAP
- **Handle:** Subscription state, purchase validation, plan changes

#### 5. Gating Components
- **Create:** `src/components/FeatureGate.js`
- **Usage:** Wraps features to show paywall when not accessible
- **Create:** `src/screens/PaywallScreen.js` - CTA for premium features

#### 6. Update Firestore Rules
- **File:** `FIRESTORE-RULES-FINAL.md`
- **Add:** Rules to prevent plan changes via client

### Files to Reference (Read-Only)
- `src/contexts/AuthContext.js` - Pattern for global state
- `src/services/budgetService.js` - Pattern for Firestore service
- `src/utils/storage.js` - Error handling patterns
- `FIRESTORE-RULES-FINAL.md` - Security rules structure

---

## 11. CURRENT BRANCH & GIT STATUS

**Current Branch:** `claude/payment-gating-multiplatform-01B6PASptR126iKHXd2qBWkx`
**Status:** Clean (no uncommitted changes)
**Recent Commits:**
- Merge: Enable reset budget button
- Fix: Pass budget data to completeOnboarding
- Add: Unit tests for math/CRUD
- Fix: React state timing in AdvancedSuccessScreen

---

## 12. TESTING INFRASTRUCTURE

### Jest Setup
- **Config Location:** `package.json` - jest-expo preset
- **Test Files:** `src/__tests__/` directory
- **Existing Tests:** Unit tests for calculations and CRUD operations
- **Coverage:** Currently tests math utilities and service layer

### Testing Patterns
- Tests use Jest with `@testing-library/react-native`
- AsyncStorage and Firestore need mocking for unit tests
- Integration tests would need Firebase Emulator

---

## 13. SUMMARY: WHAT'S READY FOR PAYMENT GATING

### Strengths
✅ Solid authentication system (Firebase Auth)
✅ Real-time data sync (Firestore + subscribers)
✅ Multi-platform support (React Native + Web)
✅ Organized service layer (easy to add payment service)
✅ Context API for global state (easy to add plan context)
✅ Conditional rendering patterns (easy to gate features)
✅ Error handling patterns (can reuse for payment errors)

### Gaps to Fill
❌ No payment provider integration
❌ No plan/subscription fields in Firestore
❌ No feature flag system
❌ No permission checking utilities
❌ No paywall/upsell screens
❌ No payment history tracking
❌ No plan management UI

### Recommended Implementation Order
1. Add plan fields to user document
2. Create payment service (integrate Stripe/RevenueCat)
3. Create feature flag context
4. Implement feature gate component
5. Add paywall screen
6. Gate advanced features (budgets, annual tracking, settlements)
7. Update Firestore rules for plan validation
8. Test across all platforms

---

**End of Overview**
