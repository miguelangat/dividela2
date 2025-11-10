// src/components/CategoryModal.js
// Modal for adding or editing expense categories

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import EmojiPicker from 'rn-emoji-keyboard';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../constants/theme';

export default function CategoryModal({
  visible,
  onClose,
  onSave,
  editingCategory = null, // { key, name, icon, defaultBudget }
  mode = 'add', // 'add' or 'edit'
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [defaultBudget, setDefaultBudget] = useState('100');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingCategory && mode === 'edit') {
      setName(editingCategory.name || '');
      setIcon(editingCategory.icon || '');
      setDefaultBudget(String(editingCategory.defaultBudget || 100));
    } else {
      // Reset for add mode
      setName('');
      setIcon('');
      setDefaultBudget('100');
    }
    setErrors({});
  }, [editingCategory, mode, visible]);

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (name.trim().length > 30) {
      newErrors.name = 'Name must be 30 characters or less';
    }

    if (!icon.trim()) {
      newErrors.icon = 'Icon is required';
    }

    const budgetNum = parseFloat(defaultBudget);
    if (isNaN(budgetNum) || budgetNum < 0) {
      newErrors.defaultBudget = 'Budget must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      const categoryData = {
        name: name.trim(),
        icon: icon.trim(),
        defaultBudget: parseFloat(defaultBudget) || 0,
      };

      await onSave(categoryData);
      handleClose();
    } catch (error) {
      console.error('Error saving category:', error);
      setErrors({ general: error.message || 'Failed to save category' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setIcon('');
    setDefaultBudget('100');
    setErrors({});
    onClose();
  };

  const handleEmojiSelect = (emojiObject) => {
    setIcon(emojiObject.emoji);
    setIsEmojiPickerOpen(false);
    // Clear icon error if it exists
    if (errors.icon) {
      setErrors({ ...errors, icon: undefined });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Text style={styles.modalTitle}>
              {mode === 'edit' ? 'Edit Category' : 'Add Custom Category'}
            </Text>

            {/* Category Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g., Health & Fitness"
                value={name}
                onChangeText={setName}
                maxLength={30}
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Icon (Emoji) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Icon (emoji)</Text>
              <TouchableOpacity
                style={[
                  styles.emojiButton,
                  errors.icon && styles.inputError,
                ]}
                onPress={() => setIsEmojiPickerOpen(true)}
                activeOpacity={0.7}
              >
                {icon ? (
                  <Text style={styles.emojiButtonIcon}>{icon}</Text>
                ) : (
                  <Text style={styles.emojiButtonPlaceholder}>Tap to select emoji</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.hint}>
                Tap to choose an emoji to represent this category
              </Text>
              {errors.icon && <Text style={styles.errorText}>{errors.icon}</Text>}
            </View>

            {/* Default Budget */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Default Budget</Text>
              <View style={styles.budgetInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={[styles.input, styles.budgetInput, errors.defaultBudget && styles.inputError]}
                  placeholder="0"
                  value={defaultBudget}
                  onChangeText={setDefaultBudget}
                  keyboardType="numeric"
                />
              </View>
              {errors.defaultBudget && (
                <Text style={styles.errorText}>{errors.defaultBudget}</Text>
              )}
            </View>

            {/* General Error */}
            {errors.general && (
              <View style={styles.generalErrorContainer}>
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textWhite} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Emoji Picker */}
      <EmojiPicker
        onEmojiSelected={handleEmojiSelect}
        open={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screenPadding,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.borderRadius.large,
    padding: SPACING.xlarge,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: FONTS.sizes.heading,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.large,
  },
  formGroup: {
    marginBottom: SPACING.large,
  },
  label: {
    fontSize: FONTS.sizes.small,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginBottom: SPACING.small,
  },
  input: {
    ...COMMON_STYLES.input,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  emojiButton: {
    ...COMMON_STYLES.input,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  emojiButtonIcon: {
    fontSize: 32,
  },
  emojiButtonPlaceholder: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  hint: {
    fontSize: FONTS.sizes.tiny,
    color: COLORS.textSecondary,
    marginTop: SPACING.tiny,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  budgetInput: {
    flex: 1,
  },
  errorText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.error,
    marginTop: SPACING.tiny,
  },
  generalErrorContainer: {
    backgroundColor: COLORS.error + '15',
    padding: SPACING.medium,
    borderRadius: SIZES.borderRadius.medium,
    marginBottom: SPACING.large,
  },
  generalErrorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.small,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.medium,
    marginTop: SPACING.large,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: SIZES.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    ...COMMON_STYLES.secondaryButton,
  },
  cancelButtonText: {
    ...COMMON_STYLES.secondaryButtonText,
  },
  saveButton: {
    ...COMMON_STYLES.primaryButton,
  },
  saveButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
