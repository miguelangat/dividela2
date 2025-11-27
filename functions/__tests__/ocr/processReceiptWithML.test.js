/**
 * Tests for processReceiptWithML Cloud Function
 * Following TDD approach - tests written before implementation
 */

// Mock all external dependencies
jest.mock('@google-cloud/vision', () => require('../mocks/vision'));

const visionFixtures = require('../fixtures/visionApiResponses');

// Mock Firestore and Storage instances
let mockFirestore;
let mockStorage;
let mockExpenseDoc;
let mockCoupleDoc;
let mockFile;
let mockBucket;

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const FieldValue = {
    serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' }))
  };

  const admin = {
    initializeApp: jest.fn(),
    app: jest.fn(() => ({})),
    firestore: jest.fn(() => mockFirestore),
    storage: jest.fn(() => mockStorage)
  };

  admin.firestore.FieldValue = FieldValue;

  return admin;
});

describe('processReceiptWithML', () => {
  let processReceiptWithML;
  let mockVisionClient;

  // Helper function to create valid auth context
  const createAuthContext = (userId = 'user123') => ({
    auth: { uid: userId }
  });

  // Helper function to mock couple document with valid partners
  const mockValidCouple = (partner1Id = 'user123', partner2Id = 'user456') => {
    mockCoupleDoc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        partner1Id,
        partner2Id
      })
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup Firestore mock with nested collection structure
    mockExpenseDoc = {
      get: jest.fn(),
      update: jest.fn(),
      set: jest.fn()
    };

    const mockExpensesCollection = {
      doc: jest.fn(() => mockExpenseDoc)
    };

    // Mock couple document separately for auth checks
    mockCoupleDoc = {
      get: jest.fn(),
      collection: jest.fn(() => mockExpensesCollection)
    };

    const mockCouplesCollection = {
      doc: jest.fn(() => mockCoupleDoc)
    };

    mockFirestore = {
      collection: jest.fn(() => mockCouplesCollection)
    };

    // Setup Storage mock
    mockFile = {
      download: jest.fn(),
      exists: jest.fn(),
      getSignedUrl: jest.fn()
    };

    mockBucket = {
      file: jest.fn(() => mockFile)
    };

    mockStorage = {
      bucket: jest.fn(() => mockBucket)
    };

    // Get Vision mock client
    const mockVision = require('@google-cloud/vision');
    mockVisionClient = mockVision._mockClient;
    mockVisionClient.reset();
    mockVisionClient.setupDefaultMocks();

    // Import the function under test
    processReceiptWithML = require('../../src/ocr/processReceiptWithML');
  });

  describe('Complete OCR flow orchestration', () => {
    test('should successfully process receipt through complete ML pipeline', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test-receipt.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      const context = {
        auth: { uid: 'user123' }
      };

      // Mock couple document
      mockCoupleDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          partner1Id: 'user123',
          partner2Id: 'user456'
        })
      });

      // Mock expense document
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'expense123',
          status: 'pending',
          receiptUrl: 'receipts/test-receipt.jpg'
        })
      });

      // Mock file download
      const mockImageBuffer = Buffer.from('fake-image-data');
      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([mockImageBuffer]);

      // Mock Vision API response
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      const result = await processReceiptWithML(input, context);

      expect(result).toMatchObject({
        success: true,
        expenseId: 'expense123',
        ocrCompleted: true
      });

      // Verify Firestore update was called with OCR data
      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ocr_complete',
          ocrData: expect.objectContaining({
            rawText: expect.any(String),
            confidence: expect.any(Number),
            timestamp: expect.any(String)
          })
        })
      );
    });

    test('should download image from Firebase Storage', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/couple123/receipt.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      const mockBuffer = Buffer.from('image-data');
      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([mockBuffer]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      await processReceiptWithML(input, createAuthContext());

      expect(mockStorage.bucket).toHaveBeenCalled();
      expect(mockBucket.file).toHaveBeenCalledWith('receipts/couple123/receipt.jpg');
      expect(mockFile.download).toHaveBeenCalled();
    });

    test('should call Vision API with downloaded image buffer', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      const mockBuffer = Buffer.from('image-data');
      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([mockBuffer]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      await processReceiptWithML(input, createAuthContext());

      expect(mockVisionClient.textDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          image: { content: expect.any(Buffer) }
        })
      );
    });

    test('should parse receipt data from OCR text', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/grocery.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      const result = await processReceiptWithML(input, createAuthContext());

      // Should include parsed data
      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ocrData: expect.objectContaining({
            parsedData: expect.objectContaining({
              amount: expect.any(Number)
            })
          })
        })
      );

      // Verify merchantName or merchant exists
      const updateCall = mockExpenseDoc.update.mock.calls[0][0];
      expect(
        updateCall.ocrData.parsedData.merchantName ||
        updateCall.ocrData.parsedData.merchant
      ).toBeTruthy();
    });

    test('should predict category from receipt text', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/grocery.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      await processReceiptWithML(input, createAuthContext());

      // Should include predicted category
      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mlPredictions: expect.objectContaining({
            suggestedCategory: expect.any(String),
            confidence: expect.any(Number)
          })
        })
      );
    });

    test('should update expense with complete results', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      await processReceiptWithML(input, createAuthContext());

      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ocr_complete',
          ocrData: expect.any(Object),
          mlPredictions: expect.any(Object),
          processedAt: expect.any(Object) // Firestore timestamp
        })
      );
    });

    test('should record processing time', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      const result = await processReceiptWithML(input, createAuthContext());

      expect(result).toHaveProperty('processingTimeMs');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });
  });

  describe('Error handling at each step', () => {
    test('should handle missing expenseId', async () => {
      const input = {
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      const result = await processReceiptWithML(input, createAuthContext());

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('expenseId')
      });
    });

    test('should handle expense not found', async () => {
      const input = {
        expenseId: 'nonexistent',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: false
      });

      const result = await processReceiptWithML(input, createAuthContext());

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('not found')
      });

      expect(mockExpenseDoc.update).not.toHaveBeenCalled();
    });

    test('should handle Storage file not found', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/missing.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([false]);

      const result = await processReceiptWithML(input, createAuthContext());

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('not found')
      });

      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ocr_failed',
          error: expect.any(String)
        })
      );
    });

    test('should handle Storage download error', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockRejectedValue(new Error('Download failed'));

      const result = await processReceiptWithML(input, createAuthContext());

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Download failed')
      });

      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ocr_failed'
        })
      );
    });

    test('should handle Vision API errors', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);

      const error = new Error('Vision API error');
      error.code = 'UNAVAILABLE';
      mockVisionClient.setMockResponse('buffer', error);

      const result = await processReceiptWithML(input, createAuthContext());

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Vision API')
      });

      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ocr_failed'
        })
      );
    });

    test('should handle receipt parsing errors gracefully', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/unreadable.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);

      // Vision API succeeds but returns low confidence
      mockVisionClient.setMockResponse('buffer', visionFixtures.lowConfidenceResponse);

      const result = await processReceiptWithML(input, createAuthContext());

      // Should still succeed but mark as low quality
      expect(result.success).toBe(true);
      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ocr_complete',
          ocrData: expect.objectContaining({
            warning: expect.stringContaining('low confidence')
          })
        })
      );
    });

    test('should handle Firestore update errors', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      mockExpenseDoc.update.mockRejectedValue(new Error('Firestore error'));

      const result = await processReceiptWithML(input, createAuthContext());

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Firestore')
      });
    });
  });

  describe('Status updates', () => {
    test('should set status to ocr_complete on success', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      await processReceiptWithML(input, createAuthContext());

      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ocr_complete'
        })
      );
    });

    test('should set status to ocr_failed on error', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([false]);

      await processReceiptWithML(input, createAuthContext());

      expect(mockExpenseDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ocr_failed'
        })
      );
    });
  });

  describe('Input validation', () => {
    test('should validate required fields', async () => {
      const invalidInputs = [
        {},
        { expenseId: 'exp123' },
        { receiptUrl: 'url' },
        { coupleId: 'couple' },
        { userId: 'user' }
      ];

      for (const input of invalidInputs) {
        const result = await processReceiptWithML(input, createAuthContext());
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    test('should accept valid input with all required fields', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      const result = await processReceiptWithML(input, createAuthContext());

      expect(result.success).toBe(true);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should reject unauthenticated requests (no context.auth)', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      // No context provided
      const result = await processReceiptWithML(input, {});

      expect(result).toMatchObject({
        success: false,
        error: 'Unauthorized: Authentication required'
      });

      // Should not access Firestore
      expect(mockCoupleDoc.get).not.toHaveBeenCalled();
      expect(mockExpenseDoc.update).not.toHaveBeenCalled();
    });

    test('should reject requests where couple does not exist', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'nonexistent-couple',
        userId: 'user123'
      };

      const context = {
        auth: {
          uid: 'user123'
        }
      };

      // Mock couple not found
      mockCoupleDoc.get.mockResolvedValue({
        exists: false
      });

      const result = await processReceiptWithML(input, context);

      expect(result).toMatchObject({
        success: false,
        error: 'Couple not found'
      });

      expect(mockCoupleDoc.get).toHaveBeenCalled();
      expect(mockExpenseDoc.update).not.toHaveBeenCalled();
    });

    test('should reject requests where authenticated user is not part of couple', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      const context = {
        auth: {
          uid: 'unauthorized-user' // Different user
        }
      };

      // Mock couple exists but user is not a partner
      mockCoupleDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          partner1Id: 'user123',
          partner2Id: 'user456'
        })
      });

      const result = await processReceiptWithML(input, context);

      expect(result).toMatchObject({
        success: false,
        error: 'Forbidden: Access denied'
      });

      expect(mockCoupleDoc.get).toHaveBeenCalled();
      expect(mockExpenseDoc.update).not.toHaveBeenCalled();
    });

    test('should allow requests where authenticated user is partner1', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      const context = {
        auth: {
          uid: 'user123' // Matches partner1Id
        }
      };

      // Mock couple exists with user as partner1
      mockCoupleDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          partner1Id: 'user123',
          partner2Id: 'user456'
        })
      });

      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      const result = await processReceiptWithML(input, context);

      expect(result.success).toBe(true);
      expect(mockCoupleDoc.get).toHaveBeenCalled();
    });

    test('should allow requests where authenticated user is partner2', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user456'
      };

      const context = {
        auth: {
          uid: 'user456' // Matches partner2Id
        }
      };

      // Mock couple exists with user as partner2
      mockCoupleDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          partner1Id: 'user123',
          partner2Id: 'user456'
        })
      });

      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      const result = await processReceiptWithML(input, context);

      expect(result.success).toBe(true);
      expect(mockCoupleDoc.get).toHaveBeenCalled();
    });

    test('should handle couples with only one partner', async () => {
      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      const context = {
        auth: {
          uid: 'user123'
        }
      };

      // Mock couple with only partner1 (partner2 is null/undefined)
      mockCoupleDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          partner1Id: 'user123',
          partner2Id: null
        })
      });

      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      const result = await processReceiptWithML(input, context);

      expect(result.success).toBe(true);
      expect(mockCoupleDoc.get).toHaveBeenCalled();
    });
  });

  describe('Logging and monitoring', () => {
    test('should log processing start', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('data')]);
      mockVisionClient.setMockResponse('buffer', visionFixtures.groceryReceiptSuccess);

      await processReceiptWithML(input, createAuthContext());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing receipt'),
        expect.objectContaining({
          expenseId: 'expense123'
        })
      );
    });

    test('should log errors with full context', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');

      const input = {
        expenseId: 'expense123',
        receiptUrl: 'receipts/test.jpg',
        coupleId: 'couple123',
        userId: 'user123'
      };

      mockValidCouple();
      mockExpenseDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'pending' })
      });

      mockFile.exists.mockResolvedValue([false]);

      await processReceiptWithML(input, createAuthContext());

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.objectContaining({
          expenseId: 'expense123'
        })
      );
    });
  });
});
