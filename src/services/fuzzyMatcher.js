// src/services/fuzzyMatcher.js
// Fuzzy string matching utilities for category name matching

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits needed to change one string into another)
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1, higher is more similar)
 */
function similarityScore(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(str1, str2);
  return 1.0 - distance / maxLength;
}

/**
 * Normalize string for comparison (lowercase, remove special chars, trim)
 */
function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Find the best matching category from a list of categories
 *
 * @param {string} input - User input text (e.g., "groceris", "food")
 * @param {object} categories - Categories object from BudgetContext
 * @param {number} threshold - Minimum similarity threshold (0-1)
 * @returns {object|null} - Matching category or null if no good match
 */
export function findMatchingCategory(input, categories, threshold = 0.6) {
  if (!input || !categories || Object.keys(categories).length === 0) {
    return null;
  }

  const normalizedInput = normalizeString(input);
  let bestMatch = null;
  let bestScore = 0;

  // Try to find matches
  for (const [key, category] of Object.entries(categories)) {
    const normalizedName = normalizeString(category.name);
    const normalizedKey = normalizeString(key);

    // Exact match (case-insensitive)
    if (normalizedInput === normalizedName || normalizedInput === normalizedKey) {
      return { key, category, score: 1.0, exact: true };
    }

    // Check if input is contained in category name
    if (normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName)) {
      const score = 0.9; // High score for substring match
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { key, category, score, exact: false };
      }
      continue;
    }

    // Calculate fuzzy similarity for both name and key
    const nameScore = similarityScore(normalizedInput, normalizedName);
    const keyScore = similarityScore(normalizedInput, normalizedKey);
    const score = Math.max(nameScore, keyScore);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { key, category, score, exact: false };
    }
  }

  // Return match only if it meets the threshold
  if (bestMatch && bestScore >= threshold) {
    return bestMatch;
  }

  return null;
}

/**
 * Find multiple possible category matches (for disambiguation)
 *
 * @param {string} input - User input text
 * @param {object} categories - Categories object
 * @param {number} threshold - Minimum similarity threshold
 * @param {number} maxResults - Maximum number of results to return
 * @returns {array} - Array of matching categories sorted by score
 */
export function findMultipleMatches(input, categories, threshold = 0.5, maxResults = 3) {
  if (!input || !categories || Object.keys(categories).length === 0) {
    return [];
  }

  const normalizedInput = normalizeString(input);
  const matches = [];

  for (const [key, category] of Object.entries(categories)) {
    const normalizedName = normalizeString(category.name);
    const normalizedKey = normalizeString(key);

    // Calculate similarity scores
    const nameScore = similarityScore(normalizedInput, normalizedName);
    const keyScore = similarityScore(normalizedInput, normalizedKey);
    const score = Math.max(nameScore, keyScore);

    // Check for exact or substring matches
    const exact = normalizedInput === normalizedName || normalizedInput === normalizedKey;
    const substring = normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName);

    if (score >= threshold || exact || substring) {
      matches.push({
        key,
        category,
        score: exact ? 1.0 : (substring ? 0.9 : score),
        exact,
      });
    }
  }

  // Sort by score (descending) and return top results
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Suggest category based on expense description keywords
 *
 * @param {string} description - Expense description
 * @param {object} categories - Categories object
 * @returns {object|null} - Suggested category or null
 */
export function suggestCategoryFromDescription(description, categories) {
  const normalizedDesc = normalizeString(description);

  // Common keywords for each category type
  const categoryKeywords = {
    groceries: ['grocery', 'groceries', 'supermarket', 'market', 'food shopping', 'trader joe', 'whole foods', 'safeway', 'walmart'],
    food: ['restaurant', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee', 'pizza', 'burger', 'meal', 'takeout', 'delivery'],
    transport: ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus', 'train', 'subway', 'transit'],
    home: ['rent', 'mortgage', 'utilities', 'electricity', 'water', 'internet', 'cable', 'cleaning', 'maintenance'],
    entertainment: ['movie', 'cinema', 'concert', 'game', 'netflix', 'spotify', 'subscription', 'hobby', 'fun'],
    healthcare: ['doctor', 'hospital', 'pharmacy', 'medicine', 'medical', 'health', 'dentist', 'prescription'],
    shopping: ['clothes', 'clothing', 'shoes', 'amazon', 'mall', 'store', 'shop'],
    other: [], // Catch-all
  };

  let bestMatch = null;
  let highestKeywordCount = 0;

  for (const [categoryKey, keywords] of Object.entries(categoryKeywords)) {
    let matchCount = 0;

    for (const keyword of keywords) {
      if (normalizedDesc.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount > highestKeywordCount) {
      highestKeywordCount = matchCount;

      // Find the actual category object
      const category = Object.entries(categories).find(
        ([key, cat]) => normalizeString(key) === categoryKey || normalizeString(cat.name) === categoryKey
      );

      if (category) {
        bestMatch = {
          key: category[0],
          category: category[1],
          score: 0.8,
          reason: 'keyword',
        };
      }
    }
  }

  return bestMatch;
}

export default {
  findMatchingCategory,
  findMultipleMatches,
  suggestCategoryFromDescription,
  levenshteinDistance,
  similarityScore,
};
