/**
 * Category Predictor Tests (TDD)
 * Testing ML-based category prediction with user history
 *
 * These tests will FAIL initially - this is expected in TDD!
 * We write tests first, then implement the functionality.
 */

const {
  experiencedUser,
  newUser,
  repeatedMerchantsUser,
  keywordRichUser,
  emptyUser
} = require('../fixtures/userExpenseHistory');

// Import the modules we're testing (don't exist yet!)
const { genericCategoryMatcher } = require('../../src/ml/genericCategoryMatcher');
const {
  predictCategory,
  findExactMerchant,
  findSimilarMerchant,
  analyzeKeywords,
  aggregatePredictions
} = require('../../src/ml/categoryPredictor');

describe('Generic Category Matcher', () => {
  describe('genericCategoryMatcher()', () => {
    test('should suggest "groceries" for "Whole Foods" merchant', () => {
      const result = genericCategoryMatcher('Whole Foods Market', 67.32);

      expect(result.category).toBe('groceries');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    test('should suggest "food" for "Starbucks" merchant', () => {
      const result = genericCategoryMatcher('Starbucks', 5.67);

      expect(result.category).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should suggest "transport" for "Shell Gas Station"', () => {
      const result = genericCategoryMatcher('Shell Gas Station', 45.00);

      expect(result.category).toBe('transport');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should suggest "home" for "Home Depot"', () => {
      const result = genericCategoryMatcher('Home Depot', 87.45);

      expect(result.category).toBe('home');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should suggest "fun" for "AMC Theater"', () => {
      const result = genericCategoryMatcher('AMC Theater', 28.50);

      expect(result.category).toBe('fun');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should return "other" with low confidence for unknown merchants', () => {
      const result = genericCategoryMatcher('Unknown Store XYZ', 50.00);

      expect(result.category).toBe('other');
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should consider amount ranges in prediction', () => {
      // Small amount at coffee shop should have high confidence
      const coffee = genericCategoryMatcher('Starbucks', 5.00);
      expect(coffee.confidence).toBeGreaterThan(0.7);

      // Large amount at coffee shop should have slightly lower confidence
      const largeCoffee = genericCategoryMatcher('Starbucks', 500.00);
      expect(largeCoffee.confidence).toBeLessThan(coffee.confidence);
    });

    test('should combine keyword + amount scoring', () => {
      const result = genericCategoryMatcher('Target Groceries', 80.00);

      // Should detect "groceries" keyword even though Target is ambiguous
      expect(result.category).toBe('groceries');
    });

    test('should return alternatives array with other possible categories', () => {
      const result = genericCategoryMatcher('Whole Foods Market', 67.32);

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0]).toHaveProperty('category');
      expect(result.alternatives[0]).toHaveProperty('confidence');
    });

    test('should handle case-insensitive matching', () => {
      const upperCase = genericCategoryMatcher('STARBUCKS', 5.00);
      const lowerCase = genericCategoryMatcher('starbucks', 5.00);
      const mixedCase = genericCategoryMatcher('StArBuCkS', 5.00);

      expect(upperCase.category).toBe('food');
      expect(lowerCase.category).toBe('food');
      expect(mixedCase.category).toBe('food');
    });

    test('should handle null or empty merchant name', () => {
      const nullResult = genericCategoryMatcher(null, 50.00);
      const emptyResult = genericCategoryMatcher('', 50.00);

      expect(nullResult.category).toBe('other');
      expect(emptyResult.category).toBe('other');
    });
  });
});

describe('Category Predictor with User History', () => {
  describe('predictCategory()', () => {
    test('should predict based on exact merchant match with high confidence (>90%)', () => {
      // Repeated merchants user has visited Starbucks 20 times
      const result = predictCategory(
        'Starbucks',
        5.67,
        '',
        repeatedMerchantsUser.expenses
      );

      expect(result.category).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.source).toBe('exact_merchant');
    });

    test('should predict based on fuzzy merchant match', () => {
      // User has "Whole Foods Market" in history, test "Whole Foods"
      const result = predictCategory(
        'Whole Foods',
        67.00,
        '',
        experiencedUser.expenses
      );

      expect(result.category).toBe('groceries');
      expect(result.confidence).toBeGreaterThan(0.55);
      expect(['exact_merchant', 'fuzzy_merchant']).toContain(result.source);
    });

    test('should predict based on keyword analysis from descriptions', () => {
      // Test with keyword-rich user data
      const result = predictCategory(
        'Unknown Coffee Shop',
        6.00,
        'breakfast coffee and bagel',
        keywordRichUser.expenses
      );

      expect(result.category).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.55);
    });

    test('should predict based on amount patterns', () => {
      // Small amounts at coffee-like merchants should suggest food
      const result = predictCategory(
        'New Coffee Place',
        5.50,
        '',
        experiencedUser.expenses
      );

      // Should use amount pattern + generic matching
      expect(result.category).toBeTruthy();
      expect(result.confidence).toBeDefined();
    });

    test('should return null category when confidence < 55%', () => {
      // Completely unknown merchant with no patterns
      const result = predictCategory(
        'Completely Unknown XYZ Store 12345',
        999.99,
        '',
        emptyUser.expenses
      );

      // With no history and no matches, confidence should be low
      expect(result.confidence).toBeLessThan(0.55);
      if (result.confidence < 0.55) {
        expect(result.category).toBeNull();
      }
    });

    test('should set belowThreshold: true when confidence < 55%', () => {
      const result = predictCategory(
        'Unknown Merchant ABC',
        150.00,
        '',
        emptyUser.expenses
      );

      if (result.confidence < 0.55) {
        expect(result.belowThreshold).toBe(true);
        expect(result.category).toBeNull();
      }
    });

    test('should work with empty user history (fallback to generic)', () => {
      const result = predictCategory(
        'Starbucks',
        5.67,
        '',
        emptyUser.expenses
      );

      // Should fall back to generic matcher
      expect(result.category).toBe('food');
      expect(result.source).toBe('generic');
    });

    test('should aggregate multiple prediction models', () => {
      // Test case where multiple signals agree
      const result = predictCategory(
        'Starbucks',
        5.67,
        'morning coffee',
        experiencedUser.expenses
      );

      expect(result.category).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.7);
      // Should have high confidence from multiple signals
    });

    test('should return top 3 alternatives', () => {
      const result = predictCategory(
        'Target',
        80.00,
        '',
        experiencedUser.expenses
      );

      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
    });

    test('should learn from user history patterns', () => {
      // User consistently categorizes Shell as transport
      const result = predictCategory(
        'Shell Gas Station',
        45.00,
        '',
        repeatedMerchantsUser.expenses
      );

      expect(result.category).toBe('transport');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should prefer user history over generic matching', () => {
      // Even if generic matcher suggests something, user history should win
      const result = predictCategory(
        'Home Depot',
        100.00,
        '',
        repeatedMerchantsUser.expenses
      );

      expect(result.category).toBe('home');
      expect(['exact_merchant', 'fuzzy_merchant']).toContain(result.source);
    });

    test('should handle new users with minimal history gracefully', () => {
      // New user with only 5 expenses
      const result = predictCategory(
        'Starbucks',
        5.67,
        '',
        newUser.expenses
      );

      expect(result.category).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.55);
    });

    test('should weight exact matches higher than fuzzy matches', () => {
      const exactMatch = predictCategory(
        'Starbucks',
        5.67,
        '',
        repeatedMerchantsUser.expenses
      );

      const fuzzyMatch = predictCategory(
        'Starbuck', // Slightly different
        5.67,
        '',
        repeatedMerchantsUser.expenses
      );

      expect(exactMatch.confidence).toBeGreaterThan(fuzzyMatch.confidence);
    });

    test('should return confidence as number between 0 and 1', () => {
      const result = predictCategory(
        'Any Store',
        50.00,
        '',
        experiencedUser.expenses
      );

      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe('Helper Functions', () => {
  describe('findExactMerchant()', () => {
    test('should find exact merchant match in history', () => {
      const result = findExactMerchant('Starbucks', experiencedUser.expenses);

      expect(result).toBeDefined();
      expect(result.category).toBe('food');
      expect(result.count).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should return null when no exact match found', () => {
      const result = findExactMerchant('Unknown Store', experiencedUser.expenses);

      expect(result).toBeNull();
    });

    test('should be case-insensitive', () => {
      const upperCase = findExactMerchant('STARBUCKS', experiencedUser.expenses);
      const lowerCase = findExactMerchant('starbucks', experiencedUser.expenses);

      expect(upperCase).toBeDefined();
      expect(lowerCase).toBeDefined();
      expect(upperCase.category).toBe(lowerCase.category);
    });

    test('should count frequency of merchant visits', () => {
      const result = findExactMerchant('Starbucks', repeatedMerchantsUser.expenses);

      expect(result.count).toBe(20); // User visited 20 times
    });

    test('should return dominant category when merchant has multiple categories', () => {
      // If user sometimes categorized same merchant differently, pick most common
      const mixed = [
        { merchant: 'Target', category: 'groceries', amount: 50 },
        { merchant: 'Target', category: 'groceries', amount: 60 },
        { merchant: 'Target', category: 'groceries', amount: 70 },
        { merchant: 'Target', category: 'home', amount: 80 },
      ];

      const result = findExactMerchant('Target', mixed);
      expect(result.category).toBe('groceries'); // Most common
    });
  });

  describe('findSimilarMerchant()', () => {
    test('should find similar merchant using fuzzy matching', () => {
      const result = findSimilarMerchant('Whole Foods', experiencedUser.expenses);

      // Should match "Whole Foods Market"
      expect(result).toBeDefined();
      expect(result.category).toBe('groceries');
    });

    test('should return null when no similar match above threshold', () => {
      const result = findSimilarMerchant('Completely Different Store XYZ', experiencedUser.expenses);

      expect(result).toBeNull();
    });

    test('should have lower confidence than exact match', () => {
      const similar = findSimilarMerchant('Whole Foods', experiencedUser.expenses);
      const exact = findExactMerchant('Whole Foods Market', experiencedUser.expenses);

      if (similar && exact) {
        expect(similar.confidence).toBeLessThan(exact.confidence);
      }
    });

    test('should use string similarity algorithm', () => {
      // "Starbuck" should match "Starbucks" with high similarity
      const result = findSimilarMerchant('Starbuck', experiencedUser.expenses);

      expect(result).toBeDefined();
      expect(result.category).toBe('food');
    });

    test('should require minimum similarity threshold', () => {
      // Very different string should not match
      const result = findSimilarMerchant('XYZ', experiencedUser.expenses);

      expect(result).toBeNull();
    });
  });

  describe('analyzeKeywords()', () => {
    test('should extract food-related keywords', () => {
      const result = analyzeKeywords(
        'morning coffee and breakfast bagel',
        experiencedUser.expenses
      );

      expect(result).toBeDefined();
      expect(result.category).toBe('food');
    });

    test('should extract transport-related keywords', () => {
      const result = analyzeKeywords(
        'gas fill-up for car',
        experiencedUser.expenses
      );

      expect(result.category).toBe('transport');
    });

    test('should extract groceries-related keywords', () => {
      const result = analyzeKeywords(
        'weekly grocery shopping produce',
        experiencedUser.expenses
      );

      expect(result.category).toBe('groceries');
    });

    test('should extract home-related keywords', () => {
      const result = analyzeKeywords(
        'paint and hardware for home renovation',
        experiencedUser.expenses
      );

      expect(result.category).toBe('home');
    });

    test('should extract fun-related keywords', () => {
      const result = analyzeKeywords(
        'movie tickets and entertainment',
        experiencedUser.expenses
      );

      expect(result.category).toBe('fun');
    });

    test('should return null for no keyword matches', () => {
      const result = analyzeKeywords('xyz abc 123', experiencedUser.expenses);

      expect(result).toBeNull();
    });

    test('should handle empty description', () => {
      const result = analyzeKeywords('', experiencedUser.expenses);

      expect(result).toBeNull();
    });

    test('should score based on keyword frequency', () => {
      const singleKeyword = analyzeKeywords('coffee', experiencedUser.expenses);
      const multipleKeywords = analyzeKeywords(
        'coffee breakfast lunch dinner food',
        experiencedUser.expenses
      );

      if (singleKeyword && multipleKeywords) {
        expect(multipleKeywords.confidence).toBeGreaterThanOrEqual(singleKeyword.confidence);
      }
    });
  });

  describe('aggregatePredictions()', () => {
    test('should combine multiple prediction sources', () => {
      const predictions = [
        { category: 'food', confidence: 0.9, source: 'exact_merchant' },
        { category: 'food', confidence: 0.7, source: 'keyword' },
        { category: 'food', confidence: 0.6, source: 'generic' }
      ];

      const result = aggregatePredictions(predictions);

      expect(result.category).toBe('food');
      expect(result.confidence).toBeGreaterThan(0.7); // Should be high when all agree
    });

    test('should weight exact merchant matches highest', () => {
      const predictions = [
        { category: 'food', confidence: 0.95, source: 'exact_merchant' },
        { category: 'groceries', confidence: 0.6, source: 'generic' }
      ];

      const result = aggregatePredictions(predictions);

      // Exact merchant should win even if generic suggests something else
      expect(result.category).toBe('food');
    });

    test('should average confidence when categories agree', () => {
      const predictions = [
        { category: 'food', confidence: 0.8, source: 'exact_merchant' },
        { category: 'food', confidence: 0.6, source: 'keyword' }
      ];

      const result = aggregatePredictions(predictions);

      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should return highest confidence when categories disagree', () => {
      const predictions = [
        { category: 'food', confidence: 0.9, source: 'exact_merchant' },
        { category: 'groceries', confidence: 0.5, source: 'generic' }
      ];

      const result = aggregatePredictions(predictions);

      // Should pick the one with highest confidence
      expect(result.category).toBe('food');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should handle single prediction', () => {
      const predictions = [
        { category: 'food', confidence: 0.7, source: 'generic' }
      ];

      const result = aggregatePredictions(predictions);

      expect(result.category).toBe('food');
      expect(result.confidence).toBe(0.7);
    });

    test('should handle empty predictions array', () => {
      const result = aggregatePredictions([]);

      expect(result.category).toBeNull();
      expect(result.confidence).toBe(0);
    });

    test('should include source information', () => {
      const predictions = [
        { category: 'food', confidence: 0.9, source: 'exact_merchant' }
      ];

      const result = aggregatePredictions(predictions);

      expect(result.source).toBeDefined();
    });
  });
});

describe('Edge Cases and Integration', () => {
  test('should handle special characters in merchant names', () => {
    const result = predictCategory(
      "Joe's Cafe & Bakery",
      12.50,
      '',
      experiencedUser.expenses
    );

    expect(result).toBeDefined();
    expect(result.category).toBeTruthy();
  });

  test('should handle very long merchant names', () => {
    const longName = 'A'.repeat(200);
    const result = predictCategory(longName, 50.00, '', experiencedUser.expenses);

    expect(result).toBeDefined();
  });

  test('should handle zero amount', () => {
    const result = predictCategory('Starbucks', 0, '', experiencedUser.expenses);

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  test('should handle negative amount', () => {
    const result = predictCategory('Starbucks', -5.67, '', experiencedUser.expenses);

    expect(result).toBeDefined();
  });

  test('should handle very large amounts', () => {
    const result = predictCategory('Home Depot', 10000.00, '', experiencedUser.expenses);

    expect(result).toBeDefined();
  });

  test('should handle unicode in descriptions', () => {
    const result = predictCategory(
      'Cafe',
      10.00,
      '☕ morning coffee ☕',
      experiencedUser.expenses
    );

    expect(result).toBeDefined();
  });

  test('should be performant with large expense history', () => {
    const start = Date.now();
    const result = predictCategory(
      'Starbucks',
      5.67,
      'coffee',
      experiencedUser.expenses
    );
    const duration = Date.now() - start;

    expect(result).toBeDefined();
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });
});
