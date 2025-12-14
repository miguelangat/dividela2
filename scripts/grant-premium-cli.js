#!/usr/bin/env node

/**
 * Dividela - Grant Premium Access (CLI)
 *
 * Manually grant premium access to users for testing or promotional purposes.
 *
 * Usage:
 *   node grant-premium-cli.js <email> <duration>
 *
 * Examples:
 *   node grant-premium-cli.js user@example.com 30d      # 30 days
 *   node grant-premium-cli.js user@example.com 12m      # 12 months
 *   node grant-premium-cli.js user@example.com 1y       # 1 year
 *   node grant-premium-cli.js user@example.com lifetime # Lifetime access
 *   node grant-premium-cli.js user@example.com revoke   # Revoke premium
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '..', 'dividela-76aba-firebase-adminsdk-fbsvc-7056829219.json');

try {
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Parse duration string to milliseconds
 * Supports: 30d, 12m, 1y, lifetime
 */
function parseDuration(durationStr) {
  if (durationStr.toLowerCase() === 'lifetime') {
    // Set to 100 years from now
    return 100 * 365 * 24 * 60 * 60 * 1000;
  }

  if (durationStr.toLowerCase() === 'revoke') {
    return 'revoke';
  }

  const match = durationStr.match(/^(\d+)(d|m|y)$/i);
  if (!match) {
    throw new Error('Invalid duration format. Use: 30d, 12m, 1y, lifetime, or revoke');
  }

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'd': // days
      return value * 24 * 60 * 60 * 1000;
    case 'm': // months (approximate)
      return value * 30 * 24 * 60 * 60 * 1000;
    case 'y': // years
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid duration unit');
  }
}

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
 * Grant premium access to user
 */
async function grantPremium(userId, durationMs) {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + durationMs);

  const updateData = {
    subscriptionStatus: 'premium',
    subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(expirationDate),
    subscriptionProductId: 'manual_grant',
    subscriptionPlatform: 'admin',
    lastSyncedAt: admin.firestore.Timestamp.fromDate(now),
    manuallyGranted: true,
    grantedAt: admin.firestore.Timestamp.fromDate(now),
  };

  await db.collection('users').doc(userId).update(updateData);

  return {
    expirationDate,
    updateData,
  };
}

/**
 * Revoke premium access
 */
async function revokePremium(userId) {
  const now = new Date();

  const updateData = {
    subscriptionStatus: 'free',
    subscriptionExpiresAt: null,
    subscriptionProductId: null,
    subscriptionPlatform: null,
    lastSyncedAt: admin.firestore.Timestamp.fromDate(now),
    manuallyGranted: false,
    revokedAt: admin.firestore.Timestamp.fromDate(now),
  };

  await db.collection('users').doc(userId).update(updateData);

  return { updateData };
}

/**
 * Format date for display
 */
function formatDate(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Main execution
 */
async function main() {
  const email = process.argv[2];
  const duration = process.argv[3];

  if (!email || !duration) {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     DIVIDELA - GRANT PREMIUM ACCESS            ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('Usage:');
    console.log('  node grant-premium-cli.js <email> <duration>');
    console.log('');
    console.log('Duration Examples:');
    console.log('  30d        - 30 days');
    console.log('  12m        - 12 months');
    console.log('  1y         - 1 year');
    console.log('  lifetime   - Lifetime access (100 years)');
    console.log('  revoke     - Revoke premium access');
    console.log('');
    console.log('Examples:');
    console.log('  node grant-premium-cli.js user@example.com 30d');
    console.log('  node grant-premium-cli.js user@example.com lifetime');
    console.log('  node grant-premium-cli.js user@example.com revoke');
    console.log('');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     DIVIDELA - GRANT PREMIUM ACCESS            ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Parse duration
    let durationMs;
    let isRevoke = false;

    try {
      durationMs = parseDuration(duration);
      if (durationMs === 'revoke') {
        isRevoke = true;
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
      process.exit(1);
    }

    console.log(`🔍 Searching for user: ${email}\n`);

    // Find user
    const user = await findUserByEmail(email.toLowerCase().trim());

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
    console.log(`  Current:    ${user.subscriptionStatus || 'free'}`);
    if (user.subscriptionExpiresAt) {
      console.log(`  Expires:    ${formatDate(user.subscriptionExpiresAt.toDate())}`);
    }
    console.log('━'.repeat(50));
    console.log('');

    if (isRevoke) {
      // Revoke premium
      console.log('🔄 Revoking premium access...\n');

      const result = await revokePremium(user.uid);

      console.log('✅ Premium access revoked successfully!');
      console.log('━'.repeat(50));
      console.log(`  Status:     free`);
      console.log(`  Revoked:    ${formatDate(new Date())}`);
      console.log('━'.repeat(50));
    } else {
      // Grant premium
      console.log(`🔄 Granting premium access for ${duration}...\n`);

      const result = await grantPremium(user.uid, durationMs);

      console.log('✅ Premium access granted successfully!');
      console.log('━'.repeat(50));
      console.log(`  Status:     premium`);
      console.log(`  Granted:    ${formatDate(new Date())}`);
      console.log(`  Expires:    ${formatDate(result.expirationDate)}`);
      console.log(`  Product ID: manual_grant`);
      console.log(`  Platform:   admin`);
      console.log('━'.repeat(50));
    }

    console.log('');
    console.log('📱 Next Steps:');
    console.log('   1. User should close and restart the app completely');
    console.log('   2. On web: Clear browser cache or hard refresh (Ctrl+Shift+R)');
    console.log('   3. Premium features will be available immediately after restart');
    console.log('');
    console.log('💡 If features are still gated:');
    console.log('   - The app checks both RevenueCat AND Firestore');
    console.log('   - Manual grants are found via Firestore fallback');
    console.log('   - Check browser console for "Manual premium grant found"');
    console.log('');

    if (!isRevoke && duration.toLowerCase() === 'lifetime') {
      console.log('⚠️  Note: Lifetime access set to expire in 100 years');
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    await admin.app().delete();
  }
}

// Run the script
main();
