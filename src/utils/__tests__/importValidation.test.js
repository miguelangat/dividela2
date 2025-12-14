import {
  validateFile,
  validateDate,
  validateAmount,
  validateDescription,
  validateTransaction,
  validateTransactions,
} from '../importValidation';

describe('Import Validation', () => {
  describe('validateFile', () => {
    test('validates valid file', () => {
      const fileInfo = {
        uri: 'file:///path/to/statement.csv',
        name: 'statement.csv',
        type: 'text/csv',
        size: 5000,
      };

      const result = validateFile(fileInfo);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects missing file', () => {
      const result = validateFile(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No file selected');
    });

    test('rejects empty file', () => {
      const fileInfo = {
        uri: 'file:///path/to/empty.csv',
        name: 'empty.csv',
        type: 'text/csv',
        size: 0,
      };

      const result = validateFile(fileInfo);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty (0 bytes)');
    });

    test('rejects files too large', () => {
      const fileInfo = {
        uri: 'file:///path/to/huge.csv',
        name: 'huge.csv',
        type: 'text/csv',
        size: 100 * 1024 * 1024, // 100MB
      };

      const result = validateFile(fileInfo);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is too large (max 50MB)');
    });

    test('warns about suspicious file types', () => {
      const fileInfo = {
        uri: 'file:///path/to/malware.exe',
        name: 'malware.exe',
        type: 'application/exe',
        size: 5000,
      };

      const result = validateFile(fileInfo);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Suspicious file type detected');
    });

    test('warns about very small files', () => {
      const fileInfo = {
        uri: 'file:///path/to/tiny.csv',
        name: 'tiny.csv',
        type: 'text/csv',
        size: 50, // Very small
      };

      const result = validateFile(fileInfo);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File is very small, may not contain valid data');
    });
  });

  describe('validateDate', () => {
    test('validates valid date', () => {
      const result = validateDate(new Date('2024-01-15'));

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects null date', () => {
      const result = validateDate(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('date is required');
    });

    test('rejects invalid date', () => {
      const result = validateDate('invalid-date');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('date is not a valid date');
    });

    test('warns about future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const result = validateDate(futureDate);

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings).toContain('date is in the future');
    });

    test('rejects dates before 1900', () => {
      const result = validateDate(new Date('1800-01-01'));

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('date is too old (before 1900)');
    });

    test('warns about very old dates', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 15);

      const result = validateDate(oldDate);

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings).toContain('date is more than 10 years old');
    });
  });

  describe('validateAmount', () => {
    test('validates valid amount', () => {
      const result = validateAmount(100.50);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects null amount', () => {
      const result = validateAmount(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount is required');
    });

    test('rejects zero amount', () => {
      const result = validateAmount(0);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount must be greater than 0');
    });

    test('rejects negative amount', () => {
      const result = validateAmount(-50);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount must be greater than 0');
    });

    test('rejects non-numeric amount', () => {
      const result = validateAmount('not-a-number');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount must be a valid number');
    });

    test('warns about very large amounts', () => {
      const result = validateAmount(5000000); // $5M

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings[0]).toContain('is very large');
    });

    test('warns about very small amounts', () => {
      const result = validateAmount(0.005);

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings).toContain('amount is less than $0.01');
    });

    test('warns about precision issues', () => {
      const result = validateAmount(100.123456);

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings[0]).toContain('has more than 2 decimal places');
    });
  });

  describe('validateDescription', () => {
    test('validates valid description', () => {
      const result = validateDescription('Grocery Store Purchase');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects empty description', () => {
      const result = validateDescription('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('description is required');
    });

    test('rejects whitespace-only description', () => {
      const result = validateDescription('   ');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('description is required');
    });

    test('warns about very long descriptions', () => {
      const longDesc = 'a'.repeat(600);
      const result = validateDescription(longDesc);

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings[0]).toContain('is very long');
    });

    test('rejects suspicious content', () => {
      const result = validateDescription('<script>alert("xss")</script>');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('description contains suspicious content');
    });
  });

  describe('validateTransaction', () => {
    test('validates valid transaction', () => {
      const transaction = {
        date: new Date('2024-01-15'),
        description: 'Coffee Shop',
        amount: 5.50,
        type: 'debit',
      };

      const result = validateTransaction(transaction, 0);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('collects multiple errors', () => {
      const transaction = {
        date: null,
        description: '',
        amount: -5,
        type: 'invalid',
      };

      const result = validateTransaction(transaction, 0);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('validateTransactions', () => {
    test('validates array of valid transactions', () => {
      const transactions = [
        {
          date: new Date('2024-01-15'),
          description: 'Coffee',
          amount: 5.50,
        },
        {
          date: new Date('2024-01-16'),
          description: 'Lunch',
          amount: 12.00,
        },
      ];

      const result = validateTransactions(transactions);

      expect(result.isValid).toBe(true);
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(0);
    });

    test('rejects non-array input', () => {
      const result = validateTransactions('not-an-array');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transactions must be an array');
    });

    test('rejects empty array', () => {
      const result = validateTransactions([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No transactions to validate');
    });

    test('rejects too many transactions', () => {
      const transactions = Array(1500).fill({
        date: new Date(),
        description: 'Test',
        amount: 10,
      });

      const result = validateTransactions(transactions);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Too many transactions');
    });

    test('separates valid and invalid transactions', () => {
      const transactions = [
        {
          date: new Date('2024-01-15'),
          description: 'Valid Transaction',
          amount: 50.00,
        },
        {
          date: null, // Invalid
          description: 'Invalid Transaction',
          amount: 25.00,
        },
        {
          date: new Date('2024-01-16'),
          description: 'Another Valid',
          amount: 30.00,
        },
      ];

      const result = validateTransactions(transactions);

      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
    });

    test('detects duplicates within import', () => {
      const transactions = [
        {
          date: new Date('2024-01-15'),
          description: 'Coffee',
          amount: 5.50,
        },
        {
          date: new Date('2024-01-15'),
          description: 'Coffee',
          amount: 5.50,
        },
      ];

      const result = validateTransactions(transactions);

      expect(result.duplicatesWithinImport).toHaveLength(1);
      expect(result.warnings[0]).toContain('duplicate transactions within this import');
    });
  });
});
