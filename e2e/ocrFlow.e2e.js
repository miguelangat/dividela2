/**
 * End-to-End Tests for OCR Receipt Scanning Feature
 *
 * Tests the complete user flow from camera to expense creation
 */

describe('E2E: OCR Receipt Scanning', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { camera: 'YES', photos: 'YES' },
      newInstance: true,
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Happy Path: Scan → Suggest → Accept → Save', () => {
    it('should complete full OCR flow and create expense', async () => {
      // Step 1: Navigate to Add Expense screen
      await element(by.id('add-expense-tab')).tap();
      await expect(element(by.id('add-expense-screen'))).toBeVisible();

      // Step 2: Tap scan receipt button
      await element(by.id('scan-receipt-button')).tap();

      // Step 3: Wait for camera to open (or image picker in test)
      // Note: In test environment, this might use a mock camera or image picker
      await waitFor(element(by.id('camera-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Step 4: Simulate taking a photo (in real test, use actual camera)
      // For now, we'll use a test button that simulates OCR with known data
      await element(by.id('use-test-receipt-button')).tap();

      // Step 5: Verify processing banner appears
      await waitFor(element(by.id('ocr-processing-banner')))
        .toBeVisible()
        .withTimeout(2000);

      await expect(element(by.text('Processing receipt...'))).toBeVisible();

      // Step 6: Wait for OCR to complete and suggestions to appear
      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);

      // Step 7: Verify suggestion card shows expected data
      await expect(element(by.id('ocr-amount'))).toBeVisible();
      await expect(element(by.id('ocr-merchant'))).toBeVisible();
      await expect(element(by.id('ocr-category'))).toBeVisible();
      await expect(element(by.id('ocr-date'))).toBeVisible();

      // Step 8: Verify confidence indicator
      await expect(element(by.id('ocr-confidence-badge'))).toBeVisible();

      // Step 9: Accept the suggestions
      await element(by.id('ocr-accept-button')).tap();

      // Step 10: Verify form is pre-filled
      await expect(element(by.id('amount-input'))).toHaveText('49.14');
      await expect(element(by.id('description-input'))).toHaveText('WALMART');

      // Step 11: Select who paid (required field)
      await element(by.id('paid-by-picker')).tap();
      await element(by.text('Me')).tap();

      // Step 12: Save the expense
      await element(by.id('save-expense-button')).tap();

      // Step 13: Verify success message
      await waitFor(element(by.text('Expense added successfully')))
        .toBeVisible()
        .withTimeout(5000);

      // Step 14: Verify we're back on the home screen
      await expect(element(by.id('home-screen'))).toBeVisible();

      // Step 15: Verify expense appears in the list
      await expect(element(by.text('WALMART'))).toBeVisible();
      await expect(element(by.text('$49.14'))).toBeVisible();
    }, 60000);

    it('should allow editing OCR suggestions before saving', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);

      // Accept suggestions
      await element(by.id('ocr-accept-button')).tap();

      // Edit the amount
      await element(by.id('amount-input')).clearText();
      await element(by.id('amount-input')).typeText('55.00');

      // Edit the description
      await element(by.id('description-input')).clearText();
      await element(by.id('description-input')).typeText('Walmart Groceries');

      // Change category
      await element(by.id('category-picker')).tap();
      await element(by.text('Food & Dining')).tap();

      // Save
      await element(by.id('paid-by-picker')).tap();
      await element(by.text('Me')).tap();
      await element(by.id('save-expense-button')).tap();

      // Verify edited expense was saved
      await waitFor(element(by.text('Expense added successfully')))
        .toBeVisible()
        .withTimeout(5000);

      await expect(element(by.text('Walmart Groceries'))).toBeVisible();
      await expect(element(by.text('$55.00'))).toBeVisible();
    }, 60000);

    it('should show alternative category suggestions', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);

      // Verify alternative categories are shown
      await expect(element(by.id('alternative-categories'))).toBeVisible();

      // Tap an alternative category
      await element(by.id('alternative-category-0')).tap();

      // Verify it's now selected
      await expect(element(by.id('alternative-category-0'))).toHaveToggleValue(true);

      // Accept with alternative category
      await element(by.id('ocr-accept-button')).tap();

      // Verify form has the alternative category selected
      // (Category picker should show the alternative)
      await element(by.id('paid-by-picker')).tap();
      await element(by.text('Me')).tap();
      await element(by.id('save-expense-button')).tap();

      await waitFor(element(by.text('Expense added successfully')))
        .toBeVisible()
        .withTimeout(5000);
    }, 60000);
  });

  describe('Error Handling: OCR Failure → Manual Entry', () => {
    it('should fallback to manual entry on OCR failure', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();

      // Use a test button that simulates OCR failure
      await element(by.id('use-failing-receipt-button')).tap();

      // Verify error banner appears
      await waitFor(element(by.id('ocr-processing-banner')))
        .toBeVisible()
        .withTimeout(15000);

      await expect(element(by.text(/OCR processing failed|Could not process receipt/i))).toBeVisible();

      // Verify error allows dismissal
      await element(by.id('ocr-banner-dismiss-button')).tap();

      // Verify manual entry form is accessible
      await expect(element(by.id('amount-input'))).toBeVisible();
      await expect(element(by.id('description-input'))).toBeVisible();

      // User can still create expense manually
      await element(by.id('amount-input')).typeText('35.00');
      await element(by.id('description-input')).typeText('Manual Entry');
      await element(by.id('category-picker')).tap();
      await element(by.text('Groceries')).tap();
      await element(by.id('paid-by-picker')).tap();
      await element(by.text('Me')).tap();
      await element(by.id('save-expense-button')).tap();

      await waitFor(element(by.text('Expense added successfully')))
        .toBeVisible()
        .withTimeout(5000);
    }, 60000);

    it('should handle low confidence gracefully', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();

      // Use a receipt that returns low confidence
      await element(by.id('use-low-confidence-receipt-button')).tap();

      await waitFor(element(by.id('ocr-processing-banner')))
        .toBeVisible()
        .withTimeout(15000);

      // Should show completion but indicate low confidence
      await expect(element(by.text(/Processing complete|below our confidence threshold/i))).toBeVisible();

      // Dismiss and use manual entry
      await element(by.id('ocr-banner-dismiss-button')).tap();

      // Form should be empty (no pre-fill for low confidence)
      await expect(element(by.id('amount-input'))).toHaveText('');
      await expect(element(by.id('description-input'))).toHaveText('');
    }, 60000);

    it('should handle network interruption during upload', async () => {
      // Disable network
      await device.setURLBlacklist(['.*']);

      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      // Should show error about network
      await waitFor(element(by.text(/Network error|Upload failed/i)))
        .toBeVisible()
        .withTimeout(10000);

      // Re-enable network
      await device.setURLBlacklist([]);

      // User can retry
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      // Should succeed now
      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);
    }, 60000);
  });

  describe('Merchant Alias Creation', () => {
    it('should create merchant alias from suggestion card', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);

      // Tap the pencil icon to create alias
      await element(by.id('ocr-create-alias-button')).tap();

      // Verify alias dialog appears
      await waitFor(element(by.id('alias-dialog')))
        .toBeVisible()
        .withTimeout(2000);

      // Enter alias name
      await element(by.id('alias-input')).typeText('My Walmart');

      // Save alias
      await element(by.id('alias-save-button')).tap();

      // Verify alias was created (dialog closes)
      await waitFor(element(by.id('alias-dialog')))
        .not.toBeVisible()
        .withTimeout(2000);

      // Verify merchant name updated in suggestion card
      await expect(element(by.text('My Walmart'))).toBeVisible();
    }, 60000);
  });

  describe('Performance & Responsiveness', () => {
    it('should show progress during OCR processing', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-slow-receipt-button')).tap(); // Simulates slow OCR

      // Verify progress indicators
      await expect(element(by.id('ocr-processing-banner'))).toBeVisible();
      await expect(element(by.id('processing-spinner'))).toBeVisible();

      // Should show receipt thumbnail immediately
      await expect(element(by.id('receipt-thumbnail'))).toBeVisible();

      // Wait for completion
      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(20000);
    }, 30000);

    it('should allow dismissing suggestions and starting over', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);

      // Dismiss suggestions
      await element(by.id('ocr-dismiss-button')).tap();

      // Verify suggestion card is gone
      await expect(element(by.id('ocr-suggestion-card'))).not.toBeVisible();

      // Can scan another receipt
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);
    }, 60000);
  });

  describe('Integration with Existing Features', () => {
    it('should work with split expense feature', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);

      await element(by.id('ocr-accept-button')).tap();

      // Enable split
      await element(by.id('split-toggle')).tap();

      // Adjust split
      await element(by.id('split-slider')).swipe('right', 'slow');

      // Save with split
      await element(by.id('paid-by-picker')).tap();
      await element(by.text('Me')).tap();
      await element(by.id('save-expense-button')).tap();

      await waitFor(element(by.text('Expense added successfully')))
        .toBeVisible()
        .withTimeout(5000);
    }, 60000);

    it('should record OCR feedback when saving', async () => {
      await element(by.id('add-expense-tab')).tap();
      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);

      // Accept and modify
      await element(by.id('ocr-accept-button')).tap();
      await element(by.id('amount-input')).replaceText('50.00');

      // Save
      await element(by.id('paid-by-picker')).tap();
      await element(by.text('Me')).tap();
      await element(by.id('save-expense-button')).tap();

      await waitFor(element(by.text('Expense added successfully')))
        .toBeVisible()
        .withTimeout(5000);

      // Feedback should be recorded in background (we can't verify directly in E2E)
      // But we can verify no errors occurred
      await expect(element(by.text('Error'))).not.toBeVisible();
    }, 60000);
  });

  describe('Accessibility', () => {
    it('should be accessible with screen reader', async () => {
      await element(by.id('add-expense-tab')).tap();

      // Verify scan button has accessibility label
      await expect(element(by.label('Scan receipt with camera'))).toBeVisible();

      await element(by.id('scan-receipt-button')).tap();
      await element(by.id('use-test-receipt-button')).tap();

      await waitFor(element(by.id('ocr-suggestion-card')))
        .toBeVisible()
        .withTimeout(15000);

      // Verify suggestion card elements have accessibility labels
      await expect(element(by.label(/Amount.*\$/i))).toBeVisible();
      await expect(element(by.label(/Merchant/i))).toBeVisible();
      await expect(element(by.label(/Accept.*suggestions/i))).toBeVisible();
      await expect(element(by.label(/Dismiss.*suggestions/i))).toBeVisible();
    }, 60000);
  });
});

describe('E2E: Merchant Alias Management', () => {
  it('should manage aliases from settings', async () => {
    // Navigate to settings
    await element(by.id('settings-tab')).tap();

    // Scroll to merchant aliases section
    await element(by.id('settings-scroll-view')).scrollTo('bottom');

    // Tap merchant aliases
    await element(by.id('merchant-aliases-button')).tap();

    // Verify alias manager screen
    await waitFor(element(by.id('alias-manager-screen')))
      .toBeVisible()
      .withTimeout(2000);

    // Create new alias
    await element(by.id('add-alias-button')).tap();
    await element(by.id('ocr-merchant-input')).typeText('WLMRT');
    await element(by.id('user-alias-input')).typeText('Walmart');
    await element(by.id('save-alias-button')).tap();

    // Verify alias appears in list
    await expect(element(by.text('WLMRT → Walmart'))).toBeVisible();

    // Close alias manager
    await element(by.id('close-alias-manager-button')).tap();
  }, 30000);
});
