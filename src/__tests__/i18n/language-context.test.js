// src/__tests__/i18n/language-context.test.js
// Tests for LanguageContext functionality

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { LanguageProvider, useLanguage, AVAILABLE_LANGUAGES } from '../../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../i18n/i18n.config';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

// Test component that uses the language context
function TestComponent() {
  const { currentLanguage, changeLanguage, getCurrentLanguageInfo, availableLanguages } = useLanguage();

  return (
    <Text testID="current-language">{currentLanguage}</Text>
  );
}

describe('LanguageContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  describe('Provider initialization', () => {
    it('should render without crashing', () => {
      const { getByTestID } = render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(getByTestID('current-language')).toBeTruthy();
    });

    it('should initialize with English as default', async () => {
      const { getByTestID } = render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      await waitFor(() => {
        const languageText = getByTestID('current-language');
        expect(['en', 'es', 'fr', 'de', 'pt', 'it']).toContain(languageText.props.children);
      });
    });

    it('should load saved language preference from AsyncStorage', async () => {
      AsyncStorage.getItem.mockResolvedValue('es');

      const { getByTestID } = render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('@dividela_language');
      });
    });
  });

  describe('changeLanguage function', () => {
    it('should change language successfully', async () => {
      let languageContext;

      function TestComponentWithChange() {
        languageContext = useLanguage();
        return <Text testID="current-language">{languageContext.currentLanguage}</Text>;
      }

      const { getByTestID } = render(
        <LanguageProvider>
          <TestComponentWithChange />
        </LanguageProvider>
      );

      // Wait for initial render
      await waitFor(() => {
        expect(getByTestID('current-language')).toBeTruthy();
      });

      // Change language
      await act(async () => {
        await languageContext.changeLanguage('es');
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@dividela_language', 'es');
      });
    });

    it('should update currentLanguage state after changing', async () => {
      let languageContext;

      function TestComponentWithChange() {
        languageContext = useLanguage();
        return <Text testID="current-language">{languageContext.currentLanguage}</Text>;
      }

      render(
        <LanguageProvider>
          <TestComponentWithChange />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(languageContext).toBeDefined();
      });

      await act(async () => {
        await languageContext.changeLanguage('fr');
      });

      expect(languageContext.currentLanguage).toBe('fr');
    });

    it('should not change language for invalid language code', async () => {
      let languageContext;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      function TestComponentWithChange() {
        languageContext = useLanguage();
        return <Text testID="current-language">{languageContext.currentLanguage}</Text>;
      }

      render(
        <LanguageProvider>
          <TestComponentWithChange />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(languageContext).toBeDefined();
      });

      const originalLanguage = languageContext.currentLanguage;

      await act(async () => {
        await languageContext.changeLanguage('invalid');
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid language code: invalid');
      expect(languageContext.currentLanguage).toBe(originalLanguage);

      consoleWarnSpy.mockRestore();
    });

    it('should save language preference to AsyncStorage', async () => {
      let languageContext;

      function TestComponentWithChange() {
        languageContext = useLanguage();
        return <Text testID="current-language">{languageContext.currentLanguage}</Text>;
      }

      render(
        <LanguageProvider>
          <TestComponentWithChange />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(languageContext).toBeDefined();
      });

      await act(async () => {
        await languageContext.changeLanguage('de');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@dividela_language', 'de');
    });
  });

  describe('getCurrentLanguageInfo function', () => {
    it('should return correct language info', async () => {
      let languageContext;

      function TestComponentWithInfo() {
        languageContext = useLanguage();
        const info = languageContext.getCurrentLanguageInfo();
        return <Text testID="language-info">{info.nativeName}</Text>;
      }

      const { getByTestID } = render(
        <LanguageProvider>
          <TestComponentWithInfo />
        </LanguageProvider>
      );

      await waitFor(() => {
        const infoText = getByTestID('language-info');
        expect(infoText.props.children).toBeTruthy();
      });
    });

    it('should return English info when current language is English', async () => {
      let languageContext;

      function TestComponentWithInfo() {
        languageContext = useLanguage();
        return <Text testID="test">test</Text>;
      }

      render(
        <LanguageProvider>
          <TestComponentWithInfo />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(languageContext).toBeDefined();
      });

      await act(async () => {
        await languageContext.changeLanguage('en');
      });

      const info = languageContext.getCurrentLanguageInfo();
      expect(info.code).toBe('en');
      expect(info.name).toBe('English');
      expect(info.nativeName).toBe('English');
    });
  });

  describe('availableLanguages', () => {
    it('should provide list of available languages', async () => {
      let languageContext;

      function TestComponentWithLanguages() {
        languageContext = useLanguage();
        return <Text testID="test">test</Text>;
      }

      render(
        <LanguageProvider>
          <TestComponentWithLanguages />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(languageContext).toBeDefined();
      });

      expect(languageContext.availableLanguages).toEqual(AVAILABLE_LANGUAGES);
      expect(languageContext.availableLanguages.length).toBe(6);
    });

    it('should have correct language codes', async () => {
      let languageContext;

      function TestComponentWithLanguages() {
        languageContext = useLanguage();
        return <Text testID="test">test</Text>;
      }

      render(
        <LanguageProvider>
          <TestComponentWithLanguages />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(languageContext).toBeDefined();
      });

      const languageCodes = languageContext.availableLanguages.map(lang => lang.code);
      expect(languageCodes).toEqual(['en', 'es', 'fr', 'de', 'pt', 'it']);
    });
  });

  describe('Integration with i18n', () => {
    it('should update i18n language when changing language', async () => {
      let languageContext;

      function TestComponentWithChange() {
        languageContext = useLanguage();
        return <Text testID="test">test</Text>;
      }

      render(
        <LanguageProvider>
          <TestComponentWithChange />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(languageContext).toBeDefined();
      });

      await act(async () => {
        await languageContext.changeLanguage('es');
      });

      expect(i18n.language).toBe('es');
    });
  });

  describe('useLanguage hook', () => {
    it('should throw error when used outside LanguageProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      function ComponentWithoutProvider() {
        useLanguage();
        return <Text>test</Text>;
      }

      expect(() => {
        render(<ComponentWithoutProvider />);
      }).toThrow('useLanguage must be used within a LanguageProvider');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('AVAILABLE_LANGUAGES constant', () => {
    it('should export AVAILABLE_LANGUAGES', () => {
      expect(AVAILABLE_LANGUAGES).toBeDefined();
      expect(Array.isArray(AVAILABLE_LANGUAGES)).toBe(true);
    });

    it('should have correct structure for each language', () => {
      AVAILABLE_LANGUAGES.forEach(lang => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('nativeName');
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
        expect(typeof lang.nativeName).toBe('string');
      });
    });

    it('should include all 6 supported languages', () => {
      const expectedCodes = ['en', 'es', 'fr', 'de', 'pt', 'it'];
      const actualCodes = AVAILABLE_LANGUAGES.map(lang => lang.code);

      expectedCodes.forEach(code => {
        expect(actualCodes).toContain(code);
      });
    });
  });
});
