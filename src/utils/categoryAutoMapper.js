/**
 * Auto-maps transaction descriptions to expense categories
 * Uses keyword matching and learning from user's past categorizations
 */

/**
 * Default keyword mappings for common categories
 * These can be extended or customized by users
 */
const DEFAULT_CATEGORY_KEYWORDS = {
  food: [
    'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'mcdonald', 'mcdonalds',
    'burger king', 'kfc', 'subway', 'starbucks', 'dunkin', 'chipotle',
    'taco bell', 'wendys', 'dominos', 'pizza hut', 'panera', 'chick-fil-a',
    'five guys', 'shake shack', 'in-n-out', 'panda express', 'popeyes',
    'restaurant', 'diner', 'bistro', 'grill', 'bar', 'pub', 'eatery',
    'food', 'dining', 'meal', 'lunch', 'dinner', 'breakfast', 'brunch',
    'delivery', 'uber eats', 'doordash', 'grubhub', 'postmates', 'deliveroo',
  ],
  groceries: [
    'supermarket', 'grocery', 'market', 'whole foods', 'trader joe',
    'safeway', 'kroger', 'albertsons', 'publix', 'wegmans', 'aldi',
    'costco', 'walmart', 'target', 'sams club', 'bjs', 'food lion',
    'harris teeter', 'giant', 'stop & shop', 'shoprite', 'hannaford',
    'winn dixie', 'meijer', 'heb', 'sprouts', 'fresh market',
  ],
  transport: [
    'uber', 'lyft', 'taxi', 'cab', 'gas', 'gasoline', 'fuel', 'shell',
    'exxon', 'bp', 'chevron', 'mobil', 'sunoco', 'arco', 'citgo',
    'parking', 'park', 'garage', 'metro', 'subway', 'bus', 'train',
    'transit', 'mta', 'bart', 'cta', 'wmata', 'septa', 'mbta',
    'toll', 'ezpass', 'fastrak', 'sunpass', 'rental car', 'zipcar',
    'car2go', 'turo', 'hertz', 'enterprise', 'avis', 'budget',
    'auto', 'vehicle', 'car wash', 'oil change', 'smog', 'registration',
  ],
  home: [
    'rent', 'lease', 'landlord', 'apartment', 'housing', 'mortgage',
    'utilities', 'electric', 'electricity', 'power', 'gas', 'water',
    'sewer', 'trash', 'garbage', 'internet', 'wifi', 'cable', 'phone',
    'comcast', 'xfinity', 'verizon', 'at&t', 'spectrum', 'cox',
    'directv', 'dish', 'century link', 'frontier', 't-mobile', 'sprint',
    'furniture', 'ikea', 'home depot', 'lowes', 'ace hardware',
    'bed bath', 'wayfair', 'crate & barrel', 'pottery barn', 'west elm',
    'repair', 'maintenance', 'plumber', 'electrician', 'hvac', 'cleaning',
  ],
  fun: [
    'movie', 'cinema', 'theater', 'theatre', 'amc', 'regal', 'cinemark',
    'netflix', 'hulu', 'disney', 'disney+', 'hbo', 'amazon prime',
    'spotify', 'apple music', 'youtube', 'twitch', 'playstation',
    'xbox', 'nintendo', 'steam', 'game', 'gaming', 'entertainment',
    'concert', 'show', 'event', 'ticket', 'ticketmaster', 'stubhub',
    'museum', 'zoo', 'aquarium', 'park', 'amusement', 'theme park',
    'disneyland', 'universal', 'six flags', 'gym', 'fitness', 'yoga',
    'peloton', 'planet fitness', 'la fitness', 'equinox', '24 hour',
    'spa', 'salon', 'massage', 'barber', 'haircut', 'nails', 'beauty',
  ],
  other: [
    'amazon', 'ebay', 'walmart', 'target', 'best buy', 'apple',
    'microsoft', 'google', 'paypal', 'venmo', 'cash app', 'zelle',
    'atm', 'withdrawal', 'transfer', 'payment', 'purchase', 'misc',
  ],
};

/**
 * Normalize text for matching
 */
function normalizeText(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Calculate match score for a description against category keywords
 */
function calculateMatchScore(description, keywords) {
  const normalized = normalizeText(description);
  let score = 0;
  let matchedKeywords = [];

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);

    // Exact match (highest score)
    if (normalized === normalizedKeyword) {
      score += 10;
      matchedKeywords.push(keyword);
    }
    // Whole word match
    else if (new RegExp(`\\b${normalizedKeyword}\\b`).test(normalized)) {
      score += 5;
      matchedKeywords.push(keyword);
    }
    // Partial match
    else if (normalized.includes(normalizedKeyword)) {
      score += 2;
      matchedKeywords.push(keyword);
    }
  }

  return { score, matchedKeywords };
}

/**
 * Auto-suggest category for a transaction based on description
 *
 * @param {string} description - Transaction description
 * @param {Array} availableCategories - Available category keys
 * @param {Object} customKeywords - Custom keyword mappings (optional)
 * @param {Object} pastTransactions - User's past transactions for learning (optional)
 * @returns {Object} Suggested category with confidence score
 */
export function suggestCategory(
  description,
  availableCategories = ['food', 'groceries', 'transport', 'home', 'fun', 'other'],
  customKeywords = {},
  pastTransactions = null
) {
  if (!description || description.trim().length === 0) {
    return {
      categoryKey: 'other',
      confidence: 0,
      matchedKeywords: [],
      source: 'default',
    };
  }

  // Merge custom keywords with defaults
  const keywordMappings = { ...DEFAULT_CATEGORY_KEYWORDS, ...customKeywords };

  // Try learning from past transactions first
  if (pastTransactions && pastTransactions.length > 0) {
    const learnedCategory = learnFromPastTransactions(description, pastTransactions);
    if (learnedCategory && learnedCategory.confidence > 0.8) {
      return learnedCategory;
    }
  }

  // Calculate scores for each available category
  const categoryScores = availableCategories.map(categoryKey => {
    const keywords = keywordMappings[categoryKey.toLowerCase()] || [];
    const { score, matchedKeywords } = calculateMatchScore(description, keywords);

    return {
      categoryKey,
      score,
      matchedKeywords,
    };
  });

  // Sort by score (highest first)
  categoryScores.sort((a, b) => b.score - a.score);

  const best = categoryScores[0];

  // Calculate confidence (0-1 scale)
  const maxPossibleScore = 10; // Exact match score
  const confidence = Math.min(best.score / maxPossibleScore, 1);

  // Only suggest if confidence is above threshold
  if (confidence < 0.2) {
    return {
      categoryKey: 'other',
      confidence: 0,
      matchedKeywords: [],
      source: 'default',
    };
  }

  return {
    categoryKey: best.categoryKey,
    confidence,
    matchedKeywords: best.matchedKeywords,
    source: 'keyword_match',
  };
}

/**
 * Learn category from user's past transactions
 * Uses fuzzy matching to find similar descriptions
 */
function learnFromPastTransactions(description, pastTransactions) {
  const normalized = normalizeText(description);

  // Find exact matches
  const exactMatch = pastTransactions.find(
    t => normalizeText(t.description) === normalized
  );

  if (exactMatch) {
    return {
      categoryKey: exactMatch.categoryKey || exactMatch.category,
      confidence: 1.0,
      matchedKeywords: ['exact_match'],
      source: 'learned_exact',
    };
  }

  // Find similar transactions using Levenshtein distance or word overlap
  const similarTransactions = pastTransactions
    .map(t => ({
      ...t,
      similarity: calculateSimilarity(normalized, normalizeText(t.description)),
    }))
    .filter(t => t.similarity > 0.7)
    .sort((a, b) => b.similarity - a.similarity);

  if (similarTransactions.length > 0) {
    const best = similarTransactions[0];
    return {
      categoryKey: best.categoryKey || best.category,
      confidence: best.similarity,
      matchedKeywords: ['similar_transaction'],
      source: 'learned_similar',
    };
  }

  return null;
}

/**
 * Calculate similarity between two strings (0-1 scale)
 * Uses word overlap method
 */
function calculateSimilarity(str1, str2) {
  const words1 = str1.split(' ').filter(w => w.length > 2);
  const words2 = str2.split(' ').filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const commonWords = words1.filter(w => words2.includes(w));
  const unionSize = new Set([...words1, ...words2]).size;

  return commonWords.length / unionSize;
}

/**
 * Batch suggest categories for multiple transactions
 *
 * @param {Array} transactions - Array of transactions
 * @param {Array} availableCategories - Available category keys
 * @param {Object} customKeywords - Custom keyword mappings
 * @param {Array} pastTransactions - User's past transactions
 * @returns {Array} Array of suggestions
 */
export function suggestCategoriesForTransactions(
  transactions,
  availableCategories,
  customKeywords = {},
  pastTransactions = null
) {
  return transactions.map(transaction => ({
    transaction,
    suggestion: suggestCategory(
      transaction.description,
      availableCategories,
      customKeywords,
      pastTransactions
    ),
  }));
}

/**
 * Get category statistics from suggestions
 */
export function getCategorySuggestionStats(suggestions) {
  const stats = {
    total: suggestions.length,
    highConfidence: 0, // > 0.7
    mediumConfidence: 0, // 0.4 - 0.7
    lowConfidence: 0, // < 0.4
    byCategory: {},
  };

  suggestions.forEach(({ suggestion }) => {
    if (suggestion.confidence > 0.7) {
      stats.highConfidence++;
    } else if (suggestion.confidence >= 0.4) {
      stats.mediumConfidence++;
    } else {
      stats.lowConfidence++;
    }

    const cat = suggestion.categoryKey;
    stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
  });

  return stats;
}

/**
 * Add custom keyword to category mapping
 *
 * @param {Object} customKeywords - Current custom keywords
 * @param {string} categoryKey - Category to add keyword to
 * @param {string} keyword - Keyword to add
 * @returns {Object} Updated custom keywords
 */
export function addCustomKeyword(customKeywords, categoryKey, keyword) {
  const updated = { ...customKeywords };

  if (!updated[categoryKey]) {
    updated[categoryKey] = [];
  }

  const normalized = normalizeText(keyword);
  if (!updated[categoryKey].includes(normalized)) {
    updated[categoryKey].push(normalized);
  }

  return updated;
}

export default {
  suggestCategory,
  suggestCategoriesForTransactions,
  getCategorySuggestionStats,
  addCustomKeyword,
  DEFAULT_CATEGORY_KEYWORDS,
};
