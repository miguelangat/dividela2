// src/components/MerchantAliasManager.js
// Component for managing merchant aliases (view, create, edit, delete)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as merchantAliasService from '../services/merchantAliasService';
import { COLORS, FONTS, SPACING } from '../constants/theme';

export default function MerchantAliasManager({ coupleId, onClose }) {
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingAlias, setEditingAlias] = useState(null);
  const [formData, setFormData] = useState({ ocrMerchant: '', userAlias: '' });

  // Load aliases on mount
  useEffect(() => {
    if (coupleId) {
      loadAliases();
    } else {
      setLoading(false);
    }
  }, [coupleId]);

  const loadAliases = async () => {
    try {
      setLoading(true);
      const data = await merchantAliasService.getMerchantAliases(coupleId);
      setAliases(data);
    } catch (error) {
      console.error('Error loading aliases:', error);
      Alert.alert('Error', 'Failed to load merchant aliases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingAlias(null);
    setFormData({ ocrMerchant: '', userAlias: '' });
    setDialogVisible(true);
  };

  const handleEdit = (alias) => {
    setEditingAlias(alias);
    setFormData({ ocrMerchant: alias.ocrMerchant, userAlias: alias.userAlias });
    setDialogVisible(true);
  };

  const handleDelete = (alias) => {
    Alert.alert(
      'Delete Alias',
      `Are you sure you want to delete the alias for "${alias.ocrMerchant}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await merchantAliasService.deleteMerchantAlias(alias.id, coupleId);
              await loadAliases();
            } catch (error) {
              console.error('Error deleting alias:', error);
              Alert.alert('Error', 'Failed to delete alias. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // Validate inputs
    if (!formData.ocrMerchant.trim() || !formData.userAlias.trim()) {
      Alert.alert('Validation Error', 'Please fill in both fields');
      return;
    }

    try {
      await merchantAliasService.createMerchantAlias(
        formData.ocrMerchant,
        formData.userAlias,
        coupleId
      );
      // Close dialog and reset form immediately after successful save
      setDialogVisible(false);
      setFormData({ ocrMerchant: '', userAlias: '' });
      // Reload aliases in background
      loadAliases().catch((err) => {
        console.error('Error reloading aliases:', err);
      });
    } catch (error) {
      console.error('Error saving alias:', error);
      Alert.alert('Error', error.message || 'Failed to save alias. Please try again.');
    }
  };

  const handleCancel = () => {
    setDialogVisible(false);
    setFormData({ ocrMerchant: '', userAlias: '' });
    setEditingAlias(null);
  };

  // Filter aliases based on search term
  const filteredAliases = aliases.filter((alias) => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      alias.ocrMerchant.toLowerCase().includes(search) ||
      alias.userAlias.toLowerCase().includes(search)
    );
  });

  // Show error if no couple ID
  if (!coupleId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Merchant Aliases</Text>
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No couple ID provided</Text>
        </View>
      </View>
    );
  }

  const renderAliasItem = ({ item }) => (
    <View style={styles.aliasItem}>
      <View style={styles.aliasContent}>
        <View style={styles.aliasNames}>
          <Text
            style={styles.ocrMerchant}
            numberOfLines={1}
            ellipsizeMode="tail"
            testID={`ocr-merchant-text-${item.id}`}
          >
            {item.ocrMerchant}
          </Text>
          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-forward" size={16} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.userAlias} numberOfLines={1} ellipsizeMode="tail">
            {item.userAlias}
          </Text>
        </View>
        <View style={styles.usageBadge}>
          <Text style={styles.usageCount} testID="usage-count">
            {String(item.usageCount)}
          </Text>
        </View>
      </View>
      <View style={styles.aliasActions}>
        <TouchableOpacity
          onPress={() => handleEdit(item)}
          style={styles.actionButton}
          accessibilityLabel="Edit alias"
        >
          <Ionicons name="pencil" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.actionButton}
          accessibilityLabel="Delete alias"
        >
          <Ionicons name="trash" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => {
    if (searchTerm.trim() && filteredAliases.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔍</Text>
          <Text style={styles.emptyStateText}>No matching aliases</Text>
        </View>
      );
    }

    if (aliases.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🏪</Text>
          <Text style={styles.emptyStateText}>No aliases yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create aliases to normalize merchant names
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Merchant Aliases</Text>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer} testID="loading-indicator">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading aliases...</Text>
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={COLORS.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search aliases..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>

          {/* Add New Button */}
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <Ionicons name="add" size={20} color={COLORS.background} />
            <Text style={styles.addButtonText}>Add New</Text>
          </TouchableOpacity>

          {/* Aliases List */}
          <FlatList
            data={filteredAliases}
            renderItem={renderAliasItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Create/Edit Dialog */}
      <Modal
        visible={dialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingAlias ? 'Edit Merchant Alias' : 'Create Merchant Alias'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Original Merchant Name (from OCR)</Text>
              <TextInput
                style={styles.input}
                placeholder="OCR Merchant Name"
                value={formData.ocrMerchant}
                onChangeText={(text) => setFormData({ ...formData, ocrMerchant: text })}
                placeholderTextColor={COLORS.textSecondary}
                editable={!editingAlias}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Alias</Text>
              <TextInput
                style={styles.input}
                placeholder="Your Alias"
                value={formData.userAlias}
                onChangeText={(text) => setFormData({ ...formData, userAlias: text })}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
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
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E5E5',
  },
  title: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.small,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.base,
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.large,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: SPACING.base,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.base,
    height: 48,
  },
  searchIcon: {
    marginRight: SPACING.small,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.base,
    marginHorizontal: SPACING.base,
    marginTop: SPACING.base,
    gap: SPACING.small,
  },
  addButtonText: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.base,
    flexGrow: 1,
  },
  aliasItem: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  aliasContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  aliasNames: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrMerchant: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  arrowContainer: {
    marginHorizontal: SPACING.small,
  },
  userAlias: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  usageBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingHorizontal: SPACING.small,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageCount: {
    ...FONTS.small,
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 12,
  },
  aliasActions: {
    flexDirection: 'row',
    gap: SPACING.base,
  },
  actionButton: {
    padding: SPACING.small,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxlarge * 2,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: SPACING.base,
    opacity: 0.5,
  },
  emptyStateText: {
    ...FONTS.title,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  emptyStateSubtext: {
    ...FONTS.body,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.base,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: SPACING.large,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: SPACING.large,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: SPACING.base,
  },
  label: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  input: {
    ...FONTS.body,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E5E5',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.base,
    marginTop: SPACING.large,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: SPACING.base,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.base,
    alignItems: 'center',
  },
  saveButtonText: {
    ...FONTS.body,
    color: COLORS.background,
    fontWeight: '600',
  },
});
