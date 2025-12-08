# Email Notification System

## Overview

The Dividela email notification system uses **AWS SES (Simple Email Service)** with **Nodemailer** to send transactional emails to users. The system is built on Firebase Cloud Functions v2.

## Features

### Notification Types

1. **Budget Alerts** (`checkBudgetOnExpenseAdded`)
   - Triggered at 80%, 90%, and 100% of budget
   - Sent to both partners
   - Shows budget usage and remaining amount

2. **Partner Activity** (`notifyPartnerOnExpenseAdded`)
   - Notifies when partner adds an expense
   - Optional (can be disabled in preferences)
   - Shows expense details

3. **Partner Invitations** (`sendPartnerInvitation`)
   - Sent when one partner invites another
   - Includes invitation code
   - Auto-triggered on couple code creation

4. **Savings Milestones** (`checkSavingsGoalMilestone`)
   - Triggered at 25%, 50%, 75%, and 100% of goal
   - Celebrates progress with visual progress bars

5. **Fiscal Year Reminders** (`checkFiscalYearEndReminders`) 
   - Scheduled function (runs daily)
   - Reminds couples X days before fiscal year end

## Setup

### 1. AWS SES Configuration

**Create SES Account:**
1. Go to AWS Console > SES
2. Choose region (recommend `us-east-1`)
3. Create account

**Verify Email/Domain:**
```bash
# For testing - verify single email
SES > Verified Identities > Create Identity > Email
# Enter: noreply@dividela.com

# For production - verify domain
SES > Verified Identities > Create Identity > Domain
# Enter: dividela.com
# Add DNS records for DKIM, SPF, DMARC
```

**Generate SMTP Credentials:**
```bash
SES > SMTP Settings > Create SMTP Credentials
# Download credentials (username + password)
```

**Request Production Access:**
```bash
SES > Account Dashboard > Request production access
# Fill use case form
# Wait for approval (usually 24 hours)
```

### 2. Environment Variables

**Option A: Firebase Secrets (Recommended for Production)**
```bash
# Set secrets
firebase functions:secrets:set SES_SMTP_USER
firebase functions:secrets:set SES_SMTP_PASS

# Set config
firebase functions:config:set \
  ses.smtp_host="email-smtp.us-east-1.amazonaws.com" \
  ses.from_email="noreply@dividela.com" \
  ses.from_name="Dividela"
```

**Option B: .env File (Local Testing)**
```bash
# Copy example file
cp .env.example .env

# Edit .env with your values:
SES_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SES_SMTP_USER=your_smtp_username
SES_SMTP_PASS=your_smtp_password
FROM_EMAIL=noreply@dividela.com
FROM_NAME=Dividela
```

### 3. Deploy Functions

```bash
# Install dependencies
cd functions
npm install

# Deploy all functions
firebase deploy --only functions

# Or deploy specific notification functions
firebase deploy --only functions:checkBudgetOnExpenseAdded,functions:notifyPartnerOnExpenseAdded
```

## Testing

### Test SMTP Connection

**Simple Test:**
```bash
curl "https://us-central1-PROJECT_ID.cloudfunctions.net/testEmail?to=your@email.com"
```

**Comprehensive Test (with SMTP verification):**
```bash
curl -X POST \
  "https://us-central1-PROJECT_ID.cloudfunctions.net/testSendEmail" \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

### Test Email Templates

```bash
# Test budget alert template
curl -X POST \
  "https://us-central1-PROJECT_ID.cloudfunctions.net/testEmailTemplates" \
  -H "Content-Type: application/json" \
  -d '{"template":"monthlyBudgetAlert","email":"your@email.com"}'

# Test invitation template
curl -X POST \
  "https://us-central1-PROJECT_ID.cloudfunctions.net/testEmailTemplates" \
  -H "Content-Type: application/json" \
  -d '{"template":"partnerInvitation","email":"your@email.com"}'
```

**Available Templates:**
- `monthlyBudgetAlert`
- `savingsGoalMilestone`
- `partnerInvitation`
- `expenseAdded`
- `fiscalYearEndReminder`

### Test Triggers

**Budget Alert:**
1. Create a monthly budget in app
2. Add expenses to cross 80% threshold
3. Check Firestore `emailLog` collection
4. Verify email received

**Partner Invitation:**
1. Generate invitation code in app
2. Check `coupleCodes` collection for `emailSent: true`
3. Verify invitation email received

## Architecture

```
functions/src/email/
├── sesEmailService.js       # Core email service (SMTP, templates)
├── emailService.js          # Legacy email service (fallback)
├── templates.js             # HTML email templates
├── notificationTriggers.js  # Firestore triggers
├── scheduledChecks.js       # Scheduled functions (cron)
└── testEmail.js             # Test endpoints
```

### Data Flow

```
App Event (e.g., expense added)
  ↓
Firestore Document Created/Updated
  ↓
Cloud Function Trigger Activated
  ↓
Check Notification Preferences
  ↓
Get User Emails from Auth
  ↓
Generate HTML from Template
  ↓
Send via AWS SES SMTP
  ↓
Log Email Sent to Firestore
```

## Notification Preferences

Stored in Firestore: `coupleSettings/{coupleId}`

```javascript
{
  notifications: {
    emailEnabled: true,              // Master toggle
    monthlyBudgetAlert: true,        // Budget alerts
    savingsGoalMilestone: true,      // Savings milestones
    partnerActivity: false,          // Partner expense notifications
    fiscalYearEndReminder: true,     // Year-end reminders
    daysBeforeFiscalYearEnd: 30,    // Days before reminder
  }
}
```

### Checking Preferences

```javascript
const { isNotificationEnabled } = require('./sesEmailService');

const enabled = await isNotificationEnabled(coupleId, 'monthlyBudgetAlert');
if (!enabled) {
  console.log('Notifications disabled, skipping');
  return;
}
```

## Email Logging

All sent emails are logged to: `emailLog/{logId}`

```javascript
{
  coupleId: string,
  userId: string,
  type: string,               // e.g., 'monthlyBudgetAlert'
  messageId: string,          // SES message ID
  success: boolean,
  error: string | null,
  sentAt: timestamp
}
```

**Query logs:**
```javascript
db.collection('emailLog')
  .where('coupleId', '==', coupleId)
  .where('type', '==', 'monthlyBudgetAlert')
  .orderBy('sentAt', 'desc')
  .limit(10)
```

## Troubleshooting

### SMTP Connection Failed

**Error:** `SMTP connection failed`

**Solutions:**
- Verify SMTP credentials are correct
- Check region matches (e.g., `us-east-1`)
- Ensure SES sandbox mode is exited (for non-verified emails)
- Check firewall/network allows port 465 (SMTPS)

### Email Not Received

**Check:**
1. Email log in Firestore (`emailLog` collection)
2. AWS SES sending statistics (AWS Console > SES > Dashboards)
3. Spam folder
4. Email preferences (`coupleSettings` collection)
5. SES sandbox mode (can only send to verified emails)

### Invalid Sender Email

**Error:** `Email address is not verified`

**Solution:**
- Verify sender email in SES console
- Or verify entire domain with DNS records
- If in sandbox mode, both sender and recipient must be verified

## Production Checklist

- [ ] AWS SES account created
- [ ] Domain verified with DKIM/SPF/DMARC
- [ ] SMTP credentials generated and secured
- [ ] Production access approved (out of sandbox)
- [ ] Environment variables set in Firebase
- [ ] Functions deployed successfully
- [ ] Test emails sent and received
- [ ] Email logging verified
- [ ] Unsubscribe functionality tested
- [ ] Bounce/complaint handling configured
- [ ] Monitoring/alerting set up

## Monitoring

### Firebase Logs

```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only checkBudgetOnExpenseAdded

# Follow logs in real-time
firebase functions:log --follow
```

### AWS SES Metrics

AWS Console > SES > Sending Statistics:
- Sends
- Deliveries
- Bounces
- Complaints

## Rate Limits

**SES Sandbox Mode:**
- 200 emails per 24 hours
- 1 email per second
- Recipients must be verified

**SES Production Mode:**
- Starts at 10 emails per second
- Can request increase
- No recipient verification required

## Security

**Best Practices:**
- Never commit `.env` file
- Use Firebase Secrets for production
- Rotate SMTP credentials regularly
- Monitor SES sending statistics
- Implement bounce/complaint handling
- Use SPF/DKIM/DMARC for deliverability

## Future Enhancements

- [ ] Email digest (daily/weekly summaries)
- [ ] Unsubscribe page implementation
- [ ] Bounce/complaint webhook handlers
- [ ] Email preview in browser
- [ ] A/B testing for templates
- [ ] Internationalization (i18n)
- [ ] SMS notifications (AWS SNS)
- [ ] In-app notification center
