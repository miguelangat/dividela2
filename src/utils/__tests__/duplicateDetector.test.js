import { isDuplicate, findDuplicates, detectDuplicatesForTransactions } from '../duplicateDetector';

describe('Duplicate Detector', () => {
  describe('isDuplicate', () => {
    const existingExpense = {
      date: '2024-01-15',
      description: 'STARBUCKS COFFEE',
      amount: 5.50,
    };

    test('detects exact duplicate', () => {
      const transaction = {
        date: new Date('2024-01-15'),
        description: 'STARBUCKS COFFEE',
        amount: 5.50,
      };

      const result = isDuplicate(transaction, existingExpense);

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('detects duplicate with similar description', () => {
      const transaction = {
        date: new Date('2024-01-15'),
        description: 'STARBUCKS CAFE',
        amount: 5.50,
      };

      const result = isDuplicate(transaction, existingExpense);

      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('detects duplicate within date tolerance', () => {
      const transaction = {
        date: new Date('2024-01-16'), // 1 day difference
        description: 'STARBUCKS COFFEE',
        amount: 5.50,
      };

      const result = isDuplicate(transaction, existingExpense, {
        dateTolerance: 2,
      });

      expect(result.isDuplicate).toBe(true);
    });

    test('rejects transaction with different amount', () => {
      const transaction = {
        date: new Date('2024-01-15'),
        description: 'STARBUCKS COFFEE',
        amount: 10.00, // Different amount
      };

      const result = isDuplicate(transaction, existingExpense);

      expect(result.isDuplicate).toBe(false);
    });

    test('rejects transaction with different date (strict mode)', () => {
      const transaction = {
        date: new Date('2024-01-16'),
        description: 'STARBUCKS COFFEE',
        amount: 5.50,
      };

      const result = isDuplicate(transaction, existingExpense, {
        strictDate: true,
      });

      expect(result.isDuplicate).toBe(false);
    });

    test('rejects transaction with very different description', () => {
      const transaction = {
        date: new Date('2024-01-15'),
        description: 'COMPLETELY DIFFERENT STORE',
        amount: 5.50,
      };

      const result = isDuplicate(transaction, existingExpense);

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('findDuplicates', () => {
    const existingExpenses = [
      {
        id: '1',
        date: '2024-01-15',
        description: 'STARBUCKS COFFEE',
        amount: 5.50,
      },
      {
        id: '2',
        date: '2024-01-15',
        description: 'WHOLE FOODS',
        amount: 125.00,
      },
      {
        id: '3',
        date: '2024-01-16',
        description: 'UBER RIDE',
        amount: 15.00,
      },
    ];

    test('finds all matching duplicates', () => {
      const transaction = {
        date: new Date('2024-01-15'),
        description: 'STARBUCKS COFFEE',
        amount: 5.50,
      };

      const results = findDuplicates(transaction, existingExpenses);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].expense.id).toBe('1');
      expect(results[0].isDuplicate).toBe(true);
    });

    test('returns empty array when no duplicates', () => {
      const transaction = {
        date: new Date('2024-01-20'),
        description: 'UNIQUE MERCHANT',
        amount: 50.00,
      };

      const results = findDuplicates(transaction, existingExpenses);

      expect(results).toHaveLength(0);
    });

    test('sorts results by confidence', () => {
      const transaction = {
        date: new Date('2024-01-15'),
        description: 'STARBUCKS',
        amount: 5.50,
      };

      const results = findDuplicates(transaction, existingExpenses);

      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
        }
      }
    });
  });

  describe('detectDuplicatesForTransactions', () => {
    const existingExpenses = [
      {
        id: '1',
        date: '2024-01-15',
        description: 'STARBUCKS',
        amount: 5.50,
      },
    ];

    test('detects duplicates for multiple transactions', () => {
      const transactions = [
        {
          date: new Date('2024-01-15'),
          description: 'STARBUCKS',
          amount: 5.50,
        },
        {
          date: new Date('2024-01-16'),
          description: 'NEW MERCHANT',
          amount: 20.00,
        },
      ];

      const results = detectDuplicatesForTransactions(transactions, existingExpenses);

      expect(results).toHaveLength(2);
      expect(results[0].hasDuplicates).toBe(true);
      expect(results[1].hasDuplicates).toBe(false);
    });

    test('identifies high confidence duplicates', () => {
      const transactions = [
        {
          date: new Date('2024-01-15'),
          description: 'STARBUCKS',
          amount: 5.50,
        },
      ];

      const results = detectDuplicatesForTransactions(transactions, existingExpenses);

      expect(results[0].highConfidenceDuplicate).toBeDefined();
      expect(results[0].highConfidenceDuplicate.confidence).toBeGreaterThan(0.8);
    });

    test('only checks expenses from last 90 days', () => {
      const oldExpense = {
        id: '1',
        date: '2023-01-01', // More than 90 days ago
        description: 'STARBUCKS',
        amount: 5.50,
      };

      const transaction = {
        date: new Date('2024-01-15'),
        description: 'STARBUCKS',
        amount: 5.50,
      };

      const results = detectDuplicatesForTransactions([transaction], [oldExpense]);

      // Should not find the old expense as a duplicate
      expect(results[0].duplicates.length).toBe(0);
    });
  });
});
