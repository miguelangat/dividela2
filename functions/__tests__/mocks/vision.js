/**
 * Mock for @google-cloud/vision
 * Simulates Google Cloud Vision API behavior for testing
 */

const fixtures = require('../fixtures/visionApiResponses');

class MockImageAnnotatorClient {
  constructor() {
    this.textDetection = jest.fn();
    this.documentTextDetection = jest.fn();
    this._mockResponses = new Map();
    this._defaultBehavior = 'success';
    this._retryCount = 0;
  }

  /**
   * Reset all mock state
   */
  reset() {
    this.textDetection.mockReset();
    this.documentTextDetection.mockReset();
    this._mockResponses.clear();
    this._defaultBehavior = 'success';
    this._retryCount = 0;
    this._failCount = undefined;
    this._successResponse = undefined;
  }

  /**
   * Set mock response for specific image URL
   */
  setMockResponse(imageUrl, response) {
    this._mockResponses.set(imageUrl, response);
  }

  /**
   * Set default behavior for all requests
   */
  setDefaultBehavior(behavior) {
    this._defaultBehavior = behavior;
  }

  /**
   * Simulate retry behavior
   */
  setRetryBehavior(failCount, successResponse) {
    this._retryCount = 0;
    this._failCount = failCount;
    this._successResponse = successResponse;
  }

  /**
   * Mock textDetection implementation
   */
  async mockTextDetection(request) {
    const imageSource = request.image?.source?.imageUri ||
                       request.source?.imageUri;

    const isBuffer = request.image?.content !== undefined;

    // Check for retry behavior
    if (this._failCount !== undefined) {
      this._retryCount++;
      if (this._retryCount <= this._failCount) {
        const error = new Error('Transient error');
        error.code = 'UNAVAILABLE';
        throw error;
      } else {
        return this._successResponse || fixtures.groceryReceiptSuccess;
      }
    }

    // Check for specific mock response
    const lookupKey = isBuffer ? 'buffer' : imageSource;
    if (this._mockResponses.has(lookupKey)) {
      const mockResponse = this._mockResponses.get(lookupKey);
      if (mockResponse instanceof Error) {
        throw mockResponse;
      }
      return mockResponse;
    }

    // Default behavior based on image URL pattern or set behavior
    if (this._defaultBehavior === 'error') {
      const error = new Error('Mock error');
      error.code = 'UNAVAILABLE';
      throw error;
    }

    if (this._defaultBehavior === 'invalid_image') {
      const error = new Error(fixtures.invalidImageError.message);
      error.code = fixtures.invalidImageError.code;
      throw error;
    }

    if (this._defaultBehavior === 'network_error') {
      const error = new Error(fixtures.networkError.message);
      error.code = fixtures.networkError.code;
      throw error;
    }

    if (this._defaultBehavior === 'too_large') {
      const error = new Error(fixtures.imageTooLargeError.message);
      error.code = fixtures.imageTooLargeError.code;
      throw error;
    }

    if (this._defaultBehavior === 'rate_limit') {
      const error = new Error(fixtures.rateLimitError.message);
      error.code = fixtures.rateLimitError.code;
      throw error;
    }

    if (this._defaultBehavior === 'no_text') {
      return fixtures.noTextDetectedResponse;
    }

    if (this._defaultBehavior === 'blank') {
      return fixtures.blankImageResponse;
    }

    if (this._defaultBehavior === 'low_confidence') {
      return fixtures.lowConfidenceResponse;
    }

    // For buffer requests without specific mock, return default success
    if (isBuffer) {
      return fixtures.groceryReceiptSuccess;
    }

    // URL pattern matching
    if (typeof imageSource === 'string') {
      if (imageSource.includes('grocery')) {
        return fixtures.groceryReceiptSuccess;
      }
      if (imageSource.includes('restaurant')) {
        return fixtures.restaurantReceiptSuccess;
      }
      if (imageSource.includes('handwritten')) {
        return fixtures.handwrittenReceiptResponse;
      }
      if (imageSource.includes('screenshot')) {
        return fixtures.digitalScreenshotResponse;
      }
      if (imageSource.includes('faded')) {
        return fixtures.lowConfidenceResponse;
      }
      if (imageSource.includes('blank')) {
        return fixtures.blankImageResponse;
      }
      if (imageSource.includes('invalid')) {
        const error = new Error(fixtures.invalidImageError.message);
        error.code = fixtures.invalidImageError.code;
        throw error;
      }
      if (imageSource.includes('network-error')) {
        const error = new Error(fixtures.networkError.message);
        error.code = fixtures.networkError.code;
        throw error;
      }
      if (imageSource.includes('too-large')) {
        const error = new Error(fixtures.imageTooLargeError.message);
        error.code = fixtures.imageTooLargeError.code;
        throw error;
      }
    }

    // Default to grocery receipt success
    return fixtures.groceryReceiptSuccess;
  }

  /**
   * Setup default implementations
   */
  setupDefaultMocks() {
    this.textDetection.mockImplementation((request) => this.mockTextDetection(request));
    this.documentTextDetection.mockImplementation((request) => this.mockTextDetection(request));
  }
}

// Create singleton instance
const mockClient = new MockImageAnnotatorClient();
mockClient.setupDefaultMocks();

/**
 * Mock vision module
 */
const vision = {
  ImageAnnotatorClient: jest.fn(() => mockClient),
  _mockClient: mockClient
};

module.exports = vision;
