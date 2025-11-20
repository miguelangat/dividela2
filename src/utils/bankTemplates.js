/**
 * Bank-specific templates for improved parsing accuracy
 * Pre-configured column mappings and date formats for popular banks
 */

export const BANK_TEMPLATES = {
  // Chase Bank
  chase: {
    name: 'Chase Bank',
    identifier: ['chase', 'jpmorgan'],
    csv: {
      dateColumn: 'Transaction Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      debitColumn: null,
      creditColumn: null,
      balanceColumn: 'Balance',
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2}\/\d{2})\s+([A-Z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // Bank of America
  bofa: {
    name: 'Bank of America',
    identifier: ['bank of america', 'bofa', 'boa'],
    csv: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: null,
      debitColumn: 'Withdrawals',
      creditColumn: 'Deposits',
      balanceColumn: 'Running Bal.',
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // Wells Fargo
  wellsfargo: {
    name: 'Wells Fargo',
    identifier: ['wells fargo', 'wellsfargo'],
    csv: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      debitColumn: null,
      creditColumn: null,
      balanceColumn: null,
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z0-9\s\-\*#]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // Citibank
  citi: {
    name: 'Citibank',
    identifier: ['citi', 'citibank'],
    csv: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: null,
      debitColumn: 'Debit',
      creditColumn: 'Credit',
      balanceColumn: 'Balance',
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // Capital One
  capitalone: {
    name: 'Capital One',
    identifier: ['capital one', 'capitalone'],
    csv: {
      dateColumn: 'Transaction Date',
      descriptionColumn: 'Description',
      amountColumn: null,
      debitColumn: 'Debit',
      creditColumn: 'Credit',
      balanceColumn: 'Balance',
      dateFormat: 'YYYY-MM-DD',
    },
    pdf: {
      patterns: [
        /(\d{4}-\d{2}-\d{2})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // Discover
  discover: {
    name: 'Discover',
    identifier: ['discover'],
    csv: {
      dateColumn: 'Trans. Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      debitColumn: null,
      creditColumn: null,
      balanceColumn: null,
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2}\/\d{2})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // American Express
  amex: {
    name: 'American Express',
    identifier: ['american express', 'amex'],
    csv: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      debitColumn: null,
      creditColumn: null,
      balanceColumn: null,
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2}\/\d{2})\s+([A-Za-z0-9\s\-\*]+?)\s+\$([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // US Bank
  usbank: {
    name: 'US Bank',
    identifier: ['us bank', 'usbank'],
    csv: {
      dateColumn: 'Date',
      descriptionColumn: 'Transaction Description',
      amountColumn: 'Amount',
      debitColumn: null,
      creditColumn: null,
      balanceColumn: 'Balance',
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // TD Bank
  td: {
    name: 'TD Bank',
    identifier: ['td bank', 'tdbank'],
    csv: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      debitColumn: null,
      creditColumn: null,
      balanceColumn: 'Balance',
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },

  // PNC Bank
  pnc: {
    name: 'PNC Bank',
    identifier: ['pnc', 'pnc bank'],
    csv: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      debitColumn: null,
      creditColumn: null,
      balanceColumn: 'Balance',
      dateFormat: 'MM/DD/YYYY',
    },
    pdf: {
      patterns: [
        /(\d{2}\/\d{2}\/\d{4})\s+([A-Za-z0-9\s\-\*]+?)\s+([\d,]+\.\d{2})/gi,
      ],
    },
  },
};

/**
 * Detect bank from file content or filename
 *
 * @param {string} content - File content or filename
 * @returns {Object|null} Bank template if detected
 */
export function detectBank(content) {
  if (!content) return null;

  const lowerContent = content.toLowerCase();

  for (const [key, template] of Object.entries(BANK_TEMPLATES)) {
    for (const identifier of template.identifier) {
      if (lowerContent.includes(identifier)) {
        return { key, ...template };
      }
    }
  }

  return null;
}

/**
 * Get CSV column mapping for detected bank
 *
 * @param {string} bankKey - Bank template key
 * @returns {Object} Column mapping
 */
export function getBankCSVMapping(bankKey) {
  const template = BANK_TEMPLATES[bankKey];
  return template ? template.csv : null;
}

/**
 * Get PDF patterns for detected bank
 *
 * @param {string} bankKey - Bank template key
 * @returns {Array} Array of regex patterns
 */
export function getBankPDFPatterns(bankKey) {
  const template = BANK_TEMPLATES[bankKey];
  return template ? template.pdf.patterns : null;
}

/**
 * Apply bank template to parsed data
 *
 * @param {Object} parsedData - Parsed transaction data
 * @param {string} bankKey - Bank template key
 * @returns {Object} Enhanced parsed data with bank-specific optimizations
 */
export function applyBankTemplate(parsedData, bankKey) {
  const template = BANK_TEMPLATES[bankKey];

  if (!template) {
    return parsedData;
  }

  // Add bank metadata
  parsedData.metadata = {
    ...parsedData.metadata,
    detectedBank: template.name,
    bankKey,
    templateApplied: true,
  };

  return parsedData;
}

export default {
  BANK_TEMPLATES,
  detectBank,
  getBankCSVMapping,
  getBankPDFPatterns,
  applyBankTemplate,
};
