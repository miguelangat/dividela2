# Dividela Cloud Functions

Firebase Cloud Functions for receipt OCR processing and ML-powered expense categorization.

## Setup

This functions directory has been initialized with a Test-Driven Development (TDD) infrastructure.

### Directory Structure

```
functions/
├── src/                          # Source code
│   ├── ocr/                      # OCR processing functions
│   ├── ml/                       # Machine learning functions
│   ├── scheduled/                # Scheduled/cron functions
│   └── index.js                  # Main entry point
├── __tests__/                    # Test files
│   ├── ocr/                      # OCR tests
│   │   └── receiptParser.test.js # Receipt parser tests (TDD)
│   ├── ml/                       # ML tests
│   ├── fixtures/                 # Test data
│   │   ├── sampleReceipts.js    # Sample OCR responses
│   │   └── sampleExpenses.js    # Sample expense data
│   ├── mocks/                    # Mock implementations
│   │   ├── firebase-admin.js    # Firebase Admin mock
│   │   └── firebase-functions.js # Firebase Functions mock
│   └── setup.js                  # Jest test setup
├── package.json                  # Dependencies and scripts
├── jest.config.js                # Jest configuration
└── .gitignore                    # Git ignore rules
```

## Dependencies

### Production
- **firebase-functions** - Cloud Functions SDK
- **firebase-admin** - Firebase Admin SDK (Firestore, Storage)
- **@google-cloud/vision** - Google Cloud Vision API for OCR
- **string-similarity** - Text similarity matching for merchant categorization

### Development
- **jest** - Testing framework
- **@types/jest** - TypeScript definitions for Jest

## Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Start Firebase emulators
npm run serve

# Deploy functions to Firebase
npm run deploy

# View function logs
npm run logs

# Interactive shell for testing functions
npm run shell
```

## TDD Approach

This project follows Test-Driven Development:

1. **Write failing tests first** - Tests are written before implementation
2. **Implement minimal code** - Write just enough code to pass the tests
3. **Refactor** - Improve code while keeping tests passing

### Current Status

✅ **Initial Tests Written** - Receipt parser tests are ready but failing (expected!)
- Tests for `extractAmount()` - Extract total amount from receipt
- Tests for `extractMerchantName()` - Extract merchant/store name
- Tests for `extractDate()` - Extract receipt date
- Tests for `parseReceipt()` - Parse complete receipt data
- Tests for `suggestCategory()` - Suggest expense category

❌ **Implementation Pending** - Next step is to implement the receipt parser module

## Testing

### Running Tests

```bash
cd functions
npm test
```

Expected output on first run:
```
FAIL __tests__/ocr/receiptParser.test.js
  ● Test suite failed to run
    Cannot find module '../../src/ocr/receiptParser'
```

This is **expected behavior** in TDD! The tests are written, now we implement the code.

### Test Fixtures

Sample data is available in `__tests__/fixtures/`:

- **sampleReceipts.js** - Various receipt OCR responses
  - Grocery stores (Whole Foods, Target)
  - Restaurants (Garden Bistro)
  - Gas stations (Shell)
  - Pharmacies (CVS)
  - Coffee shops (Blue Bottle)
  - Poor quality OCR samples
  - International receipts

- **sampleExpenses.js** - Expense object examples
  - Valid expenses
  - Expenses with OCR data
  - Shared expenses
  - Invalid expense examples

### Mocks

Firebase services are mocked for testing:

- **firebase-admin.js** - Mocks Firestore and Storage
- **firebase-functions.js** - Mocks Cloud Functions triggers

## Next Steps

### 1. Implement Receipt Parser
Create `src/ocr/receiptParser.js` with:
- `extractAmount(ocrResult)` - Extract total from receipt text
- `extractMerchantName(ocrResult)` - Extract merchant name
- `extractDate(ocrResult)` - Extract receipt date
- `parseReceipt(ocrResult)` - Parse complete receipt
- `suggestCategory(merchant)` - Suggest category based on merchant

### 2. Implement Cloud Functions
- `processReceipt` - HTTPS callable function for receipt upload
- `onReceiptUpload` - Storage trigger for automatic OCR
- `categorizeExpense` - ML-based expense categorization
- `monthlyReport` - Scheduled function for monthly summaries

### 3. Add More Tests
- Integration tests for cloud functions
- Tests for ML categorization
- Tests for scheduled functions

### 4. Deploy
```bash
npm run deploy
```

## Environment Variables

Required environment variables (set via Firebase config):
- `GCLOUD_PROJECT` - GCP project ID
- Add others as needed for Vision API, etc.

## Code Coverage

Target coverage: 70% (configured in jest.config.js)
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

Run `npm run test:coverage` to generate coverage report.

## Documentation

- [Firebase Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Google Cloud Vision API](https://cloud.google.com/vision/docs)
- [Jest Testing Framework](https://jestjs.io/)
