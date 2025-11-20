/**
 * Tests for ImportProgressModal Component
 * Modal showing import progress with activity indicator and progress bar
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ImportProgressModal from '../ImportProgressModal';

describe('ImportProgressModal', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'parsing' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('import.progress.parsing')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { queryByText } = render(
      <ImportProgressModal
        visible={false}
        progress={{ step: 'parsing' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(queryByText('import.progress.parsing')).toBeFalsy();
  });

  it('should display parsing step text', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'parsing' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('import.progress.parsing')).toBeTruthy();
  });

  it('should display checking duplicates step text', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'checking_duplicates' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('import.progress.processing')).toBeTruthy();
  });

  it('should display processing step text', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'processing' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('import.progress.processing')).toBeTruthy();
  });

  it('should display importing step text', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'importing' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('import.progress.importing')).toBeTruthy();
  });

  it('should show indeterminate progress bar when not importing', () => {
    const { getByTestId } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'parsing' }}
        onDismiss={mockOnDismiss}
      />
    );

    const progressBar = getByTestId('progress-bar-indeterminate');
    expect(progressBar.props.indeterminate).toBe(true);
  });

  it('should show determinate progress bar during import with total', () => {
    const { getByTestId } = render(
      <ImportProgressModal
        visible={true}
        progress={{
          step: 'importing',
          progress: 50,
          current: 50,
          total: 100,
        }}
        onDismiss={mockOnDismiss}
      />
    );

    const progressBar = getByTestId('progress-bar-determinate');
    expect(progressBar.props.progress).toBe(0.5); // 50/100
  });

  it('should display progress text during import', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{
          step: 'importing',
          progress: 50,
          current: 50,
          total: 100,
        }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText(/50.*\/.*100/)).toBeTruthy();
  });

  it('should not show progress text when not importing', () => {
    const { queryByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'parsing' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(queryByText(/\/.*import.progress.almostDone/)).toBeFalsy();
  });

  it('should show activity indicator', () => {
    const { getByTestId } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'parsing' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('should be non-dismissable', () => {
    const { getByTestId } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'parsing' }}
        onDismiss={mockOnDismiss}
      />
    );

    const modal = getByTestId('import-progress-modal');
    expect(modal.props.dismissable).toBe(false);
  });

  it('should display default processing text when step is unknown', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{ step: 'unknown_step' }}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('import.progress.processing')).toBeTruthy();
  });

  it('should display default processing text when step is not provided', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{}}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('import.progress.processing')).toBeTruthy();
  });

  it('should handle null progress gracefully', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={null}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('import.progress.processing')).toBeTruthy();
  });

  it('should calculate progress percentage correctly', () => {
    const { getByTestId } = render(
      <ImportProgressModal
        visible={true}
        progress={{
          step: 'importing',
          progress: 75,
          current: 75,
          total: 100,
        }}
        onDismiss={mockOnDismiss}
      />
    );

    const progressBar = getByTestId('progress-bar-determinate');
    expect(progressBar.props.progress).toBe(0.75); // 75%
  });

  it('should show 0 progress when progress is 0', () => {
    const { getByTestId } = render(
      <ImportProgressModal
        visible={true}
        progress={{
          step: 'importing',
          progress: 0,
          current: 0,
          total: 100,
        }}
        onDismiss={mockOnDismiss}
      />
    );

    const progressBar = getByTestId('progress-bar-determinate');
    expect(progressBar.props.progress).toBe(0);
  });

  it('should support i18n for all text', () => {
    const { getByText } = render(
      <ImportProgressModal
        visible={true}
        progress={{
          step: 'importing',
          progress: 50,
          current: 50,
          total: 100,
        }}
        onDismiss={mockOnDismiss}
      />
    );

    // All text should use translation keys
    expect(getByText('import.progress.importing')).toBeTruthy();
    expect(getByText('import.progress.almostDone')).toBeTruthy();
  });
});
