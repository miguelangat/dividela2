# Direct AWS SES Integration (Without Firebase Extension)

## Overview

This guide shows you how to use AWS SES directly with Nodemailer, **without** the Firebase Trigger Email extension.

### Why Direct Integration?

**Pros**:
- ✅ More control over email sending
- ✅ Access to all Nodemailer features (attachments, CC, BCC, etc.)
- ✅ Better error handling and retry logic
- ✅ No Firebase Extension dependency
- ✅ Easier testing and debugging
- ✅ Custom rate limiting

**Cons**:
- ❌ More code to write
- ❌ Manual SMTP connection management
- ❌ Need to handle configuration yourself

---

## Setup Steps

### Step 1: Install Dependencies

Already done! Check [functions/package.json](../functions/package.json):

```json
{
  "dependencies": {
    "nodemailer": "^6.9.8"
  }
}
```

Install:
```bash
cd functions
npm install
```

### Step 2: Configure AWS SES Credentials

You have **3 options** for storing credentials:

#### Option A: Firebase Functions Config (Recommended)

```bash
cd functions

# Set SES SMTP credentials
firebase functions:config:set \
  ses.smtp_user="AKIAIOSFODNN7EXAMPLE" \
  ses.smtp_pass="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  ses.smtp_host="email-smtp.us-east-1.amazonaws.com" \
  ses.from_email="noreply@dividela.com" \
  ses.from_name="Dividela"

# View config
firebase functions:config:get
```

**Output**:
```json
{
  "ses": {
    "smtp_user": "AKIAIOSFODNN7EXAMPLE",
    "smtp_pass": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "smtp_host": "email-smtp.us-east-1.amazonaws.com",
    "from_email": "noreply@dividela.com",
    "from_name": "Dividela"
  }
}
```

#### Option B: Environment Variables (.env file)

**For local development**:

1. Create `.env` file in `functions/` directory:

```bash
# functions/.env
SES_SMTP_USER=AKIAIOSFODNN7EXAMPLE
SES_SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SES_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
FROM_EMAIL=noreply@dividela.com
FROM_NAME=Dividela
```

2. Add to `.gitignore`:

```bash
echo "functions/.env" >> .gitignore
```

3. Load in your functions:

```javascript
require('dotenv').config();
```

#### Option C: Firebase Secret Manager (Most Secure)

```bash
# Store password as secret
firebase functions:secrets:set SES_SMTP_PASS

# Access in code
const sesPass = process.env.SES_SMTP_PASS;
```

### Step 3: Update Email Service to Use SES

The new service is already created at [functions/src/email/sesEmailService.js](../functions/src/email/sesEmailService.js).

**Usage**:

```javascript
const { sendEmail, sendTemplateEmail } = require('./email/sesEmailService');
const { monthlyBudgetAlertTemplate } = require('./email/templates');

// Send simple email
await sendEmail({
  to: 'user@example.com',
  subject: 'Budget Alert',
  html: '<h1>You reached 80% of budget</h1>',
});

// Send with template
await sendTemplateEmail({
  to: ['user1@example.com', 'user2@example.com'],
  template: monthlyBudgetAlertTemplate,
  templateData: {
    userName: 'John',
    budgetAmount: 1000,
    spentAmount: 800,
    // ... other template data
  },
  subject: 'Budget Alert (80%)',
});
```

### Step 4: Update Notification Triggers

Update your notification functions to use the new SES service instead of the Firebase Extension.

**Example** - Update `notificationTriggers.js`:

```javascript
// Old (Firebase Extension)
const { sendEmail } = require('./emailService');

// New (Direct SES)
const { sendEmail, sendTemplateEmail } = require('./sesEmailService');
const { monthlyBudgetAlertTemplate } = require('./templates');

// Use it
const result = await sendTemplateEmail({
  to: userEmail,
  template: monthlyBudgetAlertTemplate,
  templateData: { /* ... */ },
  subject: 'Budget Alert',
});

console.log('Email sent:', result.messageId);
```

### Step 5: Deploy Functions

```bash
cd functions

# Deploy with new config
firebase deploy --only functions

# Or specific functions
firebase deploy --only functions:checkBudgetOnExpenseAdded
```

### Step 6: Test Email Sending

**Create test function**:

Add to `functions/src/index.js`:

```javascript
const { sendTestEmail } = require('./email/sesEmailService');

exports.testEmail = functions.https.onRequest(async (req, res) => {
  const toEmail = req.query.to || 'test@example.com';

  try {
    const result = await sendTestEmail(toEmail);
    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Test email sent successfully!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

**Test it**:

```bash
# Deploy
firebase deploy --only functions:testEmail

# Get function URL
firebase functions:list

# Test
curl "https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/testEmail?to=your-email@example.com"
```

**Check your email** - you should receive a test message!

---

## Configuration Reference

### SES SMTP Endpoints by Region

| Region | SMTP Endpoint |
|--------|---------------|
| US East (N. Virginia) | `email-smtp.us-east-1.amazonaws.com` |
| US West (Oregon) | `email-smtp.us-west-2.amazonaws.com` |
| EU (Ireland) | `email-smtp.eu-west-1.amazonaws.com` |
| Asia Pacific (Sydney) | `email-smtp.ap-southeast-2.amazonaws.com` |

### Environment Variables

```bash
SES_SMTP_USER=AKIA...           # SMTP username from AWS SES
SES_SMTP_PASS=wJalr...          # SMTP password (NOT URL-encoded!)
SES_SMTP_HOST=email-smtp...     # SMTP endpoint
FROM_EMAIL=noreply@dividela.com # Default FROM email
FROM_NAME=Dividela              # Default FROM name
```

**Note**: Unlike the Firebase Extension, you do **NOT** need to URL-encode the password when using Nodemailer directly!

---

## Advanced Features

### Attachments

```javascript
await sendEmail({
  to: 'user@example.com',
  subject: 'Invoice',
  html: '<h1>Your invoice</h1>',
  attachments: [
    {
      filename: 'invoice.pdf',
      path: '/path/to/invoice.pdf',
    },
    {
      filename: 'logo.png',
      path: 'https://dividela.com/logo.png',
    },
  ],
});
```

### CC and BCC

```javascript
await sendEmail({
  to: 'user@example.com',
  cc: 'manager@dividela.com',
  bcc: 'admin@dividela.com',
  subject: 'Budget Report',
  html: '<h1>Monthly Report</h1>',
});
```

### Custom Headers

```javascript
await sendEmail({
  to: 'user@example.com',
  subject: 'Notification',
  html: '<h1>Alert</h1>',
  headers: {
    'X-Priority': '1',
    'X-Custom-Header': 'value',
  },
});
```

### Retry Logic

```javascript
async function sendEmailWithRetry(emailData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendEmail(emailData);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Retry ${attempt}/${maxRetries} after error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

---

## Monitoring & Debugging

### View Logs

```bash
# View all function logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --only checkBudgetOnExpenseAdded

# Filter by time
firebase functions:log --since 1h
```

### Check Email Delivery

AWS SES Console → Sending Statistics:
- View sent, bounced, and complaint metrics
- Check reputation dashboard

### Test SMTP Connection

```javascript
const { getTransporter } = require('./email/sesEmailService');

exports.testConnection = functions.https.onRequest(async (req, res) => {
  try {
    const transporter = getTransporter();
    const verified = await transporter.verify();
    res.json({ success: true, message: 'SMTP connection verified!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Comparison: Firebase Extension vs Direct SES

| Feature | Firebase Extension | Direct SES (Nodemailer) |
|---------|-------------------|-------------------------|
| **Setup Complexity** | Easy (GUI) | Medium (code) |
| **Configuration** | Firebase Console | Firebase Config / Env vars |
| **Features** | Basic | Full (attachments, CC, BCC, etc.) |
| **Error Handling** | Limited | Full control |
| **Retry Logic** | Automatic | Manual |
| **Cost** | Same as SES | Same as SES |
| **Dependencies** | Firebase Extension | Nodemailer package |
| **Monitoring** | Firestore documents | Logs + SES Console |
| **Testing** | Create Firestore docs | Direct function calls |

---

## Migration from Firebase Extension

If you already have the Firebase Extension installed:

**Step 1**: Keep extension for now (backward compatibility)

**Step 2**: Deploy new SES service alongside extension

**Step 3**: Test new service with a few emails

**Step 4**: Gradually migrate functions to new service

**Step 5**: Once confident, uninstall Firebase Extension

**No downtime** - both can coexist!

---

## Troubleshooting

### Problem: "Invalid credentials"

**Solution**:
```bash
# Check config
firebase functions:config:get

# Verify credentials in AWS SES Console
# Re-generate SMTP credentials if needed
```

### Problem: "Connection timeout"

**Solution**:
```bash
# Check SMTP endpoint matches your region
# Verify port 465 is not blocked
# Check Firebase Functions has internet access (Blaze plan required)
```

### Problem: "Email not arriving"

**Solution**:
1. Check spam folder
2. Verify FROM email is verified in SES
3. Check SES sandbox mode (verify recipient if in sandbox)
4. View SES sending statistics for bounce/complaint rates

### Problem: "Functions config not found"

**Local development**:
```bash
# Download config for local testing
firebase functions:config:get > functions/.runtimeconfig.json
```

**Production**:
```bash
# Re-set config
firebase functions:config:set ses.smtp_user="..." ses.smtp_pass="..."
```

---

## Security Best Practices

### ✅ DO:
- Store credentials in Firebase Config or Secret Manager
- Use IAM user with minimal SES permissions
- Rotate credentials periodically
- Monitor bounce and complaint rates
- Implement rate limiting

### ❌ DON'T:
- Commit credentials to git
- Hard-code credentials in functions
- Use root AWS credentials
- Share SMTP passwords
- Send without user consent

---

## Cost Comparison

Both Firebase Extension and Direct SES use the **same AWS SES service**, so costs are identical:

- **Free tier**: 62,000 emails/month (12 months)
- **After free tier**: $0.10 per 1,000 emails
- **No additional cost** for using Nodemailer

**Example**:
- 5,000 emails/month = **$0** (free tier)
- 100,000 emails/month = **$3.80/month**

---

## Next Steps

1. ✅ Configure SES credentials (Step 2)
2. ✅ Deploy functions (Step 5)
3. ✅ Test email sending (Step 6)
4. ✅ Update notification triggers
5. ✅ Monitor delivery rates
6. ✅ (Optional) Uninstall Firebase Extension

---

## Files Reference

- **SES Service**: [functions/src/email/sesEmailService.js](../functions/src/email/sesEmailService.js)
- **Templates**: [functions/src/email/templates.js](../functions/src/email/templates.js)
- **Triggers**: [functions/src/email/notificationTriggers.js](../functions/src/email/notificationTriggers.js)
- **Package**: [functions/package.json](../functions/package.json)

---

*Last Updated: 2025-12-01*
