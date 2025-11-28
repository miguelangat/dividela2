// src/services/merchantAliasService.js
// Service for managing merchant alias mappings

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get merchant alias for OCR-detected merchant name
 * @param {string} ocrMerchant - Merchant name detected by OCR
 * @param {string} coupleId - ID of the couple
 * @returns {Promise<string|null>} User-defined alias or original merchant name
 */
export const getMerchantAlias = async (ocrMerchant, coupleId) => {
  try {
    // Handle null or empty merchant name
    if (!ocrMerchant) {
      return null;
    }

    const trimmed = ocrMerchant.trim();
    if (trimmed === '') {
      return null;
    }

    // Validate couple ID
    if (!coupleId || coupleId.trim() === '') {
      throw new Error('Couple ID is required');
    }

    // Query for matching alias (case-insensitive)
    const aliasesRef = collection(db, 'merchantAliases');
    const q = query(
      aliasesRef,
      where('coupleId', '==', coupleId),
      where('ocrMerchantLower', '==', trimmed.toLowerCase())
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // No alias found, return original merchant name
      return trimmed;
    }

    // Get the first matching alias
    const aliasDoc = snapshot.docs[0];
    const aliasData = aliasDoc.data();

    // Update usage count
    await updateAliasUsageCount(aliasDoc.id);

    return aliasData.userAlias;
  } catch (error) {
    console.error('Error getting merchant alias:', error);
    throw error;
  }
};

/**
 * Create a new merchant alias using Firestore transaction for race condition prevention
 * @param {string} ocrMerchant - OCR-detected merchant name
 * @param {string} userAlias - User-defined alias
 * @param {string} coupleId - ID of the couple
 * @param {string} createdBy - ID of user creating the alias
 * @returns {Promise<string>} Created alias document ID
 */
export const createMerchantAlias = async (ocrMerchant, userAlias, coupleId, createdBy = null) => {
  try {
    // Validate inputs
    if (!ocrMerchant || ocrMerchant.trim() === '') {
      throw new Error('OCR merchant name is required');
    }
    if (!userAlias || userAlias.trim() === '') {
      throw new Error('User alias is required');
    }
    if (!coupleId || coupleId.trim() === '') {
      throw new Error('Couple ID is required');
    }

    // Trim inputs
    const trimmedOcrMerchant = ocrMerchant.trim();
    const trimmedUserAlias = userAlias.trim();

    const aliasId = await runTransaction(db, async (transaction) => {
      // Check if alias already exists within transaction
      const normalizedOcr = trimmedOcrMerchant.toLowerCase();
      const normalizedUser = trimmedUserAlias.toLowerCase();

      const ocrQuery = query(
        collection(db, 'merchantAliases'),
        where('coupleId', '==', coupleId),
        where('ocrMerchantLower', '==', normalizedOcr)
      );

      const aliasQuery = query(
        collection(db, 'merchantAliases'),
        where('coupleId', '==', coupleId),
        where('userAliasLower', '==', normalizedUser)
      );

      const [ocrSnapshot, aliasSnapshot] = await Promise.all([
        getDocs(ocrQuery),
        getDocs(aliasQuery)
      ]);

      if (!ocrSnapshot.empty) {
        throw new Error('An alias for this OCR merchant already exists');
      }

      if (!aliasSnapshot.empty) {
        throw new Error('This alias name is already in use');
      }

      // Create new alias within transaction
      const newAliasRef = doc(collection(db, 'merchantAliases'));
      const aliasData = {
        ocrMerchant: trimmedOcrMerchant,
        ocrMerchantLower: normalizedOcr,
        userAlias: trimmedUserAlias,
        userAliasLower: normalizedUser,
        coupleId,
        usageCount: 1,
        createdAt: serverTimestamp(),
        lastUsed: serverTimestamp(),
      };

      if (createdBy) {
        aliasData.createdBy = createdBy;
      }

      transaction.set(newAliasRef, aliasData);

      return newAliasRef.id;
    });

    console.log('Merchant alias created:', aliasId);

    return aliasId;
  } catch (error) {
    console.error('Error creating merchant alias:', error);
    throw error;
  }
};

/**
 * Get all merchant aliases for a couple
 * @param {string} coupleId - ID of the couple
 * @returns {Promise<Array>} Array of merchant aliases
 */
export const getMerchantAliases = async (coupleId) => {
  try {
    // Validate couple ID
    if (!coupleId || coupleId.trim() === '') {
      throw new Error('Couple ID is required');
    }

    // Query aliases for couple, ordered by usage count
    const aliasesRef = collection(db, 'merchantAliases');
    const q = query(
      aliasesRef,
      where('coupleId', '==', coupleId),
      orderBy('usageCount', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);

    const aliases = [];
    snapshot.forEach((doc) => {
      aliases.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return aliases;
  } catch (error) {
    console.error('Error getting merchant aliases:', error);
    throw error;
  }
};

/**
 * Update usage count for a merchant alias using transaction for race condition prevention
 * @param {string} aliasId - ID of the alias document
 * @returns {Promise<void>}
 */
export const updateAliasUsageCount = async (aliasId) => {
  try {
    // Validate alias ID
    if (!aliasId || aliasId.trim() === '') {
      throw new Error('Alias ID is required');
    }

    const aliasRef = doc(db, 'merchantAliases', aliasId);

    await runTransaction(db, async (transaction) => {
      const aliasDoc = await transaction.get(aliasRef);

      if (!aliasDoc.exists()) {
        throw new Error('Alias not found');
      }

      const currentCount = aliasDoc.data().usageCount || 0;

      transaction.update(aliasRef, {
        usageCount: currentCount + 1,
        lastUsed: serverTimestamp(),
      });
    });

    console.log('Alias usage count updated:', aliasId);
  } catch (error) {
    console.error('Error updating alias usage count:', error);
    throw error;
  }
};

/**
 * Delete a merchant alias
 * @param {string} aliasId - ID of the alias document to delete
 * @param {string} coupleId - ID of the couple (for validation)
 * @returns {Promise<void>}
 */
export const deleteMerchantAlias = async (aliasId, coupleId) => {
  try {
    // Validate inputs
    if (!aliasId || aliasId.trim() === '') {
      throw new Error('Alias ID is required');
    }
    if (!coupleId || coupleId.trim() === '') {
      throw new Error('Couple ID is required');
    }

    const aliasRef = doc(db, 'merchantAliases', aliasId);

    // Delete the document
    await deleteDoc(aliasRef);

    console.log('Merchant alias deleted:', aliasId);
  } catch (error) {
    console.error('Error deleting merchant alias:', error);
    throw error;
  }
};
