/**
 * Process Receipt Direct (No Storage)
 * Processes receipt images sent as base64 - no Firebase Storage required
 *
 * Flow:
 * 1. Receive base64 image from client
 * 2. Extract text using Google Cloud Vision API
 * 3. Parse receipt data from OCR text
 * 4. Predict expense category using ML
 * 5. Return parsed data to client
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

/**
 * Validate input parameters
 */
function validateInput(input) {
  if (!input || !input.imageBase64) {
    return {
      valid: false,
      error: 'Missing required field: imageBase64'
    };
  }

  if (!input.coupleId) {
    return {
      valid: false,
      error: 'Missing required field: coupleId'
    };
  }

  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Regex.test(input.imageBase64)) {
    return {
      valid: false,
      error: 'Invalid base64 format'
    };
  }

  // Check size (base64 is ~33% larger than original)
  // Max 1.5MB base64 = ~1MB original image
  const sizeInMB = (input.imageBase64.length * 0.75) / (1024 * 1024);
  if (sizeInMB > 2) {
    return {
      valid: false,
      error: `Image too large: ${sizeInMB.toFixed(2)}MB (max 2MB)`
    };
  }

  return { valid: true };
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
 * Main processing function
 * @param {Object} params - Processing parameters
 * @param {string} params.imageBase64 - Base64 encoded image
 * @param {string} params.coupleId - Couple document ID
 * @param {Object} context - Firebase callable function context
 * @param {Object} context.auth - Authentication context
 * @param {string} context.auth.uid - Authenticated user ID
 * @returns {Promise<Object>} Processing result with parsed expense data
 */
async function processReceiptDirect(params, context) {
  const startTime = Date.now();

  console.log('Processing receipt (direct mode)', {
    coupleId: params?.coupleId,
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

  const { imageBase64, coupleId } = params;

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
    const userIds = [coupleData.user1Id, coupleData.user2Id].filter(Boolean);

    console.log('Authorization check:', {
      authenticatedUserId,
      user1Id: coupleData.user1Id,
      user2Id: coupleData.user2Id,
      userIds,
      isAuthorized: userIds.includes(authenticatedUserId)
    });

    if (!userIds.includes(authenticatedUserId)) {
      console.error('Authorization failed', {
        authenticatedUserId,
        coupleId,
        availableUserIds: userIds
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
    // Step 1: Convert base64 to buffer
    console.log('Converting base64 to buffer...');
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    console.log('Image buffer created', {
      size: imageBuffer.length,
      sizeKB: (imageBuffer.length / 1024).toFixed(2)
    });

    // Step 2: Perform OCR
    console.log('Performing OCR...');
    const ocrResult = await performOCR(imageBuffer);

    if (!ocrResult.success) {
      console.error('OCR failed', {
        error: ocrResult.error
      });

      return {
        success: false,
        error: `OCR failed: ${ocrResult.error}`
      };
    }

    const ocrData = ocrResult.data;
    console.log('OCR successful', {
      textLength: ocrData.rawText?.length || 0,
      confidence: ocrData.confidence
    });

    // Step 3: Parse receipt data
    console.log('Parsing receipt data...');
    const parseResult = parseReceiptData(ocrData.rawText);

    if (!parseResult.success) {
      console.warn('Parsing had issues', {
        error: parseResult.error
      });
    }

    const parsedData = parseResult.data;
    console.log('Parsing complete', {
      merchant: parsedData.merchantName,
      amount: parsedData.amount,
      date: parsedData.date
    });

    // Step 4: Predict category
    console.log('Predicting category...');
    const categoryResult = await predictCategory(ocrData.rawText, parsedData);
    const categoryData = categoryResult.data;

    console.log('Category predicted', {
      category: categoryData.suggestedCategory,
      confidence: categoryData.confidence
    });

    // Step 5: Return complete result
    const duration = Date.now() - startTime;
    console.log('Receipt processing complete', {
      duration: `${duration}ms`,
      success: true,
      currency: parsedData.currency,
      currencyConfidence: parsedData.currencyConfidence
    });

    return {
      success: true,
      data: {
        // Parsed receipt data
        merchant: parsedData.merchantName,
        amount: parsedData.amount,
        date: parsedData.date,
        tax: parsedData.tax,
        subtotal: parsedData.subtotal,

        // Currency detection (NEW)
        currency: parsedData.currency,
        currencyConfidence: parsedData.currencyConfidence,
        currencyDetected: parsedData.currencyDetected,

        // Category prediction (with fallback to 'other')
        suggestedCategory: categoryData.suggestedCategory || 'other',
        categoryConfidence: typeof categoryData.confidence === 'number' && !isNaN(categoryData.confidence)
          ? categoryData.confidence
          : 0,
        alternativeCategories: categoryData.alternativeCategories || [],

        // OCR metadata
        ocrConfidence: ocrData.confidence,
        rawText: ocrData.rawText,

        // Processing metadata
        processedAt: new Date().toISOString(),
        processingTimeMs: duration
      }
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Receipt processing failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    return {
      success: false,
      error: `Processing failed: ${error.message}`
    };
  }
}

module.exports = processReceiptDirect;
