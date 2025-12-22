# Building Dividela for Android

## Prerequisites

### Required Software
1. **Node.js** (v16 or later)
2. **npm** or **yarn**
3. **Expo CLI**: `npm install -g expo-cli`
4. **EAS CLI**: `npm install -g eas-cli` (for cloud builds)

### For Local Builds (Optional)
5. **Android Studio** with Android SDK
6. **Java Development Kit (JDK)** 11 or 17

## Method 1: EAS Build (Cloud Build - Easiest) ⭐

This method builds your app in the cloud without needing Android Studio.

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Configure EAS
```bash
# Login to Expo account (create free account if needed)
eas login

# Configure the project
eas build:configure
```

### Step 3: Build APK (for testing/distribution)
```bash
# Build a preview APK you can install directly
eas build --platform android --profile preview

# Or build production APK
eas build --platform android --profile production
```

### Step 4: Download and Install
After the build completes (~10-20 minutes):
1. You'll get a download link in the terminal
2. Download the APK to your Android device
3. Install it (enable "Install from Unknown Sources" if needed)

## Method 2: Local Development Build

For testing during development with Expo Go:

### Step 1: Start Development Server
```bash
# Clear cache and start
npx expo start -c

# Or specifically for Android
npx expo start --android
```

### Step 2: Test on Device
- Install **Expo Go** from Google Play Store
- Scan QR code from terminal
- App runs in Expo Go environment

## Method 3: Standalone APK (Local Build)

If you want to build locally without EAS:

### Step 1: Install Android Studio
1. Download from https://developer.android.com/studio
2. Install Android SDK (API 33 recommended)
3. Set environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### Step 2: Prebuild Native Project
```bash
# This creates android/ directory with native code
npx expo prebuild --platform android
```

### Step 3: Build APK Locally
```bash
cd android

# Debug build
./gradlew assembleDebug

# Release build (requires signing)
./gradlew assembleRelease
```

APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

## NPM Proxy Configuration

The project is configured to use `http://localhost:8081` as proxy.

### If Proxy Issues Occur:
```bash
# Temporarily disable proxy for Expo commands
npm config set proxy null
npm config set https-proxy null

# Or use npm flag
npm install --no-proxy
```

## Build Configurations

### Preview Build (for testing)
- Builds APK file
- Can be installed directly on devices
- Good for beta testing
- Command: `eas build --platform android --profile preview`

### Production Build
- Builds APK or AAB (Android App Bundle)
- Optimized and minified
- Ready for Play Store submission
- Command: `eas build --platform android --profile production`

### Development Build
- Includes dev tools
- Larger file size
- For internal testing
- Command: `eas build --platform android --profile development`

## Common Build Commands

```bash
# Install dependencies with proxy
npm install

# Clear Expo cache
npx expo start -c

# Check for issues
npx expo-doctor

# Build preview APK (recommended for testing)
eas build --platform android --profile preview

# Build production
eas build --platform android --profile production

# Build for both platforms
eas build --platform all

# Check build status
eas build:list

# Submit to Play Store (after production build)
eas submit --platform android
```

## Troubleshooting

### Issue: npm proxy errors
**Solution**: 
```bash
# Edit .npmrc to disable proxy temporarily
npm config set proxy null --userconfig .npmrc
```

### Issue: Build fails with "JAVA_HOME not set"
**Solution**: 
```bash
# On macOS/Linux
export JAVA_HOME=/path/to/jdk

# On Windows
set JAVA_HOME=C:\Program Files\Java\jdk-17
```

### Issue: "Expo Go can't run this app"
**Solution**: Your app uses custom native code. Use EAS Build or local build instead.

### Issue: Gradle build fails
**Solution**: 
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### Issue: Firebase not working in built app
**Solution**: Make sure you:
1. Have google-services.json in android/app/ folder (if using local build)
2. Firebase config is in .env file with EXPO_PUBLIC_ prefix
3. Firebase hosting is properly configured

## Recommended Workflow

### For Development & Testing
1. Use **Expo Go** for rapid testing during development
2. Use **EAS Build (preview)** when you need to test on real devices

### For Production Release
1. Use **EAS Build (production)** with AAB format
2. Submit to Google Play Store via `eas submit`

## Firebase Configuration for Production

Make sure your `.env` file has all Firebase credentials:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Quick Start (Recommended)

If you just want to test the app on your Android device:

```bash
# 1. Install dependencies
npm install

# 2. Install EAS CLI
npm install -g eas-cli

# 3. Login to Expo
eas login

# 4. Build preview APK
eas build --platform android --profile preview

# 5. Download and install the APK on your device
```

This will give you a working APK in about 15-20 minutes! 🚀

---

**Need Help?**
- Expo docs: https://docs.expo.dev/build/setup/
- EAS Build docs: https://docs.expo.dev/build/introduction/
- Firebase setup: https://docs.expo.dev/guides/using-firebase/
