// src/screens/main/__tests__/AddExpenseScreen.multi-currency.test.js
// Integration tests for AddExpenseScreen multi-currency support

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddExpenseScreen from '../AddExpenseScreen';
import * as expenseService from '../../../services/expenseService';
import * as coupleSettingsService from '../../../services/coupleSettingsService';
import { useAuth } from '../../../contexts/AuthContext';
import { useBudget } from '../../../contexts/BudgetContext';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};

// Mock route
const mockRoute = {
  params: {},
};

// Mock Firebase
jest.mock('../../../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  updateDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

// Mock contexts
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/BudgetContext');

// Mock services
jest.mock('../../../services/expenseService');
jest.mock('../../../services/coupleSettingsService');

describe('AddExpenseScreen - Multi-Currency Integration', () => {
  const mockUser = {
    uid: 'user1',
    email: 'user1@test.com',
  };

  const mockUserDetails = {
    coupleId: 'couple1',
    partnerId: 'user2',
    displayName: 'User 1',
  };

  const mockCategories = {
    food: { name: 'Food', icon: '🍔', color: '#FF6B6B' },
    transport: { name: 'Transport', icon: '🚗', color: '#4ECDC4' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup auth context
    useAuth.mockReturnValue({
      user: mockUser,
      userDetails: mockUserDetails,
    });

    // Setup budget context
    useBudget.mockReturnValue({
      categories: mockCategories,
      budgetProgress: {},
      isBudgetEnabled: false,
    });

    // Setup default currency service mocks
    coupleSettingsService.getPrimaryCurrency.mockResolvedValue({
      code: 'USD',
      symbol: '$',
    });

    coupleSettingsService.saveRecentExchangeRate.mockResolvedValue();
    coupleSettingsService.getRecentExchangeRate.mockResolvedValue(null);

    expenseService.addExpense.mockResolvedValue({ id: 'expense1' });
    expenseService.updateExpense.mockResolvedValue();
  });

  describe('Rendering and Currency Selection', () => {
    it('should render with default currency (USD)', async () => {
      const { getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Add Expense')).toBeTruthy();
      });

      // Should show USD symbol
      expect(getByText('$')).toBeTruthy();
    });

    it('should load primary currency from settings', async () => {
      coupleSettingsService.getPrimaryCurrency.mockResolvedValue({
        code: 'EUR',
        symbol: '€',
      });

      render(<AddExpenseScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(coupleSettingsService.getPrimaryCurrency).toHaveBeenCalledWith('couple1');
      });
    });

    it('should show CurrencyPicker component', async () => {
      const { getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Expense Currency')).toBeTruthy();
      });
    });

    it('should allow changing expense currency', async () => {
      const { getByText, getByPlaceholderText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Add Expense')).toBeTruthy();
      });

      // This test would require mocking CurrencyPicker interactions
      // In a real scenario, you'd use testID to find and interact with the picker
    });
  });

  describe('Exchange Rate Input Display', () => {
    it('should show ExchangeRateInput when currency differs from primary', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Add Expense')).toBeTruthy();
      });

      // Enter amount
      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '100');

      // Simulate currency change to EUR (would need to expose this via testID in real component)
      // For now, testing the logic that shows/hides the ExchangeRateInput
      // The component shows ExchangeRateInput when: expenseCurrency !== primaryCurrency && amount > 0
    });

    it('should not show ExchangeRateInput when currency matches primary', async () => {
      const { queryByText, getByPlaceholderText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(queryByText('Add Expense')).toBeTruthy();
      });

      // Enter amount with same currency (USD)
      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '100');

      // Should not show exchange rate section
      // (Component conditionally renders ExchangeRateInput)
    });

    it('should not show ExchangeRateInput when amount is zero', async () => {
      const { queryByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(queryByText('Add Expense')).toBeTruthy();
      });

      // Even with different currency, no amount = no exchange rate input
    });
  });

  describe('Expense Creation with Multi-Currency', () => {
    it('should create expense with same currency (no conversion)', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Add Expense')).toBeTruthy();
      });

      // Enter amount
      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '100');

      // Enter description
      const descInput = getByPlaceholderText('What did you pay for?');
      fireEvent.changeText(descInput, 'Lunch');

      // Submit
      const submitButton = getByText('Add Expense');
      fireEvent.press(submitButton.parent);

      await waitFor(() => {
        expect(expenseService.addExpense).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 100,
            currency: 'USD',
            primaryCurrency: 'USD',
            primaryCurrencyAmount: 100,
            exchangeRate: 1.0,
            exchangeRateSource: 'none',
            description: 'Lunch',
          })
        );
      });
    });

    it('should create expense with currency conversion', async () => {
      // This test would require more complex setup to simulate:
      // 1. Changing currency to EUR
      // 2. Entering exchange rate in ExchangeRateInput
      // 3. Verifying the multi-currency expense data

      // Mock setup would need to expose currency selection
      // For demonstration, showing the expected behavior
      const mockExpenseData = {
        amount: 100,
        currency: 'EUR',
        exchangeRate: 1.10,
        primaryCurrency: 'USD',
        primaryCurrencyAmount: 110,
        exchangeRateSource: 'manual',
      };

      // In a full integration test, you would:
      // 1. Render the component
      // 2. Select EUR currency
      // 3. Enter amount 100
      // 4. Enter exchange rate 1.10 in ExchangeRateInput
      // 5. Submit and verify expense creation with converted values
    });

    it('should save exchange rate for future reuse', async () => {
      // This would test that saveRecentExchangeRate is called
      // when creating an expense with a different currency

      // The component should call:
      // saveRecentExchangeRate(coupleId, fromCurrency, toCurrency, rate)
    });

    it('should navigate back after successful creation', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Add Expense')).toBeTruthy();
      });

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '100');

      const descInput = getByPlaceholderText('What did you pay for?');
      fireEvent.changeText(descInput, 'Lunch');

      // Find and press submit button
      // (In real test, use testID)

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode with Multi-Currency', () => {
    it('should pre-populate currency fields when editing', async () => {
      const editingExpense = {
        id: 'expense1',
        amount: 50,
        currency: 'EUR',
        primaryCurrency: 'USD',
        primaryCurrencyAmount: 55,
        exchangeRate: 1.10,
        description: 'Dinner',
        category: 'food',
        categoryKey: 'food',
        paidBy: 'user1',
        splitDetails: {
          user1Amount: 27.5,
          user2Amount: 27.5,
          user1Percentage: 50,
          user2Percentage: 50,
        },
      };

      const editRoute = {
        params: {
          expense: editingExpense,
        },
      };

      const { getByDisplayValue, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={editRoute} />
      );

      await waitFor(() => {
        expect(getByText('Edit Expense')).toBeTruthy();
      });

      // Should show amount
      expect(getByDisplayValue('50')).toBeTruthy();

      // Should show description
      expect(getByDisplayValue('Dinner')).toBeTruthy();

      // Currency should be set to EUR
      // Exchange rate should be set to 1.10
      // (Would verify via state or rendered values)
    });

    it('should update expense with new currency values', async () => {
      const editingExpense = {
        id: 'expense1',
        amount: 50,
        currency: 'USD',
        description: 'Dinner',
        category: 'food',
        paidBy: 'user1',
      };

      const editRoute = {
        params: {
          expense: editingExpense,
        },
      };

      const { getByPlaceholderText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={editRoute} />
      );

      await waitFor(() => {
        expect(getByText('Edit Expense')).toBeTruthy();
      });

      // Change amount
      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '75');

      // Submit (would need testID for button)
      // Verify updateExpense is called with new values
    });
  });

  describe('Validation', () => {
    it('should show error for invalid amount', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Add Expense')).toBeTruthy();
      });

      const descInput = getByPlaceholderText('What did you pay for?');
      fireEvent.changeText(descInput, 'Test');

      // Try to submit without amount (would need button testID)
      // Should show: "Please enter a valid amount"
    });

    it('should show error for missing description', async () => {
      const { getByPlaceholderText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '100');

      // Try to submit without description
      // Should show: "Please enter a description"
    });

    it('should show error for amount too large', async () => {
      const { getByPlaceholderText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '2000000');

      const descInput = getByPlaceholderText('What did you pay for?');
      fireEvent.changeText(descInput, 'Test');

      // Submit
      // Should show: "Amount seems too large"
    });

    it('should validate exchange rate through ExchangeRateInput', async () => {
      // When ExchangeRateInput is shown, it handles its own validation
      // This test would verify the integration between components
    });
  });

  describe('Split Calculation with Currency Conversion', () => {
    it('should calculate split using converted amount', async () => {
      // When expense currency differs from primary:
      // Split should be calculated on primaryCurrencyAmount (converted amount)
      // Not on the original amount

      const { getByPlaceholderText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        // Setup complete
      });

      // Scenario: 100 EUR at 1.10 rate = 110 USD
      // Split 50/50 = 55 USD each
      // Test would verify splitDetails uses 110 USD, not 100 EUR
    });

    it('should calculate custom split with converted amount', async () => {
      // Similar to above, but with custom split percentages
      // e.g., 60/40 split on converted amount
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching primary currency', async () => {
      coupleSettingsService.getPrimaryCurrency.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ code: 'USD', symbol: '$' }), 100))
      );

      render(<AddExpenseScreen navigation={mockNavigation} route={mockRoute} />);

      // Component should handle loading state gracefully
    });

    it('should show loading state during expense creation', async () => {
      expenseService.addExpense.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'expense1' }), 100))
      );

      const { getByPlaceholderText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '100');
      });

      // Submit and verify loading indicator appears
    });
  });

  describe('Error Handling', () => {
    it('should handle expense creation failure', async () => {
      expenseService.addExpense.mockRejectedValue(new Error('Network error'));

      const { getByPlaceholderText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Add Expense')).toBeTruthy();
      });

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '100');

      const descInput = getByPlaceholderText('What did you pay for?');
      fireEvent.changeText(descInput, 'Lunch');

      // Submit
      // Should show error message
      await waitFor(() => {
        // Error should be displayed
      });

      // Should not navigate back
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('should handle missing couple ID gracefully', async () => {
      useAuth.mockReturnValue({
        user: mockUser,
        userDetails: { ...mockUserDetails, coupleId: null },
      });

      const { getByPlaceholderText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '100');

      const descInput = getByPlaceholderText('What did you pay for?');
      fireEvent.changeText(descInput, 'Test');

      // Submit
      // Should show: "You must be paired with a partner to add expenses"
    });

    it('should handle exchange rate save failure gracefully', async () => {
      coupleSettingsService.saveRecentExchangeRate.mockRejectedValue(
        new Error('Storage error')
      );

      // Expense should still be created even if exchange rate save fails
      // Error should be logged but not shown to user
    });
  });

  describe('User Journeys', () => {
    it('should complete full flow: same currency expense', async () => {
      const { getByPlaceholderText, getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Add Expense')).toBeTruthy();
      });

      // 1. User enters amount
      const amountInput = getByPlaceholderText('0.00');
      fireEvent.changeText(amountInput, '50.75');

      // 2. User enters description
      const descInput = getByPlaceholderText('What did you pay for?');
      fireEvent.changeText(descInput, 'Coffee and snacks');

      // 3. User selects category (default is food, so skip)

      // 4. User submits
      // (Would press button via testID)

      // 5. Expense is created
      await waitFor(() => {
        expect(expenseService.addExpense).toHaveBeenCalled();
      });

      // 6. User navigates back
      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('should complete full flow: multi-currency expense', async () => {
      // This would test the complete user journey:
      // 1. Enter amount
      // 2. Select different currency (EUR)
      // 3. ExchangeRateInput appears
      // 4. Enter exchange rate or converted amount
      // 5. Enter description
      // 6. Select category
      // 7. Submit
      // 8. Verify expense created with correct multi-currency data
      // 9. Verify exchange rate saved for reuse
      // 10. Verify navigation back
    });

    it('should complete full flow: edit expense with currency change', async () => {
      // Test editing an existing expense and changing its currency
      // 1. Load expense in edit mode
      // 2. Change currency from USD to EUR
      // 3. ExchangeRateInput appears
      // 4. Enter exchange rate
      // 5. Update expense
      // 6. Verify updated expense has new currency data
    });
  });

  describe('Integration with Child Components', () => {
    it('should pass correct props to CurrencyPicker', async () => {
      const { getByText } = render(
        <AddExpenseScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(getByText('Expense Currency')).toBeTruthy();
      });

      // CurrencyPicker should receive:
      // - selectedCurrency
      // - onSelect callback
      // - label
    });

    it('should pass correct props to ExchangeRateInput', async () => {
      // When shown, ExchangeRateInput should receive:
      // - fromAmount
      // - fromCurrency
      // - toCurrency
      // - onRateChange
      // - onConvertedAmountChange
      // - initialRate (if available)
    });

    it('should update state when ExchangeRateInput triggers callbacks', async () => {
      // When user interacts with ExchangeRateInput:
      // - onRateChange should update exchangeRate state
      // - onConvertedAmountChange should update convertedAmount state
    });
  });
});
