# Dividela Admin Scripts

This directory contains admin scripts for managing your Dividela data and user accounts.

## Prerequisites

- Node.js installed
- Firebase Admin SDK service account file (already configured)
- Your Couple ID or email address

## Scripts

### 1. Find Your Couple ID

Use this script first if you don't know your Couple ID:

```bash
cd scripts
node find-couple-id.js
```

It will:
- Prompt for your email address
- Look up your user account
- Display your Couple ID and partner information

### 2. Grant Premium Access

Manually grant premium access to users for testing or promotional purposes:

```bash
cd scripts
node grant-premium-cli.js <email> <duration>
```

**Duration Options:**
- `30d` - 30 days
- `12m` - 12 months
- `1y` - 1 year
- `lifetime` - Lifetime access (100 years)
- `revoke` - Revoke premium access

**Examples:**
```bash
# Grant 30 days of premium
node grant-premium-cli.js user@example.com 30d

# Grant lifetime access
node grant-premium-cli.js user@example.com lifetime

# Revoke premium access
node grant-premium-cli.js user@example.com revoke
```

The script will:
1. Find the user by email
2. Display current subscription status
3. Update their premium access in Firestore
4. Show the new expiration date

**What It Updates:**
- `subscriptionStatus` - Set to "premium" or "free"
- `subscriptionExpiresAt` - Expiration timestamp
- `subscriptionProductId` - Set to "manual_grant"
- `subscriptionPlatform` - Set to "admin"
- `manuallyGranted` - Flag for tracking manual grants

**Note:** The user will see premium features immediately when they restart the app or their subscription context refreshes.

### 3. Cleanup All Data

**⚠️ WARNING: This is destructive and cannot be undone!**

This script deletes all expenses, settlements, budgets, and custom categories for your couple:

```bash
cd scripts
node cleanup-data.js
```

It will:
1. Prompt for your Couple ID
2. Display your couple information and current data counts
3. Ask for confirmation (you must type "DELETE")
4. Delete all:
   - Expenses
   - Settlements
   - Budgets
   - Custom categories (default categories are kept)
5. Reset couple metadata (`lastSettlementAt`)
6. Display verification of deletions

### What Gets Deleted

- ✅ **All expenses** - Complete transaction history
- ✅ **All settlements** - Payment history between partners
- ✅ **All budgets** - Monthly budget records
- ✅ **Custom categories** - Only custom categories you created

### What Is Preserved

- ✅ **User accounts** - Your login and profile data
- ✅ **Couple relationship** - Your partnership connection
- ✅ **Default categories** - System categories (Food, Groceries, Transport, etc.)

## Example Usage

```bash
# Step 1: Find your Couple ID
cd /home/mg/dividela2/scripts
node find-couple-id.js
# Enter your email when prompted
# Copy the Couple ID shown

# Step 2: Run cleanup
node cleanup-data.js
# Paste your Couple ID when prompted
# Review the data summary
# Type "DELETE" to confirm
```

## Safety Features

1. **Confirmation Required** - You must type "DELETE" exactly (case-sensitive)
2. **Data Display** - Shows what will be deleted before proceeding
3. **Verification** - Confirms counts after deletion
4. **Couple Validation** - Verifies the Couple ID exists before proceeding

## Troubleshooting

### "Couple with ID not found"
- Double-check your Couple ID
- Use `find-couple-id.js` to get the correct ID

### "Firebase Admin SDK initialization failed"
- Make sure the service account file exists:
  `/home/mg/dividela2/dividela-76aba-firebase-adminsdk-fbsvc-7056829219.json`

### "No user found with email"
- Verify you're using the correct email address
- Check that you're registered in the app

## After Cleanup

Once cleanup is complete:
1. Your app will show zero expenses and settlements
2. Default categories will still be available
3. You can immediately start adding new expenses
4. Budget tracking can be reconfigured

## Notes

- The scripts use Firebase Admin SDK which bypasses security rules
- Operations are atomic and use batches for efficiency
- Large datasets may take a few moments to delete
- The couple relationship remains intact after cleanup
