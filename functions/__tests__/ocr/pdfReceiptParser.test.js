/**
 * Tests for PDF Receipt Parser (Cloud Functions)
 */

const {
  parseReceiptPDF,
  parseAmount,
  parseDate,
  detectVendorType,
} = require('../../src/ocr/pdfReceiptParser');

// Mock pdf-parse
jest.mock('pdf-parse');
const pdf = require('pdf-parse');

describe('PDF Receipt Parser (Cloud Functions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseAmount', () => {
    it('should parse simple amount', () => {
      expect(parseAmount('49.99')).toBe(49.99);
    });

    it('should parse amount with dollar sign', () => {
      expect(parseAmount('$49.99')).toBe(49.99);
    });

    it('should parse amount with comma', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56);
    });

    it('should return null for invalid amount', () => {
      expect(parseAmount('abc')).toBeNull();
    });
  });

  describe('parseDate', () => {
    it('should parse MM/DD/YYYY format', () => {
      const date = parseDate('11/20/2025');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
    });

    it('should parse MM-DD-YYYY format', () => {
      const date = parseDate('11-20-2025');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
    });

    it('should return null for invalid date', () => {
      expect(parseDate('invalid')).toBeNull();
    });
  });

  describe('detectVendorType', () => {
    it('should detect restaurant', () => {
      const text = 'Server: John\nTable: 5\nGratuity: $5.00';
      expect(detectVendorType(text)).toBe('restaurant');
    });

    it('should detect retail', () => {
      const text = 'Item: Widget\nQty: 2\nSKU: 12345';
      expect(detectVendorType(text)).toBe('retail');
    });

    it('should detect ecommerce', () => {
      const text = 'Order Number: #123456\nShipped to: Address';
      expect(detectVendorType(text)).toBe('ecommerce');
    });

    it('should return general for unrecognized', () => {
      const text = 'Some text';
      expect(detectVendorType(text)).toBe('general');
    });
  });

  describe('parseReceiptPDF - Text-based PDFs', () => {
    it('should extract data from digital PDF', async () => {
      const mockPdfText = `
        Store Name
        Date: 11/20/2025

        Subtotal: $45.00
        Tax: $4.99
        Total: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
      });

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.amount).toBe(49.99);
      expect(result.receipt.confidence).toBeGreaterThan(0.5);
    });

    it('should handle restaurant receipt', async () => {
      const mockPdfText = `
        THE RESTAURANT
        Server: Maria
        Table: 5

        Food: $30.00
        Tax: $2.70
        Total: $32.70
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
      });

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.vendorType).toBe('restaurant');
      expect(result.receipt.amount).toBe(32.70);
    });
  });

  describe('parseReceiptPDF - Scanned PDFs', () => {
    it('should detect scanned PDF with minimal text', async () => {
      pdf.mockResolvedValue({
        text: 'ABC',
        numpages: 1,
      });

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.requiresOCR).toBe(true);
      expect(result.reason).toContain('scanned or image-based');
    });

    it('should flag low confidence receipts', async () => {
      const mockPdfText = 'Some random text';

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
      });

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.requiresOCR).toBe(true);
      expect(result.reason).toContain('Low confidence');
    });
  });

  describe('Error Handling', () => {
    it('should handle pdf-parse error', async () => {
      pdf.mockRejectedValue(new Error('Parsing failed'));

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.requiresOCR).toBe(true);
      expect(result.reason).toContain('Text extraction failed');
    });

    it('should handle empty PDF', async () => {
      pdf.mockResolvedValue({
        text: '',
        numpages: 0,
      });

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.requiresOCR).toBe(true);
    });
  });

  describe('Various Receipt Formats', () => {
    it('should handle "Amount Due"', async () => {
      const mockPdfText = `
        Store
        Date: 11/20/2025
        Amount Due: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
      });

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.receipt.amount).toBe(49.99);
    });

    it('should handle "Order Total"', async () => {
      const mockPdfText = `
        Store
        Order Date: 11/20/2025
        Order Total: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
      });

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.receipt.amount).toBe(49.99);
    });

    it('should validate subtotal + tax = total', async () => {
      const mockPdfText = `
        Store
        Date: 11/20/2025
        Subtotal: $100.00
        Tax: $9.00
        Total: $109.00
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
      });

      const result = await parseReceiptPDF(Buffer.from('mock'));

      expect(result.receipt.confidence).toBeGreaterThan(0.8);
    });
  });
});
