// src/components/__tests__/MerchantAliasManager.test.js
// Test suite for MerchantAliasManager component

import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MerchantAliasManager from '../MerchantAliasManager';
import * as merchantAliasService from '../../services/merchantAliasService';

// Mock the service
jest.mock('../../services/merchantAliasService');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MerchantAliasManager', () => {
  const mockCoupleId = 'couple123';
  const mockAliases = [
    {
      id: 'alias1',
      ocrMerchant: 'WHOLE FOODS MKT',
      userAlias: 'Whole Foods Market',
      usageCount: 10,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'alias2',
      ocrMerchant: 'STARBUCKS #1234',
      userAlias: 'Starbucks Coffee',
      usageCount: 5,
      createdAt: new Date('2024-01-02'),
    },
    {
      id: 'alias3',
      ocrMerchant: 'SHELL GAS',
      userAlias: 'Shell Gas Station',
      usageCount: 3,
      createdAt: new Date('2024-01-03'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert.mockClear();
    merchantAliasService.getMerchantAliases.mockResolvedValue(mockAliases);
    merchantAliasService.createMerchantAlias.mockResolvedValue({
      id: 'new-alias',
      ocrMerchant: 'TEST MERCHANT',
      userAlias: 'Test Merchant',
      usageCount: 1,
    });
    merchantAliasService.deleteMerchantAlias.mockResolvedValue();
  });

  describe('Rendering tests', () => {
    it('should render header with title', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Merchant Aliases')).toBeTruthy();
      });
    });

    it('should show "Add New" button', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeTruthy();
      });
    });

    it('should display list of aliases', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('WHOLE FOODS MKT')).toBeTruthy();
        expect(screen.getByText('Whole Foods Market')).toBeTruthy();
        expect(screen.getByText('STARBUCKS #1234')).toBeTruthy();
        expect(screen.getByText('Starbucks Coffee')).toBeTruthy();
      });
    });

    it('should show empty state when no aliases', async () => {
      merchantAliasService.getMerchantAliases.mockResolvedValue([]);

      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('No aliases yet')).toBeTruthy();
        expect(screen.getByText('Create aliases to normalize merchant names')).toBeTruthy();
      });
    });

    it('should display usage count for each alias', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeTruthy();
        expect(screen.getByText('5')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
      });
    });

    it('should show edit/delete buttons for each alias', async () => {
      const { getAllByLabelText } = render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        const editButtons = getAllByLabelText('Edit alias');
        const deleteButtons = getAllByLabelText('Delete alias');
        expect(editButtons.length).toBe(3);
        expect(deleteButtons.length).toBe(3);
      });
    });
  });

  describe('Data loading tests', () => {
    it('should fetch aliases on mount', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(merchantAliasService.getMerchantAliases).toHaveBeenCalledWith(mockCoupleId);
      });
    });

    it('should display aliases from service', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('WHOLE FOODS MKT')).toBeTruthy();
        expect(screen.getByText('Whole Foods Market')).toBeTruthy();
      });
    });

    it('should sort by usage count (highest first)', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        // Service already returns sorted data, just verify order is maintained
        const usageCounts = screen.getAllByTestId('usage-count');
        expect(usageCounts[0].props.children).toBe('10');
        expect(usageCounts[1].props.children).toBe('5');
        expect(usageCounts[2].props.children).toBe('3');
      });
    });

    it('should handle loading state', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeNull();
      });
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Network error');
      merchantAliasService.getMerchantAliases.mockRejectedValue(error);

      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load merchant aliases. Please try again.'
        );
      });
    });
  });

  describe('Interaction tests', () => {
    it('should open create dialog when "Add New" pressed', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeTruthy();
      });

      const addButton = screen.getByText('Add New');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Merchant Alias')).toBeTruthy();
        expect(screen.getByPlaceholderText('OCR Merchant Name')).toBeTruthy();
        expect(screen.getByPlaceholderText('Your Alias')).toBeTruthy();
      });
    });

    it('should open edit dialog when edit button pressed', async () => {
      const { getAllByLabelText } = render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('WHOLE FOODS MKT')).toBeTruthy();
      });

      const editButtons = getAllByLabelText('Edit alias');
      fireEvent.press(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Merchant Alias')).toBeTruthy();
        expect(screen.getByDisplayValue('WHOLE FOODS MKT')).toBeTruthy();
        expect(screen.getByDisplayValue('Whole Foods Market')).toBeTruthy();
      });
    });

    it('should call createMerchantAlias when saving new alias', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeTruthy();
      });

      // Open dialog
      const addButton = screen.getByText('Add New');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('OCR Merchant Name')).toBeTruthy();
      });

      // Fill in form
      const ocrInput = screen.getByPlaceholderText('OCR Merchant Name');
      const aliasInput = screen.getByPlaceholderText('Your Alias');

      fireEvent.changeText(ocrInput, 'TARGET #1234');
      fireEvent.changeText(aliasInput, 'Target');

      // Save
      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(merchantAliasService.createMerchantAlias).toHaveBeenCalledWith(
          'TARGET #1234',
          'Target',
          mockCoupleId
        );
      });
    });

    it('should call deleteMerchantAlias when delete pressed (with confirmation)', async () => {
      const { getAllByLabelText } = render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('SHELL GAS')).toBeTruthy();
      });

      const deleteButtons = getAllByLabelText('Delete alias');
      fireEvent.press(deleteButtons[2]); // Delete last alias

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Delete Alias',
          'Are you sure you want to delete the alias for "SHELL GAS"?',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel' }),
            expect.objectContaining({ text: 'Delete' }),
          ])
        );
      });

      // Simulate user confirming delete
      const deleteCall = Alert.alert.mock.calls[0];
      const deleteAction = deleteCall[2].find(action => action.text === 'Delete');
      await deleteAction.onPress();

      await waitFor(() => {
        expect(merchantAliasService.deleteMerchantAlias).toHaveBeenCalledWith('alias3', mockCoupleId);
      });
    });

    it('should refresh list after create/edit/delete', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(merchantAliasService.getMerchantAliases).toHaveBeenCalledTimes(1);
      });

      // Open and save new alias
      const addButton = screen.getByText('Add New');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('OCR Merchant Name')).toBeTruthy();
      });

      const ocrInput = screen.getByPlaceholderText('OCR Merchant Name');
      const aliasInput = screen.getByPlaceholderText('Your Alias');

      fireEvent.changeText(ocrInput, 'NEW STORE');
      fireEvent.changeText(aliasInput, 'New Store');

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        // Should be called twice: initial load + refresh after create
        expect(merchantAliasService.getMerchantAliases).toHaveBeenCalledTimes(2);
      });
    });

    it('should validate inputs (no empty fields)', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeTruthy();
      });

      // Open dialog
      const addButton = screen.getByText('Add New');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('OCR Merchant Name')).toBeTruthy();
      });

      // Try to save with empty fields
      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Please fill in both fields'
        );
      });

      expect(merchantAliasService.createMerchantAlias).not.toHaveBeenCalled();
    });
  });

  describe('Search/filter tests', () => {
    it('should filter aliases by search term', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('WHOLE FOODS MKT')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search aliases...');
      fireEvent.changeText(searchInput, 'starbucks');

      await waitFor(() => {
        expect(screen.getByText('STARBUCKS #1234')).toBeTruthy();
        expect(screen.queryByText('WHOLE FOODS MKT')).toBeNull();
        expect(screen.queryByText('SHELL GAS')).toBeNull();
      });
    });

    it('should search both original and alias names', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('WHOLE FOODS MKT')).toBeTruthy();
      });

      // Search by alias name
      const searchInput = screen.getByPlaceholderText('Search aliases...');
      fireEvent.changeText(searchInput, 'market');

      await waitFor(() => {
        expect(screen.getByText('WHOLE FOODS MKT')).toBeTruthy();
        expect(screen.queryByText('STARBUCKS #1234')).toBeNull();
      });

      // Clear and search by OCR name
      fireEvent.changeText(searchInput, 'shell');

      await waitFor(() => {
        expect(screen.getByText('SHELL GAS')).toBeTruthy();
        expect(screen.queryByText('STARBUCKS #1234')).toBeNull();
      });
    });

    it('should show no results message when no matches', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('WHOLE FOODS MKT')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search aliases...');
      fireEvent.changeText(searchInput, 'xyznomatch');

      await waitFor(() => {
        expect(screen.getByText('No matching aliases')).toBeTruthy();
        expect(screen.queryByText('WHOLE FOODS MKT')).toBeNull();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle duplicate aliases (prevent creation)', async () => {
      const duplicateError = new Error('Alias already exists for this merchant');
      merchantAliasService.createMerchantAlias.mockRejectedValue(duplicateError);

      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeTruthy();
      });

      const addButton = screen.getByText('Add New');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('OCR Merchant Name')).toBeTruthy();
      });

      const ocrInput = screen.getByPlaceholderText('OCR Merchant Name');
      const aliasInput = screen.getByPlaceholderText('Your Alias');

      fireEvent.changeText(ocrInput, 'WHOLE FOODS MKT');
      fireEvent.changeText(aliasInput, 'Whole Foods');

      const saveButton = screen.getByText('Save');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Alias already exists for this merchant'
        );
      });
    });

    it('should handle very long merchant names (truncate display)', async () => {
      const longNameAliases = [
        {
          id: 'long1',
          ocrMerchant: 'A'.repeat(100),
          userAlias: 'Short Name',
          usageCount: 1,
        },
      ];

      merchantAliasService.getMerchantAliases.mockResolvedValue(longNameAliases);

      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        const displayedText = screen.getByTestId('ocr-merchant-text-long1');
        expect(displayedText.props.numberOfLines).toBe(1);
        expect(displayedText.props.ellipsizeMode).toBe('tail');
      });
    });

    it('should handle special characters in names', async () => {
      const specialCharAliases = [
        {
          id: 'special1',
          ocrMerchant: "McDonald's #1234 & Co.",
          userAlias: "McDonald's",
          usageCount: 1,
        },
      ];

      merchantAliasService.getMerchantAliases.mockResolvedValue(specialCharAliases);

      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText("McDonald's #1234 & Co.")).toBeTruthy();
        expect(screen.getByText("McDonald's")).toBeTruthy();
      });
    });

    it('should handle close callback', async () => {
      const mockOnClose = jest.fn();

      render(<MerchantAliasManager coupleId={mockCoupleId} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Close')).toBeTruthy();
      });

      const closeButton = screen.getByLabelText('Close');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle missing coupleId gracefully', async () => {
      render(<MerchantAliasManager coupleId={null} />);

      await waitFor(() => {
        expect(screen.getByText('No couple ID provided')).toBeTruthy();
      });

      expect(merchantAliasService.getMerchantAliases).not.toHaveBeenCalled();
    });
  });

  describe('UI/UX tests', () => {
    it('should close dialog after successful save', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeTruthy();
      });

      const addButton = screen.getByText('Add New');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Merchant Alias')).toBeTruthy();
      });

      const ocrInput = screen.getByPlaceholderText('OCR Merchant Name');
      const aliasInput = screen.getByPlaceholderText('Your Alias');

      fireEvent.changeText(ocrInput, 'NEW STORE');
      fireEvent.changeText(aliasInput, 'New Store');

      const saveButton = screen.getByText('Save');

      await act(async () => {
        fireEvent.press(saveButton);
      });

      await waitFor(
        () => {
          expect(screen.queryByText('Create Merchant Alias')).toBeNull();
        },
        { timeout: 3000 }
      );
    });

    it('should close dialog when cancel is pressed', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeTruthy();
      });

      const addButton = screen.getByText('Add New');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Merchant Alias')).toBeTruthy();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Create Merchant Alias')).toBeNull();
      });
    });

    it('should clear form when dialog is closed and reopened', async () => {
      render(<MerchantAliasManager coupleId={mockCoupleId} />);

      await waitFor(() => {
        expect(screen.getByText('Add New')).toBeTruthy();
      });

      // Open and fill form
      const addButton = screen.getByText('Add New');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('OCR Merchant Name')).toBeTruthy();
      });

      const ocrInput = screen.getByPlaceholderText('OCR Merchant Name');
      fireEvent.changeText(ocrInput, 'TEST');

      // Close
      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Create Merchant Alias')).toBeNull();
      });

      // Reopen
      fireEvent.press(addButton);

      await waitFor(() => {
        const newOcrInput = screen.getByPlaceholderText('OCR Merchant Name');
        expect(newOcrInput.props.value).toBe('');
      });
    });
  });
});
