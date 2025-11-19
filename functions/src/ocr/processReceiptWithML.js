/**
 * Process Receipt with ML Pipeline
 * Main orchestration function for receipt OCR and ML processing
 *
 * Flow:
 * 1. Download image from Firebase Storage
 * 2. Extract text using Google Cloud Vision API
 * 3. Parse receipt data from OCR text
 * 4. Predict expense category using ML
 * 5. Update Firestore with results
 */

const admin = require('firebase-admin');
const visionClient = require('./visionClient');
const receiptParser = require('./receiptParser');
const categoryPredictor = require('../ml/categoryPredictor');

// Initialize Firebase Admin if not already initialized
try {
  admin.app();
} catch (e) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Validate input parameters
 */
function validateInput(input) {
  const required = ['expenseId', 'receiptUrl', 'coupleId', 'userId'];
  const missing = required.filter(field => !input || !input[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Download image from Firebase Storage
 */
async function downloadImage(receiptUrl) {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(receiptUrl);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`Receipt file not found: ${receiptUrl}`);
    }

    // Download file
    const [buffer] = await file.download();
    return { success: true, buffer };

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to download image'
    };
  }
}

/**
 * Process receipt through Vision API
 */
async function performOCR(imageBuffer) {
  try {
    const ocrResult = await visionClient.processReceiptImage(imageBuffer);

    if (!ocrResult) {
      return {
        success: false,
        error: 'Image is blank or unreadable'
      };
    }

    if (!ocrResult.success) {
      return {
        success: false,
        error: ocrResult.error || 'OCR failed'
      };
    }

    return {
      success: true,
      data: ocrResult
    };

  } catch (error) {
    return {
      success: false,
      error: `Vision API error: ${error.message}`
    };
  }
}

/**
 * Parse receipt data from OCR text
 */
function parseReceiptData(ocrText) {
  try {
    const parsedData = receiptParser.parseReceipt(ocrText);
    return {
      success: true,
      data: parsedData
    };
  } catch (error) {
    return {
      success: false,
      error: `Parsing error: ${error.message}`,
      data: {
        merchantName: null,
        amount: null,
        date: null,
        rawText: ocrText
      }
    };
  }
}

/**
 * Predict expense category
 */
async function predictCategory(receiptText, parsedData) {
  try {
    const prediction = categoryPredictor.predictCategory(
      parsedData.merchantName,
      parsedData.amount,
      receiptText,
      [] // TODO: Fetch user expense history for better predictions
    );

    return {
      success: true,
      data: {
        suggestedCategory: prediction.category || 'Other',
        confidence: prediction.confidence || 0,
        alternativeCategories: prediction.alternatives || []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Category prediction error: ${error.message}`,
      data: {
        suggestedCategory: 'Other',
        confidence: 0,
        alternativeCategories: []
      }
    };
  }
}

/**
 * Update expense document in Firestore
 */
async function updateExpenseDocument(expenseId, coupleId, updateData) {
  try {
    const expenseRef = db.collection('couples')
      .doc(coupleId)
      .collection('expenses')
      .doc(expenseId);

    await expenseRef.update(updateData);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Firestore update error: ${error.message}`
    };
  }
}

/**
 * Main processing function
 * @param {Object} params - Processing parameters
 * @param {string} params.expenseId - Expense document ID
 * @param {string} params.receiptUrl - Storage path to receipt image
 * @param {string} params.coupleId - Couple document ID
 * @param {string} params.userId - User ID who uploaded the receipt
 * @returns {Promise<Object>} Processing result
 */
async function processReceiptWithML(params) {
  const startTime = Date.now();

  console.log('Processing receipt for ML analysis', {
    expenseId: params?.expenseId,
    timestamp: new Date().toISOString()
  });

  // Validate input
  const validation = validateInput(params);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  const { expenseId, receiptUrl, coupleId, userId } = params;

  try {
    // Step 1: Check if expense exists
    const expenseRef = db.collection('couples')
      .doc(coupleId)
      .collection('expenses')
      .doc(expenseId);

    const expenseDoc = await expenseRef.get();
    if (!expenseDoc.exists) {
      return {
        success: false,
        error: `Expense ${expenseId} not found`
      };
    }

    // Step 2: Download image from Storage
    const downloadResult = await downloadImage(receiptUrl);
    if (!downloadResult.success) {
      console.error('Error processing receipt', {
        expenseId,
        step: 'download',
        error: downloadResult.error
      });

      await expenseRef.update({
        status: 'ocr_failed',
        error: downloadResult.error,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: false,
        error: downloadResult.error
      };
    }

    // Step 3: Perform OCR
    const ocrResult = await performOCR(downloadResult.buffer);
    if (!ocrResult.success) {
      console.error('Error processing receipt', {
        expenseId,
        step: 'ocr',
        error: ocrResult.error
      });

      await expenseRef.update({
        status: 'ocr_failed',
        error: ocrResult.error,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: false,
        error: ocrResult.error
      };
    }

    const ocrData = ocrResult.data;

    // Step 4: Parse receipt data
    const parseResult = parseReceiptData(ocrData.rawText);

    // Step 5: Predict category
    const categoryResult = await predictCategory(
      ocrData.rawText,
      parseResult.data
    );

    // Step 6: Update Firestore with all results
    const updateData = {
      status: 'ocr_complete',
      ocrData: {
        rawText: ocrData.rawText,
        confidence: ocrData.confidence,
        timestamp: ocrData.timestamp,
        parsedData: parseResult.data,
        warning: ocrData.warning
      },
      mlPredictions: {
        suggestedCategory: categoryResult.data.suggestedCategory,
        confidence: categoryResult.data.confidence,
        alternativeCategories: categoryResult.data.alternativeCategories || []
      },
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const updateResult = await updateExpenseDocument(expenseId, coupleId, updateData);
    if (!updateResult.success) {
      console.error('Failed to update Firestore', {
        expenseId,
        error: updateResult.error
      });

      return {
        success: false,
        error: updateResult.error
      };
    }

    const processingTimeMs = Date.now() - startTime;

    console.log('Receipt processing completed successfully', {
      expenseId,
      processingTimeMs,
      confidence: ocrData.confidence,
      suggestedCategory: categoryResult.data.suggestedCategory
    });

    return {
      success: true,
      expenseId,
      ocrCompleted: true,
      processingTimeMs,
      results: {
        ocrConfidence: ocrData.confidence,
        parsedAmount: parseResult.data.amount,
        suggestedCategory: categoryResult.data.suggestedCategory,
        categoryConfidence: categoryResult.data.confidence
      }
    };

  } catch (error) {
    console.error('Error processing receipt', {
      expenseId: params?.expenseId,
      error: error.message,
      stack: error.stack
    });

    // Try to update Firestore with error status
    try {
      await db.collection('couples')
        .doc(coupleId)
        .collection('expenses')
        .doc(expenseId)
        .update({
          status: 'ocr_failed',
          error: error.message,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (updateError) {
      console.error('Failed to update error status', {
        expenseId,
        updateError: updateError.message
      });
    }

    return {
      success: false,
      error: error.message || 'Unknown error during processing'
    };
  }
}

module.exports = processReceiptWithML;
