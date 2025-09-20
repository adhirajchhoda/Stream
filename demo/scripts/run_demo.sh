#!/bin/bash

# 🎬 Stream Protocol Hackathon Demo Runner
# Quick setup and execution script for judges

set -e

echo "🌊 STREAM PROTOCOL - DEMO SETUP"
echo "==============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Test demo components
echo "🧪 Testing demo components..."
npm run test:demo

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEMO READY!"
    echo "=============="
    echo ""
    echo "Choose your demo mode:"
    echo "1) Interactive demo (recommended for live presentation)"
    echo "2) Auto demo (fast, consistent timing)"
    echo "3) Starbucks scenario"
    echo "4) Amazon scenario"
    echo "5) Uber scenario"
    echo ""

    read -p "Enter your choice (1-5): " choice

    case $choice in
        1)
            echo "🎬 Starting interactive demo..."
            npm run demo
            ;;
        2)
            echo "🚀 Starting auto demo..."
            npm run demo:auto
            ;;
        3)
            echo "☕ Starting Starbucks scenario..."
            npm run demo:starbucks
            ;;
        4)
            echo "📦 Starting Amazon scenario..."
            npm run demo:amazon
            ;;
        5)
            echo "🚗 Starting Uber scenario..."
            npm run demo:uber
            ;;
        *)
            echo "❌ Invalid choice. Running default demo..."
            npm run demo:auto
            ;;
    esac
else
    echo "❌ Demo test failed. Please check the error messages above."
    exit 1
fi