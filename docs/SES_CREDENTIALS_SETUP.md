# Where to Input AWS SES Credentials

## 🎯 Quick Answer

**Firebase Console → Extensions → Trigger Email → Reconfigure**

---

## 📍 Exact Location: Step-by-Step with Screenshots

### Method 1: Firebase Console (RECOMMENDED)

#### Step 1: Open Firebase Console

```
URL: https://console.firebase.google.com/
```

1. Sign in with your Google account
2. Select your **Dividela** project

#### Step 2: Navigate to Extensions

1. In the left sidebar, click **"Extensions"** (puzzle piece icon 🧩)
2. You'll see a list of installed extensions

#### Step 3: Find Trigger Email Extension

**If NOT installed yet**:
- Click **"Install Extension"**
- Search for **"Trigger Email"**
- Click on **"Trigger Email from Firebase"**
- Click **"Install in console"**
- Follow installation prompts (you'll configure SES credentials during install)

**If already installed**:
- You'll see **"Trigger Email"** in the extensions list
- Status should show "Active" with a green checkmark

#### Step 4: Reconfigure Extension

1. Click the **three dots (⋮)** on the right side of "Trigger Email"
2. Click **"Reconfigure extension"**
3. A configuration form will appear

#### Step 5: Enter SES Credentials

You'll see these fields:

```
┌─────────────────────────────────────────────────────┐
│ SMTP connection URI *                                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ smtps://USERNAME:PASSWORD@HOST:465              │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Default FROM email address *                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ noreply@dividela.com                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Default FROM name                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Dividela                                        │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Email documents collection                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │ mail                                            │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Fill in**:

1. **SMTP connection URI**:
   ```
   smtps://AKIAIOSFODNN7EXAMPLE:wJalr...EXAMPLE@email-smtp.us-east-1.amazonaws.com:465
   ```

   **Format**:
   ```
   smtps://[USERNAME]:[PASSWORD]@[ENDPOINT]:465
   ```

   **Where**:
   - `[USERNAME]` = Your SMTP username from AWS SES (starts with AKIA...)
   - `[PASSWORD]` = Your SMTP password (URL-encoded!)
   - `[ENDPOINT]` = email-smtp.REGION.amazonaws.com
   - `465` = Port (always 465)

2. **Default FROM email address**:
   ```
   noreply@dividela.com
   ```
   (Or any email at your verified domain)

3. **Default FROM name**:
   ```
   Dividela
   ```
   (This appears as the sender name in email clients)

4. **Email documents collection**:
   ```
   mail
   ```
   (Keep as default)

#### Step 6: Save Configuration

1. Scroll down
2. Click **"Save"** button
3. Wait for "Configuration saved successfully" message
4. ✅ Done!

---

## 🔑 Building Your SMTP URI

### Get Your AWS SES Credentials

From AWS Console → SES → SMTP Settings → Create SMTP Credentials:

```
SMTP Username: AKIAIOSFODNN7EXAMPLE
SMTP Password: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Get Your SMTP Endpoint

Based on your AWS region:

| Region | SMTP Endpoint |
|--------|---------------|
| **US East (N. Virginia)** | `email-smtp.us-east-1.amazonaws.com` |
| **US West (Oregon)** | `email-smtp.us-west-2.amazonaws.com` |
| **EU (Ireland)** | `email-smtp.eu-west-1.amazonaws.com` |
| **Asia Pacific (Sydney)** | `email-smtp.ap-southeast-2.amazonaws.com` |

### URL-Encode Your Password

**⚠️ CRITICAL**: Special characters in password MUST be URL-encoded!

**Online tool**: https://www.urlencoder.org/

**Common replacements**:
- `/` → `%2F`
- `+` → `%2B`
- `=` → `%3D`
- `@` → `%40`

**Example**:
```
Original:  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Encoded:   wJalrXUtnFEMI%2FK7MDENG%2FbPxRfiCYEXAMPLEKEY
```

### Build Final SMTP URI

**Template**:
```
smtps://[USERNAME]:[ENCODED_PASSWORD]@[ENDPOINT]:465
```

**Example**:
```
smtps://AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI%2FK7MDENG%2FbPxRfiCYEXAMPLEKEY@email-smtp.us-east-1.amazonaws.com:465
```

---

## 🛠️ Alternative: Use Helper Script

I've created a helper script to build your SMTP URI:

```bash
cd /home/mg/dividela2
./configure-ses.sh
```

This script will:
1. Ask for your SES credentials
2. Automatically URL-encode the password
3. Build the correct SMTP URI
4. Show you what to paste into Firebase Console

---

## 🧪 Test Your Configuration

### Method 1: Create Test Email in Firestore

1. **Go to**: Firebase Console → Firestore Database
2. **Click**: "mail" collection (or create it)
3. **Click**: "Add document"
4. **Enter**:
   ```json
   {
     "to": ["your-email@example.com"],
     "message": {
       "subject": "Test Email from SES",
       "html": "<h1>Success!</h1><p>SES is working!</p>",
       "text": "Success! SES is working!"
     }
   }
   ```
5. **Click**: "Save"
6. **Check your email** (should arrive within seconds)

### Method 2: Test with Cloud Function

Once you deploy your functions, test the budget alert:

```bash
cd functions
firebase deploy --only functions
```

Then add an expense in the app to trigger a budget alert email.

---

## ❌ Common Mistakes

### Mistake 1: Password not URL-encoded

**Wrong**:
```
smtps://AKIA123:myPass/word+123=@email-smtp.us-east-1.amazonaws.com:465
```

**Right**:
```
smtps://AKIA123:myPass%2Fword%2B123%3D@email-smtp.us-east-1.amazonaws.com:465
```

### Mistake 2: Wrong region in endpoint

**Wrong**:
```
email-smtp.us-west-1.amazonaws.com  ❌ (us-west-1 doesn't exist)
```

**Right**:
```
email-smtp.us-east-1.amazonaws.com  ✅
email-smtp.us-west-2.amazonaws.com  ✅
```

### Mistake 3: Using wrong port

**Wrong**:
```
:587  ❌ (STARTTLS - not supported by Firebase Extension)
:25   ❌ (Not secure)
```

**Right**:
```
:465  ✅ (TLS/SSL)
```

### Mistake 4: FROM email not verified

**Error**: "Email address is not verified"

**Solution**:
- Verify domain in AWS SES
- OR verify specific email address in SES
- Use only verified addresses in FROM field

---

## 🔒 Security Best Practices

### ✅ DO:
- Store credentials in Firebase Secret Manager (automatic with Extension)
- Use IAM user with minimal permissions
- Rotate credentials periodically
- Enable MFA on AWS account

### ❌ DON'T:
- Commit credentials to git
- Share SMTP URI publicly
- Use root AWS credentials
- Store credentials in code

---

## 📊 Verification Checklist

After configuration, verify:

- [ ] SMTP URI is correctly formatted
- [ ] Password is URL-encoded
- [ ] Region matches your AWS SES region
- [ ] FROM email is verified in SES
- [ ] Port is 465
- [ ] Test email sends successfully
- [ ] Email lands in inbox (not spam)
- [ ] Extension status shows "Active"

---

## 🆘 Troubleshooting

### Problem: "Authentication failed"

**Cause**: Wrong credentials or not URL-encoded

**Solution**:
1. Double-check SMTP username (starts with AKIA...)
2. Re-generate SMTP credentials in AWS SES
3. URL-encode password properly
4. Copy-paste carefully (no extra spaces)

### Problem: "Could not reach host"

**Cause**: Wrong SMTP endpoint or port

**Solution**:
1. Verify region matches
2. Check endpoint spelling
3. Ensure port is 465
4. Check firewall settings

### Problem: Test email not arriving

**Cause**: Various reasons

**Solutions**:
1. Check spam folder
2. Verify recipient email (if in sandbox mode)
3. Check SES sending limits
4. View Firestore document for delivery status
5. Check Firebase Functions logs: `firebase functions:log`

### Problem: "Email address is not verified"

**Cause**: Sending from unverified address

**Solution**:
1. Verify domain in AWS SES
2. OR verify specific email in SES
3. Wait for verification (10-30 min for DNS)
4. Use verified email in FROM field

---

## 📍 Quick Reference

### Configuration Location

```
Firebase Console
  └─ Extensions
      └─ Trigger Email
          └─ ⋮ (three dots)
              └─ Reconfigure extension
                  └─ SMTP connection URI ← PASTE HERE
```

### Required Information

| Field | Example |
|-------|---------|
| **SMTP Username** | AKIAIOSFODNN7EXAMPLE |
| **SMTP Password** | wJalr...EXAMPLE (URL-encoded) |
| **SMTP Endpoint** | email-smtp.us-east-1.amazonaws.com |
| **Port** | 465 |
| **FROM Email** | noreply@dividela.com |
| **FROM Name** | Dividela |

### Final SMTP URI Format

```
smtps://[USERNAME]:[ENCODED_PASSWORD]@[ENDPOINT]:465
```

---

## 🎉 Success!

Once configured correctly, you should see:

✅ Extension status: **Active**
✅ Test email: **Delivered**
✅ Firestore document: `delivery.state: "SUCCESS"`

Your Dividela app is now ready to send production emails via AWS SES! 🚀

---

*Need help? Check [AWS_SES_SETUP.md](AWS_SES_SETUP.md) for complete setup guide*
