// src/__tests__/services/fuzzyMatcher.test.js
// Unit tests for fuzzy string matching and category matching

import {
  levenshteinDistance,
  similarityScore,
  normalizeString,
  findMatchingCategory,
  findAllMatchingCategories,
} from '../../services/fuzzyMatcher';

describe('fuzzyMatcher.js - Fuzzy String Matching', () => {
  describe('Levenshtein Distance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
      expect(levenshteinDistance('test', 'test')).toBe(0);
    });

    it('should calculate distance for single character difference', () => {
      expect(levenshteinDistance('hello', 'hallo')).toBe(1);
      expect(levenshteinDistance('test', 'best')).toBe(1);
    });

    it('should calculate distance for multiple differences', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', 'hello')).toBe(5);
    });

    it('should handle completely different strings', () => {
      const distance = levenshteinDistance('abc', 'xyz');
      expect(distance).toBe(3);
    });

    it('should be case sensitive', () => {
      const distance = levenshteinDistance('Hello', 'hello');
      expect(distance).toBe(1);
    });

    it('should handle strings of different lengths', () => {
      expect(levenshteinDistance('cat', 'category')).toBe(5);
    });
  });

  describe('Similarity Score', () => {
    it('should return 1.0 for identical strings', () => {
      expect(similarityScore('hello', 'hello')).toBe(1.0);
      expect(similarityScore('groceries', 'groceries')).toBe(1.0);
    });

    it('should return high score for similar strings', () => {
      const score = similarityScore('groceries', 'groceris');
      expect(score).toBeGreaterThan(0.85);
    });

    it('should return low score for dissimilar strings', () => {
      const score = similarityScore('groceries', 'utilities');
      expect(score).toBeLessThan(0.5);
    });

    it('should return 0 for completely different strings', () => {
      const score = similarityScore('abc', 'xyz');
      expect(score).toBeLessThan(0.3);
    });

    it('should handle case differences', () => {
      const score = similarityScore('GROCERIES', 'groceries');
      expect(score).toBeGreaterThan(0.5); // Not perfect due to case
    });

    it('should handle one empty string', () => {
      expect(similarityScore('', 'hello')).toBe(0);
      expect(similarityScore('hello', '')).toBe(0);
    });

    it('should return 1.0 for two empty strings', () => {
      expect(similarityScore('', '')).toBe(1.0);
    });
  });

  describe('String Normalization', () => {
    it('should convert to lowercase', () => {
      expect(normalizeString('HELLO')).toBe('hello');
      expect(normalizeString('GrOcErIeS')).toBe('groceries');
    });

    it('should trim whitespace', () => {
      expect(normalizeString('  hello  ')).toBe('hello');
      expect(normalizeString('\thello\n')).toBe('hello');
    });

    it('should remove extra spaces', () => {
      expect(normalizeString('hello    world')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(normalizeString('')).toBe('');
      expect(normalizeString('   ')).toBe('');
    });

    it('should remove special characters', () => {
      const normalized = normalizeString('hello-world!');
      expect(normalized).not.toContain('-');
      expect(normalized).not.toContain('!');
    });

    it('should preserve alphanumeric characters', () => {
      expect(normalizeString('test123')).toBe('test123');
    });
  });

  describe('Category Matching - Single Match', () => {
    const mockCategories = {
      food: { name: 'Groceries', icon: '🛒', budget: 500 },
      transport: { name: 'Transportation', icon: '🚗', budget: 200 },
      utilities: { name: 'Utilities', icon: '💡', budget: 150 },
      entertainment: { name: 'Entertainment', icon: '🎬', budget: 100 },
    };

    it('should find exact match (case insensitive)', () => {
      const match = findMatchingCategory('groceries', mockCategories);

      expect(match).not.toBeNull();
      expect(match.key).toBe('food');
      expect(match.category.name).toBe('Groceries');
      expect(match.exact).toBe(true);
      expect(match.score).toBe(1.0);
    });

    it('should find match with typo', () => {
      const match = findMatchingCategory('groceris', mockCategories);

      expect(match).not.toBeNull();
      expect(match.key).toBe('food');
      expect(match.exact).toBe(false);
      expect(match.score).toBeGreaterThan(0.8);
    });

    it('should find match with partial string', () => {
      const match = findMatchingCategory('transport', mockCategories);

      expect(match).not.toBeNull();
      expect(match.key).toBe('transport');
    });

    it('should return null for no match above threshold', () => {
      const match = findMatchingCategory('xyz123', mockCategories, 0.6);

      expect(match).toBeNull();
    });

    it('should respect custom threshold', () => {
      const lowThreshold = findMatchingCategory('groc', mockCategories, 0.3);
      const highThreshold = findMatchingCategory('groc', mockCategories, 0.9);

      expect(lowThreshold).not.toBeNull();
      expect(highThreshold).toBeNull();
    });

    it('should match best category when multiple similar', () => {
      const categories = {
        food1: { name: 'Groceries', icon: '🛒' },
        food2: { name: 'Grocery Shopping', icon: '🛒' },
      };

      const match = findMatchingCategory('groceries', categories);

      expect(match).not.toBeNull();
      expect(match.key).toBe('food1'); // Exact match
    });

    it('should handle empty input', () => {
      const match = findMatchingCategory('', mockCategories);

      expect(match).toBeNull();
    });

    it('should handle whitespace input', () => {
      const match = findMatchingCategory('   ', mockCategories);

      expect(match).toBeNull();
    });
  });

  describe('Category Matching - Multiple Matches', () => {
    const mockCategories = {
      food: { name: 'Groceries', icon: '🛒', budget: 500 },
      dining: { name: 'Dining Out', icon: '🍽️', budget: 300 },
      transport: { name: 'Transportation', icon: '🚗', budget: 200 },
    };

    it('should find all matches above threshold', () => {
      const matches = findAllMatchingCategories('food', mockCategories, 0.5);

      expect(matches).toBeTruthy();
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should sort matches by score (descending)', () => {
      const matches = findAllMatchingCategories('groc', mockCategories, 0.3);

      if (matches && matches.length > 1) {
        for (let i = 0; i < matches.length - 1; i++) {
          expect(matches[i].score).toBeGreaterThanOrEqual(matches[i + 1].score);
        }
      }
    });

    it('should limit results if maxResults specified', () => {
      const matches = findAllMatchingCategories('food', mockCategories, 0.3, 2);

      expect(matches).toBeTruthy();
      if (matches) {
        expect(matches.length).toBeLessThanOrEqual(2);
      }
    });

    it('should return empty array for no matches', () => {
      const matches = findAllMatchingCategories('xyz123', mockCategories, 0.8);

      expect(matches).toEqual([]);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle null input', () => {
      const categories = { food: { name: 'Food', icon: '🍕' } };
      const match = findMatchingCategory(null, categories);

      expect(match).toBeNull();
    });

    it('should handle undefined input', () => {
      const categories = { food: { name: 'Food', icon: '🍕' } };
      const match = findMatchingCategory(undefined, categories);

      expect(match).toBeNull();
    });

    it('should handle empty categories object', () => {
      const match = findMatchingCategory('groceries', {});

      expect(match).toBeNull();
    });

    it('should handle null categories', () => {
      const match = findMatchingCategory('groceries', null);

      expect(match).toBeNull();
    });

    it('should handle categories with missing name', () => {
      const categories = {
        food: { icon: '🍕', budget: 500 },
      };

      const match = findMatchingCategory('food', categories);

      // Should still try to match based on key
      expect(match).toBeTruthy();
    });

    it('should handle very long input strings', () => {
      const longString = 'a'.repeat(1000);
      const categories = { food: { name: 'Food', icon: '🍕' } };

      const match = findMatchingCategory(longString, categories);

      expect(match).toBeDefined(); // Should not crash
    });

    it('should handle unicode characters', () => {
      const categories = {
        food: { name: 'Épicerie', icon: '🛒' },
      };

      const match = findMatchingCategory('epicerie', categories);

      expect(match).toBeTruthy();
    });
  });

  describe('Real-World Scenarios', () => {
    const realCategories = {
      groceries: { name: 'Groceries', icon: '🛒', budget: 500 },
      dining: { name: 'Dining & Restaurants', icon: '🍽️', budget: 300 },
      transport: { name: 'Transportation', icon: '🚗', budget: 200 },
      utilities: { name: 'Utilities & Bills', icon: '💡', budget: 150 },
      entertainment: { name: 'Entertainment', icon: '🎬', budget: 100 },
      health: { name: 'Healthcare', icon: '💊', budget: 200 },
      shopping: { name: 'Shopping', icon: '🛍️', budget: 250 },
    };

    it('should match common typos', () => {
      const typos = [
        { input: 'groceris', expected: 'groceries' },
        { input: 'trasportation', expected: 'transport' },
        { input: 'entertanment', expected: 'entertainment' },
      ];

      typos.forEach(({ input, expected }) => {
        const match = findMatchingCategory(input, realCategories);
        expect(match).not.toBeNull();
        expect(match.key).toBe(expected);
      });
    });

    it('should match partial category names', () => {
      const match = findMatchingCategory('dining', realCategories);

      expect(match).not.toBeNull();
      expect(match.key).toBe('dining');
    });

    it('should match singular/plural variations', () => {
      const match = findMatchingCategory('grocery', realCategories);

      expect(match).not.toBeNull();
      expect(match.key).toBe('groceries');
    });

    it('should differentiate between similar categories', () => {
      const categories = {
        food: { name: 'Food', icon: '🍔' },
        foodDelivery: { name: 'Food Delivery', icon: '🚚' },
      };

      const match1 = findMatchingCategory('food', categories);
      const match2 = findMatchingCategory('food delivery', categories);

      expect(match1.key).toBe('food');
      expect(match2.key).toBe('foodDelivery');
    });

    it('should handle abbreviations', () => {
      const match = findMatchingCategory('utils', realCategories);

      expect(match).not.toBeNull();
      // Should match utilities with decent score
      expect(match.score).toBeGreaterThan(0.5);
    });
  });

  describe('Performance', () => {
    it('should handle large category lists efficiently', () => {
      const largeCategories = {};
      for (let i = 0; i < 100; i++) {
        largeCategories[`category${i}`] = {
          name: `Category ${i}`,
          icon: '📁',
        };
      }

      const startTime = Date.now();
      findMatchingCategory('category50', largeCategories);
      const endTime = Date.now();

      // Should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
