// src/__tests__/i18n/translation-structure.test.js
// Tests to ensure all translation files have consistent structure

import en from '../../i18n/locales/en.json';
import es from '../../i18n/locales/es.json';
import fr from '../../i18n/locales/fr.json';
import de from '../../i18n/locales/de.json';
import pt from '../../i18n/locales/pt.json';
import it from '../../i18n/locales/it.json';

const languages = {
  en,
  es,
  fr,
  de,
  pt,
  it,
};

const languageCodes = Object.keys(languages);

/**
 * Recursively get all keys from a nested object
 * @param {object} obj - The object to get keys from
 * @param {string} prefix - The key prefix for nested objects
 * @returns {string[]} Array of dot-notation keys
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Get value from nested object using dot notation
 * @param {object} obj - The object to get value from
 * @param {string} path - Dot notation path
 * @returns {*} The value at the path
 */
function getValueByPath(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

describe('Translation Structure Tests', () => {
  describe('All languages have the same keys', () => {
    const englishKeys = getAllKeys(en).sort();

    languageCodes.forEach((langCode) => {
      if (langCode === 'en') return; // Skip English, it's the reference

      it(`${langCode}.json should have all the same keys as en.json`, () => {
        const langKeys = getAllKeys(languages[langCode]).sort();

        // Check for missing keys
        const missingKeys = englishKeys.filter(key => !langKeys.includes(key));
        expect(missingKeys).toEqual([]);

        // Check for extra keys
        const extraKeys = langKeys.filter(key => !englishKeys.includes(key));
        expect(extraKeys).toEqual([]);

        // They should be exactly the same
        expect(langKeys).toEqual(englishKeys);
      });
    });
  });

  describe('All top-level sections exist in all languages', () => {
    const topLevelSections = Object.keys(en);

    languageCodes.forEach((langCode) => {
      it(`${langCode}.json should have all top-level sections: ${topLevelSections.join(', ')}`, () => {
        const langSections = Object.keys(languages[langCode]);

        topLevelSections.forEach(section => {
          expect(langSections).toContain(section);
        });
      });
    });
  });

  describe('No translation values are empty strings', () => {
    languageCodes.forEach((langCode) => {
      it(`${langCode}.json should not have any empty string values`, () => {
        const allKeys = getAllKeys(languages[langCode]);
        const emptyKeys = allKeys.filter(key => {
          const value = getValueByPath(languages[langCode], key);
          return typeof value === 'string' && value.trim() === '';
        });

        expect(emptyKeys).toEqual([]);
      });
    });
  });

  describe('Translations are not just English', () => {
    const nonEnglishLanguages = languageCodes.filter(code => code !== 'en');

    nonEnglishLanguages.forEach((langCode) => {
      it(`${langCode}.json should have actual translations (not just English text)`, () => {
        const allKeys = getAllKeys(languages[langCode]);

        // Sample a few common keys that should definitely be translated
        const sampleKeys = [
          'common.cancel',
          'common.save',
          'common.delete',
          'navigation.home',
          'navigation.settings',
        ];

        const untranslatedKeys = sampleKeys.filter(key => {
          const enValue = getValueByPath(en, key);
          const langValue = getValueByPath(languages[langCode], key);
          return enValue === langValue;
        });

        // Allow some technical terms to be the same, but not all
        expect(untranslatedKeys.length).toBeLessThan(sampleKeys.length);
      });
    });
  });

  describe('Translation files are valid JSON', () => {
    languageCodes.forEach((langCode) => {
      it(`${langCode}.json should be valid JSON`, () => {
        expect(languages[langCode]).toBeDefined();
        expect(typeof languages[langCode]).toBe('object');
        expect(languages[langCode]).not.toBeNull();
      });
    });
  });

  describe('All translations have reasonable length', () => {
    languageCodes.forEach((langCode) => {
      it(`${langCode}.json translations should not be excessively long`, () => {
        const allKeys = getAllKeys(languages[langCode]);
        const tooLongKeys = allKeys.filter(key => {
          const value = getValueByPath(languages[langCode], key);
          return typeof value === 'string' && value.length > 500;
        });

        // Translations should generally be under 500 characters
        expect(tooLongKeys).toEqual([]);
      });
    });
  });
});
