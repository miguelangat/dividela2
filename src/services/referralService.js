// src/services/referralService.js
// Service for managing referral program logic
// VERSION 2.0 - Enhanced with error handling, troubleshooting, and edge case protection

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// CONSTANTS
// ============================================================================

const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
const REFERRAL_CODE_LENGTH = 6;
const ATTRIBUTION_WINDOW_HOURS = 24;
const MAX_COLLISION_RETRIES = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safe timestamp conversion with fallbacks
 * @param {*} timestamp - Firestore timestamp or Date
 * @returns {Date} JavaScript Date object
 */
const toDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  try {
    return new Date(timestamp);
  } catch (error) {
    console.error('Failed to convert timestamp:', timestamp, error);
    return null;
  }
};

/**
 * Check if a referral code already exists
 * @param {string} code - Referral code to check
 * @returns {Promise<boolean>} True if code exists
 */
const codeExists = async (code) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', code));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking code existence:', error);
    return false; // Assume doesn't exist on error
  }
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate a unique 6-character referral code with collision detection
 * @param {string} userId - User ID to ensure uniqueness
 * @param {number} attempt - Current attempt number (for recursion)
 * @returns {Promise<string>} Unique referral code
 */
export const generateReferralCode = async (userId, attempt = 0) => {
  if (attempt >= MAX_COLLISION_RETRIES) {
    // Fallback to timestamp-based code if too many collisions
    console.warn('⚠️ Max collision retries reached, using timestamp fallback');
    const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
    return timestamp.padEnd(REFERRAL_CODE_LENGTH, REFERRAL_CODE_CHARS[0]);
  }

  let code = '';

  if (attempt === 0) {
    // First attempt: use user ID hash for consistency
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hashStr = hash.toString(36).toUpperCase();

    code += REFERRAL_CODE_CHARS[hashStr.charCodeAt(0) % REFERRAL_CODE_CHARS.length];
    code += REFERRAL_CODE_CHARS[hashStr.charCodeAt(1) % REFERRAL_CODE_CHARS.length];
  } else {
    // Subsequent attempts: fully random
    for (let i = 0; i < 2; i++) {
      code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
    }
  }

  // Add 4 random characters
  for (let i = 0; i < 4; i++) {
    code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
  }

  // Check for collision
  const exists = await codeExists(code);
  if (exists) {
    console.log(`⚠️ Collision detected for code ${code}, retrying... (attempt ${attempt + 1})`);
    return generateReferralCode(userId, attempt + 1);
  }

  console.log(`✓ Generated unique referral code: ${code} (attempt ${attempt + 1})`);
  return code;
};

/**
 * Initialize referral data for a new user
 * Creates referral code and sets up premium tracking
 * RESILIENT: Returns partial data on failure to not block signup
 * @param {string} userId - User ID
 * @param {string} referredByCode - Optional referral code that referred this user
 * @returns {Promise<object>} Referral initialization data
 */
export const initializeUserReferral = async (userId, referredByCode = null) => {
  const defaultData = {
    referralCode: null,
    referredBy: null,
    referredByUserId: null,
    premiumStatus: 'free',
    premiumSource: null,
    premiumUnlockedAt: null,
    premiumExpiresAt: null,
    referralCount: 0,
    referralsPending: [],
    referralsCompleted: [],
  };

  try {
    console.log('🎁 [initializeUserReferral] Starting for user:', userId);

    // Generate unique referral code with collision detection
    let referralCode;
    try {
      referralCode = await generateReferralCode(userId);
      console.log('✓ [initializeUserReferral] Generated code:', referralCode);
    } catch (error) {
      console.error('❌ [initializeUserReferral] Failed to generate code:', error);
      // Fallback: create simple timestamp-based code
      referralCode = Date.now().toString(36).toUpperCase().slice(-6);
      console.log('⚠️ [initializeUserReferral] Using fallback code:', referralCode);
    }

    defaultData.referralCode = referralCode;

    // Handle referral code if provided
    if (referredByCode && isValidReferralCode(referredByCode)) {
      console.log('🔍 [initializeUserReferral] Processing referral code:', referredByCode);

      try {
        // Look up the referrer
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', referredByCode));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const referrerUserId = querySnapshot.docs[0].id;

          // Prevent self-referral
          if (referrerUserId === userId) {
            console.warn('⚠️ [initializeUserReferral] Self-referral blocked');
          } else {
            defaultData.referredBy = referredByCode;
            defaultData.referredByUserId = referrerUserId;
            console.log('✓ [initializeUserReferral] Found referrer:', referrerUserId);

            // Create pending referral document
            try {
              const referralId = `${referrerUserId}_${userId}_${Date.now()}`;
              const expiresAt = new Date(Date.now() + (ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000));

              await setDoc(doc(db, 'referrals', referralId), {
                referrerUserId,
                referredUserId: userId,
                referredCoupleId: null,
                status: 'pending',
                createdAt: serverTimestamp(),
                expiresAt: expiresAt,
                completedAt: null,
              });

              console.log('✓ [initializeUserReferral] Created pending referral:', referralId);
            } catch (error) {
              console.error('❌ [initializeUserReferral] Failed to create pending referral:', error);
              // Don't fail the whole initialization if this fails
            }
          }
        } else {
          console.warn('⚠️ [initializeUserReferral] Referral code not found:', referredByCode);
        }
      } catch (error) {
        console.error('❌ [initializeUserReferral] Error processing referral code:', error);
        // Continue with partial data
      }
    }

    console.log('✓ [initializeUserReferral] Complete:', defaultData);
    return defaultData;

  } catch (error) {
    console.error('❌ [initializeUserReferral] Critical error:', error);
    // Return minimal safe data to not block signup
    return {
      ...defaultData,
      referralCode: Date.now().toString(36).toUpperCase().slice(-6), // Emergency fallback
    };
  }
};

/**
 * Check and complete referral when a couple is created
 * Awards premium to referrer if successful
 * RESILIENT: Does not throw errors that would block couple creation
 * @param {string} coupleId - The couple ID that was just created
 * @param {string} user1Id - First user in the couple
 * @param {string} user2Id - Second user in the couple
 * @returns {Promise<object>} Result with success status and rewards granted
 */
export const checkAndCompleteReferral = async (coupleId, user1Id, user2Id) => {
  try {
    console.log('🔍 [checkAndCompleteReferral] Starting...');
    console.log('   Couple:', coupleId);
    console.log('   User1:', user1Id);
    console.log('   User2:', user2Id);

    // Validate inputs
    if (!coupleId || !user1Id || !user2Id) {
      console.error('❌ [checkAndCompleteReferral] Invalid inputs');
      return { success: false, reason: 'invalid_inputs' };
    }

    // Check for pending referrals
    const referralsRef = collection(db, 'referrals');

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(query(referralsRef, where('referredUserId', '==', user1Id), where('status', '==', 'pending'))),
      getDocs(query(referralsRef, where('referredUserId', '==', user2Id), where('status', '==', 'pending'))),
    ]);

    const pendingReferrals = [
      ...snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    ];

    if (pendingReferrals.length === 0) {
      console.log('ℹ️  [checkAndCompleteReferral] No pending referrals');
      return { success: false, reason: 'no_pending_referrals' };
    }

    console.log(`✓ [checkAndCompleteReferral] Found ${pendingReferrals.length} pending referral(s)`);

    // Process each pending referral
    const results = [];
    const now = new Date();

    for (const referral of pendingReferrals) {
      try {
        // Check expiration
        const expiresAt = toDate(referral.expiresAt);
        if (!expiresAt || now > expiresAt) {
          console.log('⏰ [checkAndCompleteReferral] Referral expired:', referral.id);

          try {
            await updateDoc(doc(db, 'referrals', referral.id), { status: 'expired' });
          } catch (error) {
            console.error('❌ Failed to mark referral as expired:', error);
          }

          results.push({ success: false, reason: 'expired', referralId: referral.id });
          continue;
        }

        console.log('✅ [checkAndCompleteReferral] Processing valid referral:', referral.id);

        // Use batch for atomic updates
        const batch = writeBatch(db);

        // Update referral status
        batch.update(doc(db, 'referrals', referral.id), {
          status: 'completed',
          completedAt: serverTimestamp(),
          referredCoupleId: coupleId,
        });

        // Update referrer
        const referrerRef = doc(db, 'users', referral.referrerUserId);
        const referrerDoc = await getDoc(referrerRef);

        if (referrerDoc.exists()) {
          const referrerData = referrerDoc.data();
          const currentCount = referrerData.referralCount || 0;
          const newCount = currentCount + 1;

          const referrerUpdates = {
            referralCount: newCount,
            referralsCompleted: [...(referrerData.referralsCompleted || []), coupleId],
          };

          // Award premium on first successful referral
          if (newCount === 1 && referrerData.premiumStatus !== 'premium') {
            console.log('🎉 [checkAndCompleteReferral] Awarding Premium to referrer!');
            referrerUpdates.premiumStatus = 'premium';
            referrerUpdates.premiumSource = 'referral';
            referrerUpdates.premiumUnlockedAt = serverTimestamp();
            referrerUpdates.premiumExpiresAt = null; // Forever
          }

          batch.update(referrerRef, referrerUpdates);
        } else {
          console.warn('⚠️ [checkAndCompleteReferral] Referrer document not found');
        }

        // Update referred user
        const referredRef = doc(db, 'users', referral.referredUserId);
        const referredDoc = await getDoc(referredRef);

        if (referredDoc.exists()) {
          const referredData = referredDoc.data();

          // Grant 1-month Premium if not already premium
          if (referredData.premiumStatus !== 'premium') {
            console.log('🎁 [checkAndCompleteReferral] Granting 1-month Premium to referred user');

            const oneMonthFromNow = new Date();
            oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

            batch.update(referredRef, {
              premiumStatus: 'premium',
              premiumSource: 'referral_bonus',
              premiumUnlockedAt: serverTimestamp(),
              premiumExpiresAt: oneMonthFromNow,
              referralCompletedAt: serverTimestamp(),
            });
          }
        } else {
          console.warn('⚠️ [checkAndCompleteReferral] Referred user document not found');
        }

        // Commit batch
        await batch.commit();
        console.log('✓ [checkAndCompleteReferral] Batch committed successfully');

        results.push({
          success: true,
          referralId: referral.id,
          referrerId: referral.referrerUserId,
          referredId: referral.referredUserId,
        });

      } catch (error) {
        console.error('❌ [checkAndCompleteReferral] Error processing referral:', referral.id, error);
        results.push({
          success: false,
          reason: 'processing_error',
          referralId: referral.id,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✓ [checkAndCompleteReferral] Completed ${successCount}/${results.length} referrals`);

    return {
      success: successCount > 0,
      results,
      count: successCount,
    };

  } catch (error) {
    console.error('❌ [checkAndCompleteReferral] Critical error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get referral statistics for a user
 * RESILIENT: Returns null on error instead of throwing
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Referral stats or null on error
 */
export const getReferralStats = async (userId) => {
  try {
    console.log('📊 [getReferralStats] Fetching for user:', userId);

    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      console.error('❌ [getReferralStats] User not found');
      return null;
    }

    const userData = userDoc.data();

    // Get pending and completed referrals
    const referralsRef = collection(db, 'referrals');

    const [pendingSnapshot, completedSnapshot] = await Promise.all([
      getDocs(query(referralsRef, where('referrerUserId', '==', userId), where('status', '==', 'pending'))),
      getDocs(query(referralsRef, where('referrerUserId', '==', userId), where('status', '==', 'completed'))),
    ]);

    const pendingReferrals = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const completedReferrals = completedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log('✓ [getReferralStats] Fetched successfully');

    return {
      referralCode: userData.referralCode || null,
      referralCount: userData.referralCount || 0,
      premiumStatus: userData.premiumStatus || 'free',
      premiumSource: userData.premiumSource || null,
      premiumUnlockedAt: userData.premiumUnlockedAt || null,
      premiumExpiresAt: userData.premiumExpiresAt || null,
      pendingReferrals,
      completedReferrals,
      referralLink: userData.referralCode ? `https://dividela.co/r/${userData.referralCode}` : null,
    };

  } catch (error) {
    console.error('❌ [getReferralStats] Error:', error);
    return null;
  }
};

/**
 * Check if user has active premium
 * SAFE: Handles all edge cases with fallbacks
 * @param {object} userDetails - User details from Firestore
 * @returns {boolean} Whether user has active premium
 */
export const hasActivePremium = (userDetails) => {
  try {
    if (!userDetails) return false;
    if (userDetails.premiumStatus !== 'premium') return false;
    if (!userDetails.premiumExpiresAt) return true; // No expiration = forever

    const now = new Date();
    const expiresAt = toDate(userDetails.premiumExpiresAt);

    if (!expiresAt) {
      console.warn('⚠️ [hasActivePremium] Invalid expiration date, assuming active');
      return true; // Benefit of the doubt
    }

    return now < expiresAt;

  } catch (error) {
    console.error('❌ [hasActivePremium] Error:', error);
    return false;
  }
};

/**
 * Get premium feature gates
 * @param {object} userDetails - User details from Firestore
 * @returns {object} Feature access map
 */
export const getPremiumFeatures = (userDetails) => {
  const hasPremium = hasActivePremium(userDetails);

  return {
    hasPremium,
    features: {
      receiptOCR: hasPremium,
      advancedAnalytics: hasPremium,
      recurringExpenses: hasPremium,
      categoryTrends: hasPremium,
      customExports: hasPremium,
      customThemes: hasPremium,
      prioritySupport: hasPremium,
      multipleGroups: hasPremium,
    },
  };
};

/**
 * Validate referral code format
 * @param {string} code - Referral code to validate
 * @returns {boolean} Whether code format is valid
 */
export const isValidReferralCode = (code) => {
  if (!code || typeof code !== 'string') return false;
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code);
};

/**
 * Award premium to a user (admin function)
 * @param {string} userId - User ID
 * @param {string} source - Source of premium
 * @param {Date} expiresAt - Optional expiration date
 * @returns {Promise<boolean>} Success status
 */
export const awardPremium = async (userId, source, expiresAt = null) => {
  try {
    console.log(`🎁 [awardPremium] Awarding to ${userId} from ${source}`);

    await updateDoc(doc(db, 'users', userId), {
      premiumStatus: 'premium',
      premiumSource: source,
      premiumUnlockedAt: serverTimestamp(),
      premiumExpiresAt: expiresAt,
    });

    console.log('✓ [awardPremium] Success');
    return true;
  } catch (error) {
    console.error('❌ [awardPremium] Error:', error);
    return false;
  }
};

/**
 * Clean up expired referrals (maintenance function)
 * @returns {Promise<number>} Number of referrals expired
 */
export const cleanupExpiredReferrals = async () => {
  try {
    const now = new Date();
    const referralsRef = collection(db, 'referrals');
    const expiredQuery = query(
      referralsRef,
      where('status', '==', 'pending'),
      where('expiresAt', '<', now)
    );

    const snapshot = await getDocs(expiredQuery);

    if (snapshot.empty) {
      console.log('ℹ️  [cleanupExpiredReferrals] No expired referrals found');
      return 0;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });

    await batch.commit();

    console.log(`✓ [cleanupExpiredReferrals] Expired ${snapshot.docs.length} referrals`);
    return snapshot.docs.length;
  } catch (error) {
    console.error('❌ [cleanupExpiredReferrals] Error:', error);
    return 0;
  }
};

// ============================================================================
// TROUBLESHOOTING & DEBUGGING UTILITIES
// ============================================================================

/**
 * Debug: Get detailed referral information for troubleshooting
 * @param {string} userId - User ID to debug
 * @returns {Promise<object>} Comprehensive debug info
 */
export const debugReferralInfo = async (userId) => {
  try {
    console.log('🔧 [debugReferralInfo] Debugging user:', userId);

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { error: 'User not found' };
    }

    const userData = userDoc.data();
    const referralsRef = collection(db, 'referrals');

    // Get all referrals where user is referrer
    const asReferrerQuery = query(referralsRef, where('referrerUserId', '==', userId));
    const asReferrerSnapshot = await getDocs(asReferrerQuery);

    // Get all referrals where user was referred
    const asReferredQuery = query(referralsRef, where('referredUserId', '==', userId));
    const asReferredSnapshot = await getDocs(asReferredQuery);

    return {
      userId,
      userProfile: {
        referralCode: userData.referralCode,
        referredBy: userData.referredBy,
        referredByUserId: userData.referredByUserId,
        premiumStatus: userData.premiumStatus,
        premiumSource: userData.premiumSource,
        premiumUnlockedAt: userData.premiumUnlockedAt,
        premiumExpiresAt: userData.premiumExpiresAt,
        referralCount: userData.referralCount,
      },
      asReferrer: {
        total: asReferrerSnapshot.size,
        pending: asReferrerSnapshot.docs.filter(d => d.data().status === 'pending').length,
        completed: asReferrerSnapshot.docs.filter(d => d.data().status === 'completed').length,
        expired: asReferrerSnapshot.docs.filter(d => d.data().status === 'expired').length,
        referrals: asReferrerSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
      },
      asReferred: {
        total: asReferredSnapshot.size,
        referrals: asReferredSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
      },
      premiumActive: hasActivePremium(userData),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ [debugReferralInfo] Error:', error);
    return { error: error.message };
  }
};

/**
 * Debug: Verify data consistency for a user
 * @param {string} userId - User ID to verify
 * @returns {Promise<object>} Consistency check results
 */
export const verifyReferralConsistency = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { valid: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const referralsRef = collection(db, 'referrals');

    // Count completed referrals
    const completedQuery = query(
      referralsRef,
      where('referrerUserId', '==', userId),
      where('status', '==', 'completed')
    );
    const completedSnapshot = await getDocs(completedQuery);
    const actualCompletedCount = completedSnapshot.size;
    const storedCount = userData.referralCount || 0;

    const issues = [];

    // Check count consistency
    if (actualCompletedCount !== storedCount) {
      issues.push({
        type: 'count_mismatch',
        message: `Stored count (${storedCount}) doesn't match actual (${actualCompletedCount})`,
        storedCount,
        actualCount: actualCompletedCount,
      });
    }

    // Check premium eligibility
    if (actualCompletedCount >= 1 && userData.premiumStatus !== 'premium') {
      issues.push({
        type: 'missing_premium',
        message: 'User has completed referrals but no premium status',
        completedCount: actualCompletedCount,
      });
    }

    // Check for duplicate referral codes
    if (userData.referralCode) {
      const usersRef = collection(db, 'users');
      const duplicateQuery = query(usersRef, where('referralCode', '==', userData.referralCode));
      const duplicateSnapshot = await getDocs(duplicateQuery);

      if (duplicateSnapshot.size > 1) {
        issues.push({
          type: 'duplicate_code',
          message: 'Referral code is not unique',
          code: userData.referralCode,
          duplicateCount: duplicateSnapshot.size,
        });
      }
    }

    return {
      valid: issues.length === 0,
      userId,
      issues,
      storedReferralCount: storedCount,
      actualCompletedReferrals: actualCompletedCount,
      hasReferralCode: !!userData.referralCode,
      premiumStatus: userData.premiumStatus,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ [verifyReferralConsistency] Error:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Debug: Fix referral count discrepancy
 * @param {string} userId - User ID to fix
 * @returns {Promise<object>} Fix result
 */
export const fixReferralCount = async (userId) => {
  try {
    const verification = await verifyReferralConsistency(userId);

    if (verification.valid) {
      return { fixed: false, message: 'No issues found' };
    }

    const countIssue = verification.issues.find(i => i.type === 'count_mismatch');
    if (countIssue) {
      await updateDoc(doc(db, 'users', userId), {
        referralCount: countIssue.actualCount,
      });

      return {
        fixed: true,
        message: `Updated count from ${countIssue.storedCount} to ${countIssue.actualCount}`,
        oldCount: countIssue.storedCount,
        newCount: countIssue.actualCount,
      };
    }

    return { fixed: false, message: 'No count issue to fix' };
  } catch (error) {
    console.error('❌ [fixReferralCount] Error:', error);
    return { fixed: false, error: error.message };
  }
};
