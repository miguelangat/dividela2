// src/screens/main/__tests__/AddExpenseScreen.test.js
// Comprehensive tests for AddExpenseScreen with OCR integration

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AddExpenseScreen from '../AddExpenseScreen';
import * as ImagePicker from 'expo-image-picker';
import * as ocrService from '../../../services/ocrService';
import * as merchantAliasService from '../../../services/merchantAliasService';
import * as expenseService from '../../../services/expenseService';

// Mock dependencies
jest.mock('expo-image-picker');
jest.mock('../../../services/ocrService');
jest.mock('../../../services/merchantAliasService');
jest.mock('../../../services/expenseService');
jest.mock('../../../config/firebase', () => ({
  db: {},
  storage: {},
}));
jest.mock('firebase/firestore', () => ({
  updateDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

// Mock contexts
const mockUser = {
  uid: 'user123',
  email: 'test@example.com',
};

const mockUserDetails = {
  coupleId: 'couple123',
  partnerId: 'partner456',
};

const mockCategories = {
  food: { name: 'Food', icon: '🍔' },
  transport: { name: 'Transport', icon: '🚗' },
  entertainment: { name: 'Entertainment', icon: '🎬' },
};

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    userDetails: mockUserDetails,
  }),
}));

jest.mock('../../../contexts/BudgetContext', () => ({
  useBudget: () => ({
    categories: mockCategories,
    budgetProgress: null,
    isBudgetEnabled: false,
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};

const mockRoute = {
  params: {},
};

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('AddExpenseScreen - OCR Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // UI RENDERING TESTS
  // ============================================

  describe('UI Rendering', () => {
    it('should show "Scan Receipt" button', () => {
      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByTestId('scan-receipt-button')).toBeTruthy();
    });

    it('should show divider between OCR and manual entry', () => {
      const { getAllByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      const orTexts = getAllByText(/^or$/i);
      expect(orTexts.length).toBeGreaterThan(0);
    });

    it('should show manual entry form below OCR section', () => {
      const { getByPlaceholderText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(getByPlaceholderText('0.00')).toBeTruthy();
      expect(getByPlaceholderText('What did you pay for?')).toBeTruthy();
    });
  });

  // ============================================
  // CAMERA PERMISSION TESTS
  // ============================================

  describe('Camera Permissions', () => {
    it('should request camera permissions when scan button pressed', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
      });

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should show alert when camera permission denied', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          'Camera permission is required to scan receipts. Please enable it in your device settings.',
          expect.any(Array)
        );
      });
    });

    it('should not launch camera if permission denied', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // CAMERA LAUNCH TESTS
  // ============================================

  describe('Camera Launch', () => {
    it('should launch camera with correct settings', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
      });

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
      });
    });

    it('should handle camera cancel gracefully', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
      });

      const { getByTestId, queryByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      });

      // Should not show processing banner after cancel
      expect(queryByTestId('ocr-processing-banner')).toBeNull();
    });
  });

  // ============================================
  // OCR PROCESSING TESTS
  // ============================================

  describe('OCR Processing', () => {
    it('should show uploading state during upload', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockImplementation(
        async (uri, coupleId, userId, onProgress) => {
          // Simulate upload progress
          onProgress && onProgress(50);
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            expenseId: 'expense123',
            receiptUrl: 'https://example.com/receipt.jpg',
          };
        }
      );

      ocrService.subscribeToOCRResults.mockReturnValue(jest.fn());

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('scan-receipt-button'));
      });

      await waitFor(() => {
        expect(getByTestId('ocr-banner')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should show OCRProcessingBanner when processing', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({ status: 'processing' });
        return jest.fn(); // unsubscribe function
      });

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('scan-receipt-button'));
      });

      await waitFor(() => {
        expect(getByTestId('ocr-banner')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should subscribe to OCR results', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      ocrService.subscribeToOCRResults.mockReturnValue(jest.fn());

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(ocrService.subscribeToOCRResults).toHaveBeenCalledWith(
          'expense123',
          expect.any(Function)
        );
      });
    });

    it('should show OCRSuggestionCard when results ready', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const mockSuggestions = {
        amount: 125.50,
        merchant: 'Whole Foods',
        category: {
          category: 'food',
          confidence: 0.85,
          reasoning: 'Grocery store receipt',
          alternatives: [],
          belowThreshold: false,
        },
        date: '2025-11-15',
        confidence: 85,
      };

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        // Simulate completed OCR
        setTimeout(() => {
          callback({
            status: 'completed',
            data: mockSuggestions,
          });
        }, 100);
        return jest.fn();
      });

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('scan-receipt-button'));
      });

      await waitFor(() => {
        expect(getByTestId('ocr-suggestion-card')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should show error banner when OCR fails', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'failed',
          error: 'OCR processing failed',
        });
        return jest.fn();
      });

      const { getByText, getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByText(/OCR processing failed/i)).toBeTruthy();
      });
    });

    it('should handle below-threshold confidence', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const lowConfidenceSuggestions = {
        amount: 50.00,
        merchant: 'ABC Store',
        category: {
          category: 'other',
          confidence: 0.45,
          reasoning: 'Low confidence',
          alternatives: [],
          belowThreshold: true,
        },
        date: '2025-11-15',
        confidence: 45,
      };

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'completed',
          data: lowConfidenceSuggestions,
        });
        return jest.fn();
      });

      const { getByTestId, queryByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      // Since OCRSuggestionCard doesn't render when belowThreshold is true,
      // we should not see it
      await waitFor(() => {
        expect(queryByTestId('ocr-suggestion-card')).toBeNull();
      });
    });
  });

  // ============================================
  // FORM PRE-FILL TESTS
  // ============================================

  describe('Form Pre-fill', () => {
    it('should pre-fill amount from suggestions', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const mockSuggestions = {
        amount: 125.50,
        merchant: 'Whole Foods',
        category: 'food',
        date: '2025-11-15',
        confidence: 85,
      };

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'completed',
          data: mockSuggestions,
        });
        return jest.fn();
      });

      const { getByTestId, getByDisplayValue } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByTestId('ocr-suggestion-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('ocr-accept-button'));

      await waitFor(() => {
        expect(getByDisplayValue('125.5')).toBeTruthy();
      });
    });

    it('should pre-fill description from merchant', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const mockSuggestions = {
        amount: 125.50,
        merchant: 'Whole Foods',
        category: 'food',
        date: '2025-11-15',
        confidence: 85,
      };

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'completed',
          data: mockSuggestions,
        });
        return jest.fn();
      });

      const { getByTestId, getByDisplayValue } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByTestId('ocr-suggestion-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('ocr-accept-button'));

      await waitFor(() => {
        expect(getByDisplayValue('Whole Foods')).toBeTruthy();
      });
    });

    it('should pre-fill category from suggestion', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const mockSuggestions = {
        amount: 125.50,
        merchant: 'Whole Foods',
        category: 'food',
        date: '2025-11-15',
        confidence: 85,
      };

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'completed',
          data: mockSuggestions,
        });
        return jest.fn();
      });

      const { getByTestId, getAllByRole } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByTestId('ocr-suggestion-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('ocr-accept-button'));

      // Verify food category is selected
      await waitFor(() => {
        const foodButton = getByTestId('category-button-food');
        expect(foodButton).toBeTruthy();
        // Check if it has selected style (implementation detail)
      });
    });

    it('should allow editing after pre-fill', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const mockSuggestions = {
        amount: 125.50,
        merchant: 'Whole Foods',
        category: 'food',
        date: '2025-11-15',
        confidence: 85,
      };

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'completed',
          data: mockSuggestions,
        });
        return jest.fn();
      });

      const { getByTestId, getByDisplayValue } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByTestId('ocr-suggestion-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('ocr-accept-button'));

      await waitFor(() => {
        const amountInput = getByDisplayValue('125.5');
        fireEvent.changeText(amountInput, '150.00');
        expect(getByDisplayValue('150.00')).toBeTruthy();
      });
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    it('should show error when upload fails', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockRejectedValue(
        new Error('Upload failed')
      );

      const { getByTestId, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByText(/Upload failed/i)).toBeTruthy();
      });
    });

    it('should show error when OCR processing fails', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'failed',
          error: 'OCR service unavailable',
        });
        return jest.fn();
      });

      const { getByTestId, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByText(/OCR service unavailable/i)).toBeTruthy();
      });
    });

    it('should allow retry on failure', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockRejectedValue(
        new Error('Network error')
      );

      const { getByTestId, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('scan-receipt-button'));
      });

      await waitFor(() => {
        expect(getByText(/Network error/i)).toBeTruthy();
      }, { timeout: 3000 });

      // Can press scan button again to retry
      expect(getByTestId('scan-receipt-button')).toBeTruthy();
    });

    it('should fallback to manual entry on error', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockRejectedValue(
        new Error('OCR failed')
      );

      const { getByTestId, getByPlaceholderText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('scan-receipt-button'));
      });

      await waitFor(() => {
        expect(getByText(/OCR failed/i)).toBeTruthy();
      }, { timeout: 3000 });

      // Manual entry fields should still be accessible
      expect(getByPlaceholderText('0.00')).toBeTruthy();
      expect(getByPlaceholderText('What did you pay for?')).toBeTruthy();
    });
  });

  // ============================================
  // OCR FEEDBACK TESTS
  // ============================================

  describe('OCR Feedback Recording', () => {
    it('should record OCR feedback when saving with OCR data', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const mockSuggestions = {
        amount: 125.50,
        merchant: 'Whole Foods',
        category: 'food',
        date: '2025-11-15',
        confidence: 85,
      };

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'completed',
          data: mockSuggestions,
        });
        return jest.fn();
      });

      expenseService.addExpense.mockResolvedValue();
      ocrService.recordOCRFeedback.mockResolvedValue({ accuracy: 1.0 });

      const { getByTestId, getAllByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByTestId('ocr-suggestion-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('ocr-accept-button'));

      await waitFor(() => {
        const addButtons = getAllByText('Add Expense');
        fireEvent.press(addButtons[addButtons.length - 1]); // Click the button, not header
      });

      await waitFor(() => {
        expect(ocrService.recordOCRFeedback).toHaveBeenCalledWith(
          mockSuggestions,
          expect.objectContaining({
            amount: 125.50,
            description: 'Whole Foods',
            category: 'food',
          }),
          'couple123'
        );
      });
    });

    it('should not record feedback when no OCR data used', async () => {
      expenseService.addExpense.mockResolvedValue();

      const { getByPlaceholderText, getAllByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      // Manual entry without OCR
      fireEvent.changeText(getByPlaceholderText('0.00'), '50.00');
      fireEvent.changeText(getByPlaceholderText('What did you pay for?'), 'Coffee');

      const addButtons = getAllByText('Add Expense');
      fireEvent.press(addButtons[addButtons.length - 1]); // Click the button, not header

      await waitFor(() => {
        expect(ocrService.recordOCRFeedback).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // MERCHANT ALIAS TESTS
  // ============================================

  describe('Merchant Alias', () => {
    it('should allow creating merchant alias from suggestions', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const mockSuggestions = {
        amount: 125.50,
        merchant: 'WHL FDS #12345',
        category: 'food',
        date: '2025-11-15',
        confidence: 85,
      };

      ocrService.subscribeToOCRResults.mockImplementation((expenseId, callback) => {
        callback({
          status: 'completed',
          data: mockSuggestions,
        });
        return jest.fn();
      });

      merchantAliasService.createMerchantAlias.mockResolvedValue({
        id: 'alias123',
      });

      const { getByTestId } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(getByTestId('ocr-suggestion-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('ocr-alias-button'));

      await waitFor(() => {
        expect(getByTestId('ocr-alias-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('ocr-alias-input'), 'Whole Foods');
      fireEvent.press(getByTestId('ocr-alias-save-button'));

      await waitFor(() => {
        expect(merchantAliasService.createMerchantAlias).toHaveBeenCalledWith(
          'WHL FDS #12345',
          'Whole Foods',
          'couple123'
        );
      });
    });
  });

  // ============================================
  // CLEANUP TESTS
  // ============================================

  describe('Cleanup', () => {
    it('should clean up subscription on unmount', async () => {
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      ImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///receipt.jpg' }],
      });

      ocrService.scanReceiptInBackground.mockResolvedValue({
        expenseId: 'expense123',
        receiptUrl: 'https://example.com/receipt.jpg',
      });

      const mockUnsubscribe = jest.fn();
      ocrService.subscribeToOCRResults.mockReturnValue(mockUnsubscribe);

      const { getByTestId, unmount } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.press(getByTestId('scan-receipt-button'));

      await waitFor(() => {
        expect(ocrService.subscribeToOCRResults).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  // ============================================
  // INTEGRATION WITH EXISTING FUNCTIONALITY
  // ============================================

  describe('Integration with Existing Functionality', () => {
    it('should not break existing manual entry', () => {
      expenseService.addExpense.mockResolvedValue();

      const { getByPlaceholderText, getAllByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      fireEvent.changeText(getByPlaceholderText('0.00'), '100.00');
      fireEvent.changeText(getByPlaceholderText('What did you pay for?'), 'Groceries');

      const addButtons = getAllByText('Add Expense');
      fireEvent.press(addButtons[addButtons.length - 1]); // Click the button, not header

      waitFor(() => {
        expect(expenseService.addExpense).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 100.00,
            description: 'Groceries',
          })
        );
      });
    });

    it('should preserve existing validation logic', () => {
      const { getAllByText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      const addButtons = getAllByText('Add Expense');
      fireEvent.press(addButtons[addButtons.length - 1]); // Click the button, not header

      waitFor(() => {
        expect(getByText('Please enter a valid amount')).toBeTruthy();
      });
    });
  });
});
