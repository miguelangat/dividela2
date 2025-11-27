/**
 * Image Rotation & Quality Detection Tests
 *
 * Tests the system's ability to:
 * - Detect and correct image rotation
 * - Assess image quality before OCR
 * - Detect non-receipt images
 * - Handle poor lighting conditions
 * - Process various image formats
 * - Validate image dimensions and size
 */

const { detectImageRotation, correctRotation } = require('../../src/ocr/imageRotation');
const { assessImageQuality, isReceiptImage } = require('../../src/ocr/imageQualityDetector');
const { preprocessImage } = require('../../src/ocr/imagePreprocessor');
const { extractTextFromImageUrl } = require('../../src/ocr/visionClient');

// Mock Google Cloud Vision
jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn(() => ({
    textDetection: jest.fn(),
    imageProperties: jest.fn(),
  })),
}));

describe('Image Rotation Detection', () => {
  let visionClient;

  beforeEach(() => {
    const vision = require('@google-cloud/vision');
    visionClient = new vision.ImageAnnotatorClient();
  });

  describe('Rotation Detection', () => {
    it('should detect 90-degree clockwise rotation', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Rotated text',
          boundingPoly: {
            vertices: [
              { x: 100, y: 0 },
              { x: 100, y: 50 },
              { x: 0, y: 50 },
              { x: 0, y: 0 },
            ]
          }
        }],
      }]);

      const rotation = await detectImageRotation('rotated-90-cw.jpg');

      expect(rotation.angle).toBe(90);
      expect(rotation.confidence).toBeGreaterThan(0.8);
    });

    it('should detect 90-degree counter-clockwise rotation', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Rotated text',
          boundingPoly: {
            vertices: [
              { x: 0, y: 100 },
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 100 },
            ]
          }
        }],
      }]);

      const rotation = await detectImageRotation('rotated-90-ccw.jpg');

      expect(rotation.angle).toBe(270);
      expect(rotation.confidence).toBeGreaterThan(0.8);
    });

    it('should detect 180-degree rotation', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Upside down text',
          boundingPoly: {
            vertices: [
              { x: 50, y: 50 },
              { x: 0, y: 50 },
              { x: 0, y: 0 },
              { x: 50, y: 0 },
            ]
          }
        }],
      }]);

      const rotation = await detectImageRotation('rotated-180.jpg');

      expect(rotation.angle).toBe(180);
      expect(rotation.confidence).toBeGreaterThan(0.7);
    });

    it('should detect no rotation for properly oriented images', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Normal text',
          boundingPoly: {
            vertices: [
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 50, y: 10 },
              { x: 0, y: 10 },
            ]
          }
        }],
      }]);

      const rotation = await detectImageRotation('normal.jpg');

      expect(rotation.angle).toBe(0);
      expect(rotation.confidence).toBeGreaterThan(0.9);
    });

    it('should handle images with multiple text orientations', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [
          {
            description: 'Text 1',
            boundingPoly: { vertices: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 10 }, { x: 0, y: 10 }] }
          },
          {
            description: 'Text 2',
            boundingPoly: { vertices: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 10 }, { x: 0, y: 10 }] }
          },
          {
            description: 'Rotated',
            boundingPoly: { vertices: [{ x: 100, y: 0 }, { x: 100, y: 50 }, { x: 90, y: 50 }, { x: 90, y: 0 }] }
          },
        ],
      }]);

      const rotation = await detectImageRotation('mixed-orientation.jpg');

      // Should use majority orientation
      expect(rotation.angle).toBe(0);
      expect(rotation.confidence).toBeLessThan(0.9); // Lower confidence due to mixed orientations
    });
  });

  describe('Rotation Correction', () => {
    it('should correct 90-degree rotation', async () => {
      const originalBuffer = Buffer.from('fake-rotated-image');
      const correctedBuffer = await correctRotation(originalBuffer, 90);

      expect(correctedBuffer).toBeDefined();
      expect(Buffer.isBuffer(correctedBuffer)).toBe(true);
    });

    it('should not modify image if rotation is 0', async () => {
      const originalBuffer = Buffer.from('fake-normal-image');
      const correctedBuffer = await correctRotation(originalBuffer, 0);

      expect(correctedBuffer).toEqual(originalBuffer);
    });

    it('should handle multiple rotation angles', async () => {
      const angles = [0, 90, 180, 270];

      for (const angle of angles) {
        const buffer = await correctRotation(Buffer.from('test'), angle);
        expect(buffer).toBeDefined();
      }
    });
  });
});

describe('Image Quality Assessment', () => {
  let visionClient;

  beforeEach(() => {
    const vision = require('@google-cloud/vision');
    visionClient = new vision.ImageAnnotatorClient();
  });

  describe('Quality Scoring', () => {
    it('should detect high-quality images', async () => {
      visionClient.imageProperties.mockResolvedValue([{
        imagePropertiesAnnotation: {
          dominantColors: {
            colors: [
              { color: { red: 255, green: 255, blue: 255 }, score: 0.5, pixelFraction: 0.7 },
            ]
          }
        }
      }]);

      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Clear text',
          confidence: 0.95
        }],
      }]);

      const quality = await assessImageQuality('high-quality.jpg');

      expect(quality.score).toBeGreaterThan(0.8);
      expect(quality.issues).toHaveLength(0);
      expect(quality.suitable).toBe(true);
    });

    it('should detect blurry images', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Blurry text',
          confidence: 0.45
        }],
      }]);

      const quality = await assessImageQuality('blurry.jpg');

      expect(quality.score).toBeLessThan(0.6);
      expect(quality.issues).toContain('blur');
      expect(quality.suitable).toBe(false);
    });

    it('should detect poor lighting (too dark)', async () => {
      visionClient.imageProperties.mockResolvedValue([{
        imagePropertiesAnnotation: {
          dominantColors: {
            colors: [
              { color: { red: 10, green: 10, blue: 10 }, score: 0.8, pixelFraction: 0.9 },
            ]
          }
        }
      }]);

      const quality = await assessImageQuality('too-dark.jpg');

      expect(quality.score).toBeLessThan(0.5);
      expect(quality.issues).toContain('too_dark');
      expect(quality.warnings).toContain('Poor lighting detected');
    });

    it('should detect poor lighting (overexposed)', async () => {
      visionClient.imageProperties.mockResolvedValue([{
        imagePropertiesAnnotation: {
          dominantColors: {
            colors: [
              { color: { red: 255, green: 255, blue: 255 }, score: 0.9, pixelFraction: 0.95 },
            ]
          }
        }
      }]);

      const quality = await assessImageQuality('overexposed.jpg');

      expect(quality.score).toBeLessThan(0.6);
      expect(quality.issues).toContain('overexposed');
    });

    it('should detect low resolution images', async () => {
      const quality = await assessImageQuality('low-res.jpg', {
        width: 200,
        height: 150
      });

      expect(quality.score).toBeLessThan(0.7);
      expect(quality.issues).toContain('low_resolution');
      expect(quality.warnings).toContain('Image resolution too low');
    });

    it('should provide quality improvement suggestions', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Text',
          confidence: 0.50
        }],
      }]);

      const quality = await assessImageQuality('poor-quality.jpg');

      expect(quality.suggestions).toBeDefined();
      expect(quality.suggestions.length).toBeGreaterThan(0);
      expect(quality.suggestions).toContain('Improve lighting');
    });
  });

  describe('Receipt Detection', () => {
    it('should identify receipt images', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'WALMART\nSubtotal: $45.50\nTax: $3.64\nTOTAL: $49.14\nDate: 11/19/2025',
        }],
      }]);

      const result = await isReceiptImage('receipt.jpg');

      expect(result.isReceipt).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.indicators).toContain('total');
      expect(result.indicators).toContain('tax');
      expect(result.indicators).toContain('date');
    });

    it('should reject non-receipt images (landscape photo)', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Beautiful sunset at the beach',
        }],
      }]);

      const result = await isReceiptImage('landscape.jpg');

      expect(result.isReceipt).toBe(false);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.reason).toContain('No receipt indicators found');
    });

    it('should reject non-receipt images (document)', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'This is a contract between Party A and Party B regarding...',
        }],
      }]);

      const result = await isReceiptImage('document.jpg');

      expect(result.isReceipt).toBe(false);
      expect(result.reason).toContain('No receipt indicators');
    });

    it('should handle partial receipts', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'TO... $49.14',  // Partial/cut off
        }],
      }]);

      const result = await isReceiptImage('partial-receipt.jpg');

      expect(result.isReceipt).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.warnings).toContain('Partial receipt detected');
    });

    it('should detect handwritten receipts', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'Coffee $4.50\nTotal $4.50',
          confidence: 0.65  // Lower confidence for handwriting
        }],
      }]);

      const result = await isReceiptImage('handwritten.jpg');

      expect(result.isReceipt).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.type).toBe('handwritten');
    });
  });

  describe('Format Validation', () => {
    it('should accept JPEG format', async () => {
      const quality = await assessImageQuality('receipt.jpg', {
        format: 'image/jpeg'
      });

      expect(quality.formatSupported).toBe(true);
    });

    it('should accept PNG format', async () => {
      const quality = await assessImageQuality('receipt.png', {
        format: 'image/png'
      });

      expect(quality.formatSupported).toBe(true);
    });

    it('should reject unsupported formats', async () => {
      const quality = await assessImageQuality('receipt.bmp', {
        format: 'image/bmp'
      });

      expect(quality.formatSupported).toBe(false);
      expect(quality.issues).toContain('unsupported_format');
    });

    it('should validate file size limits', async () => {
      const quality = await assessImageQuality('huge-receipt.jpg', {
        size: 25 * 1024 * 1024  // 25MB
      });

      expect(quality.issues).toContain('file_too_large');
      expect(quality.suitable).toBe(false);
    });
  });
});

describe('Image Preprocessing', () => {
  describe('Automatic Enhancement', () => {
    it('should enhance contrast for low-contrast images', async () => {
      const lowContrastBuffer = Buffer.from('low-contrast-image');
      const enhanced = await preprocessImage(lowContrastBuffer, {
        enhanceContrast: true
      });

      expect(enhanced).toBeDefined();
      expect(Buffer.isBuffer(enhanced)).toBe(true);
    });

    it('should adjust brightness for dark images', async () => {
      const darkBuffer = Buffer.from('dark-image');
      const enhanced = await preprocessImage(darkBuffer, {
        adjustBrightness: true,
        brightnessLevel: 1.3
      });

      expect(enhanced).toBeDefined();
    });

    it('should sharpen blurry images', async () => {
      const blurryBuffer = Buffer.from('blurry-image');
      const enhanced = await preprocessImage(blurryBuffer, {
        sharpen: true
      });

      expect(enhanced).toBeDefined();
    });

    it('should convert to grayscale for better OCR', async () => {
      const colorBuffer = Buffer.from('color-image');
      const grayscale = await preprocessImage(colorBuffer, {
        grayscale: true
      });

      expect(grayscale).toBeDefined();
    });

    it('should apply multiple enhancements', async () => {
      const poorQualityBuffer = Buffer.from('poor-quality-image');
      const enhanced = await preprocessImage(poorQualityBuffer, {
        enhanceContrast: true,
        adjustBrightness: true,
        sharpen: true,
        grayscale: true
      });

      expect(enhanced).toBeDefined();
    });

    it('should preserve original if quality is already good', async () => {
      const goodQualityBuffer = Buffer.from('high-quality-image');
      const result = await preprocessImage(goodQualityBuffer, {
        autoDetect: true
      });

      expect(result).toEqual(goodQualityBuffer);
    });
  });

  describe('Noise Reduction', () => {
    it('should remove noise from thermal receipts', async () => {
      const noisyBuffer = Buffer.from('thermal-receipt-noisy');
      const cleaned = await preprocessImage(noisyBuffer, {
        removeNoise: true,
        receiptType: 'thermal'
      });

      expect(cleaned).toBeDefined();
    });

    it('should handle salt-and-pepper noise', async () => {
      const noisyBuffer = Buffer.from('salt-pepper-noise');
      const cleaned = await preprocessImage(noisyBuffer, {
        removeNoise: true,
        noiseType: 'salt-and-pepper'
      });

      expect(cleaned).toBeDefined();
    });
  });

  describe('Edge Detection & Cropping', () => {
    it('should detect receipt boundaries', async () => {
      const buffer = Buffer.from('receipt-with-background');
      const cropped = await preprocessImage(buffer, {
        autoCrop: true,
        detectEdges: true
      });

      expect(cropped).toBeDefined();
    });

    it('should handle receipts on dark backgrounds', async () => {
      const buffer = Buffer.from('receipt-dark-background');
      const cropped = await preprocessImage(buffer, {
        autoCrop: true,
        backgroundType: 'dark'
      });

      expect(cropped).toBeDefined();
    });
  });
});

describe('End-to-End Quality Pipeline', () => {
  it('should process poor quality image through full pipeline', async () => {
    const poorImage = Buffer.from('poor-quality-receipt');

    // Step 1: Assess quality
    const quality = await assessImageQuality(poorImage);

    // Step 2: Apply preprocessing based on issues
    let processed = poorImage;
    if (quality.issues.includes('blur')) {
      processed = await preprocessImage(processed, { sharpen: true });
    }
    if (quality.issues.includes('too_dark')) {
      processed = await preprocessImage(processed, { adjustBrightness: true });
    }

    // Step 3: Detect and correct rotation
    const rotation = await detectImageRotation(processed);
    if (rotation.angle !== 0) {
      processed = await correctRotation(processed, rotation.angle);
    }

    // Step 4: Final quality check
    const finalQuality = await assessImageQuality(processed);

    expect(finalQuality.score).toBeGreaterThan(quality.score);
  });

  it('should provide user feedback for unsuitable images', async () => {
    const visionClient = require('@google-cloud/vision').ImageAnnotatorClient();

    visionClient.textDetection.mockResolvedValue([{
      textAnnotations: [{
        description: 'Unreadable text',
        confidence: 0.30
      }],
    }]);

    const quality = await assessImageQuality('bad-image.jpg');

    expect(quality.suitable).toBe(false);
    expect(quality.userMessage).toBeDefined();
    expect(quality.userMessage).toContain('Please retake');
    expect(quality.suggestions.length).toBeGreaterThan(0);
  });

  it('should handle image with multiple issues', async () => {
    const image = Buffer.from('multiple-issues');

    const quality = await assessImageQuality(image, {
      width: 300,  // Low resolution
      size: 21 * 1024 * 1024,  // Too large
    });

    visionClient.textDetection.mockResolvedValue([{
      textAnnotations: [{
        description: 'Text',
        confidence: 0.40  // Blurry
      }],
    }]);

    expect(quality.issues.length).toBeGreaterThan(2);
    expect(quality.issues).toContain('low_resolution');
    expect(quality.issues).toContain('file_too_large');
    expect(quality.issues).toContain('blur');
  });
});

describe('Performance', () => {
  it('should process quality assessment quickly', async () => {
    const startTime = Date.now();

    await assessImageQuality('test-receipt.jpg');

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(2000); // <2 seconds
  });

  it('should batch process multiple images efficiently', async () => {
    const images = Array(10).fill(null).map((_, i) => `receipt-${i}.jpg`);

    const startTime = Date.now();

    await Promise.all(images.map(img => assessImageQuality(img)));

    const duration = Date.now() - startTime;
    const avgTime = duration / images.length;

    expect(avgTime).toBeLessThan(500); // <500ms per image
  });
});
