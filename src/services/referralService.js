// src/services/referralService.js
// Service for managing referral program logic

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
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Generate a unique 6-character referral code
 * @param {string} userId - User ID to ensure uniqueness
 * @returns {string} Unique referral code
 */
export const generateReferralCode = (userId) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0,O,1,I)
  let code = '';

  // Use first 2 chars from user ID hash + 4 random chars for uniqueness
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hashStr = hash.toString(36).toUpperCase();

  code += chars[hashStr.charCodeAt(0) % chars.length];
  code += chars[hashStr.charCodeAt(1) % chars.length];

  // Add 4 random characters
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
};

/**
 * Initialize referral data for a new user
 * Creates referral code and sets up premium tracking
 * @param {string} userId - User ID
 * @param {string} referredByCode - Optional referral code that referred this user
 * @returns {object} Referral initialization data
 */
export const initializeUserReferral = async (userId, referredByCode = null) => {
  try {
    console.log('🎁 Initializing referral for user:', userId);

    // Generate unique referral code for this user
    const referralCode = generateReferralCode(userId);
    console.log('Generated referral code:', referralCode);

    // Determine who referred this user (if anyone)
    let referredBy = null;
    let referredByUserId = null;

    if (referredByCode) {
      console.log('User signed up with referral code:', referredByCode);

      // Look up the referrer's user ID from their referral code
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referralCode', '==', referredByCode));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        referredByUserId = querySnapshot.docs[0].id;
        referredBy = referredByCode;
        console.log('Found referrer:', referredByUserId);

        // Create pending referral document
        const referralId = `${referredByUserId}_${userId}_${Date.now()}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day from now

        await setDoc(doc(db, 'referrals', referralId), {
          referrerUserId: referredByUserId,
          referredUserId: userId,
          referredCoupleId: null,
          status: 'pending',
          createdAt: serverTimestamp(),
          expiresAt: expiresAt,
          completedAt: null,
        });

        console.log('✓ Created pending referral document:', referralId);
      } else {
        console.warn('⚠️ Referral code not found:', referredByCode);
      }
    }

    return {
      referralCode,
      referredBy,
      referredByUserId,
      premiumStatus: 'free',
      premiumSource: null,
      premiumUnlockedAt: null,
      premiumExpiresAt: null,
      referralCount: 0,
      referralsPending: [],
      referralsCompleted: [],
    };
  } catch (error) {
    console.error('Error initializing user referral:', error);
    // Return minimal data on error
    return {
      referralCode: generateReferralCode(userId),
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
  }
};

/**
 * Check and complete referral when a couple is created
 * Awards premium to referrer if successful
 * @param {string} coupleId - The couple ID that was just created
 * @param {string} user1Id - First user in the couple
 * @param {string} user2Id - Second user in the couple
 * @returns {object} Result with success status and rewards granted
 */
export const checkAndCompleteReferral = async (coupleId, user1Id, user2Id) => {
  try {
    console.log('🔍 Checking for referral completion...');
    console.log('Couple:', coupleId, 'Users:', user1Id, user2Id);

    // Check if either user was referred and has a pending referral
    const referralsRef = collection(db, 'referrals');

    // Check for user1
    const q1 = query(
      referralsRef,
      where('referredUserId', '==', user1Id),
      where('status', '==', 'pending')
    );

    // Check for user2
    const q2 = query(
      referralsRef,
      where('referredUserId', '==', user2Id),
      where('status', '==', 'pending')
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
    ]);

    const pendingReferrals = [
      ...snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    ];

    if (pendingReferrals.length === 0) {
      console.log('ℹ️  No pending referrals found');
      return { success: false, reason: 'no_pending_referrals' };
    }

    console.log(`Found ${pendingReferrals.length} pending referral(s)`);

    // Process each pending referral
    const results = [];

    for (const referral of pendingReferrals) {
      // Check if expired (1 day window)
      const now = new Date();
      const expiresAt = referral.expiresAt.toDate();

      if (now > expiresAt) {
        console.log('⏰ Referral expired:', referral.id);
        // Mark as expired
        await updateDoc(doc(db, 'referrals', referral.id), {
          status: 'expired',
        });
        results.push({ success: false, reason: 'expired', referralId: referral.id });
        continue;
      }

      // Referral is valid! Complete it
      console.log('✅ Completing referral:', referral.id);

      const batch = writeBatch(db);

      // Update referral status
      batch.update(doc(db, 'referrals', referral.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
        referredCoupleId: coupleId,
      });

      // Update referrer's stats
      const referrerRef = doc(db, 'users', referral.referrerUserId);
      const referrerDoc = await getDoc(referrerRef);

      if (referrerDoc.exists()) {
        const referrerData = referrerDoc.data();
        const currentCount = referrerData.referralCount || 0;
        const newCount = currentCount + 1;

        const updates = {
          referralCount: newCount,
          referralsCompleted: [...(referrerData.referralsCompleted || []), coupleId],
        };

        // Award premium if this is their first successful referral
        if (newCount === 1 && referrerData.premiumStatus !== 'premium') {
          console.log('🎉 Awarding premium to referrer! First successful referral!');
          updates.premiumStatus = 'premium';
          updates.premiumSource = 'referral';
          updates.premiumUnlockedAt = serverTimestamp();
          updates.premiumExpiresAt = null; // Premium forever
        }

        batch.update(referrerRef, updates);
      }

      // Update referred user's status
      const referredRef = doc(db, 'users', referral.referredUserId);
      const referredDoc = await getDoc(referredRef);

      if (referredDoc.exists()) {
        const referredData = referredDoc.data();

        // Grant 1 month free premium to referred user (double-sided reward)
        if (referredData.premiumStatus !== 'premium') {
          console.log('🎁 Granting 1-month premium to referred user');

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
      }

      // Commit all updates
      await batch.commit();
      console.log('✓ Referral completion batch committed');

      results.push({
        success: true,
        referralId: referral.id,
        referrerId: referral.referrerUserId,
        referredId: referral.referredUserId,
      });
    }

    return {
      success: true,
      results,
      count: results.filter(r => r.success).length,
    };
  } catch (error) {
    console.error('❌ Error completing referral:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get referral statistics for a user
 * @param {string} userId - User ID
 * @returns {object} Referral stats
 */
export const getReferralStats = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();

    // Get pending referrals
    const referralsRef = collection(db, 'referrals');
    const pendingQuery = query(
      referralsRef,
      where('referrerUserId', '==', userId),
      where('status', '==', 'pending')
    );
    const completedQuery = query(
      referralsRef,
      where('referrerUserId', '==', userId),
      where('status', '==', 'completed')
    );

    const [pendingSnapshot, completedSnapshot] = await Promise.all([
      getDocs(pendingQuery),
      getDocs(completedQuery),
    ]);

    const pendingReferrals = pendingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const completedReferrals = completedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      referralCode: userData.referralCode,
      referralCount: userData.referralCount || 0,
      premiumStatus: userData.premiumStatus || 'free',
      premiumSource: userData.premiumSource,
      premiumUnlockedAt: userData.premiumUnlockedAt,
      premiumExpiresAt: userData.premiumExpiresAt,
      pendingReferrals,
      completedReferrals,
      referralLink: `https://dividela.co/r/${userData.referralCode}`,
    };
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return null;
  }
};

/**
 * Award premium to a user
 * @param {string} userId - User ID
 * @param {string} source - Source of premium ('referral', 'subscription', 'referral_bonus')
 * @param {Date} expiresAt - Optional expiration date (null for forever)
 * @returns {boolean} Success status
 */
export const awardPremium = async (userId, source, expiresAt = null) => {
  try {
    console.log(`🎁 Awarding premium to user ${userId} from source: ${source}`);

    await updateDoc(doc(db, 'users', userId), {
      premiumStatus: 'premium',
      premiumSource: source,
      premiumUnlockedAt: serverTimestamp(),
      premiumExpiresAt: expiresAt,
    });

    console.log('✓ Premium awarded successfully');
    return true;
  } catch (error) {
    console.error('Error awarding premium:', error);
    return false;
  }
};

/**
 * Check if user has active premium
 * @param {object} userDetails - User details from Firestore
 * @returns {boolean} Whether user has active premium
 */
export const hasActivePremium = (userDetails) => {
  if (!userDetails) return false;

  if (userDetails.premiumStatus !== 'premium') return false;

  // If no expiration, premium is forever
  if (!userDetails.premiumExpiresAt) return true;

  // Check if expired
  const now = new Date();
  const expiresAt = userDetails.premiumExpiresAt.toDate
    ? userDetails.premiumExpiresAt.toDate()
    : new Date(userDetails.premiumExpiresAt);

  return now < expiresAt;
};

/**
 * Get premium feature gates
 * Returns list of features and whether user has access
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
 * Clean up expired referrals
 * Should be called periodically (e.g., daily via Cloud Function)
 * @returns {number} Number of referrals expired
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

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
    });

    await batch.commit();

    console.log(`Expired ${snapshot.docs.length} referrals`);
    return snapshot.docs.length;
  } catch (error) {
    console.error('Error cleaning up expired referrals:', error);
    return 0;
  }
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
