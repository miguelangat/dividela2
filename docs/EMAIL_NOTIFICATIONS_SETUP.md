# Email Notifications Setup Guide

## Overview
This guide walks through implementing email notifications in Dividela using the Firebase "Trigger Email" extension.

## Phase 1: Install Firebase Extension

### 1.1 Install via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Dividela project
3. Navigate to **Extensions** in the left sidebar
4. Click **"Install Extension"**
5. Search for **"Trigger Email"** (official Firebase extension)
6. Click **Install**

### 1.2 Configuration

During installation, you'll be prompted for:

**Required Settings:**
- **SMTP Connection URI**: Use one of these options:
  - **Gmail** (recommended for testing): `smtps://username:password@smtp.gmail.com:465`
    - Username: Your Gmail address
    - Password: [App Password](https://myaccount.google.com/apppasswords) (NOT your regular password)
  - **SendGrid**: `smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465`
  - **AWS SES**: `smtps://username:password@email-smtp.region.amazonaws.com:465`

- **Default FROM email**: `noreply@dividela.com` (or your domain)
- **Default FROM name**: `Dividela`

**Optional Settings:**
- **Email documents collection**: `mail` (default, we'll use this)
- **Default REPLY-TO email**: Leave blank or set to `support@dividela.com`
- **Users collection**: `users` (if you want to use template variables)
- **Templates collection**: `mailTemplates` (we'll create templates here)

### 1.3 Verify Installation

After installation, the extension creates:
- A `mail` collection in Firestore (where we write documents to trigger emails)
- A `mailTemplates` collection (optional, for reusable templates)

## Phase 2: How It Works

The Trigger Email extension monitors the `mail` collection. When you create a document, it:
1. Reads the document
2. Sends the email using your SMTP settings
3. Updates the document with delivery status

**Example email document:**
```javascript
{
  to: 'user@example.com',
  message: {
    subject: 'Budget Alert',
    text: 'Plain text version',
    html: '<h1>Budget Alert</h1><p>You've reached 80% of your budget</p>'
  }
}
```

## Phase 3: Email Templates

We'll create reusable templates in the `mailTemplates` collection:

1. **Monthly Budget Alert** - `monthlyBudgetAlert`
2. **Annual Budget Alert** - `annualBudgetAlert`
3. **Fiscal Year End Reminder** - `fiscalYearEndReminder`
4. **Savings Goal Milestone** - `savingsGoalMilestone`
5. **Partner Invitation** - `partnerInvitation`
6. **Expense Added** - `expenseAdded` (optional)

## Phase 4: Implementation Plan

See implementation in:
- `functions/src/email/emailService.js` - Helper functions
- `functions/src/email/notificationTriggers.js` - Firestore triggers
- `functions/src/email/scheduledChecks.js` - Scheduled functions

## Security Notes

1. **SMTP credentials** are stored securely in Firebase Secret Manager
2. **Rate limiting**: The extension has built-in rate limiting
3. **Unsubscribe links**: We'll add to all templates (legally required)
4. **Privacy**: Only send to users who opted in

## Cost Estimation

- **Free tier**: Up to 100 emails/day with Gmail
- **SendGrid**: 100 emails/day free, then ~$15/month for 40k emails
- **AWS SES**: $0.10 per 1,000 emails

For a couple tracking expenses, ~10-20 emails/month is typical.

## Next Steps

1. Install the extension via Firebase Console (above)
2. Run the setup script to create email templates
3. Implement Cloud Functions to trigger emails
4. Add UI for email preferences in Settings
5. Test with your email address

---

**Status**: Extension needs to be installed manually via Firebase Console
**Estimated Setup Time**: 15 minutes
