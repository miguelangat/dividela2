# Test Fixtures

This directory contains test fixtures and sample data for testing the OCR receipt scanning and expense tracking features.

## Directory Structure

```
test-fixtures/
├── ocr-responses/          # Mock OCR API responses
│   ├── grocery-receipt.json
│   ├── restaurant-receipt.json
│   ├── gas-station-receipt.json
│   ├── coffee-shop-receipt.json
│   ├── pharmacy-receipt.json
│   └── poor-quality-receipt.json
├── sample-receipts/        # Sample receipt data and metadata
│   └── sample-expenses.json
├── merchant-aliases/       # Merchant recognition data
│   └── merchants.json
└── README.md              # This file
```

## OCR Responses

Located in `ocr-responses/`, these JSON files contain mock responses from OCR processing of various receipt types:

### grocery-receipt.json
- **Merchant**: Whole Foods Market
- **Amount**: $87.45
- **Confidence**: 95%
- **Use Case**: Testing successful OCR with high confidence
- **Items**: Multiple grocery items with individual prices

### restaurant-receipt.json
- **Merchant**: The Italian Place
- **Amount**: $125.50
- **Confidence**: 92%
- **Use Case**: Testing restaurant receipts with tax and tip
- **Special Fields**: Subtotal, tax, tip breakdown

### gas-station-receipt.json
- **Merchant**: Shell Gas Station
- **Amount**: $52.30
- **Confidence**: 89%
- **Use Case**: Testing fuel purchases
- **Special Fields**: Gallons, price per gallon

### coffee-shop-receipt.json
- **Merchant**: Starbucks Coffee
- **Amount**: $15.75
- **Confidence**: 94%
- **Use Case**: Testing receipts with discounts
- **Special Fields**: Subtotal, discount amount

### pharmacy-receipt.json
- **Merchant**: CVS Pharmacy
- **Amount**: $43.98
- **Confidence**: 91%
- **Use Case**: Testing health-related purchases
- **Category**: Health & Wellness

### poor-quality-receipt.json
- **Merchant**: Unknown
- **Amount**: 0
- **Confidence**: 45%
- **Use Case**: Testing low-quality OCR results requiring manual review
- **Special**: Contains errors array and requiresManualReview flag

## Sample Receipts

Located in `sample-receipts/sample-expenses.json`, this file contains:

- **sampleExpenses**: Array of complete expense objects with OCR data
- **testScenarios**: Predefined test scenarios for different use cases
  - Successful OCR
  - Low confidence results
  - Partial extraction
  - Receipts with discounts
  - Receipts with tips

Each expense includes:
- Expense metadata (id, amount, merchant, category, date)
- Payment information (paidBy, splitType)
- OCR data (confidence, extracted fields)
- Receipt URL reference

## Merchant Aliases

Located in `merchant-aliases/merchants.json`, this file contains:

- **merchants**: Array of canonical merchant names with their aliases
  - Canonical name (standardized merchant name)
  - Aliases (variations and common misspellings)
  - Default category for the merchant

- **categoryMappings**: Maps merchant categories to app categories
  - Supports multiple category levels
  - Helps with automatic category suggestion

## Usage in Tests

### Importing Test Data

```javascript
// Import OCR response fixtures
import groceryReceipt from '../../../test-fixtures/ocr-responses/grocery-receipt.json';
import poorQualityReceipt from '../../../test-fixtures/ocr-responses/poor-quality-receipt.json';

// Import sample expenses
import { sampleExpenses, testScenarios } from '../../../test-fixtures/sample-receipts/sample-expenses.json';

// Import merchant data
import { merchants, categoryMappings } from '../../../test-fixtures/merchant-aliases/merchants.json';
```

### Using Mock Services

```javascript
import {
  mockProcessReceipt,
  mockRecognizeMerchant,
  simulateLowConfidence,
} from '../__tests__/mocks/ocrServiceMock';

// Test successful OCR
const result = await mockProcessReceipt('file://receipt.jpg', { type: 'grocery' });

// Test low confidence scenario
simulateLowConfidence();
const lowConfResult = await mockProcessReceipt('file://receipt.jpg');

// Test merchant recognition
const merchant = mockRecognizeMerchant('whole foods');
```

## Test Scenarios

### High Confidence OCR
Use `grocery-receipt.json` or `coffee-shop-receipt.json` for testing successful OCR processing.

### Low Confidence / Manual Review
Use `poor-quality-receipt.json` to test error handling and manual review workflows.

### Special Cases
- **With Tip**: Use `restaurant-receipt.json`
- **With Discount**: Use `coffee-shop-receipt.json`
- **Fuel Purchase**: Use `gas-station-receipt.json`

### Merchant Recognition
Test fuzzy matching and alias resolution using the merchant aliases data.

### Category Suggestion
Test automatic category suggestion based on merchant name and items.

## Adding New Test Data

To add new test fixtures:

1. **OCR Response**: Create a new JSON file in `ocr-responses/`
   - Include: merchant, amount, date, confidence, rawText, items
   - Optional: subtotal, tax, tip, discount

2. **Sample Expense**: Add to `sample-receipts/sample-expenses.json`
   - Include all expense fields
   - Include OCR data
   - Add to testScenarios if it represents a new use case

3. **Merchant Alias**: Update `merchant-aliases/merchants.json`
   - Add canonical name
   - List all known aliases
   - Specify default category

## Best Practices

1. **Keep fixtures realistic**: Base test data on actual receipt formats
2. **Cover edge cases**: Include both success and failure scenarios
3. **Maintain consistency**: Use consistent field names and structures
4. **Document special cases**: Add comments for non-obvious test data
5. **Update this README**: Document new fixtures and their use cases

## Notes

- All monetary amounts are in USD
- Dates are in YYYY-MM-DD or MM/DD/YYYY format
- Confidence values are between 0 and 1 (or 0-100%)
- File paths in test data use `test://` or `file://` protocols
