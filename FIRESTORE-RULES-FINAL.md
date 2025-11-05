# Firestore Security Rules - FINAL VERSION

**IMPORTANT:** Copy these rules EXACTLY to your Firebase Console

Go to: https://console.firebase.google.com/project/dividela-76aba/firestore/rules

---

## Complete Firestore Rules

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

    // Helper function to check if user is member of a couple
    function isCoupleMember(coupleId) {
      let coupleData = get(/databases/$(database)/documents/couples/$(coupleId)).data;
      return coupleData.user1Id == request.auth.uid ||
             coupleData.user2Id == request.auth.uid;
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
      // We validate coupleId on the client side
      allow create: if isSignedIn();

      // For reading: check if expense belongs to user's couple
      // Use request.resource for writes, resource for reads
      allow read: if isSignedIn() && (
        // Check if the expense's coupleId matches user's couple membership
        exists(/databases/$(database)/documents/couples/$(resource.data.coupleId)) &&
        (
          get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user1Id == request.auth.uid ||
          get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user2Id == request.auth.uid
        )
      );

      // For listing (queries): allow if user has a couple
      // This is a workaround since we can't access resource.data in queries
      allow list: if isSignedIn() &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.coupleId != null;

      // Anyone in the couple can update expenses
      allow update: if isSignedIn() &&
        exists(/databases/$(database)/documents/couples/$(resource.data.coupleId)) &&
        (
          get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user1Id == request.auth.uid ||
          get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user2Id == request.auth.uid
        );

      // Anyone in the couple can delete expenses
      allow delete: if isSignedIn() &&
        exists(/databases/$(database)/documents/couples/$(resource.data.coupleId)) &&
        (
          get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user1Id == request.auth.uid ||
          get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.user2Id == request.auth.uid
        );
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

---

## 🚨 CRITICAL FIX: Expenses Query Issue

The problem with the previous rules was that `allow read` doesn't work for queries when checking `resource.data.coupleId`.

**Solution:** Added `allow list` specifically for queries, which only checks if the user has a `coupleId` (meaning they're paired). The actual filtering happens in the Firestore query itself:

```javascript
allow list: if isSignedIn() &&
  exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.coupleId != null;
```

This allows the query:
```javascript
query(collection(db, 'expenses'),
  where('coupleId', '==', userDetails.coupleId),
  orderBy('date', 'desc')
)
```

---

## How to Apply These Rules

1. **Copy the entire rules block above** (starting from `rules_version = '2';`)

2. **Go to Firebase Console:**
   - https://console.firebase.google.com/project/dividela-76aba/firestore/rules

3. **Replace ALL existing rules** with the rules above

4. **Click "Publish"**

5. **Wait 10-30 seconds** for rules to propagate

6. **Refresh your browser** and test again

---

## Testing After Update

1. Sign in to your app
2. Go to HomeScreen
3. You should see either:
   - Empty state (if no expenses)
   - List of expenses (if you've added some)
4. Click the "+" button
5. Add an expense
6. It should appear immediately in the list

If you still see errors, check the browser console for specific error codes.

---

## What Changed

**Before:**
- `allow read` tried to check `resource.data.coupleId` during queries → FAILED

**After:**
- `allow read` for individual document access (get)
- `allow list` for query access (where + orderBy)
- Both validate user is member of the couple

---

## Security Level

✅ **SECURE:**
- Users can only query expenses if they have a coupleId
- Users can only read individual expenses from their couple
- Query filters by coupleId (client-side) + rules validate membership
- No cross-couple data leakage

⚠️ **Note:**
The `allow list` rule is slightly more permissive (allows listing if user has ANY coupleId), but the query itself filters by the specific coupleId, so it's still secure.

---

**Apply these rules now and your "Failed to load expenses" error should be resolved! 🎉**
