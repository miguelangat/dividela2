# Configure Direct SES Credentials - Quick Guide

## 🚀 Quick Setup (3 Commands)

### Step 1: Set Firebase Functions Config

```bash
cd /home/mg/dividela2/functions

firebase functions:config:set \
  ses.smtp_user="YOUR_SMTP_USERNAME" \
  ses.smtp_pass="YOUR_SMTP_PASSWORD" \
  ses.smtp_host="email-smtp.REGION.amazonaws.com" \
  ses.from_email="noreply@dividela.com" \
  ses.from_name="Dividela"
```

**Replace**:
- `YOUR_SMTP_USERNAME` - From AWS SES SMTP Settings
- `YOUR_SMTP_PASSWORD` - From AWS SES SMTP Settings (plain text, NOT URL-encoded!)
- `REGION` - Your AWS region (e.g., us-east-1, us-west-2, eu-west-1)

### Step 2: Verify Configuration

```bash
firebase functions:config:get
```

**Expected output**:
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

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Deploy Functions

```bash
firebase deploy --only functions
```

---

## 🧪 Test Your Configuration

After deploying, test the email:

```bash
# Get your function URL
firebase functions:list

# Test email (replace with your email)
curl "https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/testEmail?to=your-email@example.com"
```

**Or use browser**:
```
https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/testEmail?to=your-email@example.com
```

**Expected response**:
```json
{
  "success": true,
  "messageId": "01000192...",
  "message": "Test email sent successfully to your-email@example.com!"
}
```

**Check your email inbox!** 📧

---

## 📍 SES SMTP Endpoints by Region

| Region | SMTP Host |
|--------|-----------|
| **US East (N. Virginia)** | `email-smtp.us-east-1.amazonaws.com` |
| **US West (Oregon)** | `email-smtp.us-west-2.amazonaws.com` |
| **EU (Ireland)** | `email-smtp.eu-west-1.amazonaws.com` |
| **Asia Pacific (Sydney)** | `email-smtp.ap-southeast-2.amazonaws.com` |

---

## 🔑 Where to Get AWS SES Credentials

### Option 1: AWS Console (GUI)

1. **Go to**: https://console.aws.amazon.com/ses/
2. **Click**: "SMTP settings" (left sidebar)
3. **Click**: "Create SMTP credentials"
4. **Copy** the username and password shown
   - ⚠️ **Save immediately** - password shown only once!

### Option 2: AWS CLI

```bash
aws iam create-access-key --user-name ses-smtp-user
```

---

## 🔐 Security Notes

### ✅ **Correct Usage:**

**Password is plain text** (Nodemailer handles encoding):
```bash
firebase functions:config:set ses.smtp_pass="wJalr/XUtnF+EMI="
```

### ❌ **Wrong:**

**Don't URL-encode** (that's only for Firebase Extension):
```bash
# DON'T DO THIS with Nodemailer:
firebase functions:config:set ses.smtp_pass="wJalr%2FXUtnF%2BEMI%3D"
```

---

## 🛠️ Troubleshooting

### Problem: "Config not found"

**Check**:
```bash
firebase functions:config:get
```

**Fix**:
```bash
# Re-run config set command
firebase functions:config:set ses.smtp_user="..."
```

### Problem: "Authentication failed"

**Causes**:
- Wrong SMTP username/password
- Using old/revoked credentials
- Password URL-encoded (don't do this!)

**Fix**:
1. Generate new SMTP credentials in AWS SES
2. Set new credentials in Firebase Config
3. Redeploy functions

### Problem: "Connection timeout"

**Causes**:
- Wrong SMTP host
- Firewall blocking port 465
- Not on Blaze plan (pay-as-you-go)

**Fix**:
1. Verify SMTP host matches your AWS region
2. Upgrade to Blaze plan (required for external SMTP)
3. Check port 465 is not blocked

### Problem: Test function not found

**Deploy first**:
```bash
firebase deploy --only functions:testEmail
```

**Then test**:
```bash
firebase functions:list  # Get URL
```

---

## 📝 Configuration File Locations

### Production (Cloud)
```
Firebase Functions Config
└─ ses
   ├─ smtp_user
   ├─ smtp_pass
   ├─ smtp_host
   ├─ from_email
   └─ from_name
```

**Set via**: `firebase functions:config:set`

### Local Development (Optional)

Create `.env` file in `functions/`:

```bash
# functions/.env
SES_SMTP_USER=AKIAIOSFODNN7EXAMPLE
SES_SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
SES_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
FROM_EMAIL=noreply@dividela.com
FROM_NAME=Dividela
```

**Add to .gitignore**:
```bash
echo "functions/.env" >> .gitignore
```

**For local testing**:
```bash
# Download production config
firebase functions:config:get > functions/.runtimeconfig.json
```

---

## 🎯 Complete Example

### Full Setup Workflow:

```bash
# 1. Navigate to functions directory
cd /home/mg/dividela2/functions

# 2. Set SES credentials
firebase functions:config:set \
  ses.smtp_user="AKIAIOSFODNN7EXAMPLE" \
  ses.smtp_pass="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  ses.smtp_host="email-smtp.us-east-1.amazonaws.com" \
  ses.from_email="noreply@dividela.com" \
  ses.from_name="Dividela"

# 3. Verify config
firebase functions:config:get

# 4. Install dependencies
npm install

# 5. Deploy
firebase deploy --only functions

# 6. Test
# Get function URL from: firebase functions:list
# Then visit: https://YOUR-FUNCTION-URL/testEmail?to=your-email@example.com
```

---

## ✅ Checklist

- [ ] AWS SES account created
- [ ] Domain verified in AWS SES (or email address for testing)
- [ ] SMTP credentials generated in AWS SES
- [ ] Credentials saved securely
- [ ] Firebase Functions Config set
- [ ] Config verified with `firebase functions:config:get`
- [ ] Dependencies installed (`npm install`)
- [ ] Functions deployed
- [ ] Test email sent and received
- [ ] Production access requested (if not in sandbox)

---

## 📚 Related Documentation

- **Full SES Setup**: [docs/AWS_SES_SETUP.md](docs/AWS_SES_SETUP.md)
- **Direct SES Guide**: [docs/DIRECT_SES_SETUP.md](docs/DIRECT_SES_SETUP.md)
- **Email Service Code**: [functions/src/email/sesEmailService.js](functions/src/email/sesEmailService.js)
- **SES Credentials Guide**: [docs/SES_CREDENTIALS_SETUP.md](docs/SES_CREDENTIALS_SETUP.md)

---

**Setup Time**: ~5 minutes
**Ready to send emails!** 🚀
