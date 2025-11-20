import { parseCSV, parseDate, parseAmount } from '../csvParser';

describe('CSV Parser', () => {
  describe('parseAmount', () => {
    test('parses regular numbers', () => {
      expect(parseAmount('100.50')).toBe(100.50);
      expect(parseAmount('1,234.56')).toBe(1234.56);
    });

    test('handles negative numbers with parentheses', () => {
      expect(parseAmount('(100.00)')).toBe(-100);
      expect(parseAmount('(50.25)')).toBe(-50.25);
    });

    test('removes currency symbols', () => {
      expect(parseAmount('$100.00')).toBe(100);
      expect(parseAmount('€50.50')).toBe(50.50);
    });

    test('handles empty or invalid values', () => {
      expect(parseAmount('')).toBe(0);
      expect(parseAmount(null)).toBe(0);
      expect(parseAmount('abc')).toBe(0);
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
