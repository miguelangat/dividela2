#!/bin/bash

# Dividela Android Build Script
# This script helps you build the Android version of Dividela

set -e  # Exit on error

echo "🚀 Dividela Android Build Helper"
echo "================================"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "⚠️  EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Main menu
echo "Choose build type:"
echo "1) Preview APK (for testing on devices)"
echo "2) Production APK (for release)"
echo "3) Development build (with dev tools)"
echo "4) Check build status"
echo "5) Install dependencies only"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo "📦 Building Preview APK..."
        echo "This will take about 15-20 minutes."
        echo ""
        eas build --platform android --profile preview
        echo ""
        echo "✅ Build complete! Download link above."
        echo "📱 Install the APK on your Android device to test."
        ;;
    2)
        echo ""
        echo "📦 Building Production APK..."
        echo "This will take about 15-20 minutes."
        echo ""
        eas build --platform android --profile production
        echo ""
        echo "✅ Production build complete!"
        ;;
    3)
        echo ""
        echo "📦 Building Development version..."
        eas build --platform android --profile development
        ;;
    4)
        echo ""
        echo "📊 Recent builds:"
        eas build:list --platform android --limit 5
        ;;
    5)
        echo ""
        echo "📥 Installing dependencies..."
        npm install
        echo ""
        echo "✅ Dependencies installed!"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Done! 🎉"
