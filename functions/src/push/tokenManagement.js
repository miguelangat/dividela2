/**
 * Push Token Management
 *
 * Callable functions for registering and unregistering push notification tokens.
 * Supports both Expo push tokens (mobile) and FCM tokens (web).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

/**
 * Register a push notification token for a user
 * Callable function - requires authentication
 */
exports.registerPushToken = onCall(async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { token, platform, deviceInfo } = request.data;
  const userId = request.auth.uid;

  // Validate input
  if (!token) {
    throw new HttpsError('invalid-argument', 'Token is required');
  }

  if (!platform || !['ios', 'android', 'web'].includes(platform)) {
    throw new HttpsError('invalid-argument', 'Valid platform is required (ios, android, web)');
  }

  // Validate token format based on platform
  if (platform !== 'web' && !Expo.isExpoPushToken(token)) {
    throw new HttpsError('invalid-argument', 'Invalid Expo push token format');
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    let pushTokens = userData.pushTokens || [];

    // Check if token already exists
    const existingIndex = pushTokens.findIndex((t) => t.token === token);

    if (existingIndex >= 0) {
      // Update existing token
      pushTokens[existingIndex] = {
        ...pushTokens[existingIndex],
        isValid: true,
        updatedAt: new Date().toISOString(),
      };
      console.log(`Updated existing push token for user ${userId}`);
    } else {
      // Add new token
      const newToken = {
        token,
        platform,
        deviceInfo: deviceInfo || null,
        registeredAt: new Date().toISOString(),
        isValid: true,
      };
      pushTokens.push(newToken);
      console.log(`Registered new ${platform} push token for user ${userId}`);
    }

    // Limit to 10 tokens per user (to prevent abuse)
    if (pushTokens.length > 10) {
      // Remove oldest tokens
      pushTokens = pushTokens
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
        .slice(0, 10);
    }

    // Update user document
    await userRef.update({ pushTokens });

    return { success: true, message: 'Token registered successfully' };
  } catch (error) {
    console.error('Error registering push token:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to register token');
  }
});

/**
 * Unregister a push notification token
 * Callable function - requires authentication
 */
exports.unregisterPushToken = onCall(async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { token } = request.data;
  const userId = request.auth.uid;

  if (!token) {
    throw new HttpsError('invalid-argument', 'Token is required');
  }

  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const pushTokens = userData.pushTokens || [];

    // Filter out the token to remove
    const updatedTokens = pushTokens.filter((t) => t.token !== token);

    if (updatedTokens.length === pushTokens.length) {
      // Token was not found
      console.log(`Token not found for user ${userId}`);
      return { success: true, message: 'Token not found (already removed)' };
    }

    // Update user document
    await userRef.update({ pushTokens: updatedTokens });

    console.log(`Unregistered push token for user ${userId}`);
    return { success: true, message: 'Token unregistered successfully' };
  } catch (error) {
    console.error('Error unregistering push token:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to unregister token');
  }
});

/**
 * Mark a token as invalid (called when push notification fails)
 */
async function markTokenInvalid(userId, token) {
  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return;
    }

    const userData = userDoc.data();
    const pushTokens = userData.pushTokens || [];

    // Find and mark token as invalid
    const updatedTokens = pushTokens.map((t) => {
      if (t.token === token) {
        return { ...t, isValid: false, invalidatedAt: new Date().toISOString() };
      }
      return t;
    });

    await userRef.update({ pushTokens: updatedTokens });
    console.log(`Marked token as invalid for user ${userId}`);
  } catch (error) {
    console.error('Error marking token as invalid:', error);
  }
}

/**
 * Cleanup invalid and old tokens
 * Scheduled to run daily at 3 AM
 */
exports.cleanupInvalidTokens = onSchedule(
  {
    schedule: '0 3 * * *', // 3 AM daily
    timeZone: 'America/New_York',
    retryCount: 1,
  },
  async () => {
    console.log('Starting push token cleanup...');

    try {
      const db = admin.firestore();

      // Get all users with push tokens
      const usersSnapshot = await db
        .collection('users')
        .where('pushTokens', '!=', [])
        .get();

      let totalCleaned = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const pushTokens = userData.pushTokens || [];

        // Filter out invalid tokens and tokens older than 30 days without recent activity
        const validTokens = pushTokens.filter((t) => {
          // Remove explicitly invalid tokens
          if (t.isValid === false) {
            return false;
          }

          // Remove tokens that were invalidated
          if (t.invalidatedAt) {
            return false;
          }

          // Keep tokens that were updated/used recently
          const lastActivity = t.updatedAt || t.registeredAt;
          if (lastActivity && new Date(lastActivity) < thirtyDaysAgo) {
            // Token is old and hasn't been updated
            return false;
          }

          return true;
        });

        // Update if tokens were removed
        if (validTokens.length !== pushTokens.length) {
          const removed = pushTokens.length - validTokens.length;
          totalCleaned += removed;

          await userDoc.ref.update({ pushTokens: validTokens });
          console.log(`Cleaned ${removed} tokens for user ${userDoc.id}`);
        }
      }

      console.log(`Push token cleanup complete. Removed ${totalCleaned} tokens.`);
    } catch (error) {
      console.error('Error during push token cleanup:', error);
    }
  }
);

module.exports = {
  registerPushToken: exports.registerPushToken,
  unregisterPushToken: exports.unregisterPushToken,
  cleanupInvalidTokens: exports.cleanupInvalidTokens,
  markTokenInvalid,
};
