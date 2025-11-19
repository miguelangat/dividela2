import Papa from 'papaparse';

/**
 * Parses CSV bank statements with auto-detection of format
 * Supports various date formats, amount columns, and delimiters
 */

/**
 * Common date formats used by banks
 */
const DATE_FORMATS = [
  /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
  /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
  /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY or MM-DD-YYYY
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // M/D/YY or M/D/YYYY
];

/**
 * Common column names for transaction data
 */
const COLUMN_MAPPINGS = {
  date: ['date', 'transaction date', 'posting date', 'trans date', 'value date'],
  description: ['description', 'details', 'memo', 'transaction details', 'narration', 'particulars'],
  amount: ['amount', 'transaction amount'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'debit amount'],
  credit: ['credit', 'deposit', 'deposits', 'credit amount'],
  balance: ['balance', 'running balance', 'account balance'],
};

/**
 * Detect if a string matches a date format
 */
function isDateFormat(value) {
  if (!value || typeof value !== 'string') return false;
  return DATE_FORMATS.some(regex => regex.test(value.trim()));
}

/**
 * Parse date string to Date object with multiple format support
 */
function parseDate(dateString) {
  if (!dateString) return null;

  const cleaned = dateString.trim();

  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned);
  }

  // Try MM/DD/YYYY or DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [first, second, year] = cleaned.split('/');
    // Try MM/DD/YYYY first (US format)
    const dateUS = new Date(year, parseInt(first) - 1, parseInt(second));
    if (dateUS.getMonth() === parseInt(first) - 1) {
      return dateUS;
    }
    // Try DD/MM/YYYY (International format)
    const dateIntl = new Date(year, parseInt(second) - 1, parseInt(first));
    return dateIntl;
  }

  // Try DD-MM-YYYY or MM-DD-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
    const [first, second, year] = cleaned.split('-');
    // Try MM-DD-YYYY first
    const dateUS = new Date(year, parseInt(first) - 1, parseInt(second));
    if (dateUS.getMonth() === parseInt(first) - 1) {
      return dateUS;
    }
    // Try DD-MM-YYYY
    const dateIntl = new Date(year, parseInt(second) - 1, parseInt(first));
    return dateIntl;
  }

  // Fallback to native Date parsing
  const fallback = new Date(cleaned);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Parse amount string to number
 * Handles: commas, parentheses for negatives, currency symbols
 */
function parseAmount(amountString) {
  if (!amountString) return 0;

  const cleaned = String(amountString)
    .replace(/[$€£¥,\s]/g, '') // Remove currency symbols, commas, spaces
    .trim();

  // Handle parentheses as negative (e.g., "(100.00)" = -100)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    const value = parseFloat(cleaned.slice(1, -1));
    return isNaN(value) ? 0 : -Math.abs(value);
  }

  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/**
 * Find column index by matching common names
 */
function findColumnIndex(headers, columnType) {
  const possibleNames = COLUMN_MAPPINGS[columnType] || [];
  const normalizedHeaders = headers.map(h => (h || '').toLowerCase().trim());

  for (const name of possibleNames) {
    const index = normalizedHeaders.findIndex(h => h === name || h.includes(name));
    if (index !== -1) return index;
  }

  return -1;
}

/**
 * Detect header row in CSV data
 * Returns the index of the header row
 */
function detectHeaderRow(rows) {
  // Look for a row that contains typical column names
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const normalizedRow = row.map(cell => (cell || '').toLowerCase().trim());

    // Check if this row contains date-related headers
    const hasDateColumn = normalizedRow.some(cell =>
      COLUMN_MAPPINGS.date.some(name => cell === name || cell.includes(name))
    );

    // Check if this row contains amount-related headers
    const hasAmountColumn = normalizedRow.some(cell =>
      [...COLUMN_MAPPINGS.amount, ...COLUMN_MAPPINGS.debit, ...COLUMN_MAPPINGS.credit].some(name =>
        cell === name || cell.includes(name)
      )
    );

    if (hasDateColumn && hasAmountColumn) {
      return i;
    }
  }

  // If no header found, assume first row is header
  return 0;
}

/**
 * Detect and remove footer rows (summaries, disclaimers)
 */
function removeFooterRows(rows, headerIndex) {
  const dataRows = rows.slice(headerIndex + 1);

  // Remove rows from the end that don't have date values
  let lastValidIndex = dataRows.length - 1;

  for (let i = dataRows.length - 1; i >= 0; i--) {
    const row = dataRows[i];
    if (!Array.isArray(row) || row.every(cell => !cell || cell.trim() === '')) {
      lastValidIndex = i - 1;
      continue;
    }

    // Check if any cell looks like a date
    const hasDate = row.some(cell => isDateFormat(cell));
    if (hasDate) {
      lastValidIndex = i;
      break;
    }
  }

  return dataRows.slice(0, lastValidIndex + 1);
}

/**
 * Parse CSV file content
 *
 * @param {string} fileContent - CSV file content as string
 * @returns {Promise<Object>} Parsed transactions and metadata
 */
export async function parseCSV(fileContent) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      complete: (results) => {
        try {
          const { data, errors } = results;

          if (errors.length > 0 && errors[0].type === 'Delimiter') {
            // Auto-detect delimiter failed, try common ones
            const delimiters = [',', ';', '\t', '|'];
            for (const delimiter of delimiters) {
              try {
                const retryResult = Papa.parse(fileContent, { delimiter });
                if (retryResult.data.length > 0) {
                  return resolve(processCSVData(retryResult.data));
                }
              } catch (e) {
                continue;
              }
            }
          }

          if (data.length === 0) {
            return reject(new Error('CSV file is empty'));
          }

          resolve(processCSVData(data));
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
      skipEmptyLines: true,
      transformHeader: header => header.trim(),
    });
  });
}

/**
 * Process parsed CSV data into standardized transaction format
 */
function processCSVData(rows) {
  if (!rows || rows.length === 0) {
    throw new Error('No data found in CSV file');
  }

  // Detect header row
  const headerIndex = detectHeaderRow(rows);
  const headers = rows[headerIndex];

  // Get data rows (excluding header and footers)
  const dataRows = removeFooterRows(rows, headerIndex);

  if (dataRows.length === 0) {
    throw new Error('No transaction data found in CSV file');
  }

  // Find column indices
  const dateIndex = findColumnIndex(headers, 'date');
  const descriptionIndex = findColumnIndex(headers, 'description');
  const amountIndex = findColumnIndex(headers, 'amount');
  const debitIndex = findColumnIndex(headers, 'debit');
  const creditIndex = findColumnIndex(headers, 'credit');
  const balanceIndex = findColumnIndex(headers, 'balance');

  if (dateIndex === -1) {
    throw new Error('Could not find date column in CSV file. Please ensure your CSV has a "Date" column.');
  }

  if (amountIndex === -1 && debitIndex === -1 && creditIndex === -1) {
    throw new Error('Could not find amount column in CSV file. Please ensure your CSV has an "Amount", "Debit", or "Credit" column.');
  }

  // Parse transactions
  const transactions = [];
  const errors = [];

  dataRows.forEach((row, index) => {
    try {
      if (!row || row.length === 0) return;

      // Parse date
      const dateValue = row[dateIndex];
      const date = parseDate(dateValue);

      if (!date || isNaN(date.getTime())) {
        errors.push({ row: index + headerIndex + 2, error: 'Invalid date format', value: dateValue });
        return;
      }

      // Parse amount
      let amount = 0;
      let type = 'debit';

      if (amountIndex !== -1) {
        // Single amount column
        amount = parseAmount(row[amountIndex]);
        type = amount < 0 ? 'credit' : 'debit';
        amount = Math.abs(amount);
      } else {
        // Separate debit/credit columns
        const debitValue = debitIndex !== -1 ? parseAmount(row[debitIndex]) : 0;
        const creditValue = creditIndex !== -1 ? parseAmount(row[creditIndex]) : 0;

        if (debitValue > 0) {
          amount = debitValue;
          type = 'debit';
        } else if (creditValue > 0) {
          amount = creditValue;
          type = 'credit';
        }
      }

      // Skip if amount is 0
      if (amount === 0) return;

      // Parse description
      const description = descriptionIndex !== -1
        ? String(row[descriptionIndex] || '').trim()
        : '';

      if (!description) {
        errors.push({ row: index + headerIndex + 2, error: 'Missing description', value: row });
        return;
      }

      // Parse balance (optional)
      const balance = balanceIndex !== -1 ? parseAmount(row[balanceIndex]) : null;

      transactions.push({
        date,
        description,
        amount,
        type,
        balance,
        rawData: {
          rowIndex: index + headerIndex + 2,
          originalRow: row,
        },
      });
    } catch (error) {
      errors.push({
        row: index + headerIndex + 2,
        error: error.message,
        value: row
      });
    }
  });

  // Sort by date (oldest first)
  transactions.sort((a, b) => a.date - b.date);

  return {
    transactions,
    metadata: {
      totalRows: dataRows.length,
      successfulRows: transactions.length,
      errorRows: errors.length,
      errors,
      headers,
      detectedColumns: {
        date: headers[dateIndex],
        description: descriptionIndex !== -1 ? headers[descriptionIndex] : null,
        amount: amountIndex !== -1 ? headers[amountIndex] : null,
        debit: debitIndex !== -1 ? headers[debitIndex] : null,
        credit: creditIndex !== -1 ? headers[creditIndex] : null,
        balance: balanceIndex !== -1 ? headers[balanceIndex] : null,
      },
    },
  };
}

export default {
  parseCSV,
  parseDate,
  parseAmount,
};
