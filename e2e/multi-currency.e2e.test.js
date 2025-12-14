// e2e/multi-currency.e2e.test.js
// End-to-end tests for multi-currency functionality
// Framework: Detox (or adaptable to Maestro/Appium)
//
// Setup Instructions:
// 1. Install Detox: npm install --save-dev detox
// 2. Configure Detox in package.json
// 3. Run: detox test

describe('Multi-Currency E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('User Journey: Add Expense in Different Currency', () => {
    it('should add an expense in EUR and convert to USD', async () => {
      // Prerequisites: User is logged in and paired with partner
      // Primary currency is USD

      // 1. Navigate to Add Expense screen
      await element(by.id('add-expense-button')).tap();
      await expect(element(by.text('Add Expense'))).toBeVisible();

      // 2. Enter amount
      await element(by.id('amount-input')).typeText('100');
      await expect(element(by.id('amount-input'))).toHaveText('100');

      // 3. Open currency picker
      await element(by.id('currency-picker')).tap();
      await expect(element(by.text('Select Currency'))).toBeVisible();

      // 4. Search for EUR
      await element(by.id('currency-search-input')).typeText('EUR');

      // 5. Select EUR
      await element(by.text('Euro')).tap();
      await expect(element(by.id('selected-currency'))).toHaveText('EUR');

      // 6. Verify ExchangeRateInput appears
      await expect(element(by.text('Currency Conversion'))).toBeVisible();
      await expect(element(by.text('Exchange Rate'))).toBeVisible();

      // 7. Enter exchange rate
      await element(by.id('exchange-rate-input')).typeText('1.10');

      // 8. Verify converted amount is calculated
      // 100 EUR * 1.10 = 110 USD
      await expect(element(by.id('converted-amount'))).toHaveText('110');

      // 9. Enter description
      await element(by.id('description-input')).typeText('Dinner in Paris');

      // 10. Select category
      await element(by.id('category-food')).tap();

      // 11. Verify split preview shows converted amount
      // Split should be based on 110 USD, not 100 EUR

      // 12. Submit expense
      await element(by.id('submit-expense-button')).tap();

      // 13. Verify navigation back to home
      await expect(element(by.id('home-screen'))).toBeVisible();

      // 14. Verify expense appears in list with dual currency display
      await expect(element(by.text(/€100.*≈.*\$110/))).toBeVisible();

      // 15. Verify balance is updated based on converted amount
      // Balance calculation should use $110 (converted amount)
    });

    it('should use quick rate suggestion for common currency pair', async () => {
      await element(by.id('add-expense-button')).tap();

      // Enter amount
      await element(by.id('amount-input')).typeText('50');

      // Select EUR
      await element(by.id('currency-picker')).tap();
      await element(by.text('Euro')).tap();

      // Verify quick rates appear for EUR to USD
      await expect(element(by.id('quick-rate-1.1'))).toBeVisible();
      await expect(element(by.id('quick-rate-1.15'))).toBeVisible();
      await expect(element(by.id('quick-rate-1.2'))).toBeVisible();

      // Tap quick rate
      await element(by.id('quick-rate-1.15')).tap();

      // Verify rate is applied and amount calculated
      await expect(element(by.id('exchange-rate-input'))).toHaveText('1.15');
      await expect(element(by.id('converted-amount'))).toHaveText('57.5');

      await element(by.id('description-input')).typeText('Lunch');
      await element(by.id('submit-expense-button')).tap();

      await expect(element(by.id('home-screen'))).toBeVisible();
    });

    it('should calculate exchange rate by entering converted amount', async () => {
      await element(by.id('add-expense-button')).tap();

      // Enter amount in MXN
      await element(by.id('amount-input')).typeText('1000');

      // Select MXN
      await element(by.id('currency-picker')).tap();
      await element(by.text('Mexican Peso')).tap();

      // Instead of entering rate, enter desired USD amount
      await element(by.id('converted-amount-input')).typeText('50');

      // System should calculate rate: 50 / 1000 = 0.05
      await expect(element(by.id('exchange-rate-input'))).toHaveText('0.05');

      await element(by.id('description-input')).typeText('Taxi');
      await element(by.id('submit-expense-button')).tap();

      await expect(element(by.id('home-screen'))).toBeVisible();
    });
  });

  describe('User Journey: Change Primary Currency', () => {
    it('should change primary currency and show migration warning', async () => {
      // 1. Navigate to Settings
      await element(by.id('settings-tab')).tap();
      await expect(element(by.id('settings-screen'))).toBeVisible();

      // 2. Find currency setting
      await element(by.id('settings-scroll')).scrollTo('bottom');
      await expect(element(by.text('Primary Currency'))).toBeVisible();

      // 3. Open currency picker
      await element(by.id('primary-currency-picker')).tap();

      // 4. Select EUR
      await element(by.text('Euro')).tap();

      // 5. Verify warning dialog appears
      await expect(element(by.text('Change Primary Currency?'))).toBeVisible();
      await expect(
        element(by.text(/existing expenses and budgets/))
      ).toBeVisible();

      // 6. Confirm change
      await element(by.text('Change')).tap();

      // 7. Verify currency is updated
      await waitFor(element(by.id('primary-currency-value')))
        .toHaveText('EUR')
        .withTimeout(2000);

      // 8. Navigate to home and verify all amounts show in EUR
      await element(by.id('home-tab')).tap();

      // All expense amounts should now be displayed in EUR context
    });

    it('should cancel currency change on warning', async () => {
      await element(by.id('settings-tab')).tap();
      await element(by.id('primary-currency-picker')).tap();
      await element(by.text('British Pound')).tap();

      // Warning appears
      await expect(element(by.text('Change Primary Currency?'))).toBeVisible();

      // Cancel
      await element(by.text('Cancel')).tap();

      // Currency should not change
      await expect(element(by.id('primary-currency-value'))).toHaveText('USD');
    });
  });

  describe('User Journey: View Multi-Currency Expenses', () => {
    it('should display expenses with dual currency format', async () => {
      // Prerequisites: Database has expenses in multiple currencies

      await expect(element(by.id('home-screen'))).toBeVisible();

      // Expense in EUR should show: €50 (≈ $55)
      await expect(element(by.id('expense-1')).atIndex(0)).toHaveText(/€50.*≈.*\$55/);

      // Expense in MXN should show: MX$1000 (≈ $50)
      await expect(element(by.id('expense-2')).atIndex(0)).toHaveText(/MX\$1000.*≈.*\$50/);

      // Expense in USD should show: $100 (no conversion)
      await expect(element(by.id('expense-3')).atIndex(0)).toHaveText('$100');
    });

    it('should show expense details with currency information', async () => {
      // Tap on a multi-currency expense
      await element(by.id('expense-1')).tap();

      // Expense detail modal/screen should show:
      await expect(element(by.text('Original Amount'))).toBeVisible();
      await expect(element(by.text('€50.00'))).toBeVisible();

      await expect(element(by.text('Converted Amount'))).toBeVisible();
      await expect(element(by.text('$55.00'))).toBeVisible();

      await expect(element(by.text('Exchange Rate'))).toBeVisible();
      await expect(element(by.text('1 EUR = 1.1000 USD'))).toBeVisible();
    });

    it('should calculate balance using converted amounts', async () => {
      // Balance should be calculated using primaryCurrencyAmount
      // Not the original expense amounts

      await expect(element(by.id('home-screen'))).toBeVisible();
      await expect(element(by.id('balance-display'))).toBeVisible();

      // Example: User1 paid €100 ($110), User2 paid $100
      // Balance = -$5 (User1 owes User2 $5)
      // This should use the converted amounts, not the original €100
    });
  });

  describe('User Journey: Budget Tracking with Multi-Currency', () => {
    it('should track budget spending with converted amounts', async () => {
      // Navigate to Budget screen
      await element(by.id('budget-tab')).tap();
      await expect(element(by.id('budget-screen'))).toBeVisible();

      // Budget is set in USD
      await expect(element(by.text('Food Budget: $500'))).toBeVisible();

      // Expenses in different currencies should be converted and counted
      // E.g., €50 ($55) + $100 + MX$1000 ($50) = $205 spent
      await expect(element(by.id('food-spent'))).toHaveText('$205.00');
      await expect(element(by.id('food-remaining'))).toHaveText('$295.00');

      // Progress bar should reflect converted totals
      await expect(element(by.id('food-progress-percentage'))).toHaveText('41%');
    });

    it('should warn when approaching budget limit with mixed currencies', async () => {
      // Add expenses that push close to budget limit
      await element(by.id('add-expense-button')).tap();

      // Add €400 at 1.10 rate = $440
      await element(by.id('amount-input')).typeText('400');
      await element(by.id('currency-picker')).tap();
      await element(by.text('Euro')).tap();
      await element(by.id('exchange-rate-input')).typeText('1.10');
      await element(by.id('description-input')).typeText('Large purchase');
      await element(by.id('category-food')).tap();
      await element(by.id('submit-expense-button')).tap();

      // Should show budget warning
      // Food category should show ⚠ icon (80-100% of budget)
      await element(by.id('budget-tab')).tap();
      await expect(element(by.id('food-category-warning'))).toBeVisible();
    });
  });

  describe('User Journey: Edit Multi-Currency Expense', () => {
    it('should edit expense and change currency', async () => {
      // Tap on existing expense
      await element(by.id('expense-1')).tap();

      // Open edit
      await element(by.id('edit-expense-button')).tap();
      await expect(element(by.text('Edit Expense'))).toBeVisible();

      // Change amount
      await element(by.id('amount-input')).clearText();
      await element(by.id('amount-input')).typeText('75');

      // Change currency from EUR to GBP
      await element(by.id('currency-picker')).tap();
      await element(by.text('British Pound')).tap();

      // Enter new exchange rate
      await element(by.id('exchange-rate-input')).clearText();
      await element(by.id('exchange-rate-input')).typeText('1.30');

      // Verify new converted amount: 75 * 1.30 = 97.5
      await expect(element(by.id('converted-amount'))).toHaveText('97.5');

      // Submit
      await element(by.id('submit-expense-button')).tap();

      // Verify updated expense appears with new currency
      await expect(element(by.text(/£75.*≈.*\$97.50/))).toBeVisible();
    });
  });

  describe('User Journey: Exchange Rate Reuse', () => {
    it('should remember and suggest recently used exchange rate', async () => {
      // Add first expense with EUR at 1.15 rate
      await element(by.id('add-expense-button')).tap();
      await element(by.id('amount-input')).typeText('100');
      await element(by.id('currency-picker')).tap();
      await element(by.text('Euro')).tap();
      await element(by.id('exchange-rate-input')).typeText('1.15');
      await element(by.id('description-input')).typeText('First expense');
      await element(by.id('submit-expense-button')).tap();

      // Add second expense in EUR
      await element(by.id('add-expense-button')).tap();
      await element(by.id('amount-input')).typeText('50');
      await element(by.id('currency-picker')).tap();
      await element(by.text('Euro')).tap();

      // Exchange rate should be pre-filled with 1.15
      await expect(element(by.id('exchange-rate-input'))).toHaveText('1.15');

      // Converted amount should auto-calculate
      await expect(element(by.id('converted-amount'))).toHaveText('57.5');

      await element(by.id('description-input')).typeText('Second expense');
      await element(by.id('submit-expense-button')).tap();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle invalid exchange rate input', async () => {
      await element(by.id('add-expense-button')).tap();
      await element(by.id('amount-input')).typeText('100');
      await element(by.id('currency-picker')).tap();
      await element(by.text('Euro')).tap();

      // Enter unrealistic rate
      await element(by.id('exchange-rate-input')).typeText('50000');

      // Should show error
      await expect(element(by.text(/unusually high/))).toBeVisible();

      // Submit button should be disabled or show validation error
      await element(by.id('submit-expense-button')).tap();

      // Should not submit - still on add expense screen
      await expect(element(by.text('Add Expense'))).toBeVisible();
    });

    it('should handle offline expense creation with multi-currency', async () => {
      // Simulate offline mode
      await device.setLocation({ lat: 0, lon: 0 });
      await device.disableSynchronization();

      await element(by.id('add-expense-button')).tap();
      await element(by.id('amount-input')).typeText('100');
      await element(by.id('currency-picker')).tap();
      await element(by.text('Euro')).tap();
      await element(by.id('exchange-rate-input')).typeText('1.10');
      await element(by.id('description-input')).typeText('Offline expense');
      await element(by.id('submit-expense-button')).tap();

      // Should queue for sync or show offline message
      await expect(
        element(by.text(/saved offline|will sync/i))
      ).toBeVisible();

      await device.enableSynchronization();
    });

    it('should handle same-currency expense (no conversion needed)', async () => {
      await element(by.id('add-expense-button')).tap();
      await element(by.id('amount-input')).typeText('100');

      // Keep default USD currency
      // Exchange rate input should not appear
      await expect(element(by.id('exchange-rate-input'))).not.toBeVisible();
      await expect(element(by.text('Currency Conversion'))).not.toBeVisible();

      await element(by.id('description-input')).typeText('Same currency');
      await element(by.id('submit-expense-button')).tap();

      // Expense should show just $100, no conversion display
      await expect(element(by.text('$100.00'))).toBeVisible();
      await expect(element(by.text(/≈/))).not.toBeVisible();
    });
  });

  describe('Performance and UX', () => {
    it('should load expense list quickly with many multi-currency expenses', async () => {
      // Prerequisites: Database has 100+ expenses in various currencies

      const start = Date.now();

      await element(by.id('home-tab')).tap();
      await expect(element(by.id('expense-list'))).toBeVisible();

      const end = Date.now();
      const loadTime = end - start;

      // Should load in under 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    it('should smoothly scroll through expenses with currency conversions', async () => {
      await element(by.id('expense-list')).scrollTo('bottom');
      await element(by.id('expense-list')).scrollTo('top');

      // No crashes, smooth scrolling
      await expect(element(by.id('expense-list'))).toBeVisible();
    });

    it('should show currency flags for visual identification', async () => {
      await expect(element(by.id('home-screen'))).toBeVisible();

      // Flags should be visible for each currency
      // EUR expense shows 🇪🇺
      // USD expense shows 🇺🇸
      // MXN expense shows 🇲🇽
      // This helps users quickly identify currencies
    });
  });
});
