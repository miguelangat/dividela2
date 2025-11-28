# Premium Access Management Guide

This guide covers how to manually manage premium subscriptions for Dividela users.

## Quick Reference

### Grant Premium Access

```bash
# Navigate to scripts directory
cd /home/mg/dividela2/scripts

# Grant premium for different durations
node grant-premium-cli.js user@example.com 30d      # 30 days (good for testing)
node grant-premium-cli.js user@example.com 12m      # 12 months (annual subscription)
node grant-premium-cli.js user@example.com 1y       # 1 year
node grant-premium-cli.js user@example.com lifetime # Lifetime access (100 years)
```

### Revoke Premium Access

```bash
node grant-premium-cli.js user@example.com revoke
```

### Check Current Status

The script will always show the user's current subscription status before making changes:
- Current subscription status (free/premium)
- Expiration date (if premium)
- User details

## Common Use Cases

### 1. Testing Premium Features

When developing or testing premium features:

```bash
# Grant yourself 30 days
node grant-premium-cli.js your-test-email@example.com 30d
```

### 2. Promotional Access

Giving users promotional access:

```bash
# 3 month promotional period
node grant-premium-cli.js promo-user@example.com 3m
```

### 3. Beta Testers

For beta testers of premium features:

```bash
# Lifetime access for beta testers
node grant-premium-cli.js beta-tester@example.com lifetime
```

### 4. Customer Support

When helping customers with issues:

```bash
# Extend by 1 month as compensation
node grant-premium-cli.js customer@example.com 1m
```

### 5. Remove Test Accounts

After testing:

```bash
# Revoke premium
node grant-premium-cli.js test@example.com revoke
```

## How It Works

### Firestore Updates

The script updates the user document in Firestore with the following fields:

**When Granting Premium:**
```javascript
{
  subscriptionStatus: "premium",
  subscriptionExpiresAt: Timestamp,      // Calculated from duration
  subscriptionProductId: "manual_grant",
  subscriptionPlatform: "admin",
  lastSyncedAt: Timestamp,
  manuallyGranted: true,
  grantedAt: Timestamp
}
```

**When Revoking Premium:**
```javascript
{
  subscriptionStatus: "free",
  subscriptionExpiresAt: null,
  subscriptionProductId: null,
  subscriptionPlatform: null,
  lastSyncedAt: Timestamp,
  manuallyGranted: false,
  revokedAt: Timestamp
}
```

### Premium Features Enabled

Once premium is granted, users immediately get access to:

✅ **Receipt Scanning** - AI-powered OCR for receipts
✅ **CSV Import** - Bulk import expenses from bank statements
✅ **Unlimited Budgets** - Create unlimited budget categories
✅ **Annual View** - Track expenses across the entire year
✅ **Advanced Analytics** - Detailed insights and trends
✅ **Export Data** - Download expenses for taxes/records
✅ **Custom Categories** - Create custom expense categories
✅ **Recurring Expenses** - Automate regular bills
✅ **Relationship Insights** - Financial health scores
✅ **Priority Support** - Enhanced customer support

## Important Notes

### 1. Immediate Effect
- Changes take effect immediately
- User needs to restart the app or wait for subscription context to refresh
- Usually happens within a few seconds

### 2. No RevenueCat Integration
- Manual grants bypass RevenueCat
- Marked with `subscriptionProductId: "manual_grant"`
- Tracked with `manuallyGranted: true` flag
- Won't show in RevenueCat dashboard

### 3. Expiration Handling
- The app automatically checks expiration dates
- Premium features will be disabled after expiration
- No automatic renewal for manual grants

### 4. Duration Calculations
- `d` = days (24 hours)
- `m` = months (30 days approximate)
- `y` = years (365 days)
- `lifetime` = 100 years from grant date

### 5. Security
- Requires Firebase Admin SDK credentials
- Only run from secure server/development machine
- Service account file must be protected

## Troubleshooting

### "No user found with email"
- Verify the email address is correct
- User must have an account in the app
- Email is case-insensitive

### "Invalid duration format"
- Use format: `<number><unit>` (e.g., `30d`, `12m`, `1y`)
- Or use `lifetime` or `revoke`
- Units: `d` (days), `m` (months), `y` (years)

### Premium not showing in app
1. User should restart the app
2. Check Firestore to verify the update
3. Verify `subscriptionStatus` is set to "premium"
4. Check `subscriptionExpiresAt` is in the future

### Already expired
- Grant a new duration
- The script will update the expiration date
- Old expiration is overwritten

## Monitoring Manual Grants

To find all manually granted premium users:

```javascript
// In Firebase Console or script
db.collection('users')
  .where('manuallyGranted', '==', true)
  .get()
```

To check who has active manual grants:

```javascript
// In Firebase Console or script
db.collection('users')
  .where('subscriptionProductId', '==', 'manual_grant')
  .where('subscriptionStatus', '==', 'premium')
  .get()
```

## Best Practices

1. **Document manual grants** - Keep a record of who and why
2. **Use appropriate durations** - Don't give lifetime unless necessary
3. **Test first** - Try on a test account before production users
4. **Verify status** - Check user can access features after granting
5. **Revoke when done** - Remove test grants after testing

## Example Session

```bash
$ cd /home/mg/dividela2/scripts

$ node grant-premium-cli.js test@example.com 30d
╔════════════════════════════════════════════════╗
║     DIVIDELA - GRANT PREMIUM ACCESS            ║
╚════════════════════════════════════════════════╝

🔍 Searching for user: test@example.com

✅ User found!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Name:       Test User
  Email:      test@example.com
  User ID:    abc123xyz
  Current:    free
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Granting premium access for 30d...

✅ Premium access granted successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Status:     premium
  Granted:    November 27, 2025, 02:30 PM
  Expires:    December 27, 2025, 02:30 PM
  Product ID: manual_grant
  Platform:   admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 The user will see premium features immediately
   when they restart the app or their subscription
   context refreshes.
```

## Support

For issues with the script:
1. Check Firebase Admin SDK is initialized correctly
2. Verify service account file exists
3. Ensure user email exists in Firestore
4. Check Firestore security rules (shouldn't affect Admin SDK)

For premium feature bugs:
- Check the subscription context in the app
- Verify `isPremium` hook is working correctly
- Look at subscription service logs
