/**
 * Push Notification Service
 *
 * Handles sending push notifications to users across all platforms:
 * - iOS/Android: via Expo Push API
 * - Web: via Firebase Cloud Messaging (FCM)
 */

const { Expo } = require('expo-server-sdk');
const admin = require('firebase-admin');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Check if push notifications are enabled for a couple and notification type
 */
async function isPushEnabled(coupleId, notificationType) {
  try {
    const db = admin.firestore();
    const settingsDoc = await db.collection('coupleSettings').doc(coupleId).get();

    if (!settingsDoc.exists) {
      console.log(`No settings found for couple ${coupleId}, using defaults`);
      return true; // Default to enabled
    }

    const settings = settingsDoc.data();
    const notifications = settings.notifications || {};

    // Check master toggle
    if (notifications.pushEnabled === false) {
      console.log(`Push notifications disabled for couple ${coupleId}`);
      return false;
    }

    // Check specific notification type
    if (notificationType && notifications[notificationType] === false) {
      console.log(`${notificationType} notifications disabled for couple ${coupleId}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking push preferences:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Get user's push tokens from Firestore
 */
async function getUserPushTokens(userId) {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return [];
    }

    const userData = userDoc.data();
    const tokens = userData.pushTokens || [];

    // Filter only valid tokens
    return tokens.filter((t) => t.isValid !== false);
  } catch (error) {
    console.error(`Error getting push tokens for user ${userId}:`, error);
    return [];
  }
}

/**
 * Send push notifications to mobile devices via Expo Push API
 */
async function sendToMobileTokens(tokens, message) {
  if (!tokens || tokens.length === 0) {
    return { success: true, sent: 0 };
  }

  // Create the messages
  const messages = [];
  for (const tokenObj of tokens) {
    const pushToken = tokenObj.token || tokenObj;

    // Check that the push token is valid
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data || {},
      priority: 'high',
      channelId: 'default',
    });
  }

  if (messages.length === 0) {
    return { success: true, sent: 0 };
  }

  try {
    // Send in chunks (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending Expo push notification chunk:', error);
      }
    }

    // Log any errors
    const errors = tickets.filter((t) => t.status === 'error');
    if (errors.length > 0) {
      console.warn('Some Expo push notifications failed:', errors);
    }

    return {
      success: true,
      sent: tickets.filter((t) => t.status === 'ok').length,
      errors: errors.length,
      tickets,
    };
  } catch (error) {
    console.error('Error sending Expo push notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notifications to web browsers via FCM
 */
async function sendToWebTokens(tokens, message) {
  if (!tokens || tokens.length === 0) {
    return { success: true, sent: 0 };
  }

  const fcmTokens = tokens.map((t) => t.token || t);

  const fcmMessage = {
    notification: {
      title: message.title,
      body: message.body,
    },
    data: {
      ...message.data,
      // Ensure all data values are strings (FCM requirement)
      screen: message.data?.screen || '',
      type: message.data?.type || '',
    },
    webpush: {
      notification: {
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        requireInteraction: true,
      },
      fcmOptions: {
        link: message.data?.link || '/',
      },
    },
    tokens: fcmTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(fcmMessage);

    // Handle invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // Mark token as invalid if it's expired or unregistered
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(fcmTokens[idx]);
          }
          console.warn(`FCM send failed for token ${idx}:`, resp.error?.message);
        }
      });

      if (failedTokens.length > 0) {
        console.log('Invalid FCM tokens to clean up:', failedTokens.length);
        // Token cleanup will be handled separately
      }
    }

    return {
      success: true,
      sent: response.successCount,
      errors: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending FCM push notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to a single user (all their devices)
 */
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    const tokens = await getUserPushTokens(userId);

    if (tokens.length === 0) {
      console.log(`No push tokens for user ${userId}`);
      return { success: true, sent: 0 };
    }

    // Separate mobile and web tokens
    const mobileTokens = tokens.filter((t) => t.platform !== 'web');
    const webTokens = tokens.filter((t) => t.platform === 'web');

    const message = { title, body, data };

    // Send to both platforms in parallel
    const [mobileResult, webResult] = await Promise.all([
      sendToMobileTokens(mobileTokens, message),
      sendToWebTokens(webTokens, message),
    ]);

    const totalSent = (mobileResult.sent || 0) + (webResult.sent || 0);
    const totalErrors = (mobileResult.errors || 0) + (webResult.errors || 0);

    return {
      success: true,
      sent: totalSent,
      errors: totalErrors,
      mobile: mobileResult,
      web: webResult,
    };
  } catch (error) {
    console.error(`Error sending push to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to both partners in a couple
 */
async function sendPushToCouple(coupleId, title, body, data = {}) {
  try {
    const db = admin.firestore();

    // Get couple document
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    if (!coupleDoc.exists) {
      console.log(`Couple ${coupleId} not found`);
      return { success: false, error: 'Couple not found' };
    }

    const couple = coupleDoc.data();
    const partners = [couple.user1Id, couple.user2Id].filter(Boolean);

    if (partners.length === 0) {
      console.log(`No partners found for couple ${coupleId}`);
      return { success: false, error: 'No partners found' };
    }

    // Send to all partners in parallel
    const results = await Promise.all(
      partners.map((userId) => sendPushToUser(userId, title, body, data))
    );

    const totalSent = results.reduce((sum, r) => sum + (r.sent || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);

    return {
      success: true,
      sent: totalSent,
      errors: totalErrors,
      results,
    };
  } catch (error) {
    console.error(`Error sending push to couple ${coupleId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to a single partner (not the expense creator)
 */
async function sendPushToPartner(coupleId, excludeUserId, title, body, data = {}) {
  try {
    const db = admin.firestore();

    // Get couple document
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    if (!coupleDoc.exists) {
      return { success: false, error: 'Couple not found' };
    }

    const couple = coupleDoc.data();
    const partnerId = couple.user1Id === excludeUserId ? couple.user2Id : couple.user1Id;

    if (!partnerId) {
      return { success: false, error: 'Partner not found' };
    }

    return await sendPushToUser(partnerId, title, body, data);
  } catch (error) {
    console.error('Error sending push to partner:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log push notification to Firestore
 */
async function logPushSent({
  coupleId,
  userId,
  type,
  platform,
  success,
  error,
  sent,
}) {
  try {
    const db = admin.firestore();
    await db.collection('pushLog').add({
      coupleId: coupleId || null,
      userId: userId || null,
      type,
      platform: platform || 'all',
      success,
      error: error || null,
      sent: sent || 0,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    console.error('Error logging push notification:', logError);
  }
}

module.exports = {
  isPushEnabled,
  getUserPushTokens,
  sendPushToUser,
  sendPushToCouple,
  sendPushToPartner,
  sendToMobileTokens,
  sendToWebTokens,
  logPushSent,
};
