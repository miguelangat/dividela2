/**
 * Merchant name normalization for better category suggestions and duplicate detection
 * Normalizes merchant names like "STARBUCKS #123" and "STARBUCKS STORE 456" to "starbucks"
 */

/**
 * Common merchant patterns to remove
 */
const PATTERNS_TO_REMOVE = [
  // Store numbers and IDs
  /#\d+/g,                      // #123, #456
  /STORE\s+#?\d+/gi,            // STORE 123, STORE #456
  /LOCATION\s+#?\d+/gi,         // LOCATION 123
  /BRANCH\s+#?\d+/gi,           // BRANCH 456
  /\bSTR\s*\d+/gi,              // STR123, STR 456
  /\bLOC\s*\d+/gi,              // LOC123

  // Dates and timestamps
  /\d{2}\/\d{2}\/\d{2,4}/g,     // 01/15/2024, 01/15/24
  /\d{2}-\d{2}-\d{2,4}/g,       // 01-15-2024
  /\d{4}-\d{2}-\d{2}/g,         // 2024-01-15
  /\d{2}:\d{2}:\d{2}/g,         // 12:34:56

  // Transaction IDs and reference numbers
  /\bTXN\s*#?\d+/gi,            // TXN123, TXN #456
  /\bREF\s*#?\d+/gi,            // REF123
  /\bINV\s*#?\d+/gi,            // INV123 (invoice)
  /\bORD\s*#?\d+/gi,            // ORD123 (order)

  // Card info
  /\*\*\*\*\d{4}/g,             // ****1234
  /CARD\s+\d{4}/gi,             // CARD 1234
  /ENDING\s+IN\s+\d{4}/gi,      // ENDING IN 1234

  // Common suffixes
  /\bINC\.?$/gi,                // INC, INC.
  /\bLLC\.?$/gi,                // LLC, LLC.
  /\bLTD\.?$/gi,                // LTD, LTD.
  /\bCORP\.?$/gi,               // CORP, CORP.
  /\bCO\.?$/gi,                 // CO, CO.
  /\b(USA|US|UK|CA|AU)\b/gi,    // Country codes

  // Payment processor info
  /\*\s*SQ\s*\*/gi,             // * SQ * (Square)
  /PAYPAL\s+\*/gi,              // PAYPAL *
  /VENMO\s+\*/gi,               // VENMO *
  /ZELLE\s+\*/gi,               // ZELLE *

  // Common descriptors
  /\bPURCHASE\b/gi,
  /\bSALE\b/gi,
  /\bPOS\b/gi,                  // Point of Sale
  /\bDEBIT\b/gi,
  /\bCREDIT\b/gi,
  /\bONLINE\b/gi,
  /\bMOBILE\b/gi,
  /\bAPP\b/gi,

  // Extra whitespace
  /\s{2,}/g,                    // Multiple spaces → single space
];

/**
 * Common merchant prefixes/suffixes that should be kept
 * (Don't remove these as they're part of the brand identity)
 */
const KEEP_PATTERNS = [
  'amazon',
  'target',
  'walmart',
  'costco',
  'whole foods',
  'trader joe',
  'safeway',
  'kroger',
  'publix',
  // Add more as needed
];

/**
 * Normalize a merchant name for comparison and grouping
 *
 * @param {string} merchantName - Raw merchant name from transaction
 * @returns {string} Normalized merchant name
 */
export function normalizeMerchantName(merchantName) {
  if (!merchantName || typeof merchantName !== 'string') {
    return '';
  }

  let normalized = merchantName;

  // Convert to lowercase
  normalized = normalized.toLowerCase();

  // Remove patterns in order
  PATTERNS_TO_REMOVE.forEach(pattern => {
    normalized = normalized.replace(pattern, ' ');
  });

  // Clean up extra spaces
  normalized = normalized.replace(/\s{2,}/g, ' ').trim();

  // Remove leading/trailing special characters
  normalized = normalized.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');

  return normalized;
}

/**
 * Extract base merchant name (first meaningful word or two)
 *
 * @param {string} merchantName - Raw or normalized merchant name
 * @returns {string} Base merchant name (e.g., "starbucks" from "starbucks coffee")
 */
export function extractBaseMerchant(merchantName) {
  const normalized = normalizeMerchantName(merchantName);

  // Split into words
  const words = normalized.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    return '';
  }

  // Return first meaningful word (skip very short words unless it's the only word)
  if (words.length === 1) {
    return words[0];
  }

  // If first word is very short (< 3 chars), include second word
  if (words[0].length < 3 && words.length > 1) {
    return `${words[0]} ${words[1]}`;
  }

  // Otherwise just return first word
  return words[0];
}

/**
 * Check if two merchant names are the same after normalization
 *
 * @param {string} merchant1 - First merchant name
 * @param {string} merchant2 - Second merchant name
 * @returns {boolean} True if they're the same merchant
 */
export function isSameMerchant(merchant1, merchant2) {
  const norm1 = normalizeMerchantName(merchant1);
  const norm2 = normalizeMerchantName(merchant2);

  if (norm1 === norm2) {
    return true;
  }

  // Also check base merchant names
  const base1 = extractBaseMerchant(merchant1);
  const base2 = extractBaseMerchant(merchant2);

  return base1 === base2 && base1.length > 0;
}

/**
 * Group transactions by normalized merchant name
 *
 * @param {Array} transactions - Array of transactions
 * @returns {Map} Map of normalized merchant name → transactions
 */
export function groupByMerchant(transactions) {
  const groups = new Map();

  transactions.forEach(transaction => {
    const normalized = normalizeMerchantName(transaction.description);

    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }

    groups.get(normalized).push(transaction);
  });

  return groups;
}

/**
 * Get merchant frequency map for category learning
 *
 * @param {Array} transactions - Array of transactions with categories
 * @returns {Map} Map of merchant → {category → count}
 */
export function getMerchantCategoryFrequency(transactions) {
  const merchantCategories = new Map();

  transactions.forEach(transaction => {
    if (!transaction.categoryKey) {
      return;
    }

    const merchant = normalizeMerchantName(transaction.description);

    if (!merchantCategories.has(merchant)) {
      merchantCategories.set(merchant, new Map());
    }

    const categoryMap = merchantCategories.get(merchant);
    const currentCount = categoryMap.get(transaction.categoryKey) || 0;
    categoryMap.set(transaction.categoryKey, currentCount + 1);
  });

  return merchantCategories;
}

export default {
  normalizeMerchantName,
  extractBaseMerchant,
  isSameMerchant,
  groupByMerchant,
  getMerchantCategoryFrequency,
};
