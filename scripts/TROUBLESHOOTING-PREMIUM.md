# Troubleshooting Premium Access Issues

## Problem: Features Still Gated After Running Script

If you've run the `grant-premium-cli.js` script but premium features are still locked, follow these steps:

### Step 1: Verify Firestore Update

Check that the user document was updated in Firestore:

1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to `users` collection
4. Find the user by email
5. Verify these fields exist:
   ```
   subscriptionStatus: "premium"
   subscriptionExpiresAt: [Timestamp in the future]
   manuallyGranted: true
   subscriptionProductId: "manual_grant"
   ```

### Step 2: Clear App Cache

The app caches subscription status. Clear it:

**On Web:**
```bash
# Hard refresh
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# Or clear browser cache completely
```

**On Mobile:**
```bash
# Close app completely from app switcher
# Reopen the app
```

**On Expo Dev:**
```bash
# Press 'r' in terminal to reload
# Or shake device and select "Reload"
```

### Step 3: Check Console Logs

Open browser developer console and look for these logs:

**✅ Success - Should see:**
```
RevenueCat subscription status - Premium: false
✅ Manual premium grant found in Firestore
```

**❌ Problem - If you see:**
```
RevenueCat subscription status - Premium: false
(No Firestore message)
```
This means the Firestore check isn't working.

### Step 4: Verify Code Changes

Make sure the subscription service was updated:

```bash
cd /home/mg/dividela2
git diff src/services/subscriptionService.js
```

You should see the `checkFirestorePremiumStatus` function added.

### Step 5: Force Subscription Refresh

In the app, you can force a subscription refresh:

1. Navigate to Settings
2. Scroll to "Subscription" section
3. Tap "Restore Purchases" button
4. This triggers a fresh check

## Common Issues

### Issue 1: Expiration Date in the Past

**Problem:** Script ran but expiration date is already past.

**Solution:**
```bash
# Grant again with future date
node grant-premium-cli.js user@example.com 30d
```

### Issue 2: Wrong User Email

**Problem:** Updated wrong user account.

**Solution:**
```bash
# Verify email first
node find-couple-id-cli.js correct@example.com

# Then grant to correct user
node grant-premium-cli.js correct@example.com 30d
```

### Issue 3: Cache Not Cleared

**Problem:** Old subscription status cached in app.

**Solution:**
```bash
# Web: Clear all site data in browser DevTools
# Mobile: Delete app and reinstall (or clear app data)
# Expo: Stop metro bundler and restart
```

### Issue 4: Firebase Admin SDK Error

**Problem:** Script can't connect to Firestore.

**Check:**
- Service account file exists: `dividela-76aba-firebase-adminsdk-fbsvc-7056829219.json`
- File is in project root directory
- File has valid credentials

### Issue 5: User Not Found

**Problem:** "No user found with email"

**Solution:**
- Verify email is correct
- User must have an account in the app
- Check for typos in email
- Email comparison is case-insensitive

## Testing the Fix

### Quick Test Script

Create a test file `test-premium.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../dividela-76aba-firebase-adminsdk-fbsvc-7056829219.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testPremium(email) {
  const usersSnapshot = await db.collection('users')
    .where('email', '==', email)
    .get();

  if (usersSnapshot.empty) {
    console.log('❌ User not found');
    return;
  }

  const userData = usersSnapshot.docs[0].data();
  console.log('User Data:');
  console.log('  Status:', userData.subscriptionStatus);
  console.log('  Expires:', userData.subscriptionExpiresAt?.toDate());
  console.log('  Manual:', userData.manuallyGranted);
  console.log('  Product:', userData.subscriptionProductId);

  const isExpired = userData.subscriptionExpiresAt
    && userData.subscriptionExpiresAt.toDate() < new Date();

  console.log('\nPremium Active:',
    userData.subscriptionStatus === 'premium' && !isExpired ? '✅ YES' : '❌ NO');

  await admin.app().delete();
}

testPremium(process.argv[2]);
```

Run it:
```bash
node test-premium.js user@example.com
```

## How Manual Grants Work

### The Flow

1. **Script Updates Firestore:**
   - Sets `subscriptionStatus: "premium"`
   - Sets expiration date
   - Marks as manually granted

2. **App Checks Subscription:**
   - First checks RevenueCat (will be false for manual grants)
   - Falls back to Firestore if RevenueCat says not premium
   - Validates expiration date

3. **Premium Status Determined:**
   - If Firestore shows premium AND not expired → User gets access
   - Updates app state immediately
   - All premium features unlock

### Code Path

```
App Loads
  ↓
SubscriptionContext initializes
  ↓
checkSubscriptionStatus() called
  ↓
Checks RevenueCat first
  ↓
If not premium in RevenueCat
  ↓
checkFirestorePremiumStatus()
  ↓
Reads user doc from Firestore
  ↓
Checks: subscriptionStatus === 'premium'
       AND expirationDate > now
  ↓
Returns isPremium: true
  ↓
All premium features unlock
```

## Emergency Recovery

If nothing works, you can manually set fields in Firebase Console:

1. Open Firebase Console
2. Go to Firestore
3. Navigate to users → [userId]
4. Edit document:
   ```json
   {
     "subscriptionStatus": "premium",
     "subscriptionExpiresAt": [Timestamp: 2099-12-31],
     "manuallyGranted": true,
     "subscriptionProductId": "manual_grant",
     "subscriptionPlatform": "admin",
     "lastSyncedAt": [Timestamp: now]
   }
   ```
5. Save
6. User closes and reopens app

## Verification Checklist

Use this to verify everything is working:

- [ ] Script ran successfully without errors
- [ ] Firestore shows `subscriptionStatus: "premium"`
- [ ] Expiration date is in the future
- [ ] App completely closed and reopened
- [ ] Browser cache cleared (for web)
- [ ] Console shows "Manual premium grant found"
- [ ] Lock icons removed from premium features
- [ ] Can access "Scan Receipt" button
- [ ] Can access "Import Expenses"
- [ ] Paywall doesn't appear when tapping premium features

## Getting Help

If you're still having issues:

1. Check all fields in Firestore are correct
2. Verify subscription service code has the Firestore fallback
3. Look for errors in browser/app console
4. Try with a different test user
5. Check if RevenueCat is overriding (shouldn't happen but possible)

## Support Scripts

### Check User's Current Status
```bash
node find-couple-id-cli.js user@example.com
```

### Verify Premium Grant
```bash
# The grant script shows current status before and after
node grant-premium-cli.js user@example.com 1d
```

### Revoke and Re-grant
```bash
# Sometimes helps clear any cached state
node grant-premium-cli.js user@example.com revoke
node grant-premium-cli.js user@example.com 30d
```
