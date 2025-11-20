/**
 * Simple encoding detection for CSV files
 * Helps handle bank exports in different encodings (UTF-8, Latin-1, Windows-1252, etc.)
 */

/**
 * Detect file encoding from buffer or string
 *
 * @param {Buffer|Uint8Array} buffer - File content as buffer
 * @returns {string} Detected encoding ('utf-8', 'iso-8859-1', 'windows-1252')
 */
export function detectEncoding(buffer) {
  if (!buffer || buffer.length === 0) {
    return 'utf-8'; // Default
  }

  // Convert to Uint8Array if needed
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // Sample size (first 8KB should be enough for encoding detection)
  const sampleSize = Math.min(bytes.length, 8192);
  const sample = bytes.slice(0, sampleSize);

  // Check for BOM (Byte Order Mark)
  if (sample.length >= 3) {
    // UTF-8 BOM: EF BB BF
    if (sample[0] === 0xEF && sample[1] === 0xBB && sample[2] === 0xBF) {
      return 'utf-8';
    }
    // UTF-16 LE BOM: FF FE
    if (sample[0] === 0xFF && sample[1] === 0xFE) {
      return 'utf-16le';
    }
    // UTF-16 BE BOM: FE FF
    if (sample[0] === 0xFE && sample[1] === 0xFF) {
      return 'utf-16be';
    }
  }

  // Heuristic detection
  let utf8Valid = true;
  let hasHighBytes = false;
  let controlChars = 0;

  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];

    // Track high bytes (non-ASCII)
    if (byte > 0x7F) {
      hasHighBytes = true;
    }

    // Count control characters (except tab, newline, carriage return)
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0A && byte !== 0x0D) {
      controlChars++;
    }

    // Check UTF-8 validity
    if (utf8Valid && byte > 0x7F) {
      // Multi-byte UTF-8 sequence
      let bytesToFollow = 0;

      if ((byte & 0xE0) === 0xC0) {
        // 2-byte sequence (110xxxxx)
        bytesToFollow = 1;
      } else if ((byte & 0xF0) === 0xE0) {
        // 3-byte sequence (1110xxxx)
        bytesToFollow = 2;
      } else if ((byte & 0xF8) === 0xF0) {
        // 4-byte sequence (11110xxx)
        bytesToFollow = 3;
      } else {
        // Invalid UTF-8 start byte
        utf8Valid = false;
        continue;
      }

      // Verify continuation bytes (10xxxxxx)
      for (let j = 1; j <= bytesToFollow; j++) {
        if (i + j >= sample.length || (sample[i + j] & 0xC0) !== 0x80) {
          utf8Valid = false;
          break;
        }
      }

      i += bytesToFollow;
    }
  }

  // Too many control characters suggests binary file
  if (controlChars > sampleSize * 0.05) {
    return 'binary';
  }

  // If no high bytes, it's pure ASCII (which is valid UTF-8)
  if (!hasHighBytes) {
    return 'utf-8';
  }

  // If UTF-8 validation passed, it's UTF-8
  if (utf8Valid) {
    return 'utf-8';
  }

  // Check for common Windows-1252/Latin-1 patterns
  // These encodings use 0x80-0x9F range for special characters
  let windowsChars = 0;
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    // Windows-1252 specific characters in 0x80-0x9F range
    if (byte >= 0x80 && byte <= 0x9F) {
      windowsChars++;
    }
  }

  // If we have Windows-1252 specific characters, assume Windows-1252
  if (windowsChars > 0) {
    return 'windows-1252';
  }

  // Default to ISO-8859-1 (Latin-1) for other 8-bit encodings
  return 'iso-8859-1';
}

/**
 * Decode buffer to string with specified encoding
 *
 * @param {Buffer|Uint8Array|ArrayBuffer} buffer - File content
 * @param {string} encoding - Encoding to use
 * @returns {string} Decoded string
 */
export function decodeBuffer(buffer, encoding = 'utf-8') {
  try {
    // Convert ArrayBuffer to Uint8Array if needed
    let bytes;
    if (buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(buffer);
    } else if (buffer instanceof Uint8Array) {
      bytes = buffer;
    } else {
      bytes = new Uint8Array(buffer);
    }

    // Use TextDecoder if available (browser/modern Node.js)
    if (typeof TextDecoder !== 'undefined') {
      // Map encoding names to TextDecoder-compatible names
      const encodingMap = {
        'utf-8': 'utf-8',
        'utf8': 'utf-8',
        'iso-8859-1': 'iso-8859-1',
        'latin1': 'iso-8859-1',
        'windows-1252': 'windows-1252',
        'utf-16le': 'utf-16le',
        'utf-16be': 'utf-16be',
      };

      const normalizedEncoding = encodingMap[encoding.toLowerCase()] || 'utf-8';
      const decoder = new TextDecoder(normalizedEncoding);
      return decoder.decode(bytes);
    }

    // Fallback for environments without TextDecoder
    if (encoding === 'utf-8' || encoding === 'utf8') {
      // Simple UTF-8 decoding
      let result = '';
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte < 0x80) {
          result += String.fromCharCode(byte);
        } else {
          result += String.fromCharCode(byte); // Simplified fallback
        }
      }
      return result;
    }

    // For other encodings, try String.fromCharCode
    return String.fromCharCode.apply(null, Array.from(bytes));
  } catch (error) {
    console.error('Error decoding buffer:', error);
    // Final fallback: convert to string as-is
    return buffer.toString();
  }
}

/**
 * Auto-detect encoding and decode buffer to string
 *
 * @param {Buffer|Uint8Array|ArrayBuffer} buffer - File content
 * @returns {Object} { encoding: string, content: string }
 */
export function autoDetectAndDecode(buffer) {
  const encoding = detectEncoding(buffer);
  const content = decodeBuffer(buffer, encoding);

  return {
    encoding,
    content,
    isBinary: encoding === 'binary',
  };
}

/**
 * Read file with encoding detection (for web File API)
 *
 * @param {File} file - File object from input
 * @returns {Promise<Object>} { encoding: string, content: string }
 */
export async function readFileWithEncoding(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const result = autoDetectAndDecode(buffer);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export default {
  detectEncoding,
  decodeBuffer,
  autoDetectAndDecode,
  readFileWithEncoding,
};
