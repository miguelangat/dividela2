// src/services/categoryService.js
// Service for managing expense categories

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
  getCountFromServer,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_CATEGORIES, generateCategoryKey } from '../constants/defaultCategories';

/**
 * Initialize default categories for a couple
 * Called when a couple is first created
 */
export const initializeCategoriesForCouple = async (coupleId) => {
  try {
    const categoriesRef = collection(db, 'categories');

    // Create a document for each default category
    const promises = Object.entries(DEFAULT_CATEGORIES).map(([key, category]) => {
      const categoryDoc = {
        coupleId,
        key,
        name: category.name,
        icon: category.icon,
        defaultBudget: category.defaultBudget,
        frequency: category.frequency || 'monthly', // 'monthly', 'annual', or 'both'
        annualBudget: category.annualBudget || category.defaultBudget * 12,
        isDefault: true,
        createdAt: new Date(),
      };

      return setDoc(doc(categoriesRef, `${coupleId}_${key}`), categoryDoc);
    });

    await Promise.all(promises);
    if (__DEV__) console.log('✅ Default categories initialized for couple:', coupleId);
  } catch (error) {
    if (__DEV__) console.error('Error initializing categories:', error);
    throw error;
  }
};

/**
 * Get all categories for a couple
 * Returns both default and custom categories
 */
export const getCategoriesForCouple = async (coupleId) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('coupleId', '==', coupleId));
    const snapshot = await getDocs(q);

    const categories = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      categories[data.key] = {
        id: doc.id,
        ...data,
      };
    });

    // If no categories exist, initialize defaults
    if (Object.keys(categories).length === 0) {
      await initializeCategoriesForCouple(coupleId);
      return getCategoriesForCouple(coupleId); // Recursive call to get initialized categories
    }

    return categories;
  } catch (error) {
    if (__DEV__) console.error('Error getting categories:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time category updates
 */
export const subscribeToCategoriesForCouple = (coupleId, callback) => {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, where('coupleId', '==', coupleId));

  return onSnapshot(q, (snapshot) => {
    const categories = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      categories[data.key] = {
        id: doc.id,
        ...data,
      };
    });

    callback(categories);
  }, (error) => {
    if (__DEV__) console.error('Error in category subscription:', error);
  });
};

/**
 * Add a custom category
 */
export const addCustomCategory = async (coupleId, { name, icon, defaultBudget, frequency = 'monthly', annualBudget }) => {
  try {
    // Generate unique key from name
    const key = generateCategoryKey(name);

    // Check if category with this key already exists
    const categoriesRef = collection(db, 'categories');
    const existingDoc = await getDoc(doc(categoriesRef, `${coupleId}_${key}`));

    if (existingDoc.exists()) {
      throw new Error('A category with a similar name already exists');
    }

    const monthlyBudget = parseFloat(defaultBudget) || 0;

    // Create new category
    const categoryDoc = {
      coupleId,
      key,
      name,
      icon,
      defaultBudget: monthlyBudget,
      frequency, // 'monthly', 'annual', or 'both'
      annualBudget: annualBudget || (frequency === 'annual' ? monthlyBudget : monthlyBudget * 12),
      isDefault: false,
      createdAt: new Date(),
    };

    await setDoc(doc(categoriesRef, `${coupleId}_${key}`), categoryDoc);

    if (__DEV__) console.log('✅ Custom category added:', name);
    return { success: true, key };
  } catch (error) {
    if (__DEV__) console.error('Error adding custom category:', error);
    throw error;
  }
};

/**
 * Update a category
 * Can update name, icon, and defaultBudget
 */
export const updateCategory = async (coupleId, key, updates) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const categoryDocRef = doc(categoriesRef, `${coupleId}_${key}`);

    const categoryDoc = await getDoc(categoryDocRef);
    if (!categoryDoc.exists()) {
      throw new Error('Category not found');
    }

    const allowedUpdates = {};
    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.icon !== undefined) allowedUpdates.icon = updates.icon;
    if (updates.defaultBudget !== undefined) {
      allowedUpdates.defaultBudget = parseFloat(updates.defaultBudget) || 0;
    }
    if (updates.frequency !== undefined) allowedUpdates.frequency = updates.frequency;
    if (updates.annualBudget !== undefined) {
      allowedUpdates.annualBudget = parseFloat(updates.annualBudget) || 0;
    }

    await setDoc(categoryDocRef, {
      ...categoryDoc.data(),
      ...allowedUpdates,
      updatedAt: new Date(),
    });

    if (__DEV__) console.log('✅ Category updated:', key);
    return { success: true };
  } catch (error) {
    if (__DEV__) console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Check if any expenses use a specific category
 * Uses efficient Firestore query instead of fetching all expenses
 */
export const hasExpensesWithCategory = async (coupleId, categoryKey) => {
  try {
    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef,
      where('coupleId', '==', coupleId),
      where('categoryKey', '==', categoryKey),
      limit(1) // We only need to know if at least one exists
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    if (__DEV__) console.error('Error checking expenses for category:', error);
    return false;
  }
};

/**
 * Count expenses that use a specific category
 * Uses Firestore aggregation for efficiency
 */
export const countExpensesWithCategory = async (coupleId, categoryKey) => {
  try {
    const expensesRef = collection(db, 'expenses');
    const q = query(
      expensesRef,
      where('coupleId', '==', coupleId),
      where('categoryKey', '==', categoryKey)
    );

    const countSnapshot = await getCountFromServer(q);
    return countSnapshot.data().count;
  } catch (error) {
    if (__DEV__) console.error('Error counting expenses for category:', error);
    // Fallback: if count aggregation fails, do a regular query
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
};

/**
 * Delete a custom category
 * Only custom categories can be deleted (not default ones)
 * Validates that no expenses use this category
 */
export const deleteCategory = async (coupleId, key, expenseService) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const categoryDocRef = doc(categoriesRef, `${coupleId}_${key}`);

    const categoryDoc = await getDoc(categoryDocRef);
    if (!categoryDoc.exists()) {
      throw new Error('Category not found');
    }

    const categoryData = categoryDoc.data();

    // Prevent deletion of default categories
    if (categoryData.isDefault) {
      throw new Error('Cannot delete default categories');
    }

    // Check if any expenses use this category using efficient Firestore query
    // PERFORMANCE FIX: Use direct query instead of fetching all expenses
    const expenseCount = await countExpensesWithCategory(coupleId, key);

    if (expenseCount > 0) {
      throw new Error(
        `Cannot delete "${categoryData.name}" because it has ${expenseCount} expense${expenseCount !== 1 ? 's' : ''}. Please delete or reassign those expenses first.`
      );
    }

    await deleteDoc(categoryDocRef);

    if (__DEV__) console.log('✅ Category deleted:', key);
    return { success: true };
  } catch (error) {
    if (__DEV__) console.error('Error deleting category:', error);
    throw error;
  }
};

/**
 * Reset categories to defaults
 * Keeps custom categories that have expenses
 * PERFORMANCE FIX: Uses efficient per-category queries instead of fetching all expenses
 */
export const resetToDefaultCategories = async (coupleId, expenseService) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('coupleId', '==', coupleId));
    const snapshot = await getDocs(q);

    const deletePromises = [];
    const customCategoriesWithExpenses = [];
    const checkPromises = [];

    // Collect custom categories to check
    const customCategories = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isDefault) {
        customCategories.push({ doc, data });
      }
    });

    // Check each custom category for expenses in parallel (more efficient than fetching all expenses)
    for (const { doc: catDoc, data } of customCategories) {
      checkPromises.push(
        hasExpensesWithCategory(coupleId, data.key).then(hasExp => ({
          doc: catDoc,
          data,
          hasExpenses: hasExp
        }))
      );
    }

    const results = await Promise.all(checkPromises);

    for (const { doc: catDoc, data, hasExpenses } of results) {
      if (hasExpenses) {
        // Keep it
        customCategoriesWithExpenses.push(data.key);
      } else {
        // Delete it
        deletePromises.push(deleteDoc(catDoc.ref));
      }
    }

    // Delete custom categories without expenses
    await Promise.all(deletePromises);

    // Re-initialize defaults (will skip if they already exist)
    await initializeCategoriesForCouple(coupleId);

    if (__DEV__) {
      console.log('✅ Categories reset to defaults');
      if (customCategoriesWithExpenses.length > 0) {
        console.log('ℹ️ Kept custom categories with expenses:', customCategoriesWithExpenses);
      }
    }

    return {
      success: true,
      keptCategories: customCategoriesWithExpenses
    };
  } catch (error) {
    if (__DEV__) console.error('Error resetting categories:', error);
    throw error;
  }
};

/**
 * Get category count for a couple
 */
export const getCategoryCount = async (coupleId) => {
  try {
    const categories = await getCategoriesForCouple(coupleId);
    return Object.keys(categories).length;
  } catch (error) {
    if (__DEV__) console.error('Error getting category count:', error);
    return 0;
  }
};

/**
 * Check if a category key exists for a couple
 */
export const categoryExists = async (coupleId, key) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const categoryDocRef = doc(categoriesRef, `${coupleId}_${key}`);
    const categoryDoc = await getDoc(categoryDocRef);
    return categoryDoc.exists();
  } catch (error) {
    if (__DEV__) console.error('Error checking category existence:', error);
    return false;
  }
};

/**
 * Get categories filtered by frequency
 *
 * @param {string} coupleId - The couple ID
 * @param {string} frequency - Filter by 'monthly', 'annual', or 'both'
 * @returns {Object} Filtered categories
 */
export const getCategoriesByFrequency = async (coupleId, frequency) => {
  try {
    const allCategories = await getCategoriesForCouple(coupleId);

    const filtered = {};
    Object.entries(allCategories).forEach(([key, category]) => {
      if (category.frequency === frequency || category.frequency === 'both') {
        filtered[key] = category;
      }
    });

    return filtered;
  } catch (error) {
    if (__DEV__) console.error('Error getting categories by frequency:', error);
    throw error;
  }
};

/**
 * Get annual-only categories
 */
export const getAnnualCategories = async (coupleId) => {
  return getCategoriesByFrequency(coupleId, 'annual');
};

/**
 * Get monthly categories (including 'both')
 */
export const getMonthlyCategories = async (coupleId) => {
  try {
    const allCategories = await getCategoriesForCouple(coupleId);

    const filtered = {};
    Object.entries(allCategories).forEach(([key, category]) => {
      if (category.frequency === 'monthly' || category.frequency === 'both') {
        filtered[key] = category;
      }
    });

    return filtered;
  } catch (error) {
    if (__DEV__) console.error('Error getting monthly categories:', error);
    throw error;
  }
};
