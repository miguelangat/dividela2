/**
 * Push Notification Module Exports
 *
 * Exports all push notification related functions and services.
 */

const {
  isPushEnabled,
  getUserPushTokens,
  sendPushToUser,
  sendPushToCouple,
  sendPushToPartner,
  sendToMobileTokens,
  sendToWebTokens,
  logPushSent,
} = require('./pushNotificationService');

const {
  registerPushToken,
  unregisterPushToken,
  cleanupInvalidTokens,
  markTokenInvalid,
} = require('./tokenManagement');

// Export callable functions for Cloud Functions
module.exports = {
  // Callable functions (exported as Cloud Functions)
  registerPushToken,
  unregisterPushToken,
  cleanupInvalidTokens,

  // Internal service functions (for use in other triggers)
  isPushEnabled,
  getUserPushTokens,
  sendPushToUser,
  sendPushToCouple,
  sendPushToPartner,
  sendToMobileTokens,
  sendToWebTokens,
  logPushSent,
  markTokenInvalid,
};
