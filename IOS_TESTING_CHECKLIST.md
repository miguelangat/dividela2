# 🍎 iOS Testing Checklist

Use this checklist for testing Dividela on iOS Simulator and devices.

---

## ✅ Pre-Test Setup

### 1. System Requirements
- [ ] Running macOS (required for iOS development)
- [ ] Xcode installed (check: `xcode-select -p`)
- [ ] Xcode Command Line Tools installed
- [ ] Node.js installed (v16+)

### 2. Xcode Setup
```bash
# Check Xcode installation
xcode-select -p

# If not installed:
xcode-select --install

# Or download Xcode from Mac App Store
```

### 3. Project Setup
- [ ] Dependencies installed: `npm install`
- [ ] Firebase configured in `.env` file
- [ ] All `EXPO_PUBLIC_*` variables set

### 4. Choose Testing Method
- [ ] **iOS Simulator** (easiest, no Apple account needed)
- [ ] **Physical Device** (via USB or TestFlight)
- [ ] **TestFlight** (requires Apple Developer account)

---

## 🚀 Quick Test (Simulator)

### Step-by-Step

#### 1. Start Expo
```bash
npx expo start --ios
```
- [ ] Command executed successfully
- [ ] Metro bundler started
- [ ] No errors in terminal

#### 2. Simulator Opens
- [ ] iOS Simulator app opens automatically
- [ ] iPhone boots up (if not already running)
- [ ] Wait for build to complete (~2-5 min first time)

#### 3. App Installation
- [ ] App builds successfully
- [ ] App icon appears on simulator home screen
- [ ] App launches automatically

#### 4. Initial Tests
- [ ] Welcome screen displays correctly
- [ ] All UI elements are visible
- [ ] Text is readable
- [ ] Colors match design system
- [ ] No console errors

---

## 🧪 Feature Testing

### Authentication Flow
- [ ] Welcome screen loads
- [ ] Can navigate to Sign Up
- [ ] Can enter email and password
- [ ] Form validation works
- [ ] Can create account
- [ ] Firebase auth successful
- [ ] Redirects after signup

### Pairing System
- [ ] Connect screen shows
- [ ] Can generate invite code
- [ ] Invite code displays correctly (6 characters)
- [ ] Can copy invite code
- [ ] Can paste invite code to join
- [ ] Pairing successful
- [ ] Success screen shows

### Expense Management
- [ ] Home screen shows
- [ ] Balance card displays
- [ ] Can tap "Add Expense" button
- [ ] Add Expense screen opens
- [ ] Can enter amount
- [ ] Can enter description
- [ ] Can select category
- [ ] Can select split type (50/50 or custom)
- [ ] Can save expense
- [ ] Expense appears in list
- [ ] Balance updates correctly

### Balance & Calculations
- [ ] Balance displays correctly
- [ ] 50/50 split calculates properly
- [ ] Custom split calculates properly
- [ ] Multiple expenses sum correctly
- [ ] Negative balance shows "You owe"
- [ ] Positive balance shows "You are owed"

### Settle Up Flow
- [ ] Can tap "Settle Up" button
- [ ] Confirmation modal appears
- [ ] Can confirm settlement
- [ ] Balance resets to $0
- [ ] Settlement recorded in history

### Navigation
- [ ] Tab bar works
- [ ] Can switch between Home/Stats/Settings
- [ ] Back button works
- [ ] Navigation animations smooth

---

## 📱 UI/UX Testing

### Layout
- [ ] All screens render properly
- [ ] No overflow or cut-off text
- [ ] Spacing consistent
- [ ] Margins look good
- [ ] Cards display correctly

### Interactions
- [ ] Buttons are tappable
- [ ] Button press feedback works
- [ ] Forms work properly
- [ ] Keyboard opens/closes correctly
- [ ] Scroll works smoothly
- [ ] Pull to refresh works (if implemented)

### Design System
- [ ] Colors match theme.js
- [ ] Typography consistent
- [ ] Border radius consistent
- [ ] Shadows render properly
- [ ] Icons display correctly

---

## 📐 Screen Size Testing

Test on multiple simulator sizes:

### iPhone SE (Small Screen)
```bash
npx expo run:ios --device "iPhone SE (3rd generation)"
```
- [ ] All content fits
- [ ] No horizontal overflow
- [ ] Text readable
- [ ] Buttons accessible

### iPhone 15 (Standard)
```bash
npx expo run:ios --device "iPhone 15"
```
- [ ] Optimal layout
- [ ] Good spacing
- [ ] Content balanced

### iPhone 15 Pro Max (Large)
```bash
npx expo run:ios --device "iPhone 15 Pro Max"
```
- [ ] No awkward spacing
- [ ] Content scales well
- [ ] Takes advantage of space

### iPad (Optional)
```bash
npx expo run:ios --device "iPad Pro (12.9-inch)"
```
- [ ] Layout adapts properly
- [ ] Not just stretched phone UI

---

## 🔄 Development Testing

### Hot Reload
- [ ] Make code change
- [ ] Save file
- [ ] App reloads automatically
- [ ] Changes appear immediately

### Dev Menu (Cmd + D)
- [ ] Dev menu opens
- [ ] Can reload manually
- [ ] Can toggle performance monitor
- [ ] Can debug

### Error Handling
- [ ] Red screen shows on error
- [ ] Error messages are clear
- [ ] Can recover from errors

---

## 🔌 Firebase Testing

### Authentication
- [ ] Can create account
- [ ] Can sign in
- [ ] Can sign out
- [ ] Auth state persists
- [ ] Auth errors handled properly

### Firestore
- [ ] Can write expenses
- [ ] Can read expenses
- [ ] Real-time updates work
- [ ] Queries work correctly

### Connection Issues
- [ ] Disable network: Settings → Wi-Fi → Off
- [ ] App handles offline gracefully
- [ ] Errors shown to user
- [ ] Re-enable network
- [ ] App reconnects automatically

---

## 🐛 Known Issues Check

### Common Simulator Issues
- [ ] Keyboard not showing → Cmd + K to toggle
- [ ] App not updating → Cmd + R to reload
- [ ] Simulator frozen → Restart simulator
- [ ] Build fails → Clear cache: `npx expo start -c`

### App-Specific Issues
- [ ] Firebase connection failing → Check `.env` file
- [ ] UI looks broken → Clear Metro cache
- [ ] Navigation broken → Check navigation config
- [ ] Forms not working → Check validators

---

## 🎯 Performance Testing

### App Launch
- [ ] Launches within 3 seconds
- [ ] No white screen flicker
- [ ] Smooth animation to first screen

### Navigation
- [ ] Screen transitions smooth (60fps)
- [ ] No lag when switching tabs
- [ ] No stuttering on scroll

### Data Loading
- [ ] Loading indicators show
- [ ] Data loads reasonably fast
- [ ] No frozen UI while loading

### Memory
- [ ] No memory warnings in console
- [ ] App doesn't crash after extended use
- [ ] Can add many expenses without issues

---

## 📊 Simulator Controls Reference

| Action | Shortcut |
|--------|----------|
| Dev Menu | Cmd + D |
| Reload | Cmd + R |
| Shake | Ctrl + Cmd + Z |
| Home Button | Cmd + Shift + H |
| Lock | Cmd + L |
| Rotate Left | Cmd + ← |
| Rotate Right | Cmd + → |
| Screenshot | Cmd + S |
| Toggle Keyboard | Cmd + K |

---

## 🆘 Troubleshooting

### App Won't Build
```bash
# Try clearing cache
npx expo start -c --ios

# Or full clean
rm -rf node_modules
npm install
npx expo start --ios
```

### Simulator Won't Open
```bash
# Kill all simulator processes
killall Simulator

# Boot manually
open -a Simulator

# Then try again
npx expo start --ios
```

### Firebase Not Working
- [ ] Check `.env` file exists
- [ ] All variables start with `EXPO_PUBLIC_`
- [ ] Firebase config is correct
- [ ] Internet connection working

### UI Looks Wrong
- [ ] Clear Metro cache: `npx expo start -c`
- [ ] Check theme.js imports
- [ ] Verify COMMON_STYLES usage
- [ ] Check for hardcoded styles

---

## ✅ Build Readiness

Before building for TestFlight/App Store:

### Code Quality
- [ ] All features working
- [ ] No console errors
- [ ] No console.log statements in production
- [ ] Error handling implemented
- [ ] Loading states present

### Testing Complete
- [ ] Tested on iPhone SE (small)
- [ ] Tested on iPhone 15 (standard)
- [ ] Tested on iPhone 15 Pro Max (large)
- [ ] All features verified
- [ ] Edge cases tested

### Configuration
- [ ] Bundle identifier set in app.json
- [ ] App name correct
- [ ] Version number updated
- [ ] App icon ready
- [ ] Splash screen configured

---

## 🚀 Next Steps

### For Development
✅ Continue using simulator for rapid testing
```bash
npx expo start --ios
```

### For Beta Testing
✅ Build for TestFlight
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### For Physical Device Testing
✅ Connect via USB
```bash
npx expo run:ios --device
```

---

## 📈 Progress Tracking

### Phase 1: Setup ✅
- [x] Xcode installed
- [x] Dependencies installed
- [x] Firebase configured
- [x] First successful simulator run

### Phase 2: Core Features
- [ ] Authentication working
- [ ] Pairing system working
- [ ] Add expense working
- [ ] Balance calculations correct

### Phase 3: Polish
- [ ] All UI matches design
- [ ] All screens tested
- [ ] Error handling complete
- [ ] Performance optimized

### Phase 4: Testing
- [ ] Multiple screen sizes tested
- [ ] Edge cases covered
- [ ] Firebase working in all scenarios
- [ ] Ready for beta

---

## 💡 Tips

1. **Test frequently**: Run in simulator after each feature
2. **Use hot reload**: Make changes, see them instantly
3. **Test multiple sizes**: Don't assume one size fits all
4. **Check console**: Errors show in terminal
5. **Clear cache**: When weird things happen: `npx expo start -c`

---

## 🎯 Definition of Done

Your iOS version is ready when:
- ✅ Runs on simulator without errors
- ✅ All features work correctly
- ✅ UI looks good on all iPhone sizes
- ✅ Firebase connections stable
- ✅ No console errors
- ✅ Performance is smooth
- ✅ Ready for beta testing

---

**Testing Tip**: Use `./build-ios.sh` for an interactive menu with all common tasks! 🚀
