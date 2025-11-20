/**
 * Tests for Receipt PDF Parser
 */

import {
  parseReceiptPDF,
  parseMultiPageReceipt,
  isPDF,
  parseAmount,
  parseDate,
  detectVendorType,
} from '../receiptPdfParser';

// Mock pdf-parse
jest.mock('pdf-parse');
import pdf from 'pdf-parse';

describe('Receipt PDF Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPDF', () => {
    it('should return true for valid PDF buffer', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n...');
      expect(isPDF(pdfBuffer)).toBe(true);
    });

    it('should return false for non-PDF buffer', () => {
      const notPdfBuffer = Buffer.from('not a pdf');
      expect(isPDF(notPdfBuffer)).toBe(false);
    });

    it('should return false for empty buffer', () => {
      expect(isPDF(Buffer.from(''))).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPDF(null)).toBe(false);
    });
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

    it('should parse amount with spaces', () => {
      expect(parseAmount(' $ 49.99 ')).toBe(49.99);
    });

    it('should parse amount with parentheses as negative', () => {
      expect(parseAmount('(49.99)')).toBe(-49.99);
    });

    it('should parse amount with Euro symbol', () => {
      expect(parseAmount('€49.99')).toBe(49.99);
    });

    it('should return null for invalid amount', () => {
      expect(parseAmount('abc')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseAmount('')).toBeNull();
    });
  });

  describe('parseDate', () => {
    it('should parse MM/DD/YYYY format', () => {
      const date = parseDate('11/20/2025');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10); // 0-indexed
      expect(date.getDate()).toBe(20);
    });

    it('should parse MM-DD-YYYY format', () => {
      const date = parseDate('11-20-2025');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
    });

    it('should parse MM/DD/YY format', () => {
      const date = parseDate('11/20/25');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
    });

    it('should parse YYYY-MM-DD format (ISO)', () => {
      const date = parseDate('2025-11-20');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10);
      expect(date.getDate()).toBe(20);
    });

    it('should return null for invalid date', () => {
      expect(parseDate('invalid')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });
  });

  describe('detectVendorType', () => {
    it('should detect restaurant', () => {
      const text = 'Server: John\nTable: 5\nGratuity: $5.00\nTotal: $50.00';
      expect(detectVendorType(text)).toBe('restaurant');
    });

    it('should detect retail', () => {
      const text = 'Item 1: Widget\nQty: 2\nSKU: 12345\nTotal: $29.99';
      expect(detectVendorType(text)).toBe('retail');
    });

    it('should detect e-commerce', () => {
      const text = 'Order Number: #123456\nShipped to: 123 Main St\nTracking: 1Z999AA1\nTotal: $99.99';
      expect(detectVendorType(text)).toBe('ecommerce');
    });

    it('should detect SaaS', () => {
      const text = 'Subscription: Pro Plan\nBilling Period: Monthly\nNext Invoice: 12/20/2025\nTotal: $29.99';
      expect(detectVendorType(text)).toBe('saas');
    });

    it('should return general for unrecognized type', () => {
      const text = 'Some receipt\nTotal: $50.00';
      expect(detectVendorType(text)).toBe('general');
    });
  });

  describe('parseReceiptPDF - Text-based PDFs', () => {
    it('should extract data from Amazon receipt', async () => {
      const mockPdfText = `
        Amazon.com
        Order Number: 123-4567890-1234567
        Order Date: 11/20/2025

        Items:
        - Product Name

        Subtotal: $45.00
        Tax: $4.99
        Total: $49.99

        Shipped to: 123 Main St
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.merchant).toContain('Amazon');
      expect(result.receipt.amount).toBe(49.99);
      expect(result.receipt.date).toBeInstanceOf(Date);
      expect(result.receipt.tax).toBe(4.99);
      expect(result.receipt.subtotal).toBe(45.00);
      expect(result.receipt.confidence).toBeGreaterThan(0.7);
    });

    it('should extract data from restaurant receipt', async () => {
      const mockPdfText = `
        THE ITALIAN RESTAURANT
        123 Main Street
        Phone: (555) 123-4567

        Server: Maria
        Table: 5
        Date: 11/20/2025

        Food Items:
        Pizza Margherita    $18.00
        Caesar Salad        $12.00

        Subtotal:    $30.00
        Tax:         $2.70
        Tip:         $6.00
        Total:       $38.70
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.merchant).toContain('ITALIAN RESTAURANT');
      expect(result.receipt.amount).toBe(38.70);
      expect(result.receipt.vendorType).toBe('restaurant');
      expect(result.receipt.confidence).toBeGreaterThan(0.7);
    });

    it('should extract data from SaaS invoice', async () => {
      const mockPdfText = `
        Invoice from Cloud Service Inc.

        Subscription: Professional Plan
        Billing Period: December 2025
        Invoice Date: 12/01/2025
        Next Invoice: 01/01/2026

        Monthly Subscription    $29.00
        Additional Users        $10.00

        Subtotal:    $39.00
        Tax:         $3.51
        Amount Paid: $42.51

        Thank you for your business!
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.merchant).toContain('Cloud Service');
      expect(result.receipt.amount).toBe(42.51);
      expect(result.receipt.vendorType).toBe('saas');
    });

    it('should handle receipts with multiple total keywords', async () => {
      const mockPdfText = `
        Store Name

        Subtotal: $20.00
        Tax: $1.80
        Grand Total: $21.80
        Total Paid: $21.80
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.amount).toBe(21.80);
    });

    it('should validate total = subtotal + tax', async () => {
      const mockPdfText = `
        Store Name
        Date: 11/20/2025

        Subtotal: $100.00
        Tax: $9.00
        Total: $109.00
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.confidence).toBeGreaterThan(0.85); // High confidence due to validation
    });
  });

  describe('parseReceiptPDF - Scanned/Image-based PDFs', () => {
    it('should detect scanned PDF with minimal text', async () => {
      const mockPdfText = 'ABC'; // Very little text

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(true);
      expect(result.pages).toBe(1);
      expect(result.reason).toContain('scanned or image-based');
    });

    it('should detect scanned PDF with no text', async () => {
      pdf.mockResolvedValue({
        text: '',
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(true);
      expect(result.pages).toBe(1);
    });

    it('should flag low confidence receipts for OCR', async () => {
      const mockPdfText = `
        Some random text
        With no recognizable receipt patterns
        Just random words here
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(true);
      expect(result.reason).toContain('Low confidence');
      expect(result.confidence).toBeLessThan(0.4);
    });
  });

  describe('parseReceiptPDF - Edge Cases', () => {
    it('should handle receipt with no merchant name', async () => {
      const mockPdfText = `
        Receipt
        Date: 11/20/2025
        Total: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.amount).toBe(49.99);
      expect(result.receipt.confidence).toBeLessThan(0.8); // Lower confidence without merchant
    });

    it('should handle receipt with no date', async () => {
      const mockPdfText = `
        Store Name
        Total: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(false);
      expect(result.receipt.date).toBeNull();
      expect(result.receipt.confidence).toBeLessThan(0.8);
    });

    it('should handle receipt with only total', async () => {
      const mockPdfText = `
        Total: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      // Low confidence - should suggest OCR
      expect(result.requiresOCR).toBe(true);
      expect(result.confidence).toBeLessThan(0.4);
    });

    it('should handle date far in the past', async () => {
      const mockPdfText = `
        Store Name
        Date: 01/01/2000
        Total: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.receipt.date).toBeInstanceOf(Date);
      expect(result.receipt.date.getFullYear()).toBe(2000);
      // Confidence should be lower due to unreasonable date
      expect(result.receipt.confidence).toBeLessThan(0.9);
    });

    it('should handle very large amounts', async () => {
      const mockPdfText = `
        Store Name
        Date: 11/20/2025
        Total: $12,345.67
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.receipt.amount).toBe(12345.67);
    });
  });

  describe('parseMultiPageReceipt', () => {
    it('should parse single-page receipt normally', async () => {
      const mockPdfText = `
        Store Name
        Date: 11/20/2025
        Total: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseMultiPageReceipt(pdfBuffer);

      expect(result.receipt.amount).toBe(49.99);
      expect(result.receipt.multiPage).toBeUndefined(); // Not set for single page
    });

    it('should combine text from multi-page receipt', async () => {
      const mockPdfText = `
        Store Name
        123 Main Street
        Phone: (555) 123-4567

        Page 1 content...

        [Page Break]

        More items...

        Subtotal: $100.00
        Tax: $9.00
        Total: $109.00

        Thank you!
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 2,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseMultiPageReceipt(pdfBuffer);

      expect(result.receipt.merchant).toContain('Store Name');
      expect(result.receipt.amount).toBe(109.00);
      expect(result.receipt.multiPage).toBe(true);
      expect(result.receipt.pageCount).toBe(2);
    });

    it('should extract merchant from top and total from bottom in multi-page', async () => {
      const lines = [
        'ABC Company Store',
        '123 Main Street',
        ...Array(100).fill('Item line'),
        'Subtotal: $500.00',
        'Tax: $45.00',
        'Grand Total: $545.00',
      ];

      pdf.mockResolvedValue({
        text: lines.join('\n'),
        numpages: 3,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseMultiPageReceipt(pdfBuffer);

      expect(result.receipt.merchant).toContain('ABC Company');
      expect(result.receipt.amount).toBe(545.00);
      expect(result.receipt.pageCount).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle pdf-parse error', async () => {
      pdf.mockRejectedValue(new Error('PDF parsing failed'));

      const pdfBuffer = Buffer.from('mock pdf');

      // Should fallback to OCR
      const result = await parseReceiptPDF(pdfBuffer);
      expect(result.requiresOCR).toBe(true);
      expect(result.reason).toContain('Text extraction failed');
    });

    it('should throw for PDF-specific errors', async () => {
      pdf.mockRejectedValue(new Error('PDF is corrupted'));

      const pdfBuffer = Buffer.from('mock pdf');

      await expect(parseReceiptPDF(pdfBuffer)).rejects.toThrow('PDF is corrupted');
    });

    it('should handle empty PDF data', async () => {
      pdf.mockResolvedValue({
        text: '',
        numpages: 0,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.requiresOCR).toBe(true);
    });
  });

  describe('Various Receipt Formats', () => {
    it('should handle receipt with "Amount Due"', async () => {
      const mockPdfText = `
        Store Name
        Date: 11/20/2025
        Amount Due: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.receipt.amount).toBe(49.99);
    });

    it('should handle receipt with "You Paid"', async () => {
      const mockPdfText = `
        Store Name
        Date: 11/20/2025
        You Paid: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.receipt.amount).toBe(49.99);
    });

    it('should handle receipt with "Order Total"', async () => {
      const mockPdfText = `
        Store Name
        Order Date: 11/20/2025
        Order Total: $49.99
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.receipt.amount).toBe(49.99);
    });

    it('should handle receipt with VAT instead of tax', async () => {
      const mockPdfText = `
        Store Name
        Date: 11/20/2025
        Subtotal: £40.00
        VAT (20%): £8.00
        Total: £48.00
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.receipt.amount).toBe(48.00);
      expect(result.receipt.tax).toBe(8.00);
    });

    it('should handle receipt with colon separators', async () => {
      const mockPdfText = `
        Store Name
        Date: 11/20/2025
        Subtotal: $40.00
        Tax: $3.60
        Total: $43.60
      `;

      pdf.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        info: {},
      });

      const pdfBuffer = Buffer.from('mock pdf');
      const result = await parseReceiptPDF(pdfBuffer);

      expect(result.receipt.amount).toBe(43.60);
      expect(result.receipt.subtotal).toBe(40.00);
      expect(result.receipt.tax).toBe(3.60);
    });
  });
});
