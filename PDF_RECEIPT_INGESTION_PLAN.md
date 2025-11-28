# PDF Receipt Ingestion - Comprehensive Implementation Plan

**Feature**: Add PDF support for receipt scanning in the expense OCR flow

**Created**: 2025-11-20
**Status**: Planning Phase

---

## Executive Summary

Implement PDF receipt ingestion to complement the existing image-based OCR scanning. This enables users to:
- Upload PDF receipts from email attachments
- Scan receipts saved as PDFs
- Process digital receipts (e.g., e-commerce, SaaS subscriptions)
- Handle multi-page itemized receipts

**Key Distinction**: Bank import PDFs are structured documents with transaction tables. Receipt PDFs are unstructured single-purchase documents requiring different parsing strategies.

---

## Current State Analysis

### ✅ Existing Infrastructure

**PDF Parsing (Bank Imports)**:
- `src/utils/pdfParser.js` - Node.js PDF parsing with `pdf-parse`
- `src/utils/pdfParserWeb.js` - Browser PDF parsing with `pdfjs-dist`
- Transaction extraction patterns for structured data
- Multi-page support

**OCR System**:
- `src/services/ocrService.js` - Background scanning service
- `src/utils/imageCompression.js` - Image optimization
- `functions/src/ocr/` - Cloud Functions for OCR processing
- Google Cloud Vision API integration
- ML-based category prediction
- Merchant normalization

**File Handling**:
- `expo-image-picker` - Camera and gallery access
- `expo-document-picker` - Document selection (installed but not used for receipts)
- `expo-file-system` - File I/O operations
- Firebase Storage - Cloud storage

### ❌ Missing Components

1. **File type detection** - Identify PDF vs image receipts
2. **PDF-to-image conversion** - For scanned receipts
3. **Direct text extraction** - For digital PDFs
4. **Receipt parsing patterns** - Different from bank statements
5. **Multi-format file picker** - Support PDF + images
6. **PDF upload handling** - Backend functions
7. **Page rendering** - Convert PDF pages to images for Vision API

---

## Technical Approach

### Architecture Decision: Hybrid Strategy

**Two PDF Types Require Different Handling**:

1. **Digital/Text-Based PDFs** (e.g., Amazon receipts, SaaS invoices)
   - Extract text directly from PDF
   - Parse using receipt patterns
   - No OCR needed → faster processing
   - Example: Online purchase confirmations

2. **Scanned/Image-Based PDFs** (e.g., paper receipts scanned as PDF)
   - Render PDF pages as images
   - Send images to Vision API for OCR
   - Use existing ML pipeline
   - Example: Restaurant receipts scanned with phone

### Detection Strategy

```javascript
// Detect PDF type by analyzing text content
const pdfData = await parsePDF(pdfBuffer);

if (pdfData.text && pdfData.text.length > 100) {
  // Digital PDF - has extractable text
  return 'text-based';
} else if (pdfData.text && pdfData.text.length < 100) {
  // Scanned PDF - minimal/no text
  return 'image-based';
} else {
  // Unknown - treat as image-based for safety
  return 'image-based';
}
```

---

## Implementation Plan

### Phase 1: Core PDF Receipt Parsing (P0 - Critical)

**Objective**: Extract receipt data from text-based PDFs

**Files to Create/Modify**:

1. **`src/utils/receiptPdfParser.js`** (NEW)
   - Receipt-specific parsing patterns
   - Different from bank statement patterns
   - Extract: merchant, total, date, items (optional)

   ```javascript
   /**
    * Receipt patterns (vs bank transaction patterns)
    */
   const RECEIPT_PATTERNS = {
     // Total patterns
     total: [
       /total[\s:]*\$?([\d,]+\.\d{2})/i,
       /amount due[\s:]*\$?([\d,]+\.\d{2})/i,
       /grand total[\s:]*\$?([\d,]+\.\d{2})/i,
       /balance[\s:]*\$?([\d,]+\.\d{2})/i,
     ],

     // Merchant patterns (usually at top)
     merchant: [
       /^([A-Z][A-Za-z\s&',.-]+)(?:\n|$)/m, // First line capitalized
       /(.*?)(?:\n.*?address|phone|tax id)/i, // Before address
     ],

     // Date patterns
     date: [
       /date[\s:]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
       /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*\d{1,2}:\d{2}/i, // With time
       /transaction date[\s:]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
     ],

     // Tax patterns (helpful for validation)
     tax: [
       /tax[\s:]*\$?([\d,]+\.\d{2})/i,
       /sales tax[\s:]*\$?([\d,]+\.\d{2})/i,
     ],

     // Subtotal (to cross-reference with total)
     subtotal: [
       /subtotal[\s:]*\$?([\d,]+\.\d{2})/i,
       /sub total[\s:]*\$?([\d,]+\.\d{2})/i,
     ],
   };

   export async function parseReceiptPDF(pdfBuffer) {
     // Extract text from PDF
     const pdfData = await parsePDF(pdfBuffer);

     // Determine if text-based or image-based
     const pdfType = detectPDFType(pdfData);

     if (pdfType === 'image-based') {
       // Return null - caller should use image extraction
       return { requiresOCR: true, pages: pdfData.numpages };
     }

     // Parse as text-based receipt
     const text = pdfData.text;

     const receipt = {
       merchant: extractMerchant(text),
       amount: extractTotal(text),
       date: extractDate(text),
       tax: extractTax(text),
       subtotal: extractSubtotal(text),
       items: extractLineItems(text), // Optional
       rawText: text,
       confidence: calculateConfidence(text),
     };

     return { requiresOCR: false, receipt };
   }
   ```

2. **`src/utils/pdfToImage.js`** (NEW)
   - Convert PDF pages to images for OCR
   - Platform-specific implementations
   - Web: Use `pdfjs-dist` canvas rendering
   - Mobile: Use `react-native-pdf` or `expo-print`

   ```javascript
   /**
    * Convert PDF page to image for OCR processing
    */
   export async function convertPDFPageToImage(pdfBuffer, pageNumber = 1) {
     if (Platform.OS === 'web') {
       return convertPDFPageToImageWeb(pdfBuffer, pageNumber);
     } else {
       return convertPDFPageToImageNative(pdfBuffer, pageNumber);
     }
   }

   async function convertPDFPageToImageWeb(pdfBuffer, pageNumber) {
     const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
     const page = await pdf.getPage(pageNumber);

     // Render at high resolution for OCR accuracy
     const scale = 2.0;
     const viewport = page.getViewport({ scale });

     const canvas = document.createElement('canvas');
     canvas.width = viewport.width;
     canvas.height = viewport.height;

     const context = canvas.getContext('2d');
     await page.render({ canvasContext: context, viewport }).promise;

     // Convert canvas to blob
     const blob = await new Promise(resolve =>
       canvas.toBlob(resolve, 'image/jpeg', 0.95)
     );

     // Convert blob to data URI for upload
     const reader = new FileReader();
     const dataUri = await new Promise(resolve => {
       reader.onloadend = () => resolve(reader.result);
       reader.readAsDataURL(blob);
     });

     return {
       uri: dataUri,
       width: viewport.width,
       height: viewport.height,
     };
   }

   async function convertPDFPageToImageNative(pdfBuffer, pageNumber) {
     // Mobile implementation using expo-print or react-native-pdf
     // This is more complex and may require additional libraries
     // For MVP, could restrict PDF receipts to web platform
     throw new Error('PDF receipt scanning on mobile requires additional setup');
   }
   ```

**Deliverables**:
- ✅ Receipt PDF parsing utility
- ✅ PDF-to-image conversion utility
- ✅ Receipt pattern extraction
- ✅ Confidence scoring
- ✅ Unit tests (25+ tests)

**Estimated Effort**: 2-3 days

---

### Phase 2: File Picker Enhancement (P0 - Critical)

**Objective**: Allow users to select PDF or image files

**Files to Modify**:

1. **`src/screens/main/AddExpenseScreen.js`**

   **Current**:
   ```javascript
   const handleScanReceipt = async () => {
     const result = await ImagePicker.launchCameraAsync({
       mediaTypes: ImagePicker.MediaTypeOptions.Images,
       allowsEditing: false,
       quality: 0.8,
     });
     // ...
   };
   ```

   **Enhanced**:
   ```javascript
   const handleScanReceipt = async () => {
     // Show option: Camera or File
     Alert.alert(
       'Scan Receipt',
       'How would you like to add your receipt?',
       [
         {
           text: 'Take Photo',
           onPress: handleCameraCapture,
         },
         {
           text: 'Choose File',
           onPress: handleFileSelection,
         },
         {
           text: 'Cancel',
           style: 'cancel',
         },
       ]
     );
   };

   const handleCameraCapture = async () => {
     // Existing camera logic
   };

   const handleFileSelection = async () => {
     // Use expo-document-picker
     const result = await DocumentPicker.getDocumentAsync({
       type: ['image/*', 'application/pdf'],
       copyToCacheDirectory: true,
     });

     if (result.type === 'cancel') return;

     // Detect file type
     const fileType = result.mimeType || result.name.toLowerCase().endsWith('.pdf')
       ? 'pdf'
       : 'image';

     if (fileType === 'pdf') {
       await handlePDFReceipt(result.uri);
     } else {
       await handleImageReceipt(result.uri);
     }
   };
   ```

2. **Add PDF processing flow**:
   ```javascript
   const handlePDFReceipt = async (pdfUri) => {
     setOcrState({ status: 'processing', ... });

     try {
       // Read PDF file
       const pdfData = await FileSystem.readAsStringAsync(pdfUri, {
         encoding: FileSystem.EncodingType.Base64,
       });
       const pdfBuffer = Buffer.from(pdfData, 'base64');

       // Try text extraction first
       const parseResult = await parseReceiptPDF(pdfBuffer);

       if (parseResult.requiresOCR) {
         // Convert to image and use existing OCR flow
         const imageUri = await convertPDFPageToImage(pdfBuffer);
         await handleImageReceipt(imageUri);
       } else {
         // Use extracted text directly
         const { receipt } = parseResult;
         setOcrState({
           status: 'ready',
           suggestions: {
             merchant: receipt.merchant,
             amount: receipt.amount,
             date: receipt.date,
             category: await predictCategory(receipt),
           },
         });
       }
     } catch (error) {
       setOcrState({ status: 'failed', error: error.message });
     }
   };
   ```

**Deliverables**:
- ✅ Multi-format file picker
- ✅ PDF/image type detection
- ✅ Branching logic for PDF types
- ✅ Integration tests

**Estimated Effort**: 1-2 days

---

### Phase 3: Backend Cloud Function Updates (P0 - Critical)

**Objective**: Support PDF processing in Cloud Functions

**Files to Modify**:

1. **`functions/src/ocr/processReceipt.js`**

   **Add PDF support**:
   ```javascript
   exports.processReceiptWithML = async (data, context) => {
     const { expenseId, receiptUrl, coupleId, userId } = data;

     // Download receipt file
     const fileBuffer = await downloadFile(receiptUrl);

     // Detect file type
     const isPDF = receiptUrl.toLowerCase().endsWith('.pdf') ||
                   fileBuffer.slice(0, 4).toString() === '%PDF';

     let ocrText;

     if (isPDF) {
       // Try text extraction
       const parseResult = await parseReceiptPDF(fileBuffer);

       if (parseResult.requiresOCR) {
         // Convert PDF to image
         const imageBuffer = await convertPDFPageToImage(fileBuffer);
         ocrText = await runVisionAPI(imageBuffer);
       } else {
         // Use extracted text
         ocrText = parseResult.receipt.rawText;
       }
     } else {
       // Standard image OCR
       ocrText = await runVisionAPI(fileBuffer);
     }

     // Continue with existing ML pipeline
     const extractedData = await parseReceiptText(ocrText);
     const category = await predictCategory(extractedData);

     // Update expense document
     await updateExpense(expenseId, {
       ...extractedData,
       category,
       ocrStatus: 'completed',
     });
   };
   ```

2. **Add PDF storage naming**:
   ```javascript
   // Store PDFs with .pdf extension
   const getStoragePath = (coupleId, userId, fileType) => {
     const timestamp = Date.now();
     const extension = fileType === 'pdf' ? 'pdf' : 'jpg';
     return `receipts/${coupleId}/${userId}/${timestamp}.${extension}`;
   };
   ```

**Deliverables**:
- ✅ Cloud Function PDF support
- ✅ PDF detection logic
- ✅ Integration with existing OCR pipeline
- ✅ Error handling for unsupported PDFs
- ✅ Integration tests

**Estimated Effort**: 2 days

---

### Phase 4: UI/UX Enhancements (P1 - High Priority)

**Objective**: Provide clear feedback for PDF processing

**Components to Add**:

1. **PDF Preview Component**:
   ```javascript
   // components/PDFPreview.js
   const PDFPreview = ({ pdfUri, pageCount }) => (
     <View style={styles.pdfPreview}>
       <MaterialCommunityIcons name="file-pdf-box" size={48} color={COLORS.error} />
       <Text>PDF Receipt ({pageCount} page{pageCount > 1 ? 's' : ''})</Text>
       <Text style={styles.hint}>
         {pageCount > 1
           ? 'Only the first page will be processed'
           : 'Processing PDF...'}
       </Text>
     </View>
   );
   ```

2. **Processing Status Messages**:
   ```javascript
   const getProcessingMessage = (ocrState) => {
     switch (ocrState.status) {
       case 'detecting':
         return 'Detecting file type...';
       case 'extracting-text':
         return 'Extracting text from PDF...';
       case 'converting':
         return 'Converting PDF to image...';
       case 'ocr-processing':
         return 'Running OCR on scanned receipt...';
       default:
         return 'Processing receipt...';
     }
   };
   ```

3. **Error Messages**:
   ```javascript
   const PDF_ERROR_MESSAGES = {
     'PDF_PASSWORD_PROTECTED':
       'This PDF is password-protected. Please remove the password and try again.',
     'PDF_TOO_LARGE':
       'PDF file is too large (max 10MB). Try taking a photo instead.',
     'PDF_CORRUPTED':
       'PDF file appears to be corrupted. Try re-downloading or taking a photo.',
     'PDF_NO_TEXT':
       'Could not read receipt from PDF. Try taking a clear photo instead.',
   };
   ```

**Deliverables**:
- ✅ PDF preview component
- ✅ Enhanced status messaging
- ✅ Error handling UI
- ✅ Multi-page PDF warnings
- ✅ Component tests

**Estimated Effort**: 1-2 days

---

### Phase 5: Receipt Pattern Recognition (P1 - High Priority)

**Objective**: Improve accuracy for common receipt formats

**Pattern Library**:

```javascript
/**
 * Common receipt vendor patterns
 * These help identify receipt type and improve parsing
 */
const VENDOR_PATTERNS = {
  restaurants: {
    indicators: ['server:', 'table', 'guests', 'gratuity', 'tip'],
    totalKeywords: ['total', 'amount due', 'balance'],
  },

  retail: {
    indicators: ['item', 'qty', 'sku', 'barcode'],
    totalKeywords: ['total', 'amount tendered', 'change'],
  },

  ecommerce: {
    indicators: ['order number', 'order #', 'shipped to', 'tracking'],
    totalKeywords: ['order total', 'grand total', 'amount charged'],
  },

  saas: {
    indicators: ['subscription', 'billing period', 'next invoice', 'plan'],
    totalKeywords: ['amount paid', 'total', 'charge'],
  },

  utilities: {
    indicators: ['account number', 'billing period', 'meter reading', 'usage'],
    totalKeywords: ['amount due', 'total amount', 'current charges'],
  },
};

/**
 * Extract line items from receipts (optional, for detailed tracking)
 */
function extractLineItems(text, vendorType) {
  const patterns = {
    restaurants: /^([A-Za-z\s]+)\s+(\d+)\s+\$?([\d.]+)$/gm,
    retail: /^([A-Za-z0-9\s]+)\s+\$?([\d.]+)$/gm,
    ecommerce: /^(.+?)\s+Qty:\s*(\d+)\s+\$?([\d.]+)$/gm,
  };

  const pattern = patterns[vendorType] || patterns.retail;
  const items = [];

  let match;
  while ((match = pattern.exec(text)) !== null) {
    items.push({
      description: match[1].trim(),
      quantity: match[2] ? parseInt(match[2]) : 1,
      amount: parseFloat(match[3]),
    });
  }

  return items;
}
```

**Deliverables**:
- ✅ Vendor type detection
- ✅ Receipt-specific patterns
- ✅ Line item extraction (optional)
- ✅ Pattern validation tests (50+ test cases)

**Estimated Effort**: 2-3 days

---

### Phase 6: Multi-Page PDF Support (P2 - Medium Priority)

**Objective**: Handle receipts spanning multiple pages

**Strategy**:

1. **Single-Receipt Multi-Page**:
   - Combine text from all pages
   - Extract total from last page
   - Merchant from first page

   ```javascript
   async function parseMultiPageReceipt(pdfBuffer) {
     const pdf = await parsePDF(pdfBuffer);

     // Extract text from all pages
     const pageTexts = [];
     for (let i = 1; i <= pdf.numpages; i++) {
       const page = await pdf.getPage(i);
       const text = await extractTextFromPage(page);
       pageTexts.push(text);
     }

     // Merchant usually on first page
     const merchant = extractMerchant(pageTexts[0]);

     // Total usually on last page
     const total = extractTotal(pageTexts[pageTexts.length - 1]);

     // Date could be on any page
     let date = null;
     for (const pageText of pageTexts) {
       date = extractDate(pageText);
       if (date) break;
     }

     return { merchant, total, date };
   }
   ```

2. **Multiple Receipts in One PDF**:
   - Detect page breaks with new merchant names
   - Split into separate expenses
   - Prompt user to review each

   ```javascript
   async function detectMultipleReceipts(pdfBuffer) {
     const pdf = await parsePDF(pdfBuffer);
     const receipts = [];

     for (let i = 1; i <= pdf.numpages; i++) {
       const page = await pdf.getPage(i);
       const text = await extractTextFromPage(page);

       const merchant = extractMerchant(text);
       const total = extractTotal(text);

       if (merchant && total) {
         // This page looks like a complete receipt
         receipts.push({ page: i, merchant, total, text });
       }
     }

     return receipts;
   }
   ```

**Deliverables**:
- ✅ Multi-page text combination
- ✅ Multiple receipt detection
- ✅ UI for reviewing split receipts
- ✅ Tests with multi-page samples

**Estimated Effort**: 2-3 days

---

### Phase 7: Performance & Optimization (P2 - Medium Priority)

**Objective**: Ensure fast, efficient PDF processing

**Optimizations**:

1. **Client-Side Pre-Processing**:
   ```javascript
   // Try text extraction on client first
   // Only upload if requires server-side OCR
   async function preprocessPDF(pdfUri) {
     const startTime = Date.now();

     // Quick text extraction attempt (client-side)
     const quickParse = await tryQuickTextExtraction(pdfUri);

     if (quickParse.success && quickParse.confidence > 0.8) {
       console.log(`Client-side extraction: ${Date.now() - startTime}ms`);
       return { method: 'client', data: quickParse.receipt };
     }

     // Fall back to server OCR
     console.log(`Falling back to server OCR: ${Date.now() - startTime}ms`);
     return { method: 'server', requiresUpload: true };
   }
   ```

2. **File Size Limits**:
   ```javascript
   const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

   async function validatePDFSize(pdfUri) {
     const info = await FileSystem.getInfoAsync(pdfUri);

     if (info.size > MAX_PDF_SIZE) {
       throw new Error('PDF_TOO_LARGE');
     }

     return true;
   }
   ```

3. **Caching**:
   ```javascript
   // Cache parsed PDF data to avoid re-processing
   const pdfCache = new Map();

   async function parseReceiptPDFCached(pdfBuffer) {
     const hash = await hashBuffer(pdfBuffer);

     if (pdfCache.has(hash)) {
       return pdfCache.get(hash);
     }

     const result = await parseReceiptPDF(pdfBuffer);
     pdfCache.set(hash, result);

     return result;
   }
   ```

4. **Background Processing**:
   ```javascript
   // Don't block UI while processing large PDFs
   async function processPDFInBackground(pdfUri) {
     return new Promise((resolve, reject) => {
       // Web Worker (web) or async task (mobile)
       const worker = createPDFWorker();

       worker.onmessage = (e) => {
         if (e.data.error) {
           reject(new Error(e.data.error));
         } else {
           resolve(e.data.result);
         }
       };

       worker.postMessage({ action: 'parse', pdfUri });
     });
   }
   ```

**Deliverables**:
- ✅ Client-side preprocessing
- ✅ File size validation
- ✅ Result caching
- ✅ Background processing
- ✅ Performance tests (target: <3s for text PDF, <10s for scanned)

**Estimated Effort**: 2-3 days

---

### Phase 8: Testing & Validation (P0 - Critical)

**Objective**: Comprehensive test coverage for all PDF scenarios

**Test Suites**:

1. **Unit Tests** (`src/utils/__tests__/receiptPdfParser.test.js`):
   ```javascript
   describe('Receipt PDF Parser', () => {
     describe('Text-based PDFs', () => {
       it('should extract merchant from Amazon receipt PDF', async () => {
         const pdfBuffer = await loadFixture('amazon-receipt.pdf');
         const result = await parseReceiptPDF(pdfBuffer);
         expect(result.receipt.merchant).toBe('Amazon.com');
         expect(result.receipt.amount).toBeCloseTo(49.99, 2);
       });

       it('should extract total from restaurant receipt PDF', async () => {
         const pdfBuffer = await loadFixture('restaurant-receipt.pdf');
         const result = await parseReceiptPDF(pdfBuffer);
         expect(result.receipt.merchant).toContain('Restaurant');
         expect(result.receipt.amount).toBeGreaterThan(0);
       });

       it('should extract date in multiple formats', async () => {
         const testCases = [
           { fixture: 'receipt-mmddyyyy.pdf', expectedDate: '2025-11-20' },
           { fixture: 'receipt-ddmmyyyy.pdf', expectedDate: '2025-11-20' },
           { fixture: 'receipt-iso.pdf', expectedDate: '2025-11-20' },
         ];

         for (const tc of testCases) {
           const pdfBuffer = await loadFixture(tc.fixture);
           const result = await parseReceiptPDF(pdfBuffer);
           expect(result.receipt.date.toISOString()).toContain(tc.expectedDate);
         }
       });
     });

     describe('Scanned PDFs', () => {
       it('should detect scanned PDF and flag for OCR', async () => {
         const pdfBuffer = await loadFixture('scanned-receipt.pdf');
         const result = await parseReceiptPDF(pdfBuffer);
         expect(result.requiresOCR).toBe(true);
         expect(result.pages).toBeGreaterThan(0);
       });
     });

     describe('Multi-page PDFs', () => {
       it('should combine text from all pages', async () => {
         const pdfBuffer = await loadFixture('multi-page-receipt.pdf');
         const result = await parseReceiptPDF(pdfBuffer);
         expect(result.receipt.merchant).toBeDefined();
         expect(result.receipt.amount).toBeGreaterThan(0);
       });

       it('should detect multiple receipts in one PDF', async () => {
         const pdfBuffer = await loadFixture('multiple-receipts.pdf');
         const receipts = await detectMultipleReceipts(pdfBuffer);
         expect(receipts.length).toBeGreaterThan(1);
       });
     });

     describe('Error Handling', () => {
       it('should handle password-protected PDFs', async () => {
         const pdfBuffer = await loadFixture('password-protected.pdf');
         await expect(parseReceiptPDF(pdfBuffer))
           .rejects.toThrow('PDF_PASSWORD_PROTECTED');
       });

       it('should handle corrupted PDFs', async () => {
         const pdfBuffer = Buffer.from('not a pdf');
         await expect(parseReceiptPDF(pdfBuffer))
           .rejects.toThrow('PDF_PARSING_ERROR');
       });

       it('should handle empty PDFs', async () => {
         const pdfBuffer = await loadFixture('empty.pdf');
         await expect(parseReceiptPDF(pdfBuffer))
           .rejects.toThrow('PDF appears to be empty');
       });
     });
   });
   ```

2. **Integration Tests** (`src/__tests__/integration/pdfOcrFlow.test.js`):
   ```javascript
   describe('PDF OCR Integration', () => {
     it('should process text-based PDF end-to-end', async () => {
       const pdfUri = 'file:///test-receipts/digital-receipt.pdf';

       // Simulate file selection
       const result = await handlePDFReceipt(pdfUri);

       expect(result.status).toBe('ready');
       expect(result.suggestions.merchant).toBeDefined();
       expect(result.suggestions.amount).toBeGreaterThan(0);
       expect(result.suggestions.category).toBeDefined();
     });

     it('should convert scanned PDF to image and run OCR', async () => {
       const pdfUri = 'file:///test-receipts/scanned-receipt.pdf';

       const result = await handlePDFReceipt(pdfUri);

       expect(result.status).toBe('ready');
       expect(result.ocrMethod).toBe('image-conversion');
       expect(result.suggestions.merchant).toBeDefined();
     });
   });
   ```

3. **E2E Tests** (`e2e/pdfReceiptFlow.e2e.js`):
   ```javascript
   describe('PDF Receipt E2E Flow', () => {
     it('should allow user to select PDF and create expense', async () => {
       await element(by.id('add-expense-tab')).tap();
       await element(by.id('scan-receipt-button')).tap();
       await element(by.text('Choose File')).tap();

       // Simulate file picker with test PDF
       await element(by.id('test-pdf-selector')).tap();
       await element(by.text('Amazon Receipt.pdf')).tap();

       // Wait for processing
       await waitFor(element(by.id('ocr-suggestion-card')))
         .toBeVisible()
         .withTimeout(15000);

       // Verify suggestions
       await expect(element(by.id('merchant-suggestion'))).toHaveText('Amazon.com');
       await expect(element(by.id('amount-suggestion'))).toHaveText('$49.99');

       // Accept and save
       await element(by.id('ocr-accept-button')).tap();
       await element(by.id('save-expense-button')).tap();

       await expect(element(by.text('Expense added successfully'))).toBeVisible();
     });
   });
   ```

4. **Performance Tests** (`src/__tests__/performance/pdfProcessing.test.js`):
   ```javascript
   describe('PDF Processing Performance', () => {
     it('should process text-based PDF in under 3 seconds', async () => {
       const pdfBuffer = await loadFixture('digital-receipt.pdf');

       const startTime = Date.now();
       const result = await parseReceiptPDF(pdfBuffer);
       const duration = Date.now() - startTime;

       expect(duration).toBeLessThan(3000);
       expect(result.receipt).toBeDefined();
     }, 5000);

     it('should convert scanned PDF to image in under 10 seconds', async () => {
       const pdfBuffer = await loadFixture('scanned-receipt.pdf');

       const startTime = Date.now();
       const imageUri = await convertPDFPageToImage(pdfBuffer);
       const duration = Date.now() - startTime;

       expect(duration).toBeLessThan(10000);
       expect(imageUri).toBeDefined();
     }, 15000);
   });
   ```

**Test Fixtures Needed**:
- `amazon-receipt.pdf` - Digital e-commerce receipt
- `restaurant-receipt.pdf` - Digital restaurant receipt
- `scanned-receipt.pdf` - Paper receipt scanned as PDF
- `multi-page-receipt.pdf` - Receipt spanning 2+ pages
- `multiple-receipts.pdf` - Multiple receipts in one PDF
- `password-protected.pdf` - Password-locked PDF
- `empty.pdf` - Empty PDF file
- `corrupted.pdf` - Invalid PDF data

**Deliverables**:
- ✅ 50+ unit tests
- ✅ 15+ integration tests
- ✅ 10+ E2E tests
- ✅ 5+ performance tests
- ✅ Test fixture library
- ✅ >85% code coverage

**Estimated Effort**: 3-4 days

---

### Phase 9: Documentation & User Guidance (P1 - High Priority)

**Objective**: Help users understand PDF receipt scanning

**Documentation**:

1. **User Guide** (`docs/PDF_RECEIPT_GUIDE.md`):
   ```markdown
   # PDF Receipt Scanning - User Guide

   ## Supported PDF Types

   ✅ **Digital Receipts** (Recommended):
   - E-commerce receipts (Amazon, eBay, etc.)
   - Email receipts from online purchases
   - SaaS subscription invoices
   - Restaurant receipts from POS systems

   ⚠️ **Scanned Receipts** (May require additional processing):
   - Paper receipts scanned as PDF
   - Photos saved as PDF
   - Multi-page receipts

   ❌ **Not Supported**:
   - Password-protected PDFs
   - PDFs larger than 10MB
   - Bank statements (use Import feature instead)

   ## How to Scan a PDF Receipt

   1. Tap "Add Expense"
   2. Tap "Scan Receipt"
   3. Choose "Choose File"
   4. Select your PDF receipt
   5. Review the extracted information
   6. Tap "Save"

   ## Tips for Best Results

   - Use digital receipts when possible (faster, more accurate)
   - Ensure scanned PDFs are clear and readable
   - Remove password protection before uploading
   - Single-receipt PDFs work best

   ## Troubleshooting

   **"Could not read receipt from PDF"**
   - Try taking a photo of the receipt instead
   - Check if PDF is password-protected
   - Ensure PDF contains readable text/images

   **"PDF file is too large"**
   - Maximum file size is 10MB
   - Try compressing the PDF or taking a photo

   **"PDF appears to be corrupted"**
   - Re-download the PDF from the source
   - Try opening the PDF in a PDF viewer to verify
   ```

2. **In-App Tooltips**:
   ```javascript
   const PDF_TOOLTIPS = {
     fileSelection: {
       title: 'Choose PDF or Image',
       message: 'You can select receipt images (JPG, PNG) or PDF files. Digital PDFs work best!',
     },
     pdfProcessing: {
       title: 'Processing PDF',
       message: 'Extracting receipt information from your PDF. This may take a moment for scanned receipts.',
     },
     multiPage: {
       title: 'Multi-Page PDF Detected',
       message: 'Only the first page will be processed. For multi-page receipts, consider taking separate photos.',
     },
   };
   ```

3. **Developer Documentation** (`docs/PDF_IMPLEMENTATION.md`):
   - Architecture overview
   - API documentation
   - Testing guidelines
   - Troubleshooting guide

**Deliverables**:
- ✅ User guide
- ✅ In-app tooltips
- ✅ Developer documentation
- ✅ FAQ section
- ✅ Video tutorial (optional)

**Estimated Effort**: 1-2 days

---

## Risk Analysis

### High-Risk Areas

1. **Scanned PDF Quality** (High Impact, High Likelihood)
   - **Risk**: Low-quality scans produce poor OCR results
   - **Mitigation**:
     - Detect low-quality PDFs and prompt user to use camera instead
     - Implement image enhancement before OCR
     - Provide clear error messages with alternative suggestions

2. **Platform Compatibility** (High Impact, Medium Likelihood)
   - **Risk**: PDF-to-image conversion may not work on all platforms
   - **Mitigation**:
     - Platform-specific implementations (web vs mobile)
     - Feature flag to disable PDF on unsupported platforms
     - Clear messaging about platform limitations

3. **Performance on Large PDFs** (Medium Impact, Medium Likelihood)
   - **Risk**: Large PDFs cause timeouts or memory issues
   - **Mitigation**:
     - File size limits (10MB max)
     - Background processing
     - Progress indicators
     - Timeout handling with fallback options

4. **Receipt Format Variations** (Medium Impact, High Likelihood)
   - **Risk**: Many receipt formats won't match our patterns
   - **Mitigation**:
     - Extensive pattern library with fallbacks
     - Machine learning for pattern discovery
     - User feedback loop to improve patterns
     - Manual entry fallback

### Medium-Risk Areas

1. **Multi-Page Handling**
   - **Risk**: Incorrect page splitting or merging
   - **Mitigation**: Start with first-page-only, expand later

2. **Memory Usage**
   - **Risk**: Large PDFs cause crashes
   - **Mitigation**: Streaming processing, memory limits

3. **Security (Password-Protected PDFs)**
   - **Risk**: Users can't remove passwords easily
   - **Mitigation**: Clear error messages, guide to remove protection

---

## Success Metrics

### Technical Metrics

- **Accuracy**: >75% correct extraction for text-based PDFs
- **Performance**: <3s for text PDFs, <10s for scanned PDFs
- **Reliability**: <5% error rate
- **Coverage**: 85%+ code coverage

### User Metrics

- **Adoption**: 30%+ of receipts uploaded as PDFs within 3 months
- **Success Rate**: >80% of PDF uploads result in saved expenses
- **Satisfaction**: <10% of PDF users switch to camera
- **Error Recovery**: <5% abandon after PDF error

### Business Metrics

- **Feature Usage**: Track PDF vs image receipt submissions
- **Time Savings**: Measure time to add PDF receipt vs camera
- **Error Reduction**: Compare error rates before/after PDF support
- **User Retention**: Track retention of users who use PDF feature

---

## Dependencies

### Required Libraries

**Already Installed**:
- ✅ `pdf-parse` (^2.4.5) - Node.js PDF parsing
- ✅ `pdfjs-dist` (^5.4.394) - Browser PDF parsing
- ✅ `expo-document-picker` (^14.0.7) - File selection
- ✅ `expo-file-system` (^19.0.19) - File I/O

**May Need to Install**:
- ❓ `react-native-pdf` - Native PDF rendering (if mobile support needed)
- ❓ `pdf-lib` - PDF manipulation (if need to split/merge pages)
- ❓ `jimp` or `sharp` - Image enhancement (if need to improve scan quality)

### Cloud Services

- ✅ Google Cloud Vision API - Already configured for OCR
- ✅ Firebase Storage - Already configured for file uploads
- ✅ Firebase Cloud Functions - Already configured for processing

---

## Implementation Timeline

### Sprint 1 (Week 1): Foundation
- Phase 1: Core PDF Receipt Parsing (3 days)
- Phase 2: File Picker Enhancement (2 days)

**Deliverable**: Basic PDF text extraction working end-to-end

### Sprint 2 (Week 2): Integration
- Phase 3: Backend Cloud Function Updates (2 days)
- Phase 4: UI/UX Enhancements (2 days)
- Phase 8: Basic Testing (1 day)

**Deliverable**: Complete PDF flow with proper UI/UX

### Sprint 3 (Week 3): Enhancement
- Phase 5: Receipt Pattern Recognition (3 days)
- Phase 7: Performance & Optimization (2 days)

**Deliverable**: Improved accuracy and performance

### Sprint 4 (Week 4): Polish
- Phase 6: Multi-Page PDF Support (2 days)
- Phase 8: Complete Testing (2 days)
- Phase 9: Documentation (1 day)

**Deliverable**: Production-ready feature with comprehensive tests and docs

**Total Estimated Effort**: 15-20 days (3-4 weeks)

---

## Future Enhancements

### Post-MVP Features

1. **Itemized Receipt Parsing**
   - Extract individual line items
   - Track detailed spending patterns
   - Split specific items between partners

2. **Receipt Templates**
   - Learn from user corrections
   - Build vendor-specific templates
   - Improve accuracy over time

3. **Batch PDF Processing**
   - Upload multiple receipts at once
   - Process in parallel
   - Bulk review and import

4. **OCR Quality Assessment**
   - Detect poor quality scans
   - Suggest retake or manual entry
   - Auto-enhance images

5. **Receipt Search by PDF**
   - Full-text search within PDFs
   - Find receipts by merchant, date, amount
   - Export PDFs for tax purposes

6. **Mobile Native PDF Support**
   - Full PDF rendering on mobile
   - Page selection for multi-page PDFs
   - Better performance on mobile

---

## Open Questions

1. **Should we support PDF receipts on mobile initially?**
   - **Recommendation**: Start with web only, expand to mobile in Phase 2
   - **Reasoning**: Web has better PDF.js support, mobile requires additional libraries

2. **How to handle multi-page itemized receipts?**
   - **Recommendation**: First-page-only for MVP, full support in Phase 6
   - **Reasoning**: Most receipts are single-page, reduces complexity

3. **Should we store original PDFs or converted images?**
   - **Recommendation**: Store original PDFs
   - **Reasoning**: Preserves quality, allows re-processing if algorithms improve

4. **File size limit?**
   - **Recommendation**: 10MB max
   - **Reasoning**: Balance between user convenience and server resources

5. **Should we support password-protected PDFs?**
   - **Recommendation**: No, require users to remove passwords
   - **Reasoning**: Security complexity, rare use case

---

## Rollout Strategy

### Phase 1: Beta Testing (Week 5)
- Enable for 10% of users
- Monitor error rates and performance
- Collect user feedback
- Fix critical issues

### Phase 2: Gradual Rollout (Week 6)
- Increase to 50% of users
- A/B test with camera-only group
- Measure adoption and success rates
- Optimize based on data

### Phase 3: Full Release (Week 7)
- Enable for 100% of users
- Announce feature in release notes
- Create tutorial content
- Monitor metrics

### Phase 4: Optimization (Ongoing)
- Analyze usage patterns
- Improve pattern recognition
- Add new vendor templates
- Expand supported formats

---

## Conclusion

PDF receipt ingestion is a valuable enhancement to the existing OCR system that will:
- **Improve UX**: Allow users to upload emailed receipts directly
- **Increase Adoption**: Capture digital receipts that users already have
- **Save Time**: Faster than taking photos for digital receipts
- **Enhance Accuracy**: Text-based PDFs provide cleaner data than photos

The implementation is feasible with existing infrastructure and libraries. The phased approach allows for iterative development and risk mitigation.

**Recommendation**: Proceed with implementation starting with Phase 1 (Core PDF Parsing) and Phase 2 (File Picker Enhancement) to achieve MVP functionality within 2 weeks.
