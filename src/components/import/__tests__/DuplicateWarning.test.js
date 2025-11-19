/**
 * Tests for DuplicateWarning Component
 * Display duplicate warning for a transaction with severity levels
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DuplicateWarning from '../DuplicateWarning';

describe('DuplicateWarning', () => {
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when duplicateStatus is not provided', () => {
    const { container } = render(
      <DuplicateWarning duplicateStatus={null} onViewDetails={mockOnViewDetails} />
    );

    expect(container.children.length).toBe(0);
  });

  it('should return null when hasDuplicates is false', () => {
    const duplicateStatus = {
      hasDuplicates: false,
    };

    const { container } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    expect(container.children.length).toBe(0);
  });

  it('should display warning when duplicates exist', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.6,
      needsReview: true,
      autoSkip: false,
    };

    const { getByText } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    expect(getByText(/import.preview.duplicate/)).toBeTruthy();
  });

  it('should show "will skip" text for auto-skip duplicates', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.95,
      needsReview: false,
      autoSkip: true,
    };

    const { getByText } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    expect(getByText('import.preview.duplicateWillSkip')).toBeTruthy();
  });

  it('should show "likely duplicate" text for high confidence', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.75,
      needsReview: true,
      autoSkip: false,
    };

    const { getByText } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    expect(getByText('import.preview.duplicateLikely')).toBeTruthy();
  });

  it('should show "possible duplicate" text for low confidence', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.5,
      needsReview: true,
      autoSkip: false,
    };

    const { getByText } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    expect(getByText('import.preview.duplicatePossible')).toBeTruthy();
  });

  it('should use error color for auto-skip duplicates', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.95,
      needsReview: false,
      autoSkip: true,
    };

    const { getByTestId } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    const chip = getByTestId('duplicate-warning-chip');
    expect(chip.props.style).toContainEqual(
      expect.objectContaining({
        backgroundColor: expect.stringContaining('error'),
      })
    );
  });

  it('should use warning color for likely duplicates', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.75,
      needsReview: true,
      autoSkip: false,
    };

    const { getByTestId } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    const chip = getByTestId('duplicate-warning-chip');
    expect(chip.props.style).toContainEqual(
      expect.objectContaining({
        backgroundColor: expect.stringContaining('warning'),
      })
    );
  });

  it('should use orange color for possible duplicates', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.5,
      needsReview: true,
      autoSkip: false,
    };

    const { getByTestId } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    const chip = getByTestId('duplicate-warning-chip');
    expect(chip.props.style).toContainEqual(
      expect.objectContaining({
        backgroundColor: expect.stringContaining('#FFA726'),
      })
    );
  });

  it('should show duplicate count when more than one duplicate', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 3,
      highestConfidence: 0.75,
      needsReview: true,
      autoSkip: false,
    };

    const { getByText } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    expect(getByText(/import.preview.duplicateMatches/)).toBeTruthy();
  });

  it('should not show duplicate count when only one duplicate', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.75,
      needsReview: true,
      autoSkip: false,
    };

    const { queryByText } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    expect(queryByText(/import.preview.duplicateMatches/)).toBeFalsy();
  });

  it('should show info button when onViewDetails is provided', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.75,
      needsReview: true,
      autoSkip: false,
    };

    const { getByTestId } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    expect(getByTestId('info-button')).toBeTruthy();
  });

  it('should not show info button when onViewDetails is not provided', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.75,
      needsReview: true,
      autoSkip: false,
    };

    const { queryByTestId } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} />
    );

    expect(queryByTestId('info-button')).toBeFalsy();
  });

  it('should call onViewDetails when info button is pressed', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 2,
      highestConfidence: 0.75,
      needsReview: true,
      autoSkip: false,
    };

    const { getByTestId } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    const infoButton = getByTestId('info-button');
    fireEvent.press(infoButton);

    expect(mockOnViewDetails).toHaveBeenCalled();
  });

  it('should handle exact threshold values correctly', () => {
    // Test highestConfidence = 0.7 (should be medium)
    const { getByText: getByText1 } = render(
      <DuplicateWarning
        duplicateStatus={{
          hasDuplicates: true,
          duplicateCount: 1,
          highestConfidence: 0.7,
          autoSkip: false,
        }}
      />
    );
    expect(getByText1('import.preview.duplicateLikely')).toBeTruthy();

    // Test highestConfidence < 0.7 (should be low)
    const { getByText: getByText2 } = render(
      <DuplicateWarning
        duplicateStatus={{
          hasDuplicates: true,
          duplicateCount: 1,
          highestConfidence: 0.69,
          autoSkip: false,
        }}
      />
    );
    expect(getByText2('import.preview.duplicatePossible')).toBeTruthy();
  });

  it('should display alert icon in chip', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 1,
      highestConfidence: 0.75,
      needsReview: true,
      autoSkip: false,
    };

    const { getByTestId } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    const chip = getByTestId('duplicate-warning-chip');
    expect(chip.props.icon).toBe('alert-circle');
  });

  it('should support i18n for all text', () => {
    const duplicateStatus = {
      hasDuplicates: true,
      duplicateCount: 3,
      highestConfidence: 0.95,
      needsReview: false,
      autoSkip: true,
    };

    const { getByText } = render(
      <DuplicateWarning duplicateStatus={duplicateStatus} onViewDetails={mockOnViewDetails} />
    );

    // All text should use translation keys
    expect(getByText('import.preview.duplicateWillSkip')).toBeTruthy();
    expect(getByText(/import.preview.duplicateMatches/)).toBeTruthy();
  });
});
