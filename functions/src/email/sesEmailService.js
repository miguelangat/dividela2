/**
 * Direct AWS SES Email Service using Nodemailer
 *
 * This service sends emails directly via AWS SES SMTP without using Firebase Extension.
 *
 * Benefits:
 * - More control over email sending
 * - Access to all Nodemailer features (attachments, etc.)
 * - Better error handling
 * - No Firebase Extension dependency
 */

const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const functions = require('firebase-functions');

// SES Configuration - Store these in Firebase Config or Secret Manager
const SES_CONFIG = {
  host: process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
  port: 465,
  secure: true, // Use TLS
  auth: {
    user: process.env.SES_SMTP_USER || functions.config().ses?.smtp_user,
    pass: process.env.SES_SMTP_PASS || functions.config().ses?.smtp_pass,
  },
};

const DEFAULT_FROM = {
  email: process.env.FROM_EMAIL || 'noreply@dividela.com',
  name: process.env.FROM_NAME || 'Dividela',
};

// Create reusable transporter
let transporter = null;

/**
 * Get or create email transporter
 * @returns {nodemailer.Transporter}
 */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(SES_CONFIG);

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SES SMTP connection failed:', error);
      } else {
        console.log('✅ SES SMTP server ready to send emails');
      }
    });
  }

  return transporter;
}

/**
 * Send an email via AWS SES
 *
 * @param {Object} emailData - Email data
 * @param {string|string[]} emailData.to - Recipient email(s)
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - HTML content
 * @param {string} [emailData.text] - Plain text content (optional)
 * @param {string} [emailData.from] - FROM email (optional, uses default)
 * @param {string} [emailData.fromName] - FROM name (optional, uses default)
 * @param {Object} [emailData.attachments] - Attachments (optional)
 * @returns {Promise<Object>} Send result
 */
async function sendEmail({ to, subject, html, text, from, fromName, attachments }) {
  try {
    const mailOptions = {
      from: `"${fromName || DEFAULT_FROM.name}" <${from || DEFAULT_FROM.email}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || stripHtml(html),
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', info.messageId);
    console.log('   To:', to);
    console.log('   Subject:', subject);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

/**
 * Send email using a template
 *
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {Function} params.template - Template function (from templates.js)
 * @param {Object} params.templateData - Data to pass to template
 * @param {string} params.subject - Email subject
 * @returns {Promise<Object>} Send result
 */
async function sendTemplateEmail({ to, template, templateData, subject }) {
  try {
    const html = template(templateData);

    return await sendEmail({
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('❌ Error sending template email:', error);
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
 * @param {string} logData.messageId - SES message ID
 * @param {boolean} logData.success - Success status
 * @param {string} logData.error - Error message if failed
 */
async function logEmailSent({ coupleId, userId, type, messageId, success, error = null }) {
  const db = admin.firestore();

  const logDoc = {
    coupleId,
    userId,
    type,
    messageId,
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

/**
 * Send test email (for debugging)
 *
 * @param {string} toEmail - Recipient email
 * @returns {Promise<Object>} Send result
 */
async function sendTestEmail(toEmail) {
  return await sendEmail({
    to: toEmail,
    subject: 'Test Email from Dividela',
    html: `
      <h1>Test Email</h1>
      <p>If you're seeing this, AWS SES is working correctly!</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `,
  });
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
  sendTestEmail,
  getTransporter, // Expose for testing
};
