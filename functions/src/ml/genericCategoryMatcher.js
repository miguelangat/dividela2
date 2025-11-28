/**
 * Generic Category Matcher
 * Provides baseline category prediction using keyword rules and patterns
 * Used as fallback when user has no history or for new merchants
 */

// Category keyword rules
const CATEGORY_RULES = {
  groceries: {
    keywords: [
      'whole foods', 'trader joes', 'safeway', 'kroger', 'albertsons',
      'costco', 'walmart', 'target', 'aldi', 'sprouts', 'fresh market',
      'grocery', 'groceries', 'supermarket', 'market', 'food store',
      'produce', 'organic', 'farmers market'
    ],
    amountRange: { min: 20, max: 300 },
    typicalAmount: 60
  },
  food: {
    keywords: [
      'starbucks', 'coffee', 'cafe', 'restaurant', 'bistro', 'grill',
      'pizza', 'burger', 'taco', 'sushi', 'diner', 'bakery',
      'mcdonalds', 'subway', 'chipotle', 'panera', 'wendys',
      'dunkin', 'donut', 'breakfast', 'lunch', 'dinner',
      'kitchen', 'bar', 'pub', 'tavern', 'eatery', 'dining'
    ],
    amountRange: { min: 3, max: 150 },
    typicalAmount: 15
  },
  transport: {
    keywords: [
      'shell', 'chevron', 'bp', 'exxon', 'mobil', 'texaco', 'gas',
      'gasoline', 'fuel', 'petrol', 'station',
      'uber', 'lyft', 'taxi', 'ride', 'transit', 'metro', 'bus',
      'parking', 'garage', 'toll', 'auto', 'car'
    ],
    amountRange: { min: 5, max: 100 },
    typicalAmount: 45
  },
  home: {
    keywords: [
      'home depot', 'lowes', 'ace hardware', 'hardware',
      'ikea', 'furniture', 'bed bath', 'wayfair',
      'paint', 'lumber', 'tools', 'renovation', 'improvement',
      'garden', 'lawn', 'plumbing', 'electrical', 'fixture'
    ],
    amountRange: { min: 20, max: 500 },
    typicalAmount: 100
  },
  fun: {
    keywords: [
      'amc', 'theater', 'theatre', 'cinema', 'movie', 'film',
      'netflix', 'hulu', 'spotify', 'entertainment', 'streaming',
      'game', 'gaming', 'playstation', 'xbox', 'steam',
      'concert', 'ticket', 'museum', 'park', 'zoo',
      'golf', 'bowling', 'arcade', 'hobby', 'sport'
    ],
    amountRange: { min: 5, max: 200 },
    typicalAmount: 30
  }
};

/**
 * Calculate how well a merchant/description matches a category's keywords
 */
function calculateKeywordScore(text, keywords) {
  if (!text) return 0;

  const normalizedText = text.toLowerCase().trim();
  let matchCount = 0;
  let totalWeight = 0;
  let hasExactMatch = false;

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    if (normalizedText.includes(normalizedKeyword)) {
      // Check for exact or very close match (keyword is major part of text)
      const words = normalizedText.split(/\s+/);
      const isExactWord = words.some(word => word === normalizedKeyword || word.includes(normalizedKeyword));

      // Longer, more specific keywords get higher weight
      let weight = keyword.length / 8;

      // Boost for exact word matches
      if (isExactWord) {
        weight *= 1.5;
        hasExactMatch = true;
      }

      matchCount++;
      totalWeight += weight;
    }
  }

  if (matchCount === 0) return 0;

  // Base score from weights
  let score = Math.min(totalWeight / 1.5, 1);

  // Boost if we have exact matches
  if (hasExactMatch) {
    score = Math.min(score * 1.2, 1);
  }

  return score;
}

/**
 * Calculate how well an amount fits a category's typical range
 */
function calculateAmountScore(amount, amountRange, typicalAmount) {
  if (!amount || amount <= 0) return 0.5; // Neutral score for invalid amounts

  const { min, max } = amountRange;

  // Perfect score if within range
  if (amount >= min && amount <= max) {
    // Even better score if close to typical amount
    const distanceFromTypical = Math.abs(amount - typicalAmount);
    const rangeSize = max - min;
    const typicalScore = 1 - (distanceFromTypical / rangeSize);
    return Math.max(0.7, Math.min(typicalScore, 1));
  }

  // Reduced score if outside range
  if (amount < min) {
    const diff = min - amount;
    return Math.max(0.3, 0.7 - (diff / min));
  } else {
    const diff = amount - max;
    return Math.max(0.2, 0.7 - (diff / max));
  }
}

/**
 * Generic category matcher using keyword rules and amount patterns
 *
 * @param {string} merchant - Merchant name
 * @param {number} amount - Transaction amount
 * @param {string} description - Optional description text
 * @returns {Object} { category, confidence, alternatives }
 */
function genericCategoryMatcher(merchant, amount = 0, description = '') {
  // Handle null/empty inputs
  if (!merchant && !description) {
    return {
      category: 'other',
      confidence: 0.1,
      alternatives: [],
      source: 'generic'
    };
  }

  const combinedText = `${merchant || ''} ${description || ''}`;
  const scores = {};

  // Calculate scores for each category
  for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
    const keywordScore = calculateKeywordScore(combinedText, rules.keywords);
    const amountScore = calculateAmountScore(amount, rules.amountRange, rules.typicalAmount);

    // Combine keyword score (75% weight) and amount score (25% weight)
    // If keyword score is very high (>0.7), give it even more weight
    let combinedScore;
    if (keywordScore > 0.7) {
      combinedScore = (keywordScore * 0.85) + (amountScore * 0.15);
    } else if (keywordScore > 0.4) {
      combinedScore = (keywordScore * 0.75) + (amountScore * 0.25);
    } else {
      combinedScore = (keywordScore * 0.6) + (amountScore * 0.4);
    }

    scores[category] = combinedScore;
  }

  // Sort categories by score
  const sortedCategories = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

  const [topCategory, topScore] = sortedCategories[0];

  // Get alternatives (top 3, excluding the winner)
  const alternatives = sortedCategories
    .slice(1, 4)
    .filter(([, score]) => score > 0.2)
    .map(([category, confidence]) => ({ category, confidence: Number(confidence.toFixed(3)) }));

  // Return 'other' if no good match found
  // Higher threshold to avoid false positives
  if (topScore < 0.4) {
    return {
      category: 'other',
      confidence: Number(topScore.toFixed(3)),
      alternatives: alternatives,
      source: 'generic'
    };
  }

  return {
    category: topCategory,
    confidence: Number(topScore.toFixed(3)),
    alternatives: alternatives,
    source: 'generic'
  };
}

module.exports = {
  genericCategoryMatcher,
  // Export for testing
  calculateKeywordScore,
  calculateAmountScore,
  CATEGORY_RULES
};
