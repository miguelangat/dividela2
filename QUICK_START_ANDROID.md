# Quick Start Guide - Building Android APK

## 🎯 Fastest Way to Build (Recommended)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 3: Login to Expo
```bash
eas login
```
*Create a free account at expo.dev if you don't have one*

### Step 4: Build APK
```bash
# For testing (creates installable APK)
eas build --platform android --profile preview

# Or use the build script
./build-android.sh  # macOS/Linux
build-android.bat   # Windows
```

### Step 5: Install on Device
1. Wait ~15-20 minutes for build to complete
2. Download APK from link provided in terminal
3. Transfer to Android device
4. Install (enable "Install from Unknown Sources" in Android settings)

---

## 🔧 Alternative Methods

### Method A: Test with Expo Go (No Build Required)
```bash
npx expo start
```
Scan QR code with Expo Go app. Good for quick testing but may not work with all native features.

### Method B: Local Build (Requires Android Studio)
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📡 NPM Proxy

Your project uses `http://localhost:8081` as npm proxy (configured in `.npmrc`).

### If Proxy Server is Down:
```bash
# Install without proxy
npm install --no-proxy

# Or disable temporarily
npm config set proxy null --userconfig .npmrc
```

### Re-enable Proxy:
```bash
npm config set proxy http://localhost:8081 --userconfig .npmrc
```

---

## 🐛 Common Issues

### "eas: command not found"
```bash
npm install -g eas-cli
```

### "ECONNREFUSED" during npm install
Your proxy server is not running. Use `npm install --no-proxy`

### "Expo Go can't run this app"
Your app has custom native code. Use EAS Build instead.

### Firebase not working in built app
Check that `.env` file has all `EXPO_PUBLIC_FIREBASE_*` variables set.

---

## 📚 More Info

- **Full build guide**: See `BUILD_ANDROID.md`
- **Proxy config**: See `NPM_PROXY_CONFIG.md`
- **Expo docs**: https://docs.expo.dev/build/setup/

---

## ⚡ Cheat Sheet

```bash
# Install deps with proxy
npm install

# Build for testing
eas build -p android --profile preview

# Build for production
eas build -p android --profile production

# Check build status
eas build:list

# Start dev server
npx expo start

# Clear cache
npx expo start -c

# Check for issues
npx expo-doctor
```

---

**Ready to build?** Run `./build-android.sh` (or `.bat` on Windows) for interactive menu! 🚀
