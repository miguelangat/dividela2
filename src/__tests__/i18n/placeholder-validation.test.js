// src/__tests__/i18n/placeholder-validation.test.js
// Tests to ensure placeholders are preserved across all translations

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
 * Extract all placeholders from a string
 * @param {string} str - The string to extract placeholders from
 * @returns {string[]} Array of placeholder names (without braces)
 */
function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];

  const regex = /\{\{(\w+)\}\}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(str)) !== null) {
    matches.push(match[1]);
  }

  return matches.sort();
}

/**
 * Get all translation values with their keys
 * @param {object} obj - The translation object
 * @param {string} prefix - The key prefix
 * @returns {object[]} Array of {key, value} objects
 */
function getAllTranslations(obj, prefix = '') {
  const translations = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      translations.push(...getAllTranslations(obj[key], fullKey));
    } else if (typeof obj[key] === 'string') {
      translations.push({ key: fullKey, value: obj[key] });
    }
  }

  return translations;
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

describe('Placeholder Validation Tests', () => {
  const englishTranslations = getAllTranslations(en);
  const translationsWithPlaceholders = englishTranslations.filter(
    t => extractPlaceholders(t.value).length > 0
  );

  describe('All placeholders are preserved in translations', () => {
    translationsWithPlaceholders.forEach(({ key, value: enValue }) => {
      const enPlaceholders = extractPlaceholders(enValue);

      languageCodes.forEach((langCode) => {
        if (langCode === 'en') return; // Skip English

        it(`${key} in ${langCode}.json should have placeholders: ${enPlaceholders.join(', ')}`, () => {
          const translatedValue = getValueByPath(languages[langCode], key);
          const translatedPlaceholders = extractPlaceholders(translatedValue);

          expect(translatedPlaceholders).toEqual(enPlaceholders);
        });
      });
    });
  });

  describe('No extra placeholders in translations', () => {
    translationsWithPlaceholders.forEach(({ key, value: enValue }) => {
      const enPlaceholders = extractPlaceholders(enValue);

      languageCodes.forEach((langCode) => {
        if (langCode === 'en') return;

        it(`${key} in ${langCode}.json should not have extra placeholders`, () => {
          const translatedValue = getValueByPath(languages[langCode], key);
          const translatedPlaceholders = extractPlaceholders(translatedValue);

          const extraPlaceholders = translatedPlaceholders.filter(
            p => !enPlaceholders.includes(p)
          );

          expect(extraPlaceholders).toEqual([]);
        });
      });
    });
  });

  describe('Placeholder format is correct', () => {
    languageCodes.forEach((langCode) => {
      it(`${langCode}.json should use correct placeholder format {{variable}}`, () => {
        const allTranslations = getAllTranslations(languages[langCode]);
        const invalidPlaceholders = [];

        allTranslations.forEach(({ key, value }) => {
          // Check for single braces (incorrect format)
          if (typeof value === 'string') {
            const singleBraceMatch = value.match(/\{[^{].*?\}/g);
            if (singleBraceMatch) {
              invalidPlaceholders.push({ key, issue: 'single braces', value });
            }

            // Check for spaces in placeholders
            const spacedPlaceholderMatch = value.match(/\{\{\s*\w+\s*\}\}/g);
            if (spacedPlaceholderMatch) {
              invalidPlaceholders.push({ key, issue: 'spaces in placeholder', value });
            }
          }
        });

        expect(invalidPlaceholders).toEqual([]);
      });
    });
  });

  describe('Common placeholders are used correctly', () => {
    const commonPlaceholders = ['name', 'partnerName', 'amount', 'count', 'payer'];

    commonPlaceholders.forEach((placeholder) => {
      it(`${placeholder} placeholder should be used consistently`, () => {
        const keysWithPlaceholder = translationsWithPlaceholders
          .filter(t => extractPlaceholders(t.value).includes(placeholder))
          .map(t => t.key);

        // For each key that uses this placeholder in English
        keysWithPlaceholder.forEach((key) => {
          languageCodes.forEach((langCode) => {
            if (langCode === 'en') return;

            const translatedValue = getValueByPath(languages[langCode], key);
            const placeholders = extractPlaceholders(translatedValue);

            expect(placeholders).toContain(placeholder);
          });
        });
      });
    });
  });

  describe('Plural form placeholders are preserved', () => {
    const pluralKeys = englishTranslations
      .filter(t => t.key.includes('_plural'))
      .filter(t => extractPlaceholders(t.value).length > 0);

    pluralKeys.forEach(({ key, value: enValue }) => {
      const enPlaceholders = extractPlaceholders(enValue);

      languageCodes.forEach((langCode) => {
        if (langCode === 'en') return;

        it(`${key} in ${langCode}.json should preserve plural placeholders`, () => {
          const translatedValue = getValueByPath(languages[langCode], key);
          const translatedPlaceholders = extractPlaceholders(translatedValue);

          expect(translatedPlaceholders).toEqual(enPlaceholders);
        });
      });
    });
  });

  describe('Placeholder count matches across languages', () => {
    languageCodes.forEach((langCode) => {
      if (langCode === 'en') return;

      it(`${langCode}.json should have the same number of placeholders per translation`, () => {
        const mismatches = [];

        translationsWithPlaceholders.forEach(({ key, value: enValue }) => {
          const enCount = extractPlaceholders(enValue).length;
          const translatedValue = getValueByPath(languages[langCode], key);
          const translatedCount = extractPlaceholders(translatedValue).length;

          if (enCount !== translatedCount) {
            mismatches.push({
              key,
              expected: enCount,
              actual: translatedCount,
            });
          }
        });

        expect(mismatches).toEqual([]);
      });
    });
  });
});
