/**
 * Email Templates
 *
 * HTML email templates for different notification types.
 * These templates use inline CSS for maximum email client compatibility.
 */

const { formatCurrency, createUnsubscribeLink } = require('./emailService');

/**
 * Base email template wrapper
 */
function baseTemplate({ content, coupleId, notificationType }) {
  const unsubscribeLink = createUnsubscribeLink(coupleId, notificationType);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dividela Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Dividela</h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Expense Tracking for Couples</p>
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
            <td style="background-color: #f8f9fa; padding: 20px 40px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #666666; text-align: center;">
                You're receiving this email because you have notifications enabled in Dividela.
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
                <a href="${unsubscribeLink}" style="color: #667eea; text-decoration: none;">Unsubscribe from these emails</a> |
                <a href="https://dividela.com" style="color: #667eea; text-decoration: none;">Visit Dividela</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Monthly Budget Alert Email
 */
function monthlyBudgetAlertTemplate({
  coupleId,
  userName,
  month,
  year,
  budgetAmount,
  spentAmount,
  percentageUsed,
  remainingAmount,
  currency = 'USD',
  locale = 'en-US',
}) {
  const isOverBudget = percentageUsed >= 100;
  const statusColor = percentageUsed >= 100 ? '#f44336' : percentageUsed >= 90 ? '#ffc107' : '#667eea';

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">
      ${isOverBudget ? '⚠️ Budget Exceeded' : '📊 Budget Alert'}
    </h2>

    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
      Hi ${userName},
    </p>

    <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.5;">
      Your ${month} ${year} budget has reached <strong style="color: ${statusColor};">${percentageUsed}%</strong> usage.
    </p>

    <!-- Budget Stats -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
      <tr>
        <td>
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #666666; font-size: 14px;">Budget</td>
              <td align="right" style="color: #333333; font-size: 16px; font-weight: 600;">
                ${formatCurrency(budgetAmount, currency, locale)}
              </td>
            </tr>
            <tr>
              <td style="color: #666666; font-size: 14px;">Spent</td>
              <td align="right" style="color: ${statusColor}; font-size: 16px; font-weight: 600;">
                ${formatCurrency(spentAmount, currency, locale)}
              </td>
            </tr>
            <tr style="border-top: 2px solid #e0e0e0;">
              <td style="color: #666666; font-size: 14px; padding-top: 12px;">
                ${isOverBudget ? 'Over Budget' : 'Remaining'}
              </td>
              <td align="right" style="color: ${isOverBudget ? '#f44336' : '#4caf50'}; font-size: 18px; font-weight: 700; padding-top: 12px;">
                ${formatCurrency(Math.abs(remainingAmount), currency, locale)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Progress Bar -->
    <div style="background-color: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 30px;">
      <div style="background-color: ${statusColor}; height: 12px; width: ${Math.min(percentageUsed, 100)}%;"></div>
    </div>

    ${isOverBudget
      ? `<p style="margin: 0 0 30px 0; color: #f44336; font-size: 14px; padding: 12px; background-color: #ffebee; border-radius: 6px; border-left: 4px solid #f44336;">
           You've exceeded your budget by ${formatCurrency(Math.abs(remainingAmount), currency, locale)}. Consider reviewing your expenses.
         </p>`
      : `<p style="margin: 0 0 30px 0; color: #666666; font-size: 14px;">
           ${percentageUsed >= 90
             ? 'You\'re approaching your budget limit. Plan accordingly for the rest of the month.'
             : 'Keep track of your expenses to stay within budget.'}
         </p>`
    }

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://dividela.com/budget" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            View Budget Details
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({ content, coupleId, notificationType: 'monthlyBudgetAlert' });
}

/**
 * Fiscal Year End Reminder Email
 */
function fiscalYearEndReminderTemplate({
  coupleId,
  userName,
  daysRemaining,
  fiscalYearLabel,
  totalBudget,
  totalSpent,
  currency = 'USD',
  locale = 'en-US',
}) {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">
      📅 Fiscal Year Ending Soon
    </h2>

    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
      Hi ${userName},
    </p>

    <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.5;">
      Your fiscal year <strong>${fiscalYearLabel}</strong> will end in <strong style="color: #667eea;">${daysRemaining} days</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
      <tr>
        <td>
          <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">Year-End Summary</h3>
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #666666; font-size: 14px;">Annual Budget</td>
              <td align="right" style="color: #333333; font-size: 16px; font-weight: 600;">
                ${formatCurrency(totalBudget, currency, locale)}
              </td>
            </tr>
            <tr>
              <td style="color: #666666; font-size: 14px;">Total Spent</td>
              <td align="right" style="color: #667eea; font-size: 16px; font-weight: 600;">
                ${formatCurrency(totalSpent, currency, locale)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 1.5;">
      This is a good time to:
    </p>

    <ul style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
      <li>Review your annual expenses</li>
      <li>Plan your budget for the next fiscal year</li>
      <li>Analyze spending patterns and savings</li>
      <li>Update your budget categories if needed</li>
    </ul>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://dividela.com/annual-report" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            View Annual Report
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({ content, coupleId, notificationType: 'fiscalYearEndReminder' });
}

/**
 * Savings Goal Milestone Email
 */
function savingsGoalMilestoneTemplate({
  coupleId,
  userName,
  goalName,
  targetAmount,
  currentAmount,
  percentageReached,
  currency = 'USD',
  locale = 'en-US',
}) {
  const isGoalReached = percentageReached >= 100;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">
      ${isGoalReached ? '🎉 Savings Goal Reached!' : '💰 Savings Milestone'}
    </h2>

    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
      Hi ${userName},
    </p>

    <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.5;">
      ${isGoalReached
        ? `Congratulations! You've reached your savings goal for <strong>"${goalName}"</strong>! 🎊`
        : `You've reached <strong style="color: #4caf50;">${percentageReached}%</strong> of your savings goal for <strong>"${goalName}"</strong>!`
      }
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e8f5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <tr>
        <td>
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #2e7d32; font-size: 14px;">Target</td>
              <td align="right" style="color: #1b5e20; font-size: 16px; font-weight: 600;">
                ${formatCurrency(targetAmount, currency, locale)}
              </td>
            </tr>
            <tr>
              <td style="color: #2e7d32; font-size: 14px;">Saved</td>
              <td align="right" style="color: #2e7d32; font-size: 18px; font-weight: 700;">
                ${formatCurrency(currentAmount, currency, locale)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Progress Bar -->
    <div style="background-color: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 30px;">
      <div style="background-color: #4caf50; height: 12px; width: ${Math.min(percentageReached, 100)}%;"></div>
    </div>

    <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 1.5;">
      ${isGoalReached
        ? 'Great job! Keep up the excellent financial habits.'
        : 'Keep going! You\'re making great progress toward your goal.'
      }
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://dividela.com/savings" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            View Savings Goals
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({ content, coupleId, notificationType: 'savingsGoalMilestone' });
}

/**
 * Partner Invitation Email
 */
function partnerInvitationTemplate({
  coupleId,
  senderName,
  invitationCode,
}) {
  const joinUrl = `https://dividela.com/join?code=${invitationCode}`;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">
      💑 You're Invited to Dividela!
    </h2>

    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
      <strong>${senderName}</strong> has invited you to join Dividela to track shared expenses together.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
      <tr>
        <td>
          <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">What is Dividela?</h3>
          <ul style="margin: 0; color: #666666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
            <li>Track shared expenses together</li>
            <li>Manage budgets and savings goals</li>
            <li>Stay on top of your finances as a couple</li>
            <li>Privacy-focused and secure</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; text-align: center;">
      Your invitation code:
    </p>

    <div style="background-color: #f3f0ff; border: 2px dashed #667eea; border-radius: 8px; padding: 16px; margin-bottom: 30px; text-align: center;">
      <code style="font-size: 24px; font-weight: 700; color: #667eea; letter-spacing: 2px;">${invitationCode}</code>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${joinUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 30px 0 0 0; color: #999999; font-size: 12px; text-align: center;">
      This invitation will expire in 7 days.
    </p>
  `;

  return baseTemplate({ content, coupleId, notificationType: 'partnerInvitation' });
}

/**
 * Expense Added Notification (Optional)
 */
function expenseAddedTemplate({
  coupleId,
  userName,
  partnerName,
  amount,
  description,
  category,
  date,
  currency = 'USD',
  locale = 'en-US',
}) {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">
      💳 New Expense Added
    </h2>

    <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.5;">
      ${partnerName} added a new expense to your shared budget.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
      <tr>
        <td>
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #666666; font-size: 14px;">Amount</td>
              <td align="right" style="color: #333333; font-size: 20px; font-weight: 700;">
                ${formatCurrency(amount, currency, locale)}
              </td>
            </tr>
            <tr>
              <td style="color: #666666; font-size: 14px;">Description</td>
              <td align="right" style="color: #333333; font-size: 16px; font-weight: 600;">
                ${description}
              </td>
            </tr>
            <tr>
              <td style="color: #666666; font-size: 14px;">Category</td>
              <td align="right" style="color: #667eea; font-size: 14px;">
                ${category}
              </td>
            </tr>
            <tr>
              <td style="color: #666666; font-size: 14px;">Date</td>
              <td align="right" style="color: #666666; font-size: 14px;">
                ${date}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="https://dividela.com/expenses" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            View Expense
          </a>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({ content, coupleId, notificationType: 'expenseAdded' });
}

module.exports = {
  monthlyBudgetAlertTemplate,
  fiscalYearEndReminderTemplate,
  savingsGoalMilestoneTemplate,
  partnerInvitationTemplate,
  expenseAddedTemplate,
};
