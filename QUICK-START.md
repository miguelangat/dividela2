# Dividela - Quick Start Guide

Now that you have the setup complete, let's implement the first features!

---

## 📦 Files Ready to Use

I've created the foundational code files for you. Here's what each one does and where it goes:

### 1. **CODE_theme.js** → `src/constants/theme.js`
- **Purpose:** Design system with colors, fonts, spacing, shadows
- **Contains:** All style constants used throughout the app
- **Usage:** Import colors, fonts, spacing wherever needed

### 2. **CODE_categories.js** → `src/constants/categories.js`
- **Purpose:** Expense category definitions
- **Contains:** 6 categories with icons and colors
- **Usage:** Import when showing category picker

### 3. **CODE_AuthContext.js** → `src/contexts/AuthContext.js`
- **Purpose:** Global authentication state management
- **Contains:** Sign up, sign in, sign out, user state
- **Usage:** Wrap your app with AuthProvider, use useAuth() hook

### 4. **CODE_validators.js** → `src/utils/validators.js`
- **Purpose:** Form validation functions
- **Contains:** Validators for email, password, amounts, etc.
- **Usage:** Call validation functions in forms

### 5. **CODE_calculations.js** → `src/utils/calculations.js`
- **Purpose:** Financial calculation utilities
- **Contains:** Balance calculations, splits, date formatting
- **Usage:** Import functions when calculating balances

---

## 🚀 How to Use These Files

### Step 1: Copy Files to Your Project

In VS Code, for each file:

1. Open the file from `/mnt/user-data/outputs/` (e.g., `CODE_theme.js`)
2. Copy all the content
3. Create the corresponding file in your project:
   - `CODE_theme.js` → Create `src/constants/theme.js` and paste
   - `CODE_categories.js` → Create `src/constants/categories.js` and paste
   - `CODE_AuthContext.js` → Create `src/contexts/AuthContext.js` and paste
   - `CODE_validators.js` → Create `src/utils/validators.js` and paste
   - `CODE_calculations.js` → Create `src/utils/calculations.js` and paste

### Step 2: Update Your App.js

Replace your `App.js` with this:

```javascript
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      {/* Navigation will go here */}
      <Text>Dividela App</Text>
    </AuthProvider>
  );
}
```

### Step 3: Test the Setup

Run your app:
```bash
npx expo start
```

If you see "Dividela App" on your phone with no errors, you're ready to continue!

---

## 📱 What We'll Build Next

Now that the foundation is ready, here's what we'll build in order:

### Phase 1: Authentication Screens (Next)
1. **Welcome Screen** - First screen with "Get Started"
2. **Sign Up Screen** - Create account with email/password
3. **Sign In Screen** - Login for returning users

### Phase 2: Couple Pairing
4. **Connect Screen** - Choose to invite or join
5. **Invite Screen** - Generate and share code
6. **Join Screen** - Enter partner's code
7. **Success Screen** - Celebration when paired

### Phase 3: Main App
8. **Navigation** - Set up bottom tabs
9. **Home Screen** - View balance and expenses
10. **Add Expense Screen** - Form to add new expense
11. **Stats Screen** - View spending statistics
12. **Settings Screen** - User preferences

---

## 🎯 Your Next Steps

### Option 1: I'll Guide You Through Each Screen
Let me know you're ready, and I'll create the next batch of files:
- WelcomeScreen.js
- SignUpScreen.js
- SignInScreen.js

### Option 2: You Want to Try Building First
Great! Here's a challenge:
1. Try creating the WelcomeScreen using the prototype as reference
2. Use the theme constants for styling
3. Let me know if you get stuck

### Option 3: You Have Questions
Ask me anything about:
- How the files work together
- Firebase configuration
- React Native concepts
- Project structure

---

## 💡 Quick Reference

### How to Import and Use Theme:

```javascript
import { COLORS, FONTS, SPACING, COMMON_STYLES } from '../constants/theme';

// Use in styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    padding: SPACING.screenPadding,
  },
  text: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
  },
});
```

### How to Use Auth Context:

```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, signUp, signIn, signOut } = useAuth();

  const handleSignUp = async () => {
    try {
      await signUp('email@example.com', 'password123', 'John Doe');
      // Success!
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View>
      {user ? <Text>Logged in!</Text> : <Text>Not logged in</Text>}
    </View>
  );
}
```

### How to Use Validators:

```javascript
import { validateEmail, validatePassword } from '../utils/validators';

const emailValidation = validateEmail('test@example.com');
if (!emailValidation.isValid) {
  console.log(emailValidation.error);
}
```

### How to Use Categories:

```javascript
import { CATEGORIES, getCategoryIcon } from '../constants/categories';

// Show all categories
CATEGORIES.map(category => (
  <View key={category.id}>
    <Text>{category.icon} {category.name}</Text>
  </View>
));

// Get specific category icon
const icon = getCategoryIcon('food'); // Returns '🍕'
```

---

## ✅ Checklist Before Continuing

Make sure you have:
- [ ] All 5 code files copied to correct locations
- [ ] No import errors in VS Code
- [ ] App runs without crashes
- [ ] Firebase config file created (from SETUP-GUIDE)
- [ ] .env file with Firebase credentials
- [ ] All dependencies installed

---

## 🐛 Common Issues

### "Cannot find module '../constants/theme'"
**Solution:** Make sure you created the file in the correct location: `src/constants/theme.js`

### "auth is undefined" or Firebase errors
**Solution:** Check your `src/config/firebase.js` file has correct credentials

### Import errors in VS Code
**Solution:** Sometimes VS Code needs a restart. Try:
1. Close VS Code
2. Reopen the project folder
3. Run `npm install` again

### Metro bundler errors
**Solution:** Clear cache:
```bash
npx expo start -c
```

---

## 📚 Understanding the Code Structure

```
dividela/
├── src/
│   ├── config/
│   │   └── firebase.js          [✅ Created in setup]
│   ├── constants/
│   │   ├── theme.js             [✅ Created now]
│   │   └── categories.js        [✅ Created now]
│   ├── contexts/
│   │   └── AuthContext.js       [✅ Created now]
│   ├── utils/
│   │   ├── validators.js        [✅ Created now]
│   │   └── calculations.js      [✅ Created now]
│   ├── screens/                 [⏳ Coming next]
│   │   ├── auth/
│   │   └── main/
│   ├── components/              [⏳ Coming next]
│   └── navigation/              [⏳ Coming next]
└── App.js                       [⏳ Will update]
```

---

## 🎓 Learning Resources

If you're new to React Native or Firebase, here are helpful docs:

**React Native Basics:**
- Components: https://reactnative.dev/docs/components-and-apis
- Styling: https://reactnative.dev/docs/style
- State & Props: https://react.dev/learn/state-a-components-memory

**Firebase:**
- Authentication: https://firebase.google.com/docs/auth
- Firestore: https://firebase.google.com/docs/firestore

**Expo:**
- Getting Started: https://docs.expo.dev/get-started/introduction/

---

## 💬 Ready for Next Steps?

**Tell me one of these:**

1. **"I'm ready for the screens!"** - I'll create Welcome, SignUp, and SignIn screens
2. **"I have a question about [X]"** - Ask me anything
3. **"I'm stuck on [Y]"** - Let me help troubleshoot
4. **"Can you explain [Z]?"** - I'll explain any concept

**Or just say "next" and I'll continue with the authentication screens!**

---

Remember: You're building something awesome! Take it one step at a time, and don't hesitate to ask questions. 🚀
