# Test Fixtures Quick Start Guide

## Quick Import Examples

### Import All Fixtures

```javascript
// Import from centralized index
import {
  ocrFixtures,
  sampleExpenses,
  merchantData,
  getReceiptByType,
  getRandomReceipt,
} from '../../../test-fixtures';

// Use in tests
const groceryReceipt = getReceiptByType('grocery');
const randomReceipt = getRandomReceipt();
```

### Import Individual Fixtures

```javascript
// Individual OCR responses
import groceryReceipt from '../../../test-fixtures/ocr-responses/grocery-receipt.json';
import restaurantReceipt from '../../../test-fixtures/ocr-responses/restaurant-receipt.json';
```

### Import Mock Services

```javascript
// OCR Service Mock
import {
  mockProcessReceipt,
  mockRecognizeMerchant,
  simulateLowConfidence,
} from '../__tests__/mocks/ocrServiceMock';

// Firebase Storage Mock
import {
  mockUploadReceipt,
  simulateUploadFailure,
} from '../__tests__/mocks/firebaseStorageMock';

// Expo Modules Mock
import {
  mockImagePicker,
  simulateCameraPermissionDenied,
} from '../__tests__/mocks/expoModulesMock';
```

## Common Test Patterns

### Test Successful OCR

```javascript
it('should process receipt successfully', async () => {
  const result = await mockProcessReceipt('file://receipt.jpg', {
    type: 'grocery',
  });

  expect(result.success).toBe(true);
  expect(result.data.merchant).toBe('Whole Foods Market');
  expect(result.data.amount).toBe(87.45);
  expect(result.data.confidence).toBeGreaterThan(0.9);
});
```

### Test Low Confidence Scenario

```javascript
it('should handle low confidence OCR', async () => {
  simulateLowConfidence();
  const result = await mockProcessReceipt('file://receipt.jpg');

  expect(result.data.confidence).toBeLessThan(0.5);
  expect(result.data.requiresManualReview).toBe(true);
});
```

### Test Image Upload

```javascript
it('should upload receipt image', async () => {
  const result = await mockUploadReceipt(
    'file://receipt.jpg',
    'user123',
    'exp001'
  );

  expect(result.success).toBe(true);
  expect(result.url).toContain('storage.example.com');
});
```

### Test Permission Denial

```javascript
it('should handle camera permission denial', async () => {
  simulateCameraPermissionDenied();
  const result = await ImagePicker.requestCameraPermissionsAsync();

  expect(result.granted).toBe(false);
  expect(result.status).toBe('denied');
});
```

### Test Merchant Recognition

```javascript
it('should recognize merchant by name', () => {
  const result = mockRecognizeMerchant('whole foods market');

  expect(result.canonicalName).toBe('Whole Foods Market');
  expect(result.matched).toBe(true);
  expect(result.confidence).toBeGreaterThan(0.8);
});
```

## Available Test Data

### OCR Receipts (6 types)
- `grocery` - Whole Foods ($87.45, 95% confidence)
- `restaurant` - Italian Place ($125.50, 92% confidence, has tip)
- `gas` - Shell Station ($52.30, 89% confidence, fuel data)
- `coffee` - Starbucks ($15.75, 94% confidence, has discount)
- `pharmacy` - CVS ($43.98, 91% confidence)
- `poorQuality` - Unknown (0%, 45% confidence, errors)

### Merchants (10 configured)
- Whole Foods Market
- Starbucks Coffee
- Shell Gas Station
- CVS Pharmacy
- Target
- McDonald's
- Amazon
- Costco
- Walgreens
- Uber

## File Locations

- **Fixtures**: `/home/user/dividela2/test-fixtures/`
- **Mocks**: `/home/user/dividela2/src/__tests__/mocks/`
- **Tests**: `/home/user/dividela2/src/**/__tests__/`

## Need More Info?

- Full documentation: `test-fixtures/README.md`
- Setup summary: `OCR-TEST-SETUP-SUMMARY.md`
- Existing tests: `src/__tests__/README.md`
