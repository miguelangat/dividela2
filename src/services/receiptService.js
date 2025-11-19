// src/services/receiptService.js
// Service for managing receipt image uploads and storage

import { ref, uploadBytesResumable, deleteObject, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { storage, db } from '../config/firebase';

// Upload timeout in milliseconds (60 seconds)
const UPLOAD_TIMEOUT_MS = 60000;

/**
 * Wraps an upload task with timeout functionality
 * @param {UploadTask} uploadTask - Firebase upload task
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<string>} Download URL of the uploaded file
 */
async function uploadWithTimeout(uploadTask, timeoutMs = UPLOAD_TIMEOUT_MS, onProgress = null) {
  return new Promise((resolve, reject) => {
    let isComplete = false;
    let timeoutId = null;
    let unsubscribe = null;

    // Timeout handler
    timeoutId = setTimeout(() => {
      if (!isComplete) {
        isComplete = true;
        if (unsubscribe) unsubscribe();
        uploadTask.cancel();
        reject(new Error('Upload timeout exceeded'));
      }
    }, timeoutMs);

    // Upload progress listener
    unsubscribe = uploadTask.on('state_changed',
      (snapshot) => {
        // Report progress
        if (onProgress && typeof onProgress === 'function') {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(progress);
        }
      },
      (error) => {
        if (!isComplete) {
          isComplete = true;
          clearTimeout(timeoutId);
          if (unsubscribe) unsubscribe();
          reject(error);
        }
      },
      async () => {
        if (!isComplete) {
          isComplete = true;
          clearTimeout(timeoutId);
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      }
    );
  });
}

/**
 * Upload a receipt image to Firebase Storage
 * @param {string} imageUri - Local URI of the image to upload
 * @param {string} coupleId - ID of the couple
 * @param {string} userId - ID of the user uploading the receipt
 * @param {Function} onProgress - Optional callback for upload progress (0-100)
 * @param {number} timeoutMs - Optional timeout in milliseconds (default: 60000)
 * @returns {Promise<string>} Download URL of the uploaded image
 */
export const uploadReceipt = async (imageUri, coupleId, userId, onProgress, timeoutMs) => {
  let blob = null;

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

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.jpg`;
    const storagePath = `receipts/${coupleId}/${filename}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Fetch the image as blob
    const response = await fetch(imageUri);
    blob = await response.blob();

    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, blob);

    // Upload with timeout and progress tracking
    const downloadURL = await uploadWithTimeout(uploadTask, timeoutMs, onProgress);
    console.log('✅ Receipt uploaded:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  } finally {
    // Release blob to free memory
    if (blob) {
      try {
        blob = null; // Allow GC
      } catch (e) {
        console.warn('Failed to release blob:', e);
      }
    }
  }
};

/**
 * Cancel an ongoing upload task
 * @param {UploadTask} uploadTask - Firebase upload task to cancel
 * @returns {boolean} True if cancellation was initiated, false otherwise
 */
export const cancelUpload = (uploadTask) => {
  if (uploadTask && uploadTask.cancel) {
    return uploadTask.cancel();
  }
  return false;
};

/**
 * Delete a receipt image from Firebase Storage
 * @param {string} receiptUrl - Full URL of the receipt to delete
 * @returns {Promise<void>}
 */
export const deleteReceipt = async (receiptUrl) => {
  try {
    // Validate input
    if (!receiptUrl || receiptUrl.trim() === '') {
      throw new Error('Receipt URL is required');
    }

    // Validate URL format
    if (!receiptUrl.startsWith('http://') && !receiptUrl.startsWith('https://')) {
      throw new Error('Invalid receipt URL');
    }

    // Get reference from URL
    const storageRef = ref(storage, receiptUrl);
    await deleteObject(storageRef);

    console.log('✅ Receipt deleted');
    return true;
  } catch (error) {
    console.error('Error deleting receipt:', error);
    throw error;
  }
};

/**
 * Get receipt URL from an expense document
 * @param {string} expenseId - ID of the expense
 * @returns {Promise<string|null>} Receipt URL or null if no receipt exists
 */
export const getReceiptUrl = async (expenseId) => {
  try {
    // Validate input
    if (!expenseId || expenseId.trim() === '') {
      throw new Error('Expense ID is required');
    }

    // Get expense document
    const expenseRef = doc(db, 'expenses', expenseId);
    const expenseDoc = await getDoc(expenseRef);

    if (!expenseDoc.exists()) {
      throw new Error('Expense not found');
    }

    // Get receipt URL from document
    const expenseData = expenseDoc.data();
    return expenseData.receiptUrl || null;
  } catch (error) {
    console.error('Error getting receipt URL:', error);
    throw error;
  }
};
