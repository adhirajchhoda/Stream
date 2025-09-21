#!/bin/bash

# Debug Build Script for Stream iOS App
# Uses full Xcode path to bypass xcode-select issues

set -e

echo "🔍 Stream iOS App - Debug Build"
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
echo "🔍 Attempting build with detailed output..."
echo ""

# Build with detailed output to capture Swift compilation errors
$XCODEBUILD build \
    -project StreamApp.xcodeproj \
    -scheme StreamApp \
    -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest' \
    -configuration Debug \
    -verbose \
    2>&1 | tee build_output.log

echo ""
echo "📄 Build log saved to build_output.log"
echo ""

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Checking for Swift compilation errors..."
    echo ""
    echo "🔍 Swift Compilation Errors:"
    grep -A 5 -B 5 "SwiftCompile failed\|error:" build_output.log || echo "No specific Swift errors found in log"
    echo ""
    echo "🔍 Most recent errors:"
    tail -30 build_output.log
fi
