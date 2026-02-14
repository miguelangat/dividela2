/**
 * Diagnostic script to find missing partner data for a user
 *
 * This script helps find the coupleId and partnerId for a user
 * whose partner connection data was lost.
 *
 * Usage:
 * 1. Open Firebase Console: https://console.firebase.google.com
 * 2. Go to your project > Firestore Database
 * 3. Use the queries below to find the data
 *
 * Or run this script with firebase-admin SDK configured
 */

// =============================================
// MANUAL FIREBASE CONSOLE INSTRUCTIONS
// =============================================

console.log(`
=============================================
FINDING PARTNER DATA FOR: miguelangat@gmail.com
=============================================

STEP 1: Find the user's UID
----------------------------
1. Go to Firebase Console > Authentication > Users
2. Search for "miguelangat@gmail.com"
3. Copy the User UID (looks like: "abc123xyz...")

STEP 2: Search for couple documents
-----------------------------------
1. Go to Firebase Console > Firestore Database
2. Click on the "couples" collection
3. Look for documents where:
   - user1Id = [user's UID] OR
   - user2Id = [user's UID]
4. Note the couple document ID (starts with "couple_")

STEP 3: Find the partner
------------------------
From the couple document:
- If user1Id is the target user, then partnerId = user2Id
- If user2Id is the target user, then partnerId = user1Id

STEP 4: Update the user document
--------------------------------
1. Go to "users" collection
2. Find the document for the target user (by UID)
3. Click "Edit" (pencil icon)
4. Update these fields:
   - partnerId: [partner's UID from step 3]
   - coupleId: [couple document ID from step 2]
5. Click "Update"

STEP 5: Verify
--------------
1. Refresh the web app
2. Check browser console for:
   "partnerId: [value], coupleId: [value]"
3. User should now see CoreSetup or Main app

=============================================
`);

// =============================================
// PROGRAMMATIC SEARCH (requires firebase-admin)
// =============================================

async function findPartnerData(targetEmail) {
  // This requires firebase-admin SDK to be initialized
  // const admin = require('firebase-admin');
  // admin.initializeApp();
  // const db = admin.firestore();

  console.log(`Searching for partner data for: ${targetEmail}`);

  // 1. Get user by email
  // const usersSnapshot = await db.collection('users').where('email', '==', targetEmail).get();
  // if (usersSnapshot.empty) {
  //   console.log('User not found');
  //   return;
  // }
  // const userDoc = usersSnapshot.docs[0];
  // const userId = userDoc.id;
  // const userData = userDoc.data();
  // console.log('Found user:', userId);
  // console.log('Current data:', { partnerId: userData.partnerId, coupleId: userData.coupleId });

  // 2. Search couples collection for this user
  // const couples1 = await db.collection('couples').where('user1Id', '==', userId).get();
  // const couples2 = await db.collection('couples').where('user2Id', '==', userId).get();

  // const allCouples = [...couples1.docs, ...couples2.docs];
  // console.log(`Found ${allCouples.length} couple document(s)`);

  // for (const doc of allCouples) {
  //   console.log('Couple ID:', doc.id);
  //   console.log('Couple data:', doc.data());
  // }

  // 3. Search invite codes
  // const createdCodes = await db.collection('inviteCodes').where('createdBy', '==', userId).get();
  // const usedCodes = await db.collection('inviteCodes').where('usedBy', '==', userId).get();
  // console.log(`Found ${createdCodes.size} codes created by user`);
  // console.log(`Found ${usedCodes.size} codes used by user`);

  // 4. Check if any user has this as previousPartnerId
  // const previousPartners = await db.collection('users').where('previousPartnerId', '==', userId).get();
  // console.log(`Found ${previousPartners.size} user(s) with this as previousPartnerId`);
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { findPartnerData };
}

// =============================================
// BROWSER CONSOLE SNIPPET (for quick debugging)
// =============================================

console.log(`
=============================================
BROWSER CONSOLE SNIPPET
=============================================
Copy and paste this into the browser console while logged in as the affected user:

// Check current user data
const auth = await import('./config/firebase');
console.log('Current user:', auth.auth.currentUser?.email);

// This will show what data the app currently has
console.log('Check AuthContext state in React DevTools > Components > AuthProvider');

=============================================
`);

// =============================================
// FIX SCRIPT (requires firebase-admin)
// =============================================

async function fixPartnerData(userId, partnerId, coupleId) {
  console.log(`
=============================================
TO FIX THE DATA:
=============================================

Update the user document in Firebase Console:

Document path: users/${userId}
Fields to update:
  partnerId: "${partnerId}"
  coupleId: "${coupleId}"

Or using firebase-admin SDK:

  await db.collection('users').doc('${userId}').update({
    partnerId: '${partnerId}',
    coupleId: '${coupleId}'
  });

=============================================
`);
}

console.log('\n\nScript loaded. See instructions above for finding and fixing partner data.\n');
