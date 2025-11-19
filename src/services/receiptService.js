// src/services/receiptService.js
// Service for managing receipt image uploads and storage

import { ref, uploadBytesResumable, deleteObject, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { storage, db } from '../config/firebase';

/**
 * Upload a receipt image to Firebase Storage
 * @param {string} imageUri - Local URI of the image to upload
 * @param {string} coupleId - ID of the couple
 * @param {string} userId - ID of the user uploading the receipt
 * @param {Function} onProgress - Optional callback for upload progress (0-100)
 * @returns {Promise<string>} Download URL of the uploaded image
 */
export const uploadReceipt = async (imageUri, coupleId, userId, onProgress) => {
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
    const blob = await response.blob();

    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, blob);

    // Return a promise that resolves when upload completes
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calculate and report progress
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );

          if (onProgress && typeof onProgress === 'function') {
            onProgress(progress);
          }
        },
        (error) => {
          // Handle upload errors
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ Receipt uploaded:', downloadURL);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
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

    // Extract storage path from URL
    // Firebase Storage URLs have format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}
    // We need to create a reference using the path
    const storageRef = ref(storage, receiptUrl);

    // Delete the file
    await deleteObject(storageRef);

    console.log('✅ Receipt deleted');
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
