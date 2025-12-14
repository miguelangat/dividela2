/**
 * Mock Expo modules for testing OCR and image features
 */

// Mock ImagePicker
export const mockImagePicker = {
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },

  launchCameraAsync: jest.fn(async (options) => {
    return {
      canceled: false,
      assets: [
        {
          uri: 'file:///mock-camera/photo.jpg',
          width: 1920,
          height: 1080,
          type: 'image',
          fileName: 'photo.jpg',
          fileSize: 2048000,
        },
      ],
    };
  }),

  launchImageLibraryAsync: jest.fn(async (options) => {
    return {
      canceled: false,
      assets: [
        {
          uri: 'file:///mock-library/receipt.jpg',
          width: 1024,
          height: 768,
          type: 'image',
          fileName: 'receipt.jpg',
          fileSize: 1024000,
        },
      ],
    };
  }),

  requestCameraPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    canAskAgain: true,
    granted: true,
  })),

  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    canAskAgain: true,
    granted: true,
  })),

  getCameraPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    canAskAgain: true,
    granted: true,
  })),

  getMediaLibraryPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    canAskAgain: true,
    granted: true,
  })),
};

// Mock ImageManipulator
export const mockImageManipulator = {
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },

  FlipType: {
    Horizontal: 'horizontal',
    Vertical: 'vertical',
  },

  manipulateAsync: jest.fn(async (uri, actions, saveOptions) => {
    return {
      uri: 'file:///mock-manipulated/image.jpg',
      width: saveOptions?.resize?.width || 1024,
      height: saveOptions?.resize?.height || 768,
    };
  }),
};

// Mock FileSystem
export const mockFileSystem = {
  documentDirectory: 'file:///mock-documents/',
  cacheDirectory: 'file:///mock-cache/',

  getInfoAsync: jest.fn(async (uri) => {
    return {
      exists: true,
      uri: uri,
      size: 1024000,
      isDirectory: false,
      modificationTime: Date.now() / 1000,
    };
  }),

  readAsStringAsync: jest.fn(async (uri, options) => {
    return 'base64-encoded-image-data';
  }),

  writeAsStringAsync: jest.fn(async (uri, content, options) => {
    return undefined;
  }),

  deleteAsync: jest.fn(async (uri) => {
    return undefined;
  }),

  makeDirectoryAsync: jest.fn(async (uri, options) => {
    return undefined;
  }),

  copyAsync: jest.fn(async (options) => {
    return undefined;
  }),

  moveAsync: jest.fn(async (options) => {
    return undefined;
  }),

  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
};

// Helper to simulate camera permission denial
export const simulateCameraPermissionDenied = () => {
  mockImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({
    status: 'denied',
    canAskAgain: true,
    granted: false,
  });
};

// Helper to simulate library permission denial
export const simulateLibraryPermissionDenied = () => {
  mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
    status: 'denied',
    canAskAgain: true,
    granted: false,
  });
};

// Helper to simulate user canceling image picker
export const simulateImagePickerCanceled = () => {
  mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: true,
  });
  mockImagePicker.launchCameraAsync.mockResolvedValueOnce({
    canceled: true,
  });
};

// Helper to simulate image manipulation error
export const simulateImageManipulationError = (errorMessage = 'Manipulation failed') => {
  mockImageManipulator.manipulateAsync.mockRejectedValueOnce(new Error(errorMessage));
};

// Helper to simulate file system error
export const simulateFileSystemError = (errorMessage = 'File system error') => {
  mockFileSystem.getInfoAsync.mockRejectedValueOnce(new Error(errorMessage));
};

// Helper to reset all expo mocks
export const resetExpoMocks = () => {
  Object.values(mockImagePicker).forEach((mock) => {
    if (typeof mock === 'function' && mock.mockClear) {
      mock.mockClear();
    }
  });

  mockImageManipulator.manipulateAsync.mockClear();

  Object.values(mockFileSystem).forEach((mock) => {
    if (typeof mock === 'function' && mock.mockClear) {
      mock.mockClear();
    }
  });
};

export default {
  ImagePicker: mockImagePicker,
  ImageManipulator: mockImageManipulator,
  FileSystem: mockFileSystem,
  simulateCameraPermissionDenied,
  simulateLibraryPermissionDenied,
  simulateImagePickerCanceled,
  simulateImageManipulationError,
  simulateFileSystemError,
  resetExpoMocks,
};
