/**
 * LanguageSelectorButton.js
 *
 * Reusable language selector button component
 * Can be used in auth screens, settings, or anywhere else
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function LanguageSelectorButton({ variant = 'icon' }) {
  const { currentLanguage, changeLanguage, availableLanguages, getCurrentLanguageInfo } = useLanguage();
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const handleLanguageSelect = async (languageCode) => {
    try {
      await changeLanguage(languageCode);
      setModalVisible(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const currentLangInfo = getCurrentLanguageInfo();

  // Icon variant - small floating button (for auth screens)
  if (variant === 'icon') {
    return (
      <>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="language" size={24} color={COLORS.primary} />
          <Text style={styles.iconButtonText}>{currentLangInfo.code.toUpperCase()}</Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="language" size={32} color={COLORS.primary} />
                <Text style={styles.modalTitle}>{t('settings.language')}</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.languageList}
                showsVerticalScrollIndicator={true}
              >
                {availableLanguages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      currentLanguage === lang.code && styles.languageOptionSelected,
                    ]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <View style={styles.languageOptionContent}>
                      <Text style={styles.languageOptionName}>{lang.nativeName}</Text>
                      <Text style={styles.languageOptionSubname}>{lang.name}</Text>
                    </View>
                    {currentLanguage === lang.code && (
                      <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Compact variant - shows current language flag/code
  return (
    <>
      <TouchableOpacity
        style={styles.compactButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="language" size={20} color={COLORS.primary} />
        <Text style={styles.compactButtonText}>{currentLangInfo.nativeName}</Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="language" size={32} color={COLORS.primary} />
              <Text style={styles.modalTitle}>{t('settings.language')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.languageList}
              showsVerticalScrollIndicator={true}
            >
              {availableLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <View style={styles.languageOptionContent}>
                    <Text style={styles.languageOptionName}>{lang.nativeName}</Text>
                    <Text style={styles.languageOptionSubname}>{lang.name}</Text>
                  </View>
                  {currentLanguage === lang.code && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Icon button variant (for auth screens)
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: SPACING.small,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10',
  },
  iconButtonText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Compact button variant
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    padding: SPACING.small,
    paddingHorizontal: SPACING.base,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactButtonText: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: SPACING.large,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 0,
    padding: SPACING.tiny,
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
    marginLeft: SPACING.small,
  },
  languageList: {
    maxHeight: 400,
    width: '100%',
    marginTop: SPACING.base,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.base,
    borderRadius: 12,
    marginBottom: SPACING.small,
    backgroundColor: COLORS.backgroundSecondary,
  },
  languageOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  languageOptionContent: {
    flex: 1,
  },
  languageOptionName: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.tiny,
  },
  languageOptionSubname: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
});
