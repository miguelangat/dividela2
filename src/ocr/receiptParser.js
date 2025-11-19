/**
 * Receipt Parser Functions
 * TDD Implementation - Extracts amount, merchant, and date from receipt OCR text
 *
 * This module provides three main functions:
 * - extractAmount: Finds monetary amounts, prioritizing keywords like "TOTAL"
 * - extractMerchant: Extracts business name from the first valid line
 * - extractDate: Parses dates in various formats (US, European, ISO, text)
 *
 * All functions are designed to handle real-world receipt variations and OCR errors.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Priority keywords for finding total amounts (ordered by priority)
 * Used to identify the main total amount on a receipt
 */
const AMOUNT_PRIORITY_KEYWORDS = [
  'GRAND TOTAL',
  'TOTAL',
  'AMOUNT DUE',
  'BALANCE',
  'FUEL TOTAL',
];

/**
 * Month name to number mappings for date parsing
 */
const MONTH_NAMES = {
  'jan': '01', 'january': '01',
  'feb': '02', 'february': '02',
  'mar': '03', 'march': '03',
  'apr': '04', 'april': '04',
  'may': '05',
  'jun': '06', 'june': '06',
  'jul': '07', 'july': '07',
  'aug': '08', 'august': '08',
  'sep': '09', 'september': '09',
  'oct': '10', 'october': '10',
  'nov': '11', 'november': '11',
  'dec': '12', 'december': '12',
};

/**
 * Regular expressions for matching different currency amount formats
 * Ordered by specificity (most specific patterns first)
 */
const AMOUNT_PATTERNS = [
  // US format with thousands separator: $1,234.56 or 1,234.56
  /[\$€£¥]?\s*(\d{1,3}(?:,\d{3})+\.\d{2,3})/g,
  // European format with thousands separator: 1.234,56 EUR
  /(\d{1,3}(?:\.\d{3})+,\d{2})\s*[€£¥]?/g,
  // European format without thousands separator: 45,32 EUR
  /(\d+,\d{2})\s*[€£¥]?/g,
  // US format without thousands separator: $123.45 or 123.45
  /[\$€£¥]?\s*(\d+\.\d{2,3})\b/g,
  // Whole dollar amounts with currency symbol: $50
  /[\$€£¥]\s*(\d+)\b/g,
];

/**
 * Maximum reasonable amount to extract (to filter out mismatched numbers)
 */
const MAX_REASONABLE_AMOUNT = 1000000;

/**
 * Maximum merchant name length
 */
const MAX_MERCHANT_NAME_LENGTH = 50;

/**
 * Minimum merchant name length
 */
const MIN_MERCHANT_NAME_LENGTH = 2;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Extract amount from receipt text
 *
 * Strategy:
 * 1. First, look for amounts near priority keywords (TOTAL, GRAND TOTAL, etc.)
 * 2. If no keyword match, collect all amounts and return the largest
 * 3. Supports both US ($1,234.56) and European (1.234,56€) formats
 *
 * @param {string} text - OCR text from receipt
 * @returns {number|null} - Extracted amount or null if not found
 */
export const extractAmount = (text) => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Normalize text to uppercase for easier keyword matching
  const normalizedText = text.toUpperCase();

  // Strategy 1: Try to find amounts near priority keywords first
  for (const keyword of AMOUNT_PRIORITY_KEYWORDS) {
    const amount = findAmountNearKeyword(text, normalizedText, keyword);
    if (amount !== null) {
      return amount;
    }
  }

  // Strategy 2: If no keyword match, collect all amounts and return the largest
  return findLargestAmount(text);
};

// ============================================================================
// PRIVATE HELPER FUNCTIONS - AMOUNT EXTRACTION
// ============================================================================

/**
 * Find amount near a specific keyword
 * @param {string} text - Original text
 * @param {string} normalizedText - Uppercased text for matching
 * @param {string} keyword - Keyword to search for
 * @returns {number|null} - Found amount or null
 */
const findAmountNearKeyword = (text, normalizedText, keyword) => {
  // Use word boundary regex to match whole words only (avoid matching TOTAL in SUBTOTAL)
  const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
  const match = normalizedText.match(keywordRegex);

  if (!match) {
    return null;
  }

  const keywordIndex = match.index;
  // Look for amount in the same line (next 100 characters after the keyword)
  const snippet = text.substring(keywordIndex, keywordIndex + 100);
  // Split by newline to get just the current line
  const line = snippet.split('\n')[0];

  // Try each amount pattern
  for (const pattern of AMOUNT_PATTERNS) {
    const matches = [...line.matchAll(pattern)];
    for (const match of matches) {
      const amount = parseAmount(match[1] || match[0]);
      if (amount !== null && amount > 0) {
        return amount;
      }
    }
  }

  return null;
};

/**
 * Find the largest amount in the text
 * @param {string} text - Receipt text
 * @returns {number|null} - Largest amount or null if none found
 */
const findLargestAmount = (text) => {
  const amounts = [];

  for (const pattern of AMOUNT_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const amount = parseAmount(match[1] || match[0]);
      if (amount !== null && amount > 0 && amount < MAX_REASONABLE_AMOUNT) {
        amounts.push(amount);
      }
    }
  }

  return amounts.length > 0 ? Math.max(...amounts) : null;
};

/**
 * Parse amount string to number, handling both US and European formats
 * @param {string} amountStr - Amount string to parse (e.g., "1,234.56" or "1.234,56")
 * @returns {number|null} - Parsed amount or null
 */
const parseAmount = (amountStr) => {
  if (!amountStr) return null;

  // Remove currency symbols and whitespace
  let cleaned = amountStr.replace(/[\$€£¥\s]/g, '');

  // Detect format based on comma and period positions
  const lastComma = cleaned.lastIndexOf(',');
  const lastPeriod = cleaned.lastIndexOf('.');

  if (lastComma > lastPeriod) {
    // European format: 1.234,56 -> 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56 -> 1234.56
    cleaned = cleaned.replace(/,/g, '');
  }

  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    return null;
  }

  // Round to 2 decimal places
  return Math.round(amount * 100) / 100;
};

/**
 * Extract merchant name from receipt text
 *
 * Strategy:
 * 1. Process each line from top to bottom
 * 2. Skip lines that look like dates, times, or pure numbers
 * 3. Clean up store numbers and special characters
 * 4. Return the first valid line as the merchant name
 *
 * @param {string} text - OCR text from receipt
 * @returns {string} - Extracted merchant name or "Unknown Merchant"
 */
export const extractMerchant = (text) => {
  if (!text || typeof text !== 'string') {
    return 'Unknown Merchant';
  }

  const lines = text.split('\n');

  for (let line of lines) {
    line = line.trim();

    // Skip invalid lines
    if (shouldSkipLine(line)) {
      continue;
    }

    // Clean and validate the merchant name
    const merchant = cleanMerchantName(line);
    if (isValidMerchantName(merchant)) {
      return merchant;
    }
  }

  return 'Unknown Merchant';
};

// ============================================================================
// PRIVATE HELPER FUNCTIONS - MERCHANT EXTRACTION
// ============================================================================

/**
 * Check if a line should be skipped when looking for merchant name
 * @param {string} line - Line to check
 * @returns {boolean} - True if line should be skipped
 */
const shouldSkipLine = (line) => {
  // Skip empty lines
  if (!line) return true;

  // Skip lines that are only special characters
  if (/^[^a-zA-Z0-9]+$/.test(line)) return true;

  // Skip lines that look like dates
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(line)) return true;

  // Skip lines that look like times
  if (/^\d{1,2}:\d{2}/.test(line)) return true;

  // Skip lines that are mostly numbers (likely addresses or phone numbers)
  const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
  const digitCount = (line.match(/\d/g) || []).length;
  if (digitCount > alphaCount && alphaCount < 3) return true;

  return false;
};

/**
 * Clean up a merchant name by removing store numbers and special characters
 * @param {string} name - Raw merchant name
 * @returns {string} - Cleaned merchant name
 */
const cleanMerchantName = (name) => {
  let cleaned = name;

  // Remove store numbers like "#1234"
  cleaned = cleaned.replace(/\s*#\d+/g, '');

  // Remove trailing special characters
  cleaned = cleaned.replace(/[*=\-_]+$/g, '');

  // Trim whitespace
  cleaned = cleaned.trim();

  // Truncate to maximum length
  if (cleaned.length > MAX_MERCHANT_NAME_LENGTH) {
    cleaned = cleaned.substring(0, MAX_MERCHANT_NAME_LENGTH);
  }

  return cleaned;
};

/**
 * Check if a string is a valid merchant name
 * @param {string} name - Merchant name to validate
 * @returns {boolean} - True if valid
 */
const isValidMerchantName = (name) => {
  return name.length >= MIN_MERCHANT_NAME_LENGTH && /[a-zA-Z]/.test(name);
};

/**
 * Extract date from receipt text
 *
 * Strategy:
 * 1. Try to match various date formats (ISO, US, European, text)
 * 2. Validate the parsed date
 * 3. Return current date if no valid date found
 *
 * @param {string} text - OCR text from receipt
 * @returns {string} - Extracted date in YYYY-MM-DD format or current date
 */
export const extractDate = (text) => {
  if (!text || typeof text !== 'string') {
    return getCurrentDate();
  }

  const patterns = getDatePatterns();

  // Try each pattern
  for (const { regex, parser } of patterns) {
    const match = text.match(regex);
    if (match) {
      try {
        const dateStr = parser(match);
        // Validate the date
        if (isValidDate(dateStr)) {
          return dateStr;
        }
      } catch (e) {
        // Continue to next pattern
        continue;
      }
    }
  }

  // No valid date found, return current date
  return getCurrentDate();
};

// ============================================================================
// PRIVATE HELPER FUNCTIONS - DATE EXTRACTION
// ============================================================================

/**
 * Get all supported date pattern configurations
 * @returns {Array} - Array of pattern objects with regex and parser
 */
const getDatePatterns = () => [
  // ISO format: 2025-11-19 or 2025-11-19T14:30:00Z
  {
    regex: /(\d{4})-(\d{2})-(\d{2})/,
    parser: (match) => `${match[1]}-${match[2]}-${match[3]}`,
  },
  // Text format: Nov 19, 2025 or November 19, 2025
  {
    regex: /(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2}),?\s+(\d{4})/i,
    parser: (match) => {
      const month = MONTH_NAMES[match[1].toLowerCase()];
      const day = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    },
  },
  // Text format: 19 Nov 2025
  {
    regex: /(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{4})/i,
    parser: (match) => {
      const day = match[1].padStart(2, '0');
      const month = MONTH_NAMES[match[2].toLowerCase()];
      const year = match[3];
      return `${year}-${month}-${day}`;
    },
  },
  // MM/DD/YYYY or M/D/YYYY format
  {
    regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    parser: (match) => {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    },
  },
  // MM/DD/YY format
  {
    regex: /(\d{1,2})\/(\d{1,2})\/(\d{2})(?!\d)/,
    parser: (match) => {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      const year = '20' + match[3]; // Assume 2000s
      return `${year}-${month}-${day}`;
    },
  },
  // DD-MM-YYYY or DD.MM.YYYY format (European)
  {
    regex: /(\d{1,2})[\-\.](\d{1,2})[\-\.](\d{4})/,
    parser: (match) => {
      // Assume DD-MM-YYYY format for European receipts
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    },
  },
];

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} - Current date in ISO format
 */
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Validate if a date string is valid
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean} - True if the date is valid
 */
const isValidDate = (dateStr) => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
};
