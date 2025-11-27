/**
 * Tests for Vision API Client
 * Following TDD approach - tests written before implementation
 */

// Mock the @google-cloud/vision module
jest.mock('@google-cloud/vision', () => require('../mocks/vision'));

const visionClient = require('../../src/ocr/visionClient');
const mockVision = require('@google-cloud/vision');
const fixtures = require('../fixtures/visionApiResponses');

describe('visionClient', () => {
  let mockClient;

  beforeEach(() => {
    // Get reference to the mock client
    mockClient = mockVision._mockClient;
    mockClient.reset();
    mockClient.setupDefaultMocks();
  });

  describe('extractTextFromImage', () => {
    describe('Successful text extraction', () => {
      test('should call Vision API with correct parameters for image URL', async () => {
        const imageUrl = 'gs://bucket/receipts/grocery-receipt.jpg';

        await visionClient.extractTextFromImage(imageUrl);

        expect(mockClient.textDetection).toHaveBeenCalledTimes(1);
        expect(mockClient.textDetection).toHaveBeenCalledWith({
          image: { source: { imageUri: imageUrl } }
        });
      });

      test('should return structured response with rawText, confidence, and success status', async () => {
        const imageUrl = 'gs://bucket/receipts/grocery-receipt.jpg';
        mockClient.setMockResponse(imageUrl, fixtures.groceryReceiptSuccess);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result).toMatchObject({
          success: true,
          rawText: expect.any(String),
          confidence: expect.any(Number)
        });
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.rawText).toContain('WHOLE FOODS MARKET');
      });

      test('should extract text from high quality printed receipt with high confidence', async () => {
        const imageUrl = 'gs://bucket/receipts/grocery-receipt.jpg';
        mockClient.setMockResponse(imageUrl, fixtures.groceryReceiptSuccess);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.9);
        expect(result.rawText).toContain('WHOLE FOODS MARKET');
        expect(result.rawText).toContain('$40.41');
      });

      test('should extract text from restaurant receipt', async () => {
        const imageUrl = 'gs://bucket/receipts/restaurant-receipt.jpg';
        mockClient.setMockResponse(imageUrl, fixtures.restaurantReceiptSuccess);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.9);
        expect(result.rawText).toContain('THE ITALIAN PLACE');
        expect(result.rawText).toContain('$101.52');
      });

      test('should extract text from digital screenshot with very high confidence', async () => {
        const imageUrl = 'gs://bucket/receipts/screenshot-receipt.jpg';
        mockClient.setMockResponse(imageUrl, fixtures.digitalScreenshotResponse);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.95);
        expect(result.rawText).toContain('Amazon.com');
        expect(result.rawText).toContain('$48.80');
      });

      test('should extract text from handwritten receipt with moderate confidence', async () => {
        const imageUrl = 'gs://bucket/receipts/handwritten-receipt.jpg';
        mockClient.setMockResponse(imageUrl, fixtures.handwrittenReceiptResponse);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.rawText).toContain('Coffee Shop');
        expect(result.rawText).toContain('$12.50');
      });

      test('should handle thermal receipt (faded) with lower confidence', async () => {
        const imageUrl = 'gs://bucket/receipts/faded-receipt.jpg';
        mockClient.setMockResponse(imageUrl, fixtures.lowConfidenceResponse);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(true);
        expect(result.confidence).toBeLessThan(0.7);
        expect(result.rawText).toContain('CVS PHARMACY');
        expect(result.rawText).toContain('$21.48');
      });
    });

    describe('Error handling', () => {
      test('should handle network errors gracefully', async () => {
        const imageUrl = 'gs://bucket/receipts/test.jpg';
        const error = new Error(fixtures.networkError.message);
        error.code = fixtures.networkError.code;
        mockClient.setMockResponse(imageUrl, error);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('Network error'),
          errorCode: 'UNAVAILABLE'
        });
      });

      test('should handle invalid image URL errors', async () => {
        const imageUrl = 'invalid://not-a-real-url';
        const error = new Error(fixtures.invalidImageError.message);
        error.code = fixtures.invalidImageError.code;
        mockClient.setMockResponse(imageUrl, error);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('Invalid image'),
          errorCode: 'INVALID_ARGUMENT'
        });
      });

      test('should handle image too large error', async () => {
        const imageUrl = 'gs://bucket/receipts/huge-image.jpg';
        const error = new Error(fixtures.imageTooLargeError.message);
        error.code = fixtures.imageTooLargeError.code;
        mockClient.setMockResponse(imageUrl, error);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('too large'),
          errorCode: 'INVALID_ARGUMENT'
        });
      });

      test('should handle rate limit errors', async () => {
        const imageUrl = 'gs://bucket/receipts/test.jpg';
        const error = new Error(fixtures.rateLimitError.message);
        error.code = fixtures.rateLimitError.code;
        mockClient.setMockResponse(imageUrl, error);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('Rate limit'),
          errorCode: 'RESOURCE_EXHAUSTED'
        });
      });

      test('should handle no text detected in image', async () => {
        const imageUrl = 'gs://bucket/receipts/no-text.jpg';
        // noTextDetectedResponse has empty textAnnotations but has fullTextAnnotation
        // which means it's processed but found no text
        const responseWithNoText = [
          {
            textAnnotations: [],
            fullTextAnnotation: {
              text: '',
              pages: []
            }
          }
        ];
        mockClient.setMockResponse(imageUrl, responseWithNoText);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('No text detected'),
          rawText: '',
          confidence: 0
        });
      });

      test('should return null for completely blank images', async () => {
        const imageUrl = 'gs://bucket/receipts/blank.jpg';
        mockClient.setMockResponse(imageUrl, fixtures.blankImageResponse);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result).toBeNull();
      });

      test('should handle poor quality images with warning', async () => {
        const imageUrl = 'gs://bucket/receipts/poor-quality.jpg';
        mockClient.setMockResponse(imageUrl, fixtures.lowConfidenceResponse);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(true);
        expect(result.confidence).toBeLessThan(0.5);
        expect(result.warning).toBeDefined();
        expect(result.warning).toContain('low confidence');
      });
    });

    describe('Retry logic', () => {
      test('should retry up to 3 times on transient errors', async () => {
        const imageUrl = 'gs://bucket/receipts/test.jpg';

        // Simulate failing twice, then succeeding
        mockClient.setRetryBehavior(2, fixtures.groceryReceiptSuccess);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(true);
        expect(mockClient.textDetection).toHaveBeenCalledTimes(3);
      });

      test('should fail after 3 retry attempts', async () => {
        const imageUrl = 'gs://bucket/receipts/test.jpg';

        // Simulate failing all 3 times
        mockClient.setRetryBehavior(5, fixtures.groceryReceiptSuccess);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(false);
        expect(mockClient.textDetection).toHaveBeenCalledTimes(3);
        expect(result.error).toContain('after 3 retries');
      });

      test('should not retry on non-transient errors', async () => {
        const imageUrl = 'invalid://not-a-real-url';
        const error = new Error(fixtures.invalidImageError.message);
        error.code = fixtures.invalidImageError.code;
        mockClient.setMockResponse(imageUrl, error);

        const result = await visionClient.extractTextFromImage(imageUrl);

        expect(result.success).toBe(false);
        expect(mockClient.textDetection).toHaveBeenCalledTimes(1);
      });
    });

    describe('Input validation', () => {
      test('should reject empty image URL', async () => {
        const result = await visionClient.extractTextFromImage('');

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('Invalid')
        });
      });

      test('should reject null image URL', async () => {
        const result = await visionClient.extractTextFromImage(null);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('Invalid')
        });
      });

      test('should reject undefined image URL', async () => {
        const result = await visionClient.extractTextFromImage(undefined);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('Invalid')
        });
      });
    });
  });

  describe('processReceiptImage', () => {
    describe('Buffer processing', () => {
      test('should process image buffer directly', async () => {
        const imageBuffer = Buffer.from('fake-image-data');

        await visionClient.processReceiptImage(imageBuffer);

        expect(mockClient.textDetection).toHaveBeenCalledTimes(1);
        expect(mockClient.textDetection).toHaveBeenCalledWith({
          image: { content: imageBuffer }
        });
      });

      test('should return structured response from buffer', async () => {
        const imageBuffer = Buffer.from('fake-image-data');
        mockClient.setMockResponse('buffer', fixtures.groceryReceiptSuccess);

        const result = await visionClient.processReceiptImage(imageBuffer);

        expect(result).toMatchObject({
          success: true,
          rawText: expect.any(String),
          confidence: expect.any(Number)
        });
      });

      test('should handle JPEG format', async () => {
        const jpegBuffer = Buffer.from('fake-jpeg-data');
        mockClient.setMockResponse('buffer', fixtures.groceryReceiptSuccess);

        const result = await visionClient.processReceiptImage(jpegBuffer, 'image/jpeg');

        expect(result.success).toBe(true);
      });

      test('should handle PNG format', async () => {
        const pngBuffer = Buffer.from('fake-png-data');
        mockClient.setMockResponse('buffer', fixtures.groceryReceiptSuccess);

        const result = await visionClient.processReceiptImage(pngBuffer, 'image/png');

        expect(result.success).toBe(true);
      });

      test('should handle WebP format', async () => {
        const webpBuffer = Buffer.from('fake-webp-data');
        mockClient.setMockResponse('buffer', fixtures.groceryReceiptSuccess);

        const result = await visionClient.processReceiptImage(webpBuffer, 'image/webp');

        expect(result.success).toBe(true);
      });
    });

    describe('Image size validation', () => {
      test('should reject buffer larger than 20MB', async () => {
        const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB

        const result = await visionClient.processReceiptImage(largeBuffer);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('too large')
        });
      });

      test('should accept buffer under 20MB', async () => {
        const validBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
        mockClient.setMockResponse('buffer', fixtures.groceryReceiptSuccess);

        const result = await visionClient.processReceiptImage(validBuffer);

        expect(result.success).toBe(true);
      });

      test('should reject empty buffer', async () => {
        const emptyBuffer = Buffer.alloc(0);

        const result = await visionClient.processReceiptImage(emptyBuffer);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('Empty')
        });
      });

      test('should reject null buffer', async () => {
        const result = await visionClient.processReceiptImage(null);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('Invalid')
        });
      });
    });

    describe('Error handling for buffers', () => {
      test('should handle Vision API errors when processing buffer', async () => {
        const imageBuffer = Buffer.from('fake-image-data');
        const error = new Error('API Error');
        error.code = 'UNAVAILABLE';
        mockClient.setMockResponse('buffer', error);

        const result = await visionClient.processReceiptImage(imageBuffer);

        expect(result).toMatchObject({
          success: false,
          error: expect.stringContaining('API Error')
        });
      });
    });
  });

  describe('Performance and cost considerations', () => {
    test('should complete text extraction within 5 seconds', async () => {
      const imageUrl = 'gs://bucket/receipts/grocery-receipt.jpg';
      mockClient.setMockResponse(imageUrl, fixtures.groceryReceiptSuccess);

      const startTime = Date.now();
      await visionClient.extractTextFromImage(imageUrl);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    test('should use textDetection (cheaper) instead of documentTextDetection for receipts', async () => {
      const imageUrl = 'gs://bucket/receipts/grocery-receipt.jpg';

      await visionClient.extractTextFromImage(imageUrl);

      expect(mockClient.textDetection).toHaveBeenCalled();
      // documentTextDetection should not be called for simple receipts
    });
  });

  describe('Response structure validation', () => {
    test('should always return consistent response structure on success', async () => {
      const imageUrl = 'gs://bucket/receipts/grocery-receipt.jpg';
      mockClient.setMockResponse(imageUrl, fixtures.groceryReceiptSuccess);

      const result = await visionClient.extractTextFromImage(imageUrl);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('rawText');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.rawText).toBe('string');
      expect(typeof result.confidence).toBe('number');
    });

    test('should include metadata in response', async () => {
      const imageUrl = 'gs://bucket/receipts/grocery-receipt.jpg';
      mockClient.setMockResponse(imageUrl, fixtures.groceryReceiptSuccess);

      const result = await visionClient.extractTextFromImage(imageUrl);

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('imageUrl');
      expect(result.imageUrl).toBe(imageUrl);
    });
  });
});
