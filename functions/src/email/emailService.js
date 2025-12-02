/**
 * Email Service
 *
 * Helper functions for sending emails using Firebase Trigger Email extension.
 * The extension monitors the 'mail' collection and sends emails automatically.
 */

const admin = require('firebase-admin');

/**
 * Send an email by creating a document in the mail collection
 *
 * @param {Object} emailData - Email data
 * @param {string|string[]} emailData.to - Recipient email(s)
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - HTML content
 * @param {string} emailData.text - Plain text content (optional)
 * @param {Object} emailData.templateData - Template variables (optional)
 * @returns {Promise<string>} Document ID of the email
 */
async function sendEmail({ to, subject, html, text, templateData = {} }) {
  const db = admin.firestore();

  const emailDoc = {
    to: Array.isArray(to) ? to : [to],
    message: {
      subject,
      html,
      text: text || stripHtml(html),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Add template data if provided
  if (Object.keys(templateData).length > 0) {
    emailDoc.templateData = templateData;
  }

  try {
    const docRef = await db.collection('mail').add(emailDoc);
    console.log(`✅ Email queued for sending: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error queuing email:', error);
    throw error;
  }
}

/**
 * Send email using a template from mailTemplates collection
 *
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.templateId - Template ID from mailTemplates collection
 * @param {Object} params.variables - Variables to replace in template
 * @returns {Promise<string>} Document ID of the email
 */
async function sendTemplateEmail({ to, templateId, variables = {} }) {
  const db = admin.firestore();

  const emailDoc = {
    to: Array.isArray(to) ? to : [to],
    template: {
      name: templateId,
      data: variables,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const docRef = await db.collection('mail').add(emailDoc);
    console.log(`✅ Template email queued: ${docRef.id} (template: ${templateId})`);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error queuing template email:', error);
    throw error;
  }
}

/**
 * Get user's email from Firebase Auth
 *
 * @param {string} userId - User ID
 * @returns {Promise<string>} User's email address
 */
async function getUserEmail(userId) {
  try {
    const userRecord = await admin.auth().getUser(userId);
    return userRecord.email;
  } catch (error) {
    console.error(`❌ Error getting user email for ${userId}:`, error);
    throw error;
  }
}

/**
 * Get couple's notification preferences
 *
 * @param {string} coupleId - Couple ID
 * @returns {Promise<Object>} Notification preferences
 */
async function getCoupleNotificationPreferences(coupleId) {
  const db = admin.firestore();

  try {
    const settingsDoc = await db.collection('coupleSettings').doc(coupleId).get();

    if (!settingsDoc.exists) {
      // Return defaults if no settings exist
      return {
        emailEnabled: true,
        monthlyBudgetAlert: true,
        annualBudgetAlert: true,
        fiscalYearEndReminder: true,
        savingsGoalMilestone: true,
        daysBeforeFiscalYearEnd: 30,
      };
    }

    return settingsDoc.data().notifications || {};
  } catch (error) {
    console.error('❌ Error getting notification preferences:', error);
    throw error;
  }
}

/**
 * Check if user has opted into email notifications
 *
 * @param {string} coupleId - Couple ID
 * @param {string} notificationType - Type of notification
 * @returns {Promise<boolean>} True if opted in
 */
async function isNotificationEnabled(coupleId, notificationType) {
  const preferences = await getCoupleNotificationPreferences(coupleId);

  // Check master toggle
  if (preferences.emailEnabled === false) {
    return false;
  }

  // Check specific notification type
  return preferences[notificationType] !== false;
}

/**
 * Log email sent to track delivery
 *
 * @param {Object} logData
 * @param {string} logData.coupleId - Couple ID
 * @param {string} logData.userId - User ID
 * @param {string} logData.type - Email type
 * @param {string} logData.emailDocId - Mail collection document ID
 * @param {boolean} logData.success - Success status
 * @param {string} logData.error - Error message if failed
 */
async function logEmailSent({ coupleId, userId, type, emailDocId, success, error = null }) {
  const db = admin.firestore();

  const logDoc = {
    coupleId,
    userId,
    type,
    emailDocId,
    success,
    error,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection('emailLog').add(logDoc);
    console.log(`📧 Email log created: ${type} for user ${userId}`);
  } catch (error) {
    console.error('❌ Error logging email:', error);
    // Don't throw - logging failure shouldn't break email sending
  }
}

/**
 * Strip HTML tags from string (for plain text fallback)
 *
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace &amp; with &
    .replace(/&lt;/g, '<')   // Replace &lt; with <
    .replace(/&gt;/g, '>')   // Replace &gt; with >
    .replace(/\s+/g, ' ')    // Collapse whitespace
    .trim();
}

/**
 * Format currency for emails
 *
 * @param {number} amount - Amount
 * @param {string} currencyCode - Currency code (e.g., 'USD')
 * @param {string} locale - Locale (e.g., 'en-US')
 * @returns {string} Formatted currency
 */
function formatCurrency(amount, currencyCode = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

/**
 * Create unsubscribe link for email footer
 *
 * @param {string} coupleId - Couple ID
 * @param {string} notificationType - Type of notification
 * @returns {string} Unsubscribe URL
 */
function createUnsubscribeLink(coupleId, notificationType) {
  // TODO: Replace with your actual domain
  const baseUrl = 'https://dividela.com';
  return `${baseUrl}/unsubscribe?coupleId=${coupleId}&type=${notificationType}`;
}

module.exports = {
  sendEmail,
  sendTemplateEmail,
  getUserEmail,
  getCoupleNotificationPreferences,
  isNotificationEnabled,
  logEmailSent,
  stripHtml,
  formatCurrency,
  createUnsubscribeLink,
};
