/**
 * Firebase Cloud Functions Entry Point
 *
 * This file exports all cloud functions for the Dividela expense tracking app.
 * Functions will be implemented in separate modules and exported here.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Firestore and Storage instances for use in other modules
const db = admin.firestore();
const storage = admin.storage();

// Import OCR functions
const processReceiptDirect = require('./ocr/processReceiptDirect');

// Import email notification functions
const notificationTriggers = require('./email/notificationTriggers');
const scheduledChecks = require('./email/scheduledChecks');
const unsubscribe = require('./email/unsubscribe');
const webhooks = require('./email/webhooks');
const { sendTestEmail } = require('./email/mailersendService');

// Import push notification functions
const pushNotifications = require('./push');

// Export OCR function with CORS support (for web browsers)
exports.processReceiptDirect = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Handle OPTIONS preflight
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      // Extract data from request body (Firebase SDK format)
      const data = req.body.data || req.body;

      // Build context object with authentication
      const context = { auth: null, rawRequest: req };

      // Firebase SDK sends auth context in a special format
      // Try to get token from multiple sources
      let idToken = null;

      // 1. Check Authorization header (direct HTTP calls)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        idToken = authHeader.split('Bearer ')[1];
      }

      // 2. Check Firebase callable format (context in request body)
      if (!idToken && req.body.context && req.body.context.auth) {
        idToken = req.body.context.auth.token;
      }

      // 3. Check if Firebase SDK passed it in headers
      if (!idToken && req.headers['x-callable-context-auth']) {
        try {
          const authContext = JSON.parse(req.headers['x-callable-context-auth']);
          idToken = authContext.token;
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Verify the token
      if (idToken) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          context.auth = { uid: decodedToken.uid, token: decodedToken };
          console.log('Auth successful for user:', decodedToken.uid);
        } catch (error) {
          console.error('Auth verification failed:', error);
          res.status(401).json({ error: 'Unauthorized: Invalid token' });
          return;
        }
      } else {
        console.error('No auth token found in request');
        res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
        return;
      }

      // Call the original function logic
      const result = await processReceiptDirect(data, context);

      // Return in Firebase callable format
      res.status(200).json({ result });

    } catch (error) {
      console.error('Function error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// Placeholder function to verify deployment
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.json({ message: 'Dividela Cloud Functions are running!' });
});

// ============================================================================
// Email Notification Functions (Mailersend)
// ============================================================================

// Firestore Triggers
exports.checkBudgetOnExpenseAdded = notificationTriggers.checkBudgetOnExpenseAdded;
exports.notifyPartnerOnExpenseAdded = notificationTriggers.notifyPartnerOnExpenseAdded;
exports.sendPartnerInvitation = notificationTriggers.sendPartnerInvitation;
exports.checkSavingsGoalMilestone = notificationTriggers.checkSavingsGoalMilestone;

// Scheduled Functions
exports.checkFiscalYearEndReminders = scheduledChecks.checkFiscalYearEndReminders;

// HTTP Endpoints
exports.handleUnsubscribe = unsubscribe.handleUnsubscribe;
exports.handleMailersendWebhook = webhooks.handleMailersendWebhook;

// ============================================================================
// Test & Utility Functions
// ============================================================================

// Test email function (simple test for Mailersend configuration)
// SECURITY: Restricted to emulator/development or authenticated admin users
exports.testEmail = functions.https.onRequest(async (req, res) => {
  // Only allow in emulator or with valid auth token
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  if (!isEmulator) {
    // Verify authentication in production
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
      return;
    }

    try {
      const idToken = authHeader.split('Bearer ')[1];
      await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }
  }

  const toEmail = req.query.to;

  if (!toEmail) {
    res.status(400).json({
      error: 'Missing "to" parameter. Usage: ?to=your-email@example.com',
    });
    return;
  }

  try {
    const result = await sendTestEmail(toEmail);
    res.json({
      success: true,
      messageId: result.messageId,
      message: `Test email sent successfully to ${toEmail}!`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString(),
    });
  }
});

// ============================================================================
// Push Notification Functions
// ============================================================================

// Callable Functions (token management)
exports.registerPushToken = pushNotifications.registerPushToken;
exports.unregisterPushToken = pushNotifications.unregisterPushToken;

// Scheduled Functions (cleanup)
exports.cleanupInvalidTokens = pushNotifications.cleanupInvalidTokens;

// Test function to send a push notification to a specific user
// SECURITY: Restricted to emulator/development or authenticated users can only test to themselves
exports.testPushNotification = functions.https.onRequest(async (req, res) => {
  // Only allow in emulator or with valid auth token
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  let authenticatedUserId = null;

  if (!isEmulator) {
    // Verify authentication in production
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
      return;
    }

    try {
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      authenticatedUserId = decodedToken.uid;
    } catch (error) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }
  }

  const userId = req.query.userId;

  if (!userId) {
    res.status(400).json({
      error: 'Missing "userId" parameter. Usage: ?userId=your-user-id',
    });
    return;
  }

  // In production, users can only send test notifications to themselves
  if (!isEmulator && authenticatedUserId !== userId) {
    res.status(403).json({
      error: 'Forbidden: You can only send test notifications to yourself',
    });
    return;
  }

  try {
    const result = await pushNotifications.sendPushToUser(
      userId,
      'Test Notification',
      'This is a test push notification from Dividela!',
      { screen: 'HomeTab', type: 'test' }
    );

    res.json({
      success: true,
      message: `Test push notification sent to user ${userId}`,
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
