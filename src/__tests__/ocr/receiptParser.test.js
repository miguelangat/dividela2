/**
 * Receipt Parser Test Suite
 * Following TDD methodology - tests written BEFORE implementation
 */

import {
  extractAmount,
  extractMerchant,
  extractDate,
} from '../../ocr/receiptParser';

describe('extractAmount', () => {
  describe('Basic amount extraction', () => {
    test('should extract amount from "TOTAL $45.32"', () => {
      const text = 'TOTAL $45.32';
      expect(extractAmount(text)).toBe(45.32);
    });

    test('should extract amount from "Amount: 23.50"', () => {
      const text = 'Amount: 23.50';
      expect(extractAmount(text)).toBe(23.50);
    });

    test('should extract amount from "SUBTOTAL: $100.00"', () => {
      const text = 'SUBTOTAL: $100.00';
      expect(extractAmount(text)).toBe(100.00);
    });

    test('should extract total from multi-line receipt with TOTAL, SUBTOTAL, and TAX', () => {
      const text = `
        SUBTOTAL: 100.00
        TAX: 8.50
        TOTAL: 108.50
      `;
      expect(extractAmount(text)).toBe(108.50);
    });

    test('should extract amount without dollar sign', () => {
      const text = 'Total: 75.99';
      expect(extractAmount(text)).toBe(75.99);
    });
  });

  describe('Different currency formats', () => {
    test('should handle European format with comma as decimal separator', () => {
      const text = '45,32 EUR';
      expect(extractAmount(text)).toBe(45.32);
    });

    test('should handle European format "Total: 123,45€"', () => {
      const text = 'Total: 123,45€';
      expect(extractAmount(text)).toBe(123.45);
    });

    test('should handle format with thousands separator "1,234.56"', () => {
      const text = 'TOTAL: $1,234.56';
      expect(extractAmount(text)).toBe(1234.56);
    });

    test('should handle European format with thousands separator "1.234,56"', () => {
      const text = 'Total: 1.234,56 EUR';
      expect(extractAmount(text)).toBe(1234.56);
    });
  });

  describe('Various receipt formats', () => {
    test('should extract from "Grand Total: $89.99"', () => {
      const text = 'Grand Total: $89.99';
      expect(extractAmount(text)).toBe(89.99);
    });

    test('should extract from "AMOUNT DUE: 56.78"', () => {
      const text = 'AMOUNT DUE: 56.78';
      expect(extractAmount(text)).toBe(56.78);
    });

    test('should extract from "Balance: $234.50"', () => {
      const text = 'Balance: $234.50';
      expect(extractAmount(text)).toBe(234.50);
    });

    test('should prioritize TOTAL over other amounts', () => {
      const text = `
        SUBTOTAL: 50.00
        DISCOUNT: -5.00
        TAX: 4.00
        TOTAL: 49.00
        CHANGE: 1.00
      `;
      expect(extractAmount(text)).toBe(49.00);
    });
  });

  describe('Edge cases and special scenarios', () => {
    test('should handle amounts with no spaces "Total:$25.99"', () => {
      const text = 'Total:$25.99';
      expect(extractAmount(text)).toBe(25.99);
    });

    test('should handle multiple spaces "TOTAL:    $  45.32"', () => {
      const text = 'TOTAL:    $  45.32';
      expect(extractAmount(text)).toBe(45.32);
    });

    test('should handle lowercase "total: $12.34"', () => {
      const text = 'total: $12.34';
      expect(extractAmount(text)).toBe(12.34);
    });

    test('should handle mixed case "ToTaL: $99.99"', () => {
      const text = 'ToTaL: $99.99';
      expect(extractAmount(text)).toBe(99.99);
    });

    test('should handle whole numbers "TOTAL: $50"', () => {
      const text = 'TOTAL: $50';
      expect(extractAmount(text)).toBe(50.00);
    });

    test('should handle amounts with three decimal places (round to 2)', () => {
      const text = 'TOTAL: $45.329';
      expect(extractAmount(text)).toBe(45.33);
    });

    test('should extract largest amount when no clear total indicator', () => {
      const text = `
        Item 1: 10.00
        Item 2: 25.00
        Item 3: 15.00
      `;
      expect(extractAmount(text)).toBe(25.00);
    });
  });

  describe('Invalid or missing amounts', () => {
    test('should return null when no amount found', () => {
      const text = 'This is some text with no amounts';
      expect(extractAmount(text)).toBeNull();
    });

    test('should return null for empty string', () => {
      const text = '';
      expect(extractAmount(text)).toBeNull();
    });

    test('should return null for undefined', () => {
      expect(extractAmount(undefined)).toBeNull();
    });

    test('should return null for null', () => {
      expect(extractAmount(null)).toBeNull();
    });

    test('should ignore invalid amounts like phone numbers', () => {
      const text = 'Call us at 555-1234 for total: $45.00';
      expect(extractAmount(text)).toBe(45.00);
    });
  });

  describe('Real-world receipt examples', () => {
    test('should extract from grocery store receipt', () => {
      const text = `
        WALMART SUPERCENTER
        STORE #1234
        MILK           $3.99
        BREAD          $2.49
        EGGS           $4.99
        SUBTOTAL      $11.47
        TAX            $0.92
        TOTAL         $12.39
        CASH          $20.00
        CHANGE         $7.61
      `;
      expect(extractAmount(text)).toBe(12.39);
    });

    test('should extract from restaurant receipt', () => {
      const text = `
        OLIVE GARDEN
        PASTA          $15.99
        SALAD           $8.99
        DRINKS          $6.00
        SUBTOTAL       $30.98
        TAX             $2.79
        TOTAL          $33.77
        TIP            $6.75
        GRAND TOTAL    $40.52
      `;
      expect(extractAmount(text)).toBe(40.52);
    });

    test('should extract from gas station receipt', () => {
      const text = `
        SHELL STATION
        UNLEADED 87
        12.456 GAL @ $3.599/GAL
        FUEL TOTAL: $44.82
      `;
      expect(extractAmount(text)).toBe(44.82);
    });
  });
});

describe('extractMerchant', () => {
  describe('Basic merchant extraction', () => {
    test('should extract merchant from first non-empty line', () => {
      const text = `
        WALMART
        STORE #1234
        123 Main St
      `;
      expect(extractMerchant(text)).toBe('WALMART');
    });

    test('should extract merchant when on first line', () => {
      const text = 'TARGET STORE\nAddress line';
      expect(extractMerchant(text)).toBe('TARGET STORE');
    });

    test('should skip empty lines at the beginning', () => {
      const text = '\n\n  \nSTARBUCKS\n123 Main St';
      expect(extractMerchant(text)).toBe('STARBUCKS');
    });
  });

  describe('Cleaning up merchant names', () => {
    test('should clean up store numbers "WALMART STORE #1234"', () => {
      const text = 'WALMART STORE #1234\n123 Main St';
      expect(extractMerchant(text)).toBe('WALMART STORE');
    });

    test('should clean up store numbers "TARGET #5678"', () => {
      const text = 'TARGET #5678\nAddress';
      expect(extractMerchant(text)).toBe('TARGET');
    });

    test('should clean up "STORE #" pattern', () => {
      const text = 'KROGER STORE #9999\nLocation';
      expect(extractMerchant(text)).toBe('KROGER STORE');
    });

    test('should remove trailing special characters', () => {
      const text = 'COSTCO***\nMembership Store';
      expect(extractMerchant(text)).toBe('COSTCO');
    });

    test('should trim whitespace', () => {
      const text = '  WHOLE FOODS  \nMarket';
      expect(extractMerchant(text)).toBe('WHOLE FOODS');
    });
  });

  describe('All caps text handling', () => {
    test('should handle all caps merchant names', () => {
      const text = 'TRADER JOES\nGROCERY STORE';
      expect(extractMerchant(text)).toBe('TRADER JOES');
    });

    test('should handle mixed case merchant names', () => {
      const text = 'Olive Garden\nItalian Restaurant';
      expect(extractMerchant(text)).toBe('Olive Garden');
    });

    test('should handle lowercase merchant names', () => {
      const text = 'amazon.com\nOrder #123';
      expect(extractMerchant(text)).toBe('amazon.com');
    });
  });

  describe('Complex merchant name patterns', () => {
    test('should extract from receipt with logo/graphics at top', () => {
      const text = '***\n===\nSHELL STATION\n123 Main St';
      expect(extractMerchant(text)).toBe('SHELL STATION');
    });

    test('should handle merchant with LLC/Inc suffix', () => {
      const text = 'ACME CORP LLC\n123 Business Dr';
      expect(extractMerchant(text)).toBe('ACME CORP LLC');
    });

    test('should handle merchant with ampersand', () => {
      const text = 'BED & BATH STORE\nLocation';
      expect(extractMerchant(text)).toBe('BED & BATH STORE');
    });

    test('should handle merchant with apostrophe', () => {
      const text = "MACY'S\nDepartment Store";
      expect(extractMerchant(text)).toBe("MACY'S");
    });
  });

  describe('Edge cases', () => {
    test('should return "Unknown Merchant" for empty string', () => {
      const text = '';
      expect(extractMerchant(text)).toBe('Unknown Merchant');
    });

    test('should return "Unknown Merchant" for undefined', () => {
      expect(extractMerchant(undefined)).toBe('Unknown Merchant');
    });

    test('should return "Unknown Merchant" for null', () => {
      expect(extractMerchant(null)).toBe('Unknown Merchant');
    });

    test('should return "Unknown Merchant" for only whitespace', () => {
      const text = '   \n  \n  ';
      expect(extractMerchant(text)).toBe('Unknown Merchant');
    });

    test('should return "Unknown Merchant" for only special characters', () => {
      const text = '***\n===\n---';
      expect(extractMerchant(text)).toBe('Unknown Merchant');
    });

    test('should handle very long merchant names (truncate to reasonable length)', () => {
      const text = 'A'.repeat(100) + '\nAddress';
      const result = extractMerchant(text);
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Real-world receipt examples', () => {
    test('should extract from Walmart receipt', () => {
      const text = `
        WALMART SUPERCENTER
        STORE #1234
        123 MAIN STREET
        ANYTOWN, CA 12345
      `;
      expect(extractMerchant(text)).toBe('WALMART SUPERCENTER');
    });

    test('should extract from Starbucks receipt', () => {
      const text = `
        STARBUCKS #12345
        123 Coffee Lane
        Seattle, WA
      `;
      expect(extractMerchant(text)).toBe('STARBUCKS');
    });

    test('should extract from gas station receipt', () => {
      const text = `
        ============================
        SHELL STATION #9876
        PAY AT PUMP #3
      `;
      expect(extractMerchant(text)).toBe('SHELL STATION');
    });
  });
});

describe('extractDate', () => {
  describe('MM/DD/YYYY format', () => {
    test('should extract date in MM/DD/YYYY format', () => {
      const text = 'Date: 11/19/2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date in M/D/YYYY format', () => {
      const text = 'Date: 1/5/2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-01-05/);
    });

    test('should extract date in MM/DD/YY format', () => {
      const text = 'Date: 11/19/25';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });
  });

  describe('DD-MM-YYYY format (European)', () => {
    test('should extract date in DD-MM-YYYY format', () => {
      const text = 'Date: 19-11-2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date in DD.MM.YYYY format', () => {
      const text = 'Date: 19.11.2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date in DD/MM/YYYY format', () => {
      const text = 'Date: 19/11/2025';
      const result = extractDate(text);
      // This is ambiguous - could be MM/DD or DD/MM
      // Implementation should handle based on context or configuration
      expect(result).toBeTruthy();
    });
  });

  describe('Text date formats', () => {
    test('should extract date like "Nov 19, 2025"', () => {
      const text = 'Date: Nov 19, 2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date like "November 19, 2025"', () => {
      const text = 'Date: November 19, 2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date like "19 Nov 2025"', () => {
      const text = 'Date: 19 Nov 2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date like "Jan 1, 2025"', () => {
      const text = 'Date: Jan 1, 2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-01-01/);
    });

    test('should handle abbreviated month names', () => {
      const months = [
        { abbr: 'Jan', num: '01' },
        { abbr: 'Feb', num: '02' },
        { abbr: 'Mar', num: '03' },
        { abbr: 'Apr', num: '04' },
        { abbr: 'May', num: '05' },
        { abbr: 'Jun', num: '06' },
        { abbr: 'Jul', num: '07' },
        { abbr: 'Aug', num: '08' },
        { abbr: 'Sep', num: '09' },
        { abbr: 'Oct', num: '10' },
        { abbr: 'Nov', num: '11' },
        { abbr: 'Dec', num: '12' },
      ];

      months.forEach(({ abbr, num }) => {
        const text = `Date: ${abbr} 15, 2025`;
        const result = extractDate(text);
        expect(result).toMatch(new RegExp(`2025-${num}-15`));
      });
    });
  });

  describe('Various date label formats', () => {
    test('should extract date with "DATE:" label', () => {
      const text = 'DATE: 11/19/2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date with "Date:" label', () => {
      const text = 'Date: 11/19/2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date with "date:" label (lowercase)', () => {
      const text = 'date: 11/19/2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract date without label', () => {
      const text = 'Receipt from 11/19/2025';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });
  });

  describe('ISO format dates', () => {
    test('should extract date in YYYY-MM-DD format', () => {
      const text = 'Date: 2025-11-19';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract datetime in ISO format', () => {
      const text = 'Timestamp: 2025-11-19T14:30:00Z';
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });
  });

  describe('Edge cases', () => {
    test('should return current date if no date found', () => {
      const text = 'This receipt has no date';
      const result = extractDate(text);
      expect(result).toBeTruthy();
      // Should return today's date in ISO format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return current date for empty string', () => {
      const text = '';
      const result = extractDate(text);
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return current date for undefined', () => {
      const result = extractDate(undefined);
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return current date for null', () => {
      const result = extractDate(null);
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should handle multiple dates (use first one)', () => {
      const text = `
        Date: 11/19/2025
        Due Date: 12/19/2025
      `;
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });
  });

  describe('Real-world receipt examples', () => {
    test('should extract from typical US receipt', () => {
      const text = `
        WALMART SUPERCENTER
        STORE #1234
        123 MAIN STREET
        11/19/2025  14:35:22
        CASHIER: JOHN
      `;
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract from European receipt', () => {
      const text = `
        TESCO
        Store Location
        19.11.2025
        Receipt #12345
      `;
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract from restaurant receipt', () => {
      const text = `
        OLIVE GARDEN
        Server: Maria
        Date: November 19, 2025
        Table: 12
      `;
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });

    test('should extract from gas station receipt', () => {
      const text = `
        SHELL STATION
        Date/Time: 11/19/2025 08:45 AM
        Pump #3
      `;
      const result = extractDate(text);
      expect(result).toMatch(/2025-11-19/);
    });
  });

  describe('Date validation', () => {
    test('should handle invalid dates gracefully', () => {
      const text = 'Date: 13/45/2025'; // Invalid month and day
      const result = extractDate(text);
      // Should either return current date or a valid parsed date
      expect(result).toBeTruthy();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should handle reasonable date ranges (not far in future)', () => {
      const text = 'Date: 01/01/2099'; // Far future
      const result = extractDate(text);
      expect(result).toBeTruthy();
    });

    test('should handle past dates', () => {
      const text = 'Date: 01/01/2020';
      const result = extractDate(text);
      expect(result).toMatch(/2020-01-01/);
    });
  });
});

describe('Integration tests', () => {
  test('should extract all fields from a complete receipt', () => {
    const receipt = `
      WALMART SUPERCENTER
      STORE #1234
      123 MAIN STREET
      ANYTOWN, CA 12345

      Date: 11/19/2025
      Time: 14:35:22

      MILK           $3.99
      BREAD          $2.49
      EGGS           $4.99

      SUBTOTAL      $11.47
      TAX            $0.92
      TOTAL         $12.39
    `;

    expect(extractMerchant(receipt)).toBe('WALMART SUPERCENTER');
    expect(extractAmount(receipt)).toBe(12.39);
    expect(extractDate(receipt)).toMatch(/2025-11-19/);
  });

  test('should extract all fields from restaurant receipt', () => {
    const receipt = `
      OLIVE GARDEN
      Italian Restaurant

      Nov 19, 2025
      Server: Maria

      PASTA          $15.99
      SALAD           $8.99
      DRINKS          $6.00

      SUBTOTAL       $30.98
      TAX             $2.79
      TOTAL          $33.77
    `;

    expect(extractMerchant(receipt)).toBe('OLIVE GARDEN');
    expect(extractAmount(receipt)).toBe(33.77);
    expect(extractDate(receipt)).toMatch(/2025-11-19/);
  });

  test('should handle poorly formatted receipt', () => {
    const receipt = `
      ***STORE***
      TOTAL:45.32
      11/19/25
    `;

    expect(extractMerchant(receipt)).not.toBe('Unknown Merchant');
    expect(extractAmount(receipt)).toBe(45.32);
    expect(extractDate(receipt)).toMatch(/2025-11-19/);
  });
});
