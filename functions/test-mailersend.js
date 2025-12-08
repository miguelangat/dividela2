/**
 * Local test script for Mailersend integration
 * Run with: node test-mailersend.js your-email@example.com
 */

require('dotenv').config();

const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');

async function testMailersend(toEmail) {
  console.log('Testing Mailersend configuration...\n');

  // Check environment variables
  const apiKey = process.env.MAILERSEND_API_KEY;
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL || 'noreply@dividela.co';
  const fromName = process.env.MAILERSEND_FROM_NAME || 'Dividela';

  if (!apiKey) {
    console.error('ERROR: MAILERSEND_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
  console.log(`  From: ${fromName} <${fromEmail}>`);
  console.log(`  To: ${toEmail}\n`);

  const mailerSend = new MailerSend({ apiKey });

  const sender = new Sender(fromEmail, fromName);
  const recipients = [new Recipient(toEmail, 'Test User')];

  const emailParams = new EmailParams()
    .setFrom(sender)
    .setTo(recipients)
    .setSubject('Dividela Test Email - Mailersend')
    .setHtml(`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; text-align: center;">Mailersend Test</h1>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #eee; border-radius: 0 0 10px 10px;">
          <p style="color: #333; font-size: 16px;">
            If you're reading this, your Mailersend integration is working correctly!
          </p>
          <p style="color: #666; font-size: 14px;">
            <strong>Timestamp:</strong> ${new Date().toISOString()}
          </p>
          <p style="color: #666; font-size: 14px;">
            <strong>From:</strong> ${fromEmail}
          </p>
        </div>
      </div>
    `)
    .setText('Mailersend Test - If you\'re reading this, your Mailersend integration is working correctly!');

  try {
    console.log('Sending test email...');
    const response = await mailerSend.email.send(emailParams);

    console.log('\nSUCCESS! Email sent.');
    console.log('Response:', JSON.stringify(response, null, 2));

    // Check for message ID
    const messageId = response.headers?.['x-message-id'] || 'Not available';
    console.log(`\nMessage ID: ${messageId}`);

  } catch (error) {
    console.error('\nERROR sending email:');
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);

    if (error.body) {
      console.error('Body:', JSON.stringify(error.body, null, 2));
    }

    // Common error explanations
    if (error.statusCode === 401) {
      console.error('\nHint: Invalid API key. Check your MAILERSEND_API_KEY in .env');
    } else if (error.statusCode === 422) {
      console.error('\nHint: The sender domain may not be verified in Mailersend');
    }

    process.exit(1);
  }
}

// Get email from command line argument
const toEmail = process.argv[2];

if (!toEmail) {
  console.log('Usage: node test-mailersend.js your-email@example.com');
  process.exit(1);
}

testMailersend(toEmail);
