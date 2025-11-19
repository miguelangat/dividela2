/**
 * Receipt Parser
 * Extracts structured data from OCR text
 *
 * This is a basic implementation to support the ML pipeline.
 * Full TDD implementation will be done separately.
 */

/**
 * Extract merchant name from receipt text
 */
function extractMerchantName(text) {
  if (!text) return null;

  // Usually the first non-empty line is the merchant name
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    return lines[0].trim();
  }

  return null;
}

/**
 * Extract amount/total from receipt text
 */
function extractAmount(text) {
  if (!text) return null;

  // Look for common total patterns
  const patterns = [
    /total[:\s]*\$?\s*(\d+\.?\d{0,2})/i,
    /amount[:\s]*\$?\s*(\d+\.?\d{0,2})/i,
    /balance[:\s]*\$?\s*(\d+\.?\d{0,2})/i,
    /grand\s+total[:\s]*\$?\s*(\d+\.?\d{0,2})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }

  // Fallback: find the largest dollar amount
  const amounts = text.match(/\$?\s*\d+\.\d{2}/g);
  if (amounts && amounts.length > 0) {
    const numbers = amounts.map(a => parseFloat(a.replace(/[$\s]/g, '')));
    return Math.max(...numbers);
  }

  return null;
}

/**
 * Extract date from receipt text
 */
function extractDate(text) {
  if (!text) return null;

  // Common date patterns
  const patterns = [
    /date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\w+\s+\d{1,2},?\s+\d{4})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Parse receipt text and extract structured data
 */
function parseReceipt(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') {
    return {
      merchantName: null,
      amount: null,
      date: null,
      rawText: ocrText || ''
    };
  }

  return {
    merchantName: extractMerchantName(ocrText),
    amount: extractAmount(ocrText),
    date: extractDate(ocrText),
    rawText: ocrText
  };
}

module.exports = {
  extractAmount,
  extractMerchantName,
  extractDate,
  parseReceipt
};
