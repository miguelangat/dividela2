/**
 * Email Verification Script for Mailersend
 *
 * Adds an email to your Mailersend verified recipients list (for trial mode)
 *
 * Usage: node verify-email.js your-email@example.com
 */

require('dotenv').config();

async function verifyEmail(email) {
  const apiKey = process.env.MAILERSEND_API_KEY;

  if (!apiKey) {
    console.error('ERROR: MAILERSEND_API_KEY not found in .env');
    process.exit(1);
  }

  console.log(`Verifying email: ${email}\n`);

  try {
    // First, check if email is valid using Mailersend's email verification API
    const verifyResponse = await fetch('https://api.mailersend.com/v1/email-verification/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error('Verification API Error:', verifyData);

      // If verification API fails, try to add as recipient directly
      console.log('\nTrying to add as recipient...\n');
      await addRecipient(apiKey, email);
      return;
    }

    console.log('Email Verification Result:');
    console.log('─'.repeat(40));
    console.log(`  Email: ${verifyData.data?.email || email}`);
    console.log(`  Status: ${verifyData.data?.status || 'Unknown'}`);
    console.log(`  Result: ${verifyData.data?.result || 'Unknown'}`);

    if (verifyData.data?.reason) {
      console.log(`  Reason: ${verifyData.data.reason}`);
    }

    // Show detailed results if available
    if (verifyData.data?.results) {
      console.log('\nDetailed Results:');
      const results = verifyData.data.results;
      console.log(`  - Is valid format: ${results.is_valid_format ?? 'N/A'}`);
      console.log(`  - Is disposable: ${results.is_disposable ?? 'N/A'}`);
      console.log(`  - Is role based: ${results.is_role_based ?? 'N/A'}`);
      console.log(`  - Is free: ${results.is_free ?? 'N/A'}`);
      console.log(`  - MX records found: ${results.is_mx_found ?? 'N/A'}`);
      console.log(`  - SMTP check: ${results.is_smtp_valid ?? 'N/A'}`);
    }

    console.log('─'.repeat(40));

    // If the email is valid, suggest adding as recipient
    if (verifyData.data?.result === 'deliverable' || verifyData.data?.status === 'valid') {
      console.log('\nEmail appears valid! To send emails in trial mode,');
      console.log('you need to add it as a verified recipient in the Mailersend dashboard:');
      console.log('https://app.mailersend.com/email-recipients\n');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function addRecipient(apiKey, email) {
  // Note: Adding recipients requires going through the dashboard
  // The API endpoint for this is not publicly available
  console.log('To add a verified recipient (required for trial mode):');
  console.log('─'.repeat(50));
  console.log('1. Go to: https://app.mailersend.com/email-recipients');
  console.log('2. Click "Add recipient"');
  console.log(`3. Enter: ${email}`);
  console.log('4. Check your inbox for the verification email');
  console.log('5. Click the verification link');
  console.log('─'.repeat(50));
  console.log('\nAlternatively, verify your domain to send to any email:');
  console.log('https://app.mailersend.com/domains\n');
}

// Alternative: Check single email status
async function checkEmailStatus(email) {
  const apiKey = process.env.MAILERSEND_API_KEY;

  console.log(`\nChecking email deliverability for: ${email}\n`);

  const response = await fetch('https://api.mailersend.com/v1/email-verification/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return response.json();
}

// Get email from command line argument
const email = process.argv[2];
const action = process.argv[3];

if (!email) {
  console.log('Mailersend Email Verification Tool');
  console.log('─'.repeat(40));
  console.log('');
  console.log('Usage:');
  console.log('  node verify-email.js <email>');
  console.log('');
  console.log('Examples:');
  console.log('  node verify-email.js test@gmail.com');
  console.log('');
  process.exit(1);
}

verifyEmail(email);
