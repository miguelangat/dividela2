// src/components/CurrencyPicker.js
// Currency selection component with searchable dropdown

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SIZES } from '../constants/theme';
import {
  getAllCurrencies,
  getCurrencyInfo,
  DEFAULT_CURRENCY,
} from '../constants/currencies';

export default function CurrencyPicker({
  selectedCurrency = DEFAULT_CURRENCY,
  onSelect,
  label = 'Currency',
  disabled = false,
  style,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currencies = getAllCurrencies();
  const selectedInfo = getCurrencyInfo(selectedCurrency);

  // Filter currencies based on search
  const filteredCurrencies = currencies.filter((currency) => {
    const query = searchQuery.toLowerCase();
    return (
      currency.code.toLowerCase().includes(query) ||
      currency.name.toLowerCase().includes(query) ||
      currency.symbol.includes(query)
    );
  });

  const handleSelect = (currencyCode) => {
    console.log('🔍 CurrencyPicker: handleSelect called with:', currencyCode);
    console.log('🔍 CurrencyPicker: onSelect function:', onSelect);
    console.log('🔍 CurrencyPicker: Calling onSelect callback');
    onSelect(currencyCode);
    console.log('🔍 CurrencyPicker: onSelect callback completed');
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <View style={styles.selectedContent}>
          <Text style={styles.flag}>{selectedInfo.flag}</Text>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedCode}>{selectedInfo.code}</Text>
            <Text style={styles.selectedName}>{selectedInfo.name}</Text>
          </View>
        </View>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? COLORS.textTertiary : COLORS.textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color={COLORS.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search currencies..."
                placeholderTextColor={COLORS.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={Platform.OS !== 'web'}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Currency List */}
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    item.code === selectedCurrency && styles.currencyItemSelected,
                  ]}
                  onPress={() => handleSelect(item.code)}
                >
                  <Text style={styles.currencyFlag}>{item.flag}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{item.code}</Text>
                    <Text style={styles.currencyName}>{item.name}</Text>
                  </View>
                  <Text style={styles.currencySymbol}>{item.symbol}</Text>
                  {item.code === selectedCurrency && (
                    <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={true}
              style={styles.currencyList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No currencies found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.small,
  },
  label: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.tiny,
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    minHeight: 56,
  },
  selectorDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.background,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 32,
    marginRight: SPACING.small,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedCode: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectedName: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.base,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    paddingBottom: SPACING.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 20,
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.small,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.borderRadius.medium,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.base,
    paddingHorizontal: SPACING.base,
  },
  searchIcon: {
    marginRight: SPACING.small,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
    paddingVertical: SPACING.small,
  },
  clearButton: {
    padding: SPACING.tiny,
  },
  currencyList: {
    flex: 1,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  currencyItemSelected: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  currencyFlag: {
    fontSize: 28,
    marginRight: SPACING.small,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  currencyName: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  currencySymbol: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: SPACING.small,
  },
  emptyState: {
    padding: SPACING.xlarge,
    alignItems: 'center',
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
});
