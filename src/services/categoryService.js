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
        isDefault: true,
        createdAt: new Date(),
      };

      return setDoc(doc(categoriesRef, `${coupleId}_${key}`), categoryDoc);
    });

    await Promise.all(promises);
    console.log('✅ Default categories initialized for couple:', coupleId);
  } catch (error) {
    console.error('Error initializing categories:', error);
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
    console.error('Error getting categories:', error);
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
    console.error('Error in category subscription:', error);
  });
};

/**
 * Add a custom category
 */
export const addCustomCategory = async (coupleId, { name, icon, defaultBudget }) => {
  try {
    // Generate unique key from name
    const key = generateCategoryKey(name);

    // Check if category with this key already exists
    const categoriesRef = collection(db, 'categories');
    const existingDoc = await getDoc(doc(categoriesRef, `${coupleId}_${key}`));

    if (existingDoc.exists()) {
      throw new Error('A category with a similar name already exists');
    }

    // Create new category
    const categoryDoc = {
      coupleId,
      key,
      name,
      icon,
      defaultBudget: parseFloat(defaultBudget) || 0,
      isDefault: false,
      createdAt: new Date(),
    };

    await setDoc(doc(categoriesRef, `${coupleId}_${key}`), categoryDoc);

    console.log('✅ Custom category added:', name);
    return { success: true, key };
  } catch (error) {
    console.error('Error adding custom category:', error);
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

    await setDoc(categoryDocRef, {
      ...categoryDoc.data(),
      ...allowedUpdates,
      updatedAt: new Date(),
    });

    console.log('✅ Category updated:', key);
    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
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

    // Check if any expenses use this category
    if (expenseService) {
      const expenses = await expenseService.getExpenses(coupleId);
      const expensesWithCategory = expenses.filter(exp => exp.categoryKey === key);

      if (expensesWithCategory.length > 0) {
        throw new Error(
          `Cannot delete "${categoryData.name}" because it has ${expensesWithCategory.length} expense${expensesWithCategory.length !== 1 ? 's' : ''}. Please delete or reassign those expenses first.`
        );
      }
    }

    await deleteDoc(categoryDocRef);

    console.log('✅ Category deleted:', key);
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

/**
 * Reset categories to defaults
 * Keeps custom categories that have expenses
 */
export const resetToDefaultCategories = async (coupleId, expenseService) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('coupleId', '==', coupleId));
    const snapshot = await getDocs(q);

    // Get all expenses to check which custom categories are in use
    let expenses = [];
    if (expenseService) {
      expenses = await expenseService.getExpenses(coupleId);
    }

    const deletePromises = [];
    const customCategoriesWithExpenses = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // If it's a custom category
      if (!data.isDefault) {
        const hasExpenses = expenses.some(exp => exp.categoryKey === data.key);

        if (hasExpenses) {
          // Keep it
          customCategoriesWithExpenses.push(data.key);
        } else {
          // Delete it
          deletePromises.push(deleteDoc(doc.ref));
        }
      }
    });

    // Delete custom categories without expenses
    await Promise.all(deletePromises);

    // Re-initialize defaults (will skip if they already exist)
    await initializeCategoriesForCouple(coupleId);

    console.log('✅ Categories reset to defaults');
    if (customCategoriesWithExpenses.length > 0) {
      console.log('ℹ️ Kept custom categories with expenses:', customCategoriesWithExpenses);
    }

    return {
      success: true,
      keptCategories: customCategoriesWithExpenses
    };
  } catch (error) {
    console.error('Error resetting categories:', error);
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
    console.error('Error getting category count:', error);
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
    console.error('Error checking category existence:', error);
    return false;
  }
};
