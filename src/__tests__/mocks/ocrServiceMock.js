/**
 * Mock OCR Service for testing receipt scanning features
 */

import groceryReceipt from '../../../test-fixtures/ocr-responses/grocery-receipt.json';
import restaurantReceipt from '../../../test-fixtures/ocr-responses/restaurant-receipt.json';
import gasReceipt from '../../../test-fixtures/ocr-responses/gas-station-receipt.json';
import coffeeReceipt from '../../../test-fixtures/ocr-responses/coffee-shop-receipt.json';
import pharmacyReceipt from '../../../test-fixtures/ocr-responses/pharmacy-receipt.json';
import poorQualityReceipt from '../../../test-fixtures/ocr-responses/poor-quality-receipt.json';

// Mock receipt responses mapped by type
const MOCK_RECEIPTS = {
  grocery: groceryReceipt,
  restaurant: restaurantReceipt,
  gas: gasReceipt,
  coffee: coffeeReceipt,
  pharmacy: pharmacyReceipt,
  poorQuality: poorQualityReceipt,
};

/**
 * Mock OCR processing function
 */
export const mockProcessReceipt = jest.fn(async (imageUri, options = {}) => {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, options.delay || 1000));

  // Determine which mock receipt to return based on URI or options
  const receiptType = options.type || 'grocery';
  const mockReceipt = MOCK_RECEIPTS[receiptType] || groceryReceipt;

  // Simulate error if specified
  if (options.simulateError) {
    throw new Error(options.errorMessage || 'OCR processing failed');
  }

  // Return mock OCR result
  return {
    success: true,
    data: mockReceipt,
    processingTime: options.delay || 1000,
    imageUri,
  };
});

/**
 * Mock merchant recognition function
 */
export const mockRecognizeMerchant = jest.fn((merchantText) => {
  const merchantLower = merchantText.toLowerCase().trim();

  // Simple matching logic for common merchants
  const merchantMap = {
    'whole foods': 'Whole Foods Market',
    'starbucks': 'Starbucks Coffee',
    'shell': 'Shell Gas Station',
    'cvs': 'CVS Pharmacy',
    'target': 'Target',
    'mcdonalds': "McDonald's",
    'amazon': 'Amazon',
    'costco': 'Costco',
    'walgreens': 'Walgreens',
    'uber': 'Uber',
  };

  for (const [key, value] of Object.entries(merchantMap)) {
    if (merchantLower.includes(key)) {
      return {
        canonicalName: value,
        confidence: 0.9,
        matched: true,
      };
    }
  }

  return {
    canonicalName: merchantText,
    confidence: 0.5,
    matched: false,
  };
});

/**
 * Mock category suggestion function
 */
export const mockSuggestCategory = jest.fn((merchantName, items = []) => {
  const merchantLower = merchantName.toLowerCase();

  // Category mapping based on merchant
  if (merchantLower.includes('whole foods') || merchantLower.includes('costco')) {
    return { category: 'Groceries', confidence: 0.95 };
  }
  if (merchantLower.includes('starbucks') || merchantLower.includes('restaurant')) {
    return { category: 'Dining', confidence: 0.92 };
  }
  if (merchantLower.includes('shell') || merchantLower.includes('gas')) {
    return { category: 'Transportation', confidence: 0.90 };
  }
  if (merchantLower.includes('cvs') || merchantLower.includes('pharmacy')) {
    return { category: 'Health', confidence: 0.88 };
  }
  if (merchantLower.includes('target') || merchantLower.includes('amazon')) {
    return { category: 'Shopping', confidence: 0.85 };
  }

  return { category: 'Other', confidence: 0.5 };
});

/**
 * Mock text extraction function
 */
export const mockExtractText = jest.fn(async (imageUri) => {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    text: 'Sample extracted text from receipt',
    blocks: [
      { text: 'MERCHANT NAME', confidence: 0.95 },
      { text: 'Total: $99.99', confidence: 0.92 },
      { text: 'Date: 11/19/2025', confidence: 0.88 },
    ],
  };
});

/**
 * Mock amount extraction function
 */
export const mockExtractAmount = jest.fn((text) => {
  const amountRegex = /\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  const matches = text.match(amountRegex);

  if (matches && matches.length > 0) {
    // Usually the last amount is the total
    const lastMatch = matches[matches.length - 1];
    const amount = parseFloat(lastMatch.replace(/[$,\s]/g, ''));
    return {
      amount,
      confidence: 0.90,
      rawText: lastMatch,
    };
  }

  return null;
});

/**
 * Mock date extraction function
 */
export const mockExtractDate = jest.fn((text) => {
  // Simple date pattern matching
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
    /(\d{4})-(\d{2})-(\d{2})/,         // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/,    // MM-DD-YYYY
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        date: match[0],
        confidence: 0.85,
      };
    }
  }

  return null;
});

/**
 * Helper to simulate OCR processing failure
 */
export const simulateOCRFailure = (errorMessage = 'OCR processing failed') => {
  mockProcessReceipt.mockRejectedValueOnce(new Error(errorMessage));
};

/**
 * Helper to simulate low confidence result
 */
export const simulateLowConfidence = () => {
  mockProcessReceipt.mockResolvedValueOnce({
    success: true,
    data: poorQualityReceipt,
    processingTime: 1000,
  });
};

/**
 * Helper to reset all OCR mocks
 */
export const resetOCRMocks = () => {
  mockProcessReceipt.mockClear();
  mockRecognizeMerchant.mockClear();
  mockSuggestCategory.mockClear();
  mockExtractText.mockClear();
  mockExtractAmount.mockClear();
  mockExtractDate.mockClear();
};

export default {
  mockProcessReceipt,
  mockRecognizeMerchant,
  mockSuggestCategory,
  mockExtractText,
  mockExtractAmount,
  mockExtractDate,
  MOCK_RECEIPTS,
  simulateOCRFailure,
  simulateLowConfidence,
  resetOCRMocks,
};
