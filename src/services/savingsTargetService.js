// src/services/savingsTargetService.js
// Service for managing savings goals and targets

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a savings target
 *
 * @param {string} coupleId - The couple ID
 * @param {Object} targetData - Savings target data
 * @returns {Object} Created savings target
 */
export const createSavingsTarget = async (coupleId, targetData) => {
  try {
    const {
      name,
      targetAmount,
      targetDate,
      monthlyContribution,
      priority,
      category,
      fiscalYear,
    } = targetData;

    const targetId = `${coupleId}_${Date.now()}`;
    const targetRef = doc(db, 'savingsTargets', targetId);

    const savingsTarget = {
      id: targetId,
      coupleId,
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      targetDate: targetDate ? new Date(targetDate) : null,
      monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : null,
      priority: priority || 1,
      category: category || null,
      fiscalYear: fiscalYear || null,
      status: 'active', // 'active', 'completed', 'paused'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      completedAt: null,
      milestones: [],
    };

    await setDoc(targetRef, savingsTarget);

    console.log('✅ Savings target created:', name);
    return savingsTarget;
  } catch (error) {
    console.error('Error creating savings target:', error);
    throw error;
  }
};

/**
 * Get all savings targets for a couple
 *
 * @param {string} coupleId - The couple ID
 * @param {string} status - Filter by status ('active', 'completed', 'paused')
 * @returns {Array} Array of savings targets
 */
export const getSavingsTargets = async (coupleId, status = null) => {
  try {
    const targetsRef = collection(db, 'savingsTargets');
    let q = query(targetsRef, where('coupleId', '==', coupleId));

    if (status) {
      q = query(q, where('status', '==', status));
    }

    const snapshot = await getDocs(q);
    const targets = [];

    snapshot.forEach((doc) => {
      targets.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by priority
    targets.sort((a, b) => a.priority - b.priority);

    return targets;
  } catch (error) {
    console.error('Error getting savings targets:', error);
    throw error;
  }
};

/**
 * Get savings targets for a specific fiscal year
 *
 * @param {string} coupleId - The couple ID
 * @param {number} fiscalYear - The fiscal year
 * @returns {Array} Array of savings targets
 */
export const getSavingsTargetsForFiscalYear = async (coupleId, fiscalYear) => {
  try {
    const targetsRef = collection(db, 'savingsTargets');
    const q = query(
      targetsRef,
      where('coupleId', '==', coupleId),
      where('fiscalYear', '==', fiscalYear)
    );

    const snapshot = await getDocs(q);
    const targets = [];

    snapshot.forEach((doc) => {
      targets.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort by priority
    targets.sort((a, b) => a.priority - b.priority);

    return targets;
  } catch (error) {
    console.error('Error getting fiscal year savings targets:', error);
    throw error;
  }
};

/**
 * Update savings progress
 *
 * @param {string} targetId - The savings target ID
 * @param {number} amount - Amount to add/subtract
 * @param {string} note - Optional note for this update
 * @returns {Object} Updated savings target
 */
export const updateSavingsProgress = async (targetId, amount, note = null) => {
  try {
    const targetRef = doc(db, 'savingsTargets', targetId);
    const targetDoc = await getDoc(targetRef);

    if (!targetDoc.exists()) {
      throw new Error('Savings target not found');
    }

    const targetData = targetDoc.data();
    const newCurrentAmount = targetData.currentAmount + parseFloat(amount);

    // Check if target is reached
    const isCompleted = newCurrentAmount >= targetData.targetAmount;

    const updates = {
      currentAmount: newCurrentAmount,
      updatedAt: serverTimestamp(),
    };

    if (isCompleted && targetData.status !== 'completed') {
      updates.status = 'completed';
      updates.completedAt = serverTimestamp();
    }

    // Add milestone if provided
    if (note) {
      const milestone = {
        date: new Date(),
        amount: parseFloat(amount),
        note,
        balance: newCurrentAmount,
      };

      updates.milestones = [...(targetData.milestones || []), milestone];
    }

    await updateDoc(targetRef, updates);

    console.log('✅ Savings progress updated:', targetId);
    return { success: true, isCompleted };
  } catch (error) {
    console.error('Error updating savings progress:', error);
    throw error;
  }
};

/**
 * Update savings target details
 *
 * @param {string} targetId - The savings target ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Success status
 */
export const updateSavingsTarget = async (targetId, updates) => {
  try {
    const targetRef = doc(db, 'savingsTargets', targetId);

    const allowedUpdates = {};

    if (updates.name !== undefined) allowedUpdates.name = updates.name;
    if (updates.targetAmount !== undefined) {
      allowedUpdates.targetAmount = parseFloat(updates.targetAmount);
    }
    if (updates.targetDate !== undefined) {
      allowedUpdates.targetDate = updates.targetDate ? new Date(updates.targetDate) : null;
    }
    if (updates.monthlyContribution !== undefined) {
      allowedUpdates.monthlyContribution = updates.monthlyContribution
        ? parseFloat(updates.monthlyContribution)
        : null;
    }
    if (updates.priority !== undefined) allowedUpdates.priority = updates.priority;
    if (updates.status !== undefined) allowedUpdates.status = updates.status;
    if (updates.category !== undefined) allowedUpdates.category = updates.category;

    allowedUpdates.updatedAt = serverTimestamp();

    await updateDoc(targetRef, allowedUpdates);

    console.log('✅ Savings target updated:', targetId);
    return { success: true };
  } catch (error) {
    console.error('Error updating savings target:', error);
    throw error;
  }
};

/**
 * Delete a savings target
 *
 * @param {string} targetId - The savings target ID
 * @returns {Object} Success status
 */
export const deleteSavingsTarget = async (targetId) => {
  try {
    const targetRef = doc(db, 'savingsTargets', targetId);
    await deleteDoc(targetRef);

    console.log('✅ Savings target deleted:', targetId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting savings target:', error);
    throw error;
  }
};

/**
 * Calculate recommended monthly contribution based on target
 *
 * @param {number} targetAmount - Target amount to save
 * @param {number} currentAmount - Current saved amount
 * @param {Date} targetDate - Target completion date
 * @returns {Object} Calculation results
 */
export const calculateMonthlyContribution = (targetAmount, currentAmount, targetDate) => {
  const remaining = targetAmount - currentAmount;

  if (remaining <= 0) {
    return {
      monthlyContribution: 0,
      monthsRemaining: 0,
      isAchievable: true,
    };
  }

  if (!targetDate) {
    return {
      monthlyContribution: null,
      monthsRemaining: null,
      isAchievable: null,
    };
  }

  const today = new Date();
  const target = new Date(targetDate);
  const monthsRemaining = Math.max(
    1,
    Math.ceil((target - today) / (1000 * 60 * 60 * 24 * 30))
  );

  const monthlyContribution = Math.ceil(remaining / monthsRemaining);

  return {
    monthlyContribution,
    monthsRemaining,
    isAchievable: monthsRemaining > 0,
  };
};

/**
 * Get savings rate for a fiscal year
 *
 * @param {string} coupleId - The couple ID
 * @param {number} totalSpent - Total spent in fiscal year
 * @param {number} totalBudget - Total budget for fiscal year
 * @returns {Object} Savings rate info
 */
export const calculateSavingsRate = (totalSpent, totalBudget) => {
  const saved = Math.max(0, totalBudget - totalSpent);
  const savingsRate = totalBudget > 0 ? (saved / totalBudget) * 100 : 0;

  return {
    totalSaved: saved,
    savingsRate: Math.round(savingsRate * 100) / 100,
    isUnderBudget: totalSpent < totalBudget,
  };
};

/**
 * Get savings summary for all targets
 *
 * @param {string} coupleId - The couple ID
 * @returns {Object} Savings summary
 */
export const getSavingsSummary = async (coupleId) => {
  try {
    const allTargets = await getSavingsTargets(coupleId);

    const summary = {
      totalTargets: allTargets.length,
      activeTargets: 0,
      completedTargets: 0,
      totalTargetAmount: 0,
      totalCurrentAmount: 0,
      totalRemaining: 0,
      completionPercentage: 0,
    };

    allTargets.forEach((target) => {
      if (target.status === 'active') {
        summary.activeTargets++;
      } else if (target.status === 'completed') {
        summary.completedTargets++;
      }

      summary.totalTargetAmount += target.targetAmount;
      summary.totalCurrentAmount += target.currentAmount;
    });

    summary.totalRemaining = summary.totalTargetAmount - summary.totalCurrentAmount;
    summary.completionPercentage =
      summary.totalTargetAmount > 0
        ? Math.round((summary.totalCurrentAmount / summary.totalTargetAmount) * 100)
        : 0;

    return summary;
  } catch (error) {
    console.error('Error getting savings summary:', error);
    throw error;
  }
};

/**
 * Pause a savings target
 *
 * @param {string} targetId - The savings target ID
 * @returns {Object} Success status
 */
export const pauseSavingsTarget = async (targetId) => {
  return updateSavingsTarget(targetId, { status: 'paused' });
};

/**
 * Resume a savings target
 *
 * @param {string} targetId - The savings target ID
 * @returns {Object} Success status
 */
export const resumeSavingsTarget = async (targetId) => {
  return updateSavingsTarget(targetId, { status: 'active' });
};

/**
 * Mark savings target as completed
 *
 * @param {string} targetId - The savings target ID
 * @returns {Object} Success status
 */
export const completeSavingsTarget = async (targetId) => {
  try {
    const targetRef = doc(db, 'savingsTargets', targetId);

    await updateDoc(targetRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Savings target marked as completed:', targetId);
    return { success: true };
  } catch (error) {
    console.error('Error completing savings target:', error);
    throw error;
  }
};
