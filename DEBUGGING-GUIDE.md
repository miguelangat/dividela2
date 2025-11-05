# Dividela - Debugging & Running Guide

## 🐛 Issue Encountered

When running `npm start` in the server environment, Metro Bundler gets stuck at "Waiting on http://localhost:8081". This is expected in a headless/server environment where the Expo Dev Tools UI can't open.

## ✅ Fixed Issues

1. **app.json Plugin Error** - FIXED ✓
   - Removed `expo-build-properties` plugin that wasn't installed
   - App configuration is now valid

2. **Firebase Configuration** - VERIFIED ✓
   - All credentials properly set in `.env`
   - Firebase services enabled (Auth + Firestore)

## 🚀 How to Run the App (On Your Local Machine)

### Prerequisites
- Expo Go app installed on your phone
  - iOS: Download from App Store
  - Android: Download from Google Play

### Steps to Run

1. **Open Terminal** in the project directory:
   ```bash
   cd /home/mg/dividela2
   ```

2. **Start Expo**:
   ```bash
   npm start
   ```

3. **Wait for QR Code** to appear (should take 30-60 seconds)

4. **Scan QR Code**:
   - **iOS**: Open Camera app → Point at QR code → Tap notification
   - **Android**: Open Expo Go app → Tap "Scan QR code"

5. **App should load** on your phone!

### Alternative: Run on Specific Platform

```bash
# For Android
npm run android

# For iOS
npm run ios

# With cleared cache (if issues)
npx expo start -c
```

---

## 🔍 Common Issues & Solutions

### Issue 1: "Bundler cache is empty"
**Solution**: This is normal on first run. Wait 1-2 minutes for cache to build.

###  Issue 2: Package Version Warnings
```
The following packages should be updated for best compatibility...
```

**These are just warnings - the app should still work.**

To fix (optional):
```bash
npx expo install --fix
```

This will update packages to compatible versions.

### Issue 3: "Cannot connect to Metro"
**Solutions**:
1. Make sure you're on the same WiFi network (phone + computer)
2. Try tunnel mode: `npx expo start --tunnel`
3. Clear cache: `npx expo start -c`

### Issue 4: "Firebase Error" / "Invalid API Key"
**Solution**:
1. Verify `.env` file has correct credentials
2. Restart Expo: `Ctrl+C` then `npm start`
3. Clear cache: `npx expo start -c`

### Issue 5: Red Screen Errors on Phone

**Common Errors & Fixes:**

#### "Unable to resolve module..."
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start -c
```

#### "process.env.EXPO_PUBLIC_... is undefined"
- Check `.env` file exists in project root
- Verify variables start with `EXPO_PUBLIC_`
- Restart Expo server

#### "Firebase: Error (auth/...)..."
- Verify Firebase Auth is enabled in Console
- Check internet connection
- Verify API key is correct

---

## 📋 Debugging Checklist

Before running, verify:

- [  ] `.env` file exists with Firebase credentials
- [ ] Firebase Authentication enabled (Email/Password)
- [ ] Firestore database created
- [ ] `node_modules` installed (`npm install`)
- [ ] Expo Go app installed on phone
- [ ] Phone and computer on same WiFi
- [ ] No other Metro bundler running (check other terminals)

---

## 🧪 Testing the App

### Test Flow 1: Sign Up
1. Open app → See Welcome screen
2. Tap "Get Started"
3. Fill in:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
   - Check terms box
4. Tap "Create Account"
5. Should see Connect screen
6. Check Firebase Console → See new user in Authentication

### Test Flow 2: Sign In
1. If already signed up, sign out first
2. From Welcome screen, tap "Sign in"
3. Enter email and password
4. Tap "Sign In"
5. Should navigate to Connect screen

### Test Flow 3: Validation
1. Try signing up with:
   - Invalid email (e.g., "notanemail")
   - Short password (e.g., "123")
   - Empty name
2. Should see error messages

---

## 🔧 Advanced Debugging

### View Metro Bundler Logs
The terminal where you ran `npm start` will show:
- Bundle progress
- Errors in red
- Warnings in yellow
- Successfully bundled files

### View Phone Logs

**iOS**:
```bash
# In another terminal
npx react-native log-ios
```

**Android**:
```bash
# In another terminal
npx react-native log-android
```

### Check Metro Status
```bash
# See if Metro is running
curl http://localhost:8081/status

# Should return: "packager-status:running"
```

### Clear All Caches
```bash
# Nuclear option - clears everything
rm -rf node_modules
rm -rf .expo
npm install
npx expo start -c
```

---

## 📱 Expected Screens

### 1. Welcome Screen
- Logo (💑)
- "Dividela" title
- "Get Started" button (purple)
- "Sign in" link

### 2. Sign Up Screen
- Name input
- Email input
- Password input (with hide/show)
- Terms checkbox
- "Create Account" button
- Social login buttons (Apple, Google)

### 3. Sign In Screen
- Email input
- Password input
- "Forgot password?" link
- "Sign In" button
- Social login buttons

### 4. Connect Screen
- Two cards:
  - "Invite Partner" (purple card)
  - "Join Partner" (white card)

---

## 🐛 Known Limitations

1. **Social Login** - Buttons visible but not functional yet
2. **Forgot Password** - Link visible but not functional yet
3. **Connect Screen** - Buttons don't navigate yet (need to build Invite/Join screens)
4. **No Main App** - After Connect screen, nowhere to go yet

---

## 📊 Health Check Commands

Run these to verify everything is set up:

```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# Check Expo CLI
npx expo --version

# Check if Firebase credentials loaded
cat .env | grep EXPO_PUBLIC_FIREBASE_API_KEY

# Check if project compiles (won't run, just checks syntax)
npx expo export --platform android --dev

# Run Expo Doctor to check for issues
npx expo-doctor
```

---

## 💡 Pro Tips

### Faster Development
```bash
# Start in LAN mode (faster)
npx expo start --lan

# Start in offline mode (if no internet)
npx expo start --offline

# Enable fast refresh
npx expo start --dev-client
```

### If You Make Code Changes
- Most changes: Auto-reload (shake phone → "Reload")
- .env changes: Must restart Expo
- package.json changes: Must restart Expo
- New files: Auto-detected, should work

### Keyboard Shortcuts (in Terminal)
- `r` - Reload app
- `m` - Toggle menu on device
- `j` - Open debugger
- `c` - Clear terminal
- `?` - Show all commands

---

## 🆘 Still Having Issues?

### Check These Files Exist:
```bash
ls -la | grep -E "App.js|package.json|app.json|.env"
ls -la src/config/firebase.js
ls -la src/screens/auth/WelcomeScreen.js
```

### Verify Firebase Config:
```bash
# Should show your actual API key (not "TODO...")
cat .env | grep API_KEY
```

### Test Firebase Connection (Manual):
Open `src/config/firebase.js` and temporarily add at the bottom:
```javascript
console.log('Firebase Config:', firebaseConfig);
```

Then check Expo logs to see if config loaded.

---

## ✅ Success Indicators

You'll know it's working when:

1. **Terminal shows**:
   ```
   Metro waiting on exp://192.168.x.x:8081
   › Press s │ switch to Expo Go
   ```

2. **QR Code appears** in terminal

3. **Phone loads** and shows Welcome screen

4. **Can sign up** and see user in Firebase Console

---

## 📞 Next Steps After Success

Once the app runs successfully:

1. Test sign up → Create account
2. Test sign in → Log in
3. Check Firebase Console → Verify user exists
4. Continue building → Next screens (Invite, Join, Success)

---

**Ready to try? Run `npm start` in your terminal!** 🚀
