/**
 * PDF to Image Converter
 *
 * Converts PDF pages to images for OCR processing
 * Platform-specific implementations for web and mobile
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Convert PDF page to image for OCR processing
 *
 * @param {Buffer|Uint8Array|string} pdfData - PDF file as buffer or base64 string
 * @param {number} pageNumber - Page number to convert (1-indexed, default: 1)
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} Image data with uri, width, height
 */
export async function convertPDFPageToImage(pdfData, pageNumber = 1, options = {}) {
  const {
    scale = 2.0, // Higher scale = better OCR quality
    format = 'jpeg',
    quality = 0.95,
  } = options;

  if (Platform.OS === 'web') {
    return convertPDFPageToImageWeb(pdfData, pageNumber, { scale, format, quality });
  } else {
    return convertPDFPageToImageNative(pdfData, pageNumber, { scale, format, quality });
  }
}

/**
 * Web implementation using pdfjs-dist
 */
async function convertPDFPageToImageWeb(pdfData, pageNumber, options) {
  // Dynamically import pdfjs-dist (only available on web)
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  try {
    // Convert pdfData to Uint8Array if needed
    let pdfBuffer;
    if (typeof pdfData === 'string') {
      // Assume base64 string
      const base64Data = pdfData.includes('base64,')
        ? pdfData.split('base64,')[1]
        : pdfData;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfBuffer = bytes;
    } else if (pdfData instanceof Buffer) {
      pdfBuffer = new Uint8Array(pdfData);
    } else {
      pdfBuffer = pdfData;
    }

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;

    // Validate page number
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pdf.numPages} pages.`);
    }

    // Get the specified page
    const page = await pdf.getPage(pageNumber);

    // Calculate viewport at specified scale
    const viewport = page.getViewport({ scale: options.scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Convert canvas to blob
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        `image/${options.format}`,
        options.quality
      );
    });

    // Convert blob to data URI
    const reader = new FileReader();
    const dataUri = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return {
      uri: dataUri,
      width: viewport.width,
      height: viewport.height,
      pageNumber,
      format: options.format,
    };
  } catch (error) {
    throw new Error(`PDF to image conversion failed: ${error.message}`);
  }
}

/**
 * Native implementation (iOS/Android)
 *
 * Note: This requires additional native libraries for full support
 * For MVP, we can restrict PDF receipts to web platform
 * or implement a simplified version using expo-print
 */
async function convertPDFPageToImageNative(pdfData, pageNumber, options) {
  // For now, throw error indicating mobile support is limited
  // Future implementation could use:
  // - react-native-pdf with screenshot capability
  // - expo-print to render PDF then capture
  // - Native module for PDF rendering

  throw new Error(
    'PDF receipt scanning on mobile requires additional setup. ' +
    'For best results, use the web app to scan PDF receipts, ' +
    'or take a photo of the receipt instead.'
  );

  // Future implementation sketch:
  /*
  try {
    // Convert pdfData to file URI if needed
    let pdfUri;
    if (typeof pdfData === 'string' && pdfData.startsWith('file://')) {
      pdfUri = pdfData;
    } else {
      // Write buffer to temp file
      const tempPath = `${FileSystem.cacheDirectory}temp-receipt.pdf`;
      const base64Data = typeof pdfData === 'string'
        ? pdfData
        : Buffer.from(pdfData).toString('base64');

      await FileSystem.writeAsStringAsync(tempPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      pdfUri = tempPath;
    }

    // Use expo-print or react-native-pdf to render PDF
    // Then capture screenshot of rendered page
    // Return image URI

    return {
      uri: imageUri,
      width,
      height,
      pageNumber,
      format: options.format,
    };
  } catch (error) {
    throw new Error(`Native PDF to image conversion failed: ${error.message}`);
  }
  */
}

/**
 * Convert all pages of a PDF to images
 *
 * @param {Buffer|Uint8Array|string} pdfData - PDF file data
 * @param {Object} options - Conversion options
 * @returns {Promise<Array>} Array of image data objects
 */
export async function convertPDFToImages(pdfData, options = {}) {
  if (Platform.OS !== 'web') {
    throw new Error('Multi-page PDF conversion only supported on web platform');
  }

  // Dynamically import pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  try {
    // Convert pdfData to Uint8Array if needed
    let pdfBuffer;
    if (typeof pdfData === 'string') {
      const base64Data = pdfData.includes('base64,')
        ? pdfData.split('base64,')[1]
        : pdfData;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfBuffer = bytes;
    } else if (pdfData instanceof Buffer) {
      pdfBuffer = new Uint8Array(pdfData);
    } else {
      pdfBuffer = pdfData;
    }

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;

    // Convert each page
    const images = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const imageData = await convertPDFPageToImage(pdfData, i, options);
      images.push(imageData);
    }

    return images;
  } catch (error) {
    throw new Error(`PDF to images conversion failed: ${error.message}`);
  }
}

/**
 * Get PDF page count
 *
 * @param {Buffer|Uint8Array|string} pdfData - PDF file data
 * @returns {Promise<number>} Number of pages
 */
export async function getPDFPageCount(pdfData) {
  if (Platform.OS === 'web') {
    const pdfjsLib = await import('pdfjs-dist');

    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }

    // Convert pdfData to Uint8Array if needed
    let pdfBuffer;
    if (typeof pdfData === 'string') {
      const base64Data = pdfData.includes('base64,')
        ? pdfData.split('base64,')[1]
        : pdfData;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfBuffer = bytes;
    } else if (pdfData instanceof Buffer) {
      pdfBuffer = new Uint8Array(pdfData);
    } else {
      pdfBuffer = pdfData;
    }

    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } else {
    // Use pdf-parse for page count on mobile
    const pdf = await import('pdf-parse');
    const pdfBuffer = typeof pdfData === 'string'
      ? Buffer.from(pdfData, 'base64')
      : pdfData;
    const data = await pdf.default(pdfBuffer);
    return data.numpages;
  }
}

/**
 * Validate PDF file size (max 10MB)
 */
export function validatePDFSize(pdfBuffer) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const size = pdfBuffer.length || pdfBuffer.byteLength;

  if (size > maxSize) {
    throw new Error(
      `PDF file is too large (${(size / 1024 / 1024).toFixed(1)}MB). ` +
      `Maximum size is 10MB. Try taking a photo instead.`
    );
  }

  return true;
}

export default {
  convertPDFPageToImage,
  convertPDFToImages,
  getPDFPageCount,
  validatePDFSize,
};
