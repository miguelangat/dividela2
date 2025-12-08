const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SES_SMTP_USER,
        pass: process.env.SES_SMTP_PASS,
    },
});

async function testConnection() {
    try {
        console.log('🔍 Testing SMTP connection...');
        console.log('Host:', process.env.SES_SMTP_HOST);
        console.log('User:', process.env.SES_SMTP_USER?.substring(0, 10) + '...');

        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');

        // Send test email
        console.log('📧 Sending test email...');
        const info = await transporter.sendMail({
            from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
            to: process.argv[2] || 'noreply@dividela.co', // Use command line arg or default
            subject: 'Test Email from Dividela',
            text: 'If you receive this, AWS SES is working correctly!',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">✅ Success!</h1>
          <p>AWS SES is configured correctly for Dividela.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is a test email from your AWS SES configuration.
          </p>
        </div>
      `,
        });

        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('\n📬 Check your inbox!');
    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.code === 'EAUTH') {
            console.error('\n❌ Authentication failed. Check your SMTP username and password.');
        } else if (error.code === 'ECONNECTION') {
            console.error('\n❌ Connection failed. Check your SMTP host and port.');
        } else if (error.responseCode === 554) {
            console.error('\n❌ Email not verified. Verify sender email in AWS SES Console.');
        }

        console.error('\n📋 Configuration:');
        console.error('   Host:', process.env.SES_SMTP_HOST);
        console.error('   From:', process.env.FROM_EMAIL);
        console.error('   User:', process.env.SES_SMTP_USER?.substring(0, 10) + '...');
    }
}

console.log('='.repeat(60));
console.log('AWS SES SMTP Connection Test');
console.log('='.repeat(60) + '\n');

if (!process.env.SES_SMTP_USER || !process.env.SES_SMTP_PASS) {
    console.error('❌ Missing environment variables!');
    console.error('   Make sure you have a .env file with:');
    console.error('   - SES_SMTP_USER');
    console.error('   - SES_SMTP_PASS');
    console.error('   - SES_SMTP_HOST');
    console.error('   - FROM_EMAIL');
    console.error('   - FROM_NAME\n');
    process.exit(1);
}

// Get email from command line or use default
const testEmail = process.argv[2];
if (!testEmail) {
    console.warn('⚠️  No test email provided.');
    console.warn('   Usage: node test-smtp.js your-email@example.com\n');
}

testConnection();
