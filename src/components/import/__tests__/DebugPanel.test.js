/**
 * Tests for DebugPanel Component
 * Debug panel for troubleshooting import issues with logs and statistics
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DebugPanel from '../DebugPanel';
import * as importDebug from '../../../utils/importDebug';
import * as importSession from '../../../utils/importSession';
import { Alert, Share } from 'react-native';

// Mock the debug utilities
jest.mock('../../../utils/importDebug');
jest.mock('../../../utils/importSession');

describe('DebugPanel', () => {
  const mockOnDismiss = jest.fn();
  const mockUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    importDebug.isDebugMode.mockReturnValue(false);
    importDebug.getLogs.mockResolvedValue([]);
    importDebug.getDebugSummary.mockResolvedValue({
      totalLogs: 0,
      errors: 0,
      warnings: 0,
      recentErrors: [],
    });
    importDebug.clearLogs.mockResolvedValue(undefined);
    importDebug.exportLogsAsText.mockResolvedValue('Log export text');
    importSession.getSessionStats.mockResolvedValue(null);

    // Mock Alert
    Alert.alert = jest.fn();

    // Mock Share
    Share.share = jest.fn().mockResolvedValue({ action: 'sharedAction' });
  });

  it('should not load data when not visible', () => {
    render(<DebugPanel visible={false} onDismiss={mockOnDismiss} userId={mockUserId} />);

    expect(importDebug.getLogs).not.toHaveBeenCalled();
    expect(importDebug.getDebugSummary).not.toHaveBeenCalled();
  });

  it('should load data when visible', async () => {
    render(<DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />);

    await waitFor(() => {
      expect(importDebug.getLogs).toHaveBeenCalled();
      expect(importDebug.getDebugSummary).toHaveBeenCalled();
      expect(importSession.getSessionStats).toHaveBeenCalledWith(mockUserId);
    });
  });

  it('should display debug mode toggle', async () => {
    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.debugMode')).toBeTruthy();
    });
  });

  it('should toggle debug mode when switch is pressed', async () => {
    importDebug.isDebugMode.mockReturnValue(false);

    const { getByRole } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      const toggle = getByRole('switch');
      expect(toggle).toBeTruthy();
    });

    const toggle = getByRole('switch');
    fireEvent(toggle, 'onValueChange', true);

    expect(importDebug.setDebugMode).toHaveBeenCalledWith(true);
  });

  it('should display summary statistics', async () => {
    importDebug.getDebugSummary.mockResolvedValue({
      totalLogs: 150,
      errors: 5,
      warnings: 10,
      recentErrors: [],
    });

    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('150')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByText('10')).toBeTruthy();
    });
  });

  it('should display session statistics when available', async () => {
    importSession.getSessionStats.mockResolvedValue({
      total: 20,
      completed: 18,
      failed: 2,
      totalImported: 500,
      averageImportSize: 25,
    });

    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('20')).toBeTruthy();
      expect(getByText('18')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('500')).toBeTruthy();
      expect(getByText('25')).toBeTruthy();
    });
  });

  it('should display log level filter chips', async () => {
    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('ERROR')).toBeTruthy();
      expect(getByText('WARN')).toBeTruthy();
      expect(getByText('INFO')).toBeTruthy();
      expect(getByText('PERF')).toBeTruthy();
    });
  });

  it('should filter logs by level when chip is pressed', async () => {
    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('ERROR')).toBeTruthy();
    });

    const errorChip = getByText('ERROR');
    fireEvent.press(errorChip);

    await waitFor(() => {
      expect(importDebug.getLogs).toHaveBeenCalledWith({ level: 'ERROR' });
    });
  });

  it('should display logs list', async () => {
    const mockLogs = [
      {
        level: 'INFO',
        category: 'PARSER',
        message: 'Parsing started',
        timestamp: new Date('2024-01-15T10:00:00').toISOString(),
        data: { fileName: 'statement.csv' },
      },
      {
        level: 'ERROR',
        category: 'IMPORT',
        message: 'Import failed',
        timestamp: new Date('2024-01-15T10:05:00').toISOString(),
      },
    ];

    importDebug.getLogs.mockResolvedValue(mockLogs);

    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('Parsing started')).toBeTruthy();
      expect(getByText('Import failed')).toBeTruthy();
      expect(getByText('PARSER')).toBeTruthy();
      expect(getByText('IMPORT')).toBeTruthy();
    });
  });

  it('should show no logs message when logs are empty', async () => {
    importDebug.getLogs.mockResolvedValue([]);

    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.noLogs')).toBeTruthy();
    });
  });

  it('should display recent errors when available', async () => {
    importDebug.getDebugSummary.mockResolvedValue({
      totalLogs: 10,
      errors: 2,
      warnings: 0,
      recentErrors: [
        {
          category: 'PARSER',
          message: 'CSV parsing error',
          timestamp: new Date('2024-01-15T10:00:00').toISOString(),
        },
      ],
    });

    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.recentErrors')).toBeTruthy();
      expect(getByText('CSV parsing error')).toBeTruthy();
    });
  });

  it('should show clear logs confirmation dialog', async () => {
    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.clearLogs')).toBeTruthy();
    });

    const clearButton = getByText('import.debug.clearLogs');
    fireEvent.press(clearButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'import.debug.clearLogsTitle',
      'import.debug.clearLogsMessage',
      expect.any(Array)
    );
  });

  it('should clear logs when confirmed', async () => {
    // Mock Alert.alert to immediately call the confirm callback
    Alert.alert = jest.fn((title, message, buttons) => {
      const confirmButton = buttons.find(b => b.style === 'destructive');
      if (confirmButton) {
        confirmButton.onPress();
      }
    });

    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.clearLogs')).toBeTruthy();
    });

    const clearButton = getByText('import.debug.clearLogs');
    fireEvent.press(clearButton);

    await waitFor(() => {
      expect(importDebug.clearLogs).toHaveBeenCalled();
    });
  });

  it('should export logs when export button is pressed', async () => {
    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.export')).toBeTruthy();
    });

    const exportButton = getByText('import.debug.export');
    fireEvent.press(exportButton);

    await waitFor(() => {
      expect(importDebug.exportLogsAsText).toHaveBeenCalled();
      expect(Share.share).toHaveBeenCalledWith({
        message: 'Log export text',
        title: 'import.debug.exportLogsTitle',
      });
    });
  });

  it('should show error alert when export fails', async () => {
    importDebug.exportLogsAsText.mockRejectedValue(new Error('Export failed'));

    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.export')).toBeTruthy();
    });

    const exportButton = getByText('import.debug.export');
    fireEvent.press(exportButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'common.error',
        expect.stringContaining('Export failed')
      );
    });
  });

  it('should refresh data when refresh button is pressed', async () => {
    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.refresh')).toBeTruthy();
    });

    // Clear previous calls
    jest.clearAllMocks();

    const refreshButton = getByText('import.debug.refresh');
    fireEvent.press(refreshButton);

    await waitFor(() => {
      expect(importDebug.getLogs).toHaveBeenCalled();
      expect(importDebug.getDebugSummary).toHaveBeenCalled();
    });
  });

  it('should call onDismiss when close button is pressed', async () => {
    const { getByTestId } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      const closeButton = getByTestId('close-button');
      expect(closeButton).toBeTruthy();
    });

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnDismiss).toHaveBeenCalled();
  });

  it('should limit logs to last 100 entries', async () => {
    const mockLogs = Array.from({ length: 150 }, (_, i) => ({
      level: 'INFO',
      category: 'TEST',
      message: `Log ${i}`,
      timestamp: new Date().toISOString(),
    }));

    importDebug.getLogs.mockResolvedValue(mockLogs);

    const { queryByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(queryByText('Log 99')).toBeTruthy();
    });

    // Logs beyond 100 should not be rendered
    expect(queryByText('Log 149')).toBeFalsy();
  });

  it('should handle missing userId gracefully', async () => {
    render(<DebugPanel visible={true} onDismiss={mockOnDismiss} />);

    await waitFor(() => {
      expect(importSession.getSessionStats).toHaveBeenCalledWith(null);
    });
  });

  it('should handle error loading debug data gracefully', async () => {
    importDebug.getLogs.mockRejectedValue(new Error('Failed to load logs'));
    console.error = jest.fn(); // Mock console.error to prevent error output

    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load debug data:',
        expect.any(Error)
      );
    });

    // Should still render the UI despite error
    expect(getByText('import.debug.title')).toBeTruthy();
  });

  it('should support i18n for all text', async () => {
    const { getByText } = render(
      <DebugPanel visible={true} onDismiss={mockOnDismiss} userId={mockUserId} />
    );

    await waitFor(() => {
      expect(getByText('import.debug.title')).toBeTruthy();
      expect(getByText('import.debug.subtitle')).toBeTruthy();
      expect(getByText('import.debug.debugMode')).toBeTruthy();
      expect(getByText('import.debug.debugModeDescription')).toBeTruthy();
      expect(getByText('import.debug.summary')).toBeTruthy();
      expect(getByText('import.debug.filterByLevel')).toBeTruthy();
      expect(getByText('import.debug.clearLogs')).toBeTruthy();
      expect(getByText('import.debug.export')).toBeTruthy();
      expect(getByText('import.debug.refresh')).toBeTruthy();
    });
  });
});
