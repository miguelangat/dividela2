/**
 * Tests for image compression utilities
 *
 * Comprehensive test suite for compressReceipt() and getImageInfo() functions
 * Uses TDD approach - tests written before implementation
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { compressReceipt, getImageInfo } from '../imageCompression';

// Mock expo modules
jest.mock('expo-image-manipulator');
jest.mock('expo-file-system');

describe('imageCompression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getImageInfo', () => {
    it('should return file size in bytes', async () => {
      const mockUri = 'file:///test/image.jpg';
      const mockSize = 2048000; // 2MB

      FileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: mockUri,
        size: mockSize,
        isDirectory: false,
      });

      const info = await getImageInfo(mockUri);

      expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(mockUri);
      expect(info.size).toBe(mockSize);
    });

    it('should return image dimensions when available', async () => {
      const mockUri = 'file:///test/image.jpg';

      FileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: true,
        uri: mockUri,
        size: 1024000,
        isDirectory: false,
      });

      const info = await getImageInfo(mockUri);

      expect(info).toHaveProperty('size');
      expect(info.size).toBe(1024000);
    });

    it('should handle invalid URIs', async () => {
      const invalidUri = 'invalid-uri';

      FileSystem.getInfoAsync.mockRejectedValueOnce(new Error('File not found'));

      await expect(getImageInfo(invalidUri)).rejects.toThrow('File not found');
    });

    it('should handle non-existent files', async () => {
      const mockUri = 'file:///test/nonexistent.jpg';

      FileSystem.getInfoAsync.mockResolvedValueOnce({
        exists: false,
      });

      await expect(getImageInfo(mockUri)).rejects.toThrow('File does not exist');
    });
  });

  describe('compressReceipt', () => {
    describe('basic compression', () => {
      it('should resize large images to max 1920px width', async () => {
        const mockUri = 'file:///test/large-image.jpg';
        const largeWidth = 3840; // 4K width
        const largeHeight = 2160; // 4K height

        // Mock file info - large file
        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 5 * 1024 * 1024, // 5MB
          isDirectory: false,
        });

        // Mock first compression pass
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed-first.jpg',
          width: 1920,
          height: 1080,
        });

        // Mock second file size check
        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed-first.jpg',
          size: 800 * 1024, // 800KB - under 1MB
          isDirectory: false,
        });

        const result = await compressReceipt(mockUri);

        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          mockUri,
          [{ resize: { width: 1920 } }],
          expect.objectContaining({
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          })
        );

        expect(result.width).toBe(1920);
        expect(result.uri).toBeDefined();
      });

      it('should compress to 80% quality initially', async () => {
        const mockUri = 'file:///test/image.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 2 * 1024 * 1024, // 2MB
          isDirectory: false,
        });

        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed.jpg',
          width: 1920,
          height: 1080,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed.jpg',
          size: 900 * 1024, // 900KB
          isDirectory: false,
        });

        await compressReceipt(mockUri);

        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          mockUri,
          [{ resize: { width: 1920 } }],
          expect.objectContaining({
            compress: 0.8,
          })
        );
      });

      it('should convert to JPEG format', async () => {
        const mockUri = 'file:///test/image.png';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 1.5 * 1024 * 1024, // 1.5MB
          isDirectory: false,
        });

        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed.jpg',
          width: 1920,
          height: 1080,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed.jpg',
          size: 800 * 1024, // 800KB
          isDirectory: false,
        });

        await compressReceipt(mockUri);

        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          mockUri,
          expect.any(Array),
          expect.objectContaining({
            format: ImageManipulator.SaveFormat.JPEG,
          })
        );
      });

      it('should maintain aspect ratio', async () => {
        const mockUri = 'file:///test/image.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 2 * 1024 * 1024, // 2MB
          isDirectory: false,
        });

        // Aspect ratio: 16:9 = 1.777...
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed.jpg',
          width: 1920,
          height: 1080, // Maintains 16:9 aspect ratio
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed.jpg',
          size: 800 * 1024,
          isDirectory: false,
        });

        const result = await compressReceipt(mockUri);

        // When resizing by width only, height is calculated to maintain aspect ratio
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          mockUri,
          [{ resize: { width: 1920 } }], // Only width specified, height auto-calculated
          expect.any(Object)
        );
      });

      it('should return compressed image URI with dimensions', async () => {
        const mockUri = 'file:///test/image.jpg';
        const compressedUri = 'file:///test/compressed.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 2 * 1024 * 1024,
          isDirectory: false,
        });

        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: compressedUri,
          width: 1920,
          height: 1080,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: compressedUri,
          size: 800 * 1024,
          isDirectory: false,
        });

        const result = await compressReceipt(mockUri);

        expect(result).toEqual({
          uri: compressedUri,
          width: 1920,
          height: 1080,
        });
      });
    });

    describe('multi-step compression', () => {
      it('should compress more aggressively if still > 1MB after first pass', async () => {
        const mockUri = 'file:///test/large-image.jpg';

        // Mock original file info
        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 6 * 1024 * 1024, // 6MB
          isDirectory: false,
        });

        // Mock first compression pass
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed-first.jpg',
          width: 1920,
          height: 1080,
        });

        // Mock file size check after first pass - still > 1MB
        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed-first.jpg',
          size: 1.5 * 1024 * 1024, // 1.5MB - still too large
          isDirectory: false,
        });

        // Mock second compression pass
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed-second.jpg',
          width: 1280,
          height: 720,
        });

        // Mock file size check after second pass
        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed-second.jpg',
          size: 700 * 1024, // 700KB - now under 1MB
          isDirectory: false,
        });

        const result = await compressReceipt(mockUri);

        // Should have been called twice
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(2);

        // Second call should use fallback settings
        expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
          2,
          'file:///test/compressed-first.jpg',
          [{ resize: { width: 1280 } }],
          expect.objectContaining({
            compress: 0.6,
            format: ImageManipulator.SaveFormat.JPEG,
          })
        );

        expect(result.width).toBe(1280);
      });

      it('should handle very large images (5MB+, 4K resolution)', async () => {
        const mockUri = 'file:///test/4k-image.jpg';

        // Original 4K image
        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 8 * 1024 * 1024, // 8MB
          isDirectory: false,
        });

        // First pass
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed-first.jpg',
          width: 1920,
          height: 1080,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed-first.jpg',
          size: 1.8 * 1024 * 1024, // 1.8MB
          isDirectory: false,
        });

        // Second pass
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed-second.jpg',
          width: 1280,
          height: 720,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed-second.jpg',
          size: 850 * 1024, // 850KB
          isDirectory: false,
        });

        const result = await compressReceipt(mockUri);

        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(2);
        expect(result.uri).toBeDefined();
        expect(result.width).toBe(1280);
      });
    });

    describe('small image handling', () => {
      it('should handle already small images (< 1MB) efficiently', async () => {
        const mockUri = 'file:///test/small-image.jpg';

        // Small file
        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 500 * 1024, // 500KB
          isDirectory: false,
        });

        // First compression
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed.jpg',
          width: 1280,
          height: 960,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed.jpg',
          size: 400 * 1024, // 400KB
          isDirectory: false,
        });

        const result = await compressReceipt(mockUri);

        // Should only compress once
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(1);
        expect(result.uri).toBe('file:///test/compressed.jpg');
      });

      it('should still compress small images to ensure JPEG format', async () => {
        const mockUri = 'file:///test/small-image.png';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 600 * 1024, // 600KB
          isDirectory: false,
        });

        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed.jpg',
          width: 1024,
          height: 768,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed.jpg',
          size: 500 * 1024,
          isDirectory: false,
        });

        await compressReceipt(mockUri);

        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          mockUri,
          expect.any(Array),
          expect.objectContaining({
            format: ImageManipulator.SaveFormat.JPEG,
          })
        );
      });
    });

    describe('edge cases', () => {
      it('should handle non-standard aspect ratios (panoramas)', async () => {
        const mockUri = 'file:///test/panorama.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 3 * 1024 * 1024, // 3MB
          isDirectory: false,
        });

        // Panoramic aspect ratio (3:1)
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed.jpg',
          width: 1920,
          height: 640, // Maintains panoramic aspect ratio
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed.jpg',
          size: 900 * 1024,
          isDirectory: false,
        });

        const result = await compressReceipt(mockUri);

        expect(result.width).toBe(1920);
        expect(result.height).toBe(640);
      });

      it('should handle portrait orientation images', async () => {
        const mockUri = 'file:///test/portrait.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 2 * 1024 * 1024, // 2MB
          isDirectory: false,
        });

        // Portrait orientation (taller than wide)
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed.jpg',
          width: 1920,
          height: 2560, // 3:4 portrait aspect ratio
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed.jpg',
          size: 950 * 1024,
          isDirectory: false,
        });

        const result = await compressReceipt(mockUri);

        expect(result.height).toBeGreaterThan(result.width);
      });
    });

    describe('error handling', () => {
      it('should throw error on invalid URI', async () => {
        const invalidUri = '';

        await expect(compressReceipt(invalidUri)).rejects.toThrow('Invalid image URI');
      });

      it('should throw error on null URI', async () => {
        await expect(compressReceipt(null)).rejects.toThrow('Invalid image URI');
      });

      it('should throw error on undefined URI', async () => {
        await expect(compressReceipt(undefined)).rejects.toThrow('Invalid image URI');
      });

      it('should handle compression failures', async () => {
        const mockUri = 'file:///test/corrupted.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 2 * 1024 * 1024,
          isDirectory: false,
        });

        ImageManipulator.manipulateAsync.mockRejectedValueOnce(
          new Error('Failed to manipulate image')
        );

        await expect(compressReceipt(mockUri)).rejects.toThrow('Failed to manipulate image');
      });

      it('should handle corrupted image files', async () => {
        const mockUri = 'file:///test/corrupted.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 2 * 1024 * 1024,
          isDirectory: false,
        });

        ImageManipulator.manipulateAsync.mockRejectedValueOnce(
          new Error('Image data is corrupted')
        );

        await expect(compressReceipt(mockUri)).rejects.toThrow('Image data is corrupted');
      });

      it('should handle file system errors', async () => {
        const mockUri = 'file:///test/image.jpg';

        FileSystem.getInfoAsync.mockRejectedValueOnce(
          new Error('File system error')
        );

        await expect(compressReceipt(mockUri)).rejects.toThrow('File system error');
      });

      it('should handle permission errors', async () => {
        const mockUri = 'file:///test/protected.jpg';

        FileSystem.getInfoAsync.mockRejectedValueOnce(
          new Error('Permission denied')
        );

        await expect(compressReceipt(mockUri)).rejects.toThrow('Permission denied');
      });
    });

    describe('quality preservation for OCR', () => {
      it('should preserve readable quality for OCR with 80% compression', async () => {
        const mockUri = 'file:///test/receipt.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 1.5 * 1024 * 1024, // 1.5MB
          isDirectory: false,
        });

        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed.jpg',
          width: 1920,
          height: 2560,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed.jpg',
          size: 950 * 1024,
          isDirectory: false,
        });

        await compressReceipt(mockUri);

        // Verify quality is set to 80% (0.8) for OCR readability
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          mockUri,
          expect.any(Array),
          expect.objectContaining({
            compress: 0.8, // High enough for OCR
          })
        );
      });

      it('should only use aggressive compression (60%) when absolutely necessary', async () => {
        const mockUri = 'file:///test/large-receipt.jpg';

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: mockUri,
          size: 5 * 1024 * 1024, // 5MB
          isDirectory: false,
        });

        // First pass with 80% quality
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed-first.jpg',
          width: 1920,
          height: 2560,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed-first.jpg',
          size: 1.2 * 1024 * 1024, // Still > 1MB
          isDirectory: false,
        });

        // Second pass with 60% quality
        ImageManipulator.manipulateAsync.mockResolvedValueOnce({
          uri: 'file:///test/compressed-second.jpg',
          width: 1280,
          height: 1707,
        });

        FileSystem.getInfoAsync.mockResolvedValueOnce({
          exists: true,
          uri: 'file:///test/compressed-second.jpg',
          size: 800 * 1024, // Under 1MB
          isDirectory: false,
        });

        await compressReceipt(mockUri);

        // First pass should use 80%
        expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
          1,
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({ compress: 0.8 })
        );

        // Second pass should use 60% only when needed
        expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
          2,
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({ compress: 0.6 })
        );
      });
    });
  });
});
