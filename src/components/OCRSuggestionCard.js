/**
 * OCRSuggestionCard.js
 *
 * Component to display OCR-extracted expense details from receipts
 * Shows AI-powered suggestions with confidence scores and allows users to
 * accept, edit, or dismiss the suggestions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { formatCurrency } from '../utils/currencyUtils';

/**
 * PropTypes definition for OCRSuggestionCard
 *
 * @param {string} receiptUrl - URL of the receipt image
 * @param {object} suggestions - OCR extracted data
 * @param {number} suggestions.amount - Extracted amount
 * @param {string} suggestions.merchant - Extracted merchant name
 * @param {string} suggestions.date - Extracted date
 * @param {object} suggestions.category - Category prediction
 * @param {string} suggestions.category.category - Predicted category name
 * @param {number} suggestions.category.confidence - Confidence score (0-1)
 * @param {string} suggestions.category.reasoning - Explanation for prediction
 * @param {array} suggestions.category.alternatives - Alternative category suggestions
 * @param {boolean} suggestions.category.belowThreshold - If confidence is below 55%
 * @param {string} currency - Currency code for formatting (e.g., 'USD', 'EUR')
 * @param {function} onAccept - Callback when user accepts suggestions
 * @param {function} onDismiss - Callback when user dismisses suggestions
 * @param {function} onCreateAlias - Optional callback for creating merchant alias
 */
export default function OCRSuggestionCard({
  receiptUrl,
  suggestions,
  currency = 'USD',
  onAccept,
  onDismiss,
  onCreateAlias,
}) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState(
    suggestions?.category?.category || null
  );
  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [aliasValue, setAliasValue] = useState('');

  // Don't render if no suggestions or below confidence threshold
  if (!suggestions || suggestions.category?.belowThreshold) {
    return null;
  }

  const { amount, merchant, date, category } = suggestions;
  // Extract currency detection info (NEW)
  const detectedCurrency = suggestions.currency;
  const currencyConfidence = suggestions.currencyConfidence || 0;
  const currencyDetected = suggestions.currencyDetected || false;

  const { confidence: rawConfidence, reasoning, alternatives = [] } = category || {};

  // Defensive validation - ensure confidence is a valid number
  const confidence = typeof rawConfidence === 'number' && !isNaN(rawConfidence)
    ? rawConfidence
    : 0;

  // Safe category name extraction (handles both string and object formats)
  const categoryName = typeof category === 'string'
    ? category
    : (category?.category || 'other');

  // Format confidence as percentage (now safe from NaN)
  const confidencePercentage = Math.round(confidence * 100);

  // Check if category is high confidence (>=80%)
  const isHighConfidence = confidence >= 0.80;

  // Build list of all categories (main + alternatives)
  const allCategories = [
    { category: categoryName, confidence },
    ...alternatives,
  ];

  // Handle category selection
  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
  };

  // Handle accept button
  const handleAccept = () => {
    // Create updated suggestions with selected category
    const updatedSuggestions = {
      ...suggestions,
      category: {
        ...suggestions.category,
        category: selectedCategory,
      },
    };
    onAccept(updatedSuggestions);
  };

  // Handle alias creation
  const handleOpenAliasDialog = () => {
    setAliasValue('');
    setShowAliasDialog(true);
  };

  const handleSaveAlias = () => {
    if (onCreateAlias && aliasValue.trim()) {
      onCreateAlias(merchant, aliasValue.trim());
    }
    setShowAliasDialog(false);
    setAliasValue('');
  };

  const handleCancelAlias = () => {
    setShowAliasDialog(false);
    setAliasValue('');
  };

  return (
    <View style={styles.container} testID="ocr-suggestion-card">
      {/* Receipt Thumbnail with AI Badge */}
      {receiptUrl && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: receiptUrl }}
            style={styles.receiptImage}
            resizeMode="cover"
            testID="ocr-receipt-thumbnail"
          />
          <View style={styles.aiBadge} testID="ocr-ai-badge">
            <Ionicons name="sparkles" size={14} color={COLORS.textWhite} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
      )}

      {/* Content Section */}
      <View style={styles.content}>
        {/* Header: AI Suggestions */}
        <View style={styles.header}>
          <Ionicons name="bulb" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>{t('components.ocrSuggestion.aiDetected')}</Text>
        </View>

        {/* Amount with Currency */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('components.ocrSuggestion.amount')}</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(amount, detectedCurrency || currency)}
          </Text>
        </View>

        {/* Currency Detection Info */}
        {currencyDetected ? (
          <View style={[styles.noteRow, currencyConfidence >= 0.9 ? styles.successNoteRow : styles.warningNoteRow]}>
            <Ionicons
              name={currencyConfidence >= 0.9 ? 'checkmark-circle' : 'alert-circle'}
              size={14}
              color={currencyConfidence >= 0.9 ? COLORS.success : COLORS.warning}
            />
            <Text style={styles.noteText}>
              {currencyConfidence >= 0.9
                ? t('components.ocrSuggestion.currencyDetected', { currency: detectedCurrency })
                : t('components.ocrSuggestion.currencyUncertain', { currency: detectedCurrency })}
            </Text>
          </View>
        ) : (
          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.noteText}>
              {t('components.ocrSuggestion.currencyDefault', { currency })}
            </Text>
          </View>
        )}

        {/* Merchant with alias button */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('components.ocrSuggestion.merchant')}</Text>
          <View style={styles.merchantContainer}>
            <Text style={styles.detailValue}>
              {merchant || t('components.ocrSuggestion.unknownMerchant')}
            </Text>
            <TouchableOpacity
              onPress={handleOpenAliasDialog}
              style={styles.aliasButton}
              testID="ocr-alias-button"
              accessibilityLabel={t('components.ocrSuggestion.createAliasTitle')}
            >
              <Ionicons name="pencil" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('components.ocrSuggestion.date')}</Text>
          <Text style={styles.detailValue}>{date}</Text>
        </View>

        {/* Category with confidence */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={styles.detailLabel}>{t('components.ocrSuggestion.category')}</Text>
            <View style={styles.confidenceContainer}>
              <Ionicons
                name={isHighConfidence ? 'checkmark-circle' : 'information-circle'}
                size={16}
                color={isHighConfidence ? COLORS.success : COLORS.warning}
              />
              <Text
                style={[
                  styles.confidenceText,
                  isHighConfidence && styles.highConfidenceText,
                ]}
                testID="ocr-confidence-percentage"
              >
                {confidence > 0 ? `${confidencePercentage}%` : t('components.ocrSuggestion.categorySuggested')}
              </Text>
            </View>
          </View>

          {/* Category chips */}
          <View style={styles.chipsContainer}>
            {allCategories.map((cat, index) => {
              const isSelected = cat.category === selectedCategory;
              // Defensive validation for chip confidence
              const validConfidence = typeof cat.confidence === 'number' && !isNaN(cat.confidence)
                ? cat.confidence
                : 0;
              const catConfidence = Math.round(validConfidence * 100);
              const isHighConf = validConfidence >= 0.80;

              return (
                <TouchableOpacity
                  key={`${cat.category}-${index}`}
                  onPress={() => handleCategorySelect(cat.category)}
                  testID={`category-chip-${cat.category}`}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    isHighConf && styles.chipHighConfidence,
                  ]}
                  selected={isSelected}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {cat.category}
                  </Text>
                  <Text style={styles.chipConfidence}>
                    {validConfidence > 0 ? `${catConfidence}%` : t('components.ocrSuggestion.categorySuggested')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reasoning */}
          {reasoning && (
            <View style={styles.reasoningContainer}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.reasoningText} testID="ocr-reasoning-text">
                {reasoning}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            testID="ocr-dismiss-button"
            accessibilityLabel={t('components.ocrSuggestion.dismiss')}
          >
            <Text style={styles.dismissButtonText}>{t('components.ocrSuggestion.dismiss')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            testID="ocr-accept-button"
            accessibilityLabel={t('components.ocrSuggestion.useTheseDetails')}
          >
            <Ionicons name="checkmark" size={20} color={COLORS.textWhite} />
            <Text style={styles.acceptButtonText}>{t('components.ocrSuggestion.useTheseDetails')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Alias Dialog Modal */}
      <Modal
        visible={showAliasDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelAlias}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aliasDialog} testID="ocr-alias-dialog">
            <Text style={styles.aliasDialogTitle}>{t('components.ocrSuggestion.createAliasTitle')}</Text>
            <Text style={styles.aliasDialogSubtitle}>
              {t('components.ocrSuggestion.createAliasSubtitle', { merchant })}
            </Text>

            <TextInput
              style={styles.aliasInput}
              placeholder="e.g., WFM"
              value={aliasValue}
              onChangeText={setAliasValue}
              maxLength={20}
              testID="ocr-alias-input"
              autoFocus
            />

            <View style={styles.aliasDialogButtons}>
              <TouchableOpacity
                style={styles.aliasDialogCancelButton}
                onPress={handleCancelAlias}
                testID="ocr-alias-cancel-button"
              >
                <Text style={styles.aliasDialogCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aliasDialogSaveButton}
                onPress={handleSaveAlias}
                testID="ocr-alias-save-button"
                disabled={!aliasValue.trim()}
              >
                <Text style={styles.aliasDialogSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.medium,
    ...SHADOWS.card,
    marginBottom: SPACING.base,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  aiBadge: {
    position: 'absolute',
    top: SPACING.base,
    right: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.tiny,
    borderRadius: SIZES.borderRadius.small,
    gap: SPACING.tiny,
  },
  aiBadgeText: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.bold,
  },
  content: {
    padding: SPACING.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.base,
    gap: SPACING.small,
  },
  headerTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  detailLabel: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.small,
    borderRadius: SIZES.borderRadius.small,
    marginBottom: SPACING.medium,
    gap: SPACING.tiny,
  },
  successNoteRow: {
    backgroundColor: COLORS.success + '15', // 15% opacity green
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  warningNoteRow: {
    backgroundColor: COLORS.warning + '15', // 15% opacity amber
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  noteText: {
    flex: 1,
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  detailValue: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
  amountValue: {
    fontSize: FONTS.sizes.title,
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  merchantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  aliasButton: {
    padding: SPACING.tiny,
  },
  categorySection: {
    marginTop: SPACING.small,
    marginBottom: SPACING.base,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tiny,
  },
  confidenceText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.warning,
    fontWeight: FONTS.weights.semibold,
  },
  highConfidenceText: {
    color: COLORS.success,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.small,
    marginBottom: SPACING.small,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    borderRadius: SIZES.borderRadius.round,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.tiny,
  },
  chipSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  chipHighConfidence: {
    backgroundColor: '#e8f5e9',
    borderColor: COLORS.success + '60',
  },
  chipText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  chipConfidence: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
  },
  reasoningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.small,
    borderRadius: SIZES.borderRadius.small,
    gap: SPACING.tiny,
    marginTop: SPACING.tiny,
  },
  reasoningText: {
    flex: 1,
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.medium,
    marginTop: SPACING.base,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.base,
    borderRadius: SIZES.borderRadius.medium,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.small,
  },
  acceptButtonText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.semibold,
  },
  // Alias Dialog Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  aliasDialog: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.xlarge,
    width: '90%',
    maxWidth: 400,
  },
  aliasDialogTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  aliasDialogSubtitle: {
    fontSize: FONTS.sizes.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.base,
  },
  aliasInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius.medium,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.base,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    marginBottom: SPACING.base,
  },
  aliasDialogButtons: {
    flexDirection: 'row',
    gap: SPACING.medium,
  },
  aliasDialogCancelButton: {
    flex: 1,
    paddingVertical: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  aliasDialogCancelText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
  aliasDialogSaveButton: {
    flex: 1,
    paddingVertical: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  aliasDialogSaveText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.semibold,
  },
});
