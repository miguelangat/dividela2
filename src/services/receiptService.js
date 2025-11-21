// src/services/receiptService.js
// Service for managing receipt image uploads and storage

import { ref, uploadBytesResumable, deleteObject, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { Platform } from 'react-native';

// Upload timeout in milliseconds
// Web uploads can be slower, so we give them more time
const UPLOAD_TIMEOUT_MS = Platform.OS === 'web' ? 120000 : 60000; // 120s for web, 60s for native

/**
 * Wraps an upload task with timeout functionality
 * @param {UploadTask} uploadTask - Firebase upload task
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<string>} Download URL of the uploaded file
 */
async function uploadWithTimeout(uploadTask, timeoutMs = UPLOAD_TIMEOUT_MS, onProgress = null) {
  console.log(`⏱️ Upload timeout set to ${timeoutMs}ms (${timeoutMs/1000}s)`);

  return new Promise((resolve, reject) => {
    let isComplete = false;
    let timeoutId = null;
    let unsubscribe = null;
    let lastProgress = 0;

    // Timeout handler
    timeoutId = setTimeout(() => {
      if (!isComplete) {
        isComplete = true;
        if (unsubscribe) unsubscribe();
        uploadTask.cancel();
        console.error(`❌ Upload timeout exceeded after ${timeoutMs}ms. Last progress: ${lastProgress}%`);
        reject(new Error(`Upload timeout exceeded after ${timeoutMs/1000}s. Last progress: ${lastProgress}%`));
      }
    }, timeoutMs);

    // Upload progress listener
    unsubscribe = uploadTask.on('state_changed',
      (snapshot) => {
        // Report progress
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        lastProgress = progress;

        console.log(`📤 Upload progress: ${progress}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);

        if (onProgress && typeof onProgress === 'function') {
          onProgress(progress);
        }
      },
      (error) => {
        if (!isComplete) {
          isComplete = true;
          clearTimeout(timeoutId);
          if (unsubscribe) unsubscribe();
          console.error('❌ Upload error:', error);
          reject(error);
        }
      },
      async () => {
        if (!isComplete) {
          isComplete = true;
          clearTimeout(timeoutId);
          console.log('✅ Upload complete, getting download URL...');
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ Download URL obtained:', downloadURL);
            resolve(downloadURL);
          } catch (error) {
            console.error('❌ Error getting download URL:', error);
            reject(error);
          }
        }
      }
    );
  });
}

/**
 * Detect file type from URI or blob
 * @param {string} uri - File URI
 * @param {Blob} blob - File blob
 * @returns {string} File extension (jpg, png, pdf, etc.)
 */
function detectFileExtension(uri, blob) {
  // Try URI first
  const lowerUri = uri.toLowerCase();
  if (lowerUri.endsWith('.pdf')) return 'pdf';
  if (lowerUri.endsWith('.png')) return 'png';
  if (lowerUri.endsWith('.jpg') || lowerUri.endsWith('.jpeg')) return 'jpg';
  if (lowerUri.endsWith('.webp')) return 'webp';

  // Try blob type
  if (blob && blob.type) {
    if (blob.type === 'application/pdf') return 'pdf';
    if (blob.type === 'image/png') return 'png';
    if (blob.type === 'image/jpeg') return 'jpg';
    if (blob.type === 'image/webp') return 'webp';
  }

  // Default to jpg for images
  return 'jpg';
}

/**
 * Upload a receipt file (image or PDF) to Firebase Storage
 * @param {string} fileUri - Local URI of the file to upload
 * @param {string} coupleId - ID of the couple
 * @param {string} userId - ID of the user uploading the receipt
 * @param {Function} onProgress - Optional callback for upload progress (0-100)
 * @param {number} timeoutMs - Optional timeout in milliseconds (default: 60000)
 * @returns {Promise<string>} Download URL of the uploaded file
 */
export const uploadReceipt = async (fileUri, coupleId, userId, onProgress, timeoutMs) => {
  let blob = null;

  try {
    // Validate inputs
    if (!fileUri || fileUri.trim() === '') {
      throw new Error('File URI is required');
    }
    if (!coupleId || coupleId.trim() === '') {
      throw new Error('Couple ID is required');
    }
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required');
    }

    console.log('📥 Starting receipt upload process...');
    console.log('📁 File URI:', fileUri);

    // Fetch the file as blob
    console.log('🔄 Fetching file as blob...');
    const fetchStart = Date.now();
    const response = await fetch(fileUri);
    blob = await response.blob();
    console.log(`✅ Blob fetched in ${Date.now() - fetchStart}ms. Size: ${blob.size} bytes (${(blob.size/1024).toFixed(2)} KB)`);

    // Detect file extension
    const extension = detectFileExtension(fileUri, blob);

    // Generate unique filename with timestamp and correct extension
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.${extension}`;
    const storagePath = `receipts/${coupleId}/${filename}`;

    console.log('📤 Uploading receipt:', { extension, storagePath, size: blob.size });

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, blob);

    // Upload with timeout and progress tracking
    const uploadStart = Date.now();
    const downloadURL = await uploadWithTimeout(uploadTask, timeoutMs, onProgress);
    console.log(`✅ Upload completed in ${Date.now() - uploadStart}ms`);
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
