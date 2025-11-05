# Fixing the Blank Screen Issue

## 🔍 Diagnosing the Problem

The blank screen is likely caused by one of these issues:
1. **Firebase configuration not loading** (environment variables)
2. **JavaScript error** preventing render
3. **Navigation setup issue**

## 🛠️ Step-by-Step Fix

### Step 1: Check Browser Console

If you're viewing the web version:

1. **Open Browser DevTools:**
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+I`
   - Firefox: Press `F12`
   - Safari: Enable Developer Menu, then `Cmd+Option+I`

2. **Go to Console tab**

3. **Look for these messages:**
   - ❌ **"Firebase configuration is incomplete!"** → Environment variables not loading
   - ❌ **"Firebase configuration is missing"** → .env file issue
   - ❌ **Red error messages** → JavaScript errors
   - ✅ **"Firebase initialized successfully"** → Firebase is working

4. **Check what you see:**
   - If you see **Firebase Config:** logged → Check if values are "undefined"
   - If you see **error messages** → Copy the full error text

### Step 2: Test React Native Without Firebase

Let's verify React Native is working:

1. **Rename App.js temporarily:**
   ```bash
   mv App.js App-with-firebase.js
   mv App-test.js App.js
   ```

2. **Reload the app:**
   - Web: Refresh browser
   - Mobile: Shake device → Reload

3. **What you should see:**
   - 💑 Emoji
   - "Dividela - Test Version"
   - A button that counts clicks
   - **If this works:** React Native is fine, the issue is Firebase/Auth

4. **Restore original App.js:**
   ```bash
   mv App.js App-test-backup.js
   mv App-with-firebase.js App.js
   ```

### Step 3: Check Environment Variables

The most likely issue is that `.env` variables aren't loading:

**Option A: Check in Browser Console**
```javascript
// Type this in browser console:
console.log(process.env.EXPO_PUBLIC_FIREBASE_API_KEY);

// Should show: "AIzaSyDgO_K3ORafU5mfzO_41b13SaozbEi98Yo"
// If shows: undefined → Environment variables not loading
```

**Option B: Hardcode Firebase Config (Temporary Test)**

Edit `src/config/firebase.js` and replace the config:

```javascript
// TEMPORARILY replace this:
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// WITH this (hardcoded):
const firebaseConfig = {
  apiKey: "AIzaSyDgO_K3ORafU5mfzO_41b13SaozbEi98Yo",
  authDomain: "dividela-76aba.firebaseapp.com",
  projectId: "dividela-76aba",
  storageBucket: "dividela-76aba.firebasestorage.app",
  messagingSenderId: "156140614030",
  appId: "1:156140614030:web:690820d7f6ac89510db4df",
};
```

**Then reload the app.**

If this works, the problem is environment variable loading.

### Step 4: Fix Environment Variables

If environment variables aren't loading:

**For Web Build:**
Expo web might not load `.env` automatically. Try:

1. **Install dotenv:**
   ```bash
   npm install dotenv
   ```

2. **Or use app.config.js instead of app.json:**

   Create `app.config.js`:
   ```javascript
   export default {
     expo: {
       name: "Dividela",
       slug: "dividela",
       version: "1.0.0",
       orientation: "portrait",
       userInterfaceStyle: "light",
       assetBundlePatterns: ["**/*"],
       ios: {
         supportsTablet: true,
         bundleIdentifier: "com.dividela.app"
       },
       android: {
         package: "com.dividela.app"
       },
       web: {
         bundler: "metro"
       },
       extra: {
         firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
         firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
         firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
         firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
         firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
         firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
       }
     }
   };
   ```

3. **Restart Expo completely:**
   ```bash
   # Kill all Expo processes
   pkill -f "expo start" || true

   # Clear cache
   npx expo start -c
   ```

### Step 5: Check Mobile App Console

If testing on mobile with Expo Go:

1. **Shake the device**
2. **Tap "Debug Remote JS"** or **"Open DevTools"**
3. **Browser will open with console**
4. **Look for errors**

## 🚨 Common Issues & Solutions

### Issue 1: "Firebase configuration is missing"

**Cause:** Environment variables not loading

**Fix:**
1. Hardcode Firebase config temporarily (see Step 3B above)
2. Or use `app.config.js` instead of `app.json`
3. Make sure `.env` file is in project root (not in subdirectory)

### Issue 2: "Cannot find module '@react-navigation/native'"

**Cause:** Missing dependency

**Fix:**
```bash
npm install @react-navigation/native @react-navigation/stack
npx expo start -c
```

### Issue 3: "auth/... Error"

**Cause:** Firebase service not enabled or wrong credentials

**Fix:**
1. Check Firebase Console → Authentication is enabled
2. Check Firebase Console → Firestore is created
3. Verify credentials in `.env` match Firebase Console

### Issue 4: Still Blank Screen

**Try this:**

1. **Check package.json has:**
   ```json
   "main": "node_modules/expo/AppEntry.js"
   ```

2. **Clear all caches:**
   ```bash
   rm -rf node_modules .expo
   npm install
   npx expo start -c
   ```

3. **Try web vs mobile:**
   - If web works but mobile doesn't → Mobile-specific issue
   - If mobile works but web doesn't → Web build issue
   - If both blank → App code issue

## 📋 Debugging Checklist

Run through this checklist:

- [ ] Open browser console (F12)
- [ ] Look for "Firebase Config:" log
- [ ] Check if values are "undefined"
- [ ] Try test version (App-test.js)
- [ ] Verify .env file exists in project root
- [ ] Try hardcoded Firebase config
- [ ] Check for red errors in console
- [ ] Try clearing cache (npx expo start -c)
- [ ] Check mobile console (if using phone)

## 🎯 Quick Tests

### Test 1: Verify .env File
```bash
cat .env | head -5
# Should show: EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
```

### Test 2: Verify App.js exists
```bash
cat App.js | head -10
# Should show imports and App function
```

### Test 3: Check for syntax errors
```bash
node -c App.js
# No output = no syntax errors
```

## 💡 Most Likely Solution

**90% of blank screens are caused by environment variables not loading.**

**Quick fix:**
1. Temporarily hardcode Firebase config in `src/config/firebase.js`
2. Reload app
3. If it works → Fix environment variable loading
4. If still blank → Check browser console for actual error

## 📞 What to Report

If still having issues, provide:

1. **Browser console output** (copy all red errors)
2. **What "Firebase Config:" shows** (from console.log)
3. **Mobile or web?**
4. **Does test version work?** (App-test.js)
5. **Output of:** `cat .env | grep API_KEY`

---

**Try these steps and let me know what you see in the browser console!**
