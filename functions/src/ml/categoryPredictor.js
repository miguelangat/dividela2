/**
 * Category Predictor with User History Learning
 * Uses ML-like approach to predict expense categories based on:
 * 1. User's historical merchant patterns (exact matching)
 * 2. Fuzzy merchant matching (similar names)
 * 3. Keyword analysis from descriptions
 * 4. Generic pattern matching (fallback)
 */

const stringSimilarity = require('string-similarity');
const { genericCategoryMatcher } = require('./genericCategoryMatcher');

// Configuration
const CONFIDENCE_THRESHOLD = 0.55;
const FUZZY_MATCH_THRESHOLD = 0.6;
const MIN_EXACT_MATCHES = 2; // Minimum occurrences to trust pattern

/**
 * Find exact merchant match in user's expense history
 * Returns the most common category for this merchant
 *
 * @param {string} merchant - Merchant name to search for
 * @param {Array} userExpenses - User's expense history
 * @returns {Object|null} { category, confidence, count, source }
 */
function findExactMerchant(merchant, userExpenses) {
  if (!merchant || !userExpenses || userExpenses.length === 0) {
    return null;
  }

  const normalizedMerchant = merchant.toLowerCase().trim();

  // Find all expenses with this exact merchant
  const matchingExpenses = userExpenses.filter(expense =>
    expense.merchant && expense.merchant.toLowerCase().trim() === normalizedMerchant
  );

  if (matchingExpenses.length === 0) {
    return null;
  }

  // Count categories
  const categoryCounts = {};
  matchingExpenses.forEach(expense => {
    const category = expense.category;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  // Find most common category
  const sortedCategories = Object.entries(categoryCounts)
    .sort(([, countA], [, countB]) => countB - countA);

  const [dominantCategory, count] = sortedCategories[0];
  const totalMatches = matchingExpenses.length;

  // Confidence based on:
  // 1. How many times we've seen this merchant
  // 2. How consistent the category is
  const consistency = count / totalMatches;
  const frequency = Math.min(totalMatches / 10, 1); // Cap at 10 visits
  const confidence = (consistency * 0.7) + (frequency * 0.3);

  // Very high confidence for exact matches
  const finalConfidence = Math.min(0.9 + (confidence * 0.1), 0.99);

  return {
    category: dominantCategory,
    confidence: Number(finalConfidence.toFixed(3)),
    count: totalMatches,
    source: 'exact_merchant'
  };
}

/**
 * Find similar merchant using fuzzy string matching
 * Uses string-similarity library for matching
 *
 * @param {string} merchant - Merchant name to search for
 * @param {Array} userExpenses - User's expense history
 * @returns {Object|null} { category, confidence, matchedMerchant, source }
 */
function findSimilarMerchant(merchant, userExpenses) {
  if (!merchant || !userExpenses || userExpenses.length === 0) {
    return null;
  }

  const normalizedMerchant = merchant.toLowerCase().trim();

  // Get unique merchants from history
  const uniqueMerchants = [...new Set(
    userExpenses.map(e => e.merchant).filter(Boolean)
  )];

  if (uniqueMerchants.length === 0) {
    return null;
  }

  // Find best match using string similarity
  const matches = stringSimilarity.findBestMatch(
    normalizedMerchant,
    uniqueMerchants.map(m => m.toLowerCase())
  );

  const bestMatch = matches.bestMatch;

  // Only consider if similarity is above threshold
  if (bestMatch.rating < FUZZY_MATCH_THRESHOLD) {
    return null;
  }

  // Find the original merchant name (with proper case)
  const matchedMerchant = uniqueMerchants.find(
    m => m.toLowerCase() === bestMatch.target
  );

  // Now find exact match for this similar merchant
  const exactMatch = findExactMerchant(matchedMerchant, userExpenses);

  if (!exactMatch) {
    return null;
  }

  // Reduce confidence based on similarity score
  const similarityPenalty = bestMatch.rating;
  const adjustedConfidence = exactMatch.confidence * similarityPenalty * 0.85;

  return {
    category: exactMatch.category,
    confidence: Number(adjustedConfidence.toFixed(3)),
    matchedMerchant: matchedMerchant,
    similarity: Number(bestMatch.rating.toFixed(3)),
    source: 'fuzzy_merchant'
  };
}

/**
 * Analyze keywords in description to predict category
 * Learns from user's description patterns
 *
 * @param {string} description - Transaction description
 * @param {Array} userExpenses - User's expense history
 * @returns {Object|null} { category, confidence, keywords, source }
 */
function analyzeKeywords(description, userExpenses) {
  if (!description || !userExpenses || userExpenses.length === 0) {
    return null;
  }

  const normalizedDesc = description.toLowerCase();

  // Common keywords by category
  const keywordPatterns = {
    groceries: ['grocery', 'groceries', 'produce', 'vegetables', 'fruits', 'food', 'milk', 'eggs', 'bread'],
    food: ['coffee', 'breakfast', 'lunch', 'dinner', 'restaurant', 'cafe', 'burger', 'pizza', 'sushi', 'meal'],
    transport: ['gas', 'gasoline', 'fuel', 'uber', 'lyft', 'ride', 'taxi', 'parking', 'transit', 'car'],
    home: ['hardware', 'furniture', 'paint', 'home', 'house', 'renovation', 'repair', 'fixture', 'garden', 'lawn'],
    fun: ['movie', 'theater', 'game', 'entertainment', 'ticket', 'concert', 'sport', 'hobby', 'museum']
  };

  const categoryScores = {};

  // Score each category based on keyword matches
  for (const [category, keywords] of Object.entries(keywordPatterns)) {
    let score = 0;
    let matchedKeywords = [];

    for (const keyword of keywords) {
      if (normalizedDesc.includes(keyword)) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    }

    if (score > 0) {
      // Normalize score
      categoryScores[category] = {
        score: Math.min(score / 3, 1),
        keywords: matchedKeywords
      };
    }
  }

  if (Object.keys(categoryScores).length === 0) {
    return null;
  }

  // Find category with highest score
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b.score - a.score);

  const [topCategory, data] = sortedCategories[0];

  // Confidence based on keyword matches
  const confidence = 0.5 + (data.score * 0.3);

  return {
    category: topCategory,
    confidence: Number(confidence.toFixed(3)),
    keywords: data.keywords,
    source: 'keyword'
  };
}

/**
 * Aggregate multiple prediction sources into final prediction
 * Weights different sources and combines them intelligently
 *
 * @param {Array} predictions - Array of prediction objects
 * @returns {Object} { category, confidence, source }
 */
function aggregatePredictions(predictions) {
  if (!predictions || predictions.length === 0) {
    return {
      category: null,
      confidence: 0,
      source: 'none'
    };
  }

  // Source weights (higher = more trusted)
  const sourceWeights = {
    exact_merchant: 1.0,
    fuzzy_merchant: 0.75,
    keyword: 0.6,
    generic: 0.5
  };

  // Calculate weighted scores for each category
  const categoryScores = {};

  predictions.forEach(prediction => {
    const { category, confidence, source } = prediction;
    const weight = sourceWeights[source] || 0.5;
    const weightedScore = confidence * weight;

    if (!categoryScores[category]) {
      categoryScores[category] = {
        totalScore: 0,
        count: 0,
        maxConfidence: 0,
        sources: []
      };
    }

    categoryScores[category].totalScore += weightedScore;
    categoryScores[category].count += 1;
    categoryScores[category].maxConfidence = Math.max(
      categoryScores[category].maxConfidence,
      confidence
    );
    categoryScores[category].sources.push(source);
  });

  // Find winning category
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore);

  if (sortedCategories.length === 0) {
    return {
      category: null,
      confidence: 0,
      source: 'none'
    };
  }

  const [winningCategory, data] = sortedCategories[0];

  // Calculate final confidence
  // If multiple sources agree, boost confidence
  const agreementBonus = data.count > 1 ? 0.1 : 0;
  const avgScore = data.totalScore / data.count;
  const finalConfidence = Math.min(
    data.maxConfidence + agreementBonus,
    1.0
  );

  return {
    category: winningCategory,
    confidence: Number(finalConfidence.toFixed(3)),
    source: data.sources[0] // Primary source
  };
}

/**
 * Main prediction function
 * Combines all prediction methods with 55% confidence threshold
 *
 * @param {string} merchant - Merchant name
 * @param {number} amount - Transaction amount
 * @param {string} description - Transaction description
 * @param {Array} userExpenses - User's expense history
 * @returns {Object} { category, confidence, belowThreshold, alternatives, source }
 */
function predictCategory(merchant, amount, description = '', userExpenses = []) {
  const predictions = [];

  // 1. Try exact merchant match (highest priority)
  const exactMatch = findExactMerchant(merchant, userExpenses);
  if (exactMatch) {
    predictions.push(exactMatch);
  }

  // 2. Try fuzzy merchant match
  const fuzzyMatch = findSimilarMerchant(merchant, userExpenses);
  if (fuzzyMatch) {
    predictions.push(fuzzyMatch);
  }

  // 3. Try keyword analysis
  const keywordMatch = analyzeKeywords(description, userExpenses);
  if (keywordMatch) {
    predictions.push(keywordMatch);
  }

  // 4. Always include generic matcher as fallback
  const genericMatch = genericCategoryMatcher(merchant, amount, description);
  predictions.push(genericMatch);

  // Aggregate all predictions
  const result = aggregatePredictions(predictions);

  // Calculate alternatives from all predictions
  const allCategories = {};
  predictions.forEach(pred => {
    if (pred.category && pred.category !== result.category) {
      if (!allCategories[pred.category] || allCategories[pred.category] < pred.confidence) {
        allCategories[pred.category] = pred.confidence;
      }
    }
  });

  const alternatives = Object.entries(allCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category, confidence]) => ({
      category,
      confidence: Number(confidence.toFixed(3))
    }));

  // Apply confidence threshold
  const belowThreshold = result.confidence < CONFIDENCE_THRESHOLD;

  return {
    category: belowThreshold ? null : result.category,
    confidence: result.confidence,
    belowThreshold: belowThreshold,
    alternatives: alternatives,
    source: result.source
  };
}

module.exports = {
  predictCategory,
  findExactMerchant,
  findSimilarMerchant,
  analyzeKeywords,
  aggregatePredictions,
  CONFIDENCE_THRESHOLD
};
