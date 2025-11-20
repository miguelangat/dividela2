/**
 * Tests for TransactionPreviewItem Component
 * Individual transaction preview with category selection and duplicate warnings
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TransactionPreviewItem from '../TransactionPreviewItem';
import { createMockTransaction } from '../../../__tests__/utils/testHelpers';

// Mock sub-components
jest.mock('../CategorySuggestion', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockCategorySuggestion({ suggestion }) {
    return <Text testID="category-suggestion">{suggestion?.categoryKey}</Text>;
  };
});

jest.mock('../DuplicateWarning', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockDuplicateWarning({ duplicateStatus }) {
    if (!duplicateStatus?.hasDuplicates) return null;
    return <Text testID="duplicate-warning">Duplicate</Text>;
  };
});

describe('TransactionPreviewItem', () => {
  const mockOnToggleSelect = jest.fn();
  const mockOnCategoryChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render transaction details correctly', () => {
    const mockTransaction = createMockTransaction({
      description: 'Starbucks Coffee',
      amount: 5.50,
      date: new Date('2024-01-15'),
    });

    const { getByText } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={null}
        selected={true}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(getByText('Starbucks Coffee')).toBeTruthy();
    expect(getByText('$5.50')).toBeTruthy();
  });

  it('should format date correctly', () => {
    const mockTransaction = createMockTransaction({
      date: new Date('2024-01-15'),
    });

    const { getByText } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={null}
        selected={true}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    // Date should be formatted as locale date string
    const expectedDate = new Date('2024-01-15').toLocaleDateString();
    expect(getByText(expectedDate)).toBeTruthy();
  });

  it('should show checkbox as checked when selected', () => {
    const mockTransaction = createMockTransaction();

    const { getByRole } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={null}
        selected={true}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(true);
  });

  it('should show checkbox as unchecked when not selected', () => {
    const mockTransaction = createMockTransaction();

    const { getByRole } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={null}
        selected={false}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(false);
  });

  it('should call onToggleSelect when checkbox is pressed', () => {
    const mockTransaction = createMockTransaction();

    const { getByRole } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={null}
        selected={true}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const checkbox = getByRole('checkbox');
    fireEvent.press(checkbox);

    expect(mockOnToggleSelect).toHaveBeenCalledWith(false);
  });

  it('should disable checkbox when transaction is auto-skipped duplicate', () => {
    const mockTransaction = createMockTransaction();
    const duplicateStatus = {
      hasDuplicates: true,
      autoSkip: true,
    };

    const { getByRole } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={duplicateStatus}
        selected={false}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.disabled).toBe(true);
  });

  it('should show category suggestion when provided', () => {
    const mockTransaction = createMockTransaction();
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.85,
    };

    const { getByTestId } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={suggestion}
        duplicateStatus={null}
        selected={true}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(getByTestId('category-suggestion')).toBeTruthy();
  });

  it('should not show category suggestion when category is manually selected', () => {
    const mockTransaction = createMockTransaction();
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.85,
    };

    const { queryByTestId } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={suggestion}
        duplicateStatus={null}
        selected={true}
        selectedCategory="groceries"
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(queryByTestId('category-suggestion')).toBeFalsy();
  });

  it('should show duplicate warning when duplicate exists', () => {
    const mockTransaction = createMockTransaction();
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 2,
      highestConfidence: 0.85,
    };

    const { getByTestId } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={duplicateStatus}
        selected={true}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(getByTestId('duplicate-warning')).toBeTruthy();
  });

  it('should not show duplicate warning when no duplicates', () => {
    const mockTransaction = createMockTransaction();

    const { queryByTestId } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={null}
        selected={true}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    expect(queryByTestId('duplicate-warning')).toBeFalsy();
  });

  it('should apply excluded styling when not selected', () => {
    const mockTransaction = createMockTransaction();

    const { getByTestId } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={null}
        selected={false}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const card = getByTestId('transaction-item-card');
    expect(card.props.style).toContainEqual({ opacity: 0.5 });
  });

  it('should apply excluded styling when auto-skip duplicate', () => {
    const mockTransaction = createMockTransaction();
    const duplicateStatus = {
      hasDuplicates: true,
      autoSkip: true,
    };

    const { getByTestId } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={duplicateStatus}
        selected={true}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const card = getByTestId('transaction-item-card');
    expect(card.props.style).toContainEqual({ opacity: 0.5 });
  });

  it('should default to selected when selected prop is not provided', () => {
    const mockTransaction = createMockTransaction();

    const { getByRole } = render(
      <TransactionPreviewItem
        transaction={mockTransaction}
        suggestion={null}
        duplicateStatus={null}
        selectedCategory={null}
        onToggleSelect={mockOnToggleSelect}
        onCategoryChange={mockOnCategoryChange}
      />
    );

    const checkbox = getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(true);
  });
});
