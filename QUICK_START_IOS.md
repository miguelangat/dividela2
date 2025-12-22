# 🚀 Quick Start - iOS Simulator Testing

Get Dividela running in iOS Simulator in under 5 minutes!

---

## ⚡ Fastest Method (Recommended)

### Prerequisites Check
```bash
# Do you have Xcode installed?
xcode-select -p

# If not installed, run:
xcode-select --install
```

### 3-Step Launch

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Start Expo with iOS
```bash
npx expo start --ios
```

#### 3. Wait for Simulator to Launch
That's it! The app will automatically:
- Open iOS Simulator
- Build the app
- Install and launch

**Done in ~2-3 minutes!** ✅

---

## 🎯 Alternative Methods

### Option A: Interactive Start
```bash
# Start Expo dev server
npx expo start

# Then press 'i' in terminal to open iOS simulator
```

### Option B: Direct Run
```bash
# This builds and runs in one command
npx expo run:ios
```

### Option C: Specific Simulator
```bash
# Run on specific iPhone model
npx expo run:ios --device "iPhone 15 Pro"

# Or iPhone SE for smaller screen
npx expo run:ios --device "iPhone SE (3rd generation)"
```

---

## 📱 Simulator Controls

Once app is running:

| Action | Shortcut |
|--------|----------|
| Open Dev Menu | Cmd + D |
| Reload | Cmd + R |
| Shake Gesture | Ctrl + Cmd + Z |
| Home Button | Cmd + Shift + H |
| Lock Screen | Cmd + L |
| Rotate Left | Cmd + ← |
| Rotate Right | Cmd + → |
| Screenshot | Cmd + S |

---

## 🔧 Common Simulator Tasks

### Choose Different iPhone Model
```bash
# List all available simulators
xcrun simctl list devices available

# Run on specific one
npx expo run:ios --device "iPhone 14"
```

### Open Simulator Manually
```bash
# Open Simulator app
open -a Simulator

# Then run expo
npx expo start --ios
```

### Reset Simulator
```bash
# If simulator is acting weird, reset it
xcrun simctl erase "iPhone 15 Pro"

# Or reset all simulators
xcrun simctl erase all
```

---

## 🐛 Quick Troubleshooting

### Issue: "xcode-select: error: tool not found"
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

### Issue: Simulator won't boot
```bash
# Kill all simulator processes
killall Simulator

# Try again
npx expo start --ios
```

### Issue: "Unable to resolve module"
```bash
# Clear cache and restart
npx expo start -c --ios
```

### Issue: App shows old code
```bash
# Force reload in simulator
Cmd + R

# Or restart Metro bundler
Cmd + C (stop server)
npx expo start --ios
```

### Issue: "Expo Go says can't run app"
```bash
# Your app has custom native code, use local build instead
npx expo run:ios
```

---

## 🎨 Testing Different Screens

### Phone Sizes
```bash
# Small screen
npx expo run:ios --device "iPhone SE (3rd generation)"

# Standard
npx expo run:ios --device "iPhone 15"

# Large (Pro Max)
npx expo run:ios --device "iPhone 15 Pro Max"

# Tablet
npx expo run:ios --device "iPad Pro (12.9-inch)"
```

---

## 🔄 Development Workflow

```bash
# 1. Start dev server (do this once)
npx expo start --ios

# 2. Make code changes in your editor

# 3. Save file - app auto-reloads ✨

# 4. Test in simulator

# 5. Repeat steps 2-4
```

**Hot reloading works automatically!** No need to rebuild.

---

## 💡 Pro Tips

1. **Keep simulator running**: Don't close it between sessions
2. **Use keyboard shortcuts**: Cmd + D for dev menu
3. **Test on multiple devices**: Try iPhone SE and Pro Max
4. **Clear cache if weird**: `npx expo start -c`
5. **Check console**: Terminal shows errors in real-time

---

## 🎯 What to Test

### Essential Features
- [ ] Welcome screen loads
- [ ] Sign up flow works
- [ ] Can pair with partner (using invite code)
- [ ] Can add expense
- [ ] Expenses show in list
- [ ] Balance calculates correctly
- [ ] Can settle up
- [ ] Settings work

### UI/UX
- [ ] Buttons are tappable
- [ ] Text is readable
- [ ] Spacing looks good
- [ ] Colors match design
- [ ] Navigation works smoothly
- [ ] Forms validate properly

### Different Sizes
- [ ] iPhone SE (small screen)
- [ ] iPhone 15 (standard)
- [ ] iPhone 15 Pro Max (large)

---

## 📊 Comparison: Simulator vs Physical Device

| Aspect | Simulator | Physical iPhone |
|--------|-----------|-----------------|
| Speed | ⚡ Instant | 🔌 Need cable/TestFlight |
| Setup | ✅ Easy | ⚠️ More complex |
| Performance | 💻 Mac performance | 📱 Real device performance |
| Sensors | ❌ Limited | ✅ All sensors |
| Cost | 🆓 Free | 💰 Need device |
| **Recommend for** | **Development** | **Final testing** |

**For development: Use Simulator** ⭐

---

## 🚦 Status Indicators

### When it's working:
```
✅ "Bundling complete"
✅ Simulator opens automatically
✅ App icon appears
✅ App launches
✅ You can tap buttons and navigate
```

### When something's wrong:
```
❌ Build errors in terminal
❌ Red error screen in simulator
❌ App crashes on launch
❌ Changes don't appear (need to reload)
```

---

## 🎓 Next Steps

### After First Successful Run:
1. **Test all screens**: Navigate through the app
2. **Try hot reload**: Make a code change and watch it update
3. **Test with data**: Add expenses, create account
4. **Test different simulators**: Try iPhone SE and Pro Max
5. **Check Firebase**: Make sure auth and database work

### When Ready for More:
- Read [`BUILD_IOS.md`](./BUILD_IOS.md) for full build options
- Build for TestFlight: `eas build --platform ios --profile production`
- Test on real device

---

## 📚 Related Documentation

- **Full iOS guide**: [`BUILD_IOS.md`](./BUILD_IOS.md)
- **Android guide**: [`BUILD_ANDROID.md`](./BUILD_ANDROID.md)
- **Proxy config**: [`NPM_PROXY_CONFIG.md`](./NPM_PROXY_CONFIG.md)

---

## ⚡ TL;DR - Absolute Quickest Way

```bash
# One command to rule them all:
npx expo start --ios
```

Wait 2-3 minutes for simulator to open and app to build.

**That's it! You're testing on iOS!** 🎉

---

## 🆘 Still Having Issues?

### Try this sequence:
```bash
# 1. Clear everything
npx expo start -c

# 2. Reset simulator
xcrun simctl erase all

# 3. Try again
npx expo start --ios
```

### If that doesn't work:
```bash
# Check Xcode is installed
xcode-select -p

# If not:
xcode-select --install

# Then try again
npx expo start --ios
```

### Last resort:
```bash
# Full clean
rm -rf node_modules
npm install
npx expo start -c --ios
```

---

**Need more help?** Check the full guide: [`BUILD_IOS.md`](./BUILD_IOS.md)

**Ready to go?** Run: `npx expo start --ios` 🚀
