import { parseCSV } from './csvParser';
import { parsePDF, isPDF } from './pdfParser';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { autoDetectAndDecode } from './encodingDetector';

/**
 * Main orchestrator for bank statement parsing
 * Detects file type and routes to appropriate parser
 */

/**
 * Detect file type from URI or content
 */
function detectFileType(uri, fileContent) {
  // Check file extension
  const extension = uri.toLowerCase().split('.').pop();

  if (extension === 'csv' || extension === 'txt') {
    return 'csv';
  }

  if (extension === 'pdf') {
    return 'pdf';
  }

  // Check content if extension is ambiguous
  if (fileContent) {
    // Check for PDF magic number
    if (typeof fileContent !== 'string') {
      const header = fileContent.slice(0, 4);
      if (header.toString('utf-8') === '%PDF' || header.toString() === '%PDF') {
        return 'pdf';
      }
    }

    // If it's a string, assume CSV
    if (typeof fileContent === 'string') {
      return 'csv';
    }
  }

  throw new Error('Unable to detect file type. Please ensure the file is a CSV or PDF.');
}

/**
 * Read file content from URI
 * Handles different platforms (web, iOS, Android)
 */
async function readFileContent(uri, fileType) {
  try {
    if (Platform.OS === 'web') {
      // On web, the URI might be a blob URL
      const response = await fetch(uri);

      if (fileType === 'pdf') {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } else {
        // For CSV/text files, detect encoding and decode
        const arrayBuffer = await response.arrayBuffer();
        const result = autoDetectAndDecode(arrayBuffer);

        if (result.isBinary) {
          throw new Error('File appears to be binary, not a text CSV file');
        }

        console.log(`📄 Detected file encoding: ${result.encoding}`);
        return result.content;
      }
    } else {
      // On native platforms, use FileSystem
      if (fileType === 'pdf') {
        // Read as base64 and convert to buffer
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return Buffer.from(base64, 'base64');
      } else {
        // For CSV/text files, detect encoding and decode
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const buffer = Buffer.from(base64, 'base64');
        const result = autoDetectAndDecode(buffer);

        if (result.isBinary) {
          throw new Error('File appears to be binary, not a text CSV file');
        }

        console.log(`📄 Detected file encoding: ${result.encoding}`);
        return result.content;
      }
    }
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * Parse bank statement file
 *
 * @param {string} fileUri - URI of the file to parse
 * @param {Object} options - Parsing options
 * @param {string} options.fileType - Override auto-detection ('csv' or 'pdf')
 * @returns {Promise<Object>} Parsed result with transactions and metadata
 */
export async function parseBankStatement(fileUri, options = {}) {
  try {
    if (!fileUri) {
      throw new Error('File URI is required');
    }

    // Detect file type
    let fileType = options.fileType;
    if (!fileType) {
      fileType = detectFileType(fileUri, null);
    }

    // Validate file type
    if (!['csv', 'pdf'].includes(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}. Only CSV and PDF files are supported.`);
    }

    // Read file content
    const fileContent = await readFileContent(fileUri, fileType);

    if (!fileContent || (typeof fileContent === 'string' && fileContent.trim().length === 0)) {
      throw new Error('File is empty or unreadable');
    }

    // Parse based on file type
    let result;

    if (fileType === 'csv') {
      result = await parseCSV(fileContent);
    } else if (fileType === 'pdf') {
      result = await parsePDF(fileContent);
    }

    // Add file information to metadata
    result.metadata = {
      ...result.metadata,
      fileType,
      fileName: fileUri.split('/').pop(),
      parsedAt: new Date().toISOString(),
    };

    // Validate result
    if (!result.transactions || result.transactions.length === 0) {
      throw new Error('No transactions found in the file');
    }

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      transactions: [],
      metadata: {
        error: error.message,
        fileType: options.fileType || 'unknown',
      },
    };
  }
}

/**
 * Validate parsed transactions
 * Checks for data quality issues
 */
export function validateTransactions(transactions) {
  const issues = [];
  const validTransactions = [];

  transactions.forEach((transaction, index) => {
    const errors = [];

    // Validate date
    if (!transaction.date || isNaN(transaction.date.getTime())) {
      errors.push('Invalid or missing date');
    } else if (transaction.date > new Date()) {
      errors.push('Date is in the future');
    }

    // Validate amount
    if (!transaction.amount || transaction.amount <= 0) {
      errors.push('Invalid or missing amount');
    }

    // Validate description
    if (!transaction.description || transaction.description.trim().length === 0) {
      errors.push('Missing description');
    }

    if (errors.length > 0) {
      issues.push({
        index,
        transaction,
        errors,
      });
    } else {
      validTransactions.push(transaction);
    }
  });

  return {
    valid: validTransactions,
    invalid: issues,
    validationPassed: issues.length === 0,
  };
}

/**
 * Get file info without parsing
 * Useful for showing file details before import
 */
export async function getFileInfo(fileUri) {
  try {
    const fileType = detectFileType(fileUri, null);
    const fileName = fileUri.split('/').pop();

    let size = 0;
    if (Platform.OS !== 'web') {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      size = fileInfo.size || 0;
    }

    return {
      fileName,
      fileType,
      size,
      uri: fileUri,
    };
  } catch (error) {
    return {
      fileName: fileUri.split('/').pop(),
      fileType: 'unknown',
      size: 0,
      uri: fileUri,
      error: error.message,
    };
  }
}

export default {
  parseBankStatement,
  validateTransactions,
  getFileInfo,
};
