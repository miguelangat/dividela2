# Mailersend Email Integration Setup

This guide covers setting up Mailersend for the Dividela email notification system.

## Overview

Dividela uses Mailersend for sending email notifications including:
- Monthly budget alerts (80%, 90%, 100% thresholds)
- Partner activity notifications
- Partner invitation emails
- Savings goal milestones (25%, 50%, 75%, 100%)
- Fiscal year end reminders

## Prerequisites

1. A Mailersend account (sign up at [mailersend.com](https://mailersend.com))
2. A verified sending domain
3. Firebase CLI installed

## Step 1: Create Mailersend Account

1. Go to [mailersend.com](https://mailersend.com) and sign up
2. Free tier includes 3,000 emails/month

## Step 2: Verify Your Domain

1. In Mailersend dashboard, go to **Domains**
2. Click **Add domain**
3. Enter your domain: `dividela.co`
4. Add the required DNS records:
   - SPF record
   - DKIM record
   - DMARC record (recommended)
5. Wait for verification (usually a few minutes)

## Step 3: Generate API Key

1. Go to **API Tokens** in the Mailersend dashboard
2. Click **Generate new token**
3. Name it: `dividela-production`
4. Select permissions:
   - Email: Full access
   - Templates: Read access
5. Copy the API key (starts with `mlsn.`)

## Step 4: Create Email Templates

Create the following templates in the Mailersend dashboard:

### Template 1: Monthly Budget Alert

**Template ID:** `monthly-budget-alert`

**Subject:** `Budget Alert ({{percentUsed}}%) - {{month}} {{year}}`

**Variables to use:**
- `{{userName}}` - Recipient name
- `{{percentUsed}}` - Budget percentage (80, 90, 100)
- `{{budgetAmount}}` - Total budget formatted (e.g., "$1,000.00")
- `{{spentAmount}}` - Amount spent formatted
- `{{remainingAmount}}` - Remaining amount formatted
- `{{month}}` - Month name (e.g., "December")
- `{{year}}` - Year (e.g., "2025")
- `{{unsubscribeUrl}}` - Unsubscribe link

### Template 2: Fiscal Year Reminder

**Template ID:** `fiscal-year-reminder`

**Subject:** `Fiscal Year {{fiscalYearLabel}} Ending in {{daysRemaining}} Days`

**Variables:**
- `{{userName}}` - Recipient name
- `{{daysRemaining}}` - Days until fiscal year end
- `{{fiscalYearLabel}}` - e.g., "FY 2024-2025" or "2025"
- `{{totalBudget}}` - Annual budget formatted
- `{{totalSpent}}` - Annual spending formatted
- `{{unsubscribeUrl}}` - Unsubscribe link

### Template 3: Savings Milestone

**Template ID:** `savings-milestone`

**Subject:** `Savings Milestone ({{milestone}}%): {{goalName}}`

**Variables:**
- `{{userName}}` - Recipient name
- `{{goalName}}` - Savings goal name
- `{{milestone}}` - Milestone reached (25, 50, 75, 100)
- `{{targetAmount}}` - Goal target formatted
- `{{savedAmount}}` - Amount saved formatted
- `{{unsubscribeUrl}}` - Unsubscribe link

### Template 4: Partner Invitation

**Template ID:** `partner-invitation`

**Subject:** `{{senderName}} invited you to Dividela`

**Variables:**
- `{{senderName}}` - Inviter's name
- `{{inviteCode}}` - 6-character invitation code
- `{{joinUrl}}` - Deep link to join
- `{{expirationDays}}` - Days until expiration (7)

### Template 5: Expense Added

**Template ID:** `expense-added`

**Subject:** `{{partnerName}} added an expense`

**Variables:**
- `{{userName}}` - Recipient name
- `{{partnerName}}` - Partner who added expense
- `{{amount}}` - Expense amount formatted
- `{{description}}` - Expense description
- `{{category}}` - Expense category
- `{{date}}` - Expense date formatted
- `{{unsubscribeUrl}}` - Unsubscribe link

## Step 5: Configure Environment Variables

Edit `functions/.env`:

```env
# Mailersend Configuration
MAILERSEND_API_KEY=mlsn.your_api_key_here
MAILERSEND_FROM_EMAIL=noreply@dividela.co
MAILERSEND_FROM_NAME=Dividela

# Optional: Override template IDs if different
# MAILERSEND_TEMPLATE_BUDGET_ALERT=monthly-budget-alert
# MAILERSEND_TEMPLATE_FISCAL_YEAR=fiscal-year-reminder
# MAILERSEND_TEMPLATE_SAVINGS=savings-milestone
# MAILERSEND_TEMPLATE_INVITATION=partner-invitation
# MAILERSEND_TEMPLATE_EXPENSE=expense-added

# Optional: Webhook verification secret
# MAILERSEND_WEBHOOK_SECRET=your_webhook_secret
```

## Step 6: Deploy Functions

```bash
cd functions
npm install
firebase deploy --only functions
```

## Step 7: Test Email Sending

Test your configuration:

```bash
curl "https://us-central1-dividela-76aba.cloudfunctions.net/testEmail?to=your-email@example.com"
```

You should receive a test email.

## Step 8: Configure Webhooks (Optional)

To track bounces, complaints, and delivery status:

1. In Mailersend, go to **Webhooks**
2. Click **Add webhook**
3. Enter URL: `https://us-central1-dividela-76aba.cloudfunctions.net/handleMailersendWebhook`
4. Select events:
   - `activity.bounced`
   - `activity.soft_bounced`
   - `activity.spam_complaint`
   - `activity.delivered`
   - `activity.opened`
   - `activity.clicked`
5. Copy the signing secret and add to `.env` as `MAILERSEND_WEBHOOK_SECRET`
6. Redeploy functions

## Exported Functions

| Function | Type | Description |
|----------|------|-------------|
| `checkBudgetOnExpenseAdded` | Firestore Trigger | Sends budget alerts on expense creation |
| `notifyPartnerOnExpenseAdded` | Firestore Trigger | Notifies partner of new expenses |
| `sendPartnerInvitation` | Firestore Trigger | Sends invitation emails |
| `checkSavingsGoalMilestone` | Firestore Trigger | Sends savings milestone notifications |
| `checkFiscalYearEndReminders` | Scheduled | Daily check for fiscal year reminders |
| `handleUnsubscribe` | HTTP | Handles unsubscribe requests |
| `handleMailersendWebhook` | HTTP | Processes Mailersend events |
| `testEmail` | HTTP | Sends test email |

## Firestore Collections

### emailLog
Tracks all sent emails:
```javascript
{
  coupleId: string,
  userId: string,
  type: string,           // e.g., 'monthlyBudgetAlert'
  messageId: string,      // Mailersend message ID
  success: boolean,
  error: string | null,
  sentAt: timestamp,
  provider: 'mailersend',
  // Added by webhooks:
  delivered: boolean,
  deliveredAt: timestamp,
  opened: boolean,
  openedAt: timestamp,
  clicked: boolean,
  clickedAt: timestamp,
}
```

### emailEvents
Tracks bounces and complaints:
```javascript
{
  type: string,           // 'bounce' or 'spam_complaint'
  bounceType: string,     // 'hard' or 'soft'
  email: string,
  messageId: string,
  reason: string,
  timestamp: timestamp,
}
```

### softBounces
Tracks soft bounce counts per email:
```javascript
{
  email: string,
  count: number,
  lastBounce: timestamp,
}
```

## Notification Preferences

Users can control notifications in the app. Preferences stored in `coupleSettings/{coupleId}`:

```javascript
{
  notifications: {
    emailEnabled: true,              // Master toggle
    monthlyBudgetAlert: true,
    fiscalYearEndReminder: true,
    savingsGoalMilestone: true,
    partnerActivity: false,          // Off by default
    daysBeforeFiscalYearEnd: 30,
  }
}
```

## Troubleshooting

### Emails not sending

1. Check API key is correct in `.env`
2. Verify domain is verified in Mailersend
3. Check Firebase Functions logs:
   ```bash
   firebase functions:log --only testEmail
   ```

### Template not found

1. Ensure template IDs in Mailersend match the ones in code
2. Check template is published (not draft)
3. Override template IDs in `.env` if needed

### Webhook not receiving events

1. Verify webhook URL is correct
2. Check webhook is enabled in Mailersend
3. Verify signing secret matches

### High bounce rate

1. Review `emailEvents` collection for patterns
2. Check domain reputation in Mailersend
3. Implement double opt-in for new users

## Cost Estimation

Mailersend pricing (as of 2025):
- **Free tier:** 3,000 emails/month
- **Starter:** $28/month for 50,000 emails
- **Professional:** $88/month for 200,000 emails

For a typical couple using Dividela:
- ~5 budget alerts/month
- ~2 savings milestones/month
- ~30 partner activity notifications/month (if enabled)

Total: ~37 emails/couple/month = Free tier supports ~80 active couples.
