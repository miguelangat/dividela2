/**
 * Test Email Endpoint
 * 
 * Callable HTTP function to test AWS SES email sending
 * 
 * Usage:
 *   POST https://us-central1-PROJECT_ID.cloudfunctions.net/testSendEmail
 *   Body: { "email": "test@example.com" }
 * 
 * Or via curl:
 *   curl -X POST https://us-central1-PROJECT_ID.cloudfunctions.net/testSendEmail \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"test@example.com"}'
 */

const { onRequest } = require('firebase-functions/v2/https');
const { sendTestEmail, getTransporter } = require('./sesEmailService');

/**
 * Test basic email sending
 */
exports.testSendEmail = onRequest(async (req, res) => {
    // Enable CORS for testing
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET, POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }

    try {
        // Get email from query param or request body
        const testEmail = req.query.email || req.body?.email || 'test@example.com';

        console.log(`📧 Testing email send to: ${testEmail}`);

        // Verify transporter connection
        const transporter = getTransporter();
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        // Send test email
        const result = await sendTestEmail(testEmail);

        console.log(`✅ Test email sent successfully`);
        console.log(`   Message ID: ${result.messageId}`);

        res.status(200).json({
            success: true,
            messageId: result.messageId,
            message: `Test email sent to ${testEmail}`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('❌ Test email failed:', error);

        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.command || error.response,
        });
    }
});

/**
 * Test all email templates
 */
exports.testEmailTemplates = onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET, POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }

    try {
        const { sendEmail } = require('./sesEmailService');
        const templates = require('./templates');

        const templateName = req.query.template || req.body?.template;
        const email = req.query.email || req.body?.email;

        if (!templateName || !email) {
            res.status(400).json({
                success: false,
                error: 'Missing required parameters: template and email',
                availableTemplates: [
                    'monthlyBudgetAlert',
                    'savingsGoalMilestone',
                    'partnerInvitation',
                    'expenseAdded',
                    'fiscalYearEndReminder',
                ],
            });
            return;
        }

        // Test data for each template
        const testData = {
            monthlyBudgetAlert: {
                template: templates.monthlyBudgetAlertTemplate,
                data: {
                    coupleId: 'test-couple-id',
                    userName: 'Test User',
                    month: 'December',
                    year: 2024,
                    budgetAmount: 2000,
                    spentAmount: 1800,
                    percentageUsed: 90,
                    remainingAmount: 200,
                    currency: 'USD',
                    locale: 'en-US',
                },
                subject: '📊 Budget Alert (90%) - December 2024',
            },
            savingsGoalMilestone: {
                template: templates.savingsGoalMilestoneTemplate,
                data: {
                    coupleId: 'test-couple-id',
                    userName: 'Test User',
                    goalName: 'Vacation Fund',
                    targetAmount: 5000,
                    currentAmount: 2500,
                    percentageReached: 50,
                    currency: 'USD',
                    locale: 'en-US',
                },
                subject: '💰 Savings Milestone (50%): Vacation Fund',
            },
            partnerInvitation: {
                template: templates.partnerInvitationTemplate,
                data: {
                    coupleId: 'test-couple-id',
                    senderName: 'Test Sender',
                    invitationCode: 'ABC123',
                },
                subject: '💑 Test Sender invited you to Dividela',
            },
            expenseAdded: {
                template: templates.expenseAddedTemplate,
                data: {
                    coupleId: 'test-couple-id',
                    userName: 'Test User',
                    partnerName: 'Test Partner',
                    amount: 150.50,
                    description: 'Grocery shopping',
                    category: 'Food',
                    date: new Date().toLocaleDateString('en-US'),
                    currency: 'USD',
                    locale: 'en-US',
                },
                subject: '💳 Test Partner added an expense',
            },
            fiscalYearEndReminder: {
                template: templates.fiscalYearEndReminderTemplate,
                data: {
                    coupleId: 'test-couple-id',
                    userName: 'Test User',
                    daysRemaining: 30,
                    fiscalYearLabel: '2024',
                    totalBudget: 50000,
                    totalSpent: 42000,
                    currency: 'USD',
                    locale: 'en-US',
                },
                subject: '📅 Fiscal Year Ending Soon',
            },
        };

        const config = testData[templateName];
        if (!config) {
            res.status(400).json({
                success: false,
                error: `Unknown template: ${templateName}`,
                availableTemplates: Object.keys(testData),
            });
            return;
        }

        // Generate HTML from template
        const html = config.template(config.data);

        // Send email
        const result = await sendEmail({
            to: email,
            subject: config.subject,
            html,
        });

        console.log(`✅ Template email sent: ${templateName} to ${email}`);

        res.status(200).json({
            success: true,
            template: templateName,
            messageId: result.messageId,
            message: `${templateName} template sent to ${email}`,
        });
    } catch (error) {
        console.error('❌ Template test failed:', error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
