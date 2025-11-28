# Dividela - Quick Reference Guide

## Key Architecture Patterns

### 1. Authentication & User State
```
AuthContext (src/contexts/AuthContext.js)
├── Manages: Firebase Auth + Firestore user data
├── Provides: user, userDetails, loading, signUp, signIn, signOut
└── Used in: Every authenticated screen
```

### 2. Budget Management
```
BudgetContext (src/contexts/BudgetContext.js)
├── Manages: Categories, budgets, progress
├── Services: budgetService.js, categoryService.js
└── Used in: Budget, Stats, Home screens
```

### 3. Firestore Data Flow
```
Services (expenseService, budgetService, etc.)
     ↓
Contexts (AuthContext, BudgetContext)
     ↓
Screens & Components
     ↓
UI Rendering
```

---

## File Quick Lookup

### Add/Modify User Subscription
- **Location:** `/src/contexts/AuthContext.js` (line 93-105)
- **Firestore Structure:** `users/{uid}` document
- **Add Fields:** `subscription`, `plan`, `isPremium`, `planStartDate`, `planEndDate`

### Add Feature Gating
- **Create:** `/src/services/featureService.js` (new)
- **Create:** `/src/contexts/FeatureFlagContext.js` (new)
- **Component:** `/src/components/FeatureGate.js` (new)

### Budget Modes (Reference Pattern)
- **Location:** `/src/constants/budgetDefaults.js` (line 34-40)
- **Usage Example:** Check how `complexity` field gates features
- **Pattern:** Modes stored in Firestore, used for conditional rendering

### Conditional Navigation Example
- **Location:** `/src/navigation/AppNavigator.js` (line 263-303)
- **Pattern:** Stack.Navigator shows different screens based on auth state
- **Apply To:** Show different tabs/screens based on plan

### Real-time Listeners Example
- **Location:** `/src/services/expenseService.js` (line 52-73)
- **Pattern:** `onSnapshot()` with callback updates component state
- **Apply To:** Listen for plan changes in real-time

### Error Handling Pattern
- **Location:** `/src/utils/storage.js` (line 21-28, 33-47)
- **Pattern:** Custom error class with categorized error types
- **Apply To:** Payment errors, plan validation errors

---

## Core Entities & Collections

### User Document Schema
```firestore
users/{uid}
├── uid: string
├── email: string
├── displayName: string
├── partnerId: string (null before pairing)
├── coupleId: string (null before pairing)
├── createdAt: timestamp
├── settings: {
│   notifications: boolean
│   defaultSplit: number
│   currency: string
│   [ADD HERE → subscription details]
└── [ADD HERE → plan info]
```

### Couple Document Schema
```firestore
couples/{coupleId}
├── user1Id: string
├── user2Id: string
├── inviteCode: string
├── createdAt: timestamp
├── currentBalance: number
├── totalExpenses: number
└── lastActivity: timestamp
```

### Budget Document Schema
```firestore
budgets/{coupleId_year_month}
├── coupleId: string
├── month: number (1-12)
├── year: number
├── complexity: string (none|simple|advanced)
├── enabled: boolean
├── categoryBudgets: {food: 500, ...}
└── canAutoAdjust: boolean
```

---

## Navigation Structure

```
app starts
    ↓
AppNavigator.js
    ├── if !user → Auth Stack (welcome, signup, signin)
    ├── if user && !partnerId → Connect Stack (invite, join code)
    └── if user && partnerId → Main App Stack
        ├── TabNavigator (5 tabs)
        ├── Onboarding Modal (if not completed)
        └── AddExpense Modal
```

### How to Add Payment Gate
1. Add `plan` field check in AuthContext
2. Create FeatureFlagContext with `canAccessFeature()`
3. Wrap screens/features with FeatureGate component
4. Show PaywallScreen when feature not accessible

---

## Services Architecture

### Pattern: Async Operations
```javascript
export const fetchData = async (id) => {
  try {
    const doc = await getDoc(/* ... */);
    return doc.data();
  } catch (err) {
    console.error('Error:', err);
    throw err;  // Let caller handle
  }
};
```

### Pattern: Real-time Subscriptions
```javascript
export const subscribeToData = (id, callback) => {
  return onSnapshot(query(/* ... */), (snapshot) => {
    const data = [];
    snapshot.forEach(doc => data.push(doc.data()));
    callback(data);  // Trigger state update
  });
};
```

### Pattern: Context Integration
```javascript
// In context:
useEffect(() => {
  const unsubscribe = expenseService.subscribeToExpenses(
    coupleId,
    (expenses) => setExpenses(expenses)
  );
  return unsubscribe;  // Cleanup listener
}, [coupleId]);
```

---

## Constants & Configurations

### Colors
- **Location:** `/src/constants/theme.js`
- **Primary Color:** #6366f1 (indigo)
- **Use Case:** Accessible in all components via `COLORS` object

### Budget Modes
- **Location:** `/src/constants/budgetDefaults.js`
- **Values:** 'none' | 'simple' | 'advanced'
- **Use Case:** Determines which budget features are available

### Categories
- **Location:** `/src/constants/defaultCategories.js`
- **Structure:** `{ icon, color, defaultBudget, isDefault, sortOrder }`
- **Use Case:** Expense categorization and budget templates

---

## Testing

### Run Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Test File Location
- `src/__tests__/` directory
- Files: calculations.test.js, CRUD operations tests

### Test Pattern
```javascript
describe('Feature', () => {
  it('should work', () => {
    // test code
  });
});
```

---

## Key Dependencies

### Firebase SDKs
```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
```

### Navigation
```javascript
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
```

### UI Components
```javascript
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
```

---

## Common Tasks Checklist

### To Add a New Feature
- [ ] Create service in `/src/services/`
- [ ] Create context in `/src/contexts/` (if global state needed)
- [ ] Create screen in `/src/screens/main/`
- [ ] Add navigation route in `/src/navigation/`
- [ ] Add to TabNavigator if it's a main screen
- [ ] Test with real Firestore data

### To Gate a Feature Behind Payment
- [ ] Add plan check: `if (!userDetails?.isPremium)`
- [ ] Show PaywallScreen instead of feature
- [ ] Log feature access attempt to analytics
- [ ] Update Firestore rules to validate plan server-side

### To Debug an Issue
1. Check browser console (F12 → Console)
2. Check Firebase error codes in error messages
3. Check Firestore rules: https://console.firebase.google.com/project/dividela-76aba/firestore/rules
4. Check Firestore data: https://console.firebase.google.com/project/dividela-76aba/firestore/data
5. Use AsyncStorage logging in utils/storage.js

---

## Environment Setup

### Required .env Variables
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

### Firebase Project
- **Project ID:** dividela-76aba
- **Authentication:** Enabled (Email/Password, Google, Apple)
- **Firestore:** Created with security rules published

---

## Useful Links

- **Firebase Console:** https://console.firebase.google.com/project/dividela-76aba
- **GitHub:** https://github.com/miguelangat/dividela2
- **Firestore Rules:** See FIRESTORE-RULES-FINAL.md in project root
- **Full Architecture:** See CODEBASE-ARCHITECTURE.md in project root

---

**Last Updated:** November 19, 2025
