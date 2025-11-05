# Dividela - Development Setup Guide

Complete guide to set up your development environment with VS Code and Firebase.

---

## Prerequisites

Before starting, make sure you have:

- [ ] **Visual Studio Code** installed (latest version)
- [ ] **Node.js** installed (v18 or higher) - [Download](https://nodejs.org/)
- [ ] **Git** installed - [Download](https://git-scm.com/)
- [ ] **Google account** for Firebase
- [ ] **Smartphone** (iOS or Android) for testing

---

## Part 1: Initial Setup (15 minutes)

### Step 1: Verify Node.js Installation

Open VS Code terminal (Terminal → New Terminal) and run:

```bash
node --version
npm --version
```

You should see version numbers. If not, install Node.js first.

### Step 2: Install Expo CLI

Expo makes React Native development much easier:

```bash
npm install -g expo-cli
```

Verify installation:

```bash
expo --version
```

### Step 3: Install Expo Go App on Your Phone

- **iOS**: Download from App Store
- **Android**: Download from Google Play Store

This allows you to test the app on your real device instantly.

---

## Part 2: Create the Project (10 minutes)

### Step 1: Create New Expo Project

In your terminal, navigate to where you want to create the project:

```bash
# Navigate to your projects folder
cd ~/Documents/Projects  # or wherever you keep projects

# Create the project
npx create-expo-app dividela

# Navigate into the project
cd dividela
```

### Step 2: Open in VS Code

```bash
code .
```

This opens the project in VS Code.

### Step 3: Install Required Dependencies

```bash
# Core dependencies
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install firebase
npm install @react-native-async-storage/async-storage

# UI components (React Native Paper)
npm install react-native-paper react-native-vector-icons

# Additional utilities
npm install react-native-gesture-handler react-native-reanimated
```

### Step 4: Test the Setup

Start the development server:

```bash
npx expo start
```

You should see a QR code in the terminal. Scan it with:
- **iOS**: Camera app
- **Android**: Expo Go app

The default Expo app should load on your phone.

---

## Part 3: Firebase Setup (20 minutes)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: **"dividela"**
4. Disable Google Analytics (not needed for now)
5. Click **"Create project"**
6. Wait for setup to complete

### Step 2: Add Web App to Firebase

1. In Firebase Console, click the **Web icon** (</>)
2. Register app with nickname: **"Dividela App"**
3. **DON'T** check "Also set up Firebase Hosting"
4. Click **"Register app"**
5. Copy the Firebase config object (looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "dividela.firebaseapp.com",
  projectId: "dividela",
  storageBucket: "dividela.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

6. **SAVE THIS** - you'll need it soon
7. Click **"Continue to console"**

### Step 3: Enable Authentication

1. In Firebase Console, click **"Authentication"** in left sidebar
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Enable **"Email/Password"**
   - Toggle it on
   - Leave "Email link" off
   - Click **"Save"**
5. Optional: Enable **"Google"** sign-in
   - Toggle it on
   - Enter support email
   - Click **"Save"**

### Step 4: Set Up Firestore Database

1. Click **"Firestore Database"** in left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Choose your location (closest to your users)
5. Click **"Enable"**

Wait for database creation.

### Step 5: Set Up Security Rules (Temporary)

1. In Firestore, click **"Rules"** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Temporary: Allow authenticated users to read/write their own data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **"Publish"**

**Note:** These are temporary permissive rules. We'll make them secure later.

---

## Part 4: Project Structure Setup (10 minutes)

### Step 1: Create Folder Structure

In VS Code, create this folder structure:

```
dividela/
├── src/
│   ├── config/
│   │   └── firebase.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── WelcomeScreen.js
│   │   │   ├── SignUpScreen.js
│   │   │   ├── ConnectScreen.js
│   │   │   ├── InviteScreen.js
│   │   │   ├── JoinScreen.js
│   │   │   └── SuccessScreen.js
│   │   ├── main/
│   │   │   ├── HomeScreen.js
│   │   │   ├── AddExpenseScreen.js
│   │   │   ├── StatsScreen.js
│   │   │   └── SettingsScreen.js
│   ├── components/
│   │   ├── ExpenseItem.js
│   │   ├── BalanceCard.js
│   │   └── CategoryButton.js
│   ├── navigation/
│   │   └── AppNavigator.js
│   ├── utils/
│   │   ├── calculations.js
│   │   └── validators.js
│   └── constants/
│       ├── categories.js
│       └── theme.js
├── assets/
├── App.js
└── package.json
```

You can create folders manually or run these commands in terminal:

```bash
mkdir -p src/config src/contexts src/screens/auth src/screens/main src/components src/navigation src/utils src/constants
```

### Step 2: Create Firebase Config File

Create `src/config/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace with your Firebase config from Step 3.2
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
```

**IMPORTANT:** Replace the placeholder values with your actual Firebase config from Part 3, Step 2.

---

## Part 5: Environment Variables (Security Best Practice)

### Step 1: Create .env File

Create a file named `.env` in the root of your project:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

Replace the values with your actual Firebase config.

### Step 2: Update .gitignore

Open `.gitignore` and make sure it includes:

```
.env
.env.local
```

This prevents your Firebase keys from being committed to Git.

### Step 3: Update firebase.js to Use Environment Variables

Update `src/config/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
```

---

## Part 6: Install VS Code Extensions (Recommended)

Install these extensions in VS Code for better development experience:

1. **ES7+ React/Redux/React-Native snippets**
   - Quick snippets for React components
   
2. **Prettier - Code formatter**
   - Automatic code formatting
   
3. **ESLint**
   - JavaScript linting
   
4. **GitLens**
   - Enhanced Git integration
   
5. **React Native Tools**
   - Debugging and IntelliSense for React Native

**To install:**
1. Open VS Code Extensions (Cmd/Ctrl + Shift + X)
2. Search for each extension
3. Click "Install"

---

## Part 7: Initial Configuration Files

### app.json Configuration

Update your `app.json`:

```json
{
  "expo": {
    "name": "Dividela",
    "slug": "dividela",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#667eea"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.dividela"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#667eea"
      },
      "package": "com.yourname.dividela"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### package.json Scripts

Your `package.json` should have these scripts:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
}
```

---

## Part 8: Verify Setup

### Checklist

Run through this checklist to verify everything is set up:

- [ ] Node.js and npm installed and working
- [ ] Expo CLI installed globally
- [ ] Project created with `create-expo-app`
- [ ] All dependencies installed (npm install completed)
- [ ] Firebase project created
- [ ] Firebase config added to project
- [ ] .env file created with Firebase credentials
- [ ] Folder structure created
- [ ] VS Code extensions installed
- [ ] Can run `npx expo start` successfully
- [ ] Can scan QR code and see app on phone

### Test Firebase Connection

Create a test file `src/test-firebase.js`:

```javascript
import { auth, db } from './config/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    console.log('Auth initialized:', auth ? '✓' : '✗');
    console.log('Firestore initialized:', db ? '✓' : '✗');
    
    // Try to read from Firestore
    const testCollection = collection(db, 'test');
    await getDocs(testCollection);
    console.log('Firestore read test: ✓');
    
    return true;
  } catch (error) {
    console.error('Firebase connection error:', error);
    return false;
  }
};
```

Run this test by adding to your `App.js` temporarily:

```javascript
import { testFirebaseConnection } from './src/test-firebase';

// In useEffect or on button press
testFirebaseConnection();
```

---

## Part 9: Git Setup (Optional but Recommended)

### Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Project setup"
```

### Create GitHub Repository (Optional)

1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name it "dividela"
4. Don't initialize with README (we already have files)
5. Click "Create repository"
6. Run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/dividela.git
git branch -M main
git push -u origin main
```

---

## Troubleshooting Common Issues

### Issue: "Expo command not found"

**Solution:** Install Expo CLI globally:
```bash
npm install -g expo-cli
```

### Issue: "Firebase not connecting"

**Solutions:**
1. Check that .env file has correct values
2. Verify Firebase config in console
3. Make sure you're using EXPO_PUBLIC_ prefix for env vars
4. Restart the dev server after changing .env

### Issue: "Cannot find module 'firebase'"

**Solution:** Reinstall dependencies:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Issue: Metro bundler errors

**Solution:** Clear cache and restart:
```bash
npx expo start -c
```

### Issue: "Network response timed out"

**Solution:** 
1. Make sure phone and computer are on same WiFi
2. Try using tunnel: `npx expo start --tunnel`
3. Or use USB debugging

---

## Next Steps

Now that your environment is set up, you're ready to start coding! 

**Next: We'll create the authentication screens and navigation system.**

The setup is complete when you can:
✅ Run `npx expo start`
✅ See the app on your phone via Expo Go
✅ No error messages in terminal
✅ Firebase connection works

---

## Quick Reference Commands

```bash
# Start development server
npx expo start

# Start with clear cache
npx expo start -c

# Start on specific platform
npx expo start --ios
npx expo start --android

# Install new package
npm install package-name

# Check Expo doctor
npx expo-doctor
```

---

## Support Resources

- **Expo Docs:** https://docs.expo.dev/
- **React Native Docs:** https://reactnative.dev/
- **Firebase Docs:** https://firebase.google.com/docs
- **React Navigation:** https://reactnavigation.org/

---

**You're all set! Let me know when you've completed the setup and we'll start building the app.**
