/**
 * Auto-maps transaction descriptions to expense categories
 * Uses keyword matching and learning from user's past categorizations
 */

import { normalizeMerchantName, extractBaseMerchant, getMerchantCategoryFrequency } from './merchantNormalizer';
import {
  getBatchCachedCategories,
  batchCacheCategorySuggestions,
  cacheCategorySuggestion,
} from './importCache';

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
 * Uses merchant normalization and fuzzy matching to find similar descriptions
 */
function learnFromPastTransactions(description, pastTransactions) {
  const normalized = normalizeText(description);
  const merchantName = normalizeMerchantName(description);
  const baseMerchant = extractBaseMerchant(description);

  // Try 1: Find exact merchant match (normalized)
  if (merchantName) {
    const merchantMatches = pastTransactions.filter(
      t => normalizeMerchantName(t.description) === merchantName
    );

    if (merchantMatches.length > 0) {
      // Find most common category for this merchant
      const categoryFrequency = merchantMatches.reduce((freq, t) => {
        const cat = t.categoryKey || t.category;
        freq[cat] = (freq[cat] || 0) + 1;
        return freq;
      }, {});

      const mostCommonCategory = Object.entries(categoryFrequency)
        .sort((a, b) => b[1] - a[1])[0];

      const [categoryKey, count] = mostCommonCategory;
      const confidence = Math.min(0.95, 0.7 + (count / merchantMatches.length) * 0.25);

      return {
        categoryKey,
        confidence,
        matchedKeywords: ['merchant_match', merchantName],
        source: 'learned_merchant',
        matchCount: count,
        totalMatches: merchantMatches.length,
      };
    }
  }

  // Try 2: Find base merchant match
  if (baseMerchant && baseMerchant.length > 2) {
    const baseMerchantMatches = pastTransactions.filter(
      t => extractBaseMerchant(t.description) === baseMerchant
    );

    if (baseMerchantMatches.length > 0) {
      // Find most common category for this base merchant
      const categoryFrequency = baseMerchantMatches.reduce((freq, t) => {
        const cat = t.categoryKey || t.category;
        freq[cat] = (freq[cat] || 0) + 1;
        return freq;
      }, {});

      const mostCommonCategory = Object.entries(categoryFrequency)
        .sort((a, b) => b[1] - a[1])[0];

      const [categoryKey, count] = mostCommonCategory;
      const confidence = Math.min(0.9, 0.65 + (count / baseMerchantMatches.length) * 0.25);

      return {
        categoryKey,
        confidence,
        matchedKeywords: ['base_merchant_match', baseMerchant],
        source: 'learned_base_merchant',
        matchCount: count,
        totalMatches: baseMerchantMatches.length,
      };
    }
  }

  // Try 3: Find exact text matches
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

  // Try 4: Find similar transactions using word overlap
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
      confidence: best.similarity * 0.9, // Slightly lower confidence for fuzzy match
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
 * @param {Object} options - Additional options
 * @param {boolean} options.useCache - Use caching to avoid re-processing (default: true)
 * @returns {Array} Array of suggestions
 */
export function suggestCategoriesForTransactions(
  transactions,
  availableCategories,
  customKeywords = {},
  pastTransactions = null,
  options = {}
) {
  const { useCache = true } = options;

  // Check cache for existing suggestions
  const { cached, uncached } = useCache
    ? getBatchCachedCategories(transactions)
    : { cached: [], uncached: transactions };

  let cacheHitCount = cached.length;

  // Process only uncached transactions
  const newSuggestions = uncached.map(transaction => {
    const suggestion = suggestCategory(
      transaction.description,
      availableCategories,
      customKeywords,
      pastTransactions
    );

    // Cache the suggestion if caching is enabled
    if (useCache) {
      cacheCategorySuggestion(transaction, suggestion);
    }

    return {
      transaction,
      suggestion,
      fromCache: false,
    };
  });

  // Combine cached and new suggestions, maintaining original order
  const allSuggestions = transactions.map(transaction => {
    // Check if transaction was cached
    const cachedSuggestion = cached.find(c => c.transaction === transaction);
    if (cachedSuggestion) {
      return {
        transaction: cachedSuggestion.transaction,
        suggestion: cachedSuggestion.suggestion,
        fromCache: true,
      };
    }

    // Otherwise find in new suggestions
    return newSuggestions.find(s => s.transaction === transaction);
  });

  // Log cache performance
  if (useCache && cacheHitCount > 0) {
    console.log(`📦 Category Cache: ${cacheHitCount}/${transactions.length} hits (${((cacheHitCount / transactions.length) * 100).toFixed(1)}%)`);
  }

  return allSuggestions;
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

/**
 * Category correction tracking for learning from user overrides
 */

// In-memory store for category corrections (can be persisted to Firestore)
const categoryCorrections = new Map();

/**
 * Record a category correction when user overrides a suggestion
 *
 * @param {Object} transaction - The transaction that was corrected
 * @param {string} suggestedCategory - The category that was suggested
 * @param {string} correctedCategory - The category the user selected
 * @param {Object} metadata - Additional metadata (optional)
 * @returns {Object} Correction record
 */
export function recordCategoryCorrection(transaction, suggestedCategory, correctedCategory, metadata = {}) {
  const merchantName = normalizeMerchantName(transaction.description);
  const baseMerchant = extractBaseMerchant(transaction.description);

  const correction = {
    merchantName,
    baseMerchant,
    description: transaction.description,
    normalizedDescription: normalizeText(transaction.description),
    suggestedCategory,
    correctedCategory,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // Store by normalized merchant name for fast lookup
  if (!categoryCorrections.has(merchantName)) {
    categoryCorrections.set(merchantName, []);
  }

  categoryCorrections.get(merchantName).push(correction);

  console.log(`📝 Correction recorded: "${merchantName}" → ${correctedCategory} (was: ${suggestedCategory})`);

  return correction;
}

/**
 * Get all corrections for a merchant
 *
 * @param {string} merchantName - Normalized merchant name
 * @returns {Array} Array of corrections
 */
export function getCorrectionsForMerchant(merchantName) {
  const normalized = normalizeMerchantName(merchantName);
  return categoryCorrections.get(normalized) || [];
}

/**
 * Get the most common corrected category for a merchant
 *
 * @param {string} merchantName - Merchant name (will be normalized)
 * @returns {Object|null} Most common correction with confidence
 */
export function getMostCommonCorrection(merchantName) {
  const corrections = getCorrectionsForMerchant(merchantName);

  if (corrections.length === 0) {
    return null;
  }

  // Count frequency of each corrected category
  const categoryFrequency = corrections.reduce((freq, correction) => {
    freq[correction.correctedCategory] = (freq[correction.correctedCategory] || 0) + 1;
    return freq;
  }, {});

  // Find most common
  const sorted = Object.entries(categoryFrequency).sort((a, b) => b[1] - a[1]);
  const [categoryKey, count] = sorted[0];

  // High confidence if user has corrected multiple times
  const confidence = Math.min(0.99, 0.8 + (count / corrections.length) * 0.19);

  return {
    categoryKey,
    confidence,
    correctionCount: count,
    totalCorrections: corrections.length,
    source: 'user_correction',
  };
}

/**
 * Enhanced suggestion that prioritizes user corrections
 *
 * @param {string} description - Transaction description
 * @param {Array} availableCategories - Available category keys
 * @param {Object} customKeywords - Custom keyword mappings (optional)
 * @param {Object} pastTransactions - User's past transactions for learning (optional)
 * @param {boolean} useCorrections - Use correction data (default: true)
 * @returns {Object} Suggested category with confidence score
 */
export function suggestCategoryWithCorrections(
  description,
  availableCategories = ['food', 'groceries', 'transport', 'home', 'fun', 'other'],
  customKeywords = {},
  pastTransactions = null,
  useCorrections = true
) {
  // First, check if user has corrected this merchant before
  if (useCorrections) {
    const merchantName = normalizeMerchantName(description);
    const correction = getMostCommonCorrection(merchantName);

    if (correction && correction.confidence > 0.8) {
      console.log(`✨ Using correction for "${merchantName}": ${correction.categoryKey} (confidence: ${correction.confidence.toFixed(2)})`);
      return {
        categoryKey: correction.categoryKey,
        confidence: correction.confidence,
        matchedKeywords: ['user_correction'],
        source: 'user_correction',
        correctionCount: correction.correctionCount,
      };
    }
  }

  // Fall back to regular suggestion logic
  return suggestCategory(description, availableCategories, customKeywords, pastTransactions);
}

/**
 * Batch suggest categories with correction learning
 *
 * @param {Array} transactions - Array of transactions
 * @param {Array} availableCategories - Available category keys
 * @param {Object} customKeywords - Custom keyword mappings
 * @param {Array} pastTransactions - User's past transactions
 * @param {Object} options - Additional options
 * @param {boolean} options.useCache - Use caching (default: true)
 * @param {boolean} options.useCorrections - Use correction data (default: true)
 * @returns {Array} Array of suggestions
 */
export function suggestCategoriesWithCorrections(
  transactions,
  availableCategories,
  customKeywords = {},
  pastTransactions = null,
  options = {}
) {
  const { useCache = true, useCorrections = true } = options;

  // Check cache first
  const { cached, uncached } = useCache
    ? getBatchCachedCategories(transactions)
    : { cached: [], uncached: transactions };

  let cacheHitCount = cached.length;
  let correctionHitCount = 0;

  // Process uncached transactions
  const newSuggestions = uncached.map(transaction => {
    const suggestion = suggestCategoryWithCorrections(
      transaction.description,
      availableCategories,
      customKeywords,
      pastTransactions,
      useCorrections
    );

    if (suggestion.source === 'user_correction') {
      correctionHitCount++;
    }

    // Cache the suggestion
    if (useCache) {
      cacheCategorySuggestion(transaction, suggestion);
    }

    return {
      transaction,
      suggestion,
      fromCache: false,
    };
  });

  // Combine results
  const allSuggestions = transactions.map(transaction => {
    const cachedSuggestion = cached.find(c => c.transaction === transaction);
    if (cachedSuggestion) {
      return {
        transaction: cachedSuggestion.transaction,
        suggestion: cachedSuggestion.suggestion,
        fromCache: true,
      };
    }

    return newSuggestions.find(s => s.transaction === transaction);
  });

  // Log performance
  if (useCache && cacheHitCount > 0) {
    console.log(`📦 Category Cache: ${cacheHitCount}/${transactions.length} hits (${((cacheHitCount / transactions.length) * 100).toFixed(1)}%)`);
  }
  if (useCorrections && correctionHitCount > 0) {
    console.log(`✨ Corrections Used: ${correctionHitCount}/${uncached.length} uncached (${((correctionHitCount / Math.max(uncached.length, 1)) * 100).toFixed(1)}%)`);
  }

  return allSuggestions;
}

/**
 * Get all correction statistics
 *
 * @returns {Object} Correction statistics
 */
export function getCorrectionStats() {
  let totalCorrections = 0;
  const merchantCount = categoryCorrections.size;
  const categoryDistribution = {};

  for (const corrections of categoryCorrections.values()) {
    totalCorrections += corrections.length;
    corrections.forEach(correction => {
      categoryDistribution[correction.correctedCategory] =
        (categoryDistribution[correction.correctedCategory] || 0) + 1;
    });
  }

  return {
    totalCorrections,
    uniqueMerchants: merchantCount,
    averageCorrectionsPerMerchant: merchantCount > 0 ? totalCorrections / merchantCount : 0,
    categoryDistribution,
  };
}

/**
 * Export corrections for persistence (e.g., to Firestore)
 *
 * @returns {Array} Array of all corrections
 */
export function exportCorrections() {
  const allCorrections = [];

  for (const [merchantName, corrections] of categoryCorrections.entries()) {
    corrections.forEach(correction => {
      allCorrections.push({
        merchantName,
        ...correction,
      });
    });
  }

  return allCorrections;
}

/**
 * Import corrections from persistent storage
 *
 * @param {Array} corrections - Array of correction records
 * @returns {number} Number of corrections imported
 */
export function importCorrections(corrections) {
  let importedCount = 0;

  corrections.forEach(correction => {
    const { merchantName } = correction;

    if (!categoryCorrections.has(merchantName)) {
      categoryCorrections.set(merchantName, []);
    }

    categoryCorrections.get(merchantName).push(correction);
    importedCount++;
  });

  console.log(`📥 Imported ${importedCount} category corrections for ${categoryCorrections.size} merchants`);

  return importedCount;
}

/**
 * Clear all corrections (useful for testing or reset)
 *
 * @returns {number} Number of corrections cleared
 */
export function clearCorrections() {
  const count = Array.from(categoryCorrections.values()).reduce((sum, arr) => sum + arr.length, 0);
  categoryCorrections.clear();
  console.log(`🗑️ Cleared ${count} category corrections`);
  return count;
}

export default {
  suggestCategory,
  suggestCategoriesForTransactions,
  suggestCategoryWithCorrections,
  suggestCategoriesWithCorrections,
  getCategorySuggestionStats,
  addCustomKeyword,
  recordCategoryCorrection,
  getCorrectionsForMerchant,
  getMostCommonCorrection,
  getCorrectionStats,
  exportCorrections,
  importCorrections,
  clearCorrections,
  DEFAULT_CATEGORY_KEYWORDS,
};
