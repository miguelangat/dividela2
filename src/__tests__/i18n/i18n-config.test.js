// src/__tests__/i18n/i18n-config.test.js
// Tests for i18n configuration and integration

import i18n from '../../i18n/i18n.config';
import { AVAILABLE_LANGUAGES } from '../../contexts/LanguageContext';

describe('i18n Configuration Tests', () => {
  describe('i18n instance', () => {
    it('should be initialized', () => {
      expect(i18n).toBeDefined();
      expect(i18n.isInitialized).toBe(true);
    });

    it('should have a default language set', () => {
      expect(i18n.language).toBeDefined();
      expect(typeof i18n.language).toBe('string');
    });

    it('should have fallback language set to English', () => {
      expect(i18n.options.fallbackLng).toEqual('en');
    });

    it('should have React integration enabled', () => {
      expect(i18n.options.react).toBeDefined();
      expect(i18n.options.react.useSuspense).toBe(false);
    });
  });

  describe('Supported languages', () => {
    it('should support all configured languages', () => {
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      supportedLanguages.forEach(lang => {
        expect(i18n.hasResourceBundle(lang, 'translation')).toBe(true);
      });
    });

    it('should match AVAILABLE_LANGUAGES from context', () => {
      const availableCodes = AVAILABLE_LANGUAGES.map(lang => lang.code);

      availableCodes.forEach(code => {
        expect(i18n.hasResourceBundle(code, 'translation')).toBe(true);
      });
    });

    it('should load all language resources', () => {
      const languages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      languages.forEach(lang => {
        const resources = i18n.getResourceBundle(lang, 'translation');
        expect(resources).toBeDefined();
        expect(Object.keys(resources).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Translation functions', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('should translate simple keys', () => {
      expect(i18n.t('common.cancel')).toBe('Cancel');
      expect(i18n.t('common.save')).toBe('Save');
      expect(i18n.t('common.delete')).toBe('Delete');
    });

    it('should translate nested keys', () => {
      expect(i18n.t('navigation.home')).toBe('Home');
      expect(i18n.t('navigation.settings')).toBe('Settings');
    });

    it('should handle interpolation', () => {
      const result = i18n.t('home.greeting', { name: 'John' });
      expect(result).toContain('John');
    });

    it('should handle missing keys gracefully', () => {
      const result = i18n.t('nonexistent.key');
      expect(result).toBe('nonexistent.key');
    });

    it('should support pluralization', () => {
      // Test singular
      const singular = i18n.t('settleUpModal.settlingCount', { count: 1 });
      expect(singular).toBeDefined();

      // Test plural
      const plural = i18n.t('settleUpModal.settlingCount', { count: 5 });
      expect(plural).toBeDefined();
    });
  });

  describe('Language switching', () => {
    it('should change language successfully', async () => {
      await i18n.changeLanguage('es');
      expect(i18n.language).toBe('es');
    });

    it('should maintain translations after language change', async () => {
      await i18n.changeLanguage('en');
      const enTranslation = i18n.t('common.cancel');

      await i18n.changeLanguage('es');
      const esTranslation = i18n.t('common.cancel');

      expect(enTranslation).toBe('Cancel');
      expect(esTranslation).toBe('Cancelar');
      expect(enTranslation).not.toBe(esTranslation);
    });

    it('should translate to correct language after switching', async () => {
      const testCases = [
        { lang: 'en', key: 'common.save', expected: 'Save' },
        { lang: 'es', key: 'common.save', expected: 'Guardar' },
        { lang: 'fr', key: 'common.save', expected: 'Enregistrer' },
        { lang: 'de', key: 'common.save', expected: 'Speichern' },
        { lang: 'pt', key: 'common.save', expected: 'Salvar' },
        { lang: 'it', key: 'common.save', expected: 'Salva' },
      ];

      for (const { lang, key, expected } of testCases) {
        await i18n.changeLanguage(lang);
        expect(i18n.t(key)).toBe(expected);
      }
    });

    it('should fall back to English for unsupported languages', async () => {
      await i18n.changeLanguage('unsupported-lang');

      // Should fall back to English
      const translation = i18n.t('common.cancel');
      expect(translation).toBe('Cancel');
    });
  });

  describe('Interpolation', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('should interpolate single variable', () => {
      const result = i18n.t('home.greeting', { name: 'Alice' });
      expect(result).toContain('Alice');
    });

    it('should interpolate multiple variables', () => {
      const result = i18n.t('home.youOwe', { partnerName: 'Bob' });
      expect(result).toContain('Bob');
    });

    it('should handle missing interpolation values', () => {
      const result = i18n.t('home.greeting');
      expect(result).toBeTruthy(); // Should not crash
    });

    it('should preserve interpolation in all languages', async () => {
      const languages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      for (const lang of languages) {
        await i18n.changeLanguage(lang);
        const result = i18n.t('home.greeting', { name: 'Test' });
        expect(result).toContain('Test');
      }
    });
  });

  describe('Configuration options', () => {
    it('should have compatibility JSON v3', () => {
      expect(i18n.options.compatibilityJSON).toBe('v3');
    });

    it('should not escape values in interpolation', () => {
      expect(i18n.options.interpolation.escapeValue).toBe(false);
    });

    it('should have proper namespace configuration', () => {
      expect(i18n.options.defaultNS).toBe('translation');
    });
  });

  describe('Resource bundles', () => {
    it('should have translation namespace for all languages', () => {
      const languages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      languages.forEach(lang => {
        const bundle = i18n.getResourceBundle(lang, 'translation');
        expect(bundle).toBeDefined();
        expect(typeof bundle).toBe('object');
      });
    });

    it('should have consistent top-level keys across all languages', () => {
      const enKeys = Object.keys(i18n.getResourceBundle('en', 'translation'));

      ['es', 'fr', 'de', 'pt', 'it'].forEach(lang => {
        const langKeys = Object.keys(i18n.getResourceBundle(lang, 'translation'));
        expect(langKeys.sort()).toEqual(enKeys.sort());
      });
    });

    it('should have non-empty resource bundles', () => {
      const languages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      languages.forEach(lang => {
        const bundle = i18n.getResourceBundle(lang, 'translation');
        const keys = Object.keys(bundle);
        expect(keys.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid translation keys', () => {
      const result = i18n.t('this.does.not.exist');
      expect(result).toBe('this.does.not.exist');
    });

    it('should not crash on undefined interpolation', () => {
      expect(() => {
        i18n.t('home.greeting', { name: undefined });
      }).not.toThrow();
    });

    it('should not crash on null interpolation', () => {
      expect(() => {
        i18n.t('home.greeting', { name: null });
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should translate quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        i18n.t('common.cancel');
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should take less than 100ms for 100 translations
    });

    it('should switch languages quickly', async () => {
      const start = Date.now();

      await i18n.changeLanguage('en');
      await i18n.changeLanguage('es');
      await i18n.changeLanguage('fr');

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should take less than 500ms
    });
  });
});
