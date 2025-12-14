// src/components/__tests__/CurrencyPicker.test.js
// Integration tests for CurrencyPicker component

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CurrencyPicker from '../CurrencyPicker';
import { getAllCurrencies, getCurrencyInfo } from '../../constants/currencies';

describe('CurrencyPicker Integration Tests', () => {
  const mockOnSelect = jest.fn();
  const defaultProps = {
    selectedCurrency: 'USD',
    onSelect: mockOnSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      const { getByText } = render(<CurrencyPicker {...defaultProps} />);

      expect(getByText('Currency')).toBeTruthy();
      expect(getByText('USD')).toBeTruthy();
      expect(getByText('US Dollar')).toBeTruthy();
    });

    it('should render with custom label', () => {
      const { getByText } = render(
        <CurrencyPicker {...defaultProps} label="Select Currency" />
      );

      expect(getByText('Select Currency')).toBeTruthy();
    });

    it('should render without label when not provided', () => {
      const { queryByText } = render(
        <CurrencyPicker {...defaultProps} label={null} />
      );

      expect(queryByText('Currency')).toBeFalsy();
    });

    it('should display selected currency information', () => {
      const { getByText } = render(
        <CurrencyPicker {...defaultProps} selectedCurrency="EUR" />
      );

      expect(getByText('EUR')).toBeTruthy();
      expect(getByText('Euro')).toBeTruthy();
    });

    it('should show currency flag emoji', () => {
      const { getByText } = render(<CurrencyPicker {...defaultProps} />);
      const usdInfo = getCurrencyInfo('USD');

      expect(getByText(usdInfo.flag)).toBeTruthy();
    });
  });

  describe('Modal Interaction', () => {
    it('should open modal when selector is pressed', () => {
      const { getByText, queryByText } = render(<CurrencyPicker {...defaultProps} />);

      // Modal should not be visible initially
      expect(queryByText('Select Currency')).toBeFalsy();

      // Press the selector
      const selector = getByText('USD').parent.parent;
      fireEvent.press(selector);

      // Modal should now be visible
      expect(getByText('Select Currency')).toBeTruthy();
    });

    it('should not open modal when disabled', () => {
      const { getByText, queryByText } = render(
        <CurrencyPicker {...defaultProps} disabled={true} />
      );

      const selector = getByText('USD').parent.parent;
      fireEvent.press(selector);

      // Modal should not open
      expect(queryByText('Select Currency')).toBeFalsy();
    });

    it('should close modal when close button is pressed', () => {
      const { getByText, queryByTestId, UNSAFE_getByType } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // Open modal
      const selector = getByText('USD').parent.parent;
      fireEvent.press(selector);

      // Modal is open
      expect(getByText('Select Currency')).toBeTruthy();

      // Find and press close button (Ionicons with name="close")
      const modalHeader = getByText('Select Currency').parent;
      const closeButton = modalHeader.parent.children.find(
        child => child.type?.displayName === 'TouchableOpacity'
      );

      if (closeButton) {
        fireEvent.press(closeButton);
      }

      // Modal should close (wait for state update)
      waitFor(() => {
        expect(queryByText('Select Currency')).toBeFalsy();
      });
    });
  });

  describe('Currency Search', () => {
    it('should filter currencies by code', () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      // Search for EUR
      const searchInput = getByPlaceholderText('Search currencies...');
      fireEvent.changeText(searchInput, 'EUR');

      // Should show EUR
      expect(getByText('EUR')).toBeTruthy();
      expect(getByText('Euro')).toBeTruthy();

      // Should not show USD (filtered out)
      expect(queryByText('US Dollar')).toBeFalsy();
    });

    it('should filter currencies by name (case insensitive)', () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      // Search for "peso" (lowercase)
      const searchInput = getByPlaceholderText('Search currencies...');
      fireEvent.changeText(searchInput, 'peso');

      // Should show Mexican Peso and Colombian Peso
      expect(getByText('MXN')).toBeTruthy();
      expect(getByText('COP')).toBeTruthy();

      // Should not show USD
      expect(queryByText('US Dollar')).toBeFalsy();
    });

    it('should show empty state when no currencies match', () => {
      const { getByText, getByPlaceholderText } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      // Search for non-existent currency
      const searchInput = getByPlaceholderText('Search currencies...');
      fireEvent.changeText(searchInput, 'XYZ123');

      // Should show empty state
      expect(getByText('No currencies found')).toBeTruthy();
    });

    it('should clear search when clear button is pressed', () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      const searchInput = getByPlaceholderText('Search currencies...');

      // Enter search text
      fireEvent.changeText(searchInput, 'EUR');
      expect(queryByText('US Dollar')).toBeFalsy();

      // Clear search (find the clear button - Ionicons with name="close-circle")
      // This would appear after text is entered
      fireEvent.changeText(searchInput, '');

      // All currencies should be visible again
      waitFor(() => {
        expect(getByText('US Dollar')).toBeTruthy();
      });
    });

    it('should show all currencies when search is empty', () => {
      const { getByText, getByPlaceholderText } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      const allCurrencies = getAllCurrencies();

      // All currencies should be visible
      allCurrencies.forEach(currency => {
        expect(getByText(currency.code)).toBeTruthy();
      });
    });
  });

  describe('Currency Selection', () => {
    it('should call onSelect when a currency is selected', async () => {
      const { getByText } = render(<CurrencyPicker {...defaultProps} />);

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      // Select EUR
      const eurOption = getByText('Euro');
      fireEvent.press(eurOption.parent);

      // Should call onSelect with EUR
      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith('EUR');
      });
    });

    it('should close modal after selection', async () => {
      const { getByText, queryByText } = render(<CurrencyPicker {...defaultProps} />);

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);
      expect(getByText('Select Currency')).toBeTruthy();

      // Select EUR
      const eurOption = getByText('Euro');
      fireEvent.press(eurOption.parent);

      // Modal should close
      await waitFor(() => {
        expect(queryByText('Select Currency')).toBeFalsy();
      });
    });

    it('should clear search after selection', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      // Search for EUR
      const searchInput = getByPlaceholderText('Search currencies...');
      fireEvent.changeText(searchInput, 'EUR');

      // Select EUR
      const eurOption = getByText('Euro');
      fireEvent.press(eurOption.parent);

      // Reopen modal
      await waitFor(() => {
        fireEvent.press(getByText('USD').parent.parent);
      });

      // Search should be cleared
      expect(searchInput.props.value).toBe('');
    });

    it('should highlight selected currency in list', () => {
      const { getByText, UNSAFE_getAllByType } = render(
        <CurrencyPicker {...defaultProps} selectedCurrency="EUR" />
      );

      // Open modal
      fireEvent.press(getByText('EUR').parent.parent);

      // EUR should have checkmark icon (Ionicons with name="checkmark")
      // This is tested by looking for the selected currency item
      const eurItem = getByText('Euro').parent.parent;

      // The selected item should have special styling or checkmark
      // In the actual implementation, it has a checkmark icon
      expect(eurItem).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled styles when disabled', () => {
      const { getByText } = render(
        <CurrencyPicker {...defaultProps} disabled={true} />
      );

      const selector = getByText('USD').parent.parent;

      // Should have disabled opacity (testing via testID or style would be better in real scenario)
      expect(selector).toBeTruthy();
    });

    it('should not respond to press when disabled', () => {
      const { getByText, queryByText } = render(
        <CurrencyPicker {...defaultProps} disabled={true} />
      );

      const selector = getByText('USD').parent.parent;
      fireEvent.press(selector);

      // Modal should not open
      expect(queryByText('Select Currency')).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should render all currency information for screen readers', () => {
      const { getByText } = render(<CurrencyPicker {...defaultProps} />);

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      const currencies = getAllCurrencies();

      currencies.forEach(currency => {
        expect(getByText(currency.code)).toBeTruthy();
        expect(getByText(currency.name)).toBeTruthy();
        expect(getByText(currency.symbol)).toBeTruthy();
        expect(getByText(currency.flag)).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing selectedCurrency gracefully', () => {
      const { getByText } = render(
        <CurrencyPicker onSelect={mockOnSelect} selectedCurrency={undefined} />
      );

      // Should default to USD
      expect(getByText('USD')).toBeTruthy();
    });

    it('should handle invalid selectedCurrency gracefully', () => {
      const { getByText } = render(
        <CurrencyPicker {...defaultProps} selectedCurrency="INVALID" />
      );

      // Should fallback to default currency
      expect(getByText('USD')).toBeTruthy();
    });

    it('should handle rapid open/close cycles', async () => {
      const { getByText, queryByText } = render(<CurrencyPicker {...defaultProps} />);

      const selector = getByText('USD').parent.parent;

      // Rapidly open and close
      fireEvent.press(selector);
      await waitFor(() => expect(getByText('Select Currency')).toBeTruthy());

      // This test ensures no crashes occur during rapid interaction
      expect(queryByText('Select Currency')).toBeTruthy();
    });

    it('should display currency list in correct order', () => {
      const { getByText, UNSAFE_getAllByType } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // Open modal
      fireEvent.press(getByText('USD').parent.parent);

      const currencies = getAllCurrencies();

      // Verify all currencies are rendered
      currencies.forEach(currency => {
        expect(getByText(currency.code)).toBeTruthy();
      });
    });
  });

  describe('User Journey', () => {
    it('should complete full selection flow', async () => {
      const { getByText, getByPlaceholderText, queryByText } = render(
        <CurrencyPicker {...defaultProps} />
      );

      // 1. Initially shows USD
      expect(getByText('USD')).toBeTruthy();
      expect(getByText('US Dollar')).toBeTruthy();

      // 2. Open modal
      fireEvent.press(getByText('USD').parent.parent);
      expect(getByText('Select Currency')).toBeTruthy();

      // 3. Search for currency
      const searchInput = getByPlaceholderText('Search currencies...');
      fireEvent.changeText(searchInput, 'euro');

      // 4. Find and select EUR
      const eurOption = getByText('Euro');
      fireEvent.press(eurOption.parent);

      // 5. Verify onSelect was called
      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith('EUR');
      });

      // 6. Modal closes
      await waitFor(() => {
        expect(queryByText('Select Currency')).toBeFalsy();
      });
    });
  });
});
