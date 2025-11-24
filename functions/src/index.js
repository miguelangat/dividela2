/**
 * Firebase Cloud Functions Entry Point
 *
 * This file exports all cloud functions for the Dividela expense tracking app.
 * Functions will be implemented in separate modules and exported here.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Firestore and Storage instances for use in other modules
const db = admin.firestore();
const storage = admin.storage();

// Import OCR functions
const processReceiptDirect = require('./ocr/processReceiptDirect');

// Export OCR function (callable from client)
exports.processReceiptDirect = functions.https.onCall(processReceiptDirect);

// Placeholder function to verify deployment
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.json({ message: 'Dividela Cloud Functions are running!' });
});

// Export admin instances for use in other modules
module.exports.db = db;
module.exports.storage = storage;
