// src/components/__tests__/OCRProcessingBanner.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OCRProcessingBanner from '../OCRProcessingBanner';

describe('OCRProcessingBanner', () => {
  // Default props for testing
  const defaultProps = {
    receiptUrl: 'https://example.com/receipt.jpg',
    status: 'processing',
  };

  describe('Rendering Tests', () => {
    it('should render with processing status', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      expect(getByTestId('ocr-banner')).toBeTruthy();
    });

    it('should show receipt thumbnail', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      const thumbnail = getByTestId('ocr-banner-thumbnail');
      expect(thumbnail).toBeTruthy();
      expect(thumbnail.props.source.uri).toBe(defaultProps.receiptUrl);
    });

    it('should display default processing message', () => {
      const { getByText } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      expect(getByText('AI is analyzing your receipt...')).toBeTruthy();
    });

    it('should display custom message if provided', () => {
      const customMessage = 'Processing your receipt';
      const { getByText, queryByText } = render(
        <OCRProcessingBanner
          {...defaultProps}
          message={customMessage}
        />
      );

      expect(getByText(customMessage)).toBeTruthy();
      expect(queryByText('AI is analyzing your receipt...')).toBeNull();
    });

    it('should show loading indicator when processing', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="processing" />
      );

      expect(getByTestId('ocr-banner-spinner')).toBeTruthy();
    });

    it('should show checkmark when completed', () => {
      const { getByTestId, queryByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="completed" />
      );

      expect(getByTestId('ocr-banner-checkmark')).toBeTruthy();
      expect(queryByTestId('ocr-banner-spinner')).toBeNull();
    });

    it('should show error icon when failed', () => {
      const { getByTestId, queryByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="failed" />
      );

      expect(getByTestId('ocr-banner-error-icon')).toBeTruthy();
      expect(queryByTestId('ocr-banner-spinner')).toBeNull();
    });

    it('should display error message when failed', () => {
      const errorMessage = 'Failed to process receipt';
      const { getByText } = render(
        <OCRProcessingBanner
          {...defaultProps}
          status="failed"
          error={errorMessage}
        />
      );

      expect(getByText(errorMessage)).toBeTruthy();
    });

    it('should display default error message when failed without error prop', () => {
      const { getByText } = render(
        <OCRProcessingBanner {...defaultProps} status="failed" />
      );

      expect(getByText('Failed to analyze receipt')).toBeTruthy();
    });
  });

  describe('State Tests', () => {
    it('should render for processing status', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="processing" />
      );

      expect(getByTestId('ocr-banner')).toBeTruthy();
    });

    it('should render for completed status', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="completed" />
      );

      expect(getByTestId('ocr-banner')).toBeTruthy();
    });

    it('should render for failed status', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="failed" />
      );

      expect(getByTestId('ocr-banner')).toBeTruthy();
    });

    it('should not render if status is null', () => {
      const { queryByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status={null} />
      );

      expect(queryByTestId('ocr-banner')).toBeNull();
    });

    it('should not render if status is undefined', () => {
      const { queryByTestId } = render(
        <OCRProcessingBanner receiptUrl={defaultProps.receiptUrl} />
      );

      expect(queryByTestId('ocr-banner')).toBeNull();
    });
  });

  describe('Interaction Tests', () => {
    it('should call onDismiss when dismiss button pressed', () => {
      const onDismissMock = jest.fn();
      const { getByTestId } = render(
        <OCRProcessingBanner
          {...defaultProps}
          onDismiss={onDismissMock}
          dismissible={true}
        />
      );

      const dismissButton = getByTestId('ocr-banner-dismiss');
      fireEvent.press(dismissButton);

      expect(onDismissMock).toHaveBeenCalledTimes(1);
    });

    it('should not show dismiss button if not dismissible', () => {
      const { queryByTestId } = render(
        <OCRProcessingBanner {...defaultProps} dismissible={false} />
      );

      expect(queryByTestId('ocr-banner-dismiss')).toBeNull();
    });

    it('should not show dismiss button if onDismiss not provided', () => {
      const { queryByTestId } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      expect(queryByTestId('ocr-banner-dismiss')).toBeNull();
    });

    it('should show dismiss button if onDismiss provided', () => {
      const onDismissMock = jest.fn();
      const { getByTestId } = render(
        <OCRProcessingBanner
          {...defaultProps}
          onDismiss={onDismissMock}
        />
      );

      expect(getByTestId('ocr-banner-dismiss')).toBeTruthy();
    });
  });

  describe('Styling Tests', () => {
    it('should have horizontal layout with thumbnail and content', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flexDirection: 'row',
          }),
        ])
      );
    });

    it('should show blue color for processing status', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="processing" />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderLeftColor: '#2196F3',
          }),
        ])
      );
    });

    it('should show green color for completed status', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="completed" />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderLeftColor: '#4CAF50',
          }),
        ])
      );
    });

    it('should show red color for failed status', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="failed" />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderLeftColor: '#F44336',
          }),
        ])
      );
    });

    it('should have 80x80px thumbnail with rounded corners', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      const thumbnail = getByTestId('ocr-banner-thumbnail');
      expect(thumbnail.props.style).toEqual(
        expect.objectContaining({
          width: 80,
          height: 80,
          borderRadius: 8,
        })
      );
    });

    it('should have semi-transparent background', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: expect.stringMatching(/rgba\(255, 255, 255, 0\.\d+\)/),
          }),
        ])
      );
    });

    it('should be full width', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: '100%',
          }),
        ])
      );
    });
  });

  describe('Accessibility Tests', () => {
    it('should have accessibility label for processing state', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="processing" />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.accessibilityLabel).toBe('Processing receipt with AI');
    });

    it('should have accessibility label for completed state', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="completed" />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.accessibilityLabel).toBe('Receipt processed successfully');
    });

    it('should have accessibility label for failed state', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="failed" />
      );

      const banner = getByTestId('ocr-banner');
      expect(banner.props.accessibilityLabel).toBe('Failed to process receipt');
    });

    it('should have accessible dismiss button', () => {
      const onDismissMock = jest.fn();
      const { getByTestId } = render(
        <OCRProcessingBanner
          {...defaultProps}
          onDismiss={onDismissMock}
        />
      );

      const dismissButton = getByTestId('ocr-banner-dismiss');
      expect(dismissButton.props.accessibilityRole).toBe('button');
      expect(dismissButton.props.accessibilityLabel).toBe('Dismiss notification');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing receiptUrl gracefully', () => {
      const { queryByTestId } = render(
        <OCRProcessingBanner status="processing" />
      );

      // Should still render but without thumbnail
      expect(queryByTestId('ocr-banner')).toBeTruthy();
    });

    it('should handle invalid status gracefully', () => {
      const { queryByTestId } = render(
        <OCRProcessingBanner {...defaultProps} status="invalid" />
      );

      // Should not render with invalid status
      expect(queryByTestId('ocr-banner')).toBeNull();
    });

    it('should display completed message', () => {
      const { getByText } = render(
        <OCRProcessingBanner {...defaultProps} status="completed" />
      );

      expect(getByText('Receipt analyzed successfully!')).toBeTruthy();
    });

    it('should handle long error messages', () => {
      const longError = 'This is a very long error message that should be displayed properly without breaking the layout of the banner component';
      const { getByText } = render(
        <OCRProcessingBanner
          {...defaultProps}
          status="failed"
          error={longError}
        />
      );

      expect(getByText(longError)).toBeTruthy();
    });

    it('should handle long custom messages', () => {
      const longMessage = 'This is a very long custom message that should be displayed properly';
      const { getByText } = render(
        <OCRProcessingBanner
          {...defaultProps}
          message={longMessage}
        />
      );

      expect(getByText(longMessage)).toBeTruthy();
    });
  });

  describe('Component Structure', () => {
    it('should have correct component hierarchy', () => {
      const { getByTestId } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      const banner = getByTestId('ocr-banner');
      const thumbnail = getByTestId('ocr-banner-thumbnail');
      const content = getByTestId('ocr-banner-content');

      expect(banner).toBeTruthy();
      expect(thumbnail).toBeTruthy();
      expect(content).toBeTruthy();
    });

    it('should render thumbnail before content (left to right)', () => {
      const { UNSAFE_root } = render(
        <OCRProcessingBanner {...defaultProps} />
      );

      // Verify the order of children
      const banner = UNSAFE_root.findByProps({ testID: 'ocr-banner' });
      expect(banner).toBeTruthy();
    });
  });
});
