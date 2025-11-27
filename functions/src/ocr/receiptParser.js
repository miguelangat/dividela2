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
 */
function extractAmount(ocrResultOrText) {
  let text = extractTextFromOCR(ocrResultOrText);
  if (!text) return null;

  // Truncate input to prevent ReDoS
  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`Text too long (${text.length}), truncating to ${MAX_TEXT_LENGTH}`);
    text = text.substring(0, MAX_TEXT_LENGTH);
  }

  // Look for common total patterns with BOUNDED quantifiers to prevent ReDoS
  // Use negative lookbehind (?<!-) to exclude negative amounts
  const patterns = [
    /total[:\s]{0,3}(?!-)\$?\s{0,3}(\d{1,8}\.?\d{0,2})/i,
    /amount[:\s]{0,3}(?!-)\$?\s{0,3}(\d{1,8}\.?\d{0,2})/i,
    /balance[:\s]{0,3}(?!-)\$?\s{0,3}(\d{1,8}\.?\d{0,2})/i,
    /grand\s{1,3}total[:\s]{0,3}(?!-)\$?\s{0,3}(\d{1,8}\.?\d{0,2})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[0] && match[1]) {
      // Check if there's a minus sign anywhere in the matched text
      if (match[0].includes('-')) {
        continue;
      }

      const amount = parseFloat(match[1]);

      // Validate amount is within reasonable range
      if (amount >= MIN_AMOUNT && amount <= MAX_AMOUNT) {
        return amount;
      }
    }
  }

  // Fallback: find the largest dollar amount (excluding negative amounts)
  // More thorough check for negative signs
  const amounts = text.match(/\$?\s{0,2}\d{1,8}\.\d{2}/g);
  if (amounts && amounts.length > 0) {
    const validAmounts = [];

    for (const amountStr of amounts) {
      // Find the position of this amount in the text
      const index = text.indexOf(amountStr);

      // Check if there's a minus sign within 3 characters before this amount
      const beforeText = text.substring(Math.max(0, index - 3), index);

      if (!beforeText.includes('-')) {
        const num = parseFloat(amountStr.replace(/[$\s]/g, ''));
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

  // Calculate confidence score based on what we extracted
  let confidence = 0;
  if (merchantName) confidence += 0.33;
  if (amount) confidence += 0.34;
  // Date always returns something, so we don't count it for confidence

  return {
    merchantName,
    merchant: merchantName, // Alias for compatibility
    amount,
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
  parseReceipt,
  suggestCategory
};
