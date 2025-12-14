/**
 * Google Cloud Vision API Client for OCR
 * Extracts text from receipt images using Google Cloud Vision
 */

const vision = require('@google-cloud/vision');

// Initialize Vision API client
const client = new vision.ImageAnnotatorClient();

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_IMAGE_SIZE_MB = 20;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const LOW_CONFIDENCE_THRESHOLD = 0.5;

// Transient error codes that should trigger retry
const TRANSIENT_ERROR_CODES = [
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'INTERNAL',
  'UNKNOWN'
];

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is transient and should be retried
 */
function isTransientError(error) {
  return error && TRANSIENT_ERROR_CODES.includes(error.code);
}

/**
 * Calculate confidence score from Vision API response
 */
function calculateConfidence(response) {
  if (!response || !response[0]) {
    return 0;
  }

  const result = response[0];

  // Try to get confidence from fullTextAnnotation
  if (result.fullTextAnnotation && result.fullTextAnnotation.pages) {
    const pages = result.fullTextAnnotation.pages;
    if (pages.length > 0 && typeof pages[0].confidence === 'number') {
      return pages[0].confidence;
    }
  }

  // Fallback: if we have text annotations, assume moderate confidence
  if (result.textAnnotations && result.textAnnotations.length > 0) {
    return 0.85; // Default confidence when not explicitly provided
  }

  return 0;
}

/**
 * Extract raw text from Vision API response
 */
function extractRawText(response) {
  if (!response || !response[0]) {
    return '';
  }

  const result = response[0];

  // First try fullTextAnnotation (most complete)
  if (result.fullTextAnnotation && result.fullTextAnnotation.text) {
    return result.fullTextAnnotation.text;
  }

  // Fallback to first textAnnotation (which contains all text)
  if (result.textAnnotations && result.textAnnotations.length > 0) {
    return result.textAnnotations[0].description || '';
  }

  return '';
}

/**
 * Validate image URL
 */
function validateImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    return {
      valid: false,
      error: 'Invalid image URL: URL must be a non-empty string'
    };
  }
  return { valid: true };
}

/**
 * Validate image buffer
 */
function validateImageBuffer(imageBuffer) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return {
      valid: false,
      error: 'Invalid image buffer: Buffer is required'
    };
  }

  if (imageBuffer.length === 0) {
    return {
      valid: false,
      error: 'Empty image buffer'
    };
  }

  if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image too large: Size ${Math.round(imageBuffer.length / 1024 / 1024)}MB exceeds maximum ${MAX_IMAGE_SIZE_MB}MB`
    };
  }

  return { valid: true };
}

/**
 * Build error response
 */
function buildErrorResponse(error, imageUrl = null) {
  const response = {
    success: false,
    error: error.message || 'Unknown error',
    errorCode: error.code || 'UNKNOWN',
    timestamp: new Date().toISOString()
  };

  if (imageUrl) {
    response.imageUrl = imageUrl;
  }

  return response;
}

/**
 * Build success response
 */
function buildSuccessResponse(rawText, confidence, imageUrl = null) {
  const response = {
    success: true,
    rawText,
    confidence,
    timestamp: new Date().toISOString()
  };

  if (imageUrl) {
    response.imageUrl = imageUrl;
  }

  // Add warning for low confidence results
  if (confidence < LOW_CONFIDENCE_THRESHOLD && confidence > 0) {
    response.warning = `Text extraction completed with low confidence (${(confidence * 100).toFixed(1)}%). Results may be inaccurate.`;
  }

  return response;
}

/**
 * Call Vision API with retry logic
 */
async function callVisionApiWithRetry(request, retries = MAX_RETRIES) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.textDetection(request);
      return response;
    } catch (error) {
      lastError = error;

      // Don't retry on non-transient errors
      if (!isTransientError(error)) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt >= retries) {
        const retryError = new Error(`Vision API failed after ${retries} retries: ${error.message}`);
        retryError.code = error.code;
        retryError.originalError = error;
        throw retryError;
      }

      // Wait before retrying (exponential backoff)
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Extract text from receipt image using Google Cloud Vision
 * @param {string} imageUrl - Public URL or Google Cloud Storage path (gs://...)
 * @returns {Promise<{rawText: string, confidence: number, success: boolean}>}
 */
async function extractTextFromImage(imageUrl) {
  // Validate input
  const validation = validateImageUrl(imageUrl);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Prepare request
    const request = {
      image: {
        source: {
          imageUri: imageUrl
        }
      }
    };

    // Call Vision API with retry logic
    const response = await callVisionApiWithRetry(request);

    // Extract text and confidence
    const rawText = extractRawText(response);
    const confidence = calculateConfidence(response);

    // Check if no text was detected
    if (!rawText || rawText.trim() === '') {
      // Check if response is completely blank (null fullTextAnnotation)
      if (!response[0] || !response[0].fullTextAnnotation) {
        return null; // Completely blank image
      }

      return {
        success: false,
        error: 'No text detected in image',
        rawText: '',
        confidence: 0,
        imageUrl,
        timestamp: new Date().toISOString()
      };
    }

    // Return success response
    return buildSuccessResponse(rawText, confidence, imageUrl);

  } catch (error) {
    return buildErrorResponse(error, imageUrl);
  }
}

/**
 * Process image buffer directly
 * @param {Buffer} imageBuffer - Image data as Buffer
 * @param {string} mimeType - Optional MIME type (image/jpeg, image/png, image/webp)
 * @returns {Promise<object>}
 */
async function processReceiptImage(imageBuffer, mimeType = null) {
  // Validate input
  const validation = validateImageBuffer(imageBuffer);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Prepare request with image buffer
    const request = {
      image: {
        content: imageBuffer
      }
    };

    // Call Vision API with retry logic
    const response = await callVisionApiWithRetry(request);

    // Extract text and confidence
    const rawText = extractRawText(response);
    const confidence = calculateConfidence(response);

    // Check if no text was detected
    if (!rawText || rawText.trim() === '') {
      if (!response[0] || !response[0].fullTextAnnotation) {
        return null; // Completely blank image
      }

      return {
        success: false,
        error: 'No text detected in image',
        rawText: '',
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Return success response
    return buildSuccessResponse(rawText, confidence);

  } catch (error) {
    return buildErrorResponse(error);
  }
}

module.exports = {
  extractTextFromImage,
  processReceiptImage
};
