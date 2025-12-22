# 🎯 Android Build Checklist

Use this checklist to ensure everything is set up correctly for building your Android APK.

---

## ✅ Pre-Build Checklist

### 1. Environment Setup
- [ ] Node.js is installed (v16 or later)
- [ ] npm or yarn is installed
- [ ] Internet connection is available (for EAS build)

### 2. Project Setup
- [ ] `.npmrc` file exists in project root
- [ ] Proxy server is running at `http://localhost:8081` (if needed)
  ```bash
  # Test proxy
  curl http://localhost:8081
  ```
- [ ] Or proxy is disabled if not needed:
  ```bash
  ./toggle-proxy.sh off
  ```

### 3. Dependencies
- [ ] Dependencies are installed:
  ```bash
  npm install
  # Or if proxy is causing issues:
  npm install --no-proxy
  ```
- [ ] No errors during installation

### 4. Firebase Configuration
- [ ] `.env` file exists
- [ ] All Firebase variables are set with `EXPO_PUBLIC_` prefix:
  - [ ] `EXPO_PUBLIC_FIREBASE_API_KEY`
  - [ ] `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - [ ] `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - [ ] `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - [ ] `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `EXPO_PUBLIC_FIREBASE_APP_ID`

### 5. EAS Setup
- [ ] EAS CLI is installed:
  ```bash
  npm install -g eas-cli
  ```
- [ ] Logged into Expo account:
  ```bash
  eas login
  ```
  (Create free account at expo.dev if needed)
- [ ] `eas.json` file exists in project root

### 6. Build Configuration
- [ ] Choose build profile:
  - [ ] **Preview** - For testing (recommended)
  - [ ] **Production** - For Play Store release
  - [ ] **Development** - For internal development

---

## 🚀 Build Steps

### Option A: Using Interactive Script (Easiest)
```bash
# macOS/Linux
chmod +x build-android.sh
./build-android.sh

# Windows
build-android.bat
```
- [ ] Script launched successfully
- [ ] Selected build type (option 1 for Preview recommended)
- [ ] Build started successfully

### Option B: Direct Command
```bash
# For testing
eas build --platform android --profile preview

# For production
eas build --platform android --profile production
```
- [ ] Command executed without errors
- [ ] Build queue message appeared
- [ ] Build URL provided

---

## ⏳ During Build

- [ ] Build is in queue (check status: `eas build:list`)
- [ ] Build started (typically within a few minutes)
- [ ] Build is running (~15-20 minutes)
- [ ] No errors in build logs
- [ ] Build completed successfully ✅

---

## 📥 After Build

### Download APK
- [ ] Download link provided in terminal
- [ ] APK file downloaded
- [ ] File size looks reasonable (typically 20-50 MB)

### Transfer to Android Device
- [ ] APK transferred to device via:
  - [ ] USB cable
  - [ ] Email
  - [ ] Cloud storage
  - [ ] Direct download on device

### Installation
- [ ] "Install from Unknown Sources" enabled in Android settings
- [ ] APK installation started
- [ ] No security warnings (or warnings accepted)
- [ ] App installed successfully

### Testing
- [ ] App icon appears on device
- [ ] App launches without crashing
- [ ] Firebase connection works
- [ ] Can create account / sign in
- [ ] Can add expenses
- [ ] All features work as expected

---

## 🐛 Troubleshooting Checklist

### If npm install fails:
- [ ] Proxy server is running: `curl http://localhost:8081`
- [ ] Or disable proxy: `./toggle-proxy.sh off`
- [ ] Or use: `npm install --no-proxy`
- [ ] Clear cache: `npm cache clean --force`
- [ ] Try again

### If EAS login fails:
- [ ] Internet connection is working
- [ ] Created Expo account at expo.dev
- [ ] Using correct email/password
- [ ] Try: `eas logout` then `eas login` again

### If EAS build fails:
- [ ] Check error message in terminal
- [ ] View logs: `eas build:list` then click on build
- [ ] Verify `eas.json` is correct
- [ ] Verify `package.json` has no errors
- [ ] Check Firebase config in `.env`
- [ ] Try again: `eas build --platform android --profile preview`

### If APK won't install:
- [ ] File downloaded completely (check file size)
- [ ] "Install from Unknown Sources" is enabled
- [ ] Uninstall previous version if exists
- [ ] Android version is compatible (check minimum SDK version)
- [ ] Storage space available on device

### If app crashes on launch:
- [ ] Firebase credentials are correct in `.env`
- [ ] All required permissions are granted
- [ ] Check device logs via `adb logcat` if available
- [ ] Try clean rebuild: `eas build --platform android --profile preview --clear-cache`

---

## 📝 Notes

### Build Time
- First build: 15-25 minutes
- Subsequent builds: 10-20 minutes
- Builds with cache: 5-15 minutes

### Build Size
- Debug/Preview: 30-60 MB
- Production: 20-40 MB (optimized)

### Expo Account
- Free tier: Unlimited builds
- No credit card required
- Can build for both iOS and Android

### Proxy
- Only affects local `npm install`
- Does NOT affect EAS cloud builds
- Toggle on/off as needed

---

## 🎉 Success Criteria

Your build is successful when:
- ✅ APK downloads successfully
- ✅ APK installs on Android device
- ✅ App launches without errors
- ✅ Firebase authentication works
- ✅ Can add and view expenses
- ✅ All features work as expected

---

## 📞 Support Resources

| Issue | Resource |
|-------|----------|
| npm/proxy issues | `PROXY_TROUBLESHOOTING.md` |
| Build issues | `BUILD_ANDROID.md` |
| Quick commands | `QUICK_START_ANDROID.md` |
| General setup | `SETUP_SUMMARY.md` |
| Expo issues | https://docs.expo.dev |
| Firebase issues | https://firebase.google.com/docs |

---

## 🔄 Rebuild Checklist

When you need to build again (after code changes):

- [ ] Code changes committed
- [ ] Dependencies updated if needed: `npm install`
- [ ] Test locally first: `npx expo start`
- [ ] Build new version: `eas build --platform android --profile preview`
- [ ] Download new APK
- [ ] Uninstall old version from device
- [ ] Install new version
- [ ] Test changes

---

## 💡 Pro Tips

1. **First build?** Use Preview profile for testing
2. **Save build URL** from terminal for later download
3. **Test on Expo Go first** before building APK
4. **Enable auto-updates** for faster iteration
5. **Use version numbers** in package.json to track builds
6. **Keep build logs** for troubleshooting

---

**Ready to build?** Start at the top and check off each item! 🚀
