/**
 * Multi-Language Receipt Support Tests
 *
 * Tests the system's ability to:
 * - Process receipts in multiple languages
 * - Handle different currency symbols and formats
 * - Parse international date formats
 * - Detect and translate merchant names
 * - Support region-specific receipt layouts
 */

const { extractTextFromImageUrl } = require('../../src/ocr/visionClient');
const { parseReceipt } = require('../../src/ocr/receiptParser');
const { detectLanguage, translateText } = require('../../src/ocr/languageDetector');
const { parseInternationalAmount, parseCurrency } = require('../../src/ocr/currencyParser');
const { parseInternationalDate } = require('../../src/ocr/dateParser');

// Mock Google Cloud Vision
jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn(() => ({
    textDetection: jest.fn(),
  })),
}));

// Mock Google Cloud Translation
jest.mock('@google-cloud/translate', () => ({
  v2: {
    Translate: jest.fn(() => ({
      detect: jest.fn(),
      translate: jest.fn(),
    })),
  },
}));

describe('Multi-Language Receipt Support', () => {
  let visionClient;
  let translateClient;

  beforeEach(() => {
    const vision = require('@google-cloud/vision');
    visionClient = new vision.ImageAnnotatorClient();

    const { Translate } = require('@google-cloud/translate').v2;
    translateClient = new Translate();
  });

  describe('Spanish Receipts', () => {
    it('should parse Spanish receipt from Spain', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'MERCADONA\nSubtotal: 45,50€\nIVA (21%): 9,56€\nTOTAL: 55,06€\nFecha: 19/11/2025',
        }],
      }]);

      const result = await parseReceipt('spanish-receipt.jpg');

      expect(result.amount).toBeCloseTo(55.06, 2);
      expect(result.merchant).toContain('MERCADONA');
      expect(result.date).toBeDefined();
      expect(result.currency).toBe('EUR');
    });

    it('should parse Spanish receipt from Mexico', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'WALMART\nSubtotal: $450.50\nIVA: $72.08\nTOTAL: $522.58\nFecha: 19/11/2025',
        }],
      }]);

      const result = await parseReceipt('mexican-receipt.jpg');

      expect(result.amount).toBeCloseTo(522.58, 2);
      expect(result.merchant).toContain('WALMART');
      expect(result.currency).toBe('MXN');
    });

    it('should handle Spanish decimal format (comma)', async () => {
      const amount = await parseInternationalAmount('45,50€');

      expect(amount.value).toBeCloseTo(45.50, 2);
      expect(amount.currency).toBe('EUR');
    });

    it('should parse Spanish date format (DD/MM/YYYY)', async () => {
      const date = await parseInternationalDate('19/11/2025', 'es');

      expect(date.getMonth()).toBe(10); // November (0-indexed)
      expect(date.getDate()).toBe(19);
      expect(date.getFullYear()).toBe(2025);
    });
  });

  describe('French Receipts', () => {
    it('should parse French receipt', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'CARREFOUR\nSous-total: 45,50€\nTVA (20%): 9,10€\nTOTAL: 54,60€\nDate: 19/11/2025',
        }],
      }]);

      const result = await parseReceipt('french-receipt.jpg');

      expect(result.amount).toBeCloseTo(54.60, 2);
      expect(result.merchant).toContain('CARREFOUR');
      expect(result.currency).toBe('EUR');
    });

    it('should handle French thousand separators (space)', async () => {
      const amount = await parseInternationalAmount('1 234,56€');

      expect(amount.value).toBeCloseTo(1234.56, 2);
    });

    it('should detect TVA (French VAT)', async () => {
      const text = 'TVA (20%): 9,10€';
      const tax = await parseReceipt(text);

      expect(tax.taxAmount).toBeCloseTo(9.10, 2);
    });
  });

  describe('German Receipts', () => {
    it('should parse German receipt', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'REWE\nZwischensumme: 45,50€\nMwSt. (19%): 8,65€\nSUMME: 54,15€\nDatum: 19.11.2025',
        }],
      }]);

      const result = await parseReceipt('german-receipt.jpg');

      expect(result.amount).toBeCloseTo(54.15, 2);
      expect(result.merchant).toContain('REWE');
      expect(result.currency).toBe('EUR');
    });

    it('should parse German date format (DD.MM.YYYY)', async () => {
      const date = await parseInternationalDate('19.11.2025', 'de');

      expect(date.getDate()).toBe(19);
      expect(date.getMonth()).toBe(10); // November
      expect(date.getFullYear()).toBe(2025);
    });

    it('should detect MwSt (German VAT)', async () => {
      const text = 'MwSt. (19%): 8,65€';
      const result = await parseReceipt(text);

      expect(result.taxAmount).toBeCloseTo(8.65, 2);
    });
  });

  describe('Italian Receipts', () => {
    it('should parse Italian receipt', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'COOP\nSubtotale: 45,50€\nIVA (22%): 10,01€\nTOTALE: 55,51€\nData: 19/11/2025',
        }],
      }]);

      const result = await parseReceipt('italian-receipt.jpg');

      expect(result.amount).toBeCloseTo(55.51, 2);
      expect(result.merchant).toContain('COOP');
      expect(result.currency).toBe('EUR');
    });

    it('should handle Italian date format', async () => {
      const date = await parseInternationalDate('19/11/2025', 'it');

      expect(date.getDate()).toBe(19);
      expect(date.getMonth()).toBe(10);
    });
  });

  describe('Portuguese Receipts', () => {
    it('should parse Portuguese receipt (Portugal)', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'CONTINENTE\nSubtotal: 45,50€\nIVA (23%): 10,47€\nTOTAL: 55,97€\nData: 19/11/2025',
        }],
      }]);

      const result = await parseReceipt('portuguese-receipt.jpg');

      expect(result.amount).toBeCloseTo(55.97, 2);
      expect(result.currency).toBe('EUR');
    });

    it('should parse Portuguese receipt (Brazil)', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'PÃO DE AÇÚCAR\nSubtotal: R$ 45,50\nImpostos: R$ 5,46\nTOTAL: R$ 50,96\nData: 19/11/2025',
        }],
      }]);

      const result = await parseReceipt('brazilian-receipt.jpg');

      expect(result.amount).toBeCloseTo(50.96, 2);
      expect(result.currency).toBe('BRL');
    });

    it('should handle Brazilian Real currency format', async () => {
      const amount = await parseInternationalAmount('R$ 50,96');

      expect(amount.value).toBeCloseTo(50.96, 2);
      expect(amount.currency).toBe('BRL');
    });
  });

  describe('Japanese Receipts', () => {
    it('should parse Japanese receipt', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'セブンイレブン\n小計: ¥4,550\n消費税: ¥455\n合計: ¥5,005\n日付: 2025/11/19',
        }],
      }]);

      const result = await parseReceipt('japanese-receipt.jpg');

      expect(result.amount).toBeCloseTo(5005, 0);
      expect(result.currency).toBe('JPY');
    });

    it('should handle Japanese Yen (no decimal places)', async () => {
      const amount = await parseInternationalAmount('¥5,005');

      expect(amount.value).toBe(5005);
      expect(amount.currency).toBe('JPY');
      expect(amount.decimals).toBe(0);
    });

    it('should parse Japanese date format (YYYY/MM/DD)', async () => {
      const date = await parseInternationalDate('2025/11/19', 'ja');

      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10);
      expect(date.getDate()).toBe(19);
    });
  });

  describe('Chinese Receipts', () => {
    it('should parse Chinese receipt (Simplified)', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: '沃尔玛\n小计: ¥455.00\n税: ¥45.50\n总计: ¥500.50\n日期: 2025-11-19',
        }],
      }]);

      const result = await parseReceipt('chinese-receipt.jpg');

      expect(result.amount).toBeCloseTo(500.50, 2);
      expect(result.currency).toBe('CNY');
    });

    it('should handle Chinese Yuan currency format', async () => {
      const amount = await parseInternationalAmount('¥500.50');

      expect(amount.value).toBeCloseTo(500.50, 2);
      expect(amount.currency).toBe('CNY');
    });
  });

  describe('Language Detection', () => {
    it('should detect Spanish language', async () => {
      translateClient.detect.mockResolvedValue([{
        language: 'es',
        confidence: 0.95
      }]);

      const result = await detectLanguage('MERCADONA\nTOTAL: 55,06€\nFecha: 19/11/2025');

      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect French language', async () => {
      translateClient.detect.mockResolvedValue([{
        language: 'fr',
        confidence: 0.92
      }]);

      const result = await detectLanguage('CARREFOUR\nTOTAL: 54,60€\nDate: 19/11/2025');

      expect(result.language).toBe('fr');
    });

    it('should detect German language', async () => {
      translateClient.detect.mockResolvedValue([{
        language: 'de',
        confidence: 0.93
      }]);

      const result = await detectLanguage('REWE\nSUMME: 54,15€\nDatum: 19.11.2025');

      expect(result.language).toBe('de');
    });

    it('should handle mixed language receipts', async () => {
      translateClient.detect.mockResolvedValue([{
        language: 'en',
        confidence: 0.60
      }]);

      const result = await detectLanguage('DUTY FREE\nTOTAL: $50.00\nTOTAL: €45.00');

      expect(result.language).toBe('en');
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence for mixed content
    });
  });

  describe('Currency Detection', () => {
    it('should detect Euro (€)', async () => {
      const currency = await parseCurrency('45,50€');

      expect(currency.code).toBe('EUR');
      expect(currency.symbol).toBe('€');
    });

    it('should detect US Dollar ($)', async () => {
      const currency = await parseCurrency('$45.50');

      expect(currency.code).toBe('USD');
      expect(currency.symbol).toBe('$');
    });

    it('should detect British Pound (£)', async () => {
      const currency = await parseCurrency('£45.50');

      expect(currency.code).toBe('GBP');
      expect(currency.symbol).toBe('£');
    });

    it('should detect Japanese Yen (¥)', async () => {
      const currency = await parseCurrency('¥4,550');

      expect(currency.code).toBe('JPY');
      expect(currency.symbol).toBe('¥');
    });

    it('should handle currency codes in text', async () => {
      const currency = await parseCurrency('45.50 USD');

      expect(currency.code).toBe('USD');
    });

    it('should detect multiple currencies and choose primary', async () => {
      const text = 'TOTAL: €45.50\nUSD EQUIVALENT: $50.00';
      const currency = await parseCurrency(text);

      // Should prioritize the first/primary currency
      expect(currency.code).toBe('EUR');
    });
  });

  describe('Number Format Parsing', () => {
    it('should parse comma as decimal separator (European)', async () => {
      const amounts = [
        { text: '45,50', expected: 45.50 },
        { text: '1.234,56', expected: 1234.56 },
        { text: '1 234,56', expected: 1234.56 },
      ];

      for (const { text, expected } of amounts) {
        const result = await parseInternationalAmount(text);
        expect(result.value).toBeCloseTo(expected, 2);
      }
    });

    it('should parse period as decimal separator (US)', async () => {
      const amounts = [
        { text: '45.50', expected: 45.50 },
        { text: '1,234.56', expected: 1234.56 },
      ];

      for (const { text, expected } of amounts) {
        const result = await parseInternationalAmount(text);
        expect(result.value).toBeCloseTo(expected, 2);
      }
    });

    it('should handle no decimal separator (Japanese Yen)', async () => {
      const result = await parseInternationalAmount('4,550', { currency: 'JPY' });

      expect(result.value).toBe(4550);
    });

    it('should auto-detect number format from context', async () => {
      // If we see 1.234,56 → European format
      const european = await parseInternationalAmount('1.234,56');
      expect(european.value).toBeCloseTo(1234.56, 2);

      // If we see 1,234.56 → US format
      const us = await parseInternationalAmount('1,234.56');
      expect(us.value).toBeCloseTo(1234.56, 2);
    });
  });

  describe('Date Format Parsing', () => {
    it('should parse DD/MM/YYYY (European)', async () => {
      const date = await parseInternationalDate('19/11/2025');

      expect(date.getDate()).toBe(19);
      expect(date.getMonth()).toBe(10); // November
      expect(date.getFullYear()).toBe(2025);
    });

    it('should parse MM/DD/YYYY (US)', async () => {
      const date = await parseInternationalDate('11/19/2025', 'en-US');

      expect(date.getDate()).toBe(19);
      expect(date.getMonth()).toBe(10);
      expect(date.getFullYear()).toBe(2025);
    });

    it('should parse YYYY-MM-DD (ISO)', async () => {
      const date = await parseInternationalDate('2025-11-19');

      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10);
      expect(date.getDate()).toBe(19);
    });

    it('should parse DD.MM.YYYY (German)', async () => {
      const date = await parseInternationalDate('19.11.2025', 'de');

      expect(date.getDate()).toBe(19);
      expect(date.getMonth()).toBe(10);
    });

    it('should auto-detect ambiguous dates', async () => {
      // 13/11/2025 can only be DD/MM/YYYY (13 > 12)
      const date = await parseInternationalDate('13/11/2025');

      expect(date.getDate()).toBe(13);
      expect(date.getMonth()).toBe(10);
    });

    it('should handle month names in different languages', async () => {
      const dates = [
        { text: '19 novembre 2025', lang: 'fr', expectedMonth: 10 },
        { text: '19 November 2025', lang: 'de', expectedMonth: 10 },
        { text: '19 noviembre 2025', lang: 'es', expectedMonth: 10 },
      ];

      for (const { text, lang, expectedMonth } of dates) {
        const date = await parseInternationalDate(text, lang);
        expect(date.getMonth()).toBe(expectedMonth);
      }
    });
  });

  describe('Translation Support', () => {
    it('should translate merchant name to English', async () => {
      translateClient.translate.mockResolvedValue([
        'SUPERMARKET',
        { data: { translations: [{ translatedText: 'SUPERMARKET' }] } }
      ]);

      const translated = await translateText('SUPERMERCADO', 'es', 'en');

      expect(translated).toBe('SUPERMARKET');
    });

    it('should keep original if already in English', async () => {
      translateClient.detect.mockResolvedValue([{ language: 'en' }]);

      const text = await translateText('WALMART', 'auto', 'en');

      expect(text).toBe('WALMART');
      expect(translateClient.translate).not.toHaveBeenCalled();
    });

    it('should handle translation errors gracefully', async () => {
      translateClient.translate.mockRejectedValue(new Error('Translation failed'));

      const text = await translateText('SUPERMERCADO', 'es', 'en');

      // Should return original text if translation fails
      expect(text).toBe('SUPERMERCADO');
    });
  });

  describe('Regional Receipt Layouts', () => {
    it('should handle European receipt layout', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'SHOP NAME\nAddress Line 1\nAddress Line 2\n\nArticles:\nItem 1  €10.00\nItem 2  €15.50\n\nSous-total: €25.50\nTVA (20%): €5.10\nTOTAL: €30.60\n\nDate: 19/11/2025\nMerci!',
        }],
      }]);

      const result = await parseReceipt('european-layout.jpg');

      expect(result.amount).toBeCloseTo(30.60, 2);
      expect(result.merchant).toBeDefined();
    });

    it('should handle Asian receipt layout (vertical text)', async () => {
      // Asian receipts sometimes have vertical text
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'セブンイレブン\n品名　単価　数量　金額\n商品１　¥100　2　¥200\n商品２　¥150　1　¥150\n\n小計　¥350\n消費税　¥35\n合計　¥385',
        }],
      }]);

      const result = await parseReceipt('asian-layout.jpg');

      expect(result.amount).toBeCloseTo(385, 0);
    });

    it('should handle thermal receipt format', async () => {
      // Thermal receipts often have specific formatting
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: '--------------------------------\n  GROCERY STORE\n  123 Main St\n--------------------------------\nITEM 1          $10.00\nITEM 2          $15.50\n--------------------------------\nSUBTOTAL        $25.50\nTAX              $2.55\nTOTAL           $28.05\n--------------------------------\n11/19/2025      3:45 PM\nTHANK YOU!',
        }],
      }]);

      const result = await parseReceipt('thermal-layout.jpg');

      expect(result.amount).toBeCloseTo(28.05, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle receipts with multiple languages', async () => {
      visionClient.textDetection.mockResolvedValue([{
        textAnnotations: [{
          description: 'DUTY FREE SHOP\nAEROPUERTO INTERNACIONAL\nTOTAL / TOTAL: $45.50 USD\nTOTAL: €41.00 EUR\nFecha/Date: 19/11/2025',
        }],
      }]);

      const result = await parseReceipt('multilingual-receipt.jpg');

      expect(result.amount).toBeCloseTo(45.50, 2);
      expect(result.currency).toBe('USD');
    });

    it('should handle receipts with no recognizable language', async () => {
      translateClient.detect.mockResolvedValue([{
        language: 'und', // undefined/unknown
        confidence: 0.2
      }]);

      const result = await detectLanguage('????? ####');

      expect(result.language).toBe('und');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle receipts with special characters', async () => {
      const text = 'CAFÉ É AÇÚCAR\nTOTAL: R$ 25,50\nData: 19/11/2025';
      const result = await parseReceipt(text);

      expect(result.merchant).toContain('CAFÉ');
      expect(result.amount).toBeCloseTo(25.50, 2);
    });
  });

  describe('Performance', () => {
    it('should process multi-language receipts efficiently', async () => {
      const receipts = [
        'spanish-receipt.jpg',
        'french-receipt.jpg',
        'german-receipt.jpg',
        'italian-receipt.jpg',
        'portuguese-receipt.jpg',
      ];

      const startTime = Date.now();

      await Promise.all(receipts.map(receipt => parseReceipt(receipt)));

      const duration = Date.now() - startTime;
      const avgTime = duration / receipts.length;

      expect(avgTime).toBeLessThan(3000); // <3 seconds per receipt
    });
  });
});
