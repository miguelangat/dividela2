// src/services/accountService.js
// Service for managing user accounts (solo and couple budgets)

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a solo account for a user
 * @param {string} userId - User's Firebase UID
 * @param {string} accountName - Name for the account (e.g., "Personal Budget")
 * @returns {Promise<object>} Created account data
 */
export const createSoloAccount = async (userId, accountName) => {
  try {
    console.log('Creating solo account for user:', userId);

    // Generate unique account ID
    const accountId = `solo_${userId}_${Date.now()}`;

    // Create couple document with user2Id as null (solo account)
    const coupleData = {
      coupleId: accountId,
      type: 'solo',
      user1Id: userId,
      user2Id: null,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'couples', accountId), coupleData);
    console.log('✓ Created solo couple document:', accountId);

    // Create account entry for user
    const accountEntry = {
      accountId: accountId,
      accountName: accountName,
      type: 'solo',
      partnerId: null,
      partnerName: null,
      role: 'owner',
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString()
    };

    // Add to user's accounts array
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      accounts: arrayUnion(accountEntry)
    });
    console.log('✓ Added solo account to user document');

    return {
      success: true,
      accountId: accountId,
      accountData: accountEntry
    };
  } catch (error) {
    console.error('Error creating solo account:', error);
    throw error;
  }
};

/**
 * Create a couple account (shared budget with partner)
 * @param {string} userId - User's Firebase UID
 * @param {string} partnerId - Partner's Firebase UID
 * @param {string} accountName - Name for the account
 * @param {string} partnerAccountName - Partner's name for the account
 * @returns {Promise<object>} Created account data
 */
export const createCoupleAccount = async (userId, partnerId, accountName, partnerAccountName) => {
  try {
    console.log('Creating couple account for users:', userId, partnerId);

    // Generate unique account ID
    const accountId = `couple_${userId}_${partnerId}_${Date.now()}`;

    // Get partner details
    const partnerDoc = await getDoc(doc(db, 'users', partnerId));
    if (!partnerDoc.exists()) {
      throw new Error('Partner user not found');
    }
    const partnerData = partnerDoc.data();

    // Get current user details
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    const userData = userDoc.data();

    // Create couple document
    const coupleData = {
      coupleId: accountId,
      type: 'couple',
      user1Id: userId,
      user2Id: partnerId,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'couples', accountId), coupleData);
    console.log('✓ Created couple document:', accountId);

    // Create account entry for current user
    const userAccountEntry = {
      accountId: accountId,
      accountName: accountName,
      type: 'couple',
      partnerId: partnerId,
      partnerName: partnerData.displayName,
      role: 'owner',
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString()
    };

    // Create account entry for partner
    const partnerAccountEntry = {
      accountId: accountId,
      accountName: partnerAccountName || accountName, // Use partner's custom name or default
      type: 'couple',
      partnerId: userId,
      partnerName: userData.displayName,
      role: 'member',
      createdAt: new Date().toISOString(),
      joinedAt: new Date().toISOString()
    };

    // Add to both users' accounts arrays
    const userRef = doc(db, 'users', userId);
    const partnerRef = doc(db, 'users', partnerId);

    await updateDoc(userRef, {
      accounts: arrayUnion(userAccountEntry)
    });

    await updateDoc(partnerRef, {
      accounts: arrayUnion(partnerAccountEntry)
    });

    console.log('✓ Added couple account to both user documents');

    return {
      success: true,
      accountId: accountId,
      accountData: userAccountEntry
    };
  } catch (error) {
    console.error('Error creating couple account:', error);
    throw error;
  }
};

/**
 * Get all accounts for a user
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<Array>} Array of account objects
 */
export const getUserAccounts = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    return userData.accounts || [];
  } catch (error) {
    console.error('Error getting user accounts:', error);
    throw error;
  }
};

/**
 * Switch the active account for a user
 * @param {string} userId - User's Firebase UID
 * @param {string} accountId - Account ID to set as active
 * @returns {Promise<boolean>} Success status
 */
export const switchActiveAccount = async (userId, accountId) => {
  try {
    console.log('Switching active account for user:', userId, 'to:', accountId);

    // Verify account exists in user's accounts array
    const accounts = await getUserAccounts(userId);
    const accountExists = accounts.some(acc => acc.accountId === accountId);

    if (!accountExists) {
      throw new Error('Account not found in user accounts');
    }

    // Update activeAccountId
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      activeAccountId: accountId
    });

    console.log('✓ Active account switched successfully');
    return true;
  } catch (error) {
    console.error('Error switching active account:', error);
    throw error;
  }
};

/**
 * Add an account to user's accounts array
 * Used when joining an existing couple via invite
 * @param {string} userId - User's Firebase UID
 * @param {string} accountId - Account/Couple ID
 * @param {object} accountData - Account metadata
 * @returns {Promise<boolean>} Success status
 */
export const addAccountToUser = async (userId, accountId, accountData) => {
  try {
    console.log('Adding account to user:', userId, accountId);

    const accountEntry = {
      accountId: accountId,
      accountName: accountData.accountName,
      type: accountData.type || 'couple',
      partnerId: accountData.partnerId || null,
      partnerName: accountData.partnerName || null,
      role: accountData.role || 'member',
      createdAt: accountData.createdAt || new Date().toISOString(),
      joinedAt: new Date().toISOString()
    };

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      accounts: arrayUnion(accountEntry)
    });

    console.log('✓ Account added to user');
    return true;
  } catch (error) {
    console.error('Error adding account to user:', error);
    throw error;
  }
};

/**
 * Remove an account from user's accounts array
 * @param {string} userId - User's Firebase UID
 * @param {string} accountId - Account ID to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeAccountFromUser = async (userId, accountId) => {
  try {
    console.log('Removing account from user:', userId, accountId);

    // Get current accounts
    const accounts = await getUserAccounts(userId);
    const accountToRemove = accounts.find(acc => acc.accountId === accountId);

    if (!accountToRemove) {
      throw new Error('Account not found');
    }

    // Remove from array
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      accounts: arrayRemove(accountToRemove)
    });

    // If this was the active account, clear activeAccountId
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    if (userData.activeAccountId === accountId) {
      // Set active to first remaining account or null
      const remainingAccounts = accounts.filter(acc => acc.accountId !== accountId);
      const newActiveAccountId = remainingAccounts.length > 0 ? remainingAccounts[0].accountId : null;

      await updateDoc(userRef, {
        activeAccountId: newActiveAccountId
      });
    }

    console.log('✓ Account removed from user');
    return true;
  } catch (error) {
    console.error('Error removing account from user:', error);
    throw error;
  }
};

/**
 * Update account name for a user
 * @param {string} userId - User's Firebase UID
 * @param {string} accountId - Account ID
 * @param {string} newName - New account name
 * @returns {Promise<boolean>} Success status
 */
export const updateAccountName = async (userId, accountId, newName) => {
  try {
    console.log('Updating account name:', accountId, 'to:', newName);

    // Get current accounts
    const accounts = await getUserAccounts(userId);
    const accountIndex = accounts.findIndex(acc => acc.accountId === accountId);

    if (accountIndex === -1) {
      throw new Error('Account not found');
    }

    // Update the specific account
    const updatedAccount = {
      ...accounts[accountIndex],
      accountName: newName
    };

    // Remove old entry and add updated one
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      accounts: arrayRemove(accounts[accountIndex])
    });

    await updateDoc(userRef, {
      accounts: arrayUnion(updatedAccount)
    });

    console.log('✓ Account name updated');
    return true;
  } catch (error) {
    console.error('Error updating account name:', error);
    throw error;
  }
};

/**
 * Get account/couple details
 * @param {string} accountId - Account/Couple ID
 * @returns {Promise<object|null>} Account details or null
 */
export const getAccountDetails = async (accountId) => {
  try {
    const coupleDoc = await getDoc(doc(db, 'couples', accountId));

    if (!coupleDoc.exists()) {
      return null;
    }

    return coupleDoc.data();
  } catch (error) {
    console.error('Error getting account details:', error);
    throw error;
  }
};

/**
 * Check if user is the owner of an account
 * @param {string} userId - User's Firebase UID
 * @param {string} accountId - Account ID
 * @returns {Promise<boolean>} True if user is owner
 */
export const isUserAccountOwner = async (userId, accountId) => {
  try {
    const accounts = await getUserAccounts(userId);
    const account = accounts.find(acc => acc.accountId === accountId);

    return account ? account.role === 'owner' : false;
  } catch (error) {
    console.error('Error checking account ownership:', error);
    return false;
  }
};

/**
 * Get active account for a user
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<object|null>} Active account object or null
 */
export const getActiveAccount = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    const activeAccountId = userData.activeAccountId;

    if (!activeAccountId) {
      return null;
    }

    const accounts = userData.accounts || [];
    return accounts.find(acc => acc.accountId === activeAccountId) || null;
  } catch (error) {
    console.error('Error getting active account:', error);
    throw error;
  }
};

/**
 * Set first account as active if user has no active account
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<boolean>} Success status
 */
export const ensureActiveAccount = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    const accounts = userData.accounts || [];

    // If no active account but has accounts, set first as active
    if (!userData.activeAccountId && accounts.length > 0) {
      await switchActiveAccount(userId, accounts[0].accountId);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error ensuring active account:', error);
    throw error;
  }
};
