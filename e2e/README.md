# End-to-End Testing for Multi-Currency Feature

## Overview

This directory contains E2E (End-to-End) tests for the multi-currency functionality in the Dividela expense tracking app. These tests validate complete user workflows across multiple screens and components.

## Testing Framework

The E2E tests are written for **Detox** (React Native E2E testing framework), but can be adapted for:
- **Maestro** - Simpler YAML-based E2E testing
- **Appium** - Cross-platform mobile testing
- **Cavy** - React Native specific testing

## Setup

### Detox Setup

1. Install Detox:
```bash
npm install --save-dev detox
npm install -g detox-cli
```

2. Configure Detox in `package.json`:
```json
{
  "detox": {
    "configurations": {
      "ios.sim.debug": {
        "device": {
          "type": "iPhone 14"
        },
        "app": "ios.debug"
      },
      "android.emu.debug": {
        "device": {
          "avdName": "Pixel_4_API_30"
        },
        "app": "android.debug"
      }
    }
  }
}
```

3. Build the app for testing:
```bash
detox build --configuration ios.sim.debug
```

4. Run tests:
```bash
detox test --configuration ios.sim.debug
```

## Test Coverage

### Core User Journeys

1. **Adding Multi-Currency Expenses**
   - Add expense in same currency (no conversion)
   - Add expense in different currency with manual exchange rate
   - Use quick rate suggestions
   - Calculate exchange rate from converted amount

2. **Changing Primary Currency**
   - Change currency in settings
   - Handle migration warnings
   - Cancel currency change

3. **Viewing Expenses**
   - View expenses with dual currency display
   - View expense details with currency info
   - Verify balance calculations use converted amounts

4. **Budget Tracking**
   - Track spending with converted amounts
   - Budget warnings with mixed currencies
   - Category spending in primary currency

5. **Editing Expenses**
   - Edit expense amount
   - Change expense currency
   - Update exchange rate

6. **Exchange Rate Reuse**
   - Recently used rates pre-filled
   - Quick rate suggestions persist

### Edge Cases

- Invalid exchange rate input
- Offline mode handling
- Same-currency expenses
- Large datasets (100+ expenses)
- Network errors
- Missing data handling

## Test IDs

The following test IDs should be added to components for E2E testing:

### Home Screen
- `home-screen` - Main container
- `home-tab` - Home tab button
- `add-expense-button` - Floating add button
- `expense-list` - Expense list container
- `expense-{id}` - Individual expense items
- `balance-display` - Balance widget

### Add Expense Screen
- `amount-input` - Amount input field
- `currency-picker` - Currency picker button
- `selected-currency` - Selected currency display
- `exchange-rate-input` - Exchange rate input
- `converted-amount` - Converted amount display
- `converted-amount-input` - Converted amount input field
- `description-input` - Description field
- `category-{key}` - Category buttons (e.g., `category-food`)
- `submit-expense-button` - Submit button

### Currency Picker
- `currency-search-input` - Search field
- `currency-{code}` - Currency options (e.g., `currency-EUR`)

### Exchange Rate Input
- `quick-rate-{value}` - Quick rate buttons (e.g., `quick-rate-1.1`)

### Settings Screen
- `settings-screen` - Settings container
- `settings-tab` - Settings tab button
- `settings-scroll` - Scrollable content
- `primary-currency-picker` - Primary currency picker
- `primary-currency-value` - Current primary currency display

### Budget Screen
- `budget-screen` - Budget container
- `budget-tab` - Budget tab button
- `{category}-spent` - Category spent amount
- `{category}-remaining` - Category remaining amount
- `{category}-progress-percentage` - Category progress percentage
- `{category}-category-warning` - Budget warning indicator

## Running Specific Test Suites

```bash
# Run all multi-currency tests
detox test e2e/multi-currency.e2e.test.js

# Run specific describe block
detox test e2e/multi-currency.e2e.test.js --grep "Add Expense in Different Currency"

# Run with logs
detox test --loglevel trace

# Run on specific device
detox test --configuration android.emu.debug
```

## Test Data Setup

For E2E tests to work properly, you need test data:

### Option 1: Mock Backend
Use Detox mocking to provide test data without real Firebase:

```javascript
beforeAll(async () => {
  await device.launchApp({
    launchArgs: {
      mockBackend: true,
    },
  });
});
```

### Option 2: Test Database
Use a separate Firebase project for E2E testing:

1. Create `firebase.e2e.config.js` with test project credentials
2. Populate test database with known data
3. Reset database between test runs

### Option 3: Fixture Data
Pre-populate app with fixture data:

```javascript
beforeEach(async () => {
  await device.reloadReactNative();
  await device.setURLBlacklist(['https://api.exchangerate.*']); // Block real API calls

  // Inject test data
  await element(by.id('dev-menu')).tap();
  await element(by.text('Load Test Data')).tap();
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build for testing
        run: detox build --configuration ios.sim.debug

      - name: Run E2E tests
        run: detox test --configuration ios.sim.debug --cleanup

      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: detox-artifacts
          path: artifacts/
```

## Best Practices

1. **Use testID over text matching**
   - `by.id('submit-button')` is more reliable than `by.text('Submit')`
   - Text can change with i18n, testIDs don't

2. **Wait for elements**
   - Use `waitFor()` for async operations
   - Don't use fixed `sleep()` timers

3. **Keep tests independent**
   - Each test should run independently
   - Don't rely on state from previous tests

4. **Clean up after tests**
   - Reset app state between tests
   - Clear test data

5. **Test real user flows**
   - E2E tests should mimic actual user behavior
   - Include happy paths and error scenarios

6. **Keep tests maintainable**
   - Extract common flows into helper functions
   - Use page object pattern for complex screens

## Troubleshooting

### Tests fail on CI but pass locally
- Ensure same Node/npm versions
- Check for timing issues (use `waitFor`)
- Verify test device configuration

### Can't find elements
- Check that testIDs are actually set in components
- Use `await element(by.id('...')).tap()` instead of `tap()` alone
- Check if element is visible/enabled

### Slow test execution
- Use `device.disableSynchronization()` for long operations
- Run tests in parallel (Detox supports this)
- Optimize test data setup

### Flaky tests
- Add proper waits with `waitFor()`
- Increase timeout for slow operations
- Check for race conditions

## Future Enhancements

- [ ] Add visual regression testing (screenshots)
- [ ] Add performance benchmarks
- [ ] Add accessibility testing
- [ ] Add multi-platform tests (iOS + Android)
- [ ] Add i18n/l10n testing for currency formatting
- [ ] Add offline-first scenario testing
- [ ] Add migration testing (v1 → v2 data)

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Maestro Documentation](https://maestro.mobile.dev/)
- [React Native Testing Best Practices](https://reactnative.dev/docs/testing-overview)
