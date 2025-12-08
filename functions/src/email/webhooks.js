/**
 * Mailersend Webhook Handler
 *
 * Handles webhook events from Mailersend for email tracking:
 * - Bounces: Log and optionally disable notifications
 * - Spam complaints: Log and disable notifications
 * - Delivered: Update delivery status
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Webhook secret for verification (set in Mailersend dashboard)
 * Should match MAILERSEND_WEBHOOK_SECRET env variable
 */
const WEBHOOK_SECRET = process.env.MAILERSEND_WEBHOOK_SECRET;

/**
 * Handle Mailersend webhook events
 *
 * Configure this URL in Mailersend dashboard:
 * https://us-central1-dividela-76aba.cloudfunctions.net/handleMailersendWebhook
 */
exports.handleMailersendWebhook = onRequest(
  {
    cors: false, // Webhooks don't need CORS
  },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = req.headers['mailersend-signature'];
      if (!verifyWebhookSignature(req.body, signature)) {
        console.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;

    if (!event || !event.type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    console.log(`Received Mailersend webhook: ${event.type}`);

    try {
      const db = admin.firestore();

      switch (event.type) {
        case 'activity.bounced':
          await handleBounce(db, event);
          break;

        case 'activity.soft_bounced':
          await handleSoftBounce(db, event);
          break;

        case 'activity.spam_complaint':
          await handleSpamComplaint(db, event);
          break;

        case 'activity.delivered':
          await handleDelivered(db, event);
          break;

        case 'activity.opened':
          await handleOpened(db, event);
          break;

        case 'activity.clicked':
          await handleClicked(db, event);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * Verify Mailersend webhook signature
 * @param {Object} payload - Request body
 * @param {string} signature - Mailersend-Signature header
 * @returns {boolean} Whether signature is valid
 */
function verifyWebhookSignature(payload, signature) {
  if (!signature || !WEBHOOK_SECRET) {
    return false;
  }

  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle hard bounce event
 * Hard bounces indicate permanent delivery failure (invalid email)
 */
async function handleBounce(db, event) {
  const { email, message_id, timestamp, data } = extractEventData(event);

  console.log(`Hard bounce for ${email}: ${data?.reason || 'Unknown reason'}`);

  // Log the bounce
  await db.collection('emailEvents').add({
    type: 'bounce',
    bounceType: 'hard',
    email,
    messageId: message_id,
    reason: data?.reason || 'Unknown',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    rawEvent: event,
  });

  // Find and update any user with this email
  await disableNotificationsForEmail(db, email, 'hard_bounce');
}

/**
 * Handle soft bounce event
 * Soft bounces are temporary failures (mailbox full, server unavailable)
 */
async function handleSoftBounce(db, event) {
  const { email, message_id, timestamp, data } = extractEventData(event);

  console.log(`Soft bounce for ${email}: ${data?.reason || 'Unknown reason'}`);

  // Log the soft bounce (don't disable notifications)
  await db.collection('emailEvents').add({
    type: 'bounce',
    bounceType: 'soft',
    email,
    messageId: message_id,
    reason: data?.reason || 'Unknown',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    rawEvent: event,
  });

  // Track soft bounce count - disable after multiple soft bounces
  await trackSoftBounce(db, email);
}

/**
 * Handle spam complaint event
 * User marked email as spam - disable all notifications
 */
async function handleSpamComplaint(db, event) {
  const { email, message_id, timestamp } = extractEventData(event);

  console.log(`Spam complaint from ${email}`);

  // Log the complaint
  await db.collection('emailEvents').add({
    type: 'spam_complaint',
    email,
    messageId: message_id,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    rawEvent: event,
  });

  // Disable all notifications for this email
  await disableNotificationsForEmail(db, email, 'spam_complaint');
}

/**
 * Handle delivered event
 * Email was successfully delivered to recipient's mailbox
 */
async function handleDelivered(db, event) {
  const { email, message_id, timestamp } = extractEventData(event);

  // Update the email log entry with delivery status
  const logQuery = await db
    .collection('emailLog')
    .where('messageId', '==', message_id)
    .limit(1)
    .get();

  if (!logQuery.empty) {
    await logQuery.docs[0].ref.update({
      delivered: true,
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Handle opened event
 * Recipient opened the email
 */
async function handleOpened(db, event) {
  const { email, message_id, timestamp } = extractEventData(event);

  // Update the email log entry with open status
  const logQuery = await db
    .collection('emailLog')
    .where('messageId', '==', message_id)
    .limit(1)
    .get();

  if (!logQuery.empty) {
    await logQuery.docs[0].ref.update({
      opened: true,
      openedAt: admin.firestore.FieldValue.serverTimestamp(),
      openCount: admin.firestore.FieldValue.increment(1),
    });
  }
}

/**
 * Handle clicked event
 * Recipient clicked a link in the email
 */
async function handleClicked(db, event) {
  const { email, message_id, timestamp, data } = extractEventData(event);

  // Update the email log entry with click status
  const logQuery = await db
    .collection('emailLog')
    .where('messageId', '==', message_id)
    .limit(1)
    .get();

  if (!logQuery.empty) {
    await logQuery.docs[0].ref.update({
      clicked: true,
      clickedAt: admin.firestore.FieldValue.serverTimestamp(),
      clickCount: admin.firestore.FieldValue.increment(1),
      lastClickedUrl: data?.url || null,
    });
  }
}

/**
 * Extract common data from webhook event
 */
function extractEventData(event) {
  return {
    email: event.data?.email?.recipient?.email || event.email,
    message_id: event.data?.email?.message?.id || event.message_id,
    timestamp: event.created_at || event.timestamp,
    data: event.data || {},
  };
}

/**
 * Disable notifications for an email address
 * Finds the user and updates their couple's notification settings
 */
async function disableNotificationsForEmail(db, email, reason) {
  try {
    // Find user by email in Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    // Find couple this user belongs to
    const couplesQuery = await db
      .collection('couples')
      .where('user1Id', '==', userId)
      .limit(1)
      .get();

    let coupleId = null;

    if (!couplesQuery.empty) {
      coupleId = couplesQuery.docs[0].id;
    } else {
      // Check user2Id
      const couplesQuery2 = await db
        .collection('couples')
        .where('user2Id', '==', userId)
        .limit(1)
        .get();

      if (!couplesQuery2.empty) {
        coupleId = couplesQuery2.docs[0].id;
      }
    }

    if (coupleId) {
      // Disable email notifications for this couple
      await db.collection('coupleSettings').doc(coupleId).update({
        'notifications.emailEnabled': false,
        'notifications.disabledReason': reason,
        'notifications.disabledAt': admin.firestore.FieldValue.serverTimestamp(),
        'notifications.disabledEmail': email,
      });

      console.log(`Disabled notifications for couple ${coupleId} due to ${reason}`);
    }
  } catch (error) {
    // User might not exist in our system
    console.error(`Could not disable notifications for ${email}:`, error.message);
  }
}

/**
 * Track soft bounces and disable after threshold
 */
async function trackSoftBounce(db, email) {
  const softBounceRef = db.collection('softBounces').doc(email);
  const doc = await softBounceRef.get();

  const currentCount = doc.exists ? (doc.data().count || 0) : 0;
  const newCount = currentCount + 1;

  await softBounceRef.set({
    email,
    count: newCount,
    lastBounce: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Disable after 5 soft bounces
  if (newCount >= 5) {
    console.log(`Disabling notifications for ${email} after ${newCount} soft bounces`);
    await disableNotificationsForEmail(db, email, 'soft_bounce_threshold');
  }
}
