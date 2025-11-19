// src/contexts/BudgetContext.js
// Context for managing budget and category state

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as categoryService from '../services/categoryService';
import * as budgetService from '../services/budgetService';
import * as expenseService from '../services/expenseService';

const BudgetContext = createContext({});

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

export const BudgetProvider = ({ children }) => {
  const { userDetails } = useAuth();

  const [categories, setCategories] = useState({});
  const [currentBudget, setCurrentBudget] = useState(null);
  const [budgetProgress, setBudgetProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use activeAccountId instead of coupleId for multi-account support
  const coupleId = userDetails?.activeAccountId;

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!coupleId) {
      setCategories({});
      return;
    }

    try {
      setError(null);
      const loadedCategories = await categoryService.getCategoriesForCouple(coupleId);
      setCategories(loadedCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err.message);
    }
  }, [coupleId]);

  // Load current month's budget
  const loadCurrentBudget = useCallback(async () => {
    if (!coupleId || Object.keys(categories).length === 0) {
      setCurrentBudget(null);
      return;
    }

    try {
      setError(null);
      const budget = await budgetService.getCurrentMonthBudget(coupleId, categories);
      setCurrentBudget(budget);
    } catch (err) {
      console.error('Error loading budget:', err);
      setError(err.message);
    }
  }, [coupleId, categories]);

  // Calculate budget progress
  const calculateProgress = useCallback((expenses) => {
    if (!currentBudget || !expenses) {
      setBudgetProgress(null);
      return;
    }

    try {
      const progress = budgetService.calculateBudgetProgress(currentBudget, expenses);
      setBudgetProgress(progress);
    } catch (err) {
      console.error('Error calculating progress:', err);
      setError(err.message);
    }
  }, [currentBudget]);

  // Initialize on mount and when coupleId changes
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadCategories();
      setLoading(false);
    };

    initialize();
  }, [loadCategories]);

  // Load budget when categories are loaded
  useEffect(() => {
    if (Object.keys(categories).length > 0) {
      loadCurrentBudget();
    }
  }, [categories, loadCurrentBudget]);

  // Subscribe to real-time category updates
  useEffect(() => {
    if (!coupleId) return;

    const unsubscribe = categoryService.subscribeToCategoriesForCouple(
      coupleId,
      (updatedCategories) => {
        setCategories(updatedCategories);
      }
    );

    return () => unsubscribe();
  }, [coupleId]);

  // Subscribe to real-time budget updates
  useEffect(() => {
    if (!coupleId) return;

    const unsubscribe = budgetService.subscribeToCurrentMonthBudget(
      coupleId,
      (updatedBudget) => {
        setCurrentBudget(updatedBudget);
      }
    );

    return () => unsubscribe();
  }, [coupleId]);

  // Subscribe to real-time expense updates and auto-calculate budget progress
  useEffect(() => {
    if (!coupleId) {
      setBudgetProgress(null);
      return;
    }

    const unsubscribe = expenseService.subscribeToExpenses(
      coupleId,
      (updatedExpenses) => {
        // Auto-calculate progress whenever expenses change
        if (currentBudget && updatedExpenses) {
          try {
            const progress = budgetService.calculateBudgetProgress(
              currentBudget,
              updatedExpenses
            );
            setBudgetProgress(progress);
          } catch (err) {
            console.error('Error calculating budget progress:', err);
          }
        } else {
          setBudgetProgress(null);
        }
      }
    );

    return () => unsubscribe();
  }, [coupleId, currentBudget]);

  // Category management functions
  const addCategory = async (categoryData) => {
    try {
      setError(null);
      const result = await categoryService.addCustomCategory(coupleId, categoryData);
      await loadCategories(); // Reload to get fresh data
      return result;
    } catch (err) {
      console.error('Error adding category:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateCategory = async (key, updates) => {
    try {
      setError(null);
      const result = await categoryService.updateCategory(coupleId, key, updates);
      await loadCategories(); // Reload to get fresh data
      return result;
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteCategory = async (key, expenseService) => {
    try {
      setError(null);
      const result = await categoryService.deleteCategory(coupleId, key, expenseService);
      await loadCategories(); // Reload to get fresh data
      return result;
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err.message);
      throw err;
    }
  };

  const resetCategories = async (expenseService) => {
    try {
      setError(null);
      const result = await categoryService.resetToDefaultCategories(coupleId, expenseService);
      await loadCategories(); // Reload to get fresh data
      return result;
    } catch (err) {
      console.error('Error resetting categories:', err);
      setError(err.message);
      throw err;
    }
  };

  // Budget management functions
  const saveBudget = async (categoryBudgets, options) => {
    try {
      setError(null);
      const { month, year } = getCurrentMonthYear();
      const result = await budgetService.saveBudget(
        coupleId,
        month,
        year,
        categoryBudgets,
        options
      );
      await loadCurrentBudget(); // Reload to get fresh data
      return result;
    } catch (err) {
      console.error('Error saving budget:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateBudgetSettings = async (settings) => {
    try {
      setError(null);
      const { month, year } = getCurrentMonthYear();
      const result = await budgetService.updateBudgetSettings(
        coupleId,
        month,
        year,
        settings
      );
      await loadCurrentBudget(); // Reload to get fresh data
      return result;
    } catch (err) {
      console.error('Error updating budget settings:', err);
      setError(err.message);
      throw err;
    }
  };

  const calculateSavings = (expenses) => {
    if (!currentBudget || !expenses) {
      return {
        savings: 0,
        overage: 0,
        splitAmount: 0,
        categoryBreakdown: {},
      };
    }

    return budgetService.calculateBudgetSavings(currentBudget, expenses);
  };

  // Helper function to get current month/year
  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  };

  const value = {
    // State
    categories,
    currentBudget,
    budgetProgress,
    loading,
    error,

    // Category functions
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategories,
    loadCategories,

    // Budget functions
    saveBudget,
    updateBudgetSettings,
    calculateProgress,
    calculateSavings,
    loadCurrentBudget,

    // Computed values
    isBudgetEnabled: currentBudget?.enabled !== false,
    shouldIncludeSavings: currentBudget?.includeSavings !== false,
    totalBudget: budgetService.getTotalBudget(currentBudget),
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
};
