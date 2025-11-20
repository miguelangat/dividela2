/**
 * Tests for CategorySuggestion Component
 * Display category suggestion with confidence indicator
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CategorySuggestion from '../CategorySuggestion';

describe('CategorySuggestion', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when suggestion is not provided', () => {
    const { container } = render(
      <CategorySuggestion suggestion={null} onPress={mockOnPress} selected={false} />
    );

    expect(container.children.length).toBe(0);
  });

  it('should render suggestion with category key', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.8,
    };

    const { getByText } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    expect(getByText('food')).toBeTruthy();
  });

  it('should show high confidence indicator for confidence >= 0.7', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.85,
    };

    const { getByText } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    expect(getByText('import.preview.confidenceHigh')).toBeTruthy();
  });

  it('should show medium confidence indicator for confidence >= 0.4', () => {
    const suggestion = {
      categoryKey: 'groceries',
      confidence: 0.55,
    };

    const { getByText } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    expect(getByText('import.preview.confidenceMedium')).toBeTruthy();
  });

  it('should show low confidence indicator for confidence < 0.4', () => {
    const suggestion = {
      categoryKey: 'other',
      confidence: 0.25,
    };

    const { getByText } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    expect(getByText('import.preview.confidenceLow')).toBeTruthy();
  });

  it('should use success color for high confidence', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.9,
    };

    const { getByTestId } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    const confidenceDot = getByTestId('confidence-dot');
    expect(confidenceDot.props.style).toContainEqual({
      backgroundColor: expect.stringContaining('success'),
    });
  });

  it('should use warning color for medium confidence', () => {
    const suggestion = {
      categoryKey: 'groceries',
      confidence: 0.6,
    };

    const { getByTestId } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    const confidenceDot = getByTestId('confidence-dot');
    expect(confidenceDot.props.style).toContainEqual({
      backgroundColor: expect.stringContaining('warning'),
    });
  });

  it('should use error color for low confidence', () => {
    const suggestion = {
      categoryKey: 'other',
      confidence: 0.3,
    };

    const { getByTestId } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    const confidenceDot = getByTestId('confidence-dot');
    expect(confidenceDot.props.style).toContainEqual({
      backgroundColor: expect.stringContaining('error'),
    });
  });

  it('should not show confidence indicator when confidence is 0', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0,
    };

    const { queryByTestId } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    expect(queryByTestId('confidence-dot')).toBeFalsy();
  });

  it('should apply selected styling when selected is true', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.8,
    };

    const { getByTestId } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={true} />
    );

    const chip = getByTestId('category-chip');
    expect(chip.props.selected).toBe(true);
  });

  it('should not apply selected styling when selected is false', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.8,
    };

    const { getByTestId } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    const chip = getByTestId('category-chip');
    expect(chip.props.selected).toBe(false);
  });

  it('should call onPress when chip is pressed', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.8,
    };

    const { getByText } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    const chip = getByText('food');
    fireEvent.press(chip);

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should handle onPress being undefined', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.8,
    };

    const { getByText } = render(
      <CategorySuggestion suggestion={suggestion} selected={false} />
    );

    expect(() => {
      const chip = getByText('food');
      fireEvent.press(chip);
    }).not.toThrow();
  });

  it('should handle exact threshold values correctly', () => {
    // Test confidence = 0.7 (should be high)
    const { getByText: getByText1 } = render(
      <CategorySuggestion
        suggestion={{ categoryKey: 'food', confidence: 0.7 }}
        selected={false}
      />
    );
    expect(getByText1('import.preview.confidenceHigh')).toBeTruthy();

    // Test confidence = 0.4 (should be medium)
    const { getByText: getByText2 } = render(
      <CategorySuggestion
        suggestion={{ categoryKey: 'food', confidence: 0.4 }}
        selected={false}
      />
    );
    expect(getByText2('import.preview.confidenceMedium')).toBeTruthy();
  });

  it('should support i18n for all text', () => {
    const suggestion = {
      categoryKey: 'food',
      confidence: 0.85,
    };

    const { getByText } = render(
      <CategorySuggestion suggestion={suggestion} onPress={mockOnPress} selected={false} />
    );

    // Confidence labels should use translation keys
    expect(getByText('import.preview.confidenceHigh')).toBeTruthy();
  });
});
