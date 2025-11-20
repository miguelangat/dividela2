/**
 * Tests for ImportSummary Component
 * Display import summary after completion with statistics and actions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ImportSummary from '../ImportSummary';

describe('ImportSummary', () => {
  const mockOnClose = jest.fn();
  const mockOnViewExpenses = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when result is not provided', () => {
    const { container } = render(
      <ImportSummary
        result={null}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(container.children.length).toBe(0);
  });

  it('should display success title when import succeeds', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('import.summary.success')).toBeTruthy();
  });

  it('should display failed title when import fails', () => {
    const result = {
      success: false,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 0,
        duplicates: 0,
        errors: 10,
      },
      error: 'Import failed',
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('import.summary.failed')).toBeTruthy();
  });

  it('should display file name and type', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'bank-statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('bank-statement.csv')).toBeTruthy();
    expect(getByText('CSV')).toBeTruthy();
  });

  it('should display import statistics', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 100,
        imported: 95,
        duplicates: 5,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('100')).toBeTruthy();
    expect(getByText('95')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('should show duplicates row when duplicates exist', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 8,
        duplicates: 2,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('import.summary.duplicates')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('should not show duplicates row when no duplicates', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { queryByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(queryByText('import.summary.duplicates')).toBeFalsy();
  });

  it('should show errors row when errors exist', () => {
    const result = {
      success: false,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 7,
        duplicates: 0,
        errors: 3,
      },
      error: 'Some transactions failed',
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('import.summary.errors')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('should not show errors row when no errors', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { queryByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(queryByText('import.summary.errors')).toBeFalsy();
  });

  it('should display error message when import fails', () => {
    const result = {
      success: false,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 0,
        duplicates: 0,
        errors: 10,
      },
      error: 'Network connection failed',
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('Network connection failed')).toBeTruthy();
  });

  it('should not display error message on success', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { queryByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(queryByText(/error/i)).toBeFalsy();
  });

  it('should show "View Expenses" button on success', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('import.summary.viewExpenses')).toBeTruthy();
  });

  it('should not show "View Expenses" button on failure', () => {
    const result = {
      success: false,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 0,
        duplicates: 0,
        errors: 10,
      },
      error: 'Import failed',
    };

    const { queryByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(queryByText('import.summary.viewExpenses')).toBeFalsy();
  });

  it('should call onViewExpenses when "View Expenses" button is pressed', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    const viewButton = getByText('import.summary.viewExpenses');
    fireEvent.press(viewButton);

    expect(mockOnViewExpenses).toHaveBeenCalled();
  });

  it('should call onClose when close button is pressed', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    const closeButton = getByText('import.summary.done');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show "Close" button text on failure', () => {
    const result = {
      success: false,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 0,
        duplicates: 0,
        errors: 10,
      },
      error: 'Import failed',
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('common.close')).toBeTruthy();
  });

  it('should handle missing fileName gracefully', () => {
    const result = {
      success: true,
      summary: {
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('Unknown')).toBeTruthy();
  });

  it('should handle missing fileType gracefully', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    expect(getByText('UNKNOWN')).toBeTruthy();
  });

  it('should support i18n for all text', () => {
    const result = {
      success: true,
      summary: {
        fileName: 'statement.csv',
        fileType: 'csv',
        totalTransactions: 10,
        imported: 10,
        duplicates: 0,
        errors: 0,
      },
    };

    const { getByText } = render(
      <ImportSummary
        result={result}
        onClose={mockOnClose}
        onViewExpenses={mockOnViewExpenses}
      />
    );

    // All text should use translation keys
    expect(getByText('import.summary.success')).toBeTruthy();
    expect(getByText('import.summary.fileName')).toBeTruthy();
    expect(getByText('import.summary.fileType')).toBeTruthy();
    expect(getByText('import.summary.totalTransactions')).toBeTruthy();
    expect(getByText('import.summary.imported')).toBeTruthy();
    expect(getByText('import.summary.viewExpenses')).toBeTruthy();
    expect(getByText('import.summary.done')).toBeTruthy();
  });
});
