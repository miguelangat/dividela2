// src/screens/main/CategoryManagerScreen.js
// Screen for managing expense categories (add, edit, delete)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useBudget } from '../../contexts/BudgetContext';
import { COLORS, FONTS, SPACING, SIZES, COMMON_STYLES } from '../../constants/theme';
import CategoryCard from '../../components/CategoryCard';
import CategoryModal from '../../components/CategoryModal';
import * as expenseService from '../../services/expenseService';
import { useAuth } from '../../contexts/AuthContext';

export default function CategoryManagerScreen({ navigation }) {
  const { t } = useTranslation();
  const { categories, loading, addCategory, updateCategory, deleteCategory, resetCategories } = useBudget();
  const { userDetails } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingCategory, setEditingCategory] = useState(null);
  const [expenseCounts, setExpenseCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  const coupleId = userDetails?.coupleId;

  // Load expense counts for each category
  useEffect(() => {
    const loadExpenseCounts = async () => {
      if (!coupleId) return;

      try {
        setLoadingCounts(true);
        const expenses = await expenseService.getExpenses(coupleId);

        const counts = {};
        expenses.forEach(expense => {
          const categoryKey = expense.categoryKey || expense.category || 'other';
          counts[categoryKey] = (counts[categoryKey] || 0) + 1;
        });

        setExpenseCounts(counts);
      } catch (error) {
        console.error('Error loading expense counts:', error);
      } finally {
        setLoadingCounts(false);
      }
    };

    loadExpenseCounts();
  }, [coupleId, categories]);

  const handleAddCategory = () => {
    setModalMode('add');
    setEditingCategory(null);
    setModalVisible(true);
  };

  const handleEditCategory = (key) => {
    const category = categories[key];
    setModalMode('edit');
    setEditingCategory({ key, ...category });
    setModalVisible(true);
  };

  const handleDeleteCategory = (key) => {
    const category = categories[key];
    const expenseCount = expenseCounts[key] || 0;

    if (expenseCount > 0) {
      Alert.alert(
        t('categoryManager.cannotDeleteTitle'),
        t('categoryManager.cannotDeleteMessage', { name: category.name, count: expenseCount }),
        [{ text: t('common.ok') }]
      );
      return;
    }

    Alert.alert(
      t('categoryManager.deleteTitle'),
      t('categoryManager.deleteMessage', { name: category.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(key, expenseService);
              Alert.alert(t('common.success'), t('categoryManager.deleteSuccess'));
            } catch (error) {
              Alert.alert(t('common.error'), error.message || t('categoryManager.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleResetCategories = () => {
    Alert.alert(
      t('categoryManager.resetTitle'),
      t('categoryManager.resetMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('categoryManager.resetToDefaults').replace('Reset to ', ''),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await resetCategories(expenseService);

              let message = t('categoryManager.resetSuccessMessage');
              if (result.keptCategories && result.keptCategories.length > 0) {
                message += `\n\n${t('categoryManager.resetKeptMessage', { count: result.keptCategories.length })}`;
              }

              Alert.alert(t('common.success'), message);
            } catch (error) {
              Alert.alert(t('common.error'), error.message || t('categoryManager.resetError'));
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      if (modalMode === 'edit' && editingCategory) {
        await updateCategory(editingCategory.key, categoryData);
        Alert.alert(t('common.success'), t('categoryManager.updateSuccess'));
      } else {
        await addCategory(categoryData);
        Alert.alert(t('common.success'), t('categoryManager.addSuccess'));
      }
    } catch (error) {
      throw error; // Let modal handle the error
    }
  };

  if (loading || loadingCounts) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('categoryManager.loading')}</Text>
        </View>
      </View>
    );
  }

  const categoryArray = Object.entries(categories).map(([key, category]) => ({
    key,
    ...category,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('categoryManager.title')}</Text>
          <Text style={styles.subtitle}>
            {t('categoryManager.subtitle')}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddCategory}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('categoryManager.addCustomCategory')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleResetCategories}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>{t('categoryManager.resetToDefaults')}</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesGrid}>
          {categoryArray.map((category) => (
            <CategoryCard
              key={category.key}
              category={category}
              expenseCount={expenseCounts[category.key] || 0}
              showActions={true}
              onEdit={() => handleEditCategory(category.key)}
              onDelete={() => handleDeleteCategory(category.key)}
              style={styles.categoryCard}
            />
          ))}
        </View>

        {categoryArray.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📁</Text>
            <Text style={styles.emptyStateText}>{t('categoryManager.noCategoriesTitle')}</Text>
            <Text style={styles.emptyStateSubtext}>
              {t('categoryManager.noCategoriesText')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Category Modal */}
      <CategoryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveCategory}
        editingCategory={editingCategory}
        mode={modalMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...COMMON_STYLES.container,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.medium,
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.screenPadding,
  },
  header: {
    marginBottom: SPACING.large,
  },
  title: {
    ...COMMON_STYLES.heading,
    marginBottom: SPACING.small,
  },
  subtitle: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.medium,
    marginBottom: SPACING.large,
  },
  primaryButton: {
    flex: 1,
    ...COMMON_STYLES.primaryButton,
  },
  primaryButtonText: {
    ...COMMON_STYLES.primaryButtonText,
  },
  secondaryButton: {
    flex: 1,
    ...COMMON_STYLES.secondaryButton,
  },
  secondaryButtonText: {
    ...COMMON_STYLES.secondaryButtonText,
  },
  categoriesGrid: {
    gap: SPACING.medium,
  },
  categoryCard: {
    marginBottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxlarge * 2,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: SPACING.medium,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small,
  },
  emptyStateSubtext: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textTertiary,
  },
});
