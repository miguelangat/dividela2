/**
 * Receipt Parser
 * Extracts structured data from OCR text
 *
 * This is a basic implementation to support the ML pipeline.
 * Full TDD implementation will be done separately.
 */

// Security: Maximum text length to prevent ReDoS attacks
const MAX_TEXT_LENGTH = 10000;
const MAX_MERCHANT_NAME_LENGTH = 200;
const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 999999.99;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

/**
 * Supported currencies with detection patterns
 * Priority order: unique symbols first, then ambiguous ones
 */
const CURRENCY_PATTERNS = [
  // Unique symbols - high confidence
  { code: 'EUR', patterns: [/€/, /\bEUR\b/i], confidence: 0.95 },
  { code: 'GBP', patterns: [/£/, /\bGBP\b/i], confidence: 0.95 },
  // Multi-char symbols - medium-high confidence
  { code: 'BRL', patterns: [/R\$/, /\bBRL\b/i], confidence: 0.90 },
  { code: 'PEN', patterns: [/S\//, /\bPEN\b/i, /\bSOL(?:ES)?\b/i], confidence: 0.90 },
  { code: 'CNY', patterns: [/¥/, /\bCNY\b/i, /\bRMB\b/i, /\bYUAN\b/i], confidence: 0.85 },
  { code: 'MXN', patterns: [/MX\$/, /\bMXN\b/i, /\bPESOS?\s+(?:MEXICANOS?)?\b/i], confidence: 0.85 },
  { code: 'COP', patterns: [/COL\$/, /\bCOP\b/i, /\bPESOS?\s+COLOMBIANOS?\b/i], confidence: 0.85 },
  // USD is last - $ alone is ambiguous (could be MXN, COP, USD)
  { code: 'USD', patterns: [/\$(?![\/R])/, /\bUSD\b/i], confidence: 0.70 },
];

/**
 * Extract text from OCR result object or return as-is if already a string
 */
function extractTextFromOCR(ocrResult) {
  if (typeof ocrResult === 'string') {
    return ocrResult;
  }

  if (ocrResult && ocrResult.textAnnotations && ocrResult.textAnnotations.length > 0) {
    return ocrResult.textAnnotations[0].description || '';
  }

  return '';
}

/**
 * Detect currency from receipt text
 * Checks for currency symbols and codes in order of uniqueness
 * @param {string} text - OCR text to analyze
 * @returns {{code: string|null, confidence: number, detected: boolean}}
 */
function detectCurrency(text) {
  if (!text || typeof text !== 'string') {
    return { code: null, confidence: 0, detected: false };
  }

  // Truncate for safety
  const processedText = text.length > MAX_TEXT_LENGTH
    ? text.substring(0, MAX_TEXT_LENGTH)
    : text;

  // Check each currency pattern in priority order
  for (const { code, patterns, confidence } of CURRENCY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(processedText)) {
        return { code, confidence, detected: true };
      }
    }
  }

  return { code: null, confidence: 0, detected: false };
}

/**
 * Extract merchant name from receipt text
 */
function extractMerchantName(ocrResultOrText) {
  const text = extractTextFromOCR(ocrResultOrText);
  if (!text) return null;

  // Truncate input to prevent ReDoS
  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`Text too long (${text.length}), truncating to ${MAX_TEXT_LENGTH}`);
    text = text.substring(0, MAX_TEXT_LENGTH);
  }

  // Usually the first non-empty line is the merchant name
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    let merchantName = lines[0].trim();

    // Remove emoji characters (full range) and extra whitespace
    merchantName = merchantName.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

    // Limit merchant name length for security
    if (merchantName.length > MAX_MERCHANT_NAME_LENGTH) {
      merchantName = merchantName.substring(0, MAX_MERCHANT_NAME_LENGTH);
    }

    return merchantName;
  }

  return null;
}

/**
 * Extract amount/total from receipt text
 * Supports multiple currency symbols: $, €, £, ¥, R$, S/, MX$, COL$
 */
function extractAmount(ocrResultOrText) {
  let text = extractTextFromOCR(ocrResultOrText);
  if (!text) return null;

  // Truncate input to prevent ReDoS
  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`Text too long (${text.length}), truncating to ${MAX_TEXT_LENGTH}`);
    text = text.substring(0, MAX_TEXT_LENGTH);
  }

  // Currency symbols pattern - covers all supported currencies
  // Order matters: check multi-char symbols first (R$, S/, MX$, COL$)
  const currencySymbol = '(?:R\\$|S\\/|MX\\$|COL\\$|[$€£¥])?';

  // Look for common total patterns with BOUNDED quantifiers to prevent ReDoS
  // Support both period (1,234.56) and comma (1.234,56) decimal formats
  const patterns = [
    new RegExp(`total[:\\s]{0,3}(?!-)${currencySymbol}\\s{0,3}(\\d{1,3}(?:[,.]\\d{3})*(?:[,.]\\d{1,2})?)`, 'i'),
    new RegExp(`amount[:\\s]{0,3}(?!-)${currencySymbol}\\s{0,3}(\\d{1,3}(?:[,.]\\d{3})*(?:[,.]\\d{1,2})?)`, 'i'),
    new RegExp(`balance[:\\s]{0,3}(?!-)${currencySymbol}\\s{0,3}(\\d{1,3}(?:[,.]\\d{3})*(?:[,.]\\d{1,2})?)`, 'i'),
    new RegExp(`grand\\s{1,3}total[:\\s]{0,3}(?!-)${currencySymbol}\\s{0,3}(\\d{1,3}(?:[,.]\\d{3})*(?:[,.]\\d{1,2})?)`, 'i'),
    new RegExp(`subtotal[:\\s]{0,3}(?!-)${currencySymbol}\\s{0,3}(\\d{1,3}(?:[,.]\\d{3})*(?:[,.]\\d{1,2})?)`, 'i'),
    new RegExp(`sum[:\\s]{0,3}(?!-)${currencySymbol}\\s{0,3}(\\d{1,3}(?:[,.]\\d{3})*(?:[,.]\\d{1,2})?)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[0] && match[1]) {
      // Check if there's a minus sign anywhere in the matched text
      if (match[0].includes('-')) {
        continue;
      }

      const amount = parseAmountString(match[1]);

      // Validate amount is within reasonable range
      if (amount >= MIN_AMOUNT && amount <= MAX_AMOUNT) {
        return amount;
      }
    }
  }

  // Fallback: find the largest amount (excluding negative amounts)
  // Pattern for amounts with various currency symbols
  const amountPattern = /(?:R\$|S\/|MX\$|COL\$|[$€£¥])?\s{0,2}(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{1,2})?)/g;
  const matches = [...text.matchAll(amountPattern)];

  if (matches.length > 0) {
    const validAmounts = [];

    for (const match of matches) {
      const fullMatch = match[0];
      const index = match.index;

      // Check if there's a minus sign within 3 characters before this amount
      const beforeText = text.substring(Math.max(0, index - 3), index);

      if (!beforeText.includes('-')) {
        const num = parseAmountString(match[1]);
        if (num >= MIN_AMOUNT && num <= MAX_AMOUNT) {
          validAmounts.push(num);
        }
      }
    }

    if (validAmounts.length > 0) {
      return Math.max(...validAmounts);
    }
  }

  return null;
}

/**
 * Parse amount string handling both decimal formats:
 * - US/UK format: 1,234.56 (comma as thousands, period as decimal)
 * - EU format: 1.234,56 (period as thousands, comma as decimal)
 * @param {string} amountStr - Amount string to parse
 * @returns {number} Parsed amount
 */
function parseAmountString(amountStr) {
  if (!amountStr) return 0;

  // Remove currency symbols and spaces
  let cleaned = amountStr.replace(/[R$S\/MX$COL$€£¥\s]/g, '');

  // Detect format by checking the last separator
  const lastComma = cleaned.lastIndexOf(',');
  const lastPeriod = cleaned.lastIndexOf('.');

  if (lastComma > lastPeriod) {
    // EU format: 1.234,56 - comma is decimal separator
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastPeriod > lastComma) {
    // US format: 1,234.56 - period is decimal separator
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma === -1 && lastPeriod === -1) {
    // No separators, return as-is
    return parseFloat(cleaned) || 0;
  } else if (lastComma !== -1 && lastPeriod === -1) {
    // Only comma - check if it's decimal or thousands
    const afterComma = cleaned.split(',')[1];
    if (afterComma && afterComma.length <= 2) {
      // Likely decimal: 123,45 -> 123.45
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands: 1,234 -> 1234
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastPeriod !== -1 && lastComma === -1) {
    // Only period - check if it's decimal or thousands
    const afterPeriod = cleaned.split('.')[1];
    if (afterPeriod && afterPeriod.length <= 2) {
      // Already decimal format: 123.45
    } else {
      // Likely thousands: 1.234 -> 1234
      cleaned = cleaned.replace(/\./g, '');
    }
  }

  return parseFloat(cleaned) || 0;
}

/**
 * Extract date from receipt text
 */
function extractDate(ocrResultOrText) {
  let text = extractTextFromOCR(ocrResultOrText);
  if (!text) return null;

  // Truncate input to prevent ReDoS
  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`Text too long (${text.length}), truncating to ${MAX_TEXT_LENGTH}`);
    text = text.substring(0, MAX_TEXT_LENGTH);
  }

  // Common date patterns with BOUNDED quantifiers to prevent ReDoS
  const patterns = [
    /date[:\s]{0,3}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\w{3,12}\s{1,3}\d{1,2},?\s{0,3}\d{4})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const dateString = match[1].trim();
      let parsedDate;

      // Try parsing as MM/DD/YYYY first
      parsedDate = new Date(dateString);

      // If invalid or looks like DD/MM/YYYY (day > 12), try swapping
      if (isNaN(parsedDate.getTime()) || dateString.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/)) {
        const dmyMatch = dateString.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (dmyMatch) {
          const day = parseInt(dmyMatch[1]);
          const month = parseInt(dmyMatch[2]);
          const year = parseInt(dmyMatch[3]);

          // If day > 12, it's definitely DD/MM/YYYY
          if (day > 12) {
            parsedDate = new Date(year, month - 1, day);
          }
        }
      }

      // Validate date is within reasonable range
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        if (year >= MIN_YEAR && year <= MAX_YEAR) {
          return parsedDate;
        }
      }
    }
  }

  // Return current date as fallback
  return new Date();
}

/**
 * Parse receipt text and extract structured data
 */
function parseReceipt(ocrResult) {
  // Extract text from OCR result
  const text = extractTextFromOCR(ocrResult);

  // Handle empty input
  if (!text) {
    return {
      error: 'No text extracted from receipt',
      merchantName: null,
      merchant: null,
      amount: null,
      currency: null,
      currencyConfidence: 0,
      date: new Date(),
      rawText: text,
      confidence: 0
    };
  }

  // Truncate input to prevent ReDoS
  let processedText = text;
  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`Text too long (${text.length}), truncating to ${MAX_TEXT_LENGTH}`);
    processedText = text.substring(0, MAX_TEXT_LENGTH);
  }

  const merchantName = extractMerchantName(processedText);
  const amount = extractAmount(processedText);
  const date = extractDate(processedText);
  const currencyInfo = detectCurrency(processedText);

  // Calculate confidence score based on what we extracted
  let confidence = 0;
  if (merchantName) confidence += 0.33;
  if (amount) confidence += 0.34;
  // Date always returns something, so we don't count it for confidence

  return {
    merchantName,
    merchant: merchantName, // Alias for compatibility
    amount,
    currency: currencyInfo.code,
    currencyConfidence: currencyInfo.confidence,
    currencyDetected: currencyInfo.detected,
    date,
    rawText: processedText,
    confidence
  };
}

/**
 * Suggest category based on merchant name
 */
function suggestCategory(merchantName) {
  if (!merchantName) return 'other';

  const merchant = merchantName.toLowerCase();

  // Grocery stores
  if (merchant.includes('whole foods') ||
      merchant.includes('trader joe') ||
      merchant.includes('safeway') ||
      merchant.includes('kroger') ||
      merchant.includes('walmart') ||
      merchant.includes('target') ||
      merchant.includes('costco')) {
    return 'groceries';
  }

  // Restaurants and dining
  if (merchant.includes('bistro') ||
      merchant.includes('restaurant') ||
      merchant.includes('cafe') ||
      merchant.includes('coffee') ||
      merchant.includes('pizza') ||
      merchant.includes('burger') ||
      merchant.includes('starbucks')) {
    return 'dining';
  }

  // Gas stations / Transportation
  if (merchant.includes('shell') ||
      merchant.includes('chevron') ||
      merchant.includes('exxon') ||
      merchant.includes('mobil') ||
      merchant.includes('bp') ||
      merchant.includes('gas')) {
    return 'transportation';
  }

  // Pharmacies / Healthcare
  if (merchant.includes('cvs') ||
      merchant.includes('walgreens') ||
      merchant.includes('pharmacy') ||
      merchant.includes('rite aid') ||
      merchant.includes('medical')) {
    return 'healthcare';
  }

  return 'other';
}

module.exports = {
  extractAmount,
  extractMerchantName,
  extractDate,
  detectCurrency,
  parseAmountString,
  parseReceipt,
  suggestCategory
};
