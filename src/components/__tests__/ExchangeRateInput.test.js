// src/components/__tests__/ExchangeRateInput.test.js
// Integration tests for ExchangeRateInput component

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ExchangeRateInput from '../ExchangeRateInput';

describe('ExchangeRateInput Integration Tests', () => {
  const mockOnRateChange = jest.fn();
  const mockOnConvertedAmountChange = jest.fn();

  const defaultProps = {
    fromAmount: 100,
    fromCurrency: 'EUR',
    toCurrency: 'USD',
    onRateChange: mockOnRateChange,
    onConvertedAmountChange: mockOnConvertedAmountChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      expect(getByText('Currency Conversion')).toBeTruthy();
      expect(getByText('From:')).toBeTruthy();
      expect(getByText('To:')).toBeTruthy();
      expect(getByText('Exchange Rate')).toBeTruthy();
    });

    it('should display from amount and currency', () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      expect(getByText('EUR')).toBeTruthy();
      // The formatted amount €100.00 or similar should be displayed
      expect(getByText(/100/)).toBeTruthy();
    });

    it('should display to currency badge', () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      // USD badge should appear twice (in conversion display and rate input)
      const usdBadges = getByText('USD');
      expect(usdBadges).toBeTruthy();
    });

    it('should display currency symbol in input', () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      // USD symbol ($)
      expect(getByText('$')).toBeTruthy();
    });

    it('should render helper text', () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      expect(
        getByText(/Enter the exchange rate or the converted amount/)
      ).toBeTruthy();
    });

    it('should render with initial rate', () => {
      const { getByDisplayValue } = render(
        <ExchangeRateInput {...defaultProps} initialRate={1.10} />
      );

      expect(getByDisplayValue('1.1')).toBeTruthy();
    });

    it('should return null for same currency', () => {
      const { container } = render(
        <ExchangeRateInput
          {...defaultProps}
          fromCurrency="USD"
          toCurrency="USD"
        />
      );

      // Component should render null
      expect(container.children.length).toBe(0);
    });
  });

  describe('Exchange Rate Input', () => {
    it('should update exchange rate on input', () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.10');

      expect(rateInput.props.value).toBe('1.10');
    });

    it('should calculate converted amount when rate is entered', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.10');

      await waitFor(() => {
        // 100 EUR * 1.10 = 110 USD
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(110);
      });
    });

    it('should call onRateChange with valid rate', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.15');

      await waitFor(() => {
        expect(mockOnRateChange).toHaveBeenCalledWith(1.15);
      });
    });

    it('should validate exchange rate', async () => {
      const { getByPlaceholderText, getByText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      const rateInput = getByPlaceholderText('0.0000');

      // Enter invalid high rate
      fireEvent.changeText(rateInput, '50000');

      await waitFor(() => {
        expect(getByText(/Exchange rate seems unusually high/)).toBeTruthy();
      });
    });

    it('should not show error for valid rates', () => {
      const { getByPlaceholderText, queryByText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.10');

      expect(queryByText(/seems unusually high/)).toBeFalsy();
    });

    it('should display formatted exchange rate', () => {
      const { getByPlaceholderText, getByText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.10');

      // Should display "1 EUR = 1.1000 USD"
      expect(getByText(/1 EUR = 1.1000 USD/)).toBeTruthy();
    });

    it('should handle decimal input', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '0.85');

      await waitFor(() => {
        expect(mockOnRateChange).toHaveBeenCalledWith(0.85);
        // 100 * 0.85 = 85
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(85);
      });
    });
  });

  describe('Converted Amount Input', () => {
    it('should update converted amount on input', () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '110');

      expect(amountInput.props.value).toBe('110');
    });

    it('should calculate exchange rate when amount is entered', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '110');

      await waitFor(() => {
        // 110 / 100 = 1.10
        expect(mockOnRateChange).toHaveBeenCalledWith(1.10);
      });
    });

    it('should call onConvertedAmountChange with parsed amount', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '110');

      await waitFor(() => {
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(110);
      });
    });

    it('should parse currency symbols from input', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '$110.50');

      await waitFor(() => {
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(110.5);
      });
    });

    it('should parse commas from input', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '1,110.00');

      await waitFor(() => {
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(1110);
      });
    });
  });

  describe('Two-Way Conversion', () => {
    it('should switch to rate mode when rate input is changed', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const amountInput = getByPlaceholderText('0.00');
      const rateInput = getByPlaceholderText('0.0000');

      // First enter amount (amount mode)
      fireEvent.changeText(amountInput, '110');

      // Then enter rate (should switch to rate mode)
      fireEvent.changeText(rateInput, '1.15');

      await waitFor(() => {
        // Should calculate new converted amount based on rate
        // 100 * 1.15 = 115
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(115);
      });
    });

    it('should switch to amount mode when amount input is changed', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const amountInput = getByPlaceholderText('0.00');
      const rateInput = getByPlaceholderText('0.0000');

      // First enter rate (rate mode)
      fireEvent.changeText(rateInput, '1.10');

      // Then enter amount (should switch to amount mode)
      fireEvent.changeText(amountInput, '120');

      await waitFor(() => {
        // Should calculate new rate based on amount
        // 120 / 100 = 1.20
        expect(mockOnRateChange).toHaveBeenCalledWith(1.20);
      });
    });

    it('should maintain precision in conversion', async () => {
      const { getByPlaceholderText } = render(
        <ExchangeRateInput {...defaultProps} fromAmount={33.33} />
      );

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.10');

      await waitFor(() => {
        // 33.33 * 1.10 = 36.663, should round to 36.66
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(36.66);
      });
    });
  });

  describe('Quick Rate Buttons', () => {
    it('should show quick rates for EUR to USD', () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      expect(getByText('Quick rates:')).toBeTruthy();
      expect(getByText('1.1')).toBeTruthy();
      expect(getByText('1.15')).toBeTruthy();
      expect(getByText('1.2')).toBeTruthy();
    });

    it('should show quick rates for USD to EUR', () => {
      const { getByText } = render(
        <ExchangeRateInput
          {...defaultProps}
          fromCurrency="USD"
          toCurrency="EUR"
        />
      );

      expect(getByText('0.85')).toBeTruthy();
      expect(getByText('0.9')).toBeTruthy();
      expect(getByText('0.95')).toBeTruthy();
    });

    it('should show quick rates for MXN to USD', () => {
      const { getByText } = render(
        <ExchangeRateInput
          {...defaultProps}
          fromCurrency="MXN"
          toCurrency="USD"
        />
      );

      expect(getByText('0.05')).toBeTruthy();
      expect(getByText('0.055')).toBeTruthy();
      expect(getByText('0.06')).toBeTruthy();
    });

    it('should show quick rates for USD to MXN', () => {
      const { getByText } = render(
        <ExchangeRateInput
          {...defaultProps}
          fromCurrency="USD"
          toCurrency="MXN"
        />
      );

      expect(getByText('16')).toBeTruthy();
      expect(getByText('17')).toBeTruthy();
      expect(getByText('18')).toBeTruthy();
    });

    it('should apply quick rate when button is pressed', async () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      const quickRateButton = getByText('1.15');
      fireEvent.press(quickRateButton);

      await waitFor(() => {
        expect(mockOnRateChange).toHaveBeenCalledWith(1.15);
      });
    });

    it('should calculate converted amount from quick rate', async () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      const quickRateButton = getByText('1.2');
      fireEvent.press(quickRateButton);

      await waitFor(() => {
        // 100 * 1.2 = 120
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(120);
      });
    });

    it('should highlight active quick rate', () => {
      const { getByText, getByPlaceholderText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.15');

      // The 1.15 button should have active styling
      const activeButton = getByText('1.15');
      expect(activeButton).toBeTruthy();
    });

    it('should not show quick rates for unsupported pairs', () => {
      const { queryByText } = render(
        <ExchangeRateInput
          {...defaultProps}
          fromCurrency="COP"
          toCurrency="PEN"
        />
      );

      expect(queryByText('Quick rates:')).toBeFalsy();
    });
  });

  describe('fromAmount Updates', () => {
    it('should recalculate when fromAmount changes', async () => {
      const { rerender, getByPlaceholderText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.10');

      // Change fromAmount
      rerender(
        <ExchangeRateInput
          {...defaultProps}
          fromAmount={200}
          onRateChange={mockOnRateChange}
          onConvertedAmountChange={mockOnConvertedAmountChange}
        />
      );

      await waitFor(() => {
        // 200 * 1.10 = 220
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(220);
      });
    });

    it('should update display when fromAmount changes', () => {
      const { getByText, rerender } = render(
        <ExchangeRateInput {...defaultProps} fromAmount={100} />
      );

      expect(getByText(/100/)).toBeTruthy();

      rerender(
        <ExchangeRateInput
          {...defaultProps}
          fromAmount={250}
          onRateChange={mockOnRateChange}
          onConvertedAmountChange={mockOnConvertedAmountChange}
        />
      );

      expect(getByText(/250/)).toBeTruthy();
    });
  });

  describe('Same Currency Handling', () => {
    it('should call callbacks with 1.0 rate for same currency', () => {
      render(
        <ExchangeRateInput
          {...defaultProps}
          fromCurrency="USD"
          toCurrency="USD"
        />
      );

      // Should set rate to 1.0 and amount to fromAmount
      expect(mockOnRateChange).toHaveBeenCalledWith(1.0);
      expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(100);
    });

    it('should update when fromAmount changes with same currency', () => {
      const { rerender } = render(
        <ExchangeRateInput
          {...defaultProps}
          fromCurrency="USD"
          toCurrency="USD"
          fromAmount={100}
        />
      );

      jest.clearAllMocks();

      rerender(
        <ExchangeRateInput
          {...defaultProps}
          fromCurrency="USD"
          toCurrency="USD"
          fromAmount={150}
          onRateChange={mockOnRateChange}
          onConvertedAmountChange={mockOnConvertedAmountChange}
        />
      );

      expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(150);
    });
  });

  describe('Error Handling', () => {
    it('should show error for zero or negative rate', async () => {
      const { getByPlaceholderText, getByText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '0');

      await waitFor(() => {
        expect(getByText(/must be greater than zero/)).toBeTruthy();
      });
    });

    it('should clear error when valid input is entered', async () => {
      const { getByPlaceholderText, queryByText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      const rateInput = getByPlaceholderText('0.0000');

      // Enter invalid
      fireEvent.changeText(rateInput, '50000');
      await waitFor(() => {
        expect(queryByText(/unusually high/)).toBeTruthy();
      });

      // Enter valid
      fireEvent.changeText(rateInput, '1.10');
      await waitFor(() => {
        expect(queryByText(/unusually high/)).toBeFalsy();
      });
    });

    it('should handle invalid text input gracefully', () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const rateInput = getByPlaceholderText('0.0000');

      // Should not crash
      expect(() => {
        fireEvent.changeText(rateInput, 'abc');
      }).not.toThrow();
    });

    it('should handle empty input', () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const rateInput = getByPlaceholderText('0.0000');

      expect(() => {
        fireEvent.changeText(rateInput, '');
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero fromAmount', () => {
      const { getByPlaceholderText } = render(
        <ExchangeRateInput {...defaultProps} fromAmount={0} />
      );

      const amountInput = getByPlaceholderText('0.00');

      // Entering amount when fromAmount is 0 should not crash
      expect(() => {
        fireEvent.changeText(amountInput, '100');
      }).not.toThrow();
    });

    it('should handle very large amounts', async () => {
      const { getByPlaceholderText } = render(
        <ExchangeRateInput {...defaultProps} fromAmount={1000000} />
      );

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.10');

      await waitFor(() => {
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(1100000);
      });
    });

    it('should handle very small rates', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '0.0001');

      await waitFor(() => {
        expect(mockOnRateChange).toHaveBeenCalledWith(0.0001);
      });
    });

    it('should round converted amounts appropriately', async () => {
      const { getByPlaceholderText } = render(
        <ExchangeRateInput {...defaultProps} fromAmount={33.33} />
      );

      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.333');

      await waitFor(() => {
        // 33.33 * 1.333 = 44.43089, should round to 44.43
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(44.43);
      });
    });
  });

  describe('User Journey', () => {
    it('should complete full conversion flow via rate input', async () => {
      const { getByPlaceholderText, getByText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      // 1. User sees conversion interface
      expect(getByText('Currency Conversion')).toBeTruthy();
      expect(getByText(/100/)).toBeTruthy(); // From amount

      // 2. User enters exchange rate
      const rateInput = getByPlaceholderText('0.0000');
      fireEvent.changeText(rateInput, '1.15');

      // 3. System calculates and displays converted amount
      await waitFor(() => {
        expect(mockOnRateChange).toHaveBeenCalledWith(1.15);
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(115);
      });

      // 4. User sees formatted rate
      expect(getByText(/1 EUR = 1.150000 USD/)).toBeTruthy();
    });

    it('should complete full conversion flow via amount input', async () => {
      const { getByPlaceholderText, getByText } = render(
        <ExchangeRateInput {...defaultProps} />
      );

      // 1. User sees conversion interface
      expect(getByText('Currency Conversion')).toBeTruthy();

      // 2. User enters desired converted amount
      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '115');

      // 3. System calculates exchange rate
      await waitFor(() => {
        expect(mockOnRateChange).toHaveBeenCalledWith(1.15);
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(115);
      });
    });

    it('should complete full conversion flow via quick rate', async () => {
      const { getByText } = render(<ExchangeRateInput {...defaultProps} />);

      // 1. User sees quick rate suggestions
      expect(getByText('Quick rates:')).toBeTruthy();

      // 2. User clicks quick rate
      const quickRateButton = getByText('1.2');
      fireEvent.press(quickRateButton);

      // 3. System applies rate and calculates
      await waitFor(() => {
        expect(mockOnRateChange).toHaveBeenCalledWith(1.2);
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(120);
      });

      // 4. User sees formatted rate
      expect(getByText(/1 EUR = 1.200000 USD/)).toBeTruthy();
    });

    it('should handle user changing mind between inputs', async () => {
      const { getByPlaceholderText } = render(<ExchangeRateInput {...defaultProps} />);

      const rateInput = getByPlaceholderText('0.0000');
      const amountInput = getByPlaceholderText('0.00');

      // User enters rate
      fireEvent.changeText(rateInput, '1.10');
      await waitFor(() => {
        expect(mockOnConvertedAmountChange).toHaveBeenCalledWith(110);
      });

      jest.clearAllMocks();

      // User changes mind and enters specific amount instead
      fireEvent.changeText(amountInput, '120');
      await waitFor(() => {
        expect(mockOnRateChange).toHaveBeenCalledWith(1.20);
      });
    });
  });
});
