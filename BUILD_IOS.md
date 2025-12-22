# 🍎 Building Dividela for iOS

Complete guide to building and testing your iOS app with simulator and device.

---

## Prerequisites

### Required (All Methods)
- **macOS** (required for iOS development)
- **Xcode** (latest version recommended)
  - Download from Mac App Store
  - Or: https://developer.apple.com/xcode/
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```
- **Node.js** (v16 or later)
- **Expo CLI**

### For Device Builds (Optional)
- **Apple Developer Account** ($99/year for App Store)
- **EAS CLI**: `npm install -g eas-cli`

---

## Method 1: iOS Simulator (Fastest - Recommended for Development) ⭐

This is the easiest way to test your app during development.

### Step 1: Install Xcode
```bash
# Check if Xcode is installed
xcode-select -p

# If not, install from App Store or run:
xcode-select --install
```

### Step 2: Open Simulator
```bash
# Open Xcode
open -a Xcode

# Or open Simulator directly
open -a Simulator
```

### Step 3: Start Expo Dev Server
```bash
# Clear cache and start
npx expo start -c

# Or specifically for iOS
npx expo start --ios
```

### Step 4: Run on Simulator
When the dev server starts, press `i` in terminal or:
```bash
# This will automatically open simulator and install app
npx expo run:ios
```

**That's it!** App will build and run in simulator. 🎉

---

## Method 2: Expo Go (Quick Testing)

Test without building - fastest for rapid iteration.

### Step 1: Install Expo Go on iPhone
- Download **Expo Go** from App Store on your iPhone

### Step 2: Start Development Server
```bash
npx expo start
```

### Step 3: Scan QR Code
- On iPhone, open Camera app
- Scan QR code from terminal
- Tap notification to open in Expo Go

⚠️ **Note**: Expo Go may not work if your app has custom native code.

---

## Method 3: EAS Build (Production/TestFlight)

Build IPA file for TestFlight or App Store submission.

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Configure Build
```bash
# This creates/updates eas.json
eas build:configure
```

### Step 4: Build for iOS
```bash
# Build for simulator (no Apple Developer account needed)
eas build --platform ios --profile development-simulator

# Build for device (TestFlight/App Store)
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

### Step 5: Install on Simulator
```bash
# After build completes, download and install
eas build:run --platform ios --profile development-simulator
```

---

## Method 4: Local Build (Advanced)

Build locally without EAS (requires Xcode).

### Step 1: Prebuild Native Project
```bash
npx expo prebuild --platform ios
```

This creates an `ios/` directory with native Xcode project.

### Step 2: Open in Xcode
```bash
open ios/dividela.xcworkspace
```

### Step 3: Build in Xcode
1. Select target device (simulator or your iPhone)
2. Click ▶️ Run button
3. App builds and launches

### Step 4: Or Build from Terminal
```bash
cd ios
xcodebuild -workspace dividela.xcworkspace \
           -scheme dividela \
           -configuration Debug \
           -destination 'platform=iOS Simulator,name=iPhone 15' \
           -derivedDataPath build
```

---

## Quick Command Reference

### Fastest Development Workflow
```bash
# 1. Start dev server with iOS focus
npx expo start --ios

# 2. Press 'i' to open in simulator
# Or in new terminal:
npx expo run:ios

# 3. Make changes, app hot-reloads automatically
```

### Build Commands
```bash
# Run in simulator (local)
npx expo run:ios

# Run in simulator with specific device
npx expo run:ios --device "iPhone 15 Pro"

# Build for simulator (EAS)
eas build --platform ios --profile development-simulator

# Build for TestFlight
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production
```

### Simulator Management
```bash
# List available simulators
xcrun simctl list devices

# Open Simulator app
open -a Simulator

# Boot specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Install app on running simulator
xcrun simctl install booted path/to/app.app
```

---

## EAS Build Profiles for iOS

Your `eas.json` should include these profiles:

```json
{
  "build": {
    "development-simulator": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  }
}
```

---

## iOS Simulator Testing

### Choose a Simulator
```bash
# List all available simulators
xcrun simctl list devices available

# Common simulators:
# - iPhone 15 Pro
# - iPhone 15
# - iPhone SE (3rd generation)
# - iPad Pro (12.9-inch)
```

### Run on Specific Simulator
```bash
# Method 1: Expo CLI
npx expo run:ios --device "iPhone 15 Pro"

# Method 2: xcrun
xcrun simctl boot "iPhone 15 Pro"
npx expo run:ios
```

### Simulator Tips
- **Shake device**: Ctrl + Cmd + Z (open dev menu)
- **Rotate device**: Cmd + ← or Cmd + →
- **Screenshot**: Cmd + S
- **Home button**: Cmd + Shift + H
- **Lock device**: Cmd + L
- **Reset simulator**: Device → Erase All Content and Settings

---

## Testing on Physical iPhone

### Option A: Development Build (No Developer Account)
```bash
# Connect iPhone via USB
# Enable "Trust This Computer" on iPhone
npx expo run:ios --device
```

This works for development without paid developer account.

### Option B: TestFlight (Requires Developer Account)
```bash
# Build and submit to TestFlight
eas build --platform ios --profile production
eas submit --platform ios

# Share TestFlight link with testers
```

---

## Firebase Configuration for iOS

Ensure your `.env` file has all Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

For local builds, you may also need `GoogleService-Info.plist` in `ios/` folder.

---

## Common Issues & Solutions

### Issue: "xcode-select: error: tool not found"
**Solution**: Install Xcode Command Line Tools
```bash
xcode-select --install
```

### Issue: "Unable to boot simulator"
**Solution**: Reset simulator
```bash
xcrun simctl erase "iPhone 15 Pro"
# Or reset all
xcrun simctl erase all
```

### Issue: "No simulators available"
**Solution**: Open Xcode and install simulators
```
Xcode → Settings → Platforms → iOS → + (add simulators)
```

### Issue: "Bundle identifier is not available"
**Solution**: Change bundle identifier in `app.json`
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.dividela"
    }
  }
}
```

### Issue: "Expo Go says app can't run"
**Solution**: Use local build or EAS build instead
```bash
npx expo run:ios
```

### Issue: Build fails with "Provisioning profile error"
**Solution**: For EAS builds, use simulator profile first
```bash
eas build --platform ios --profile development-simulator
```

### Issue: "Command PhaseScriptExecution failed"
**Solution**: Clear build cache
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx expo run:ios
```

---

## Performance Tips

### Faster Development
```bash
# Use Expo Go for fastest iteration
npx expo start

# Or local build with metro bundler
npx expo run:ios
```

### Faster Builds
```bash
# Use EAS cache
eas build --platform ios --profile preview

# Local builds cache automatically
npx expo run:ios
```

---

## Debugging

### React Native Debugger
```bash
# In simulator, press Cmd + D
# Select "Debug" from menu
```

### Safari Web Inspector
1. Safari → Preferences → Advanced → Show Develop menu
2. Develop → Simulator → JSContext
3. Debug JavaScript in Safari DevTools

### Xcode Console
```bash
# Build and run in Xcode to see native logs
open ios/dividela.xcworkspace
```

### Expo Dev Tools
```bash
npx expo start
# Press 'd' to open dev tools in browser
```

---

## Recommended Workflow

### For Daily Development
```bash
# Start dev server
npx expo start --ios

# Press 'i' to open in simulator
# Make changes, app reloads automatically
```

### For Testing Builds
```bash
# Build for simulator (no Apple account needed)
eas build --platform ios --profile development-simulator

# Install on simulator
eas build:run --platform ios
```

### For Beta Testing
```bash
# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

---

## Build Time Comparison

| Method | Time | Requirements |
|--------|------|--------------|
| Expo Go | Instant | Expo Go app |
| Local Dev (npx expo run:ios) | 2-5 min | Xcode |
| EAS Simulator Build | 10-15 min | EAS account |
| EAS Device Build | 15-20 min | EAS account |
| Local Release Build | 5-10 min | Xcode |

---

## Simulator vs Device

| Feature | Simulator | Device |
|---------|-----------|--------|
| Setup | Easy | Moderate |
| Speed | Fast | Real performance |
| Sensors | Limited | All sensors |
| Touch | Mouse click | Real touch |
| Cost | Free | May need Dev account |
| Testing | Development | Production testing |

**Recommendation**: 
- Use **simulator** for development
- Test on **device** before release

---

## Next Steps

1. **Start simple**: Run in simulator
   ```bash
   npx expo start --ios
   ```

2. **Test thoroughly**: Try different simulators
   ```bash
   npx expo run:ios --device "iPhone SE (3rd generation)"
   ```

3. **Build for testing**: Create development build
   ```bash
   eas build --platform ios --profile development-simulator
   ```

4. **Release**: Build for TestFlight/App Store
   ```bash
   eas build --platform ios --profile production
   ```

---

## Useful Commands Cheat Sheet

```bash
# Quick start
npx expo start --ios              # Start and open simulator

# Simulator control
xcrun simctl list devices         # List simulators
open -a Simulator                 # Open Simulator app
xcrun simctl boot "iPhone 15"     # Boot simulator

# Build commands
npx expo run:ios                  # Local dev build
eas build -p ios --profile preview  # EAS build

# Debugging
cmd + d                           # Dev menu (in simulator)
cmd + z                           # Shake gesture

# Cache clearing
npx expo start -c                 # Clear Expo cache
rm -rf ios/Pods && cd ios && pod install  # Clear iOS cache
```

---

**Ready to test on iOS?** Start with `npx expo start --ios` and you'll be running in simulator in minutes! 📱
