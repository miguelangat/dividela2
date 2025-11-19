# Test Documentation

## Overview

This directory contains comprehensive tests for the DivideLa2 application, focusing on onboarding flows and core components.

## Test Structure

```
src/__tests__/
├── components/
│   └── ScrollableContainer.test.js    # Tests for scrollable container component
├── onboarding/
│   ├── OnboardingNavigation.test.js   # Tests for navigation between onboarding screens
│   └── OnboardingFlow.test.js         # End-to-end tests for complete onboarding flows
└── README.md                           # This file
```

## Running Tests

### Install Dependencies

First, install the testing dependencies:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- ScrollableContainer.test.js
```

## Test Files

### 1. ScrollableContainer.test.js

Tests the `ScrollableContainer` component which provides cross-platform scrolling functionality.

**What it tests:**
- Component rendering
- ScrollView functionality
- Footer rendering and positioning
- Safe area insets
- Custom styling
- Scroll indicator visibility
- Component hierarchy

**Example:**
```javascript
it('should render footer when provided', () => {
  const { getByText } = render(
    <ScrollableContainer
      footer={<Text>Footer Content</Text>}
    >
      <Text>Main Content</Text>
    </ScrollableContainer>
  );
  expect(getByText('Footer Content')).toBeTruthy();
});
```

### 2. OnboardingNavigation.test.js

Tests navigation behavior throughout the onboarding process.

**What it tests:**
- Button navigation calls
- Route transitions
- "Go to Dashboard" button functionality
- AsyncStorage integration
- Loading states
- Button disabled states during async operations
- Error handling

**Example:**
```javascript
it('should navigate to SimpleChooseStyle when "Keep It Simple" is selected', () => {
  const { getByText } = render(
    <OnboardingIntroScreen navigation={mockNavigation} />
  );
  fireEvent.press(getByText('Keep It Simple'));
  expect(mockNavigation.navigate).toHaveBeenCalledWith('SimpleChooseStyle');
});
```

### 3. OnboardingFlow.test.js

End-to-end tests for complete onboarding user flows.

**What it tests:**
- Simple mode complete flow (Smart Budget)
- Simple mode complete flow (Fixed Budget)
- Advanced mode complete flow
- Skip flow
- Back navigation throughout flows
- OnboardingContext integration
- AsyncStorage persistence
- Error handling
- UI state management
- Route parameter handling

**Example:**
```javascript
it('should complete simple flow: Intro -> Choose Style -> Smart Budget -> Success', async () => {
  // Test complete user journey
  // 1. Select "Keep It Simple"
  // 2. Choose "Smart Budget"
  // 3. Continue through screens
  // 4. Complete onboarding
  // Verify AsyncStorage is set correctly
});
```

## Test Coverage

The tests cover:

- ✅ Component rendering and props
- ✅ User interactions (button presses, navigation)
- ✅ AsyncStorage operations
- ✅ Loading and disabled states
- ✅ Error handling
- ✅ Context integration
- ✅ Route parameter handling
- ✅ Complete user flows

## Mocking

The test suite includes mocks for:

- `@react-native-async-storage/async-storage` - AsyncStorage operations
- `@react-navigation/native` - React Navigation
- `react-native-safe-area-context` - Safe area handling
- `expo-status-bar` - Status bar component
- `@expo/vector-icons` - Icon components
- Firebase configuration

## Best Practices

1. **Always clear mocks before each test**
   ```javascript
   beforeEach(() => {
     jest.clearAllMocks();
     AsyncStorage.clear();
   });
   ```

2. **Use `waitFor` for async operations**
   ```javascript
   await waitFor(() => {
     expect(AsyncStorage.setItem).toHaveBeenCalled();
   });
   ```

3. **Test user behavior, not implementation**
   - Focus on what users see and do
   - Don't test internal state unless necessary

4. **Use descriptive test names**
   ```javascript
   it('should show loading indicator while completing onboarding', async () => {
     // Test implementation
   });
   ```

## Troubleshooting

### Tests fail with "Cannot find module"

Make sure all dependencies are installed:
```bash
npm install
```

### Tests timeout

Increase the timeout for async operations:
```javascript
jest.setTimeout(10000); // 10 seconds
```

### AsyncStorage mock not working

Verify `jest.setup.js` is configured correctly in `package.json`:
```json
{
  "jest": {
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"]
  }
}
```

## Contributing

When adding new tests:

1. Place them in the appropriate directory (`components/` or `onboarding/`)
2. Follow the existing naming convention (`*.test.js`)
3. Include descriptive test names
4. Test both success and error cases
5. Clean up mocks in `beforeEach`
6. Update this README if adding new test categories

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

## Future Improvements

- [ ] Add integration tests for complete app flows
- [ ] Add snapshot testing for UI components
- [ ] Add performance testing
- [ ] Increase coverage to 90%+
- [ ] Add visual regression testing
