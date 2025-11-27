#!/usr/bin/env node

/**
 * Manual test runner for receipt parser
 * Since jest-expo has compatibility issues with Node 22,
 * we'll run a subset of tests manually to verify functionality
 */

// Import the functions
import { extractAmount, extractMerchant, extractDate } from './src/ocr/receiptParser.js';

// Test counter
let passed = 0;
let failed = 0;
const failures = [];

// Helper function to run a test
function test(description, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${description}`);
  } catch (error) {
    failed++;
    failures.push({ description, error: error.message });
    console.log(`✗ ${description}`);
    console.log(`  ${error.message}`);
  }
}

// Helper function for assertions
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`Expected null but got ${actual}`);
      }
    },
    toMatch: (pattern) => {
      if (!pattern.test(actual)) {
        throw new Error(`Expected ${actual} to match ${pattern}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected ${actual} to be truthy`);
      }
    },
    not: {
      toBe: (expected) => {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      },
    },
  };
}

console.log('\n=== Testing extractAmount ===\n');

test('should extract amount from "TOTAL $45.32"', () => {
  expect(extractAmount('TOTAL $45.32')).toBe(45.32);
});

test('should extract amount from "Amount: 23.50"', () => {
  expect(extractAmount('Amount: 23.50')).toBe(23.50);
});

test('should extract total from multi-line receipt', () => {
  const text = `
    SUBTOTAL: 100.00
    TAX: 8.50
    TOTAL: 108.50
  `;
  expect(extractAmount(text)).toBe(108.50);
});

test('should handle European format "45,32 EUR"', () => {
  expect(extractAmount('45,32 EUR')).toBe(45.32);
});

test('should return null when no amount found', () => {
  expect(extractAmount('This is some text with no amounts')).toBeNull();
});

test('should extract from grocery receipt', () => {
  const text = `
    WALMART SUPERCENTER
    MILK           $3.99
    BREAD          $2.49
    SUBTOTAL      $11.47
    TAX            $0.92
    TOTAL         $12.39
  `;
  expect(extractAmount(text)).toBe(12.39);
});

test('should handle format with thousands separator', () => {
  expect(extractAmount('TOTAL: $1,234.56')).toBe(1234.56);
});

test('should extract Grand Total from restaurant receipt', () => {
  const text = `
    PASTA          $15.99
    TOTAL          $33.77
    TIP            $6.75
    GRAND TOTAL    $40.52
  `;
  expect(extractAmount(text)).toBe(40.52);
});

console.log('\n=== Testing extractMerchant ===\n');

test('should extract merchant from first non-empty line', () => {
  const text = `
    WALMART
    STORE #1234
    123 Main St
  `;
  expect(extractMerchant(text)).toBe('WALMART');
});

test('should clean up store numbers', () => {
  const text = 'WALMART STORE #1234\n123 Main St';
  expect(extractMerchant(text)).toBe('WALMART STORE');
});

test('should clean up store numbers "TARGET #5678"', () => {
  const text = 'TARGET #5678\nAddress';
  expect(extractMerchant(text)).toBe('TARGET');
});

test('should return "Unknown Merchant" for empty string', () => {
  expect(extractMerchant('')).toBe('Unknown Merchant');
});

test('should skip special characters at start', () => {
  const text = '***\n===\nSHELL STATION\n123 Main St';
  expect(extractMerchant(text)).toBe('SHELL STATION');
});

test('should handle merchant with apostrophe', () => {
  const text = "MACY'S\nDepartment Store";
  expect(extractMerchant(text)).toBe("MACY'S");
});

console.log('\n=== Testing extractDate ===\n');

test('should extract date in MM/DD/YYYY format', () => {
  const text = 'Date: 11/19/2025';
  const result = extractDate(text);
  expect(result).toMatch(/2025-11-19/);
});

test('should extract date in text format "Nov 19, 2025"', () => {
  const text = 'Date: Nov 19, 2025';
  const result = extractDate(text);
  expect(result).toMatch(/2025-11-19/);
});

test('should extract date in text format "November 19, 2025"', () => {
  const text = 'Date: November 19, 2025';
  const result = extractDate(text);
  expect(result).toMatch(/2025-11-19/);
});

test('should extract date in ISO format', () => {
  const text = 'Date: 2025-11-19';
  const result = extractDate(text);
  expect(result).toMatch(/2025-11-19/);
});

test('should extract date in MM/DD/YY format', () => {
  const text = 'Date: 11/19/25';
  const result = extractDate(text);
  expect(result).toMatch(/2025-11-19/);
});

test('should return current date if no date found', () => {
  const text = 'This receipt has no date';
  const result = extractDate(text);
  expect(result).toBeTruthy();
  expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('should extract date from European format', () => {
  const text = 'Date: 19.11.2025';
  const result = extractDate(text);
  expect(result).toMatch(/2025-11-19/);
});

console.log('\n=== Integration Tests ===\n');

test('should extract all fields from complete receipt', () => {
  const receipt = `
    WALMART SUPERCENTER
    STORE #1234
    Date: 11/19/2025

    MILK           $3.99
    BREAD          $2.49
    TOTAL         $12.39
  `;

  expect(extractMerchant(receipt)).toBe('WALMART SUPERCENTER');
  expect(extractAmount(receipt)).toBe(12.39);
  expect(extractDate(receipt)).toMatch(/2025-11-19/);
});

test('should extract from restaurant receipt', () => {
  const receipt = `
    OLIVE GARDEN
    Nov 19, 2025
    PASTA          $15.99
    TOTAL          $33.77
  `;

  expect(extractMerchant(receipt)).toBe('OLIVE GARDEN');
  expect(extractAmount(receipt)).toBe(33.77);
  expect(extractDate(receipt)).toMatch(/2025-11-19/);
});

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\nFailed tests:');
  failures.forEach(({ description, error }) => {
    console.log(`  - ${description}`);
    console.log(`    ${error}`);
  });
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
