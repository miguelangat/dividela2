/**
 * Test Fixtures Index
 *
 * Centralized exports for all test fixtures.
 * Import test data from this file for consistency.
 */

// OCR Response Fixtures
import groceryReceiptData from './ocr-responses/grocery-receipt.json';
import restaurantReceiptData from './ocr-responses/restaurant-receipt.json';
import gasReceiptData from './ocr-responses/gas-station-receipt.json';
import coffeeReceiptData from './ocr-responses/coffee-shop-receipt.json';
import pharmacyReceiptData from './ocr-responses/pharmacy-receipt.json';
import poorQualityReceiptData from './ocr-responses/poor-quality-receipt.json';
import sampleExpensesData from './sample-receipts/sample-expenses.json';
import merchantDataFile from './merchant-aliases/merchants.json';

export const groceryReceipt = groceryReceiptData;
export const restaurantReceipt = restaurantReceiptData;
export const gasReceipt = gasReceiptData;
export const coffeeReceipt = coffeeReceiptData;
export const pharmacyReceipt = pharmacyReceiptData;
export const poorQualityReceipt = poorQualityReceiptData;
export const sampleExpenses = sampleExpensesData;
export const merchantData = merchantDataFile;

// Grouped exports for convenience
export const ocrFixtures = {
  grocery: groceryReceiptData,
  restaurant: restaurantReceiptData,
  gas: gasReceiptData,
  coffee: coffeeReceiptData,
  pharmacy: pharmacyReceiptData,
  poorQuality: poorQualityReceiptData,
};

export const testReceipts = [
  groceryReceiptData,
  restaurantReceiptData,
  gasReceiptData,
  coffeeReceiptData,
  pharmacyReceiptData,
];

/**
 * Helper function to get a random test receipt
 */
export const getRandomReceipt = () => {
  const receipts = testReceipts;
  return receipts[Math.floor(Math.random() * receipts.length)];
};

/**
 * Helper function to get a receipt by type
 */
export const getReceiptByType = (type) => {
  return ocrFixtures[type] || groceryReceiptData;
};
