/**
 * Minimal Jest setup for imageCompression tests
 * Avoids jest-expo preset to work around React 19 compatibility issues
 */

// Define global __DEV__ for React Native
global.__DEV__ = true;

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
  FlipType: {
    Horizontal: 'horizontal',
    Vertical: 'vertical',
  },
  manipulateAsync: jest.fn(),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock-documents/',
  cacheDirectory: 'file:///mock-cache/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  moveAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
}));
