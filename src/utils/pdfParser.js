import pdf from 'pdf-parse';

/**
 * Parses PDF bank statements
 * Extracts transaction data from unstructured PDF text
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
  let dateColumnIndex = -1;

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
 * Parse PDF bank statement
 *
 * @param {Buffer|Uint8Array} pdfBuffer - PDF file as buffer
 * @returns {Promise<Object>} Parsed transactions and metadata
 */
export async function parsePDF(pdfBuffer) {
  try {
    // Parse PDF to extract text
    const data = await pdf(pdfBuffer);

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no readable text');
    }

    // Extract metadata
    const metadata = extractMetadata(data.text);

    // Try table extraction first (more reliable for structured PDFs)
    let transactions = extractTransactionsFromTable(data.text);

    // If table extraction found few or no transactions, try pattern matching
    if (transactions.length < 5) {
      const patternTransactions = extractTransactionsFromPatterns(data.text);
      if (patternTransactions.length > transactions.length) {
        transactions = patternTransactions;
      }
    }

    if (transactions.length === 0) {
      throw new Error(
        'Could not extract transactions from PDF. This might be a scanned document or an unsupported format. Try converting to CSV instead.'
      );
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
        totalPages: data.numpages,
        totalTransactions: uniqueTransactions.length,
        pdfInfo: data.info,
      },
    };
  } catch (error) {
    if (error.message.includes('Could not extract transactions')) {
      throw error;
    }
    throw new Error(`PDF parsing failed: ${error.message}`);
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

export default {
  parsePDF,
  isPDF,
  parseDate,
  parseAmount,
};
