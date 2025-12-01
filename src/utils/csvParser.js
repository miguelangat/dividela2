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
 * Supports English and Spanish column names
 */
const COLUMN_MAPPINGS = {
  date: [
    // English
    'date', 'transaction date', 'posting date', 'trans date', 'value date', 'transaction_date',
    // Spanish
    'fecha', 'fecha de transacción', 'fecha de transaccion', 'fecha transacción', 'fecha transaccion',
  ],
  description: [
    // English
    'description', 'details', 'memo', 'transaction details', 'narration', 'particulars', 'transaction_details',
    // Spanish
    'descripción', 'descripcion', 'detalles', 'concepto', 'referencia', 'movimiento',
  ],
  amount: [
    // English
    'amount', 'transaction amount', 'value',
    // Spanish
    'monto', 'importe', 'valor', 'cantidad',
  ],
  debit: [
    // English
    'debit', 'withdrawal', 'withdrawals', 'debit amount', 'debits',
    // Spanish
    'débito', 'debito', 'cargo', 'cargos', 'retiro', 'retiros', 'salida', 'salidas',
  ],
  credit: [
    // English
    'credit', 'deposit', 'deposits', 'credit amount', 'credits',
    // Spanish
    'crédito', 'credito', 'abono', 'abonos', 'depósito', 'deposito', 'entrada', 'entradas',
  ],
  balance: [
    // English
    'balance', 'running balance', 'account balance', 'closing balance',
    // Spanish
    'saldo', 'saldo final', 'saldo disponible', 'balance',
  ],
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
 *
 * @param {string} dateString - Date string to parse
 * @param {string} preferredFormat - Preferred date format ('auto', 'MM/DD/YYYY', 'DD/MM/YYYY')
 * @returns {Date|null} Parsed date or null
 */
function parseDate(dateString, preferredFormat = 'auto') {
  if (!dateString) return null;

  const cleaned = dateString.trim();

  // Try YYYY-MM-DD format (unambiguous)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned);
  }

  // Try MM/DD/YYYY or DD/MM/YYYY with preference
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [first, second, year] = cleaned.split('/');

    // Use preferred format if specified
    if (preferredFormat === 'MM/DD/YYYY') {
      // Month/Day/Year (US format)
      const date = new Date(year, parseInt(first) - 1, parseInt(second));
      if (!isNaN(date.getTime())) {
        return date;
      }
    } else if (preferredFormat === 'DD/MM/YYYY') {
      // Day/Month/Year (International format)
      const date = new Date(year, parseInt(second) - 1, parseInt(first));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Auto-detect: Try MM/DD/YYYY first (US format), validate month
    const dateUS = new Date(year, parseInt(first) - 1, parseInt(second));
    if (dateUS.getMonth() === parseInt(first) - 1 && parseInt(first) <= 12) {
      return dateUS;
    }

    // Try DD/MM/YYYY (International format)
    const dateIntl = new Date(year, parseInt(second) - 1, parseInt(first));
    if (!isNaN(dateIntl.getTime())) {
      return dateIntl;
    }

    return null;
  }

  // Try DD-MM-YYYY or MM-DD-YYYY with preference
  if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
    const [first, second, year] = cleaned.split('-');

    // Use preferred format if specified
    if (preferredFormat === 'MM/DD/YYYY') {
      // Month-Day-Year (US format)
      const date = new Date(year, parseInt(first) - 1, parseInt(second));
      if (!isNaN(date.getTime())) {
        return date;
      }
    } else if (preferredFormat === 'DD/MM/YYYY') {
      // Day-Month-Year (International format)
      const date = new Date(year, parseInt(second) - 1, parseInt(first));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Auto-detect: Try MM-DD-YYYY first, validate month
    const dateUS = new Date(year, parseInt(first) - 1, parseInt(second));
    if (dateUS.getMonth() === parseInt(first) - 1 && parseInt(first) <= 12) {
      return dateUS;
    }

    // Try DD-MM-YYYY
    const dateIntl = new Date(year, parseInt(second) - 1, parseInt(first));
    if (!isNaN(dateIntl.getTime())) {
      return dateIntl;
    }

    return null;
  }

  // Fallback to native Date parsing
  const fallback = new Date(cleaned);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Currency symbol mappings for detection
 */
const CURRENCY_SYMBOLS = {
  '$': 'USD',
  'US$': 'USD',
  'USD': 'USD',
  'MX$': 'MXN',
  'MXN': 'MXN',
  'COL$': 'COP',
  'COP': 'COP',
  'S/': 'PEN',
  'PEN': 'PEN',
  '€': 'EUR',
  'EUR': 'EUR',
  '£': 'GBP',
  'GBP': 'GBP',
  '¥': 'CNY',
  'CNY': 'CNY',
  'R$': 'BRL',
  'BRL': 'BRL',
};

/**
 * Detect currency from amount string
 */
function detectCurrency(amountString) {
  if (!amountString) return null;

  const str = String(amountString).trim();

  // Check for currency symbols/codes
  for (const [symbol, currency] of Object.entries(CURRENCY_SYMBOLS)) {
    if (str.includes(symbol)) {
      return currency;
    }
  }

  return null;
}

/**
 * Parse amount string to number
 * Handles: commas, parentheses for negatives, currency symbols
 * Returns object with value, currency, and error flag for better validation
 */
function parseAmount(amountString) {
  if (!amountString || String(amountString).trim() === '') {
    return { value: 0, isValid: false, error: 'Empty amount', currency: null };
  }

  // Detect currency before cleaning
  const currency = detectCurrency(amountString);

  const cleaned = String(amountString)
    .replace(/[$€£¥,\s]/g, '') // Remove currency symbols, commas, spaces
    .trim();

  // Handle parentheses as negative (e.g., "(100.00)" = -100)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    const value = parseFloat(cleaned.slice(1, -1));
    if (isNaN(value)) {
      return { value: 0, isValid: false, error: 'Invalid amount format', currency };
    }
    return { value: -Math.abs(value), isValid: true, currency };
  }

  const value = parseFloat(cleaned);
  if (isNaN(value)) {
    return { value: 0, isValid: false, error: 'Invalid number', currency };
  }

  return { value, isValid: true, currency };
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
 * Returns an object with index and confidence level
 */
function detectHeaderRow(rows) {
  // Look for a row that contains typical column names
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const normalizedRow = row.map(cell => (cell || '').toLowerCase().trim());

    // Count matches for different column types
    let dateMatches = 0;
    let amountMatches = 0;
    let descriptionMatches = 0;

    normalizedRow.forEach(cell => {
      // Check date columns
      if (COLUMN_MAPPINGS.date.some(name => cell === name || cell.includes(name))) {
        dateMatches++;
      }
      // Check amount columns
      if ([...COLUMN_MAPPINGS.amount, ...COLUMN_MAPPINGS.debit, ...COLUMN_MAPPINGS.credit].some(
        name => cell === name || cell.includes(name)
      )) {
        amountMatches++;
      }
      // Check description columns
      if (COLUMN_MAPPINGS.description.some(name => cell === name || cell.includes(name))) {
        descriptionMatches++;
      }
    });

    // Calculate confidence score
    const totalMatches = dateMatches + amountMatches + descriptionMatches;
    const hasRequiredColumns = dateMatches > 0 && amountMatches > 0;

    if (hasRequiredColumns) {
      const confidence = totalMatches >= 3 ? 'high' : totalMatches >= 2 ? 'medium' : 'low';
      return { index: i, confidence, matches: totalMatches };
    }
  }

  // If no header found with required columns, check first row more carefully
  if (rows.length > 0 && rows[0].length > 0) {
    const firstRow = rows[0];
    const hasNumericValues = firstRow.some(cell => !isNaN(parseFloat(cell)) && !isNaN(cell));

    // If first row has numeric values, it's likely data, not header
    if (hasNumericValues) {
      console.warn('⚠️ No clear header row detected, and first row appears to be data');
      return { index: -1, confidence: 'none', warning: 'No header detected' };
    }
  }

  // Fallback: assume first row is header with low confidence
  console.warn('⚠️ No clear header row detected, assuming first row is header');
  return { index: 0, confidence: 'uncertain', warning: 'Header detection uncertain' };
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
 * Strip BOM (Byte Order Mark) from string
 * Many Excel-exported CSVs include UTF-8 BOM (0xEF 0xBB 0xBF)
 */
function stripBOM(content) {
  if (typeof content === 'string' && content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

/**
 * Parse CSV file content
 *
 * @param {string} fileContent - CSV file content as string
 * @param {Object} options - Parsing options
 * @param {string} options.dateFormat - Preferred date format ('auto', 'MM/DD/YYYY', 'DD/MM/YYYY')
 * @returns {Promise<Object>} Parsed transactions and metadata
 */
export async function parseCSV(fileContent, options = {}) {
  const { dateFormat = 'auto' } = options;

  return new Promise((resolve, reject) => {
    // Strip BOM if present (common in Excel-exported CSVs)
    const cleanedContent = stripBOM(fileContent);

    Papa.parse(cleanedContent, {
      // Enable proper handling of quoted multi-line values
      skipEmptyLines: 'greedy', // Skip empty lines but handle quoted newlines
      newline: '',              // Auto-detect newline character
      quoteChar: '"',           // Standard quote character
      escapeChar: '"',          // Standard escape (double quote)

      complete: (results) => {
        try {
          const { data, errors } = results;

          if (errors.length > 0 && errors[0].type === 'Delimiter') {
            // Auto-detect delimiter failed, try common ones
            const delimiters = [',', ';', '\t', '|'];
            for (const delimiter of delimiters) {
              try {
                const retryResult = Papa.parse(cleanedContent, {
                  delimiter,
                  skipEmptyLines: 'greedy',
                  newline: '',
                  quoteChar: '"',
                  escapeChar: '"',
                });
                if (retryResult.data.length > 0) {
                  return resolve(processCSVData(retryResult.data, dateFormat));
                }
              } catch (e) {
                continue;
              }
            }
          }

          if (data.length === 0) {
            return reject(new Error('CSV file is empty'));
          }

          resolve(processCSVData(data, dateFormat));
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
 *
 * @param {Array} rows - Parsed CSV rows
 * @param {string} dateFormat - Preferred date format
 * @returns {Object} Processed transactions and metadata
 */
function processCSVData(rows, dateFormat = 'auto') {
  if (!rows || rows.length === 0) {
    throw new Error('No data found in CSV file');
  }

  // Detect header row
  const headerResult = detectHeaderRow(rows);
  const headerIndex = headerResult.index;

  // Handle case where no header was detected
  if (headerIndex === -1) {
    console.error('❌ CSV Header Detection Failed');
    console.error('First 3 rows:', rows.slice(0, 3));
    throw new Error(
      'Could not detect header row in CSV file. Please ensure your CSV has header columns like "Date", "Description", and "Amount".\n\n' +
      'Common solutions:\n' +
      '• Ensure the first row contains column names\n' +
      '• Check that Date and Amount columns are present\n' +
      '• Verify the file is a valid CSV (not Excel or PDF)'
    );
  }

  // Log warning if header detection is uncertain
  if (headerResult.warning) {
    console.warn(`⚠️ Header detection: ${headerResult.warning} (confidence: ${headerResult.confidence})`);
    console.warn('Detected headers:', rows[headerIndex]);
  } else if (headerResult.confidence) {
    console.log(`✅ Header detected at row ${headerIndex + 1} (confidence: ${headerResult.confidence})`);
    console.log('Headers:', rows[headerIndex]);
  }

  const headers = rows[headerIndex];

  // Additional validation: check for empty headers
  if (!headers || headers.length === 0 || headers.every(h => !h || h.trim() === '')) {
    console.error('❌ All headers are empty');
    console.error('Header row:', headers);
    throw new Error('CSV file has empty header row. Please ensure the first row contains column names.');
  }

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

  // Log column mapping results
  console.log('📊 Column Mapping:');
  console.log('  Date:', dateIndex !== -1 ? `Column ${dateIndex} (${headers[dateIndex]})` : 'NOT FOUND');
  console.log('  Description:', descriptionIndex !== -1 ? `Column ${descriptionIndex} (${headers[descriptionIndex]})` : 'NOT FOUND');
  console.log('  Amount:', amountIndex !== -1 ? `Column ${amountIndex} (${headers[amountIndex]})` : 'NOT FOUND');
  console.log('  Debit:', debitIndex !== -1 ? `Column ${debitIndex} (${headers[debitIndex]})` : 'NOT FOUND');
  console.log('  Credit:', creditIndex !== -1 ? `Column ${creditIndex} (${headers[creditIndex]})` : 'NOT FOUND');
  console.log('  Balance:', balanceIndex !== -1 ? `Column ${balanceIndex} (${headers[balanceIndex]})` : 'optional');

  if (dateIndex === -1) {
    console.error('❌ Date column not found. Available headers:', headers);

    // Check if this might be an account summary instead of transactions
    const hasAccountHeaders = headers.some(h => {
      const lower = (h || '').toLowerCase();
      return lower.includes('account') || lower.includes('cuenta') ||
             lower.includes('number') || lower.includes('número') ||
             lower.includes('name') || lower.includes('nombre');
    });

    let msg;
    if (hasAccountHeaders) {
      msg = 'This CSV appears to be an account summary, not a transaction list.\n\n' +
            'Please download your bank TRANSACTIONS or STATEMENT file instead.\n' +
            'The file should have columns like:\n' +
            '• Date / Fecha\n' +
            '• Description / Descripción\n' +
            '• Amount / Monto / Importe';
    } else if (headerResult.confidence === 'uncertain') {
      msg = 'Could not find date column. Header detection was uncertain.\n\n' +
            'Please verify your CSV has a header row with a "Date" or "Fecha" column.\n' +
            `Found headers: ${headers.join(', ')}`;
    } else {
      msg = 'Could not find date column in CSV file.\n\n' +
            'Please ensure your CSV has one of these columns:\n' +
            '• Date (English) or Fecha (Spanish)\n' +
            `Found headers: ${headers.join(', ')}`;
    }
    throw new Error(msg);
  }

  if (amountIndex === -1 && debitIndex === -1 && creditIndex === -1) {
    console.error('❌ Amount column not found. Available headers:', headers);

    const msg = headerResult.confidence === 'uncertain'
      ? 'Could not find amount column. Header detection was uncertain.\n\n' +
        'Please verify your CSV has columns like:\n' +
        '• Amount / Monto / Importe\n' +
        '• Debit / Débito / Cargo (withdrawals)\n' +
        '• Credit / Crédito / Abono (deposits)\n' +
        `Found headers: ${headers.join(', ')}`
      : 'Could not find amount column in CSV file.\n\n' +
        'Please ensure your CSV has one of these columns:\n' +
        '• Amount / Monto (combined)\n' +
        '• Debit and Credit (separate columns)\n' +
        `Found headers: ${headers.join(', ')}`;
    throw new Error(msg);
  }

  // Parse transactions
  const transactions = [];
  const errors = [];

  dataRows.forEach((row, index) => {
    try {
      if (!row || row.length === 0) return;

      // Parse date with preferred format
      const dateValue = row[dateIndex];
      const date = parseDate(dateValue, dateFormat);

      if (!date || isNaN(date.getTime())) {
        errors.push({ row: index + headerIndex + 2, error: 'Invalid date format', value: dateValue });
        return;
      }

      // Parse amount
      let amount = 0;
      let type = 'debit';
      let amountParseError = null;
      let detectedCurrency = null;

      if (amountIndex !== -1) {
        // Single amount column
        const amountResult = parseAmount(row[amountIndex]);
        if (!amountResult.isValid) {
          amountParseError = amountResult.error;
        } else {
          amount = amountResult.value;
          type = amount < 0 ? 'credit' : 'debit';
          amount = Math.abs(amount);
          detectedCurrency = amountResult.currency;
        }
      } else {
        // Separate debit/credit columns
        const debitResult = debitIndex !== -1 ? parseAmount(row[debitIndex]) : { value: 0, isValid: true, currency: null };
        const creditResult = creditIndex !== -1 ? parseAmount(row[creditIndex]) : { value: 0, isValid: true, currency: null };

        if (debitResult.value > 0) {
          amount = debitResult.value;
          type = 'debit';
          detectedCurrency = debitResult.currency;
        } else if (creditResult.value > 0) {
          amount = creditResult.value;
          type = 'credit';
          detectedCurrency = creditResult.currency;
        }
      }

      // Skip if amount is 0 (but add to warnings)
      if (amount === 0) {
        if (amountParseError) {
          errors.push({ row: index + headerIndex + 2, error: `Amount parsing failed: ${amountParseError}`, value: row[amountIndex] });
        } else {
          errors.push({ row: index + headerIndex + 2, error: 'Zero amount transaction skipped', value: row });
        }
        return;
      }

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
        currency: detectedCurrency, // Add detected currency to transaction
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

  // Log parsing summary
  console.log('✅ CSV Parsing Complete:');
  console.log(`  Total rows: ${dataRows.length}`);
  console.log(`  Successful transactions: ${transactions.length}`);
  console.log(`  Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.warn('⚠️ Parsing errors:', errors.slice(0, 5)); // Show first 5 errors
  }

  // Validate we have some transactions
  if (transactions.length === 0) {
    console.error('❌ No valid transactions parsed');
    throw new Error(
      'No valid transactions found in CSV file. ' +
      (errors.length > 0
        ? `All ${errors.length} rows had errors. Check console for details.`
        : 'Please verify your CSV file format.')
    );
  }

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

// Named exports for direct imports (parseCSV is already exported above)
export { parseDate, parseAmount, detectCurrency };

// Default export for backward compatibility
export default {
  parseCSV,
  parseDate,
  parseAmount,
  detectCurrency,
};
