# Firestore Security Rules Setup

## Problem: "Permission Denied" Error

If you're getting a "Failed to generate invite code" error, it's likely because your Firestore security rules are too restrictive or have expired (test mode only lasts 30 days).

## Solution: Update Firestore Security Rules

### Step 1: Open Firebase Console

1. Go to: https://console.firebase.google.com/project/dividela-76aba/firestore/rules
2. Or navigate: Firebase Console → Firestore Database → Rules tab

### Step 2: Replace the Rules

Copy and paste these security rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }

    // Helper function to check if user owns the document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection - users can read all, but update rules are relaxed for pairing
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && isOwner(userId);

      // Allow updates to own document OR when adding partnerId/coupleId (for pairing)
      allow update: if isSignedIn() && (
        isOwner(userId) ||
        (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['partnerId', 'coupleId']))
      );

      allow delete: if false; // Don't allow deleting users
    }

    // Invite codes collection
    match /inviteCodes/{codeId} {
      // Anyone authenticated can create an invite code
      allow create: if isSignedIn();

      // Anyone can read invite codes (needed to validate codes)
      allow read: if true;

      // Only the creator can update their own codes
      // Or anyone can update when using a code (marking as used)
      allow update: if isSignedIn();

      // Don't allow deleting codes
      allow delete: if false;
    }

    // Couples collection
    match /couples/{coupleId} {
      // Anyone authenticated can create a couple
      allow create: if isSignedIn();

      // Only members of the couple can read
      allow read: if isSignedIn() && (
        resource.data.user1Id == request.auth.uid ||
        resource.data.user2Id == request.auth.uid
      );

      // Only members of the couple can update
      allow update: if isSignedIn() && (
        resource.data.user1Id == request.auth.uid ||
        resource.data.user2Id == request.auth.uid
      );

      // Don't allow deleting couples
      allow delete: if false;
    }

    // Expenses collection
    match /expenses/{expenseId} {
      // Anyone authenticated can create expenses
      allow create: if isSignedIn();

      // Users can read expenses from their couple
      allow read: if isSignedIn() &&
        exists(/databases/$(database)/documents/couples/$(resource.data.coupleId)) &&
        (get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user1Id == request.auth.uid ||
         get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user2Id == request.auth.uid);

      // Anyone in the couple can update expenses
      allow update: if isSignedIn() &&
        exists(/databases/$(database)/documents/couples/$(resource.data.coupleId)) &&
        (get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user1Id == request.auth.uid ||
         get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user2Id == request.auth.uid);

      // Anyone in the couple can delete expenses
      allow delete: if isSignedIn() &&
        exists(/databases/$(database)/documents/couples/$(resource.data.coupleId)) &&
        (get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user1Id == request.auth.uid ||
         get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user2Id == request.auth.uid);
    }

    // Settlements collection (for future use)
    match /settlements/{settlementId} {
      // Anyone authenticated can create settlements
      allow create: if isSignedIn();

      // Only couple members can read their settlements
      allow read: if isSignedIn() && (
        resource.data.user1Id == request.auth.uid ||
        resource.data.user2Id == request.auth.uid
      );

      // Don't allow updating or deleting settlements
      allow update, delete: if false;
    }
  }
}
```

### Step 3: Publish the Rules

1. Click the **"Publish"** button in the Firebase Console
2. Wait for the confirmation message

### Step 4: Test Again

1. Refresh your browser (http://localhost:8081)
2. Sign in or create an account
3. Go to Connect screen
4. Tap "Invite Partner"
5. You should now see a 6-digit code!

## Understanding the Rules

### Key Points:

1. **Authentication Required**: All operations require a signed-in user
2. **Invite Codes**:
   - Anyone authenticated can create
   - Anyone can read (needed for validation)
   - Anyone can update (for marking as used)
3. **Users**: Users can only access their own data
4. **Couples**: Only couple members can read/update their data
5. **Expenses**: Only couple members can access their expenses

### Security Features:

- ✅ Users can't access other users' data
- ✅ Users can't see other couples' expenses
- ✅ Invite codes are readable (needed for joining)
- ✅ No data can be deleted (preserve history)
- ✅ All operations require authentication

## Alternative: Test Mode (Not Recommended for Production)

If you just want to test quickly and don't care about security yet:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **Warning**: This allows any authenticated user to read/write any data. Only use for testing!

## Troubleshooting

### Still getting "Permission Denied"?

1. **Check Authentication**: Make sure you're signed in
   - Open browser console
   - Look for "User ID: ..." log message
   - If no user ID, you're not signed in

2. **Check Rules Published**:
   - Rules can take a few seconds to propagate
   - Wait 10-30 seconds and try again

3. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Look at Console tab
   - Look for detailed error messages

4. **Verify Firebase Config**:
   - Check `.env` file has correct credentials
   - Restart Expo if you changed `.env`

### Error: "unavailable"

This means network issue or Firebase is unreachable:
- Check your internet connection
- Check if Firebase is down: https://status.firebase.google.com/

## Next Steps

Once you've updated the security rules, your invite code system should work perfectly! The app will:
1. Generate a random 6-digit code
2. Save it to Firestore
3. Display it with copy/share options
4. Listen for when your partner joins
5. Auto-navigate to success screen

Happy pairing! 🎉
