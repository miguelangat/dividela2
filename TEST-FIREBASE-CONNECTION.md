# Test Firebase Connection & Rules

If you're still getting errors after publishing the rules, here's how to diagnose the issue:

## Step 1: Check Browser Console

Open Developer Tools (F12) and look at the Console tab. You should see detailed logs like:

### When clicking "Invite Partner":
```
Attempting to save invite code: ABC123
User ID: XYZ123456...
✓ Invite code saved successfully: ABC123
```

### Or if it fails:
```
Error generating invite code: [Error details]
Error code: permission-denied
Error message: Missing or insufficient permissions
```

## Step 2: Verify Rules Are Active

1. Go to Firebase Console: https://console.firebase.google.com/project/dividela-76aba/firestore/rules
2. Check that the rules you pasted are showing in the editor
3. Look for a green checkmark or "Published" status
4. Check the timestamp - should be recent (within last few minutes)

## Step 3: Common Issues & Solutions

### Issue: "permission-denied" error

**Cause**: Rules not properly published OR rules have syntax error

**Solutions**:
1. Re-publish the rules (click Publish button again)
2. Check for any red error messages in Firebase Console rules editor
3. Wait 30-60 seconds for rules to propagate globally
4. Refresh your browser completely (Ctrl+Shift+F5)

### Issue: "not-found" error

**Cause**: User document doesn't exist in Firestore

**Solutions**:
1. Sign out completely
2. Create a brand new account with a different email
3. This will create a fresh user document

### Issue: "User must be signed in" error

**Cause**: Not authenticated or auth state not loaded

**Solutions**:
1. Make sure you signed in successfully
2. Wait a moment after signing in before navigating
3. Check if you see your email in the UI anywhere

### Issue: Still getting generic "Failed to create couple connection"

**Cause**: Multiple possible issues - need to see console logs

**What to check**:
Look in browser console for which step is failing:
- "Creating couple document..." → "✓ Couple document created" (Step 1)
- "Updating current user document..." → "✓ Current user updated" (Step 2)
- "Updating partner user document..." → "✓ Partner user updated" (Step 3)
- "Marking invite code as used..." → "✓ Invite code marked as used" (Step 4)

If it fails at Step 2 or Step 3, the user document might not exist.

## Step 4: Test with Fresh Users

The most reliable test:

1. **Sign out** (if there's a sign out button)
2. **Clear browser data**:
   - Press F12 → Application tab → Storage → Clear site data
3. **Refresh the page**
4. **Create User A**:
   - Sign up with email: `user1@test.com` / password: `password123`
   - Should land on Connect screen
5. **Click "Invite Partner"**:
   - Should see a 6-digit code (e.g., "ABC 123")
   - ✅ SUCCESS! Copy the code
6. **Open incognito/private window**
7. **Create User B**:
   - Go to http://localhost:8081
   - Sign up with email: `user2@test.com` / password: `password123`
   - Should land on Connect screen
8. **Click "Join Partner"**:
   - Enter the code from User A
   - Click "Connect"
   - ✅ SUCCESS! Should navigate to success screen
9. **Check User A's window**:
   - Should auto-navigate to success screen (real-time update!)

## Step 5: Verify in Firebase Console

After successful pairing:

1. **Check Firestore Database**: https://console.firebase.google.com/project/dividela-76aba/firestore/data

You should see 3 collections:

### `inviteCodes`
- Should have at least one document with code like "ABC123"
- Check fields: `createdBy`, `isUsed: true`, `usedBy`

### `users`
- Should have 2 documents (one for each user)
- Both should have `partnerId` and `coupleId` fields populated

### `couples`
- Should have 1 document
- Contains: `user1Id`, `user2Id`, `inviteCode`, `currentBalance: 0`

## Step 6: If Still Not Working

**Copy the exact error message from browser console and share it.**

The error message will tell us exactly what's wrong:
- `permission-denied` → Rules issue
- `not-found` → User document issue
- `unavailable` → Network/Firebase connectivity
- Other → Might need code fix

## Quick Rules Test

If you want to test if rules are working at all, try this:

1. Open browser console
2. Paste and run this code:

```javascript
// Test write to inviteCodes collection
import { doc, setDoc } from 'firebase/firestore';
import { db } from './src/config/firebase';

setDoc(doc(db, 'inviteCodes', 'TEST123'), {
  code: 'TEST123',
  createdBy: 'test',
  createdAt: new Date(),
  expiresAt: new Date(),
  isUsed: false
}).then(() => {
  console.log('✅ Rules working! Write succeeded');
}).catch((err) => {
  console.error('❌ Rules not working:', err.code, err.message);
});
```

If you get "❌ Rules not working: permission-denied", the rules aren't active yet.

---

**Need help?** Share:
1. The exact error message from console
2. Screenshot of Firebase Console rules page
3. Which step it's failing at (Invite or Join)
