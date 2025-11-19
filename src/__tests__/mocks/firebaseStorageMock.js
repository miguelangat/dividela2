/**
 * Mock Firebase Storage utilities for testing OCR and receipt upload features
 */

// Mock file upload response
export const mockUploadTask = {
  on: jest.fn((event, nextFn, errorFn, completeFn) => {
    // Simulate successful upload
    if (nextFn) {
      nextFn({ bytesTransferred: 1024, totalBytes: 1024 });
    }
    if (completeFn) {
      setTimeout(completeFn, 100);
    }
    return mockUploadTask;
  }),
  snapshot: {
    bytesTransferred: 1024,
    totalBytes: 1024,
    ref: {
      getDownloadURL: jest.fn().mockResolvedValue('https://storage.example.com/receipts/test-receipt.jpg'),
    },
  },
};

// Mock storage reference
export const mockStorageRef = {
  put: jest.fn().mockReturnValue(mockUploadTask),
  putString: jest.fn().mockResolvedValue({
    ref: {
      getDownloadURL: jest.fn().mockResolvedValue('https://storage.example.com/receipts/test-receipt.jpg'),
    },
  }),
  delete: jest.fn().mockResolvedValue(undefined),
  getDownloadURL: jest.fn().mockResolvedValue('https://storage.example.com/receipts/test-receipt.jpg'),
  child: jest.fn((path) => mockStorageRef),
};

// Mock storage instance
export const mockStorage = {
  ref: jest.fn((path) => mockStorageRef),
};

// Helper function to create mock file blob
export const createMockBlob = (content = 'mock image data', type = 'image/jpeg') => {
  return {
    data: content,
    type,
    size: content.length,
  };
};

// Helper function to create mock file URI
export const createMockFileUri = (filename = 'test-receipt.jpg') => {
  return `file:///mock-storage/${filename}`;
};

// Mock upload progress tracker
export const createMockUploadProgress = () => {
  const progressCallbacks = [];

  return {
    subscribe: (callback) => {
      progressCallbacks.push(callback);
      return () => {
        const index = progressCallbacks.indexOf(callback);
        if (index > -1) {
          progressCallbacks.splice(index, 1);
        }
      };
    },
    simulateProgress: (bytesTransferred, totalBytes) => {
      progressCallbacks.forEach((callback) => {
        callback({ bytesTransferred, totalBytes });
      });
    },
  };
};

// Mock storage upload function
export const mockUploadReceipt = jest.fn(async (uri, userId, expenseId) => {
  // Simulate upload delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    success: true,
    url: `https://storage.example.com/receipts/${userId}/${expenseId}.jpg`,
    path: `receipts/${userId}/${expenseId}.jpg`,
  };
});

// Mock storage delete function
export const mockDeleteReceipt = jest.fn(async (path) => {
  // Simulate delete delay
  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    success: true,
    path,
  };
});

// Mock storage download function
export const mockGetReceiptUrl = jest.fn(async (path) => {
  // Simulate download delay
  await new Promise((resolve) => setTimeout(resolve, 50));

  return `https://storage.example.com/${path}`;
});

// Helper to reset all mocks
export const resetStorageMocks = () => {
  mockUploadTask.on.mockClear();
  mockStorageRef.put.mockClear();
  mockStorageRef.putString.mockClear();
  mockStorageRef.delete.mockClear();
  mockStorageRef.getDownloadURL.mockClear();
  mockStorage.ref.mockClear();
  mockUploadReceipt.mockClear();
  mockDeleteReceipt.mockClear();
  mockGetReceiptUrl.mockClear();
};

// Helper to simulate upload failure
export const simulateUploadFailure = (errorMessage = 'Upload failed') => {
  mockUploadTask.on.mockImplementation((event, nextFn, errorFn) => {
    if (errorFn) {
      setTimeout(() => errorFn(new Error(errorMessage)), 100);
    }
    return mockUploadTask;
  });
};

// Helper to simulate delete failure
export const simulateDeleteFailure = (errorMessage = 'Delete failed') => {
  mockStorageRef.delete.mockRejectedValue(new Error(errorMessage));
  mockDeleteReceipt.mockRejectedValue(new Error(errorMessage));
};

export default {
  mockStorage,
  mockStorageRef,
  mockUploadTask,
  mockUploadReceipt,
  mockDeleteReceipt,
  mockGetReceiptUrl,
  createMockBlob,
  createMockFileUri,
  createMockUploadProgress,
  resetStorageMocks,
  simulateUploadFailure,
  simulateDeleteFailure,
};
