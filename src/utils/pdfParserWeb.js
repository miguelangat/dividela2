import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker - required for PDF.js to work
// Use the CDN version for web compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Web-compatible PDF parser using PDF.js (Mozilla)
 * Works in browsers without Node.js dependencies
 */

/**
 * Common transaction patterns in bank statements
 * These regex patterns try to match typical transaction formats
 */
const TRANSACTION_PATTERNS = [
  // Pattern: DD/MM/YYYY Description 123.45
  /(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,

  // Pattern: YYYY-MM-DD Description 123.45
  /(\d{4}-\d{2}-\d{2})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,

  // Pattern: MM/DD/YYYY Description Amount Debit/Credit
  /(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})\s*(DR|CR)?/gi,

  // Pattern with tabs or multiple spaces as separators
  /(\d{2}\/\d{2}\/\d{4})\s{2,}([A-Za-z0-9\s\-\*]+?)\s{2,}([\d,]+\.\d{2})/gi,
];

/**
 * Date formats to try when parsing
 */
const DATE_PATTERNS = [
  { regex: /(\d{2})\/(\d{2})\/(\d{4})/, format: 'DD/MM/YYYY' },
  { regex: /(\d{4})-(\d{2})-(\d{2})/, format: 'YYYY-MM-DD' },
  { regex: /(\d{2})-(\d{2})-(\d{4})/, format: 'DD-MM-YYYY' },
];

/**
 * Parse date from string with multiple format support
 */
function parseDate(dateString) {
  if (!dateString) return null;

  const cleaned = dateString.trim();

  // Try each date pattern
  for (const { regex, format } of DATE_PATTERNS) {
    const match = cleaned.match(regex);
    if (match) {
      if (format === 'YYYY-MM-DD') {
        return new Date(`${match[1]}-${match[2]}-${match[3]}`);
      } else if (format === 'DD/MM/YYYY' || format === 'DD-MM-YYYY') {
        const [, day, month, year] = match;
        return new Date(`${year}-${month}-${day}`);
      }
    }
  }

  // Fallback to native Date parsing
  const fallback = new Date(cleaned);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Parse amount from string
 */
function parseAmount(amountString) {
  if (!amountString) return 0;

  const cleaned = String(amountString)
    .replace(/[$€£¥,\s]/g, '')
    .trim();

  // Handle parentheses as negative
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    const value = parseFloat(cleaned.slice(1, -1));
    return isNaN(value) ? 0 : -Math.abs(value);
  }

  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/**
 * Clean transaction description
 * Remove extra whitespace, special characters
 */
function cleanDescription(text) {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\*{2,}/g, '*') // Normalize asterisks
    .trim();
}

/**
 * Extract metadata from PDF text
 * Tries to find bank name, account number, statement period
 */
function extractMetadata(text) {
  const metadata = {};

  // Try to find bank name (usually at the top)
  const lines = text.split('\n');
  if (lines.length > 0) {
    // First few non-empty lines might contain bank name
    const firstLines = lines.slice(0, 5).filter(l => l.trim().length > 0);
    metadata.bankName = firstLines[0]?.trim();
  }

  // Try to find account number patterns
  const accountPatterns = [
    /Account\s*(?:Number|No\.?)[\s:]*(\d{4,})/i,
    /A\/C\s*(?:Number|No\.?)[\s:]*(\d{4,})/i,
    /Account[\s:]*(\*+\d{4})/i,
  ];

  for (const pattern of accountPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.accountNumber = match[1];
      break;
    }
  }

  // Try to find statement period
  const periodPatterns = [
    /Statement\s+Period[\s:]*(\d{2}\/\d{2}\/\d{4})\s*(?:to|-)\s*(\d{2}\/\d{2}\/\d{4})/i,
    /From[\s:]*(\d{2}\/\d{2}\/\d{4})\s*(?:to|To)\s*(\d{2}\/\d{2}\/\d{4})/i,
  ];

  for (const pattern of periodPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.periodStart = parseDate(match[1]);
      metadata.periodEnd = parseDate(match[2]);
      break;
    }
  }

  return metadata;
}

/**
 * Try to extract transactions using table detection
 * This is a heuristic approach for structured PDFs
 */
function extractTransactionsFromTable(text) {
  const transactions = [];
  const lines = text.split('\n');

  // Look for lines that might be table headers
  let inTransactionSection = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Detect start of transaction table
    if (lowerLine.includes('date') && (lowerLine.includes('description') || lowerLine.includes('details'))) {
      inTransactionSection = true;
      continue;
    }

    // Detect end of transaction table
    if (inTransactionSection && (
      lowerLine.includes('total') ||
      lowerLine.includes('balance summary') ||
      lowerLine.includes('end of statement')
    )) {
      inTransactionSection = false;
      continue;
    }

    if (!inTransactionSection) continue;

    // Try to parse transaction from line
    // Split by multiple spaces or tabs
    const parts = line.split(/\s{2,}|\t/).filter(p => p.trim());

    if (parts.length >= 2) {
      // First part might be date
      const possibleDate = parseDate(parts[0]);

      if (possibleDate && !isNaN(possibleDate.getTime())) {
        // Look for amount in the parts
        let amount = 0;
        let description = '';
        let type = 'debit';

        for (let i = 1; i < parts.length; i++) {
          const parsed = parseAmount(parts[i]);
          if (parsed !== 0) {
            amount = Math.abs(parsed);
            type = parsed < 0 ? 'credit' : 'debit';
            // Everything between date and amount is description
            description = parts.slice(1, i).join(' ');
            break;
          }
        }

        if (amount > 0 && description) {
          transactions.push({
            date: possibleDate,
            description: cleanDescription(description),
            amount,
            type,
            rawData: { originalLine: line },
          });
        }
      }
    }
  }

  return transactions;
}

/**
 * Extract transactions using regex patterns
 * Fallback method when table detection fails
 */
function extractTransactionsFromPatterns(text) {
  const transactions = [];
  const seenTransactions = new Set(); // Prevent duplicates

  for (const pattern of TRANSACTION_PATTERNS) {
    let match;
    pattern.lastIndex = 0; // Reset regex

    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, dateStr, description, amountStr, typeIndicator] = match;

      const date = parseDate(dateStr);
      if (!date || isNaN(date.getTime())) continue;

      let amount = parseAmount(amountStr);
      if (amount === 0) continue;

      // Determine transaction type
      let type = 'debit';
      if (typeIndicator) {
        type = typeIndicator.toUpperCase() === 'CR' ? 'credit' : 'debit';
      } else {
        type = amount < 0 ? 'credit' : 'debit';
      }

      amount = Math.abs(amount);

      // Create unique key to prevent duplicates
      const key = `${date.toISOString()}-${amount}-${description.slice(0, 20)}`;
      if (seenTransactions.has(key)) continue;
      seenTransactions.add(key);

      transactions.push({
        date,
        description: cleanDescription(description),
        amount,
        type,
        rawData: { originalText: fullMatch },
      });
    }
  }

  return transactions;
}

/**
 * Extract text from a PDF page
 */
async function extractTextFromPage(page) {
  const textContent = await page.getTextContent();
  const textItems = textContent.items.map(item => item.str);
  return textItems.join(' ');
}

/**
 * Parse PDF bank statement using PDF.js (web-compatible)
 *
 * @param {ArrayBuffer|Uint8Array} pdfData - PDF file data
 * @returns {Promise<Object>} Parsed transactions and metadata
 */
export async function parsePDFWeb(pdfData) {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    // Extract text from all pages
    let fullText = '';
    const pageTexts = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const pageText = await extractTextFromPage(page);
      pageTexts.push(pageText);
      fullText += pageText + '\n';
    }

    if (!fullText || fullText.trim().length === 0) {
      const error = new Error('PDF appears to be empty or contains no readable text');
      error.type = 'PDF_PARSING_ERROR';
      error.userMessage = 'Unable to read PDF content';
      error.suggestions = [
        'This PDF may be image-based (scanned) rather than text-based',
        'Try downloading your statement in CSV format instead',
        'If your bank only provides PDF, convert it to CSV using online tools',
        'Ensure the PDF is not password-protected',
      ];
      throw error;
    }

    // Extract metadata
    const metadata = extractMetadata(fullText);
    const pdfMetadata = await pdf.getMetadata();

    // Try table extraction first (more reliable for structured PDFs)
    let transactions = extractTransactionsFromTable(fullText);

    // If table extraction found few or no transactions, try pattern matching
    if (transactions.length < 5) {
      const patternTransactions = extractTransactionsFromPatterns(fullText);
      if (patternTransactions.length > transactions.length) {
        transactions = patternTransactions;
      }
    }

    if (transactions.length === 0) {
      const error = new Error(
        'Could not extract transactions from PDF. This might be a scanned document or an unsupported format.'
      );
      error.type = 'PDF_NO_TRANSACTIONS';
      error.userMessage = 'No transactions found in PDF';
      error.suggestions = [
        'This PDF format is not supported - try CSV format instead',
        'The PDF may be a scanned image rather than digital text',
        'Your bank\'s PDF format may not be compatible',
        'Download transactions as CSV from your bank\'s website',
      ];
      throw error;
    }

    // Sort by date (oldest first)
    transactions.sort((a, b) => a.date - b.date);

    // Remove potential duplicates
    const uniqueTransactions = [];
    const seen = new Set();

    for (const transaction of transactions) {
      const key = `${transaction.date.toISOString()}-${transaction.amount}-${transaction.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTransactions.push(transaction);
      }
    }

    return {
      transactions: uniqueTransactions,
      metadata: {
        ...metadata,
        totalPages: pdf.numPages,
        totalTransactions: uniqueTransactions.length,
        pdfInfo: pdfMetadata.info,
      },
    };
  } catch (error) {
    // Re-throw structured errors
    if (error.type === 'PDF_PARSING_ERROR' || error.type === 'PDF_NO_TRANSACTIONS') {
      throw error;
    }

    // Wrap other errors with helpful context
    const wrappedError = new Error(`PDF parsing failed: ${error.message}`);
    wrappedError.type = 'PDF_PARSING_ERROR';
    wrappedError.userMessage = 'Failed to parse PDF file';
    wrappedError.suggestions = [
      'Ensure the file is a valid PDF document',
      'Try downloading the statement in CSV format instead',
      'Check if the PDF is password-protected and remove protection',
      'Contact your bank if the issue persists',
    ];
    throw wrappedError;
  }
}

export default {
  parsePDFWeb,
  parseDate,
  parseAmount,
};
