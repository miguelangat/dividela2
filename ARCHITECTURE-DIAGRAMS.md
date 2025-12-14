# Dividela - Architecture Diagrams

## 1. User Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     App Entry Point (App.js)                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              AuthProvider (AuthContext.js)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Firebase Auth: onAuthStateChanged()                  │   │
│  │ → Sets user state                                   │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                   │                                          │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │ Firestore: Fetch users/{uid} document                │ │
│  │ → Sets userDetails state                             │ │
│  │ → Contains: email, displayName, partnerId, coupleId  │ │
│  └──────────────────┬───────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   User State Ready   │
        │  (user, userDetails) │
        └──────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    (null)   (no partner) (has partner)
        │          │          │
   Auth Stack  Connect Stack  Main App
  (Welcome,    (Invite,        (Tabs +
   SignUp,     Join,           Onboarding)
   SignIn)     Success)
```

---

## 2. User Pairing Flow (Couple Creation)

```
┌──────────────────────┐           ┌──────────────────────┐
│    User A (Alice)    │           │    User B (Bob)      │
│   Clicks "Invite"    │           │   Clicks "Join"      │
└──────────┬───────────┘           └──────────┬───────────┘
           │                                  │
           ▼                                  │
┌──────────────────────────┐                 │
│ Generate 6-digit code    │                 │
│ Save to inviteCodes/{id} │                 │
│ Firestore collection     │                 │
└──────────┬───────────────┘                 │
           │                    ┌────────────┘
           │                    │
           │◄───── Share Code ──┘
           │
           │                    ┌────────────┐
           │                    │ User Bob   │
           │                    │ Enters code│
           │                    └───┬────────┘
           │                        │
           │                        ▼
           │                ┌────────────────────┐
           │                │ Validate code in   │
           │                │ inviteCodes        │
           │                └────┬───────────────┘
           │                     │
           │         ┌───────────┼───────────┐
           │         │           │           │
           │         ▼           ▼           ▼
           │      (valid)    (expired)   (invalid)
           │         │           │           │
           │         ├───────────┴───────────┘ Error
           │         │
           │         ▼
           │    ┌──────────────────────┐
           │    │ Create couples/{id}  │
           │    │ with user1Id, user2Id│
           │    └────┬─────────────────┘
           │         │
           │         ▼
           │    ┌──────────────────────┐
           │    │ Update both users:   │
           │    │ partnerId=partnersUid│
           │    │ coupleId=coupleId    │
           │    └────┬─────────────────┘
           │         │
           │         ▼
           │    ┌──────────────────────┐
           │    │ Mark code as used    │
           │    │ in inviteCodes       │
           │    └────┬─────────────────┘
           │         │
           └────┬────┘
                │
                ▼
    ┌──────────────────────────┐
    │ Both users auto-navigate │
    │ to MainTabs (Home screen)│
    └──────────────────────────┘
```

---

## 3. Expense & Budget Data Flow

```
┌────────────────────────────────────────────────────┐
│        Main App (MainTabs + Screens)               │
└────────────┬─────────────────────────────────────┬─┘
             │                                     │
             ▼                                     ▼
   ┌──────────────────┐              ┌──────────────────────┐
   │  HomeScreen      │              │  BudgetDashboard     │
   │  (expenses list) │              │  (budget vs actual)  │
   └────────┬─────────┘              └──────────┬───────────┘
            │                                   │
            │         ┌───────────────────────┬─┘
            │         │                       │
            ▼         ▼                       ▼
┌──────────────────────────────────────────────────────┐
│         BudgetContext (src/contexts/)                │
│  ┌────────────────────────────────────────────────┐ │
│  │ State:                                         │ │
│  │  - categories: {}                             │ │
│  │  - currentBudget: {}                          │ │
│  │  - budgetProgress: {}                         │ │
│  │  - loading, error                             │ │
│  └────────────────────────────────────────────────┘ │
└──────────┬───────────────────────────────────────┬──┘
           │                                       │
           │ useEffect → subscribe              │ useEffect → subscribe
           │                                       │
           ▼                                       ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│  categoryService         │        │  budgetService           │
│  .subscribe()            │        │  .subscribe()            │
└────────┬─────────────────┘        └────────┬─────────────────┘
         │                                    │
         │ onSnapshot(query(...))             │ onSnapshot(query(...))
         │                                    │
         ▼                                    ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│  Firestore: categories   │        │  Firestore: budgets      │
│  /{coupleId}/{month}     │        │  /{coupleId_year_month}  │
│                          │        │                          │
│  {                       │        │  {                       │
│    icon, color,          │        │    complexity: "simple", │
│    defaultBudget         │        │    categoryBudgets: {},  │
│  }                       │        │    enabled, ...          │
└──────────────────────────┘        └──────────────────────────┘
```

---

## 4. Feature Gating Architecture (Payment Gating)

```
┌─────────────────────────────────────────────────────────────┐
│  User Document (Firestore users/{uid})                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ {                                                      │ │
│  │   uid: "user123",                                      │ │
│  │   email: "user@example.com",                           │ │
│  │   displayName: "Alice",                                │ │
│  │   [ADD] plan: "premium",        ← NEW for payments    │ │
│  │   [ADD] subscription: {...},    ← NEW for payments    │ │
│  │   [ADD] isPremium: true,        ← NEW for payments    │ │
│  │   [ADD] features: ["budgets", "annual", "stats"]      │ │
│  │ }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  FeatureFlagContext (NEW - src/contexts/FeatureFlagContext) │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Manages:                                               │ │
│  │  - userPlan: from userDetails.plan                     │ │
│  │  - availableFeatures: from plan mapping                │ │
│  │                                                        │ │
│  │ Methods:                                               │ │
│  │  - canAccessFeature(featureName)                       │ │
│  │  - getPlanFeatures()                                   │ │
│  │  - getPlanName()                                       │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────────────────────────┘
               │
        ┌──────┴──────┬────────────────┐
        │             │                │
        ▼             ▼                ▼
  ┌──────────┐  ┌──────────┐     ┌──────────┐
  │Budget    │  │Annual    │     │Stats     │
  │Tab       │  │Budget    │     │Screen    │
  │(gate)    │  │(gate)    │     │(gate)    │
  └──┬───────┘  └──┬───────┘     └──┬───────┘
     │            │                 │
     │ Check:     │ Check:          │ Check:
     │ canAccess  │ canAccess       │ canAccess
     │("budgets")│("annual")       │("stats")
     │            │                 │
     ├─────────┬──┴──────┬──────────┴─┐
     │         │         │            │
     ▼         ▼         ▼            ▼
   ✓ Show   ✓ Show   ✗ Show    ? Show
  Feature  Feature  Paywall   Paywall
```

---

## 5. Service Layer Architecture

```
┌────────────────────────────────────────────────┐
│           Screens & Components                 │
│  (HomeScreen, BudgetDashboard, etc.)           │
└────────────┬─────────────────────────────────┬─┘
             │                                 │
    useBudget() hook              useAuth() hook
             │                                 │
             ▼                                 ▼
┌──────────────────────┐        ┌──────────────────────┐
│  BudgetContext       │        │  AuthContext         │
│  (provides state)    │        │  (provides state)    │
└────────┬─────────────┘        └────────┬─────────────┘
         │                              │
         │ calls methods               │ calls methods
         │                              │
         ▼                              ▼
┌──────────────────────────────┐ ┌─────────────────────┐
│  Services (business logic)   │ │ Firebase Auth SDK   │
│  ┌──────────────────────────┐│ │                     │
│  │- budgetService.js        ││ │ - signUp()          │
│  │- expenseService.js       ││ │ - signIn()          │
│  │- categoryService.js      ││ │ - signOut()         │
│  │- settlementService.js    ││ │ - Google OAuth      │
│  │- paymentService.js (NEW) ││ │ - Apple OAuth       │
│  └──────────────────────────┘│ └─────────────────────┘
└──────────┬───────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│  Firestore Database                    │
│  ┌────────────────────────────────────┐│
│  │ Collections:                       ││
│  │ - users/                           ││
│  │ - couples/                         ││
│  │ - expenses/                        ││
│  │ - budgets/                         ││
│  │ - categories/                      ││
│  │ - settlements/                     ││
│  │ - inviteCodes/                     ││
│  │ - payments/ (NEW for payment logs) ││
│  └────────────────────────────────────┘│
└────────────────────────────────────────┘
```

---

## 6. Real-time Data Sync Architecture

```
Firestore Document Change
         │
         ▼
┌──────────────────────────────┐
│  onSnapshot() Listener       │
│  (in Service)                │
└──────────────┬───────────────┘
               │
               │ Data changed
               │
               ▼
┌──────────────────────────────┐
│  Service Callback Function   │
│  (updates data)              │
└──────────┬────────────────────┘
           │
           │ Calls callback
           │
           ▼
┌──────────────────────────────┐
│  Context setState()          │
│  (BudgetContext, etc.)       │
└──────────┬────────────────────┘
           │
           │ React triggers re-render
           │
           ▼
┌──────────────────────────────┐
│  Component Updates           │
│  (Screen, etc.)              │
└──────────────────────────────┘

Example for expenses:
  expenseService.subscribeToExpenses(coupleId, (expenses) => {
    setExpenses(expenses);  // ← Updates component state
  });
```

---

## 7. Onboarding Modal Overlay Logic

```
┌─────────────────────────────────────────────────────┐
│  AppNavigator.js (Main routing)                     │
│                                                     │
│  Main App Stack:                                   │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  │  Stack.Screen "MainTabs"                      │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │  TabNavigator (5 tabs visible)          │ │ │
│  │  │  - HomeTab                              │ │ │
│  │  │  - SettlementsTab                       │ │ │
│  │  │  - BudgetTab                            │ │ │
│  │  │  - StatsTab                             │ │ │
│  │  │  - SettingsTab                          │ │ │
│  │  │                                         │ │ │
│  │  │  (Always visible underneath modal)      │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │  Stack.Screen "Onboarding"                   │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │  presentation: "transparentModal"       │ │ │
│  │  │  OnboardingNavigator                    │ │ │
│  │  │  (Shows only if not onboarding_         │ │ │
│  │  │   completed_{coupleId})                 │ │ │
│  │  │                                         │ │ │
│  │  │  - OnboardingIntroScreen                │ │ │
│  │  │  - SimpleMode OR AdvancedMode screens   │ │ │
│  │  │  - SuccessScreen                        │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  │  Stack.Screen "AddExpense"                   │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │  presentation: "modal"                  │ │ │
│  │  │  AddExpenseScreen                       │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Logic:                                            │
│  1. Check onboarding_completed_{coupleId}          │
│  2. If false/not set → show Onboarding modal       │
│  3. If true → hide modal                           │
│  4. On completion → set AsyncStorage flag          │
│  5. AppNavigator polls every 2 seconds to sync     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 8. Error Handling & Recovery Flow

```
┌──────────────────────────────┐
│  Operation Attempt           │
│  (firestore call, etc.)      │
└──────────────┬───────────────┘
               │
               ▼
        ┌──────────────┐
        │  Error?      │
        └──┬───────┬──┬┘
           │       │  │
        No │       │  └─► Yes
           │       │
           ▼       ▼
      Success   categorizeError()
           │       │
           │       ▼
           │   ┌──────────────────────────┐
           │   │ Error Types:             │
           │   │ - QUOTA_EXCEEDED         │
           │   │ - PERMISSION_DENIED      │
           │   │ - INVALID_KEY            │
           │   │ - NOT_FOUND              │
           │   │ - UNKNOWN                │
           │   └────┬─────────────────────┘
           │        │
           │        ▼
           │   ┌──────────────────────────┐
           │   │ Log Error Category       │
           │   │ Contextual Information   │
           │   └────┬─────────────────────┘
           │        │
           │        ▼
           │   ┌──────────────────────────┐
           │   │ Throw StorageError or    │
           │   │ update error state       │
           │   └────┬─────────────────────┘
           │        │
           └────┬───┘
                │
                ▼
        ┌──────────────┐
        │ Component    │
        │ catches and  │
        │ renders      │
        │ error UI     │
        └──────────────┘
```

---

## 9. Payment Gating Implementation Plan

```
┌────────────────────────────────────────────────────────┐
│ Payment Gating System (To be implemented)              │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 1. Add Plan Fields to User Document              │  │
│ │    users/{uid}                                   │  │
│ │    {                                             │  │
│ │      plan: "free" | "pro" | "premium"           │  │
│ │      subscription: {                            │  │
│ │        provider: "stripe"                        │  │
│ │        customerId: "..."                         │  │
│ │        subscriptionId: "..."                     │  │
│ │        status: "active" | "cancelled"           │  │
│ │        renewsAt: timestamp                       │  │
│ │      },                                          │  │
│ │      isPremium: boolean                          │  │
│ │      features: ["budgets", "annual", ...]      │  │
│ │    }                                             │  │
│ └──────┬───────────────────────────────────────────┘  │
│        │                                              │
│ ┌──────▼───────────────────────────────────────────┐  │
│ │ 2. Create Payment Service                        │  │
│ │    paymentService.js                             │  │
│ │    - checkPlanStatus()                           │  │
│ │    - createCheckoutSession()                     │  │
│ │    - handleWebhook()                             │  │
│ │    - upgradePlan()                               │  │
│ │    - cancelSubscription()                        │  │
│ └──────┬───────────────────────────────────────────┘  │
│        │                                              │
│ ┌──────▼───────────────────────────────────────────┐  │
│ │ 3. Create Feature Flag Context                   │  │
│ │    FeatureFlagContext.js                         │  │
│ │    - Listen for plan changes                     │  │
│ │    - Map plan → available features               │  │
│ │    - Provide canAccessFeature()                  │  │
│ └──────┬───────────────────────────────────────────┘  │
│        │                                              │
│ ┌──────▼───────────────────────────────────────────┐  │
│ │ 4. Create Feature Gate Component                 │  │
│ │    FeatureGate.js                                │  │
│ │    <FeatureGate feature="budgets">               │  │
│ │      <BudgetTab />                               │  │
│ │    </FeatureGate>                                │  │
│ │                                                  │  │
│ │    Shows PaywallScreen if not accessible        │  │
│ └──────┬───────────────────────────────────────────┘  │
│        │                                              │
│ ┌──────▼───────────────────────────────────────────┐  │
│ │ 5. Create Paywall Screen                         │  │
│ │    PaywallScreen.js                              │  │
│ │    - Show feature benefits                       │  │
│ │    - Show pricing plans                          │  │
│ │    - "Upgrade" CTA button                        │  │
│ │    - Start checkout flow                         │  │
│ └──────┬───────────────────────────────────────────┘  │
│        │                                              │
│ ┌──────▼───────────────────────────────────────────┐  │
│ │ 6. Update Firestore Rules                        │  │
│ │    Validate plan server-side                     │  │
│ │    Prevent unauthorized plan changes             │  │
│ └────────────────────────────────────────────────────┘  │
│                                                        │
│ Plan Feature Mapping Example:                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ free:     ["expenses", "basic_stats"]            │  │
│ │ pro:      ["budgets", "settlements"]             │  │
│ │ premium:  ["annual_budgets", "advanced_stats"]   │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 10. Component Hierarchy

```
App.js
├── SafeAreaProvider
├── AuthProvider
│   ├── BudgetProvider
│   │   └── AppNavigator
│   │       ├── Stack Navigator (Auth state dependent)
│   │       │   ├── Auth Stack
│   │       │   │   ├── WelcomeScreen
│   │       │   │   ├── SignUpScreen
│   │       │   │   └── SignInScreen
│   │       │   │
│   │       │   ├── Connect Stack
│   │       │   │   ├── ConnectScreen
│   │       │   │   ├── InviteScreen
│   │       │   │   ├── JoinScreen
│   │       │   │   ├── SuccessScreen
│   │       │   │   └── FiscalYearSetupScreen
│   │       │   │
│   │       │   └── Main App Stack
│   │       │       ├── TabNavigator (MainTabs)
│   │       │       │   ├── HomeTab
│   │       │       │   │   └── HomeScreen
│   │       │       │   ├── SettlementsTab
│   │       │       │   │   ├── SettlementHistoryScreen
│   │       │       │   │   └── SettlementDetailScreen
│   │       │       │   ├── BudgetTab
│   │       │       │   │   ├── BudgetDashboardScreen
│   │       │       │   │   ├── BudgetSetupScreen
│   │       │       │   │   ├── CategoryManagerScreen
│   │       │       │   │   └── AnnualBudgetSetupScreen
│   │       │       │   ├── StatsTab
│   │       │       │   │   └── StatsScreen
│   │       │       │   └── SettingsTab
│   │       │       │       └── SettingsScreen
│   │       │       ├── Onboarding Modal (Transparent)
│   │       │       │   └── OnboardingNavigator
│   │       │       │       ├── OnboardingIntroScreen
│   │       │       │       ├── OnboardingSkipScreen
│   │       │       │       ├── Simple Mode Screens (if selected)
│   │       │       │       ├── Advanced Mode Screens (if selected)
│   │       │       │       └── Success Screen
│   │       │       └── AddExpense Modal
│   │       │           └── AddExpenseScreen
│   │       │
│   │       └── Loading Spinner (during auth/onboarding check)
│   │
│   └── FeatureFlagProvider (NEW for payment gating)
│
└── Global Contexts Available:
    - useAuth() → access to user, userDetails, auth methods
    - useBudget() → access to categories, budgets, progress
    - useFeatureFlags() → access to canAccessFeature(), plan info (NEW)
```

---

**End of Architecture Diagrams**
