// src/contexts/OnboardingContext.js
// Context for managing budget onboarding state and flow

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  getRecommendedMode,
  calculateSmartBudgets,
  getDefaultBudgets,
  validateBudgetAllocation,
  getOnboardingRecommendations,
  generateBudgetSummary,
  autoBalanceBudget,
  distributeRemainingIncome,
} from '../services/onboardingService';
import { saveBudget } from '../services/budgetService';
import { COMPLEXITY_MODES, ONBOARDING_STEPS } from '../constants/budgetDefaults';

const OnboardingContext = createContext({});

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const { userDetails } = useAuth();

  // Onboarding state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState(null);
  const [budgetStyle, setBudgetStyle] = useState('smart'); // 'smart' or 'fixed' for simple mode
  const [budgetData, setBudgetData] = useState({
    monthlyIncome: 0,
    categoryBudgets: {},
    annualBudgets: [], // For advanced mode: array of 12 monthly budgets
  });
  const [categories, setCategories] = useState([]);
  const [completion, setCompletion] = useState({
    isComplete: false,
    completedAt: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const coupleId = userDetails?.coupleId;

  /**
   * Get current step name based on mode and step index
   */
  const getCurrentStepName = useCallback(() => {
    if (!selectedMode) return 'welcome';
    const steps = ONBOARDING_STEPS[selectedMode] || ONBOARDING_STEPS.simple;
    return steps[currentStep] || 'welcome';
  }, [selectedMode, currentStep]);

  /**
   * Get total number of steps for current mode
   */
  const getTotalSteps = useCallback(() => {
    if (!selectedMode) return ONBOARDING_STEPS.simple.length;
    const steps = ONBOARDING_STEPS[selectedMode] || ONBOARDING_STEPS.simple;
    return steps.length;
  }, [selectedMode]);

  /**
   * Calculate progress percentage
   */
  const getProgress = useCallback(() => {
    const total = getTotalSteps();
    return total > 0 ? ((currentStep + 1) / total) * 100 : 0;
  }, [currentStep, getTotalSteps]);

  /**
   * Set onboarding mode and reset state
   * @param {string} mode - 'none', 'simple', or 'advanced'
   */
  const setMode = useCallback((mode) => {
    setSelectedMode(mode);
    setCurrentStep(0);

    // Initialize budget data based on mode
    const defaults = getDefaultBudgets(mode);
    setBudgetData({
      monthlyIncome: 0,
      categoryBudgets: defaults.categoryBudgets || {},
      annualBudgets: [],
    });

    setError(null);
    console.log(`✅ Onboarding mode set to: ${mode}`);
  }, []);

  /**
   * Move to next step
   */
  const nextStep = useCallback(() => {
    const total = getTotalSteps();
    if (currentStep < total - 1) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    }
  }, [currentStep, getTotalSteps]);

  /**
   * Move to previous step
   */
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  }, [currentStep]);

  /**
   * Jump to specific step
   * @param {number} step - Step index to jump to
   */
  const goToStep = useCallback((step) => {
    const total = getTotalSteps();
    if (step >= 0 && step < total) {
      setCurrentStep(step);
      setError(null);
    }
  }, [getTotalSteps]);

  /**
   * Update budget data
   * @param {object} updates - Partial budget data to update
   */
  const updateBudgetData = useCallback((updates) => {
    setBudgetData(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Update monthly income
   * @param {number} income - Monthly income amount
   */
  const setMonthlyIncome = useCallback((income) => {
    updateBudgetData({ monthlyIncome: income });
  }, [updateBudgetData]);

  /**
   * Update category budgets
   * @param {object} budgets - Category budgets object
   */
  const setCategoryBudgets = useCallback((budgets) => {
    updateBudgetData({ categoryBudgets: budgets });
  }, [updateBudgetData]);

  /**
   * Update a single category budget
   * @param {string} categoryKey - Category key
   * @param {number} amount - Budget amount
   */
  const updateCategoryBudget = useCallback((categoryKey, amount) => {
    setBudgetData(prev => ({
      ...prev,
      categoryBudgets: {
        ...prev.categoryBudgets,
        [categoryKey]: amount,
      },
    }));
  }, []);

  /**
   * Auto-calculate budgets from spending history
   * @param {Array} expenses - Historical expenses
   * @param {string} timeframe - Timeframe to analyze
   */
  const calculateFromHistory = useCallback((expenses, timeframe = '3months') => {
    try {
      const result = calculateSmartBudgets(expenses, timeframe);
      if (result.budgets && Object.keys(result.budgets).length > 0) {
        updateBudgetData({
          categoryBudgets: result.budgets,
          autoCalculated: true,
          confidence: result.confidence,
        });
        return result;
      }
      return null;
    } catch (err) {
      console.error('Error calculating from history:', err);
      setError(err.message);
      return null;
    }
  }, [updateBudgetData]);

  /**
   * Auto-balance budget to match income
   */
  const balanceBudget = useCallback(() => {
    if (!budgetData.monthlyIncome || !budgetData.categoryBudgets) {
      return;
    }

    try {
      const balanced = autoBalanceBudget(
        budgetData.categoryBudgets,
        budgetData.monthlyIncome
      );
      updateBudgetData({ categoryBudgets: balanced });
    } catch (err) {
      console.error('Error balancing budget:', err);
      setError(err.message);
    }
  }, [budgetData, updateBudgetData]);

  /**
   * Distribute remaining income
   * @param {Array} priorityCategories - Categories to prioritize
   */
  const distributeRemaining = useCallback((priorityCategories = ['savings']) => {
    if (!budgetData.monthlyIncome || !budgetData.categoryBudgets) {
      return;
    }

    try {
      const distributed = distributeRemainingIncome(
        budgetData.categoryBudgets,
        budgetData.monthlyIncome,
        priorityCategories
      );
      updateBudgetData({ categoryBudgets: distributed });
    } catch (err) {
      console.error('Error distributing income:', err);
      setError(err.message);
    }
  }, [budgetData, updateBudgetData]);

  /**
   * Validate current budget allocation
   * @returns {object} Validation results
   */
  const validateBudget = useCallback(() => {
    if (!budgetData.monthlyIncome || !budgetData.categoryBudgets) {
      return {
        isValid: false,
        warnings: [],
        errors: [{ message: 'Income and budgets are required' }],
      };
    }

    return validateBudgetAllocation(
      budgetData.categoryBudgets,
      budgetData.monthlyIncome
    );
  }, [budgetData]);

  /**
   * Get budget summary
   * @returns {object} Budget summary with statistics
   */
  const getSummary = useCallback(() => {
    if (!budgetData.monthlyIncome || !budgetData.categoryBudgets) {
      return null;
    }

    return generateBudgetSummary(
      budgetData.categoryBudgets,
      budgetData.monthlyIncome
    );
  }, [budgetData]);

  /**
   * Complete onboarding and save budget
   * @param {object} categoriesObj - Categories object from BudgetContext
   * @returns {Promise<boolean>} Success status
   */
  const completeOnboarding = useCallback(async (categoriesObj) => {
    if (!coupleId) {
      setError('No couple ID found');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // For 'none' mode, just mark as complete
      if (selectedMode === COMPLEXITY_MODES.NONE || selectedMode === 'skip') {
        setCompletion({
          isComplete: true,
          completedAt: new Date(),
        });

        // Persist completion to AsyncStorage
        await AsyncStorage.setItem(`onboarding_completed_${coupleId}`, 'true');
        console.log('✅ Onboarding skipped/completed');
        setLoading(false);
        return true;
      }

      // Validate budget before saving
      const validation = validateBudget();
      if (!validation.isValid) {
        setError(validation.errors[0]?.message || 'Budget validation failed');
        setLoading(false);
        return false;
      }

      // Save budget with complexity mode
      const { month, year } = getCurrentMonthYear();
      await saveBudget(
        coupleId,
        month,
        year,
        budgetData.categoryBudgets,
        {
          enabled: true,
          complexity: selectedMode,
          autoCalculated: budgetData.autoCalculated || false,
          onboardingMode: selectedMode,
          canAutoAdjust: false,
        }
      );

      setCompletion({
        isComplete: true,
        completedAt: new Date(),
      });

      // Persist completion to AsyncStorage
      await AsyncStorage.setItem(`onboarding_completed_${coupleId}`, 'true');

      console.log('✅ Onboarding completed successfully');
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, [coupleId, selectedMode, budgetData, validateBudget]);

  /**
   * Reset onboarding state
   */
  const resetOnboarding = useCallback(async () => {
    setCurrentStep(0);
    setSelectedMode(null);
    setBudgetStyle('smart');
    setBudgetData({
      monthlyIncome: 0,
      categoryBudgets: {},
      annualBudgets: [],
    });
    setCategories([]);
    setCompletion({
      isComplete: false,
      completedAt: null,
    });
    setError(null);

    // Clear completion flag from AsyncStorage
    if (coupleId) {
      try {
        await AsyncStorage.removeItem(`onboarding_completed_${coupleId}`);
        await AsyncStorage.removeItem('onboarding_state');
      } catch (err) {
        console.error('Error clearing onboarding storage:', err);
      }
    }

    console.log('✅ Onboarding reset');
  }, [coupleId]);

  /**
   * Get recommendations for user
   * @param {Array} expenses - Historical expenses
   * @param {object} categoriesObj - Categories object
   * @returns {object} Recommendations
   */
  const getRecommendations = useCallback((expenses, categoriesObj) => {
    return getOnboardingRecommendations(userDetails, expenses, categoriesObj);
  }, [userDetails]);

  // Helper function to get current month/year
  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  };

  // Persist state to AsyncStorage for recovery
  useEffect(() => {
    const persistState = async () => {
      if (selectedMode && currentStep > 0) {
        const state = {
          currentStep,
          selectedMode,
          budgetStyle,
          budgetData,
          timestamp: new Date().toISOString(),
        };
        try {
          await AsyncStorage.setItem('onboarding_state', JSON.stringify(state));
        } catch (err) {
          console.error('Error persisting onboarding state:', err);
        }
      }
    };
    persistState();
  }, [currentStep, selectedMode, budgetStyle, budgetData]);

  // Recover state from AsyncStorage on mount
  useEffect(() => {
    const recoverState = async () => {
      try {
        const savedState = await AsyncStorage.getItem('onboarding_state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          const savedTime = new Date(parsed.timestamp);
          const now = new Date();
          const hoursSince = (now - savedTime) / (1000 * 60 * 60);

          // Only recover if less than 24 hours old
          if (hoursSince < 24 && !completion.isComplete) {
            setCurrentStep(parsed.currentStep);
            setSelectedMode(parsed.selectedMode);
            if (parsed.budgetStyle) setBudgetStyle(parsed.budgetStyle);
            setBudgetData(parsed.budgetData);
            console.log('✅ Recovered onboarding state from AsyncStorage');
          }
        }
      } catch (err) {
        console.error('Error recovering onboarding state:', err);
      }
    };
    recoverState();
  }, []);

  // Clear AsyncStorage when onboarding is complete
  useEffect(() => {
    const clearState = async () => {
      if (completion.isComplete) {
        try {
          await AsyncStorage.removeItem('onboarding_state');
        } catch (err) {
          console.error('Error clearing onboarding state:', err);
        }
      }
    };
    clearState();
  }, [completion.isComplete]);

  const value = {
    // State
    currentStep,
    selectedMode,
    budgetStyle,
    budgetData,
    categories,
    completion,
    loading,
    error,

    // Step management
    setMode,
    nextStep,
    prevStep,
    goToStep,
    getCurrentStepName,
    getTotalSteps,
    getProgress,

    // Budget data management
    setBudgetStyle,
    updateBudgetData,
    setMonthlyIncome,
    setCategoryBudgets,
    updateCategoryBudget,

    // Smart calculations
    calculateFromHistory,
    balanceBudget,
    distributeRemaining,

    // Validation and summary
    validateBudget,
    getSummary,
    getRecommendations,

    // Completion
    completeOnboarding,
    resetOnboarding,

    // Computed values
    isComplete: completion.isComplete,
    stepName: getCurrentStepName(),
    totalSteps: getTotalSteps(),
    progress: getProgress(),
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
