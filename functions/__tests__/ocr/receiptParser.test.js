/**
 * Receipt Parser Tests (TDD)
 * Testing receipt text parsing and data extraction
 *
 * These tests will FAIL initially - this is expected in TDD!
 * We write tests first, then implement the functionality.
 */

const sampleReceipts = require('../fixtures/sampleReceipts');

// Import the module we're testing (doesn't exist yet!)
const receiptParser = require('../../src/ocr/receiptParser');

describe('Receipt Parser', () => {
  describe('extractAmount', () => {
    test('should extract amount from grocery receipt', () => {
      const ocrResult = sampleReceipts.grocery_receipt;
      const amount = receiptParser.extractAmount(ocrResult);

      expect(amount).toBe(23.14);
    });

    test('should extract amount from restaurant receipt', () => {
      const ocrResult = sampleReceipts.restaurant_receipt;
      const amount = receiptParser.extractAmount(ocrResult);

      expect(amount).toBe(105.84);
    });

    test('should extract amount from gas station receipt', () => {
      const ocrResult = sampleReceipts.gas_station_receipt;
      const amount = receiptParser.extractAmount(ocrResult);

      expect(amount).toBe(43.27);
    });

    test('should extract amount from receipt with only total visible', () => {
      const ocrResult = sampleReceipts.total_only_receipt;
      const amount = receiptParser.extractAmount(ocrResult);

      expect(amount).toBe(45.67);
    });

    test('should handle poor quality OCR text', () => {
      const ocrResult = sampleReceipts.poor_quality_receipt;
      const amount = receiptParser.extractAmount(ocrResult);

      // Should still extract the total even with messy text
      expect(amount).toBe(13.29);
    });

    test('should return null when no amount found', () => {
      const ocrResult = sampleReceipts.empty_receipt;
      const amount = receiptParser.extractAmount(ocrResult);

      expect(amount).toBeNull();
    });

    test('should prioritize TOTAL over subtotal', () => {
      const ocrResult = sampleReceipts.grocery_receipt;
      const amount = receiptParser.extractAmount(ocrResult);

      // Should extract $23.14 (TOTAL), not $21.62 (SUBTOTAL)
      expect(amount).toBe(23.14);
    });

    test('should handle international currency symbols', () => {
      const ocrResult = sampleReceipts.international_receipt;
      const amount = receiptParser.extractAmount(ocrResult);

      expect(amount).toBe(6.70);
    });
  });

  describe('extractMerchantName', () => {
    test('should extract merchant from grocery receipt', () => {
      const ocrResult = sampleReceipts.grocery_receipt;
      const merchant = receiptParser.extractMerchantName(ocrResult);

      expect(merchant).toBe('WHOLE FOODS MARKET');
    });

    test('should extract merchant from restaurant receipt', () => {
      const ocrResult = sampleReceipts.restaurant_receipt;
      const merchant = receiptParser.extractMerchantName(ocrResult);

      expect(merchant).toBe('The Garden Bistro');
    });

    test('should extract merchant from gas station receipt', () => {
      const ocrResult = sampleReceipts.gas_station_receipt;
      const merchant = receiptParser.extractMerchantName(ocrResult);

      expect(merchant).toBe('SHELL');
    });

    test('should extract merchant from pharmacy receipt', () => {
      const ocrResult = sampleReceipts.pharmacy_receipt;
      const merchant = receiptParser.extractMerchantName(ocrResult);

      expect(merchant).toBe('CVS PHARMACY');
    });

    test('should extract merchant from coffee shop receipt', () => {
      const ocrResult = sampleReceipts.coffee_shop_receipt;
      const merchant = receiptParser.extractMerchantName(ocrResult);

      expect(merchant).toBe('BLUE BOTTLE COFFEE');
    });

    test('should return null when no merchant found', () => {
      const ocrResult = sampleReceipts.empty_receipt;
      const merchant = receiptParser.extractMerchantName(ocrResult);

      expect(merchant).toBeNull();
    });

    test('should handle poor quality text', () => {
      const ocrResult = sampleReceipts.poor_quality_receipt;
      const merchant = receiptParser.extractMerchantName(ocrResult);

      // Might extract "ST0RE" or return null - either is acceptable
      expect(merchant === null || typeof merchant === 'string').toBe(true);
    });
  });

  describe('extractDate', () => {
    test('should extract date from grocery receipt', () => {
      const ocrResult = sampleReceipts.grocery_receipt;
      const date = receiptParser.extractDate(ocrResult);

      expect(date).toBeInstanceOf(Date);
      expect(date.getMonth()).toBe(10); // November (0-indexed)
      expect(date.getDate()).toBe(15);
      expect(date.getFullYear()).toBe(2025);
    });

    test('should extract date from restaurant receipt', () => {
      const ocrResult = sampleReceipts.restaurant_receipt;
      const date = receiptParser.extractDate(ocrResult);

      expect(date).toBeInstanceOf(Date);
      expect(date.getMonth()).toBe(10); // November
      expect(date.getDate()).toBe(18);
    });

    test('should extract date from gas station receipt', () => {
      const ocrResult = sampleReceipts.gas_station_receipt;
      const date = receiptParser.extractDate(ocrResult);

      expect(date).toBeInstanceOf(Date);
      expect(date.getMonth()).toBe(10); // November
      expect(date.getDate()).toBe(19);
    });

    test('should handle international date format (DD/MM/YYYY)', () => {
      const ocrResult = sampleReceipts.international_receipt;
      const date = receiptParser.extractDate(ocrResult);

      expect(date).toBeInstanceOf(Date);
      expect(date.getMonth()).toBe(10); // November
      expect(date.getDate()).toBe(15);
    });

    test('should return null when no date found', () => {
      const ocrResult = sampleReceipts.empty_receipt;
      const date = receiptParser.extractDate(ocrResult);

      expect(date).toBeNull();
    });

    test('should default to current date if extraction fails', () => {
      const ocrResult = { textAnnotations: [{ description: 'No date here' }] };
      const date = receiptParser.extractDate(ocrResult);

      // Should return current date as fallback
      const today = new Date();
      expect(date).toBeInstanceOf(Date);
      expect(date.getDate()).toBe(today.getDate());
    });
  });

  describe('parseReceipt', () => {
    test('should parse all fields from complete receipt', () => {
      const ocrResult = sampleReceipts.grocery_receipt;
      const parsed = receiptParser.parseReceipt(ocrResult);

      expect(parsed).toHaveProperty('amount', 23.14);
      expect(parsed).toHaveProperty('merchant', 'WHOLE FOODS MARKET');
      expect(parsed).toHaveProperty('date');
      expect(parsed.date).toBeInstanceOf(Date);
      expect(parsed).toHaveProperty('rawText');
      expect(parsed).toHaveProperty('confidence');
    });

    test('should include confidence score', () => {
      const ocrResult = sampleReceipts.restaurant_receipt;
      const parsed = receiptParser.parseReceipt(ocrResult);

      expect(parsed.confidence).toBeGreaterThan(0);
      expect(parsed.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle partial data gracefully', () => {
      const ocrResult = sampleReceipts.total_only_receipt;
      const parsed = receiptParser.parseReceipt(ocrResult);

      expect(parsed.amount).toBe(45.67);
      expect(parsed.merchant).toBeTruthy(); // Should extract something or be null
      expect(parsed.date).toBeInstanceOf(Date);
    });

    test('should extract items list if present', () => {
      const ocrResult = sampleReceipts.grocery_receipt;
      const parsed = receiptParser.parseReceipt(ocrResult);

      // Optional feature - may or may not be implemented
      if (parsed.items) {
        expect(Array.isArray(parsed.items)).toBe(true);
        expect(parsed.items.length).toBeGreaterThan(0);
      }
    });

    test('should include raw OCR text', () => {
      const ocrResult = sampleReceipts.grocery_receipt;
      const parsed = receiptParser.parseReceipt(ocrResult);

      expect(parsed.rawText).toContain('WHOLE FOODS');
      expect(typeof parsed.rawText).toBe('string');
    });

    test('should return structured error for empty receipt', () => {
      const ocrResult = sampleReceipts.empty_receipt;
      const parsed = receiptParser.parseReceipt(ocrResult);

      expect(parsed).toHaveProperty('error');
      expect(parsed.error).toBeTruthy();
    });
  });

  describe('suggestCategory', () => {
    test('should suggest "groceries" for grocery stores', () => {
      const merchant = 'WHOLE FOODS MARKET';
      const category = receiptParser.suggestCategory(merchant);

      expect(category).toBe('groceries');
    });

    test('should suggest "dining" for restaurants', () => {
      const merchant = 'The Garden Bistro';
      const category = receiptParser.suggestCategory(merchant);

      expect(category).toBe('dining');
    });

    test('should suggest "transportation" for gas stations', () => {
      const merchant = 'SHELL';
      const category = receiptParser.suggestCategory(merchant);

      expect(category).toBe('transportation');
    });

    test('should suggest "healthcare" for pharmacies', () => {
      const merchant = 'CVS PHARMACY';
      const category = receiptParser.suggestCategory(merchant);

      expect(category).toBe('healthcare');
    });

    test('should suggest "dining" for coffee shops', () => {
      const merchant = 'BLUE BOTTLE COFFEE';
      const category = receiptParser.suggestCategory(merchant);

      expect(category).toBe('dining');
    });

    test('should return "other" for unknown merchants', () => {
      const merchant = 'UNKNOWN STORE XYZ';
      const category = receiptParser.suggestCategory(merchant);

      expect(category).toBe('other');
    });

    test('should handle null merchant', () => {
      const category = receiptParser.suggestCategory(null);

      expect(category).toBe('other');
    });
  });

  describe('ReDoS Protection', () => {
    test('should handle very long input (10KB+) without hanging', () => {
      // Create a 15KB string that could cause ReDoS with unbounded quantifiers
      const maliciousInput = 'total:' + ' '.repeat(15000) + '100.00';

      const startTime = Date.now();
      const amount = receiptParser.extractAmount(maliciousInput);
      const endTime = Date.now();

      // Should complete in under 1 second
      expect(endTime - startTime).toBeLessThan(1000);
      // Should still extract amount or return null
      expect(amount === null || typeof amount === 'number').toBe(true);
    });

    test('should reject amounts over $999,999', () => {
      const text = 'TOTAL: $1500000.00';
      const amount = receiptParser.extractAmount(text);

      // Should reject amounts over the limit
      expect(amount).toBeNull();
    });

    test('should reject negative amounts', () => {
      const text = 'TOTAL: -$50.00';
      const amount = receiptParser.extractAmount(text);

      // Should not extract negative amounts
      expect(amount).toBeNull();
    });

    test('should handle malicious regex input (repeated characters)', () => {
      // String designed to cause catastrophic backtracking
      const maliciousInput = 'total:::::::::::::::::::::::::::::::::::::::::::' +
                             '$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$' +
                             '                                               ' +
                             '123.45';

      const startTime = Date.now();
      const amount = receiptParser.extractAmount(maliciousInput);
      const endTime = Date.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100);
      expect(amount === null || amount === 123.45).toBe(true);
    });

    test('should truncate text longer than 10KB', () => {
      // Create a 20KB string
      const largeText = 'MERCHANT NAME\n' + 'x'.repeat(20000) + '\nTOTAL: $50.00';

      const result = receiptParser.parseReceipt(largeText);

      // Should still process without hanging
      expect(result).toBeDefined();
      expect(result.rawText).toBeDefined();
    });

    test('should limit merchant name length', () => {
      // Create a very long merchant name (300 chars)
      const longMerchantText = 'A'.repeat(300) + '\nTOTAL: $50.00';

      const merchant = receiptParser.extractMerchantName(longMerchantText);

      // Should limit to 200 characters
      if (merchant !== null) {
        expect(merchant.length).toBeLessThanOrEqual(200);
      }
    });

    test('should validate date ranges', () => {
      // Test dates outside reasonable range
      const futureDateText = 'Date: 01/01/2150\nTOTAL: $50.00';
      const pastDateText = 'Date: 01/01/1850\nTOTAL: $50.00';

      const futureDate = receiptParser.extractDate(futureDateText);
      const pastDate = receiptParser.extractDate(pastDateText);

      // Should reject dates outside 1900-2100 range
      if (futureDate && futureDate instanceof Date) {
        expect(futureDate.getFullYear()).toBeLessThanOrEqual(2100);
      }
      if (pastDate && pastDate instanceof Date) {
        expect(pastDate.getFullYear()).toBeGreaterThanOrEqual(1900);
      }
    });
  });
});
