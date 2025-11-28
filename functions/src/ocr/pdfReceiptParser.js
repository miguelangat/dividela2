/**
 * PDF Receipt Parser for Cloud Functions
 * Server-side version using pdf-parse
 */

const pdf = require('pdf-parse');

/**
 * Receipt-specific extraction patterns
 */
const RECEIPT_PATTERNS = {
  total: [
    /total[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /amount\s+due[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /grand\s+total[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /balance[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /total\s+amount[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /order\s+total[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /you\s+paid[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
    /amount\s+paid[\s:$]*\$?\s*([\d,]+\.\d{2})/gi,
  ],

  merchant: [
    /^([A-Z][A-Za-z\s&',.\-]+?)(?:\n|$)/m,
    /^(.+?)(?=\n.*(address|phone|tax|receipt|invoice))/is,
    /invoice\s+from[\s:]*(.+?)(?=\n|$)/i,
  ],

  date: [
    /date[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*\d{1,2}:\d{2}/i,
    /transaction\s+date[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ],

  tax: [
    /tax[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /sales\s+tax[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /vat[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
  ],

  subtotal: [
    /subtotal[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
    /sub\s+total[\s:$]*\$?\s*([\d,]+\.\d{2})/i,
  ],
};

/**
 * Vendor type indicators
 */
const VENDOR_INDICATORS = {
  restaurant: ['server', 'table', 'guests', 'gratuity', 'tip'],
  retail: ['item', 'qty', 'sku', 'barcode'],
  ecommerce: ['order number', 'order #', 'shipped to', 'tracking'],
  saas: ['subscription', 'billing period', 'next invoice', 'plan'],
};

function parseAmount(amountString) {
  if (!amountString) return null;
  const cleaned = String(amountString).replace(/[$€£¥,\s]/g, '').trim();
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

function parseDate(dateString) {
  if (!dateString) return null;
  const cleaned = dateString.trim();

  const formats = [
    {
      regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      parse: (m) => new Date(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`),
    },
    {
      regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
      parse: (m) => {
        const year = parseInt(m[3]) + 2000;
        return new Date(`${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`);
      },
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

  return null;
}

function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').replace(/[\r\n]+/g, ' ').trim();
}

function extractMerchant(text) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  for (const pattern of RECEIPT_PATTERNS.merchant) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const merchant = cleanText(match[1]);
      if (merchant.length >= 3 && merchant.length <= 50 && !/^\d+$/.test(merchant)) {
        return merchant;
      }
    }
  }

  const firstLine = lines[0];
  if (firstLine && firstLine.length >= 3 && firstLine.length <= 50) {
    return cleanText(firstLine);
  }

  return null;
}

function extractTotal(text) {
  let bestMatch = null;
  let bestScore = 0;

  for (const pattern of RECEIPT_PATTERNS.total) {
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const amount = parseAmount(match[1]);
      if (amount && amount > 0) {
        const matchText = match[0].toLowerCase();
        let score = 1;

        if (matchText.includes('total')) score += 2;
        if (matchText.includes('grand total')) score += 1;
        if (amount > 10) score += 0.5;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = amount;
        }
      }
    }
  }

  return bestMatch;
}

function extractDate(text) {
  for (const pattern of RECEIPT_PATTERNS.date) {
    pattern.lastIndex = 0;
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

function extractTax(text) {
  for (const pattern of RECEIPT_PATTERNS.tax) {
    pattern.lastIndex = 0;
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

function extractSubtotal(text) {
  for (const pattern of RECEIPT_PATTERNS.subtotal) {
    pattern.lastIndex = 0;
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

function detectVendorType(text) {
  const lowerText = text.toLowerCase();
  let bestType = null;
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(VENDOR_INDICATORS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestType || 'general';
}

function calculateConfidence(receipt) {
  let score = 0;
  let maxScore = 100;

  if (receipt.merchant) {
    score += 30;
    if (receipt.merchant.length >= 5) score += 5;
  }

  if (receipt.amount && receipt.amount > 0) {
    score += 40;
    if (receipt.amount >= 1) score += 5;
  }

  if (receipt.date) {
    score += 20;
  }

  if (receipt.tax !== null) score += 2.5;
  if (receipt.subtotal !== null) score += 2.5;

  if (receipt.subtotal && receipt.tax && receipt.amount) {
    const calculated = receipt.subtotal + receipt.tax;
    const diff = Math.abs(calculated - receipt.amount);
    if (diff < 0.02) {
      score += 10;
    } else if (diff < 1) {
      score += 5;
    }
  }

  return Math.min(score / maxScore, 1.0);
}

function detectPDFType(pdfData) {
  const textLength = pdfData.text ? pdfData.text.length : 0;

  if (textLength > 100) {
    return 'text-based';
  } else {
    return 'image-based';
  }
}

/**
 * Parse receipt from PDF buffer
 */
async function parseReceiptPDF(pdfBuffer) {
  try {
    const pdfData = await pdf(pdfBuffer);
    const pdfType = detectPDFType(pdfData);

    if (pdfType === 'image-based') {
      return {
        requiresOCR: true,
        pages: pdfData.numpages,
        reason: 'PDF appears to be scanned or image-based',
      };
    }

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

    const confidence = calculateConfidence(receipt);

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
    if (error.message && error.message.includes('PDF')) {
      throw error;
    }

    return {
      requiresOCR: true,
      pages: 1,
      reason: `Text extraction failed: ${error.message}`,
    };
  }
}

module.exports = {
  parseReceiptPDF,
  parseAmount,
  parseDate,
  detectVendorType,
};
