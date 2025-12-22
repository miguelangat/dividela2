# 📚 Documentation Index

Complete guide to all Android build and proxy configuration files.

---

## 🎯 Start Here

**New to Android builds?**
1. Read: [`QUICK_START_ANDROID.md`](./QUICK_START_ANDROID.md) - 5 minute quick start
2. Use: `./build-android.sh` - Interactive build script
3. Reference: [`BUILD_CHECKLIST.md`](./BUILD_CHECKLIST.md) - Step-by-step checklist

**Having proxy issues?**
1. Read: [`NPM_PROXY_CONFIG.md`](./NPM_PROXY_CONFIG.md) - How it works
2. Read: [`PROXY_TROUBLESHOOTING.md`](./PROXY_TROUBLESHOOTING.md) - Fix problems
3. Use: `./toggle-proxy.sh off` - Quick disable

---

## 📁 Files Created

### Configuration Files

| File | Purpose | Usage |
|------|---------|-------|
| `.npmrc` | NPM proxy configuration | Automatically used by npm |
| `eas.json` | EAS build profiles | Automatically used by EAS |
| `.gitignore` | Git ignore rules | Automatically used by Git |

### Build Scripts

| File | Platform | Purpose |
|------|----------|---------|
| `build-android.sh` | macOS/Linux | Interactive build menu |
| `build-android.bat` | Windows | Interactive build menu |
| `toggle-proxy.sh` | macOS/Linux | Toggle proxy on/off |
| `toggle-proxy.bat` | Windows | Toggle proxy on/off |

### Documentation

| File | Purpose | When to Read |
|------|---------|--------------|
| `QUICK_START_ANDROID.md` | Quick reference | Start here! |
| `BUILD_ANDROID.md` | Complete build guide | Need detailed instructions |
| `BUILD_CHECKLIST.md` | Step-by-step checklist | Building for first time |
| `NPM_PROXY_CONFIG.md` | Proxy documentation | Understanding proxy setup |
| `PROXY_TROUBLESHOOTING.md` | Proxy troubleshooting | npm install fails |
| `SETUP_SUMMARY.md` | Complete overview | Big picture view |
| `INDEX.md` | This file | Finding documentation |

---

## 🎯 Common Tasks

### Task: Build APK for Testing
```bash
# Quick way
./build-android.sh
# Choose option 1

# Or direct command
eas build --platform android --profile preview
```
📖 **Docs**: `QUICK_START_ANDROID.md`, `BUILD_ANDROID.md`

### Task: Install Dependencies
```bash
# If proxy is running
npm install

# If proxy is down
npm install --no-proxy

# Toggle proxy
./toggle-proxy.sh off
npm install
./toggle-proxy.sh on
```
📖 **Docs**: `NPM_PROXY_CONFIG.md`

### Task: Fix Proxy Issues
```bash
# Check status
./toggle-proxy.sh status

# Disable temporarily
./toggle-proxy.sh off

# Re-enable
./toggle-proxy.sh on
```
📖 **Docs**: `PROXY_TROUBLESHOOTING.md`

### Task: Check Build Status
```bash
eas build:list
```
📖 **Docs**: `BUILD_ANDROID.md`

### Task: Test Locally
```bash
npx expo start
```
📖 **Docs**: `QUICK_START_ANDROID.md`

---

## 🔍 Find Information

### "How do I build an Android APK?"
→ [`QUICK_START_ANDROID.md`](./QUICK_START_ANDROID.md) (quick)  
→ [`BUILD_ANDROID.md`](./BUILD_ANDROID.md) (detailed)  
→ [`BUILD_CHECKLIST.md`](./BUILD_CHECKLIST.md) (step-by-step)

### "npm install is failing!"
→ [`PROXY_TROUBLESHOOTING.md`](./PROXY_TROUBLESHOOTING.md)  
→ Solution: `npm install --no-proxy`

### "How does the proxy work?"
→ [`NPM_PROXY_CONFIG.md`](./NPM_PROXY_CONFIG.md)

### "What's the fastest way to test?"
→ [`QUICK_START_ANDROID.md`](./QUICK_START_ANDROID.md)  
→ Command: `npx expo start`

### "Where are all my APK options?"
→ [`BUILD_ANDROID.md`](./BUILD_ANDROID.md) - Method comparison

### "Something isn't working!"
→ [`BUILD_CHECKLIST.md`](./BUILD_CHECKLIST.md) - Troubleshooting section  
→ [`PROXY_TROUBLESHOOTING.md`](./PROXY_TROUBLESHOOTING.md) - Proxy issues

### "What did this setup do?"
→ [`SETUP_SUMMARY.md`](./SETUP_SUMMARY.md)

---

## 📊 File Dependency Tree

```
Your Expo Project
│
├── Configuration (auto-used)
│   ├── .npmrc              → Sets proxy for npm
│   ├── eas.json            → Sets build profiles
│   └── .gitignore          → Git ignore rules
│
├── Build Tools
│   ├── build-android.sh    → Run to build (macOS/Linux)
│   ├── build-android.bat   → Run to build (Windows)
│   ├── toggle-proxy.sh     → Toggle proxy (macOS/Linux)
│   └── toggle-proxy.bat    → Toggle proxy (Windows)
│
└── Documentation
    ├── INDEX.md            → This file (you are here)
    ├── SETUP_SUMMARY.md    → Overview of everything
    ├── QUICK_START_ANDROID.md → Quick reference
    ├── BUILD_ANDROID.md    → Complete build guide
    ├── BUILD_CHECKLIST.md  → Step-by-step checklist
    ├── NPM_PROXY_CONFIG.md → Proxy documentation
    └── PROXY_TROUBLESHOOTING.md → Fix proxy issues
```

---

## 🎓 Learning Path

### Beginner (Just want to build)
1. Read: `QUICK_START_ANDROID.md` (5 min)
2. Run: `./build-android.sh` and choose option 1
3. Wait ~20 minutes, download APK, install

### Intermediate (Want to understand)
1. Read: `SETUP_SUMMARY.md` (10 min)
2. Read: `BUILD_ANDROID.md` (15 min)
3. Read: `NPM_PROXY_CONFIG.md` (10 min)
4. Experiment with different build profiles

### Advanced (Want full control)
1. Read all documentation files
2. Try local builds with Android Studio
3. Customize `eas.json` profiles
4. Configure CI/CD pipelines

---

## 🆘 Troubleshooting Quick Links

### Error: "ECONNREFUSED"
→ [`PROXY_TROUBLESHOOTING.md`](./PROXY_TROUBLESHOOTING.md#issue-1-econnrefused)  
→ Quick fix: `./toggle-proxy.sh off`

### Error: "eas: command not found"
→ [`BUILD_ANDROID.md`](./BUILD_ANDROID.md#prerequisites)  
→ Quick fix: `npm install -g eas-cli`

### Error: "Expo Go can't run this app"
→ [`BUILD_ANDROID.md`](./BUILD_ANDROID.md#method-1-eas-build-cloud-build---easiest-)  
→ Quick fix: Build APK with EAS instead

### Error: Build fails with Firebase error
→ [`BUILD_CHECKLIST.md`](./BUILD_CHECKLIST.md#4-firebase-configuration)  
→ Quick fix: Check `.env` file has all `EXPO_PUBLIC_*` variables

### Error: APK won't install
→ [`BUILD_CHECKLIST.md`](./BUILD_CHECKLIST.md#if-apk-wont-install)  
→ Quick fix: Enable "Install from Unknown Sources"

---

## 🚀 Commands Cheat Sheet

```bash
# Build commands
eas build --platform android --profile preview
eas build --platform android --profile production
./build-android.sh  # Interactive menu

# Proxy commands
./toggle-proxy.sh status
./toggle-proxy.sh on
./toggle-proxy.sh off

# Development commands
npm install
npm install --no-proxy
npx expo start
npx expo start -c  # Clear cache

# Status commands
eas build:list
eas whoami
npm config list
```

---

## 📞 External Resources

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **Firebase Setup**: https://firebase.google.com/docs
- **React Native**: https://reactnative.dev
- **Expo Forums**: https://forums.expo.dev

---

## ✅ Quick Health Check

Run these commands to verify setup:

```bash
# Check Node
node --version  # Should be v16+

# Check npm
npm --version

# Check Expo CLI
npx expo --version

# Check EAS CLI
eas --version

# Check proxy status
./toggle-proxy.sh status

# Check dependencies
npm list --depth=0

# Check project
npx expo-doctor
```

---

## 🎯 Next Actions

**Ready to build?**
1. ✅ Make scripts executable: `chmod +x build-android.sh toggle-proxy.sh`
2. ✅ Read quick start: `QUICK_START_ANDROID.md`
3. ✅ Run build: `./build-android.sh`
4. ✅ Follow checklist: `BUILD_CHECKLIST.md`

**Need help?**
- Start with relevant doc from the index above
- Check troubleshooting sections
- Run health check commands

---

**You're all set! 🎉**

Everything you need is documented above. Start with `QUICK_START_ANDROID.md` and you'll have an APK in about 30 minutes!
