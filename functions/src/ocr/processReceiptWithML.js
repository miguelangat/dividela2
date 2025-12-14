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
const pdfReceiptParser = require('./pdfReceiptParser');

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
 * Detect if file is a PDF based on magic number
 */
function isPDFBuffer(buffer) {
  if (!buffer || buffer.length < 4) return false;
  // Check PDF magic number (%PDF)
  const header = buffer.slice(0, 4).toString('utf-8');
  return header === '%PDF';
}

/**
 * Detect file type from receipt URL
 */
function getFileType(receiptUrl) {
  const lowerUrl = receiptUrl.toLowerCase();
  if (lowerUrl.endsWith('.pdf')) {
    return 'pdf';
  } else if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return 'image';
  }
  return 'unknown';
}

/**
 * Download receipt file from Firebase Storage
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

    // Detect file type
    const fileType = getFileType(receiptUrl);
    const actualType = isPDFBuffer(buffer) ? 'pdf' : fileType === 'unknown' ? 'image' : fileType;

    return {
      success: true,
      buffer,
      fileType: actualType
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to download file'
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
 * Process PDF receipt by extracting text
 */
async function processPDFReceipt(pdfBuffer) {
  try {
    const result = await pdfReceiptParser.parseReceiptPDF(pdfBuffer);

    if (result.requiresOCR) {
      // PDF is scanned or low confidence - needs OCR
      return {
        success: false,
        requiresOCR: true,
        reason: result.reason,
        pages: result.pages
      };
    }

    // Successfully extracted text from PDF
    const { receipt } = result;

    return {
      success: true,
      data: {
        rawText: receipt.rawText || '',
        merchantName: receipt.merchant,
        amount: receipt.amount,
        date: receipt.date,
        tax: receipt.tax,
        subtotal: receipt.subtotal,
        vendorType: receipt.vendorType,
        confidence: receipt.confidence || 0.8,
        source: 'pdf-text-extraction'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `PDF processing error: ${error.message}`
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
 * @param {Object} context - Firebase callable function context
 * @param {Object} context.auth - Authentication context
 * @param {string} context.auth.uid - Authenticated user ID
 * @returns {Promise<Object>} Processing result
 */
async function processReceiptWithML(params, context) {
  const startTime = Date.now();

  console.log('Processing receipt for ML analysis', {
    expenseId: params?.expenseId,
    timestamp: new Date().toISOString()
  });

  // SECURITY: Verify authentication
  if (!context || !context.auth) {
    return {
      success: false,
      error: 'Unauthorized: Authentication required'
    };
  }

  const authenticatedUserId = context.auth.uid;

  // Validate input
  const validation = validateInput(params);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  const { expenseId, receiptUrl, coupleId, userId } = params;

  // SECURITY: Verify user has access to this couple
  try {
    const coupleRef = db.collection('couples').doc(coupleId);
    const coupleDoc = await coupleRef.get();

    if (!coupleDoc.exists) {
      return {
        success: false,
        error: 'Couple not found'
      };
    }

    const coupleData = coupleDoc.data();
    const userIds = [coupleData.partner1Id, coupleData.partner2Id].filter(Boolean);

    if (!userIds.includes(authenticatedUserId)) {
      console.error('Authorization failed', {
        authenticatedUserId,
        coupleId,
        attemptedBy: userId
      });
      return {
        success: false,
        error: 'Forbidden: Access denied'
      };
    }
  } catch (authError) {
    console.error('Authorization check failed', {
      error: authError.message,
      coupleId
    });
    return {
      success: false,
      error: 'Authorization check failed'
    };
  }

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

    // Step 2: Download file from Storage
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

    const { buffer, fileType } = downloadResult;

    console.log('Processing receipt', {
      expenseId,
      fileType,
      bufferSize: buffer.length
    });

    let ocrData;
    let parseResult;

    // Step 3: Process based on file type
    if (fileType === 'pdf') {
      // Try PDF text extraction first
      const pdfResult = await processPDFReceipt(buffer);

      if (pdfResult.success) {
        // Successfully extracted text from PDF
        console.log('PDF text extraction successful', {
          expenseId,
          confidence: pdfResult.data.confidence
        });

        ocrData = {
          rawText: pdfResult.data.rawText,
          confidence: pdfResult.data.confidence,
          timestamp: new Date().toISOString(),
          source: 'pdf-text-extraction'
        };

        parseResult = {
          success: true,
          data: {
            merchantName: pdfResult.data.merchantName,
            amount: pdfResult.data.amount,
            date: pdfResult.data.date,
            tax: pdfResult.data.tax,
            subtotal: pdfResult.data.subtotal,
            rawText: pdfResult.data.rawText
          }
        };
      } else if (pdfResult.requiresOCR) {
        // PDF is scanned - needs OCR
        console.log('PDF requires OCR', {
          expenseId,
          reason: pdfResult.reason
        });

        // Perform OCR on PDF buffer (Vision API can handle PDFs)
        const ocrResult = await performOCR(buffer);
        if (!ocrResult.success) {
          console.error('Error processing PDF with OCR', {
            expenseId,
            error: ocrResult.error
          });

          await expenseRef.update({
            status: 'ocr_failed',
            error: `PDF OCR failed: ${ocrResult.error}`,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          return {
            success: false,
            error: ocrResult.error
          };
        }

        ocrData = ocrResult.data;
        parseResult = parseReceiptData(ocrData.rawText);
      } else {
        // PDF processing failed
        console.error('Error processing PDF', {
          expenseId,
          error: pdfResult.error
        });

        await expenseRef.update({
          status: 'ocr_failed',
          error: pdfResult.error,
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
          success: false,
          error: pdfResult.error
        };
      }
    } else {
      // Standard image processing
      const ocrResult = await performOCR(buffer);
      if (!ocrResult.success) {
        console.error('Error processing image', {
          expenseId,
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

      ocrData = ocrResult.data;
      parseResult = parseReceiptData(ocrData.rawText);
    }

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
