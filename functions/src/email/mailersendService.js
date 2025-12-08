/**
 * Mailersend Email Service
 *
 * Handles email sending via Mailersend API with inline HTML templates.
 * Provides utility functions for notification preferences and logging.
 */

const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');
const admin = require('firebase-admin');

// Configuration from environment variables
const MAILERSEND_CONFIG = {
  apiKey: process.env.MAILERSEND_API_KEY,
  fromEmail: process.env.MAILERSEND_FROM_EMAIL || 'noreply@dividela.co',
  fromName: process.env.MAILERSEND_FROM_NAME || 'Dividela',
};

// Template IDs (for future use with Mailersend templates)
const TEMPLATE_IDS = {
  monthlyBudgetAlert: 'monthly-budget-alert',
  fiscalYearReminder: 'fiscal-year-reminder',
  savingsMilestone: 'savings-milestone',
  partnerInvitation: 'partner-invitation',
  expenseAdded: 'expense-added',
};

// Mailersend client instance (lazy initialization)
let mailerSendClient = null;

/**
 * Get or create the Mailersend client instance
 * @returns {MailerSend} The Mailersend client
 */
function getMailerSendClient() {
  if (!mailerSendClient) {
    if (!MAILERSEND_CONFIG.apiKey) {
      throw new Error('MAILERSEND_API_KEY environment variable is not set');
    }
    mailerSendClient = new MailerSend({
      apiKey: MAILERSEND_CONFIG.apiKey,
    });
  }
  return mailerSendClient;
}

/**
 * Base email wrapper with Dividela branding
 */
function emailWrapper(content, unsubscribeUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dividela</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Dividela</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color: #667eea;">Unsubscribe</a> | ` : ''}
                <a href="https://dividela.co" style="color: #667eea;">Dividela</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send an email using inline HTML templates
 *
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.toName - Recipient name (optional)
 * @param {string} options.subject - Email subject line
 * @param {string} options.templateId - Template type (used to select HTML template)
 * @param {Object} options.variables - Template variables
 * @returns {Promise<Object>} Send result with messageId
 */
async function sendEmail({ to, toName, subject, templateId, variables }) {
  const client = getMailerSendClient();

  const sender = new Sender(
    MAILERSEND_CONFIG.fromEmail,
    MAILERSEND_CONFIG.fromName
  );

  const recipients = [new Recipient(to, toName || '')];

  // Generate HTML content based on template type
  const html = generateEmailHtml(templateId, variables);

  const emailParams = new EmailParams()
    .setFrom(sender)
    .setTo(recipients)
    .setSubject(subject)
    .setHtml(html)
    .setText(stripHtml(html));

  try {
    const response = await client.email.send(emailParams);
    console.log(`Email sent successfully to ${to}`);
    return {
      success: true,
      messageId: response.headers?.['x-message-id'] || response.body?.message_id || 'sent',
      response: response,
    };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

/**
 * Generate HTML content based on template type
 */
function generateEmailHtml(templateId, variables) {
  let content = '';

  switch (templateId) {
    case TEMPLATE_IDS.monthlyBudgetAlert:
      content = budgetAlertTemplate(variables);
      break;
    case TEMPLATE_IDS.fiscalYearReminder:
      content = fiscalYearTemplate(variables);
      break;
    case TEMPLATE_IDS.savingsMilestone:
      content = savingsMilestoneTemplate(variables);
      break;
    case TEMPLATE_IDS.partnerInvitation:
      content = partnerInvitationTemplate(variables);
      break;
    case TEMPLATE_IDS.expenseAdded:
      content = expenseAddedTemplate(variables);
      break;
    default:
      content = `<p>Notification from Dividela</p>`;
  }

  return emailWrapper(content, variables.unsubscribeUrl);
}

/**
 * Budget Alert Template
 */
function budgetAlertTemplate(vars) {
  const isExceeded = parseInt(vars.percentUsed) >= 100;
  const statusColor = isExceeded ? '#f44336' : (parseInt(vars.percentUsed) >= 90 ? '#ff9800' : '#667eea');

  return `
    <h2 style="margin: 0 0 20px; color: #333; font-size: 22px;">
      ${isExceeded ? 'Budget Exceeded!' : 'Budget Alert'}
    </h2>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      Hi ${vars.userName},
    </p>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      ${isExceeded
        ? `Your budget for ${vars.month} ${vars.year} has been exceeded.`
        : `You've used ${vars.percentUsed}% of your budget for ${vars.month} ${vars.year}.`
      }
    </p>

    <!-- Progress Bar -->
    <div style="background-color: #f0f0f0; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden;">
      <div style="background: ${statusColor}; height: 100%; width: ${Math.min(parseInt(vars.percentUsed), 100)}%; border-radius: 10px;"></div>
    </div>

    <!-- Stats -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 15px; background-color: #f8f9fa; border-radius: 8px 0 0 8px;">
          <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Budget</p>
          <p style="margin: 5px 0 0; color: #333; font-size: 18px; font-weight: bold;">${vars.budgetAmount}</p>
        </td>
        <td style="padding: 15px; background-color: #f8f9fa;">
          <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Spent</p>
          <p style="margin: 5px 0 0; color: ${statusColor}; font-size: 18px; font-weight: bold;">${vars.spentAmount}</p>
        </td>
        <td style="padding: 15px; background-color: #f8f9fa; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Remaining</p>
          <p style="margin: 5px 0 0; color: #333; font-size: 18px; font-weight: bold;">${vars.remainingAmount}</p>
        </td>
      </tr>
    </table>

    <p style="margin: 20px 0 0; color: #999; font-size: 14px;">
      Open the Dividela app to review your expenses.
    </p>
  `;
}

/**
 * Fiscal Year Reminder Template
 */
function fiscalYearTemplate(vars) {
  return `
    <h2 style="margin: 0 0 20px; color: #333; font-size: 22px;">
      Fiscal Year Ending Soon
    </h2>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      Hi ${vars.userName},
    </p>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      Your fiscal year <strong>${vars.fiscalYearLabel}</strong> is ending in <strong>${vars.daysRemaining} days</strong>.
    </p>

    <!-- Stats -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 15px; background-color: #f8f9fa; border-radius: 8px 0 0 8px;">
          <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Annual Budget</p>
          <p style="margin: 5px 0 0; color: #333; font-size: 18px; font-weight: bold;">${vars.totalBudget}</p>
        </td>
        <td style="padding: 15px; background-color: #f8f9fa; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Total Spent</p>
          <p style="margin: 5px 0 0; color: #667eea; font-size: 18px; font-weight: bold;">${vars.totalSpent}</p>
        </td>
      </tr>
    </table>

    <p style="margin: 20px 0 0; color: #666; font-size: 14px; line-height: 1.6;">
      This is a good time to review your annual spending and plan for the upcoming fiscal year.
    </p>
  `;
}

/**
 * Savings Milestone Template
 */
function savingsMilestoneTemplate(vars) {
  const isComplete = parseInt(vars.milestone) >= 100;

  return `
    <h2 style="margin: 0 0 20px; color: #333; font-size: 22px;">
      ${isComplete ? 'Goal Reached!' : 'Savings Milestone!'}
    </h2>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      Hi ${vars.userName},
    </p>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      ${isComplete
        ? `Congratulations! You've reached your savings goal "${vars.goalName}"!`
        : `Great progress! You've reached ${vars.milestone}% of your savings goal "${vars.goalName}".`
      }
    </p>

    <!-- Progress Bar -->
    <div style="background-color: #f0f0f0; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100%; width: ${Math.min(parseInt(vars.milestone), 100)}%; border-radius: 10px;"></div>
    </div>

    <!-- Stats -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 15px; background-color: #f8f9fa; border-radius: 8px 0 0 8px;">
          <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Goal</p>
          <p style="margin: 5px 0 0; color: #333; font-size: 18px; font-weight: bold;">${vars.targetAmount}</p>
        </td>
        <td style="padding: 15px; background-color: #f8f9fa; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Saved</p>
          <p style="margin: 5px 0 0; color: #4caf50; font-size: 18px; font-weight: bold;">${vars.savedAmount}</p>
        </td>
      </tr>
    </table>

    <p style="margin: 20px 0 0; color: #999; font-size: 14px;">
      ${isComplete ? 'Time to celebrate!' : 'Keep up the great work!'}
    </p>
  `;
}

/**
 * Partner Invitation Template
 */
function partnerInvitationTemplate(vars) {
  return `
    <h2 style="margin: 0 0 20px; color: #333; font-size: 22px;">
      You're Invited!
    </h2>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      <strong>${vars.senderName}</strong> has invited you to join them on Dividela, the couples expense tracking app.
    </p>

    <p style="margin: 0 0 10px; color: #666; font-size: 14px;">Your invitation code:</p>
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 4px;">${vars.inviteCode}</p>
    </div>

    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      Download the Dividela app and enter this code to connect with ${vars.senderName}.
    </p>

    <table role="presentation" style="width: 100%; margin: 20px 0;">
      <tr>
        <td style="text-align: center;">
          <a href="${vars.joinUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Join Now</a>
        </td>
      </tr>
    </table>

    <p style="margin: 20px 0 0; color: #999; font-size: 14px; text-align: center;">
      This invitation expires in ${vars.expirationDays} days.
    </p>
  `;
}

/**
 * Expense Added Template
 */
function expenseAddedTemplate(vars) {
  return `
    <h2 style="margin: 0 0 20px; color: #333; font-size: 22px;">
      New Expense Added
    </h2>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      Hi ${vars.userName},
    </p>
    <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
      <strong>${vars.partnerName}</strong> just added a new expense:
    </p>

    <!-- Expense Card -->
    <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table role="presentation" style="width: 100%;">
        <tr>
          <td>
            <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Amount</p>
            <p style="margin: 5px 0 0; color: #667eea; font-size: 24px; font-weight: bold;">${vars.amount}</p>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 15px;">
            <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Description</p>
            <p style="margin: 5px 0 0; color: #333; font-size: 16px;">${vars.description}</p>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 15px;">
            <table role="presentation" style="width: 100%;">
              <tr>
                <td style="width: 50%;">
                  <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Category</p>
                  <p style="margin: 5px 0 0; color: #333; font-size: 14px;">${vars.category}</p>
                </td>
                <td style="width: 50%;">
                  <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Date</p>
                  <p style="margin: 5px 0 0; color: #333; font-size: 14px;">${vars.date}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 20px 0 0; color: #999; font-size: 14px;">
      Open the Dividela app to view details.
    </p>
  `;
}

/**
 * Send a raw HTML email (for custom content)
 */
async function sendRawEmail({ to, toName, subject, html, text }) {
  const client = getMailerSendClient();

  const sender = new Sender(
    MAILERSEND_CONFIG.fromEmail,
    MAILERSEND_CONFIG.fromName
  );

  const recipients = [new Recipient(to, toName || '')];

  const emailParams = new EmailParams()
    .setFrom(sender)
    .setTo(recipients)
    .setSubject(subject)
    .setHtml(html)
    .setText(text || stripHtml(html));

  try {
    const response = await client.email.send(emailParams);
    console.log(`Raw email sent successfully to ${to}`);
    return {
      success: true,
      messageId: response.headers?.['x-message-id'] || response.body?.message_id || 'sent',
      response: response,
    };
  } catch (error) {
    console.error(`Failed to send raw email to ${to}:`, error);
    throw error;
  }
}

/**
 * Strip HTML tags from content (for plain text fallback)
 */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get user email from Firebase Auth
 */
async function getUserEmail(userId) {
  if (!userId) {
    console.error('getUserEmail: userId is required');
    return null;
  }

  try {
    const userRecord = await admin.auth().getUser(userId);
    return userRecord.email || null;
  } catch (error) {
    console.error(`Error fetching email for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get user display name from Firestore
 */
async function getUserDisplayName(userId) {
  if (!userId) {
    return 'there';
  }

  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.data()?.displayName || 'there';
  } catch (error) {
    console.error(`Error fetching display name for user ${userId}:`, error);
    return 'there';
  }
}

/**
 * Get couple notification preferences from Firestore
 */
async function getCoupleNotificationPreferences(coupleId) {
  if (!coupleId) {
    console.error('getCoupleNotificationPreferences: coupleId is required');
    return getDefaultNotificationPreferences();
  }

  try {
    const db = admin.firestore();
    const settingsDoc = await db.collection('coupleSettings').doc(coupleId).get();

    if (!settingsDoc.exists) {
      console.log(`No settings found for couple ${coupleId}, using defaults`);
      return getDefaultNotificationPreferences();
    }

    const settings = settingsDoc.data();
    return settings.notifications || getDefaultNotificationPreferences();
  } catch (error) {
    console.error(`Error fetching notification preferences for couple ${coupleId}:`, error);
    return getDefaultNotificationPreferences();
  }
}

/**
 * Get default notification preferences
 */
function getDefaultNotificationPreferences() {
  return {
    emailEnabled: true,
    monthlyBudgetAlert: true,
    monthlyBudgetThreshold: 80,
    annualBudgetAlert: true,
    fiscalYearEndReminder: true,
    savingsGoalMilestone: true,
    partnerActivity: false,
    daysBeforeFiscalYearEnd: 30,
  };
}

/**
 * Check if a specific notification type is enabled for a couple
 */
async function isNotificationEnabled(coupleId, notificationType) {
  const preferences = await getCoupleNotificationPreferences(coupleId);

  // Master toggle must be on
  if (!preferences.emailEnabled) {
    return false;
  }

  // Check specific notification type
  return preferences[notificationType] === true;
}

/**
 * Log email sent to Firestore for tracking
 */
async function logEmailSent({ coupleId, userId, type, messageId, success, error }) {
  try {
    const db = admin.firestore();
    const logRef = await db.collection('emailLog').add({
      coupleId: coupleId || null,
      userId: userId || null,
      type: type || 'unknown',
      messageId: messageId || null,
      success: success === true,
      error: error || null,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      provider: 'mailersend',
    });

    console.log(`Email log created: ${logRef.id}`);
    return logRef.id;
  } catch (logError) {
    console.error('Failed to log email:', logError);
    return null;
  }
}

/**
 * Generate unsubscribe URL for a notification type
 */
function generateUnsubscribeUrl(coupleId, type) {
  const baseUrl = process.env.UNSUBSCRIBE_BASE_URL || 'https://us-central1-dividela-76aba.cloudfunctions.net/handleUnsubscribe';
  return `${baseUrl}?coupleId=${encodeURIComponent(coupleId)}&type=${encodeURIComponent(type)}`;
}

/**
 * Format currency amount for display in emails
 */
function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount || 0);
}

/**
 * Format date for display in emails
 */
function formatDate(date, locale = 'en-US') {
  if (!date) {
    return 'N/A';
  }

  let dateObj;

  // Handle Firestore Timestamp (has toDate method)
  if (typeof date.toDate === 'function') {
    dateObj = date.toDate();
  }
  // Handle Firestore Timestamp object with _seconds
  else if (date._seconds !== undefined) {
    dateObj = new Date(date._seconds * 1000);
  }
  // Handle seconds timestamp (number)
  else if (typeof date === 'number') {
    // If it's a Unix timestamp in seconds (less than year 3000 in ms)
    dateObj = date < 100000000000 ? new Date(date * 1000) : new Date(date);
  }
  // Handle ISO string
  else if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  // Handle Date object
  else if (date instanceof Date) {
    dateObj = date;
  }
  else {
    console.log('Unknown date format:', typeof date, date);
    return 'N/A';
  }

  // Validate the date
  if (isNaN(dateObj.getTime())) {
    console.log('Invalid date:', date);
    return 'N/A';
  }

  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Send a test email to verify configuration
 */
async function sendTestEmail(toEmail) {
  return sendRawEmail({
    to: toEmail,
    toName: 'Test User',
    subject: 'Dividela Test Email - Mailersend',
    html: emailWrapper(`
      <h2 style="margin: 0 0 20px; color: #333; font-size: 22px;">Test Email</h2>
      <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
        If you're reading this, your Mailersend integration is working correctly!
      </p>
      <p style="margin: 0; color: #999; font-size: 14px;">
        Sent at: ${new Date().toISOString()}
      </p>
    `),
  });
}

module.exports = {
  // Email sending
  sendEmail,
  sendRawEmail,
  sendTestEmail,

  // User data helpers
  getUserEmail,
  getUserDisplayName,

  // Notification preferences
  getCoupleNotificationPreferences,
  isNotificationEnabled,
  getDefaultNotificationPreferences,

  // Logging
  logEmailSent,

  // Utilities
  generateUnsubscribeUrl,
  formatCurrency,
  formatDate,

  // Template IDs (for reference)
  TEMPLATE_IDS,
};
