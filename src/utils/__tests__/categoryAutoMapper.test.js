import { suggestCategory, suggestCategoriesForTransactions } from '../categoryAutoMapper';

describe('Category Auto Mapper', () => {
  const availableCategories = ['food', 'groceries', 'transport', 'home', 'fun', 'other'];

  describe('suggestCategory', () => {
    test('suggests food category for restaurant transactions', () => {
      const result = suggestCategory('MCDONALD\'S #1234', availableCategories);

      expect(result.categoryKey).toBe('food');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.source).toBe('keyword_match');
    });

    test('suggests groceries category for supermarket', () => {
      const result = suggestCategory('WHOLE FOODS MARKET', availableCategories);

      expect(result.categoryKey).toBe('groceries');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('suggests transport category for Uber', () => {
      const result = suggestCategory('UBER TRIP *ABC123', availableCategories);

      expect(result.categoryKey).toBe('transport');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('suggests home category for utilities', () => {
      const result = suggestCategory('ELECTRIC COMPANY PAYMENT', availableCategories);

      expect(result.categoryKey).toBe('home');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('suggests fun category for entertainment', () => {
      const result = suggestCategory('NETFLIX SUBSCRIPTION', availableCategories);

      expect(result.categoryKey).toBe('fun');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('returns other for unmatched descriptions', () => {
      const result = suggestCategory('UNKNOWN MERCHANT', availableCategories);

      expect(result.categoryKey).toBe('other');
      expect(result.confidence).toBe(0);
    });

    test('handles empty description', () => {
      const result = suggestCategory('', availableCategories);

      expect(result.categoryKey).toBe('other');
      expect(result.confidence).toBe(0);
    });

    test('is case insensitive', () => {
      const result1 = suggestCategory('starbucks', availableCategories);
      const result2 = suggestCategory('STARBUCKS', availableCategories);
      const result3 = suggestCategory('StArBuCkS', availableCategories);

      expect(result1.categoryKey).toBe('food');
      expect(result2.categoryKey).toBe('food');
      expect(result3.categoryKey).toBe('food');
    });

    test('handles partial keyword matches', () => {
      const result = suggestCategory('CAFE DOWNTOWN', availableCategories);

      expect(result.categoryKey).toBe('food');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('suggestCategoriesForTransactions', () => {
    test('suggests categories for multiple transactions', () => {
      const transactions = [
        { description: 'STARBUCKS' },
        { description: 'WHOLE FOODS' },
        { description: 'UBER RIDE' },
      ];

      const results = suggestCategoriesForTransactions(
        transactions,
        availableCategories
      );

      expect(results).toHaveLength(3);
      expect(results[0].suggestion.categoryKey).toBe('food');
      expect(results[1].suggestion.categoryKey).toBe('groceries');
      expect(results[2].suggestion.categoryKey).toBe('transport');
    });

    test('handles mix of matched and unmatched transactions', () => {
      const transactions = [
        { description: 'STARBUCKS' },
        { description: 'UNKNOWN STORE' },
      ];

      const results = suggestCategoriesForTransactions(
        transactions,
        availableCategories
      );

      expect(results).toHaveLength(2);
      expect(results[0].suggestion.categoryKey).toBe('food');
      expect(results[0].suggestion.confidence).toBeGreaterThan(0);
      expect(results[1].suggestion.categoryKey).toBe('other');
      expect(results[1].suggestion.confidence).toBe(0);
    });
  });

  describe('learning from past transactions', () => {
    test('uses exact match from past transactions', () => {
      const pastTransactions = [
        { description: 'LOCAL CAFE', categoryKey: 'food' },
      ];

      const result = suggestCategory(
        'LOCAL CAFE',
        availableCategories,
        {},
        pastTransactions
      );

      expect(result.categoryKey).toBe('food');
      expect(result.confidence).toBe(1.0);
      expect(result.source).toBe('learned_exact');
    });

    test('uses similar transactions', () => {
      const pastTransactions = [
        { description: 'LOCAL COFFEE SHOP', categoryKey: 'food' },
      ];

      const result = suggestCategory(
        'LOCAL COFFEE',
        availableCategories,
        {},
        pastTransactions
      );

      // Should have high confidence due to word overlap
      expect(result.categoryKey).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });
});
