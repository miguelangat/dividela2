/**
 * Notification Triggers
 *
 * Cloud Functions that send email notifications based on app events.
 *
 * Updated for Firebase Functions v2 (7.0.0+)
 */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {
  sendEmail,
  getUserEmail,
  isNotificationEnabled,
  logEmailSent,
} = require('./sesEmailService');
const {
  monthlyBudgetAlertTemplate,
  savingsGoalMilestoneTemplate,
  expenseAddedTemplate,
  partnerInvitationTemplate,
} = require('./templates');

/**
 * Send budget alert when expense is added and threshold is crossed
 */
exports.checkBudgetOnExpenseAdded = onDocumentCreated('expenses/{expenseId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const expense = snapshot.data();
  const { coupleId, amount, paidBy } = expense;

  if (!coupleId) {
    console.log('❌ Expense has no coupleId, skipping budget check');
    return;
  }

  try {
    // Check if budget alerts are enabled
    const alertsEnabled = await isNotificationEnabled(coupleId, 'monthlyBudgetAlert');
    if (!alertsEnabled) {
      console.log('📧 Budget alerts disabled for couple:', coupleId);
      return;
    }

    // Get current month's budget and expenses
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const db = admin.firestore();

    // Get budget for current month
    const budgetSnapshot = await db
      .collection('budgets')
      .where('coupleId', '==', coupleId)
      .where('month', '==', month)
      .where('year', '==', year)
      .limit(1)
      .get();

    if (budgetSnapshot.empty) {
      console.log('📊 No budget found for current month');
      return;
    }

    const budget = budgetSnapshot.docs[0].data();
    const budgetAmount = budget.totalBudget || 0;

    // Get all expenses for current month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const expensesSnapshot = await db
      .collection('expenses')
      .where('coupleId', '==', coupleId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .get();

    const totalSpent = expensesSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    const percentageUsed = Math.round((totalSpent / budgetAmount) * 100);

    // Only send alert at specific thresholds: 80%, 90%, 100%
    const thresholds = [80, 90, 100];
    const shouldAlert = thresholds.some(threshold => {
      const previousPercentage = Math.round(((totalSpent - amount) / budgetAmount) * 100);
      return previousPercentage < threshold && percentageUsed >= threshold;
    });

    if (!shouldAlert) {
      console.log(`📊 Budget at ${percentageUsed}%, no threshold crossed`);
      return;
    }

    // Get couple settings for currency
    const settingsDoc = await db.collection('coupleSettings').doc(coupleId).get();
    const settings = settingsDoc.data() || {};
    const currency = settings.budgetPreferences?.budgetCurrency || 'USD';
    const locale = settings.budgetPreferences?.currencyLocale || 'en-US';

    // Get both partners' emails
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    const couple = coupleDoc.data();

    if (!couple) {
      console.log('❌ Couple not found');
      return;
    }

    const partners = [couple.user1Id, couple.user2Id].filter(Boolean);

    // Send email to both partners
    for (const userId of partners) {
      try {
        const userEmail = await getUserEmail(userId);
        const userDoc = await db.collection('users').doc(userId).get();
        const userName = userDoc.data()?.displayName || 'there';

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

        const html = monthlyBudgetAlertTemplate({
          coupleId,
          userName,
          month: monthNames[month - 1],
          year,
          budgetAmount,
          spentAmount: totalSpent,
          percentageUsed,
          remainingAmount: budgetAmount - totalSpent,
          currency,
          locale,
        });

        const subject = percentageUsed >= 100
          ? `⚠️ Budget Exceeded - ${monthNames[month - 1]} ${year}`
          : `📊 Budget Alert (${percentageUsed}%) - ${monthNames[month - 1]} ${year}`;

        const result = await sendEmail({
          to: userEmail,
          subject,
          html,
        });

        await logEmailSent({
          coupleId,
          userId,
          type: 'monthlyBudgetAlert',
          messageId: result.messageId,
          success: true,
        });

        console.log(`✅ Budget alert sent to ${userEmail}`);
      } catch (error) {
        console.error(`❌ Error sending budget alert to user ${userId}:`, error);
        await logEmailSent({
          coupleId,
          userId,
          type: 'monthlyBudgetAlert',
          messageId: null,
          success: false,
          error: error.message,
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in budget check trigger:', error);
  }
});

/**
 * Send notification when partner adds expense (optional feature)
 */
exports.notifyPartnerOnExpenseAdded = onDocumentCreated('expenses/{expenseId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const expense = snapshot.data();
  const { coupleId, paidBy, amount, description, category, date } = expense;

  if (!coupleId || !paidBy) {
    return;
  }

  try {
    // Check if expense notifications are enabled
    const notificationsEnabled = await isNotificationEnabled(coupleId, 'partnerActivity');
    if (!notificationsEnabled) {
      console.log('📧 Partner activity notifications disabled');
      return;
    }

    const db = admin.firestore();

    // Get couple info
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    const couple = coupleDoc.data();

    if (!couple) {
      return;
    }

    // Get partner's ID (the one who didn't add the expense)
    const partnerId = couple.user1Id === paidBy ? couple.user2Id : couple.user1Id;

    if (!partnerId) {
      return;
    }

    // Get both users' info
    const paidByDoc = await db.collection('users').doc(paidBy).get();
    const partnerDoc = await db.collection('users').doc(partnerId).get();

    const paidByName = paidByDoc.data()?.displayName || 'Your partner';
    const partnerName = partnerDoc.data()?.displayName || 'there';
    const partnerEmail = await getUserEmail(partnerId);

    // Get currency settings
    const settingsDoc = await db.collection('coupleSettings').doc(coupleId).get();
    const settings = settingsDoc.data() || {};
    const currency = settings.budgetPreferences?.budgetCurrency || 'USD';
    const locale = settings.budgetPreferences?.currencyLocale || 'en-US';

    const formattedDate = date.toDate
      ? date.toDate().toLocaleDateString(locale)
      : new Date().toLocaleDateString(locale);

    const html = expenseAddedTemplate({
      coupleId,
      userName: partnerName,
      partnerName: paidByName,
      amount,
      description: description || 'No description',
      category: category || 'Uncategorized',
      date: formattedDate,
      currency,
      locale,
    });

    const result = await sendEmail({
      to: partnerEmail,
      subject: `💳 ${paidByName} added an expense`,
      html,
    });

    await logEmailSent({
      coupleId,
      userId: partnerId,
      type: 'expenseAdded',
      messageId: result.messageId,
      success: true,
    });

    console.log(`✅ Expense notification sent to ${partnerEmail}`);
  } catch (error) {
    console.error('❌ Error in expense notification trigger:', error);
  }
});

/**
 * Send invitation email when couple code is created
 */
exports.sendPartnerInvitation = onDocumentCreated('coupleCodes/{codeId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data associated with the event');
    return;
  }

  const inviteData = snapshot.data();
  const { code, createdBy, inviteeEmail } = inviteData;

  if (!code || !createdBy || !inviteeEmail) {
    console.log('❌ Missing invitation data');
    return;
  }

  try {
    const db = admin.firestore();

    // Get sender's info
    const senderDoc = await db.collection('users').doc(createdBy).get();
    const senderName = senderDoc.data()?.displayName || 'Someone';

    // We don't have a coupleId yet, so use a temporary ID
    const tempCoupleId = code;

    const html = partnerInvitationTemplate({
      coupleId: tempCoupleId,
      senderName,
      invitationCode: code,
    });

    const result = await sendEmail({
      to: inviteeEmail,
      subject: `💑 ${senderName} invited you to Dividela`,
      html,
    });

    console.log(`✅ Invitation sent to ${inviteeEmail}`);

    // Update the invitation document with email status
    await snapshot.ref.update({
      emailSent: true,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('❌ Error sending invitation email:', error);

    // Update invitation with error
    await snapshot.ref.update({
      emailSent: false,
      emailError: error.message,
    });
  }
});

/**
 * Send savings goal milestone notification
 */
exports.checkSavingsGoalMilestone = onDocumentUpdated('savingsGoals/{goalId}', async (event) => {
  const beforeSnap = event.data.before;
  const afterSnap = event.data.after;

  if (!beforeSnap || !afterSnap) {
    console.log('No data associated with the event');
    return;
  }

  const before = beforeSnap.data();
  const after = afterSnap.data();

  const { coupleId, name, targetAmount, currentAmount } = after;

  if (!coupleId) {
    return;
  }

  try {
    // Check if notifications are enabled
    const notificationsEnabled = await isNotificationEnabled(coupleId, 'savingsGoalMilestone');
    if (!notificationsEnabled) {
      console.log('📧 Savings goal notifications disabled');
      return;
    }

    // Calculate percentages
    const percentageBefore = Math.round((before.currentAmount / before.targetAmount) * 100);
    const percentageAfter = Math.round((currentAmount / targetAmount) * 100);

    // Only notify at milestones: 25%, 50%, 75%, 100%
    const milestones = [25, 50, 75, 100];
    const milestoneCrossed = milestones.find(milestone => {
      return percentageBefore < milestone && percentageAfter >= milestone;
    });

    if (!milestoneCrossed) {
      console.log(`📊 No milestone crossed (${percentageAfter}%)`);
      return;
    }

    const db = admin.firestore();

    // Get couple settings for currency
    const settingsDoc = await db.collection('coupleSettings').doc(coupleId).get();
    const settings = settingsDoc.data() || {};
    const currency = settings.budgetPreferences?.budgetCurrency || 'USD';
    const locale = settings.budgetPreferences?.currencyLocale || 'en-US';

    // Get couple info
    const coupleDoc = await db.collection('couples').doc(coupleId).get();
    const couple = coupleDoc.data();

    if (!couple) {
      return;
    }

    const partners = [couple.user1Id, couple.user2Id].filter(Boolean);

    // Send email to both partners
    for (const userId of partners) {
      try {
        const userEmail = await getUserEmail(userId);
        const userDoc = await db.collection('users').doc(userId).get();
        const userName = userDoc.data()?.displayName || 'there';

        const html = savingsGoalMilestoneTemplate({
          coupleId,
          userName,
          goalName: name,
          targetAmount,
          currentAmount,
          percentageReached: percentageAfter,
          currency,
          locale,
        });

        const subject = percentageAfter >= 100
          ? `🎉 Savings Goal Reached: ${name}`
          : `💰 Savings Milestone (${percentageAfter}%): ${name}`;

        const result = await sendEmail({
          to: userEmail,
          subject,
          html,
        });

        await logEmailSent({
          coupleId,
          userId,
          type: 'savingsGoalMilestone',
          messageId: result.messageId,
          success: true,
        });

        console.log(`✅ Savings goal notification sent to ${userEmail}`);
      } catch (error) {
        console.error(`❌ Error sending savings notification to user ${userId}:`, error);
        await logEmailSent({
          coupleId,
          userId,
          type: 'savingsGoalMilestone',
          messageId: null,
          success: false,
          error: error.message,
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in savings goal milestone trigger:', error);
  }
});
