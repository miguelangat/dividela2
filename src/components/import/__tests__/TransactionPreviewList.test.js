/**
 * Tests for TransactionPreviewList Component
 * Transaction list with preview, summary stats, and bulk actions
 */

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import TransactionPreviewList from '../TransactionPreviewList';
import { createMockTransactions } from '../../../__tests__/utils/testHelpers';

// Mock TransactionPreviewItem to simplify testing
jest.mock('../TransactionPreviewItem', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return function MockTransactionPreviewItem({ transaction, onToggleSelect, onCategoryChange, selected }) {
    return (
      <TouchableOpacity
        testID={`transaction-item-${transaction.description}`}
        onPress={() => onToggleSelect(!selected)}
      >
        <Text>{transaction.description}</Text>
        <Text>{transaction.amount}</Text>
      </TouchableOpacity>
    );
  };
});

describe('TransactionPreviewList', () => {
  const mockOnToggleTransaction = jest.fn();
  const mockOnCategoryChange = jest.fn();
  const mockOnSelectAll = jest.fn();
  const mockOnDeselectAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with transactions', () => {
    const mockTransactions = createMockTransactions(3);
    const selectedTransactions = { 0: true, 1: true, 2: true };

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={[]}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(getByText('import.preview.title')).toBeTruthy();
  });

  it('should display correct summary statistics', () => {
    const mockTransactions = createMockTransactions(5);
    const selectedTransactions = { 0: true, 1: true, 2: false, 3: true, 4: false };

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={[]}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    // Should show total: 5, selected: 3
    expect(getByText(/import.preview.total/)).toBeTruthy();
    expect(getByText(/import.preview.selectedLabel/)).toBeTruthy();
  });

  it('should calculate total amount correctly for selected transactions', () => {
    const mockTransactions = [
      { date: new Date('2024-01-15'), description: 'Transaction 1', amount: 10.50, type: 'debit' },
      { date: new Date('2024-01-16'), description: 'Transaction 2', amount: 25.00, type: 'debit' },
      { date: new Date('2024-01-17'), description: 'Transaction 3', amount: 15.25, type: 'debit' },
    ];
    const selectedTransactions = { 0: true, 1: true, 2: false }; // Total should be 35.50

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={[]}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(getByText('$35.50')).toBeTruthy();
  });

  it('should show duplicate count when duplicates exist', () => {
    const mockTransactions = createMockTransactions(4);
    const duplicateResults = [
      { hasDuplicates: true },
      { hasDuplicates: false },
      { hasDuplicates: true },
      { hasDuplicates: false },
    ];
    const selectedTransactions = { 0: true, 1: true, 2: true, 3: true };

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={duplicateResults}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(getByText(/import.preview.duplicates/)).toBeTruthy();
  });

  it('should show auto-skip warning for high confidence duplicates', () => {
    const mockTransactions = createMockTransactions(3);
    const duplicateResults = [
      { hasDuplicates: true, highConfidenceDuplicate: { confidence: 0.95 } },
      { hasDuplicates: true, highConfidenceDuplicate: { confidence: 0.98 } },
      { hasDuplicates: false },
    ];
    const selectedTransactions = { 0: true, 1: true, 2: true };

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={duplicateResults}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    // Should show warning about auto-skipped duplicates (count: 2)
    expect(getByText(/import.preview.autoSkipWarning/)).toBeTruthy();
  });

  it('should call onSelectAll when select all button is pressed', () => {
    const mockTransactions = createMockTransactions(3);
    const selectedTransactions = { 0: true, 1: false, 2: false };

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={[]}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    const selectAllButton = getByText('import.preview.selectAll');
    fireEvent.press(selectAllButton);

    expect(mockOnSelectAll).toHaveBeenCalled();
  });

  it('should call onDeselectAll when deselect all button is pressed', () => {
    const mockTransactions = createMockTransactions(3);
    const selectedTransactions = { 0: true, 1: true, 2: true };

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={[]}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    const deselectAllButton = getByText('import.preview.deselectAll');
    fireEvent.press(deselectAllButton);

    expect(mockOnDeselectAll).toHaveBeenCalled();
  });

  it('should render all transactions in the list', () => {
    const mockTransactions = createMockTransactions(5);
    const selectedTransactions = { 0: true, 1: true, 2: true, 3: true, 4: true };

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={[]}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    // All 5 transactions should be rendered
    mockTransactions.forEach((transaction) => {
      expect(getByText(transaction.description)).toBeTruthy();
    });
  });

  it('should handle empty transaction list', () => {
    const { getByText } = render(
      <TransactionPreviewList
        transactions={[]}
        suggestions={[]}
        duplicateResults={[]}
        selectedTransactions={{}}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(getByText('import.preview.title')).toBeTruthy();
    expect(getByText('$0.00')).toBeTruthy(); // Total amount should be 0
  });

  it('should not show duplicate count when no duplicates', () => {
    const mockTransactions = createMockTransactions(3);
    const duplicateResults = [
      { hasDuplicates: false },
      { hasDuplicates: false },
      { hasDuplicates: false },
    ];
    const selectedTransactions = { 0: true, 1: true, 2: true };

    const { queryByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={duplicateResults}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    expect(queryByText(/import.preview.duplicates/)).toBeFalsy();
  });

  it('should support i18n for all text', () => {
    const mockTransactions = createMockTransactions(2);
    const selectedTransactions = { 0: true, 1: true };

    const { getByText } = render(
      <TransactionPreviewList
        transactions={mockTransactions}
        suggestions={[]}
        duplicateResults={[]}
        selectedTransactions={selectedTransactions}
        categoryOverrides={{}}
        onToggleTransaction={mockOnToggleTransaction}
        onCategoryChange={mockOnCategoryChange}
        onSelectAll={mockOnSelectAll}
        onDeselectAll={mockOnDeselectAll}
      />
    );

    // All text should use translation keys
    expect(getByText('import.preview.title')).toBeTruthy();
    expect(getByText(/import.preview.total/)).toBeTruthy();
    expect(getByText(/import.preview.selectedLabel/)).toBeTruthy();
    expect(getByText(/import.preview.totalToImport/)).toBeTruthy();
    expect(getByText('import.preview.selectAll')).toBeTruthy();
    expect(getByText('import.preview.deselectAll')).toBeTruthy();
  });
});
