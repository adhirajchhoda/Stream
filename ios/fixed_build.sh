#!/bin/bash

# Fixed Build Script for Stream iOS App
# Uses available iPhone 16 simulator

set -e

echo "🚀 Stream iOS App - Fixed Build"
echo "==============================="

# Use full path to xcodebuild
XCODEBUILD="/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild"

if [ ! -f "$XCODEBUILD" ]; then
    echo "❌ Error: Xcode not found at expected location"
    exit 1
fi

echo "✅ Using Xcode 16.4 (Build 16F6)"
echo ""

# Check project file
if [ ! -f "StreamApp.xcodeproj/project.pbxproj" ]; then
    echo "❌ Error: StreamApp.xcodeproj not found in current directory"
    exit 1
fi

echo "🧹 Cleaning build folder..."
$XCODEBUILD clean -project StreamApp.xcodeproj -scheme StreamApp

echo ""
echo "🏗️  Building for iPhone 16 Simulator..."
echo ""

# Build with iPhone 16 (which is available)
$XCODEBUILD build \
    -project StreamApp.xcodeproj \
    -scheme StreamApp \
    -destination 'platform=iOS Simulator,name=iPhone 16,OS=18.6' \
    -configuration Debug

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BUILD SUCCESSFUL! 🎉"
    echo ""
    echo "🎯 To run the app:"
    echo "   1. Open Xcode: open StreamApp.xcodeproj"
    echo "   2. Select 'iPhone 16' simulator"
    echo "   3. Press Cmd+R to run"
    echo ""
    echo "📱 Available simulators:"
    echo "   - iPhone 16"
    echo "   - iPhone 16 Plus" 
    echo "   - iPhone 16 Pro"
    echo "   - iPhone 16 Pro Max"
else
    echo ""
    echo "❌ Build failed with exit code $?"
    echo "Check the output above for specific Swift compilation errors"
fi
