/**
 * Receipt PDF Parser
 *
 * Extracts receipt data from text-based PDF documents
 * Handles digital receipts (e.g., e-commerce, SaaS, restaurant POS)
 * Different from bank statement parsing - focuses on single-purchase receipts
 */

import pdf from 'pdf-parse';

/**
 * Receipt-specific extraction patterns
 * Different from bank statements which have transaction tables
 */
const RECEIPT_PATTERNS = {
  // Total patterns - most important field
  total: [
    /total[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /amount\s+due[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /grand\s+total[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /balance[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /total\s+amount[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /order\s+total[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /you\s+paid[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /amount\s+paid[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /payment\s+total[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
  ],

  // Merchant patterns (usually at top of receipt)
  merchant: [
    /^([A-Z][A-Za-z\s&',.\-]+?)(?:\n|$)/m, // Capitalized name at start
    /^(.+?)(?=\n.*(address|phone|tax|receipt|invoice))/is, // Before address/phone
    /invoice\s+from[\s:]*(.+?)(?=\n|$)/i,
    /seller[\s:]*(.+?)(?=\n|$)/i,
    /merchant[\s:]*(.+?)(?=\n|$)/i,
  ],

  // Date patterns
  date: [
    /date[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*\d{1,2}:\d{2}/i, // With time
    /transaction\s+date[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /purchase\s+date[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /order\s+date[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /invoice\s+date[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ],

  // Tax patterns (helpful for validation)
  tax: [
    /tax[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /sales\s+tax[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /vat[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /gst[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
  ],

  // Subtotal (to cross-reference with total)
  subtotal: [
    /subtotal[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /sub\s+total[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /sub-total[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /amount\s+before\s+tax[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
  ],
};

/**
 * Vendor type indicators for specialized parsing
 */
const VENDOR_INDICATORS = {
  restaurant: {
    keywords: ['server', 'table', 'guests', 'gratuity', 'tip', 'food', 'beverage', 'bar'],
    weight: 1.5,
  },
  retail: {
    keywords: ['item', 'qty', 'sku', 'barcode', 'product', 'price each'],
    weight: 1.2,
  },
  ecommerce: {
    keywords: ['order number', 'order #', 'shipped to', 'tracking', 'delivery', 'shipping address'],
    weight: 1.3,
  },
  saas: {
    keywords: ['subscription', 'billing period', 'next invoice', 'plan', 'monthly', 'annual'],
    weight: 1.4,
  },
  utilities: {
    keywords: ['account number', 'billing period', 'meter reading', 'usage', 'kilowatt'],
    weight: 1.1,
  },
};

/**
 * Parse amount from string, removing currency symbols and commas
 */
function parseAmount(amountString) {
  if (!amountString) return null;

  const cleaned = String(amountString)
    .replace(/[$€£¥₹,\s]/g, '')
    .trim();

  // Handle parentheses as negative (accounting format)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    const value = parseFloat(cleaned.slice(1, -1));
    return isNaN(value) ? null : -Math.abs(value);
  }

  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

/**
 * Parse date from string with multiple format support
 */
function parseDate(dateString) {
  if (!dateString) return null;

  const cleaned = dateString.trim();

  // Try common date formats
  const formats = [
    // MM/DD/YYYY or MM-DD-YYYY
    {
      regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      parse: (m) => new Date(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`),
    },
    // MM/DD/YY or MM-DD-YY
    {
      regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
      parse: (m) => {
        const year = parseInt(m[3]) + 2000;
        return new Date(`${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`);
      },
    },
    // YYYY-MM-DD (ISO format)
    {
      regex: /(\d{4})-(\d{2})-(\d{2})/,
      parse: (m) => new Date(`${m[1]}-${m[2]}-${m[3]}`),
    },
  ];

  for (const format of formats) {
    const match = cleaned.match(format.regex);
    if (match) {
      const date = format.parse(match);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // Fallback to native Date parsing
  const fallback = new Date(cleaned);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Clean and normalize text
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\r\n]+/g, ' ') // Remove line breaks
    .trim();
}

/**
 * Extract merchant name from PDF text
 */
function extractMerchant(text) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  // Try each pattern
  for (const pattern of RECEIPT_PATTERNS.merchant) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const merchant = cleanText(match[1]);
      // Validate: should be reasonable length and not just numbers
      if (merchant.length >= 3 && merchant.length <= 50 && !/^\d+$/.test(merchant)) {
        return merchant;
      }
    }
  }

  // Fallback: use first non-empty line if it looks like a business name
  const firstLine = lines[0];
  if (firstLine && firstLine.length >= 3 && firstLine.length <= 50) {
    return cleanText(firstLine);
  }

  return null;
}

/**
 * Extract total amount from PDF text
 */
function extractTotal(text) {
  const lowerText = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const pattern of RECEIPT_PATTERNS.total) {
    pattern.lastIndex = 0; // Reset regex
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const amount = parseAmount(match[1]);
      if (amount && amount > 0) {
        // Calculate confidence score based on keyword proximity to amount
        const matchText = match[0].toLowerCase();
        let score = 1;

        // Higher score for exact "total" keyword
        if (matchText.includes('total')) score += 2;
        if (matchText.includes('grand total')) score += 1;
        if (matchText.includes('order total')) score += 1;
        if (matchText.includes('amount due')) score += 1;

        // Prefer larger amounts (usually the total, not subtotal)
        if (amount > 10) score += 0.5;
        if (amount > 50) score += 0.5;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = amount;
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Extract date from PDF text
 */
function extractDate(text) {
  for (const pattern of RECEIPT_PATTERNS.date) {
    pattern.lastIndex = 0; // Reset regex
    const match = pattern.exec(text);
    if (match && match[1]) {
      const date = parseDate(match[1]);
      if (date) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Extract tax amount from PDF text
 */
function extractTax(text) {
  for (const pattern of RECEIPT_PATTERNS.tax) {
    pattern.lastIndex = 0; // Reset regex
    const match = pattern.exec(text);
    if (match && match[1]) {
      const tax = parseAmount(match[1]);
      if (tax && tax >= 0) {
        return tax;
      }
    }
  }

  return null;
}

/**
 * Extract subtotal from PDF text
 */
function extractSubtotal(text) {
  for (const pattern of RECEIPT_PATTERNS.subtotal) {
    pattern.lastIndex = 0; // Reset regex
    const match = pattern.exec(text);
    if (match && match[1]) {
      const subtotal = parseAmount(match[1]);
      if (subtotal && subtotal > 0) {
        return subtotal;
      }
    }
  }

  return null;
}

/**
 * Detect vendor type based on content
 */
function detectVendorType(text) {
  const lowerText = text.toLowerCase();
  let bestType = null;
  let bestScore = 0;

  for (const [type, config] of Object.entries(VENDOR_INDICATORS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword)) {
        score += config.weight;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestType || 'general';
}

/**
 * Calculate confidence score for extracted data
 */
function calculateConfidence(receipt) {
  let score = 0;
  let maxScore = 0;

  // Merchant (30 points)
  maxScore += 30;
  if (receipt.merchant) {
    score += 30;
    if (receipt.merchant.length >= 5) score += 5; // Bonus for reasonable length
  }

  // Amount (40 points - most important)
  maxScore += 40;
  if (receipt.amount && receipt.amount > 0) {
    score += 40;
    if (receipt.amount >= 1) score += 5; // Bonus for reasonable amount
  }

  // Date (20 points)
  maxScore += 20;
  if (receipt.date) {
    score += 20;
    // Check if date is reasonable (within 10 years)
    const now = new Date();
    const tenYearsAgo = new Date(now.getFullYear() - 10, 0, 1);
    const oneYearFuture = new Date(now.getFullYear() + 1, 0, 1);
    if (receipt.date >= tenYearsAgo && receipt.date <= oneYearFuture) {
      score += 5; // Bonus for reasonable date
    }
  }

  // Tax/Subtotal (10 points)
  maxScore += 10;
  if (receipt.tax !== null) score += 5;
  if (receipt.subtotal !== null) score += 5;

  // Validation: if subtotal + tax ≈ total, boost confidence
  if (receipt.subtotal && receipt.tax && receipt.amount) {
    const calculated = receipt.subtotal + receipt.tax;
    const diff = Math.abs(calculated - receipt.amount);
    if (diff < 0.02) {
      score += 10; // Perfect match
    } else if (diff < 1) {
      score += 5; // Close enough
    }
  }

  maxScore += 10; // For validation bonus

  return Math.min(score / maxScore, 1.0);
}

/**
 * Detect if PDF is text-based or image-based (scanned)
 */
function detectPDFType(pdfData) {
  const textLength = pdfData.text ? pdfData.text.length : 0;

  // Heuristic: text-based PDFs have substantial readable text
  // Scanned PDFs have minimal or no text
  if (textLength > 100) {
    // Likely text-based - has extractable text
    return 'text-based';
  } else if (textLength > 0 && textLength <= 100) {
    // Some text but very little - possibly scanned with minimal OCR
    return 'image-based';
  } else {
    // No text at all - definitely scanned/image-based
    return 'image-based';
  }
}

/**
 * Parse receipt from PDF buffer
 *
 * @param {Buffer|Uint8Array} pdfBuffer - PDF file as buffer
 * @returns {Promise<Object>} Parsed receipt data or indication that OCR is required
 */
export async function parseReceiptPDF(pdfBuffer) {
  try {
    // Extract text from PDF
    const pdfData = await pdf(pdfBuffer);

    // Determine if text-based or image-based
    const pdfType = detectPDFType(pdfData);

    if (pdfType === 'image-based') {
      // Return indication that OCR is required
      return {
        requiresOCR: true,
        pages: pdfData.numpages,
        reason: 'PDF appears to be scanned or image-based',
      };
    }

    // Parse as text-based receipt
    const text = pdfData.text;
    const vendorType = detectVendorType(text);

    const receipt = {
      merchant: extractMerchant(text),
      amount: extractTotal(text),
      date: extractDate(text),
      tax: extractTax(text),
      subtotal: extractSubtotal(text),
      vendorType,
      rawText: text,
    };

    // Calculate confidence
    const confidence = calculateConfidence(receipt);

    // If confidence is too low, suggest OCR instead
    if (confidence < 0.4) {
      return {
        requiresOCR: true,
        pages: pdfData.numpages,
        reason: 'Low confidence in text extraction',
        partialData: receipt,
        confidence,
      };
    }

    return {
      requiresOCR: false,
      receipt: {
        ...receipt,
        confidence,
      },
      pages: pdfData.numpages,
    };
  } catch (error) {
    // If PDF parsing fails, treat as requiring OCR
    if (error.message && error.message.includes('PDF')) {
      throw error; // Re-throw PDF-specific errors
    }

    // For other errors, suggest OCR fallback
    return {
      requiresOCR: true,
      pages: 1,
      reason: `Text extraction failed: ${error.message}`,
    };
  }
}

/**
 * Validate if buffer is a valid PDF
 */
export function isPDF(buffer) {
  if (!buffer || buffer.length < 4) return false;

  // Check PDF magic number (%PDF)
  const header = buffer.slice(0, 4).toString('utf-8');
  return header === '%PDF';
}

/**
 * Parse multi-page receipt (combine text from all pages)
 */
export async function parseMultiPageReceipt(pdfBuffer) {
  try {
    const pdfData = await pdf(pdfBuffer);

    if (pdfData.numpages === 1) {
      // Single page - use standard parsing
      return parseReceiptPDF(pdfBuffer);
    }

    // Multi-page: text is already combined by pdf-parse
    // But we can extract page-specific data if needed
    const text = pdfData.text;
    const lines = text.split('\n').filter(l => l.trim());

    // Merchant usually on first 20% of text
    const topSection = lines.slice(0, Math.ceil(lines.length * 0.2)).join('\n');
    const merchant = extractMerchant(topSection);

    // Total usually in last 20% of text
    const bottomSection = lines.slice(Math.floor(lines.length * 0.8)).join('\n');
    const total = extractTotal(bottomSection) || extractTotal(text);

    // Date can be anywhere
    const date = extractDate(text);

    const receipt = {
      merchant,
      amount: total,
      date,
      tax: extractTax(text),
      subtotal: extractSubtotal(text),
      vendorType: detectVendorType(text),
      rawText: text,
      multiPage: true,
      pageCount: pdfData.numpages,
    };

    const confidence = calculateConfidence(receipt);

    if (confidence < 0.4) {
      return {
        requiresOCR: true,
        pages: pdfData.numpages,
        reason: 'Low confidence in multi-page text extraction',
        partialData: receipt,
        confidence,
      };
    }

    return {
      requiresOCR: false,
      receipt: {
        ...receipt,
        confidence,
      },
      pages: pdfData.numpages,
    };
  } catch (error) {
    throw new Error(`Multi-page PDF parsing failed: ${error.message}`);
  }
}

export default {
  parseReceiptPDF,
  parseMultiPageReceipt,
  isPDF,
  parseAmount,
  parseDate,
  detectVendorType,
};
