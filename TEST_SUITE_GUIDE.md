# OCR Feature Test Suite Guide

This guide covers the comprehensive test suite for the OCR Receipt Scanning feature, including performance, E2E, and ML accuracy monitoring tests.

## Test Suite Overview

### 📊 Total Tests: 424+ (Unit) + 60+ (Performance) + 20+ (E2E) + 15+ (ML Accuracy)

| Test Type | Count | Location | Purpose |
|-----------|-------|----------|---------|
| **Unit Tests** | 424 | Various `__tests__` dirs | Component & function testing |
| **Performance Tests** | 60+ | `functions/__tests__/performance/` | Load & stress testing |
| **E2E Tests** | 20+ | `e2e/` | Full user flow testing |
| **ML Accuracy** | 15+ | `functions/__tests__/ml/` | Model performance monitoring |

---

## Running Tests

### 1. Unit Tests (Existing - 424 tests)

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test file
npm test -- AddExpenseScreen.test.js
```

**Coverage by Layer:**
- Backend (Cloud Functions): 165 tests, 85-90% coverage
- Mobile Services: 131 tests, 85-95% coverage
- UI Components: 93 tests, 80-95% coverage
- Screen Integration: 35 tests, 75% coverage

---

### 2. Performance Tests (NEW - 60+ tests)

Tests system performance under load, including concurrent processing, memory usage, and API limits.

```bash
# Run all performance tests
npm run test:performance

# Run specific performance suite
npm test -- functions/__tests__/performance/load.test.js
```

**What It Tests:**
- ✅ 20+ concurrent OCR requests
- ✅ 50+ concurrent requests with acceptable degradation
- ✅ 100-receipt batch processing
- ✅ Memory leak detection
- ✅ Vision API rate limiting
- ✅ Database query performance
- ✅ CPU and memory monitoring

**Performance SLAs:**
- Single OCR request: <5 seconds (p95)
- 20 concurrent requests: <30 seconds total
- Receipt parsing: <100ms
- ML prediction: <500ms with 1000-item history
- Success rate under load: >90%

**Example Output:**
```
✓ 20 concurrent requests completed in 18523ms
  Average: 926ms per request

✓ Memory increase: 45.23MB for 100 requests

⏱️  Performance Metrics:
   Average time: 52.34ms
   P50: 45ms
   P95: 89ms
   P99: 124ms
```

---

### 3. E2E Tests (NEW - 20+ tests)

End-to-end tests using Detox that simulate real user interactions from camera to expense creation.

#### Setup:

```bash
# Install Detox CLI globally
npm install -g detox-cli

# Install dependencies
npm install

# Build the app for testing
npm run test:e2e:build

# For iOS
npm run test:e2e:ios

# For Android
npm run test:e2e:android
```

#### Running E2E Tests:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
detox test e2e/ocrFlow.e2e.js

# Run with specific configuration
detox test --configuration ios.sim.debug
detox test --configuration android.emu.debug
```

**What It Tests:**
- ✅ Complete scan → suggest → accept → save flow
- ✅ OCR failure → manual entry fallback
- ✅ Network interruption handling
- ✅ Merchant alias creation
- ✅ Editing OCR suggestions
- ✅ Alternative category selection
- ✅ Split expense integration
- ✅ Accessibility features
- ✅ Low confidence handling
- ✅ Performance & responsiveness

**Test Scenarios:**

1. **Happy Path**: User scans receipt, accepts suggestions, saves expense
2. **Error Path**: OCR fails, user enters data manually
3. **Edit Path**: User accepts suggestions but modifies before saving
4. **Alias Path**: User creates merchant alias from suggestion card
5. **Network Path**: Handles offline/online transitions

**Example Test:**
```javascript
it('should complete full OCR flow and create expense', async () => {
  await element(by.id('add-expense-tab')).tap();
  await element(by.id('scan-receipt-button')).tap();
  await element(by.id('use-test-receipt-button')).tap();

  await waitFor(element(by.id('ocr-suggestion-card')))
    .toBeVisible()
    .withTimeout(15000);

  await element(by.id('ocr-accept-button')).tap();
  await element(by.id('save-expense-button')).tap();

  await expect(element(by.text('Expense added successfully'))).toBeVisible();
});
```

---

### 4. ML Accuracy Monitoring (NEW - 15+ tests)

Tests ML model accuracy and detects regression over time.

```bash
# Run ML accuracy tests
npm run test:ml-accuracy

# Or directly with jest
npm test -- functions/__tests__/ml/accuracyMonitoring.test.js
```

**What It Tests:**
- ✅ Overall accuracy on 45+ validation examples
- ✅ High-confidence prediction accuracy (>90%)
- ✅ Confidence calibration
- ✅ Per-category performance
- ✅ User history learning
- ✅ Regression detection
- ✅ Performance metrics

**Validation Set:**
- 8 Grocery stores
- 8 Food & Dining merchants
- 8 Transportation merchants
- 5 Home & Utilities merchants
- 5 Entertainment services
- 3 Healthcare providers
- 4 Shopping merchants

**Accuracy Requirements:**
- Overall: >80%
- High-confidence (>90%): >90%
- Per-category: >70%
- Regression threshold: <5% decrease

**Example Output:**
```
📊 ML Model Accuracy Report:
Total Examples: 45
Correct: 38
Accuracy: 84.44%

Incorrect Predictions:
  ❌ Amazon: expected "shopping", got "groceries" (76%)
  ❌ Target: expected "groceries", got "shopping" (68%)

📊 Per-Category Performance:
   groceries: 87.5% (7/8)
   food: 100.0% (8/8)
   transportation: 87.5% (7/8)
   home: 80.0% (4/5)
   fun: 100.0% (5/5)
```

**Report Files:**
- Generated in `functions/reports/`
- Timestamped JSON files for tracking over time
- Compare against baseline to detect regression

---

## Test Configurations

### Detox Configuration (.detoxrc.js)

Supports multiple platforms and configurations:

```javascript
configurations: {
  'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
  'ios.sim.release': { device: 'simulator', app: 'ios.release' },
  'android.emu.debug': { device: 'emulator', app: 'android.debug' },
  'android.emu.release': { device: 'emulator', app: 'android.release' },
}
```

### Jest Configuration

- **Unit Tests**: `jest.config.js` (root)
- **E2E Tests**: `e2e/jest.config.js`
- **Performance Tests**: `functions/__tests__/performance/jest.config.js`

---

## CI/CD Integration

### GitHub Actions Example:

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:performance

  ml-accuracy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:ml-accuracy

  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:e2e:build
      - run: npm run test:e2e:ios

  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run test:e2e:build
      - run: npm run test:e2e:android
```

---

## Test Data & Fixtures

### Mock Receipt Images

For E2E tests, use these test buttons in development:
- `use-test-receipt-button`: Returns successful OCR with known data
- `use-failing-receipt-button`: Simulates OCR failure
- `use-low-confidence-receipt-button`: Returns low confidence results
- `use-slow-receipt-button`: Simulates slow OCR processing

### ML Validation Set

Located in `functions/__tests__/ml/accuracyMonitoring.test.js`:
- 45 real-world merchant examples
- Known correct categories
- Expected confidence levels
- Used for regression detection

---

## Troubleshooting

### E2E Tests

**Issue**: "Cannot find element by.id('scan-receipt-button')"
- **Solution**: Ensure testID props are set in components
- Check that the app is fully loaded before test starts

**Issue**: "Timeout waiting for OCR suggestion card"
- **Solution**: Increase timeout in waitFor() call
- Verify mock OCR service is responding

**Issue**: "Detox build fails"
- **Solution**: Clean build directories
  ```bash
  cd ios && rm -rf build && cd ..
  cd android && ./gradlew clean && cd ..
  ```

### Performance Tests

**Issue**: "Memory limit exceeded"
- **Solution**: Tests run with limited Node memory by default
  ```bash
  NODE_OPTIONS=--max-old-space-size=4096 npm run test:performance
  ```

**Issue**: "Tests timeout"
- **Solution**: Performance tests have 180s timeout. Adjust in jest.config.js if needed

### ML Accuracy Tests

**Issue**: "Accuracy below threshold"
- **Solution**: Review incorrect predictions in console output
- Check if validation set needs updating
- Investigate if model changes affected accuracy

---

## Best Practices

### Writing New Tests

1. **Unit Tests**: Test one thing at a time
   ```javascript
   it('should extract amount from receipt', () => {
     const result = extractAmount('TOTAL: $49.14');
     expect(result).toBe(49.14);
   });
   ```

2. **Performance Tests**: Include metrics logging
   ```javascript
   it('should handle load efficiently', async () => {
     const startTime = Date.now();
     await processMany();
     const duration = Date.now() - startTime;
     console.log(`Processed in ${duration}ms`);
     expect(duration).toBeLessThan(threshold);
   });
   ```

3. **E2E Tests**: Use clear test IDs
   ```javascript
   // Component
   <Button testID="scan-receipt-button">Scan</Button>

   // Test
   await element(by.id('scan-receipt-button')).tap();
   ```

4. **ML Tests**: Document expected behavior
   ```javascript
   it('should predict groceries for Walmart', async () => {
     // Walmart is a well-known grocery store
     const result = await predictCategory('Walmart', 45.50, '');
     expect(result.category).toBe('groceries');
     expect(result.confidence).toBeGreaterThan(0.85);
   });
   ```

### Test Maintenance

- Update E2E tests when UI changes
- Regenerate ML baseline when model improves
- Add new validation examples as edge cases are discovered
- Review performance metrics quarterly

---

## Coverage Goals

| Test Type | Current | Target |
|-----------|---------|--------|
| Unit Test Coverage | 85% | 90% |
| Performance Tests | 60 tests | 100 tests |
| E2E Scenarios | 20 tests | 40 tests |
| ML Validation Set | 45 examples | 100 examples |

---

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [OCR Test Coverage Report](./OCR_TEST_COVERAGE_REPORT.md)

---

## Support

For issues or questions about the test suite:
1. Check the [troubleshooting section](#troubleshooting)
2. Review test output and error messages
3. Consult the detailed coverage report
4. Create an issue in the repository

---

**Last Updated**: 2025-11-19
**Maintained By**: Development Team
