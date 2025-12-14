# AWS SES Setup Guide for Dividela

## Overview
This guide walks you through setting up Amazon SES (Simple Email Service) for sending production emails from Dividela.

### Why AWS SES?

✅ **Pros**:
- **Cost-effective**: $0.10 per 1,000 emails (62,000 free emails/month on AWS Free Tier for 12 months)
- **High deliverability**: Industry-leading inbox placement rates
- **Scalable**: Send millions of emails
- **Reliable**: 99.9% uptime SLA
- **Professional**: Built for production use

❌ **Gmail Cons** (for comparison):
- 100 emails/day limit
- Higher spam risk
- Not designed for transactional emails
- Can be blocked by receiving servers

---

## Prerequisites

- [ ] Domain name (e.g., `dividela.com`)
- [ ] Access to domain DNS settings
- [ ] AWS account (free tier available)
- [ ] ~30 minutes setup time

---

## Part 1: AWS Account Setup (5 min)

### Step 1.1: Create AWS Account

1. **Go to**: https://aws.amazon.com/
2. **Click**: "Create an AWS Account"
3. **Enter**:
   - Email address
   - Password
   - AWS account name (e.g., "Dividela Production")
4. **Verify** email and phone number
5. **Enter** payment information (required, but you'll stay in free tier)
6. **Select** Basic Support Plan (free)

### Step 1.2: Sign in to AWS Console

1. **Go to**: https://console.aws.amazon.com/
2. **Sign in** with your new account
3. **Select region** in top-right corner (choose closest to your users):
   - **US East (N. Virginia)** - `us-east-1` (recommended, most AWS services)
   - **US West (Oregon)** - `us-west-2`
   - **EU (Ireland)** - `eu-west-1`
   - **Asia Pacific (Sydney)** - `ap-southeast-2`

**Important**: Remember your region! You'll need it for SMTP configuration.

---

## Part 2: AWS SES Setup (15 min)

### Step 2.1: Open SES Console

1. **In AWS Console**, search for "SES" or "Simple Email Service"
2. **Click**: "Amazon Simple Email Service"
3. **Verify** you're in the correct region (top-right corner)

### Step 2.2: Verify Email Address (For Testing)

**Note**: Start with email verification, then upgrade to domain verification.

1. **In SES Console**, click "Verified identities" (left sidebar)
2. **Click**: "Create identity"
3. **Select**: "Email address"
4. **Enter**: Your email (e.g., `you@gmail.com` or `you@dividela.com`)
5. **Click**: "Create identity"
6. **Check your email** for verification link
7. **Click** the verification link
8. ✅ Email status should change to "Verified"

**Test it**:
```bash
# You can now send FROM this email address (while in sandbox mode)
```

### Step 2.3: Verify Domain (Production)

**Why domain verification?**
- Send from any email address at your domain (e.g., `noreply@dividela.com`, `hello@dividela.com`)
- Higher deliverability
- Professional appearance
- Required to leave sandbox mode

**Steps**:

1. **In SES Console**, click "Verified identities"
2. **Click**: "Create identity"
3. **Select**: "Domain"
4. **Enter**: Your domain (e.g., `dividela.com`)
5. **Configuration Method**: Select "Easy DKIM"
6. **DKIM signing key length**: 2048-bit (recommended)
7. **Advanced DKIM settings**: Leave as default
8. **Click**: "Create identity"

**AWS will show you DNS records to add**. Keep this page open!

### Step 2.4: Add DNS Records

You'll need to add **3 types** of DNS records to your domain:

#### A. DKIM Records (3 records)

AWS provides 3 CNAME records like:

```
Name: abcd1234._domainkey.dividela.com
Type: CNAME
Value: abcd1234.dkim.amazonses.com
```

**Add these to your DNS provider** (GoDaddy, Namecheap, Cloudflare, etc.):

**Example for Cloudflare**:
1. Log in to Cloudflare
2. Select your domain
3. Go to DNS → Records
4. Click "Add record"
5. Type: `CNAME`
6. Name: `abcd1234._domainkey` (copy from AWS, remove `.dividela.com`)
7. Target: `abcd1234.dkim.amazonses.com` (copy from AWS)
8. Proxy status: DNS only (gray cloud)
9. Click "Save"
10. Repeat for all 3 DKIM records

#### B. MX Record (Optional, for receiving emails)

Only add if you want to receive emails via SES.

```
Name: dividela.com
Type: MX
Priority: 10
Value: inbound-smtp.us-east-1.amazonaws.com
```

**Skip this if**:
- You're only sending emails (like Dividela notifications)
- You already have email hosting (Gmail Workspace, etc.)

#### C. SPF Record (Recommended)

Add TXT record to prevent email spoofing:

```
Name: dividela.com
Type: TXT
Value: "v=spf1 include:amazonses.com ~all"
```

**If you already have SPF record**:
```
# Old:
v=spf1 include:_spf.google.com ~all

# New (add amazonses.com):
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

### Step 2.5: Wait for Verification (10-30 min)

**In SES Console**:
- Go to "Verified identities"
- Click on your domain
- **DKIM Status**: Should show "Successful" (may take 10-30 minutes)
- **Identity Status**: Should show "Verified"

**Troubleshooting**:
- DNS changes can take up to 48 hours (usually 10-30 minutes)
- Use DNS checker: https://mxtoolbox.com/SuperTool.aspx
- Verify DKIM records are correct
- Make sure you removed your domain suffix when adding CNAME (e.g., use `abcd1234._domainkey`, not `abcd1234._domainkey.dividela.com`)

---

## Part 3: Generate SMTP Credentials (5 min)

### Step 3.1: Create SMTP User

1. **In SES Console**, click "SMTP settings" (left sidebar)
2. **Click**: "Create SMTP credentials"
3. **IAM User Name**: Use default or enter `ses-smtp-user-dividela`
4. **Click**: "Create user"

**IMPORTANT**: You'll see SMTP credentials **ONLY ONCE**:

```
SMTP Username: AKIAIOSFODNN7EXAMPLE
SMTP Password: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**✅ SAVE THESE IMMEDIATELY!**
- Copy to password manager
- Or download credentials CSV file
- You **cannot** retrieve the password later

### Step 3.2: Note Your SMTP Endpoint

Based on your AWS region:

| Region | SMTP Endpoint |
|--------|---------------|
| US East (N. Virginia) | `email-smtp.us-east-1.amazonaws.com` |
| US West (Oregon) | `email-smtp.us-west-2.amazonaws.com` |
| EU (Ireland) | `email-smtp.eu-west-1.amazonaws.com` |
| Asia Pacific (Sydney) | `email-smtp.ap-southeast-2.amazonaws.com` |

Full list: https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html

---

## Part 4: Configure Firebase Extension (5 min)

### Step 4.1: Build SMTP URI

**Format**:
```
smtps://USERNAME:PASSWORD@ENDPOINT:465
```

**Example**:
```
smtps://AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI%2FK7MDENG%2FbPxRfiCYEXAMPLEKEY@email-smtp.us-east-1.amazonaws.com:465
```

**⚠️ Important**: URL-encode special characters in password!

Common replacements:
- `/` → `%2F`
- `+` → `%2B`
- `=` → `%3D`

**Tool**: https://www.urlencoder.org/

### Step 4.2: Update Firebase Extension

**Option A: Via Firebase Console** (Recommended)

1. **Go to**: https://console.firebase.google.com/
2. **Select** your project
3. **Click**: Extensions (left sidebar)
4. **Find**: "Trigger Email"
5. **Click**: "⋮" (three dots) → "Reconfigure extension"
6. **Update**:
   - **SMTP connection URI**: Your new SES URI
   - **Default FROM email**: `noreply@dividela.com`
   - **Default FROM name**: `Dividela`
7. **Click**: "Save"

**Option B: Via Firebase CLI**

```bash
firebase ext:configure firestore-send-email
# Follow prompts to update SMTP URI
```

### Step 4.3: Test Email

**Create test email in Firestore**:

1. **Go to**: Firebase Console → Firestore Database
2. **Navigate to**: `mail` collection
3. **Click**: "Add document"
4. **Document ID**: Auto-generate
5. **Add fields**:
   ```json
   {
     "to": ["your-verified-email@example.com"],
     "message": {
       "subject": "Test from AWS SES",
       "html": "<h1>Success!</h1><p>Email is working with AWS SES.</p>",
       "text": "Success! Email is working with AWS SES."
     }
   }
   ```
6. **Click**: "Save"
7. **Check your email** (should arrive in seconds)

**Check delivery status**:
- Click on the document you just created
- Look for `delivery` field:
  ```json
  {
    "delivery": {
      "state": "SUCCESS",
      "attempts": 1,
      "startTime": Timestamp,
      "endTime": Timestamp
    }
  }
  ```

✅ If `state: "SUCCESS"`, AWS SES is working!

---

## Part 5: Exit Sandbox Mode (IMPORTANT!)

### What is Sandbox Mode?

**Sandbox Restrictions**:
- ❌ Can only send to **verified email addresses**
- ❌ Can only send to **verified domains**
- ❌ Maximum 200 emails per 24 hours
- ❌ Maximum 1 email per second

**Production Mode**:
- ✅ Send to **any email address**
- ✅ Send **50,000 emails per 24 hours** (free tier)
- ✅ Higher sending rate
- ✅ No verification needed

### Step 5.1: Request Production Access

1. **In SES Console**, click "Account dashboard" (left sidebar)
2. **Look for**: "Your account is in the sandbox" banner
3. **Click**: "Request production access" (or "Get set up")
4. **Fill out form**:

**Mail type**: Select "Transactional"

**Website URL**: `https://dividela.com` (or your app URL)

**Use case description** (example):
```
Dividela is a couples expense tracking application. We send
transactional email notifications to our users, including:

1. Budget alerts (when spending reaches thresholds)
2. Fiscal year end reminders
3. Savings goal milestone notifications
4. Partner invitation emails
5. Partner activity notifications (optional)

All emails are opt-in with unsubscribe links. We expect to
send approximately 1,000-5,000 emails per month across our
user base. Emails are sent from noreply@dividela.com to
users who have registered with our app.

We have implemented:
- Email preference settings (users can opt-out)
- Unsubscribe links in all emails
- Bounce and complaint handling (via SES)

Our app is available at: https://dividela.com
```

**Additional contacts** (optional): Leave blank or add team emails

**Acknowledge**: Check the box acknowledging AWS policies

5. **Click**: "Submit request"

### Step 5.2: Wait for Approval (24-48 hours)

**Timeline**:
- Usually approved within **24 hours**
- Can take up to **48 hours**
- Sometimes approved within **1 hour**

**What AWS Reviews**:
- Legitimate use case
- Proper bounce/complaint handling
- No spam/abuse potential

**Email Notification**:
You'll receive email when approved:
```
Subject: Your Amazon SES sending limit increase request has been approved
```

### Step 5.3: Verify Production Access

**After approval**:

1. **Go to**: SES Console → Account dashboard
2. **Look for**:
   - "Your account is out of the sandbox" (green banner)
   - **OR** No sandbox warning at all
3. **Check sending limits**:
   - Daily sending quota: 50,000 (or higher)
   - Maximum send rate: 14+ emails/second

✅ **You're now in production mode!**

---

## Part 6: Monitor & Optimize (Ongoing)

### Set Up Bounce & Complaint Handling

**Why?**
- Maintain sender reputation
- Avoid being marked as spam
- Required by AWS

**Steps**:

1. **In SES Console**, click your verified domain
2. **Click**: "Notifications" tab
3. **Click**: "Edit" for SNS topic configuration
4. **Create SNS Topics**:
   - **Bounces**: `dividela-email-bounces`
   - **Complaints**: `dividela-email-complaints`
5. **Subscribe to topics**:
   - Protocol: Email
   - Endpoint: Your admin email
6. **Confirm subscriptions** via email

**Handle bounces in your app**:
```javascript
// TODO: Add Cloud Function to handle SNS notifications
// Automatically disable emails for bounced addresses
```

### Monitor Sending Stats

**In SES Console → Account dashboard**:
- **Sending statistics**: Emails sent, bounces, complaints
- **Reputation dashboard**: Bounce rate, complaint rate
- **Suppression list**: Blocked email addresses

**Healthy metrics**:
- Bounce rate: < 5%
- Complaint rate: < 0.1%

### Increase Sending Limits (If Needed)

**Default limits after leaving sandbox**:
- 50,000 emails per 24 hours
- 14 emails per second

**If you need more**:
1. **Go to**: SES Console → Account dashboard
2. **Click**: "Request an increase"
3. **Fill out form** with justification
4. **Submit** (usually approved quickly)

---

## Part 7: Best Practices

### Email Deliverability

✅ **Do**:
- Always include unsubscribe links
- Send from verified domain
- Monitor bounce/complaint rates
- Warm up sending (start slow, increase gradually)
- Authenticate with SPF, DKIM, DMARC
- Keep suppression list updated

❌ **Don't**:
- Send to purchased lists
- Send unsolicited emails
- Use misleading subject lines
- Send from free email providers (gmail.com, etc.)

### Cost Optimization

**Pricing**:
- First 62,000 emails/month: **FREE** (12 months)
- After free tier: **$0.10 per 1,000 emails**
- Data transfer: $0.12 per GB (minimal for emails)

**Example costs**:
- 5,000 emails/month: **$0** (free tier)
- 100,000 emails/month: **$3.80/month** (after free tier)
- 1,000,000 emails/month: **$100/month**

**Tips**:
- Batch emails when possible
- Remove inactive users
- Use email preferences to reduce unnecessary sends

### Security

**Protect SMTP credentials**:
- ✅ Store in Firebase Secret Manager (automatic with extension)
- ✅ Rotate credentials periodically
- ❌ Never commit to git
- ❌ Never share publicly

**IAM best practices**:
- Use least-privilege permissions
- Enable MFA on AWS account
- Regularly review IAM users

---

## Troubleshooting

### Problem: Domain verification stuck "Pending"

**Solutions**:
1. Check DNS records with: https://mxtoolbox.com/SuperTool.aspx
2. Verify you removed domain suffix from CNAME name (e.g., `abc._domainkey`, not `abc._domainkey.dividela.com`)
3. Wait longer (can take 48 hours)
4. Delete and recreate identity

### Problem: Emails going to spam

**Solutions**:
1. Complete SPF, DKIM, DMARC setup
2. Request production access (sandbox = more spam)
3. Add unsubscribe links
4. Warm up sending (start with small volumes)
5. Check content (avoid spam trigger words)
6. Ask recipients to whitelist noreply@dividela.com

### Problem: "Email address is not verified" error

**In sandbox mode**:
- Both sender AND recipient must be verified
- **Solution**: Request production access

**In production mode**:
- Only sender needs to be verified
- Recipient can be anyone

### Problem: "Daily sending quota exceeded"

**In sandbox**: Limit is 200/day
- **Solution**: Request production access

**In production**: Limit is 50,000/day
- **Solution**: Request limit increase

### Problem: High bounce rate

**Causes**:
- Invalid email addresses
- Typos in emails
- Deactivated accounts

**Solutions**:
- Validate email format on signup
- Send confirmation emails
- Monitor bounce notifications
- Remove hard bounces from list

---

## Quick Reference

### SMTP Configuration

**Format**:
```
smtps://USERNAME:PASSWORD@email-smtp.REGION.amazonaws.com:465
```

**Regions**:
- `us-east-1` (N. Virginia)
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-southeast-2` (Sydney)

**Port**: 465 (TLS) or 587 (STARTTLS)

### DNS Records

**DKIM** (3 records):
```
Type: CNAME
Name: random._domainkey
Value: random.dkim.amazonses.com
```

**SPF**:
```
Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all
```

**DMARC** (optional):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@dividela.com
```

### Useful Links

- **SES Console**: https://console.aws.amazon.com/ses/
- **SMTP Endpoints**: https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html
- **DNS Checker**: https://mxtoolbox.com/SuperTool.aspx
- **URL Encoder**: https://www.urlencoder.org/
- **AWS Free Tier**: https://aws.amazon.com/ses/pricing/

---

## Checklist

### Setup
- [ ] AWS account created
- [ ] SES region selected
- [ ] Email address verified (for testing)
- [ ] Domain verified
- [ ] DKIM records added to DNS
- [ ] SPF record added to DNS
- [ ] Domain status shows "Verified"
- [ ] SMTP credentials generated and saved
- [ ] Firebase Extension reconfigured with SES
- [ ] Test email sent successfully

### Production
- [ ] Production access requested
- [ ] Production access approved (24-48 hours)
- [ ] Bounce/complaint handling set up
- [ ] Monitoring enabled
- [ ] Unsubscribe links in all templates
- [ ] Testing completed

---

## Next Steps

1. **Complete setup** (follow steps above)
2. **Test thoroughly** with various email providers (Gmail, Outlook, Yahoo)
3. **Monitor metrics** for first few weeks
4. **Optimize** based on deliverability data

**Setup Time**: ~30 minutes (+ 24-48 hours for production access approval)

**Difficulty**: ⭐⭐☆☆☆ (Moderate)

---

*Last Updated: 2025-12-01*
