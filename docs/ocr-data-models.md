# OCR Feature Data Models Documentation

This document describes the Firestore data models and security rules for the OCR (Optical Character Recognition) receipt scanning feature.

## Table of Contents
- [Overview](#overview)
- [Collections](#collections)
  - [Expenses Collection (Updated)](#expenses-collection-updated)
  - [Merchant Aliases Collection](#merchant-aliases-collection)
  - [OCR Learning Data Collection](#ocr-learning-data-collection)
- [Storage Structure](#storage-structure)
- [Security Rules](#security-rules)
- [Migration Notes](#migration-notes)
- [Best Practices](#best-practices)

## Overview

The OCR feature allows users to scan receipts and automatically extract expense information. The system learns from user corrections to improve accuracy over time, especially for merchant name recognition.

### Key Features
- Automatic extraction of amount, merchant, date, and category from receipt images
- Merchant name learning and normalization
- OCR correction feedback loop for continuous improvement
- Couple-specific merchant aliases
- Receipt image storage with proper security

## Collections

### Expenses Collection (Updated)

The existing expenses collection has been extended to support OCR-sourced data.

**Collection Name:** `expenses`

#### Existing Schema
```javascript
{
  // Core fields (existing)
  coupleId: string,          // Reference to couple
  paidBy: string,            // User ID who paid
  amount: number,            // Expense amount
  description: string,       // Expense description
  category: string,          // Category name
  categoryKey: string,       // Category key for consistency
  date: Timestamp,           // Date of expense

  // Split details (existing)
  splitDetails: {
    user1Amount: number,
    user2Amount: number,
    user1Percentage: number,
    user2Percentage: number
  },

  // Additional fields (existing)
  notes: string,             // Optional notes
  settledAt: Timestamp,      // Settlement timestamp (if settled)
  settledBySettlementId: string, // Settlement reference

  // Timestamps (existing)
  createdAt: Timestamp,      // Auto-generated on create
  updatedAt: Timestamp       // Auto-generated on update
}
```

#### New OCR-Related Fields
```javascript
{
  // OCR-specific fields (NEW)
  receiptImageUrl: string,        // Firebase Storage URL for receipt image
  receiptImagePath: string,       // Storage path: /receipts/{coupleId}/{receiptId}

  // OCR extraction data
  ocrData: {
    rawText: string,              // Raw OCR text extracted
    extractedAmount: number,      // Amount extracted by OCR
    extractedMerchant: string,    // Merchant name extracted by OCR
    extractedDate: Timestamp,     // Date extracted by OCR
    extractedCategory: string,    // Suggested category from OCR
    confidence: number,           // OCR confidence score (0-1)
    processedAt: Timestamp,       // When OCR processing completed
    processingStatus: string      // 'pending' | 'success' | 'failed'
  },

  // User corrections tracking
  ocrCorrected: boolean,          // Whether user corrected OCR results
  ocrCorrectedFields: string[],   // List of fields user corrected ['amount', 'merchant', etc.]

  // Source tracking
  sourceType: string              // 'manual' | 'ocr' | 'ocr_corrected'
}
```

#### Example Document
```javascript
{
  id: "exp123",
  coupleId: "couple456",
  paidBy: "user789",
  amount: 45.99,
  description: "Starbucks Coffee",
  category: "Food & Dining",
  categoryKey: "food",
  date: Timestamp,

  splitDetails: {
    user1Amount: 22.99,
    user2Amount: 23.00,
    user1Percentage: 50,
    user2Percentage: 50
  },

  // OCR fields
  receiptImageUrl: "https://storage.googleapis.com/...",
  receiptImagePath: "/receipts/couple456/receipt123.jpg",

  ocrData: {
    rawText: "STARBUCKS COFFEE\n123 MAIN ST\nTOTAL: $45.99...",
    extractedAmount: 45.99,
    extractedMerchant: "STARBUCKS COFFEE #12345",
    extractedDate: Timestamp,
    extractedCategory: "food",
    confidence: 0.92,
    processedAt: Timestamp,
    processingStatus: "success"
  },

  ocrCorrected: true,
  ocrCorrectedFields: ["merchant"],
  sourceType: "ocr_corrected",

  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Merchant Aliases Collection

Stores normalized merchant names and their variations to improve OCR accuracy.

**Collection Name:** `merchantAliases`

#### Schema
```javascript
{
  id: string,                    // Auto-generated document ID
  coupleId: string,              // Reference to couple (couple-specific)

  // Merchant information
  canonicalName: string,         // Standardized merchant name (e.g., "Starbucks")
  aliases: string[],             // Variations (e.g., ["STARBUCKS COFFEE", "STARBUCKS #123"])

  // Learning metadata
  useCount: number,              // How many times this alias has been used
  lastUsedAt: Timestamp,         // When this alias was last matched

  // Category association
  suggestedCategory: string,     // Most common category for this merchant
  categoryKey: string,           // Category key for consistency

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string              // User ID who created this alias
}
```

#### Example Document
```javascript
{
  id: "alias123",
  coupleId: "couple456",
  canonicalName: "Starbucks",
  aliases: [
    "STARBUCKS COFFEE",
    "STARBUCKS #12345",
    "STARBUCKS STORE",
    "SBUX"
  ],
  useCount: 15,
  lastUsedAt: Timestamp,
  suggestedCategory: "Food & Dining",
  categoryKey: "food",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "user789"
}
```

#### Usage Pattern
1. When OCR extracts "STARBUCKS COFFEE #67890", the system:
   - Searches merchantAliases for matching aliases
   - Finds the canonical name "Starbucks"
   - Suggests the category "Food & Dining"
   - Increments useCount
   - Updates lastUsedAt

2. When user corrects a merchant name:
   - System creates or updates merchant alias
   - Adds the OCR-extracted name to aliases array
   - Associates with user-selected category

### OCR Learning Data Collection

Stores OCR extraction results and user corrections for continuous improvement.

**Collection Name:** `ocrLearningData`

#### Schema
```javascript
{
  id: string,                    // Auto-generated document ID
  coupleId: string,              // Reference to couple (for privacy)

  // Reference to expense
  expenseId: string,             // Related expense document ID

  // OCR extraction results
  ocrExtraction: {
    rawText: string,             // Full OCR text
    extractedAmount: number,
    extractedMerchant: string,
    extractedDate: Timestamp,
    extractedCategory: string,
    confidence: number
  },

  // User corrections (if any)
  userCorrection: {
    correctedAmount: number,     // null if not corrected
    correctedMerchant: string,   // null if not corrected
    correctedDate: Timestamp,    // null if not corrected
    correctedCategory: string,   // null if not corrected
    correctedFields: string[]    // List of corrected fields
  },

  // Learning metrics
  accuracyScore: number,         // How accurate was OCR (0-1)
  fieldsCorrect: string[],       // Fields that were correct
  fieldsIncorrect: string[],     // Fields that needed correction

  // Metadata
  createdAt: Timestamp,
  createdBy: string,             // User ID who processed the receipt

  // Device/environment info (optional, for debugging)
  deviceInfo: {
    platform: string,            // 'ios' | 'android' | 'web'
    appVersion: string
  }
}
```

#### Example Document
```javascript
{
  id: "learning123",
  coupleId: "couple456",
  expenseId: "exp123",

  ocrExtraction: {
    rawText: "STARBUCKS COFFEE #12345\n123 MAIN ST\nDATE: 01/15/2024\nTOTAL: $45.99",
    extractedAmount: 45.99,
    extractedMerchant: "STARBUCKS COFFEE #12345",
    extractedDate: Timestamp("2024-01-15"),
    extractedCategory: "food",
    confidence: 0.92
  },

  userCorrection: {
    correctedAmount: null,       // Amount was correct
    correctedMerchant: "Starbucks", // User simplified merchant name
    correctedDate: null,         // Date was correct
    correctedCategory: null,     // Category was correct
    correctedFields: ["merchant"]
  },

  accuracyScore: 0.75,           // 3 out of 4 fields correct
  fieldsCorrect: ["amount", "date", "category"],
  fieldsIncorrect: ["merchant"],

  createdAt: Timestamp,
  createdBy: "user789",

  deviceInfo: {
    platform: "ios",
    appVersion: "1.2.0"
  }
}
```

#### Usage Pattern
- Created automatically when an OCR expense is saved (with or without corrections)
- Append-only (no updates or deletes) to maintain audit trail
- Used for analytics and OCR improvement
- Users can read their own couple's data but cannot modify

## Storage Structure

Receipt images are stored in Firebase Storage with the following structure:

### Path Structure
```
/receipts/{coupleId}/{receiptId}.{ext}
```

Example:
```
/receipts/couple456/receipt123.jpg
/receipts/couple456/receipt124.png
```

### Optional: Thumbnails (Future Enhancement)
```
/receipts/{coupleId}/thumbnails/{receiptId}_thumb.jpg
```

### File Constraints
- **Max Size:** 2MB per image
- **Allowed Types:** image/* (jpg, jpeg, png, heic, etc.)
- **Naming:** Use generated IDs to avoid conflicts

## Security Rules

### Firestore Security Rules

#### Merchant Aliases
```javascript
match /merchantAliases/{aliasId} {
  // Users can create, read, update, delete aliases for their couple
  allow create, read, update, delete: if isSignedIn() &&
    userBelongsToCouple(resource.data.coupleId);
}
```

**Key Points:**
- Couple-specific: Users can only access their couple's merchant aliases
- Full CRUD access for couple members
- Validated by coupleId matching user's couple

#### OCR Learning Data
```javascript
match /ocrLearningData/{learningId} {
  // Users can create and read, but NOT update or delete (append-only)
  allow create, read: if isSignedIn() &&
    userBelongsToCouple(resource.data.coupleId);

  allow update, delete: if false; // Maintain audit trail
}
```

**Key Points:**
- Append-only: No updates or deletes allowed
- Maintains complete audit trail
- Couple-specific access
- Used for analytics and improvement

#### Expenses (No Changes Required)
Existing expense rules already support the new OCR fields since they allow any fields to be written by couple members. No changes needed.

### Storage Security Rules

```javascript
match /receipts/{coupleId}/{receiptId} {
  allow read: if isSignedIn() && isCoupleMember(coupleId);

  allow write: if isSignedIn() &&
                  isCoupleMember(coupleId) &&
                  isValidImageType() &&
                  isValidSize(); // Max 2MB

  allow delete: if isSignedIn() && isCoupleMember(coupleId);
}
```

**Key Points:**
- Only couple members can access their receipts
- File type validation: Only images allowed
- Size validation: Max 2MB
- Full control for couple members (upload, read, delete)

## Migration Notes

### Existing Expenses
No migration required. Existing expenses without OCR fields will continue to work normally.

- Old expenses won't have `ocrData`, `receiptImageUrl`, etc.
- App code should handle optional OCR fields gracefully
- New OCR fields are additive, not breaking

### Adding OCR to Existing Infrastructure

1. **Deploy Security Rules First**
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only storage:rules
   ```

2. **Initialize Collections**
   - Collections will be created automatically on first write
   - No manual initialization needed

3. **Backward Compatibility**
   - Expense service already supports arbitrary fields
   - UI components should check for presence of OCR fields:
     ```javascript
     const hasOCR = expense.ocrData !== undefined;
     const hasReceipt = expense.receiptImageUrl !== undefined;
     ```

### Data Validation Checklist
- [ ] Ensure all OCR expenses include `sourceType` field
- [ ] Validate receipt image paths before storage upload
- [ ] Check merchant alias creation for duplicates
- [ ] Verify OCR learning data is append-only

## Best Practices

### 1. Merchant Name Normalization
```javascript
// Good: Create aliases for common variations
{
  canonicalName: "Target",
  aliases: ["TARGET", "TARGET STORE", "TGT", "TARGET #1234"]
}

// Avoid: Too specific or too generic
{
  canonicalName: "Store",  // Too generic
  aliases: ["STORE"]
}
```

### 2. OCR Data Handling
```javascript
// Good: Always preserve raw OCR data
ocrData: {
  rawText: "...", // Keep original text
  extractedAmount: 45.99,
  // ... other fields
}

// Good: Track corrections
ocrCorrected: true,
ocrCorrectedFields: ["merchant", "category"],

// Bad: Losing original OCR data
// Don't overwrite ocrData after user correction
```

### 3. Receipt Image Management
```javascript
// Good: Store both URL and path
{
  receiptImageUrl: "https://...",  // For display
  receiptImagePath: "/receipts/..." // For deletion
}

// Good: Delete image when expense is deleted
async function deleteExpense(expenseId) {
  const expense = await getExpense(expenseId);

  // Delete receipt image if exists
  if (expense.receiptImagePath) {
    await deleteReceiptImage(expense.receiptImagePath);
  }

  // Delete expense
  await deleteDoc(doc(db, 'expenses', expenseId));
}
```

### 4. Error Handling
```javascript
// Good: Handle OCR failures gracefully
try {
  const ocrResult = await processReceipt(imageUri);
  // Use OCR data
} catch (error) {
  // Fall back to manual entry
  console.error('OCR failed:', error);
  // Show manual entry form
}
```

### 5. Privacy Considerations
- OCR learning data is couple-specific (not shared across couples)
- Receipt images are private to couple members only
- Raw OCR text should not contain sensitive information beyond the receipt
- Consider adding option to delete OCR learning data if requested

### 6. Performance Optimization
```javascript
// Good: Load receipt images lazily
// Don't fetch all receipt images when loading expense list
const expenses = await getExpenses(coupleId);
// Only load image when user views expense details

// Good: Use thumbnails for list views (future enhancement)
// Generate thumbnail on upload, display in list

// Bad: Loading all full-size images at once
// This will be slow and use excessive bandwidth
```

### 7. Merchant Alias Management
```javascript
// Good: Update useCount and lastUsedAt when alias matches
async function findMerchantAlias(ocrMerchant, coupleId) {
  const aliases = await getMerchantAliases(coupleId);

  for (const alias of aliases) {
    if (alias.aliases.includes(ocrMerchant)) {
      // Update usage statistics
      await updateDoc(doc(db, 'merchantAliases', alias.id), {
        useCount: increment(1),
        lastUsedAt: serverTimestamp()
      });

      return alias;
    }
  }

  return null;
}
```

## API Usage Examples

### Creating an OCR Expense
```javascript
import { addExpense } from './services/expenseService';
import { uploadReceipt } from './services/storageService';
import { processOCR } from './services/ocrService';

async function createExpenseFromReceipt(imageUri, coupleId, userId) {
  // 1. Upload receipt image
  const { url, path } = await uploadReceipt(imageUri, coupleId);

  // 2. Process OCR
  const ocrResult = await processOCR(imageUri);

  // 3. Find merchant alias (if exists)
  const merchantAlias = await findMerchantAlias(
    ocrResult.extractedMerchant,
    coupleId
  );

  // 4. Create expense with OCR data
  const expense = await addExpense({
    coupleId,
    paidBy: userId,
    amount: ocrResult.extractedAmount,
    description: merchantAlias?.canonicalName || ocrResult.extractedMerchant,
    category: merchantAlias?.suggestedCategory || ocrResult.extractedCategory,
    categoryKey: merchantAlias?.categoryKey || ocrResult.extractedCategory,
    date: ocrResult.extractedDate,

    // OCR fields
    receiptImageUrl: url,
    receiptImagePath: path,
    ocrData: {
      rawText: ocrResult.rawText,
      extractedAmount: ocrResult.extractedAmount,
      extractedMerchant: ocrResult.extractedMerchant,
      extractedDate: ocrResult.extractedDate,
      extractedCategory: ocrResult.extractedCategory,
      confidence: ocrResult.confidence,
      processedAt: serverTimestamp(),
      processingStatus: 'success'
    },

    ocrCorrected: false,
    ocrCorrectedFields: [],
    sourceType: 'ocr',

    splitDetails: calculateSplit(ocrResult.extractedAmount, userId, coupleId)
  });

  return expense;
}
```

### Handling User Corrections
```javascript
async function saveExpenseWithCorrections(expense, corrections, userId) {
  const correctedFields = [];

  // Track which fields were corrected
  if (corrections.amount !== expense.ocrData.extractedAmount) {
    correctedFields.push('amount');
  }
  if (corrections.merchant !== expense.ocrData.extractedMerchant) {
    correctedFields.push('merchant');

    // Create/update merchant alias
    await updateMerchantAlias({
      coupleId: expense.coupleId,
      canonicalName: corrections.merchant,
      ocrVariation: expense.ocrData.extractedMerchant,
      category: corrections.category,
      userId
    });
  }
  // ... check other fields

  // Update expense
  await updateExpense(expense.id, {
    amount: corrections.amount,
    description: corrections.merchant,
    category: corrections.category,
    date: corrections.date,
    ocrCorrected: correctedFields.length > 0,
    ocrCorrectedFields: correctedFields,
    sourceType: correctedFields.length > 0 ? 'ocr_corrected' : 'ocr'
  });

  // Create learning data entry
  await addOCRLearningData({
    coupleId: expense.coupleId,
    expenseId: expense.id,
    ocrExtraction: expense.ocrData,
    userCorrection: {
      correctedAmount: correctedFields.includes('amount') ? corrections.amount : null,
      correctedMerchant: correctedFields.includes('merchant') ? corrections.merchant : null,
      correctedDate: correctedFields.includes('date') ? corrections.date : null,
      correctedCategory: correctedFields.includes('category') ? corrections.category : null,
      correctedFields
    },
    accuracyScore: calculateAccuracy(correctedFields, ['amount', 'merchant', 'date', 'category']),
    fieldsCorrect: ['amount', 'merchant', 'date', 'category'].filter(f => !correctedFields.includes(f)),
    fieldsIncorrect: correctedFields,
    createdBy: userId
  });
}
```

## Summary

This OCR feature implementation provides:

1. **Secure Storage**: Receipt images protected by couple-specific rules
2. **Learning Capability**: Merchant aliases and OCR learning data for continuous improvement
3. **Backward Compatibility**: No changes needed to existing expenses
4. **Privacy**: All data is couple-specific with no cross-couple data sharing
5. **Audit Trail**: Append-only OCR learning data for accountability
6. **Flexible Architecture**: Easy to extend with additional OCR features

The data models are designed to support future enhancements like:
- Thumbnail generation
- Advanced OCR analytics
- ML-based category prediction
- Receipt search and filtering
- Bulk OCR processing
