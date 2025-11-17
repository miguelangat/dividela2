#!/usr/bin/env node

/**
 * Dividela Data Cleanup Script (CLI version)
 *
 * This script deletes all expenses, settlements, budgets, and custom categories
 * for a specific couple, effectively resetting their budget data.
 *
 * ⚠️ WARNING: This operation is DESTRUCTIVE and CANNOT be undone!
 *
 * Usage:
 *   node cleanup-data-cli.js <coupleId> [--confirm]
 *
 * Example:
 *   node cleanup-data-cli.js abc123 --confirm
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

  console.log('✅ Firebase Admin SDK initialized successfully\n');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.error('Make sure the service account file exists at:', serviceAccountPath);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Delete all documents in a collection matching a query
 */
async function deleteCollection(collectionPath, queryFn, batchSize = 500) {
  const collectionRef = db.collection(collectionPath);
  const query = queryFn ? queryFn(collectionRef) : collectionRef;

  let totalDeleted = 0;

  while (true) {
    const snapshot = await query.limit(batchSize).get();

    if (snapshot.size === 0) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < batchSize) {
      break;
    }
  }

  return totalDeleted;
}

/**
 * Count documents in a collection matching a query
 */
async function countDocuments(collectionPath, queryFn) {
  const collectionRef = db.collection(collectionPath);
  const query = queryFn ? queryFn(collectionRef) : collectionRef;
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

/**
 * Get couple information
 */
async function getCoupleInfo(coupleId) {
  const coupleDoc = await db.collection('couples').doc(coupleId).get();

  if (!coupleDoc.exists) {
    throw new Error(`Couple with ID "${coupleId}" not found`);
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
 * Display current data counts
 */
async function displayCurrentData(coupleId) {
  console.log('📊 Current Data Summary:');
  console.log('━'.repeat(50));

  const expensesCount = await countDocuments('expenses', (ref) => ref.where('coupleId', '==', coupleId));
  const settlementsCount = await countDocuments('settlements', (ref) => ref.where('coupleId', '==', coupleId));
  const categoriesSnapshot = await db.collection('categories')
    .where('coupleId', '==', coupleId)
    .get();

  let customCategoriesCount = 0;
  let defaultCategoriesCount = 0;

  categoriesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.isDefault) {
      defaultCategoriesCount++;
    } else {
      customCategoriesCount++;
    }
  });

  // Count budgets
  const budgetsSnapshot = await db.collection('budgets')
    .where('coupleId', '==', coupleId)
    .get();
  const budgetsCount = budgetsSnapshot.size;

  console.log(`  Expenses:           ${expensesCount}`);
  console.log(`  Settlements:        ${settlementsCount}`);
  console.log(`  Budgets:            ${budgetsCount}`);
  console.log(`  Custom Categories:  ${customCategoriesCount}`);
  console.log(`  Default Categories: ${defaultCategoriesCount} (will be kept)`);
  console.log('━'.repeat(50));
  console.log('');

  return {
    expensesCount,
    settlementsCount,
    budgetsCount,
    customCategoriesCount,
    defaultCategoriesCount,
  };
}

/**
 * Main cleanup function
 */
async function cleanupData(coupleId) {
  console.log('\n🧹 Starting Data Cleanup...\n');

  const results = {
    expenses: 0,
    settlements: 0,
    budgets: 0,
    customCategories: 0,
  };

  try {
    // 1. Delete all expenses
    console.log('🗑️  Deleting expenses...');
    const deletedExpenses = await deleteCollection('expenses', (ref) => ref.where('coupleId', '==', coupleId));
    console.log(`   ✅ Deleted ${deletedExpenses} expenses\n`);

    // 2. Delete all settlements
    console.log('🗑️  Deleting settlements...');
    const deletedSettlements = await deleteCollection('settlements', (ref) => ref.where('coupleId', '==', coupleId));
    console.log(`   ✅ Deleted ${deletedSettlements} settlements\n`);

    // 3. Delete all budgets
    console.log('🗑️  Deleting budgets...');
    const deletedBudgets = await deleteCollection('budgets', (ref) => ref.where('coupleId', '==', coupleId));
    console.log(`   ✅ Deleted ${deletedBudgets} budgets\n`);

    // 4. Delete custom categories (keep defaults)
    console.log('🗑️  Deleting custom categories...');
    const categoriesSnapshot = await db.collection('categories')
      .where('coupleId', '==', coupleId)
      .where('isDefault', '==', false)
      .get();

    const batch = db.batch();
    categoriesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!categoriesSnapshot.empty) {
      await batch.commit();
      console.log(`   ✅ Deleted ${categoriesSnapshot.size} custom categories\n`);
    } else {
      console.log(`   ℹ️  No custom categories to delete\n`);
    }

    // 5. Reset couple's lastSettlementAt
    console.log('🔄 Resetting couple metadata...');
    await db.collection('couples').doc(coupleId).update({
      lastSettlementAt: null,
    });
    console.log('   ✅ Couple metadata reset\n');

    // Verify final counts
    results.expenses = await countDocuments('expenses', (ref) => ref.where('coupleId', '==', coupleId));
    results.settlements = await countDocuments('settlements', (ref) => ref.where('coupleId', '==', coupleId));
    results.budgets = await countDocuments('budgets', (ref) => ref.where('coupleId', '==', coupleId));
    const customCatSnapshot = await db.collection('categories')
      .where('coupleId', '==', coupleId)
      .where('isDefault', '==', false)
      .get();
    results.customCategories = customCatSnapshot.size;

    return results;

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const coupleId = process.argv[2];
  const confirm = process.argv[3] === '--confirm';

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     DIVIDELA DATA CLEANUP SCRIPT               ║');
  console.log('║     ⚠️  DESTRUCTIVE OPERATION                  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');

  if (!coupleId) {
    console.log('Usage: node cleanup-data-cli.js <coupleId> [--confirm]');
    console.log('');
    console.log('Example:');
    console.log('  node cleanup-data-cli.js abc123 --confirm');
    console.log('');
    console.log('First, find your Couple ID:');
    console.log('  node find-couple-id-cli.js your-email@example.com');
    process.exit(1);
  }

  try {
    console.log('🔍 Fetching couple information...\n');

    // Get and display couple info
    const coupleInfo = await getCoupleInfo(coupleId);

    console.log('👥 Couple Information:');
    console.log('━'.repeat(50));
    console.log(`  Couple ID:    ${coupleInfo.coupleId}`);
    console.log(`  User 1:       ${coupleInfo.user1.name} (${coupleInfo.user1.email})`);
    console.log(`  User 2:       ${coupleInfo.user2.name} (${coupleInfo.user2.email})`);
    console.log('━'.repeat(50));
    console.log('');

    // Display current data
    const currentData = await displayCurrentData(coupleId);

    // Check if confirmation is required
    if (!confirm) {
      console.log('⚠️  DRY RUN MODE - No data will be deleted');
      console.log('');
      console.log('This would delete:');
      console.log(`   • All ${currentData.expensesCount} expenses`);
      console.log(`   • All ${currentData.settlementsCount} settlements`);
      console.log(`   • All ${currentData.budgetsCount} budgets`);
      console.log(`   • All ${currentData.customCategoriesCount} custom categories`);
      console.log('   • Reset couple metadata\n');
      console.log('   Default categories will be preserved.\n');
      console.log('━'.repeat(50));
      console.log('');
      console.log('To actually perform the cleanup, run:');
      console.log(`  node cleanup-data-cli.js ${coupleId} --confirm`);
      console.log('');
      process.exit(0);
    }

    // Confirm deletion
    console.log('⚠️  CONFIRMED DELETION MODE');
    console.log('');
    console.log('This will permanently delete:');
    console.log(`   • All ${currentData.expensesCount} expenses`);
    console.log(`   • All ${currentData.settlementsCount} settlements`);
    console.log(`   • All ${currentData.budgetsCount} budgets`);
    console.log(`   • All ${currentData.customCategoriesCount} custom categories`);
    console.log('   • Reset couple metadata\n');
    console.log('   Default categories will be preserved.\n');

    // Perform cleanup
    const results = await cleanupData(coupleId);

    // Display results
    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║              CLEANUP COMPLETE                  ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('✨ All data has been cleaned successfully!');
    console.log('');
    console.log('📊 Final Verification:');
    console.log('━'.repeat(50));
    console.log(`  Expenses remaining:          ${results.expenses}`);
    console.log(`  Settlements remaining:       ${results.settlements}`);
    console.log(`  Budgets remaining:           ${results.budgets}`);
    console.log(`  Custom categories remaining: ${results.customCategories}`);
    console.log('━'.repeat(50));
    console.log('');
    console.log('Your couple account and default categories have been preserved.');
    console.log('You can now start fresh with your budget tracking!');
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
