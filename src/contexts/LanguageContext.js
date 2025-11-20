/**
 * LanguageContext.js
 *
 * Manages language state and persistence
 * Provides language switching functionality throughout the app
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n/i18n.config';

const LanguageContext = createContext();

const LANGUAGE_STORAGE_KEY = '@dividela_language';

// Available languages with their native names
export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
];

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference on mount
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && AVAILABLE_LANGUAGES.some(lang => lang.code === savedLanguage)) {
        await changeLanguage(savedLanguage, false); // Don't save again
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (languageCode, shouldSave = true) => {
    try {
      // Validate language code
      if (!AVAILABLE_LANGUAGES.some(lang => lang.code === languageCode)) {
        console.warn(`Invalid language code: ${languageCode}`);
        return;
      }

      // Change language in i18n
      await i18n.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);

      // Save to AsyncStorage if requested
      if (shouldSave) {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
      }

      console.log(`Language changed to: ${languageCode}`);
    } catch (error) {
      console.error('Error changing language:', error);
      throw error;
    }
  };

  const getCurrentLanguageInfo = () => {
    return AVAILABLE_LANGUAGES.find(lang => lang.code === currentLanguage) || AVAILABLE_LANGUAGES[0];
  };

  const value = {
    currentLanguage,
    changeLanguage,
    getCurrentLanguageInfo,
    availableLanguages: AVAILABLE_LANGUAGES,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
