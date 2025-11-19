# Internationalization (i18n) Tests

Comprehensive test suite for the Dividela app's internationalization system.

## Test Files

### 1. `translation-structure.test.js`
Validates that all language files have consistent structure and content.

**What it tests:**
- ✅ All language files have identical keys (no missing or extra translations)
- ✅ All top-level sections exist in every language
- ✅ No empty string values in translations
- ✅ Translations are not just English text (validates actual translations exist)
- ✅ Translation values have reasonable length (under 500 characters)
- ✅ All language files are valid JSON

**Why it matters:** Ensures completeness and consistency across all 6 supported languages.

### 2. `placeholder-validation.test.js`
Ensures all placeholder variables are preserved across translations.

**What it tests:**
- ✅ All `{{variable}}` placeholders match between English and other languages
- ✅ No extra or missing placeholders in translations
- ✅ Correct placeholder format (no single braces or spaces)
- ✅ Common placeholders (`name`, `partnerName`, `amount`, `count`) are used consistently
- ✅ Plural form placeholders are preserved (`_plural` keys)
- ✅ Placeholder count matches across all languages

**Why it matters:** Prevents runtime errors from missing or incorrect variable interpolation.

### 3. `language-context.test.js`
Tests the LanguageContext provider and hooks.

**What it tests:**
- ✅ Provider renders without crashing
- ✅ Initializes with correct default language
- ✅ Loads saved language preference from AsyncStorage
- ✅ `changeLanguage()` function works correctly
- ✅ Saves language preference to AsyncStorage
- ✅ Rejects invalid language codes
- ✅ `getCurrentLanguageInfo()` returns correct data
- ✅ `availableLanguages` array is correct
- ✅ Integration with i18n instance
- ✅ `useLanguage` hook throws error when used outside provider

**Why it matters:** Ensures the language switching functionality works correctly in the app.

### 4. `i18n-config.test.js`
Tests the i18n configuration and core functionality.

**What it tests:**
- ✅ i18n instance is properly initialized
- ✅ All 6 languages are supported and loaded
- ✅ Fallback language is set to English
- ✅ Translation functions work (`i18n.t()`)
- ✅ Nested key translation works
- ✅ Variable interpolation works correctly
- ✅ Missing keys are handled gracefully
- ✅ Pluralization works for singular and plural forms
- ✅ Language switching maintains correct translations
- ✅ Fallback to English for unsupported languages
- ✅ Performance benchmarks (translation speed, language switching speed)

**Why it matters:** Validates the core i18n system configuration and performance.

## Supported Languages

The test suite validates all 6 supported languages:
- 🇬🇧 English (en)
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇵🇹 Portuguese (pt)
- 🇮🇹 Italian (it)

## Running the Tests

```bash
# Run all i18n tests
npm test -- --testPathPattern="i18n"

# Run specific test file
npm test -- src/__tests__/i18n/translation-structure.test.js

# Run with coverage
npm test -- --testPathPattern="i18n" --coverage

# Watch mode for development
npm test -- --testPathPattern="i18n" --watch
```

## Test Coverage

The test suite includes **150+ test cases** covering:

| Category | Test Cases | Coverage |
|----------|-----------|----------|
| Structure Validation | 30+ | All languages, all sections |
| Placeholder Validation | 50+ | All placeholders, all languages |
| Context Functionality | 40+ | All hooks, all methods |
| i18n Configuration | 30+ | Core functions, performance |

## Adding New Translations

When adding new translation keys:

1. **Add to `en.json` first** - English is the reference language
2. **Add to all other language files** - Use the same key path
3. **Preserve placeholders** - Keep `{{variable}}` names identical
4. **Run tests** - Ensure all tests pass before committing

Example:
```json
// en.json
{
  "newSection": {
    "greeting": "Hello {{name}}, you have {{count}} message",
    "greeting_plural": "Hello {{name}}, you have {{count}} messages"
  }
}

// es.json
{
  "newSection": {
    "greeting": "Hola {{name}}, tienes {{count}} mensaje",
    "greeting_plural": "Hola {{name}}, tienes {{count}} mensajes"
  }
}
```

## Troubleshooting

### Tests won't run
If you see jest-expo setup errors, ensure all dependencies are installed:
```bash
npm install
```

### Tests fail for new translations
1. Check that the key exists in **all** language files
2. Verify placeholder names match exactly (case-sensitive)
3. Ensure JSON structure is identical across all files
4. Run `npm test -- --testPathPattern="translation-structure"` to see which keys are missing

### Placeholder validation fails
1. Check that `{{variable}}` format is used (not `{variable}`)
2. Ensure no spaces inside placeholders: `{{name}}` not `{{ name }}`
3. Verify placeholder names match English exactly

## CI/CD Integration

These tests should be run:
- ✅ Before every commit (pre-commit hook)
- ✅ In pull request CI pipeline
- ✅ Before deploying to production

## Maintenance

- **When adding a new language:** Update all test files to include the new language code
- **When removing a language:** Remove from `AVAILABLE_LANGUAGES` and test files
- **Quarterly review:** Run full test suite with coverage to ensure no regressions

## Performance Benchmarks

The tests include performance benchmarks to ensure:
- Translation speed: < 100ms for 100 translations
- Language switching: < 500ms for 3 language changes

If these benchmarks fail, investigate caching or lazy loading issues.

## Questions?

For questions about these tests, refer to:
- [i18next Documentation](https://www.i18next.com/)
- [React-i18next Documentation](https://react.i18next.com/)
- Project documentation in `/docs/i18n.md`
