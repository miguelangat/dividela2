// src/services/ocrService.js
// Service for OCR receipt scanning operations

import { doc, addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadReceipt } from './receiptService';
import { compressImage } from '../utils/imageCompression';

/**
 * Scan receipt in background by uploading and triggering Cloud Function
 * @param {string} imageUri - Local URI of the receipt image
 * @param {string} coupleId - ID of the couple
 * @param {string} userId - ID of the user
 * @param {Function} onProgress - Optional callback for upload progress
 * @returns {Promise<Object>} Object with expenseId and receiptUrl
 */
export const scanReceiptInBackground = async (imageUri, coupleId, userId, onProgress) => {
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

    // Step 2: Upload to Storage
    console.log('📤 Starting upload to Firebase Storage...');
    const uploadStart = Date.now();
    const receiptUrl = await uploadReceipt(
      compressedImage.uri,
      coupleId,
      userId,
      onProgress || undefined
    );
    console.log(`✅ Upload complete in ${Date.now() - uploadStart}ms`);

    // Step 3: Create pending expense document
    console.log('Creating expense document...');
    const expensesRef = collection(db, 'expenses');
    const expenseData = {
      coupleId,
      paidBy: userId,
      receiptUrl,
      ocrStatus: 'processing',
      amount: 0, // Placeholder until OCR completes
      merchant: 'Processing...', // Placeholder until OCR completes
      description: 'Receipt scan in progress',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(expensesRef, expenseData);
    console.log('Expense document created:', docRef.id);

    // Cloud Function will be triggered automatically via Firestore trigger
    // It will process the receipt and update the document

    return {
      expenseId: docRef.id,
      receiptUrl,
    };
  } catch (error) {
    console.error('Error scanning receipt:', error);
    throw error;
  }
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
