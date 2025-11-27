// src/services/ocrService.js
// Service for OCR receipt scanning operations (Storage-free version)

import { doc, addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { httpsCallable } from 'firebase/functions';
import { Platform } from 'react-native';
import { db, functions, auth } from '../config/firebase';
import { compressImage } from '../utils/imageCompression';

/**
 * Convert image URI to base64 string
 * Handles different platforms (web, iOS, Android)
 * @param {string} imageUri - URI of the image file
 * @returns {Promise<string>} Base64 encoded image string
 */
async function imageToBase64(imageUri) {
  if (Platform.OS === 'web') {
    // On web, use fetch + FileReader to convert blob URI to base64
    const response = await fetch(imageUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // FileReader returns "data:image/png;base64,..." format
        // Extract just the base64 part after the comma
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // On native platforms, use FileSystem
    return await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}

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

    // Step 2: Convert to base64 (platform-specific)
    console.log('🔄 Converting image to base64...');
    const base64Start = Date.now();
    const base64Image = await imageToBase64(compressedImage.uri);
    console.log(`✅ Base64 conversion complete in ${Date.now() - base64Start}ms. Size: ${(base64Image.length/1024).toFixed(2)} KB`);

    // Step 3: Call Cloud Function with base64 image
    console.log('📡 Calling Cloud Function for OCR processing...');
    const ocrStart = Date.now();

    // Get current user's auth token
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get fresh ID token
    const idToken = await currentUser.getIdToken();
    console.log('✅ Got auth token for user:', currentUser.uid);

    // Call Cloud Function with direct HTTP request (required for .onRequest with CORS)
    const functionUrl = 'https://us-central1-dividela-76aba.cloudfunctions.net/processReceiptDirect';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        data: {
          imageBase64: base64Image,
          coupleId: coupleId
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    const result = { data: responseData.result || responseData };

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
