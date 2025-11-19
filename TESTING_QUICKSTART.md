# Testing Quick Start Guide

## 🚀 Quick Installation

1. **Install test dependencies:**
   ```bash
   npm install
   ```

2. **Run all tests:**
   ```bash
   npm test
   ```

Expected output:
```
PASS  src/__tests__/components/ScrollableContainer.test.js
PASS  src/__tests__/onboarding/OnboardingNavigation.test.js
PASS  src/__tests__/onboarding/OnboardingFlow.test.js

Test Suites: 3 passed, 3 total
Tests:       56 passed, 56 total
Snapshots:   0 total
Time:        X.XXXs
```

## 📋 Available Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode (re-runs on file changes) |
| `npm run test:coverage` | Run tests with coverage report |

## 🔍 Running Specific Tests

### Run a single test file
```bash
npm test -- ScrollableContainer.test.js
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="Go to Dashboard"
```

### Run only failed tests
```bash
npm test -- --onlyFailures
```

## ✅ Verifying the Navigation Fix

### Manual Testing
1. Start the app: `npm start`
2. Complete the onboarding flow
3. Press "Go to Dashboard" on success screen
4. **Expected:** Navigate to MainTabs within 1 second
5. **Previous behavior:** Button did nothing

### Automated Testing
```bash
# Test the navigation fix specifically
npm test -- OnboardingNavigation.test.js

# Look for these passing tests:
✓ should call completeOnboarding when "Go to Dashboard" is pressed
✓ should set correct AsyncStorage key when completing onboarding
```

## 📊 Coverage Report

Generate a detailed coverage report:
```bash
npm run test:coverage
```

This creates a coverage report in `coverage/lcov-report/index.html`

Open in browser:
```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

## 🐛 Troubleshooting

### Tests fail with "Cannot find module"
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

### Tests timeout
Increase timeout in specific test:
```javascript
jest.setTimeout(10000); // 10 seconds
```

### Mock issues
Verify `jest.setup.js` exists and is configured in `package.json`

### AsyncStorage mock not working
Check that `@react-native-async-storage/async-storage` is installed:
```bash
npm list @react-native-async-storage/async-storage
```

## 📝 Test Files Overview

```
src/__tests__/
├── components/
│   └── ScrollableContainer.test.js (15 tests)
│       - Component rendering
│       - Safe area handling
│       - Footer positioning
│
├── onboarding/
│   ├── OnboardingNavigation.test.js (18 tests)
│   │   - Navigation button calls
│   │   - "Go to Dashboard" functionality
│   │   - AsyncStorage integration
│   │
│   └── OnboardingFlow.test.js (23 tests)
│       - Simple mode flows
│       - Advanced mode flows
│       - Skip flow
│       - Error handling
│
└── README.md (Full documentation)
```

## 🎯 What's Being Tested

### The Navigation Fix
- ✅ AppNavigator polls for onboarding completion
- ✅ Success screens call completeOnboarding()
- ✅ AsyncStorage is set correctly
- ✅ Navigation to MainTabs works
- ✅ Loading states show during completion
- ✅ Buttons disable during async operations

### Component Functionality
- ✅ ScrollableContainer renders correctly
- ✅ Safe areas are respected
- ✅ Footers stay fixed at bottom

### User Flows
- ✅ Simple onboarding (Smart Budget)
- ✅ Simple onboarding (Fixed Budget)
- ✅ Advanced onboarding
- ✅ Skip onboarding
- ✅ Back navigation
- ✅ Error handling

## 🔄 CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## 📈 Next Steps

1. **Run tests before committing:**
   ```bash
   npm test
   ```

2. **Check coverage:**
   ```bash
   npm run test:coverage
   ```

3. **Add more tests** as you add features

4. **Keep tests passing** - don't commit breaking changes

## 💡 Tips

- Use `test:watch` during development for instant feedback
- Write tests before fixing bugs (TDD)
- Keep tests simple and focused
- Test user behavior, not implementation details
- Use descriptive test names

## 📞 Support

If tests fail:
1. Read the error message carefully
2. Check the test file for what's expected
3. Verify the component/screen code
4. Check `jest.setup.js` for mock configuration
5. Try clearing cache: `npm test -- --clearCache`

## ✨ Success Indicators

All these should be ✅:
- [ ] `npm install` completes without errors
- [ ] `npm test` shows 56 passing tests
- [ ] No test timeouts or failures
- [ ] Coverage report generates successfully
- [ ] Manual testing: "Go to Dashboard" navigates correctly
