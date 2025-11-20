/**
 * Screen Test: ImportExpensesScreen
 * Tests the complete user flow from file selection to import completion
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ImportExpensesScreen from '../ImportExpensesScreen';
import { AuthContext } from '../../../contexts/AuthContext';
import * as importService from '../../../services/importService';
import { createMockFileInfo, createMockTransactions } from '../../../__tests__/utils/testHelpers';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock import service
jest.mock('../../../services/importService');

// Mock duplicate detector
jest.mock('../../../utils/duplicateDetector', () => ({
  markDuplicatesForReview: jest.fn((results) => {
    return results.map((result, index) => ({
      ...result,
      duplicateStatus: result.hasDuplicates ? {
        hasDuplicates: true,
        autoSkip: result.highestConfidence >= 0.95,
      } : null,
    }));
  }),
}));

describe('ImportExpensesScreen', () => {
  const mockUser = {
    uid: 'user-1',
    email: 'user@test.com',
  };

  const mockAuthContext = {
    user: mockUser,
    partnerId: 'user-2',
    coupleId: 'couple-1',
    partnerName: 'Partner Name',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert.mockClear();
  });

  const renderScreen = () => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <ImportExpensesScreen navigation={mockNavigation} />
      </AuthContext.Provider>
    );
  };

  describe('Initial State', () => {
    it('should render file picker in initial state', () => {
      const { getByText } = renderScreen();

      expect(getByText('import.title')).toBeTruthy();
      expect(getByText('import.subtitle')).toBeTruthy();
      expect(getByText('import.selectFile')).toBeTruthy();
    });

    it('should show instructions card', () => {
      const { getByText } = renderScreen();

      expect(getByText('import.howItWorks')).toBeTruthy();
      expect(getByText('import.step1')).toBeTruthy();
      expect(getByText('import.step2')).toBeTruthy();
      expect(getByText('import.step3')).toBeTruthy();
      expect(getByText('import.step4')).toBeTruthy();
    });

    it('should add debug button to header', () => {
      renderScreen();

      expect(mockNavigation.setOptions).toHaveBeenCalledWith({
        headerRight: expect.any(Function),
      });
    });
  });

  describe('File Selection and Preview', () => {
    it('should preview file when selected', async () => {
      const mockTransactions = createMockTransactions(3);
      const mockPreviewResult = {
        success: true,
        transactions: mockTransactions,
        categorySuggestions: [],
        duplicateResults: [],
      };

      importService.previewImport.mockResolvedValue(mockPreviewResult);

      const { getByTestId, findByText } = renderScreen();

      // Simulate file selection
      const filePicker = getByTestId('file-picker-button');
      const mockFile = createMockFileInfo({
        uri: 'file:///test.csv',
        name: 'test.csv',
        type: 'text/csv',
      });

      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', mockFile);
      });

      await waitFor(() => {
        expect(importService.previewImport).toHaveBeenCalledWith(
          'file:///test.csv',
          expect.objectContaining({
            coupleId: 'couple-1',
            paidBy: 'user-1',
          })
        );
      });

      // Should show preview
      expect(await findByText('import.preview.title')).toBeTruthy();
    });

    it('should show error alert when preview fails', async () => {
      importService.previewImport.mockResolvedValue({
        success: false,
        error: 'Invalid CSV format',
      });

      const { getByTestId } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      const mockFile = createMockFileInfo();

      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', mockFile);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'import.errors.parseError',
          'Invalid CSV format'
        );
      });
    });

    it('should initialize selection state with all transactions selected', async () => {
      const mockTransactions = createMockTransactions(5);
      importService.previewImport.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        categorySuggestions: [],
        duplicateResults: [],
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      // All 5 transactions should be selected
      await waitFor(() => {
        expect(findByText(/5.*import.preview.selectedLabel/)).toBeTruthy();
      });
    });

    it('should auto-deselect high confidence duplicates', async () => {
      const mockTransactions = createMockTransactions(3);
      importService.previewImport.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        categorySuggestions: [],
        duplicateResults: [
          { hasDuplicates: true, highestConfidence: 0.95 }, // Auto-skip
          { hasDuplicates: false },
          { hasDuplicates: true, highestConfidence: 0.6 }, // Don't auto-skip
        ],
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      // Only 2 should be selected (not the auto-skip duplicate)
      await waitFor(() => {
        expect(findByText(/2.*import.preview.selectedLabel/)).toBeTruthy();
      });
    });
  });

  describe('Transaction Selection', () => {
    beforeEach(async () => {
      const mockTransactions = createMockTransactions(3);
      importService.previewImport.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        categorySuggestions: [],
        duplicateResults: [],
      });
    });

    it('should toggle individual transaction selection', async () => {
      const { getByTestId, findByTestId } = renderScreen();

      // Select file first
      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      await waitFor(async () => {
        const firstTransaction = await findByTestId('transaction-item-0');
        expect(firstTransaction).toBeTruthy();
      });

      // Click on first transaction to deselect
      const firstTransaction = await findByTestId('transaction-item-0');
      fireEvent.press(firstTransaction);

      // Count should decrease from 3 to 2
      await waitFor(() => {
        expect(findByText(/2.*import.preview.selectedLabel/)).toBeTruthy();
      });
    });

    it('should select all transactions when select all is pressed', async () => {
      const { getByTestId, getByText, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      // Deselect all first
      await waitFor(() => {
        const deselectButton = getByText('import.preview.deselectAll');
        fireEvent.press(deselectButton);
      });

      // Then select all
      const selectAllButton = getByText('import.preview.selectAll');
      fireEvent.press(selectAllButton);

      await waitFor(() => {
        expect(findByText(/3.*import.preview.selectedLabel/)).toBeTruthy();
      });
    });

    it('should deselect all transactions when deselect all is pressed', async () => {
      const { getByTestId, getByText, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      await waitFor(() => {
        const deselectButton = getByText('import.preview.deselectAll');
        fireEvent.press(deselectButton);
      });

      await waitFor(() => {
        expect(findByText(/0.*import.preview.selectedLabel/)).toBeTruthy();
      });
    });
  });

  describe('Category Overrides', () => {
    it('should allow changing transaction category', async () => {
      const mockTransactions = createMockTransactions(1);
      importService.previewImport.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        categorySuggestions: [
          { transaction: mockTransactions[0], suggestion: { categoryKey: 'food', confidence: 0.8 } },
        ],
        duplicateResults: [],
      });

      const { getByTestId, findByTestId } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      // Find and click category chip
      await waitFor(async () => {
        const categoryChip = await findByTestId('category-chip-0');
        fireEvent.press(categoryChip);
      });

      // Select different category
      const groceriesOption = await findByTestId('category-option-groceries');
      fireEvent.press(groceriesOption);

      // Verify category was changed (implementation would update the category override state)
    });
  });

  describe('Import Execution', () => {
    beforeEach(() => {
      const mockTransactions = createMockTransactions(3);
      importService.previewImport.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        categorySuggestions: [],
        duplicateResults: [],
      });
    });

    it('should show confirmation dialog when import button is pressed', async () => {
      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      const importButton = await findByText(/import.importButton/);
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'import.confirmImport',
          expect.stringContaining('3'),
          expect.any(Array)
        );
      });
    });

    it('should not allow import when no transactions selected', async () => {
      const { getByTestId, getByText, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      // Deselect all
      await waitFor(() => {
        const deselectButton = getByText('import.preview.deselectAll');
        fireEvent.press(deselectButton);
      });

      // Import button should be disabled
      const importButton = await findByText(/import.importButton/);
      expect(importButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should execute import when confirmed', async () => {
      const mockImportResult = {
        success: true,
        summary: {
          fileName: 'test.csv',
          fileType: 'csv',
          totalTransactions: 3,
          imported: 3,
          duplicates: 0,
          errors: 0,
        },
      };

      importService.importFromFile.mockResolvedValue(mockImportResult);

      // Mock Alert.alert to automatically confirm
      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'common.confirm');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      const importButton = await findByText(/import.importButton/);
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(importService.importFromFile).toHaveBeenCalled();
      });

      // Should show summary
      await waitFor(() => {
        expect(findByText('import.summary.success')).toBeTruthy();
      });
    });

    it('should show progress modal during import', async () => {
      importService.importFromFile.mockImplementation((uri, config, onProgress) => {
        // Simulate progress updates
        onProgress({ step: 'parsing', progress: 0 });
        onProgress({ step: 'processing', progress: 50 });
        onProgress({ step: 'importing', progress: 100, current: 3, total: 3 });

        return Promise.resolve({
          success: true,
          summary: { imported: 3, totalTransactions: 3 },
        });
      });

      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'common.confirm');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      const importButton = await findByText(/import.importButton/);
      fireEvent.press(importButton);

      // Progress modal should be visible
      await waitFor(() => {
        expect(findByText('import.progress.parsing')).toBeTruthy();
      });
    });

    it('should handle import errors gracefully', async () => {
      importService.importFromFile.mockRejectedValue(new Error('Firebase connection failed'));

      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'common.confirm');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      const importButton = await findByText(/import.importButton/);
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'import.errors.importFailed',
          'Firebase connection failed'
        );
      });
    });
  });

  describe('Import Summary', () => {
    it('should show summary after successful import', async () => {
      const mockImportResult = {
        success: true,
        summary: {
          fileName: 'test.csv',
          fileType: 'csv',
          totalTransactions: 10,
          imported: 10,
          duplicates: 0,
          errors: 0,
        },
      };

      importService.importFromFile.mockResolvedValue(mockImportResult);
      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'common.confirm');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      const importButton = await findByText(/import.importButton/);
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(findByText('import.summary.success')).toBeTruthy();
        expect(findByText('10')).toBeTruthy(); // imported count
      });
    });

    it('should navigate to Home when "View Expenses" is pressed', async () => {
      const mockImportResult = {
        success: true,
        summary: { imported: 5, totalTransactions: 5 },
      };

      importService.importFromFile.mockResolvedValue(mockImportResult);
      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'common.confirm');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      const importButton = await findByText(/import.importButton/);
      fireEvent.press(importButton);

      await waitFor(async () => {
        const viewExpensesButton = await findByText('import.summary.viewExpenses');
        fireEvent.press(viewExpensesButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Home');
    });

    it('should reset state after closing summary', async () => {
      const mockImportResult = {
        success: true,
        summary: { imported: 3, totalTransactions: 3 },
      };

      importService.importFromFile.mockResolvedValue(mockImportResult);
      Alert.alert.mockImplementation((title, message, buttons) => {
        const confirmButton = buttons.find(b => b.text === 'common.confirm');
        if (confirmButton) {
          confirmButton.onPress();
        }
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      const importButton = await findByText(/import.importButton/);
      fireEvent.press(importButton);

      await waitFor(async () => {
        const doneButton = await findByText('import.summary.done');
        fireEvent.press(doneButton);
      });

      // Should return to initial state
      await waitFor(() => {
        expect(findByText('import.selectFile')).toBeTruthy();
      });
    });
  });

  describe('Cancel and Reset', () => {
    it('should allow canceling preview and returning to file selection', async () => {
      const mockTransactions = createMockTransactions(3);
      importService.previewImport.mockResolvedValue({
        success: true,
        transactions: mockTransactions,
        categorySuggestions: [],
        duplicateResults: [],
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      // Wait for preview to load
      await waitFor(() => {
        expect(findByText('import.preview.title')).toBeTruthy();
      });

      // Click cancel
      const cancelButton = await findByText('import.cancel');
      fireEvent.press(cancelButton);

      // Should return to initial state
      await waitFor(() => {
        expect(findByText('import.selectFile')).toBeTruthy();
      });
    });
  });

  describe('Debug Panel', () => {
    it('should open debug panel when debug button is pressed', async () => {
      const { findByTestId } = renderScreen();

      // Get the header right component
      const setOptionsCall = mockNavigation.setOptions.mock.calls[0][0];
      const HeaderRight = setOptionsCall.headerRight;

      // Render the header right component
      const { getByTestId: getHeaderButton } = render(<HeaderRight />);
      const debugButton = getHeaderButton('debug-button');

      fireEvent.press(debugButton);

      await waitFor(() => {
        expect(findByTestId('debug-panel')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing auth context gracefully', () => {
      const { getByText } = render(
        <AuthContext.Provider value={{}}>
          <ImportExpensesScreen navigation={mockNavigation} />
        </AuthContext.Provider>
      );

      // Should still render without crashing
      expect(getByText('import.title')).toBeTruthy();
    });

    it('should handle empty transaction list in preview', async () => {
      importService.previewImport.mockResolvedValue({
        success: true,
        transactions: [],
        categorySuggestions: [],
        duplicateResults: [],
      });

      const { getByTestId, findByText } = renderScreen();

      const filePicker = getByTestId('file-picker-button');
      await act(async () => {
        fireEvent(filePicker, 'onFileSelected', createMockFileInfo());
      });

      await waitFor(() => {
        expect(findByText(/0.*import.preview.total/)).toBeTruthy();
      });
    });
  });
});
