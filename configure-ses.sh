#!/bin/bash

# Configuration script for AWS SES with Firebase Trigger Email Extension
# This script helps you configure the Firebase Trigger Email extension with AWS SES

echo "🔧 Firebase Trigger Email Extension - AWS SES Configuration"
echo "============================================================"
echo ""

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "📋 Please provide your AWS SES credentials:"
echo ""

# Get region
echo "1. Select your AWS SES region:"
echo "   1) us-east-1 (N. Virginia)"
echo "   2) us-west-2 (Oregon)"
echo "   3) eu-west-1 (Ireland)"
echo "   4) ap-southeast-2 (Sydney)"
read -p "Enter number (1-4): " region_choice

case $region_choice in
    1) REGION="us-east-1" ;;
    2) REGION="us-west-2" ;;
    3) REGION="eu-west-1" ;;
    4) REGION="ap-southeast-2" ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

echo "   Selected: $REGION"
echo ""

# Get SMTP credentials
read -p "2. Enter your SMTP Username (from AWS SES): " SMTP_USER
echo ""

read -sp "3. Enter your SMTP Password (from AWS SES): " SMTP_PASS
echo ""
echo ""

# Get FROM email
read -p "4. Enter FROM email address (e.g., noreply@dividela.co): " FROM_EMAIL
echo ""

# Get FROM name
read -p "5. Enter FROM name (e.g., Dividela): " FROM_NAME
echo ""

# URL encode password
# This is a simple bash solution - for production, use proper URL encoding
ENCODED_PASS=$(node -e "console.log(encodeURIComponent('$SMTP_PASS'))")

# Build SMTP URI
SMTP_ENDPOINT="email-smtp.$REGION.amazonaws.com"
SMTP_URI="smtps://${SMTP_USER}:${ENCODED_PASS}@${SMTP_ENDPOINT}:465"

echo ""
echo "✅ Configuration Summary:"
echo "========================"
echo "SMTP Endpoint: $SMTP_ENDPOINT"
echo "FROM Email: $FROM_EMAIL"
echo "FROM Name: $FROM_NAME"
echo ""
echo "🔐 SMTP URI (save this securely):"
echo "$SMTP_URI"
echo ""
echo "📝 Next Steps:"
echo "=============="
echo "1. Go to Firebase Console: https://console.firebase.google.com/"
echo "2. Select your project"
echo "3. Click Extensions → Trigger Email"
echo "4. Click ⋮ (three dots) → Reconfigure extension"
echo "5. Paste the SMTP URI above into 'SMTP connection URI'"
echo "6. Set 'Default FROM email' to: $FROM_EMAIL"
echo "7. Set 'Default FROM name' to: $FROM_NAME"
echo "8. Click Save"
echo ""
echo "🎉 Configuration complete!"
