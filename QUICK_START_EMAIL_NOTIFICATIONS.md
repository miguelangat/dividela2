# Quick Start: Email Notifications

## ⚡ 5-Minute Setup Guide

### Step 1: Install Firebase Extension (5 min)

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Select your Dividela project

2. **Install Extension**
   - Click "Extensions" in left sidebar
   - Click "Install Extension"
   - Search for "Trigger Email"
   - Click "Install"

3. **Configure SMTP** (Use Gmail for testing)
   - **SMTP URI**: `smtps://YOUR_EMAIL:YOUR_APP_PASSWORD@smtp.gmail.com:465`
   - **FROM email**: `noreply@dividela.com` (or your email)
   - **FROM name**: `Dividela`
   - **Email collection**: `mail` (default)

   **Get Gmail App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Create app password for "Mail"
   - Copy password (16 characters, no spaces)
   - Use this password in SMTP URI (not your regular Gmail password)

4. **Click Install** and wait 2-3 minutes

---

### Step 2: Deploy Cloud Functions (2 min)

```bash
cd functions
firebase deploy --only functions
```

**Expected Output**:
```
✔  functions[checkBudgetOnExpenseAdded]: Successful create operation
✔  functions[notifyPartnerOnExpenseAdded]: Successful create operation
✔  functions[sendPartnerInvitation]: Successful create operation
✔  functions[checkSavingsGoalMilestone]: Successful create operation
✔  functions[checkFiscalYearEndReminders]: Successful create operation
```

---

### Step 3: Test It! (3 min)

#### Test #1: Budget Alert

1. Open Dividela app
2. Go to Add Expense
3. Add expenses until you reach 80% of budget
4. Check your email (and partner's email)
5. ✅ You should receive "Budget Alert (80%)" email

#### Test #2: Partner Invitation

1. Create a couple code
2. Enter an email address
3. Check that email inbox
4. ✅ You should receive invitation email with code

#### Test #3: Settings UI

1. Go to Settings screen
2. Scroll down to "Email Notifications" section
3. Toggle email notifications on/off
4. ✅ Settings should save and persist

---

## 🎯 Quick Reference

### Email Types

| Type | Trigger | Recipients |
|------|---------|-----------|
| **Budget Alert** | Expenses reach 80%, 90%, 100% | Both partners |
| **Fiscal Year Reminder** | 30 days before year ends | Both partners |
| **Savings Milestone** | Goal reaches 25%, 50%, 75%, 100% | Both partners |
| **Partner Activity** | Partner adds expense | Other partner |
| **Partner Invitation** | Couple code created | Invited email |

### Settings Location

**Frontend**: `src/screens/main/SettingsScreen.js` → "Email Notifications" section

**Backend**: `coupleSettings` collection → `notifications` field

### Cloud Functions

**Location**: `functions/src/email/`

| File | Purpose |
|------|---------|
| `emailService.js` | Helper functions |
| `templates.js` | HTML email templates |
| `notificationTriggers.js` | Firestore triggers |
| `scheduledChecks.js` | Cron jobs |

---

## 🐛 Troubleshooting

### Problem: Emails not sending

**Solution**:
1. Check Firebase Extension is installed: Extensions → Trigger Email (should show "Installed")
2. Check `mail` collection in Firestore - documents should have `delivery.state: "SUCCESS"`
3. Check spam folder
4. Verify SMTP credentials (use App Password for Gmail, not regular password)

### Problem: Functions not deploying

**Solution**:
```bash
cd functions
npm install
firebase deploy --only functions
```

Check for errors in output. Common issues:
- Node.js version (need v20)
- Missing dependencies
- Syntax errors

### Problem: Settings not saving

**Solution**:
1. Check browser console for errors
2. Verify Firestore rules allow write to `coupleSettings`
3. Check user is authenticated

---

## 📝 Next Steps

### Add Translations (Optional)

Copy the English translations to other language files:

```bash
# Spanish
nano src/i18n/locales/es.json

# French
nano src/i18n/locales/fr.json

# German
nano src/i18n/locales/de.json

# Portuguese
nano src/i18n/locales/pt.json

# Italian
nano src/i18n/locales/it.json
```

Look for the `"notifications"` section and translate each string.

### Production Setup

1. **Get a domain**: e.g., `dividela.com`
2. **Set up email service**:
   - Recommended: SendGrid (professional, better deliverability)
   - SMTP URI: `smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465`
3. **Update FROM email**: `noreply@dividela.com`
4. **Add unsubscribe page**: Create webpage at `/unsubscribe`

### Monitor Usage

**Firebase Console → Functions**:
- View function invocations
- Check error rates
- Monitor costs

**Firebase Console → Extensions → Trigger Email**:
- View email delivery stats
- Check failed sends
- Monitor quota usage

---

## ✅ Checklist

- [ ] Firebase Extension installed
- [ ] SMTP configured (Gmail App Password)
- [ ] Functions deployed successfully
- [ ] Test budget alert works
- [ ] Test partner invitation works
- [ ] Settings UI loads correctly
- [ ] Toggles save and persist
- [ ] Emails land in inbox (not spam)

---

## 🆘 Need Help?

**View Logs**:
```bash
# Cloud Functions logs
firebase functions:log

# Specific function
firebase functions:log --only checkBudgetOnExpenseAdded
```

**Check Extension Status**:
- Firebase Console → Extensions → Trigger Email
- View processing state and error details

**Test Extension Manually**:
1. Go to Firestore in Firebase Console
2. Create document in `mail` collection:
   ```json
   {
     "to": ["your-email@example.com"],
     "message": {
       "subject": "Test Email",
       "html": "<h1>Test</h1><p>This is a test email.</p>",
       "text": "This is a test email."
     }
   }
   ```
3. Check email inbox
4. Check document for `delivery.state` field

---

**Setup Time**: ~10 minutes
**Ready to test!** 🚀
