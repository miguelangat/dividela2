/**
 * csvExport.js
 *
 * Utility functions for exporting expense data to CSV format
 * Supports both web (Blob download) and mobile (file system) platforms
 */

import { Platform } from 'react-native';
import { getCategoryName } from '../constants/categories';

/**
 * Escape CSV special characters
 * @param {string} field - Field value to escape
 * @returns {string} Escaped field value
 */
const escapeCSVField = (field) => {
  if (field === null || field === undefined) return '';

  const stringField = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
};

/**
 * Format expense for CSV row
 * @param {Object} expense - Expense object
 * @param {Object} userDetails - Current user details
 * @param {Object} partnerDetails - Partner details
 * @returns {Array} Array of CSV field values
 */
export const formatExpenseForCSV = (expense, userDetails, partnerDetails) => {
  const date = expense.date ? new Date(expense.date).toLocaleDateString() : '';
  const description = expense.description || '';
  const category = getCategoryName(expense.category || 'other');
  const amount = expense.amount ? expense.amount.toFixed(2) : '0.00';

  const paidBy = expense.paidBy === userDetails.uid
    ? userDetails.displayName || 'You'
    : partnerDetails?.displayName || 'Partner';

  const yourShare = expense.splitDetails?.user1Amount !== undefined
    ? (expense.paidBy === userDetails.uid
        ? expense.splitDetails.user1Amount.toFixed(2)
        : expense.splitDetails.user2Amount.toFixed(2))
    : (amount / 2).toFixed(2);

  const partnerShare = expense.splitDetails?.user2Amount !== undefined
    ? (expense.paidBy === userDetails.uid
        ? expense.splitDetails.user2Amount.toFixed(2)
        : expense.splitDetails.user1Amount.toFixed(2))
    : (amount / 2).toFixed(2);

  const settlementStatus = expense.settledAt ? 'Settled' : 'Pending';

  const settledDate = expense.settledAt
    ? new Date(expense.settledAt.toDate ? expense.settledAt.toDate() : expense.settledAt).toLocaleDateString()
    : '';

  return [
    date,
    description,
    category,
    amount,
    paidBy,
    yourShare,
    partnerShare,
    settlementStatus,
    settledDate,
  ];
};

/**
 * Convert expenses array to CSV string
 * @param {Array} expenses - Array of expense objects
 * @param {Object} userDetails - Current user details
 * @param {Object} partnerDetails - Partner details
 * @returns {string} CSV formatted string
 */
export const exportExpensesToCSV = (expenses, userDetails, partnerDetails) => {
  // CSV Header
  const headers = [
    'Date',
    'Description',
    'Category',
    'Amount',
    'Paid By',
    'Your Share',
    'Partner Share',
    'Settlement Status',
    'Settled Date',
  ];

  // Convert header to CSV row
  const headerRow = headers.map(escapeCSVField).join(',');

  // Convert expenses to CSV rows
  const dataRows = expenses.map(expense => {
    const fields = formatExpenseForCSV(expense, userDetails, partnerDetails);
    return fields.map(escapeCSVField).join(',');
  });

  // Combine header and data rows
  const csvContent = [headerRow, ...dataRows].join('\n');

  return csvContent;
};

/**
 * Generate filename for CSV export
 * @param {Date|string} startDate - Start date of report
 * @param {Date|string} endDate - End date of report
 * @returns {string} Filename
 */
export const generateCSVFilename = (startDate, endDate) => {
  const today = new Date().toISOString().split('T')[0];

  if (startDate && endDate) {
    const start = new Date(startDate).toISOString().split('T')[0];
    const end = new Date(endDate).toISOString().split('T')[0];
    return `dividela-expenses-${start}-to-${end}.csv`;
  }

  return `dividela-expenses-${today}.csv`;
};

/**
 * Download CSV file (Web platform)
 * @param {string} csvData - CSV formatted string
 * @param {string} filename - Filename for download
 */
const downloadCSVWeb = (csvData, filename) => {
  // Create blob
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up URL
  URL.revokeObjectURL(url);
};

/**
 * Share CSV file (Mobile platform)
 * Note: Requires expo-file-system and expo-sharing
 * @param {string} csvData - CSV formatted string
 * @param {string} filename - Filename for sharing
 */
const shareCSVMobile = async (csvData, filename) => {
  try {
    // Import expo modules dynamically
    const FileSystem = require('expo-file-system');
    const Sharing = require('expo-sharing');

    // Define file path
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, csvData, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share file
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Expenses',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      console.warn('Sharing is not available on this device');
      throw new Error('Sharing not available');
    }

    return { success: true };
  } catch (error) {
    console.error('Error sharing CSV on mobile:', error);
    throw error;
  }
};

/**
 * Download or share CSV file (platform-specific)
 * @param {string} csvData - CSV formatted string
 * @param {string} filename - Filename
 * @returns {Promise} Resolves when download/share completes
 */
export const downloadCSV = async (csvData, filename) => {
  if (Platform.OS === 'web') {
    downloadCSVWeb(csvData, filename);
    return { success: true, platform: 'web' };
  } else {
    // Mobile (iOS or Android)
    return await shareCSVMobile(csvData, filename);
  }
};

/**
 * Export expenses with all metadata
 * @param {Array} expenses - Array of expense objects
 * @param {Object} userDetails - Current user details
 * @param {Object} partnerDetails - Partner details
 * @param {Object} options - Export options
 * @returns {Promise} Resolves when export completes
 */
export const exportExpenses = async (expenses, userDetails, partnerDetails, options = {}) => {
  try {
    // Generate CSV content
    const csvData = exportExpensesToCSV(expenses, userDetails, partnerDetails);

    // Generate filename
    const filename = generateCSVFilename(options.startDate, options.endDate);

    // Download or share
    await downloadCSV(csvData, filename);

    return {
      success: true,
      filename,
      expenseCount: expenses.length,
    };
  } catch (error) {
    console.error('Error exporting expenses:', error);
    throw error;
  }
};

export default {
  formatExpenseForCSV,
  exportExpensesToCSV,
  generateCSVFilename,
  downloadCSV,
  exportExpenses,
};
