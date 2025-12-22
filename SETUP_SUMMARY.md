# 📱 Android Build & Proxy Setup - Summary

Complete setup for building Dividela on Android with local npm proxy configuration.

---

## ✅ What's Been Configured

### 1. NPM Proxy Configuration
- **File**: `.npmrc`
- **Proxy**: `http://localhost:8081`
- **Scope**: Project-local (doesn't affect global npm settings)
- **Features**: HTTP, HTTPS proxy with SSL verification disabled

### 2. EAS Build Configuration
- **File**: `eas.json`
- **Profiles**: development, preview, production
- **Output**: APK files (easy to install on devices)

### 3. Helper Scripts Created
- `build-android.sh` (macOS/Linux) - Interactive build menu
- `build-android.bat` (Windows) - Interactive build menu
- `toggle-proxy.sh` (macOS/Linux) - Quick proxy toggle
- `toggle-proxy.bat` (Windows) - Quick proxy toggle

### 4. Documentation
- `BUILD_ANDROID.md` - Complete Android build guide
- `NPM_PROXY_CONFIG.md` - Proxy configuration reference
- `PROXY_TROUBLESHOOTING.md` - Troubleshooting guide
- `QUICK_START_ANDROID.md` - Quick reference card

---

## 🚀 Quick Start Commands

### Build Android APK (Easiest)
```bash
# 1. Install dependencies
npm install

# 2. Install EAS CLI
npm install -g eas-cli

# 3. Login
eas login

# 4. Build
eas build --platform android --profile preview

# OR use the interactive script
./build-android.sh  # macOS/Linux
build-android.bat   # Windows
```

### Manage Proxy
```bash
# Check proxy status
./toggle-proxy.sh status

# Enable proxy
./toggle-proxy.sh on

# Disable proxy
./toggle-proxy.sh off

# Install without proxy (one-time)
npm install --no-proxy
```

---

## 📋 Build Profiles

### Preview (Recommended for Testing)
```bash
eas build --platform android --profile preview
```
- Output: APK file
- Easy to install on any device
- Good for beta testing
- Build time: ~15-20 minutes

### Production
```bash
eas build --platform android --profile production
```
- Output: APK or AAB
- Optimized and minified
- Ready for Play Store
- Build time: ~15-20 minutes

### Development
```bash
eas build --platform android --profile development
```
- Includes development tools
- Larger file size
- For internal testing

---

## 🔧 Proxy Management

### Your Proxy Setup
- **URL**: `http://localhost:8081`
- **Config File**: `.npmrc` (in project root)
- **Affects**: Only this project's npm commands

### Common Scenarios

#### Scenario 1: Proxy is running
```bash
npm install  # Works with proxy
```

#### Scenario 2: Proxy is down
```bash
npm install --no-proxy  # Bypass proxy
```

#### Scenario 3: Using Expo (may not work with proxy)
```bash
./toggle-proxy.sh off
npx expo start
./toggle-proxy.sh on
```

#### Scenario 4: Check what's configured
```bash
npm config list
```

---

## 📱 Installation Methods

### Method 1: EAS Build → APK → Install (Best)
1. Run `eas build --platform android --profile preview`
2. Wait for build to complete (~15-20 min)
3. Download APK from link in terminal
4. Transfer APK to Android device
5. Enable "Install from Unknown Sources" in Android settings
6. Install APK

### Method 2: Expo Go (Quick Testing Only)
1. Install Expo Go from Play Store
2. Run `npx expo start`
3. Scan QR code
4. ⚠️ May not work if app has custom native code

### Method 3: Local Build (Advanced)
1. Install Android Studio + SDK
2. Run `npx expo prebuild --platform android`
3. Run `cd android && ./gradlew assembleDebug`
4. APK: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🐛 Common Issues

### Issue: npm install fails with ECONNREFUSED
**Solution**: Proxy server is not running
```bash
npm install --no-proxy
```

### Issue: Expo commands hang
**Solution**: Disable proxy temporarily
```bash
./toggle-proxy.sh off
npx expo start
```

### Issue: EAS build fails with proxy error
**Solution**: EAS builds in cloud, ignores local proxy (this is normal)
```bash
# Just run the build, it should work
eas build --platform android --profile preview
```

### Issue: eas command not found
**Solution**: Install EAS CLI
```bash
npm install -g eas-cli
```

### Issue: Firebase not working in built app
**Solution**: Check `.env` file has all Firebase variables with `EXPO_PUBLIC_` prefix

---

## 📁 File Structure

```
dividela/
├── .npmrc                          # ✅ NPM proxy config (new)
├── eas.json                        # ✅ EAS build config (new)
├── build-android.sh                # ✅ Build script for macOS/Linux (new)
├── build-android.bat               # ✅ Build script for Windows (new)
├── toggle-proxy.sh                 # ✅ Proxy toggle for macOS/Linux (new)
├── toggle-proxy.bat                # ✅ Proxy toggle for Windows (new)
├── BUILD_ANDROID.md                # ✅ Full build guide (new)
├── NPM_PROXY_CONFIG.md             # ✅ Proxy documentation (new)
├── PROXY_TROUBLESHOOTING.md        # ✅ Troubleshooting guide (new)
├── QUICK_START_ANDROID.md          # ✅ Quick reference (new)
├── package.json
├── App.js
├── src/
│   ├── screens/
│   ├── components/
│   ├── config/
│   │   └── firebase.js
│   └── ...
└── .env                            # Don't forget Firebase config!
```

---

## ✨ Next Steps

1. **Make build scripts executable** (macOS/Linux only):
   ```bash
   chmod +x build-android.sh toggle-proxy.sh
   ```

2. **Ensure Firebase is configured**:
   - Check `.env` has all Firebase credentials
   - All variables should start with `EXPO_PUBLIC_`

3. **Test your proxy**:
   ```bash
   # Check if proxy server is running
   curl http://localhost:8081
   
   # Or toggle it off if not needed
   ./toggle-proxy.sh off
   ```

4. **Build your first APK**:
   ```bash
   # Interactive menu (easiest)
   ./build-android.sh
   
   # Or direct command
   eas build --platform android --profile preview
   ```

5. **Install on your device**:
   - Download APK when build completes
   - Transfer to Android phone
   - Install and test!

---

## 📚 Documentation Reference

| File | Purpose |
|------|---------|
| `QUICK_START_ANDROID.md` | Start here! Quick commands and common tasks |
| `BUILD_ANDROID.md` | Complete guide to all build methods |
| `NPM_PROXY_CONFIG.md` | How the proxy works and configuration |
| `PROXY_TROUBLESHOOTING.md` | Solutions to common proxy issues |

---

## 💡 Tips

- **First time building?** Use the interactive script: `./build-android.sh`
- **Proxy causing issues?** Toggle it off: `./toggle-proxy.sh off`
- **Want to test quickly?** Use Expo Go: `npx expo start`
- **Need production build?** Use profile: `--profile production`
- **Check build progress**: Run `eas build:list`

---

## 🎯 Recommended Workflow

### For Development
```bash
./toggle-proxy.sh on              # Enable proxy if needed
npm install                       # Install dependencies
./toggle-proxy.sh off             # Disable for Expo
npx expo start                    # Test with Expo Go
```

### For Testing on Real Device
```bash
npm install                       # Install dependencies
eas build -p android --profile preview  # Build APK
# Wait ~15-20 minutes, download and install
```

### For Production Release
```bash
eas build -p android --profile production  # Build for Play Store
eas submit -p android             # Submit to Play Store
```

---

## 🆘 Need Help?

1. **Proxy issues**: Read `PROXY_TROUBLESHOOTING.md`
2. **Build issues**: Read `BUILD_ANDROID.md`
3. **Quick reference**: Read `QUICK_START_ANDROID.md`
4. **Expo docs**: https://docs.expo.dev
5. **EAS Build docs**: https://docs.expo.dev/build/introduction/

---

## ⚡ TL;DR

```bash
# Make scripts executable (macOS/Linux)
chmod +x build-android.sh toggle-proxy.sh

# Build APK
./build-android.sh
# Choose option 1 (Preview APK)

# If proxy causes issues
./toggle-proxy.sh off
```

**Done! Your Android build and proxy setup is complete.** 🎉

---

**Questions?**
- All documentation files are in the project root
- Start with `QUICK_START_ANDROID.md` for common tasks
- Check `PROXY_TROUBLESHOOTING.md` if npm install fails
