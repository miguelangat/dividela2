# Test Fixtures for Bank Import

This directory contains sample bank statement files for testing the import functionality.

## CSV Files

### sample-bank-statement.csv
A basic bank statement with:
- Date, Description, Amount columns
- 10 sample transactions
- Various merchant types (restaurants, groceries, utilities, etc.)

### sample-debit-credit.csv
A bank statement with separate debit/credit columns:
- Transaction Date, Description, Debit, Credit, Balance columns
- 8 sample transactions
- Mix of debits and credits
- Running balance column

## Usage

These files can be used to test the import functionality:

1. **Manual Testing**: Upload these files through the Import Expenses screen
2. **Automated Testing**: Reference these files in integration tests
3. **Demo**: Show how the import feature works

## Expected Results

When importing these files, the app should:
- Correctly parse all transactions
- Auto-detect column mappings
- Suggest appropriate categories based on merchant names
- Handle different date formats
- Calculate amounts correctly
- Skip credit transactions if configured

## Creating Additional Fixtures

To create new test fixtures:
1. Export a real bank statement (anonymized)
2. Ensure it has standard columns (Date, Description, Amount)
3. Save as CSV with UTF-8 encoding
4. Add to this directory with a descriptive name
