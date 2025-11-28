/**
 * Sample Expense Data
 * Mock expense objects for testing
 */

module.exports = {
  // Valid expense object
  valid_expense: {
    id: 'exp_123456',
    userId: 'user_abc',
    amount: 23.14,
    category: 'groceries',
    merchant: 'Whole Foods Market',
    date: '2025-11-15T14:23:00Z',
    description: 'Weekly groceries',
    receipt_url: 'https://storage.googleapis.com/bucket/receipts/receipt_123.jpg',
    created_at: '2025-11-15T14:30:00Z',
    updated_at: '2025-11-15T14:30:00Z',
  },

  // Expense with OCR processing metadata
  expense_with_ocr: {
    id: 'exp_789012',
    userId: 'user_def',
    amount: 105.84,
    category: 'dining',
    merchant: 'The Garden Bistro',
    date: '2025-11-18T19:45:00Z',
    description: 'Dinner',
    receipt_url: 'https://storage.googleapis.com/bucket/receipts/receipt_789.jpg',
    ocr_data: {
      raw_text: 'The Garden Bistro...',
      confidence: 0.95,
      extracted_amount: 105.84,
      extracted_merchant: 'The Garden Bistro',
      extracted_date: '2025-11-18T19:45:00Z',
      processed_at: '2025-11-18T20:00:00Z',
    },
    created_at: '2025-11-18T19:50:00Z',
    updated_at: '2025-11-18T20:00:00Z',
  },

  // Minimal expense (required fields only)
  minimal_expense: {
    userId: 'user_ghi',
    amount: 43.27,
    category: 'transportation',
    date: '2025-11-19T08:15:00Z',
  },

  // Expense with manual entry (no receipt)
  manual_expense: {
    id: 'exp_345678',
    userId: 'user_jkl',
    amount: 50.00,
    category: 'utilities',
    merchant: 'Electric Company',
    date: '2025-11-01T00:00:00Z',
    description: 'Monthly electric bill',
    manual_entry: true,
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-11-01T10:00:00Z',
  },

  // Shared expense
  shared_expense: {
    id: 'exp_901234',
    userId: 'user_mno',
    partnerId: 'user_pqr',
    amount: 120.00,
    category: 'groceries',
    merchant: 'Target',
    date: '2025-11-10T16:30:00Z',
    description: 'Shared household items',
    split_type: 'equal',
    split_percentage: 50,
    created_at: '2025-11-10T17:00:00Z',
    updated_at: '2025-11-10T17:00:00Z',
  },

  // Batch of expenses for aggregation testing
  expense_batch: [
    {
      id: 'exp_batch_1',
      userId: 'user_test',
      amount: 25.50,
      category: 'groceries',
      date: '2025-11-01T10:00:00Z',
    },
    {
      id: 'exp_batch_2',
      userId: 'user_test',
      amount: 45.00,
      category: 'dining',
      date: '2025-11-05T18:30:00Z',
    },
    {
      id: 'exp_batch_3',
      userId: 'user_test',
      amount: 100.00,
      category: 'utilities',
      date: '2025-11-10T09:00:00Z',
    },
    {
      id: 'exp_batch_4',
      userId: 'user_test',
      amount: 30.00,
      category: 'transportation',
      date: '2025-11-15T07:45:00Z',
    },
    {
      id: 'exp_batch_5',
      userId: 'user_test',
      amount: 75.00,
      category: 'groceries',
      date: '2025-11-20T14:20:00Z',
    },
  ],

  // Invalid expense examples for validation testing
  invalid_expenses: {
    missing_user_id: {
      amount: 50.00,
      category: 'groceries',
      date: '2025-11-15T10:00:00Z',
    },
    missing_amount: {
      userId: 'user_xyz',
      category: 'groceries',
      date: '2025-11-15T10:00:00Z',
    },
    negative_amount: {
      userId: 'user_xyz',
      amount: -25.00,
      category: 'groceries',
      date: '2025-11-15T10:00:00Z',
    },
    invalid_category: {
      userId: 'user_xyz',
      amount: 50.00,
      category: 'invalid_category_123',
      date: '2025-11-15T10:00:00Z',
    },
    invalid_date: {
      userId: 'user_xyz',
      amount: 50.00,
      category: 'groceries',
      date: 'not-a-valid-date',
    },
  },

  // Expected categories for the app
  valid_categories: [
    'groceries',
    'dining',
    'transportation',
    'utilities',
    'entertainment',
    'healthcare',
    'shopping',
    'other',
  ],
};
