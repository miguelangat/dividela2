// src/services/ocrService.js
// Service for OCR receipt scanning operations (Storage-free version)

import { doc, addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { compressImage } from '../utils/imageCompression';

/**
 * Scan receipt directly using Cloud Function (no Storage upload)
 * @param {string} imageUri - Local URI of the receipt image
 * @param {string} coupleId - ID of the couple
 * @param {string} userId - ID of the user
 * @returns {Promise<Object>} Object with parsed receipt data
 */
export const scanReceiptDirect = async (imageUri, coupleId, userId) => {
  try {
    // Validate inputs
    if (!imageUri || imageUri.trim() === '') {
      throw new Error('Image URI is required');
    }
    if (!coupleId || coupleId.trim() === '') {
      throw new Error('Couple ID is required');
    }
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required');
    }

    // Step 1: Compress image
    console.log('🗜️ Starting image compression...');
    const compressionStart = Date.now();
    const compressedImage = await compressImage(imageUri);
    console.log(`✅ Image compressed in ${Date.now() - compressionStart}ms. Size: ${compressedImage.size} bytes (${(compressedImage.size/1024).toFixed(2)} KB)`);

    // Step 2: Convert to base64
    console.log('🔄 Converting image to base64...');
    const base64Start = Date.now();
    const base64Image = await FileSystem.readAsStringAsync(compressedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`✅ Base64 conversion complete in ${Date.now() - base64Start}ms. Size: ${(base64Image.length/1024).toFixed(2)} KB`);

    // Step 3: Call Cloud Function with base64 image
    console.log('📡 Calling Cloud Function for OCR processing...');
    const ocrStart = Date.now();

    const functions = getFunctions();
    const processReceipt = httpsCallable(functions, 'processReceiptDirect');

    const result = await processReceipt({
      imageBase64: base64Image,
      coupleId: coupleId
    });

    console.log(`✅ OCR complete in ${Date.now() - ocrStart}ms`);

    if (!result.data || !result.data.success) {
      throw new Error(result.data?.error || 'OCR processing failed');
    }

    const ocrData = result.data.data;
    console.log('📋 Parsed receipt data:', {
      merchant: ocrData.merchant,
      amount: ocrData.amount,
      date: ocrData.date,
      category: ocrData.suggestedCategory,
      confidence: ocrData.ocrConfidence
    });

    return {
      merchant: ocrData.merchant,
      amount: ocrData.amount,
      date: ocrData.date,
      tax: ocrData.tax,
      subtotal: ocrData.subtotal,
      suggestedCategory: ocrData.suggestedCategory,
      categoryConfidence: ocrData.categoryConfidence,
      alternativeCategories: ocrData.alternativeCategories,
      ocrConfidence: ocrData.ocrConfidence,
      rawText: ocrData.rawText,
      processedAt: ocrData.processedAt,
      processingTimeMs: ocrData.processingTimeMs
    };

  } catch (error) {
    console.error('❌ Error scanning receipt:', error);
    throw error;
  }
};

// Legacy function - kept for backwards compatibility but deprecated
export const scanReceiptInBackground = async (imageUri, coupleId, userId, onProgress) => {
  console.warn('⚠️ scanReceiptInBackground is deprecated. Use scanReceiptDirect instead.');
  return scanReceiptDirect(imageUri, coupleId, userId);
};

/**
 * Subscribe to OCR results for an expense
 * @param {string} expenseId - ID of the expense to monitor
 * @param {Function} callback - Callback function for updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToOCRResults = (expenseId, callback) => {
  // Validate inputs
  if (!expenseId || expenseId.trim() === '') {
    throw new Error('Expense ID is required');
  }
  if (!callback) {
    throw new Error('Callback is required');
  }
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  // Subscribe to document changes
  const expenseRef = doc(db, 'expenses', expenseId);

  const unsubscribe = onSnapshot(
    expenseRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback({
          status: 'error',
          error: 'Expense not found',
        });
        return;
      }

      const data = snapshot.data();
      const { ocrStatus, ocrError, ...expenseData } = data;

      // Handle different OCR statuses
      if (ocrStatus === 'completed') {
        callback({
          status: 'completed',
          data: expenseData,
        });
      } else if (ocrStatus === 'failed') {
        callback({
          status: 'failed',
          error: ocrError || 'OCR processing failed',
        });
      } else if (ocrStatus === 'processing') {
        callback({
          status: 'processing',
        });
      } else {
        callback({
          status: ocrStatus || 'unknown',
          data: expenseData,
        });
      }
    },
    (error) => {
      console.error('Error in OCR subscription:', error);
      callback({
        status: 'error',
        error: error.message,
      });
    }
  );

  return unsubscribe;
};

/**
 * Record OCR feedback for learning purposes
 * @param {Object} suggestions - OCR suggested data
 * @param {Object} finalData - User-corrected final data
 * @param {string} coupleId - ID of the couple
 * @returns {Promise<Object>} Created learning document
 */
export const recordOCRFeedback = async (suggestions, finalData, coupleId) => {
  try {
    // Validate inputs
    if (!suggestions) {
      throw new Error('Suggestions data is required');
    }
    if (!finalData) {
      throw new Error('Final data is required');
    }
    if (!coupleId || coupleId.trim() === '') {
      throw new Error('Couple ID is required');
    }

    // Track which fields were edited
    const editedFields = [];
    const suggestionKeys = Object.keys(suggestions);

    for (const key of suggestionKeys) {
      if (suggestions[key] !== finalData[key]) {
        editedFields.push(key);
      }
    }

    // Calculate accuracy (percentage of fields that were correct)
    const totalFields = suggestionKeys.length;
    const correctFields = totalFields - editedFields.length;
    const accuracy = totalFields > 0 ? correctFields / totalFields : 0;

    // Create learning data document
    const learningRef = collection(db, 'ocrLearningData');
    const learningData = {
      coupleId,
      suggestions,
      finalData,
      editedFields,
      accuracy,
      totalFields,
      correctFields,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(learningRef, learningData);

    console.log('OCR feedback recorded:', docRef.id);
    console.log('Accuracy:', (accuracy * 100).toFixed(1) + '%');

    return {
      id: docRef.id,
      accuracy,
      editedFields,
    };
  } catch (error) {
    console.error('Error recording OCR feedback:', error);
    throw error;
  }
};
