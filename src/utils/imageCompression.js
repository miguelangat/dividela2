/**
 * Image Compression Utility
 *
 * Provides functions to compress images for receipt OCR processing
 * Targets: Max 1MB file size, 1920px width, JPEG format
 * Uses multi-step compression to balance quality and file size
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Compression constants
const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
const MAX_WIDTH = 1920; // First pass width
const FALLBACK_WIDTH = 1280; // Second pass width for aggressive compression
const INITIAL_QUALITY = 0.8; // 80% quality - good for OCR readability
const FALLBACK_QUALITY = 0.6; // 60% quality - more aggressive compression

/**
 * Get image file information
 * @param {string} imageUri - URI of the image file
 * @returns {Promise<Object>} File information including size
 * @throws {Error} If file doesn't exist or can't be accessed
 */
export async function getImageInfo(imageUri) {
  try {
    // On web, FileSystem.getInfoAsync is not available
    // Use fetch to get blob and check size
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return {
        size: blob.size,
        uri: imageUri,
      };
    }

    // On native platforms, use FileSystem
    const fileInfo = await FileSystem.getInfoAsync(imageUri);

    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    return {
      size: fileInfo.size,
      uri: fileInfo.uri,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Compress receipt image for OCR processing
 *
 * Strategy:
 * 1. First pass: Resize to 1920px width, 80% quality
 * 2. Check file size
 * 3. If > 1MB: Second pass with 1280px width, 60% quality
 * 4. Cleanup temp files to prevent storage leaks
 *
 * @param {string} imageUri - URI of the image to compress
 * @returns {Promise<Object>} Compressed image with uri, width, height
 * @throws {Error} If URI is invalid or compression fails
 */
export async function compressReceipt(imageUri) {
  // Validate input
  if (!imageUri || typeof imageUri !== 'string' || imageUri.trim() === '') {
    throw new Error('Invalid image URI');
  }

  let firstPassUri = null;
  let secondPassUri = null;

  try {
    // Get original file info
    await getImageInfo(imageUri);

    // First compression pass
    // Resize to max width and apply initial quality
    const firstPass = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: MAX_WIDTH } }],
      {
        compress: INITIAL_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    firstPassUri = firstPass.uri;

    // Check file size after first pass
    const firstPassInfo = await getImageInfo(firstPass.uri);

    // If file is under 1MB, return first pass result
    if (firstPassInfo.size <= MAX_FILE_SIZE) {
      const result = {
        uri: firstPass.uri,
        width: firstPass.width,
        height: firstPass.height,
      };
      firstPassUri = null; // Don't delete, we're returning this
      return result;
    }

    // Second compression pass - more aggressive
    // Use smaller dimensions and lower quality
    const secondPass = await ImageManipulator.manipulateAsync(
      firstPass.uri,
      [{ resize: { width: FALLBACK_WIDTH } }],
      {
        compress: FALLBACK_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    secondPassUri = secondPass.uri;

    // Clean up first pass temp file
    if (firstPassUri && firstPassUri !== secondPassUri) {
      try {
        await FileSystem.deleteAsync(firstPassUri, { idempotent: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }
    }

    secondPassUri = null; // Don't delete, we're returning this
    return {
      uri: secondPass.uri,
      width: secondPass.width,
      height: secondPass.height,
    };
  } catch (error) {
    // Clean up temp files on error
    const filesToClean = [firstPassUri, secondPassUri].filter(Boolean);
    for (const fileUri of filesToClean) {
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }
    }
    throw error;
  }
}

// Alias for backward compatibility
export const compressImage = compressReceipt;

/**
 * Export constants for testing and reference
 */
export const COMPRESSION_CONSTANTS = {
  MAX_FILE_SIZE,
  MAX_WIDTH,
  FALLBACK_WIDTH,
  INITIAL_QUALITY,
  FALLBACK_QUALITY,
};
