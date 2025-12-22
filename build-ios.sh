#!/bin/bash

# Dividela iOS Build & Test Script
# This script helps you test and build the iOS version of Dividela

set -e  # Exit on error

echo "🍎 Dividela iOS Build Helper"
echo "============================"
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: iOS development requires macOS"
    echo "   You can only build iOS apps on a Mac."
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "⚠️  Xcode not found."
    echo "   Install Xcode from the Mac App Store or run:"
    echo "   xcode-select --install"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
fi

# Main menu
echo "Choose an option:"
echo "1) Test in iOS Simulator (fastest) ⭐"
echo "2) List available simulators"
echo "3) Run on specific simulator"
echo "4) Build for simulator (EAS)"
echo "5) Build for TestFlight/Device (EAS)"
echo "6) Check EAS build status"
echo "7) Install dependencies only"
echo "8) Clear cache and restart"
echo ""
read -p "Enter choice [1-8]: " choice

case $choice in
    1)
        echo ""
        echo "📱 Starting iOS Simulator..."
        echo "This will:"
        echo "  - Open iOS Simulator"
        echo "  - Build your app"
        echo "  - Install and launch it"
        echo ""
        echo "⏱️  First time may take 2-5 minutes"
        echo ""
        npx expo start --ios
        ;;
    2)
        echo ""
        echo "📱 Available iOS Simulators:"
        echo ""
        xcrun simctl list devices available | grep -i iphone || xcrun simctl list devices available
        echo ""
        ;;
    3)
        echo ""
        echo "📱 Available devices:"
        xcrun simctl list devices available | grep -i iphone | head -5
        echo ""
        read -p "Enter device name (e.g., 'iPhone 15 Pro'): " device_name
        echo ""
        echo "🚀 Launching on: $device_name"
        npx expo run:ios --device "$device_name"
        ;;
    4)
        echo ""
        echo "📦 Building for iOS Simulator (EAS)..."
        echo "This will take about 10-15 minutes."
        echo ""
        
        # Check if EAS CLI is installed
        if ! command -v eas &> /dev/null; then
            echo "⚠️  EAS CLI not found. Installing..."
            npm install -g eas-cli
        fi
        
        eas build --platform ios --profile development-simulator
        echo ""
        echo "✅ Build complete!"
        echo "📥 Download and install with:"
        echo "   eas build:run --platform ios"
        ;;
    5)
        echo ""
        echo "📦 Building for TestFlight/Device..."
        echo "This requires an Apple Developer account."
        echo "This will take about 15-20 minutes."
        echo ""
        
        # Check if EAS CLI is installed
        if ! command -v eas &> /dev/null; then
            echo "⚠️  EAS CLI not found. Installing..."
            npm install -g eas-cli
        fi
        
        echo "Choose build type:"
        echo "1) Preview (internal testing)"
        echo "2) Production (App Store)"
        read -p "Enter choice [1-2]: " build_type
        
        if [ "$build_type" == "1" ]; then
            eas build --platform ios --profile preview
        else
            eas build --platform ios --profile production
        fi
        
        echo ""
        echo "✅ Build started!"
        echo "📊 Check status with:"
        echo "   eas build:list"
        ;;
    6)
        echo ""
        echo "📊 Recent iOS builds:"
        eas build:list --platform ios --limit 5
        ;;
    7)
        echo ""
        echo "📥 Installing dependencies..."
        npm install
        echo ""
        echo "✅ Dependencies installed!"
        ;;
    8)
        echo ""
        echo "🧹 Clearing cache..."
        
        # Clear node modules if requested
        read -p "Clear node_modules? (y/N): " clear_modules
        if [[ "$clear_modules" == "y" || "$clear_modules" == "Y" ]]; then
            rm -rf node_modules
            npm install
        fi
        
        # Clear Expo cache
        echo "Clearing Expo cache..."
        npx expo start -c &
        sleep 3
        killall node 2>/dev/null || true
        
        # Clear iOS build cache if exists
        if [ -d "ios" ]; then
            echo "Clearing iOS build cache..."
            rm -rf ios/build ios/Pods ios/Podfile.lock
        fi
        
        echo ""
        echo "✅ Cache cleared!"
        echo "🚀 Start fresh with:"
        echo "   npx expo start --ios"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Done! 🎉"
