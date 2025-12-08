/**
 * Scheduled Email Checks
 *
 * Cloud Functions that run on a schedule to check for notification triggers.
 * These run daily to check for fiscal year end reminders and other time-based alerts.
 *
 * Updated for Firebase Functions v2 (7.0.0+)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {
  sendEmail,
  getUserEmail,
  getUserDisplayName,
  isNotificationEnabled,
  logEmailSent,
  generateUnsubscribeUrl,
  formatCurrency,
  TEMPLATE_IDS,
} = require('./mailersendService');

/**
 * Check for fiscal year end reminders
 * Runs daily at 9 AM Eastern Time
 */
exports.checkFiscalYearEndReminders = onSchedule(
  {
    schedule: '0 9 * * *', // Every day at 9 AM
    timeZone: 'America/New_York',
  },
  async (event) => {
    console.log('Running fiscal year end reminder check...');

    const db = admin.firestore();
    const today = new Date();

    try {
      // Get all couple settings
      const settingsSnapshot = await db.collection('coupleSettings').get();

      for (const settingsDoc of settingsSnapshot.docs) {
        const coupleId = settingsDoc.id;
        const settings = settingsDoc.data();

        try {
          // Check if reminders are enabled
          const remindersEnabled = await isNotificationEnabled(coupleId, 'fiscalYearEndReminder');
          if (!remindersEnabled) {
            console.log(`Fiscal year reminders disabled for couple: ${coupleId}`);
            continue;
          }

          const fiscalYear = settings.fiscalYear || {};
          const notifications = settings.notifications || {};
          const daysBeforeEnd = notifications.daysBeforeFiscalYearEnd || 30;

          // Calculate fiscal year end date
          const fiscalYearEnd = calculateFiscalYearEnd(fiscalYear, today);

          if (!fiscalYearEnd) {
            console.log(`Could not calculate fiscal year end for couple: ${coupleId}`);
            continue;
          }

          // Calculate days until fiscal year end
          const daysUntilEnd = Math.ceil((fiscalYearEnd - today) / (1000 * 60 * 60 * 24));

          // Send reminder if within the threshold (e.g., 30 days)
          if (daysUntilEnd === daysBeforeEnd) {
            console.log(`Fiscal year ends in ${daysUntilEnd} days for couple: ${coupleId}`);

            // Get couple info
            const coupleDoc = await db.collection('couples').doc(coupleId).get();
            const couple = coupleDoc.data();

            if (!couple) {
              console.log(`Couple not found: ${coupleId}`);
              continue;
            }

            const partners = [couple.user1Id, couple.user2Id].filter(Boolean);

            // Get currency settings
            const currency = settings.budgetPreferences?.budgetCurrency || 'USD';
            const locale = settings.budgetPreferences?.currencyLocale || 'en-US';

            // Calculate fiscal year label
            const fiscalYearLabel = calculateFiscalYearLabel(fiscalYear, today);

            // Get annual budget and spending (if available)
            const { totalBudget, totalSpent } = await getAnnualBudgetSummary(
              db,
              coupleId,
              fiscalYear,
              today
            );

            // Send email to both partners
            for (const userId of partners) {
              try {
                const userEmail = await getUserEmail(userId);
                if (!userEmail) {
                  console.log(`No email found for user ${userId}`);
                  continue;
                }

                const userName = await getUserDisplayName(userId);

                const result = await sendEmail({
                  to: userEmail,
                  toName: userName,
                  subject: `Fiscal Year ${fiscalYearLabel} Ending in ${daysUntilEnd} Days`,
                  templateId: TEMPLATE_IDS.fiscalYearReminder,
                  variables: {
                    userName,
                    daysRemaining: daysUntilEnd.toString(),
                    fiscalYearLabel,
                    totalBudget: formatCurrency(totalBudget, currency, locale),
                    totalSpent: formatCurrency(totalSpent, currency, locale),
                    unsubscribeUrl: generateUnsubscribeUrl(coupleId, 'fiscalYearEndReminder'),
                  },
                });

                await logEmailSent({
                  coupleId,
                  userId,
                  type: 'fiscalYearEndReminder',
                  messageId: result.messageId,
                  success: true,
                });

                console.log(`Fiscal year reminder sent to ${userEmail}`);
              } catch (error) {
                console.error(`Error sending reminder to user ${userId}:`, error);
                await logEmailSent({
                  coupleId,
                  userId,
                  type: 'fiscalYearEndReminder',
                  messageId: null,
                  success: false,
                  error: error.message,
                });
              }
            }
          } else if (daysUntilEnd < 0) {
            console.log(`Fiscal year has ended for couple: ${coupleId}`);
          } else {
            console.log(`${daysUntilEnd} days until fiscal year end (threshold: ${daysBeforeEnd})`);
          }
        } catch (error) {
          console.error(`Error processing couple ${coupleId}:`, error);
        }
      }

      console.log('Fiscal year end reminder check completed');
      return null;
    } catch (error) {
      console.error('Error in fiscal year reminder check:', error);
      return null;
    }
  }
);

/**
 * Calculate fiscal year end date
 *
 * @param {Object} fiscalYear - Fiscal year settings
 * @param {Date} referenceDate - Reference date (usually today)
 * @returns {Date|null} Fiscal year end date
 */
function calculateFiscalYearEnd(fiscalYear, referenceDate) {
  const { type, startMonth, startDay } = fiscalYear;

  if (type === 'calendar') {
    // Calendar year: Jan 1 - Dec 31
    return new Date(referenceDate.getFullYear(), 11, 31); // December 31
  }

  if (type === 'custom' && startMonth && startDay) {
    // Custom fiscal year
    const currentYear = referenceDate.getFullYear();
    const fiscalYearStart = new Date(currentYear, startMonth - 1, startDay);

    let fiscalYearEnd;

    if (referenceDate >= fiscalYearStart) {
      // We're in the current fiscal year
      // End is one day before next year's start
      fiscalYearEnd = new Date(currentYear + 1, startMonth - 1, startDay - 1);
    } else {
      // We're before the fiscal year start
      // End is one day before this year's start
      fiscalYearEnd = new Date(currentYear, startMonth - 1, startDay - 1);
    }

    return fiscalYearEnd;
  }

  return null;
}

/**
 * Calculate fiscal year label for display
 *
 * @param {Object} fiscalYear - Fiscal year settings
 * @param {Date} referenceDate - Reference date
 * @returns {string} Fiscal year label (e.g., "FY 2024" or "2024")
 */
function calculateFiscalYearLabel(fiscalYear, referenceDate) {
  const { type, startMonth } = fiscalYear;

  if (type === 'calendar') {
    return referenceDate.getFullYear().toString();
  }

  if (type === 'custom' && startMonth) {
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth() + 1;

    if (currentMonth >= startMonth) {
      return `FY ${currentYear}-${currentYear + 1}`;
    } else {
      return `FY ${currentYear - 1}-${currentYear}`;
    }
  }

  return referenceDate.getFullYear().toString();
}

/**
 * Get annual budget summary (total budget and spent)
 *
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {string} coupleId - Couple ID
 * @param {Object} fiscalYear - Fiscal year settings
 * @param {Date} referenceDate - Reference date
 * @returns {Promise<{totalBudget: number, totalSpent: number}>}
 */
async function getAnnualBudgetSummary(db, coupleId, fiscalYear, referenceDate) {
  try {
    // Calculate fiscal year start and end
    const { type, startMonth, startDay } = fiscalYear;

    let fiscalYearStart, fiscalYearEnd;

    if (type === 'calendar') {
      fiscalYearStart = new Date(referenceDate.getFullYear(), 0, 1); // Jan 1
      fiscalYearEnd = new Date(referenceDate.getFullYear(), 11, 31); // Dec 31
    } else if (type === 'custom' && startMonth && startDay) {
      const currentYear = referenceDate.getFullYear();
      fiscalYearStart = new Date(currentYear, startMonth - 1, startDay);

      if (referenceDate < fiscalYearStart) {
        // We're before the fiscal year start, use previous year
        fiscalYearStart = new Date(currentYear - 1, startMonth - 1, startDay);
      }

      fiscalYearEnd = new Date(fiscalYearStart);
      fiscalYearEnd.setFullYear(fiscalYearEnd.getFullYear() + 1);
      fiscalYearEnd.setDate(fiscalYearEnd.getDate() - 1);
    } else {
      // Default to calendar year
      fiscalYearStart = new Date(referenceDate.getFullYear(), 0, 1);
      fiscalYearEnd = new Date(referenceDate.getFullYear(), 11, 31);
    }

    // Get all budgets in fiscal year
    const budgetsSnapshot = await db
      .collection('budgets')
      .where('coupleId', '==', coupleId)
      .get();

    let totalBudget = 0;

    budgetsSnapshot.forEach(doc => {
      const budget = doc.data();
      // Simple sum - you might want more sophisticated logic based on your budget structure
      totalBudget += budget.totalBudget || 0;
    });

    // Get all expenses in fiscal year
    const expensesSnapshot = await db
      .collection('expenses')
      .where('coupleId', '==', coupleId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(fiscalYearStart))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(fiscalYearEnd))
      .get();

    let totalSpent = 0;

    expensesSnapshot.forEach(doc => {
      const expense = doc.data();
      totalSpent += expense.amount || 0;
    });

    return { totalBudget, totalSpent };
  } catch (error) {
    console.error('Error getting annual budget summary:', error);
    return { totalBudget: 0, totalSpent: 0 };
  }
}
