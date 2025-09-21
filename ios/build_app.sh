#!/bin/bash

# Stream iOS App Build Script
# This script helps build and test the iOS app without needing Xcode GUI

set -e  # Exit on any error

echo "🚀 Stream iOS App Build Script"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "StreamApp.xcodeproj/project.pbxproj" ]; then
    echo "❌ Error: Please run this script from the ios directory containing StreamApp.xcodeproj"
    exit 1
fi

# Check if Xcode is available
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: xcodebuild not found. Please install Xcode."
    exit 1
fi

echo "📱 Checking iOS Simulators..."
xcrun simctl list devices | grep -E "iPhone.*Booted|iPhone 15" | head -5

echo ""
echo "🔧 Building StreamApp..."

# Clean build folder
echo "🧹 Cleaning build folder..."
xcodebuild clean -project StreamApp.xcodeproj -scheme StreamApp

# Build for iOS Simulator
echo "🏗️  Building for iOS Simulator..."
xcodebuild build \
    -project StreamApp.xcodeproj \
    -scheme StreamApp \
    -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest' \
    -configuration Debug

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "🎯 To run the app:"
echo "   1. Open Xcode: open StreamApp.xcodeproj"
echo "   2. Select iPhone 15 simulator"
echo "   3. Press Cmd+R to run"
echo ""
echo "🧪 To run tests:"
echo "   xcodebuild test -project StreamApp.xcodeproj -scheme StreamApp -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest'"
