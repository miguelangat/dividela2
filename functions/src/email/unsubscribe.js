/**
 * Unsubscribe Handler
 *
 * HTTP endpoint to handle email unsubscribe requests.
 * Updates the couple's notification preferences in Firestore.
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Map of notification types to their preference keys
 */
const NOTIFICATION_TYPE_MAP = {
  monthlyBudgetAlert: 'monthlyBudgetAlert',
  fiscalYearEndReminder: 'fiscalYearEndReminder',
  savingsGoalMilestone: 'savingsGoalMilestone',
  partnerActivity: 'partnerActivity',
  expenseAdded: 'partnerActivity', // Maps to same preference
  all: 'emailEnabled', // Master toggle
};

/**
 * Handle unsubscribe requests
 * URL format: /handleUnsubscribe?coupleId=xxx&type=monthlyBudgetAlert
 */
exports.handleUnsubscribe = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    const { coupleId, type } = req.query;

    // Validate required parameters
    if (!coupleId || !type) {
      return res.status(400).send(generateErrorPage(
        'Missing Parameters',
        'The unsubscribe link is invalid. Please use the link from your email.'
      ));
    }

    // Validate notification type
    const preferenceKey = NOTIFICATION_TYPE_MAP[type];
    if (!preferenceKey) {
      return res.status(400).send(generateErrorPage(
        'Invalid Request',
        `Unknown notification type: ${type}`
      ));
    }

    try {
      const db = admin.firestore();

      // Verify couple exists
      const coupleSettingsRef = db.collection('coupleSettings').doc(coupleId);
      const settingsDoc = await coupleSettingsRef.get();

      if (!settingsDoc.exists) {
        return res.status(404).send(generateErrorPage(
          'Not Found',
          'The account associated with this link was not found.'
        ));
      }

      // Update the notification preference
      const updateData = {
        [`notifications.${preferenceKey}`]: false,
        'notifications.lastUnsubscribed': admin.firestore.FieldValue.serverTimestamp(),
        'notifications.unsubscribedFrom': admin.firestore.FieldValue.arrayUnion(type),
      };

      await coupleSettingsRef.update(updateData);

      // Log the unsubscribe action
      await db.collection('emailLog').add({
        coupleId,
        type: 'unsubscribe',
        notificationType: type,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Return success page
      const notificationName = getNotificationName(type);
      return res.status(200).send(generateSuccessPage(notificationName));

    } catch (error) {
      console.error('Unsubscribe error:', error);
      return res.status(500).send(generateErrorPage(
        'Server Error',
        'Something went wrong. Please try again later or contact support.'
      ));
    }
  }
);

/**
 * Get human-readable name for notification type
 */
function getNotificationName(type) {
  const names = {
    monthlyBudgetAlert: 'Monthly Budget Alerts',
    fiscalYearEndReminder: 'Fiscal Year End Reminders',
    savingsGoalMilestone: 'Savings Goal Milestones',
    partnerActivity: 'Partner Activity Notifications',
    expenseAdded: 'Expense Added Notifications',
    all: 'All Email Notifications',
  };
  return names[type] || type;
}

/**
 * Generate success HTML page
 */
function generateSuccessPage(notificationType) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - Dividela</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      color: #333;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .notification-type {
      background: #f0f1f3;
      padding: 12px 20px;
      border-radius: 8px;
      display: inline-block;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 24px;
    }
    .note {
      font-size: 14px;
      color: #999;
    }
    .logo {
      margin-top: 24px;
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    </div>
    <h1>Successfully Unsubscribed</h1>
    <p>You have been unsubscribed from:</p>
    <div class="notification-type">${notificationType}</div>
    <p class="note">
      You can re-enable these notifications anytime in the Dividela app settings.
    </p>
    <div class="logo">Dividela</div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate error HTML page
 */
function generateErrorPage(title, message) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Dividela</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #f44336;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      fill: white;
    }
    h1 {
      color: #333;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
    }
    .logo {
      margin-top: 24px;
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="logo">Dividela</div>
  </div>
</body>
</html>
  `;
}
