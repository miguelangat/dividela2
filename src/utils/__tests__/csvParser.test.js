import { parseCSV, parseDate, parseAmount } from '../csvParser';

describe('CSV Parser', () => {
  describe('parseAmount', () => {
    test('parses regular numbers', () => {
      expect(parseAmount('100.50')).toEqual({ value: 100.50, isValid: true, currency: null });
      expect(parseAmount('1,234.56')).toEqual({ value: 1234.56, isValid: true, currency: null });
    });

    test('handles negative numbers with parentheses', () => {
      expect(parseAmount('(100.00)')).toEqual({ value: -100, isValid: true, currency: null });
      expect(parseAmount('(50.25)')).toEqual({ value: -50.25, isValid: true, currency: null });
    });

    test('removes currency symbols and detects currency', () => {
      expect(parseAmount('$100.00')).toEqual({ value: 100, isValid: true, currency: 'USD' });
      expect(parseAmount('€50.50')).toEqual({ value: 50.50, isValid: true, currency: 'EUR' });
      expect(parseAmount('£75.00')).toEqual({ value: 75.00, isValid: true, currency: 'GBP' });
    });

    test('handles empty or invalid values', () => {
      expect(parseAmount('')).toEqual({ value: 0, isValid: false, error: 'Empty amount', currency: null });
      expect(parseAmount(null)).toEqual({ value: 0, isValid: false, error: 'Empty amount', currency: null });
      expect(parseAmount('abc')).toEqual({ value: 0, isValid: false, error: 'Invalid number', currency: null });
    });
  });

  describe('parseDate', () => {
    test('parses YYYY-MM-DD format', () => {
      const date = parseDate('2024-01-15');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(15);
    });

    test('parses MM/DD/YYYY format', () => {
      const date = parseDate('01/15/2024');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
    });

    test('returns null for invalid dates', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate(null)).toBeNull();
    });
  });

  describe('parseCSV', () => {
    test('parses simple CSV with headers', async () => {
      const csvContent = `Date,Description,Amount
2024-01-15,Coffee Shop,5.50
2024-01-16,Grocery Store,125.00`;

      const result = await parseCSV(csvContent);

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].description).toBe('Coffee Shop');
      expect(result.transactions[0].amount).toBe(5.50);
      expect(result.transactions[1].amount).toBe(125.00);
    });

    test('parses CSV with debit/credit columns', async () => {
      const csvContent = `Date,Description,Debit,Credit
2024-01-15,Purchase,50.00,
2024-01-16,Refund,,25.00`;

      const result = await parseCSV(csvContent);

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].type).toBe('debit');
      expect(result.transactions[0].amount).toBe(50);
      expect(result.transactions[1].type).toBe('credit');
      expect(result.transactions[1].amount).toBe(25);
    });

    test('skips empty lines and footer rows', async () => {
      const csvContent = `Date,Description,Amount
2024-01-15,Coffee,5.50

2024-01-16,Lunch,12.00

Total,,$17.50`;

      const result = await parseCSV(csvContent);

      expect(result.transactions).toHaveLength(2);
      expect(result.metadata.totalRows).toBeGreaterThanOrEqual(2);
    });

    test('handles different delimiters', async () => {
      const csvContent = `Date;Description;Amount
2024-01-15;Coffee;5.50
2024-01-16;Lunch;12.00`;

      const result = await parseCSV(csvContent);

      expect(result.transactions).toHaveLength(2);
    });

    test('rejects empty CSV', async () => {
      await expect(parseCSV('')).rejects.toThrow();
    });
  });
});
