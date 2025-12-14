# E2E Testing Setup Guide

## Overview

End-to-end testing for the bank import feature using Detox (recommended) or Maestro for React Native applications.

## Why E2E Tests?

While we've achieved 80%+ coverage with unit, component, and integration tests, E2E tests validate:
- Real user workflows across multiple screens
- Actual app behavior on devices/simulators
- Integration with native modules and OS features
- Performance under realistic conditions

## Recommended Framework: Detox

Detox is the most mature E2E testing framework for React Native with excellent React Native support.

### Installation

```bash
# Install Detox CLI globally
npm install -g detox-cli

# Install Detox locally
npm install --save-dev detox

# iOS dependencies (macOS only)
brew tap wix/brew
brew install applesimutils

# Android dependencies
# Ensure Android SDK and emulator are installed
```

### Configuration

Create `detox.config.js`:

```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Dividela2.app',
      build: 'xcodebuild -workspace ios/Dividela2.xcworkspace -scheme Dividela2 -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14 Pro'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_31'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

### E2E Test Structure

```
e2e/
├── jest.config.js           # Jest configuration for E2E
├── setup.js                 # Global setup
└── specs/
    ├── import-flow.e2e.js   # Main import flow tests
    ├── navigation.e2e.js    # Navigation tests
    └── error-handling.e2e.js # Error scenarios
```

## E2E Test Cases for Bank Import

### Priority 1: Happy Path

**Test:** Complete CSV Import Flow
```javascript
describe('CSV Import Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should import transactions from CSV file successfully', async () => {
    // Navigate to import screen
    await element(by.id('import-tab')).tap();

    // Select file
    await element(by.id('file-picker-button')).tap();
    await element(by.text('sample-chase.csv')).tap();

    // Wait for preview
    await waitFor(element(by.text('Transaction Preview')))
      .toBeVisible()
      .withTimeout(5000);

    // Verify transactions loaded
    await expect(element(by.id('transaction-item-0'))).toBeVisible();

    // Configure import
    await element(by.id('paid-by-you')).tap();

    // Select all transactions
    await element(by.text('Select All')).tap();

    // Import
    await element(by.text('Import 5 Transactions')).tap();
    await element(by.text('Confirm')).tap();

    // Wait for completion
    await waitFor(element(by.text('Import Successful')))
      .toBeVisible()
      .withTimeout(10000);

    // Verify results
    await expect(element(by.text('5 transactions imported'))).toBeVisible();

    // View expenses
    await element(by.text('View Expenses')).tap();

    // Verify navigation to home
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

### Priority 2: Error Handling

**Test:** Invalid File Handling
```javascript
it('should show error for invalid file format', async () => {
  await element(by.id('import-tab')).tap();
  await element(by.id('file-picker-button')).tap();
  await element(by.text('invalid-file.txt')).tap();

  await waitFor(element(by.text('Parse Error')))
    .toBeVisible()
    .withTimeout(3000);

  await expect(element(by.text('Unsupported file format'))).toBeVisible();

  await element(by.text('OK')).tap();
});
```

**Test:** Network Error During Import
```javascript
it('should handle network errors gracefully', async () => {
  // Disable network
  await device.setURLBlacklist(['*firestore.googleapis.com*']);

  await element(by.id('import-tab')).tap();
  // ... select file and preview ...
  await element(by.text('Import')).tap();
  await element(by.text('Confirm')).tap();

  await waitFor(element(by.text('Import Failed')))
    .toBeVisible()
    .withTimeout(10000);

  await expect(element(by.text('Network error'))).toBeVisible();

  // Re-enable network
  await device.setURLBlacklist([]);
});
```

### Priority 3: Duplicate Detection

**Test:** Auto-Skip Duplicates
```javascript
it('should auto-skip high confidence duplicates', async () => {
  // First import
  await importTransactions('sample-chase.csv');

  // Try to import same file again
  await element(by.id('import-tab')).tap();
  await element(by.id('file-picker-button')).tap();
  await element(by.text('sample-chase.csv')).tap();

  // Wait for preview
  await waitFor(element(by.text('Transaction Preview')))
    .toBeVisible()
    .withTimeout(5000);

  // Verify duplicates detected
  await expect(element(by.text('5 duplicates detected'))).toBeVisible();

  // Verify only unique transactions selected
  await expect(element(by.text('0 selected'))).toBeVisible();
});
```

### Priority 4: Category Auto-Mapping

**Test:** Category Suggestions
```javascript
it('should suggest categories based on merchant', async () => {
  await element(by.id('import-tab')).tap();
  await element(by.id('file-picker-button')).tap();
  await element(by.text('sample-chase.csv')).tap();

  // Wait for preview with suggestions
  await waitFor(element(by.text('Transaction Preview')))
    .toBeVisible()
    .withTimeout(5000);

  // Verify category suggestion for Starbucks
  await expect(element(by.text('Food & Dining'))).toBeVisible();
  await expect(element(by.text('High Confidence'))).toBeVisible();

  // Change category
  await element(by.id('category-chip-0')).tap();
  await element(by.text('Groceries')).tap();

  // Verify change
  await expect(element(by.text('Groceries'))).toBeVisible();
});
```

### Priority 5: Large File Performance

**Test:** 1000 Transaction Import
```javascript
it('should handle large files (1000+ transactions)', async () => {
  await element(by.id('import-tab')).tap();
  await element(by.id('file-picker-button')).tap();
  await element(by.text('large-statement.csv')).tap();

  // Wait for preview (should complete within 5 seconds)
  await waitFor(element(by.text('1000 transactions')))
    .toBeVisible()
    .withTimeout(5000);

  // Select all
  await element(by.text('Select All')).tap();

  const startTime = Date.now();

  // Import
  await element(by.text('Import 1000 Transactions')).tap();
  await element(by.text('Confirm')).tap();

  // Wait for completion
  await waitFor(element(by.text('Import Successful')))
    .toBeVisible()
    .withTimeout(30000);

  const duration = Date.now() - startTime;

  // Should complete within 30 seconds
  expect(duration).toBeLessThan(30000);

  // Verify all imported
  await expect(element(by.text('1000 transactions imported'))).toBeVisible();
});
```

## Running E2E Tests

### iOS
```bash
# Build app
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

### Android
```bash
# Build app
detox build --configuration android.emu.debug

# Run tests
detox test --configuration android.emu.debug
```

### Run specific test
```bash
detox test --configuration ios.sim.debug e2e/specs/import-flow.e2e.js
```

## Alternative: Maestro

Maestro is a simpler, cross-platform alternative to Detox with a YAML-based syntax.

### Installation
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Example Flow

Create `e2e/flows/import-csv.yaml`:

```yaml
appId: com.dividela.app
---
- launchApp
- tapOn: "Import"
- tapOn: "Select File"
- tapOn: "sample-chase.csv"
- assertVisible: "Transaction Preview"
- assertVisible: "5 transactions"
- tapOn: "Select All"
- tapOn: "Import 5 Transactions"
- tapOn: "Confirm"
- assertVisible:
    text: "Import Successful"
    timeout: 10000
- assertVisible: "5 transactions imported"
- tapOn: "View Expenses"
- assertVisible: "Home"
```

### Run Maestro Flow
```bash
maestro test e2e/flows/import-csv.yaml
```

## CI/CD Integration

### GitHub Actions (Detox)

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: brew tap wix/brew && brew install applesimutils
      - run: detox build --configuration ios.sim.debug
      - run: detox test --configuration ios.sim.debug --record-logs all

  test-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: android-actions/setup-android@v2
      - run: npm install
      - run: detox build --configuration android.emu.debug
      - run: detox test --configuration android.emu.debug --record-logs all
```

## Test Coverage Goals

| Scenario | Priority | Estimated Time |
|----------|----------|----------------|
| Happy path (CSV/PDF import) | P0 | 2 hours |
| Error handling | P0 | 2 hours |
| Duplicate detection | P1 | 2 hours |
| Category auto-mapping | P1 | 1 hour |
| Large file performance | P2 | 1 hour |
| Edge cases | P2 | 2 hours |

**Total Estimated Time:** 10 hours

## Best Practices

1. **Use testID for element identification**
   ```javascript
   // In component
   <Button testID="import-button" />

   // In test
   await element(by.id('import-button')).tap();
   ```

2. **Wait for async operations**
   ```javascript
   await waitFor(element(by.text('Success')))
     .toBeVisible()
     .withTimeout(5000);
   ```

3. **Isolate tests with proper cleanup**
   ```javascript
   beforeEach(async () => {
     await device.reloadReactNative();
     await clearAppData();
   });
   ```

4. **Use realistic test data**
   - Include actual CSV files from different banks
   - Test with various transaction counts
   - Include edge cases (special characters, large amounts)

5. **Test on multiple devices**
   - Different screen sizes (iPhone SE, iPhone 14 Pro Max)
   - Different OS versions (iOS 15, 16, 17)
   - Different Android versions (API 29, 30, 31)

## Current Status

- ✅ E2E test framework planning complete
- ✅ Test cases designed for critical flows
- ✅ Setup documentation created
- ⏳ Detox/Maestro installation pending (requires local setup)
- ⏳ E2E test implementation pending

## Next Steps

1. Install Detox or Maestro locally
2. Implement priority 0 tests (happy path + error handling)
3. Add testIDs to all interactive elements
4. Set up CI/CD for automated E2E testing
5. Expand coverage to all priority 1 and 2 scenarios

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Maestro Documentation](https://maestro.mobile.dev/)
- [React Native Testing Best Practices](https://reactnative.dev/docs/testing-overview)
