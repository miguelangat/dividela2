#!/usr/bin/env node

/**
 * Dividela - Find Couple ID Helper
 *
 * This script helps you find your Couple ID by your email address
 *
 * Usage:
 *   node find-couple-id.js
 */

const admin = require('firebase-admin');
const readlineSync = require('readline-sync');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '..', 'dividela-76aba-firebase-adminsdk-fbsvc-7056829219.json');

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('✅ Firebase Admin SDK initialized successfully\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.error('Make sure the service account file exists at:', serviceAccountPath);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Find user by email
 */
async function findUserByEmail(email) {
  const usersSnapshot = await db.collection('users')
    .where('email', '==', email)
    .get();

  if (usersSnapshot.empty) {
    return null;
  }

  return {
    id: usersSnapshot.docs[0].id,
    ...usersSnapshot.docs[0].data(),
  };
}

/**
 * Get couple information
 */
async function getCoupleInfo(coupleId) {
  const coupleDoc = await db.collection('couples').doc(coupleId).get();

  if (!coupleDoc.exists) {
    return null;
  }

  const coupleData = coupleDoc.data();

  // Get user names
  const user1Doc = await db.collection('users').doc(coupleData.user1Id).get();
  const user2Doc = await db.collection('users').doc(coupleData.user2Id).get();

  return {
    coupleId,
    user1: {
      id: coupleData.user1Id,
      name: user1Doc.exists ? user1Doc.data().displayName : 'Unknown',
      email: user1Doc.exists ? user1Doc.data().email : 'Unknown',
    },
    user2: {
      id: coupleData.user2Id,
      name: user2Doc.exists ? user2Doc.data().displayName : 'Unknown',
      email: user2Doc.exists ? user2Doc.data().email : 'Unknown',
    },
    createdAt: coupleData.createdAt,
    lastSettlementAt: coupleData.lastSettlementAt,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║        FIND YOUR COUPLE ID                     ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Get email from user
    const email = readlineSync.question('Enter your email address: ').trim().toLowerCase();

    if (!email) {
      console.log('❌ Email is required');
      process.exit(1);
    }

    console.log('\n🔍 Searching for your account...\n');

    // Find user
    const user = await findUserByEmail(email);

    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      console.log('   Make sure you entered the correct email address.');
      process.exit(1);
    }

    console.log('✅ User found!');
    console.log('━'.repeat(50));
    console.log(`  Name:       ${user.displayName || 'Not set'}`);
    console.log(`  Email:      ${user.email}`);
    console.log(`  User ID:    ${user.uid}`);
    console.log('━'.repeat(50));
    console.log('');

    if (!user.coupleId) {
      console.log('⚠️  You are not currently part of a couple.');
      console.log('   You need to connect with a partner first.');
      process.exit(0);
    }

    // Get couple info
    console.log('🔍 Fetching couple information...\n');
    const coupleInfo = await getCoupleInfo(user.coupleId);

    if (!coupleInfo) {
      console.log('❌ Couple data not found (data inconsistency)');
      process.exit(1);
    }

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          YOUR COUPLE INFORMATION               ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  🆔 COUPLE ID: ${coupleInfo.coupleId}`);
    console.log('');
    console.log('  👥 Partners:');
    console.log(`     • ${coupleInfo.user1.name} (${coupleInfo.user1.email})`);
    console.log(`     • ${coupleInfo.user2.name} (${coupleInfo.user2.email})`);
    console.log('');
    console.log('━'.repeat(50));
    console.log('');
    console.log('💡 Use this Couple ID when running the cleanup script:');
    console.log(`   node cleanup-data.js`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    await admin.app().delete();
  }
}

// Run the script
main();
