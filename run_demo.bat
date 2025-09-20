@echo off
REM 🎬 Stream Protocol Hackathon Demo Runner (Windows)
REM Quick setup and execution script for judges

echo 🌊 STREAM PROTOCOL - DEMO SETUP
echo ===============================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm found
npm --version

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)

REM Test demo components
echo 🧪 Testing demo components...
npm run test:demo
if %errorlevel% neq 0 (
    echo ❌ Demo test failed. Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo 🎉 DEMO READY!
echo ==============
echo.
echo Choose your demo mode:
echo 1) Interactive demo (recommended for live presentation)
echo 2) Auto demo (fast, consistent timing)
echo 3) Starbucks scenario
echo 4) Amazon scenario
echo 5) Uber scenario
echo.

set /p choice=Enter your choice (1-5):

if "%choice%"=="1" (
    echo 🎬 Starting interactive demo...
    npm run demo
) else if "%choice%"=="2" (
    echo 🚀 Starting auto demo...
    npm run demo:auto
) else if "%choice%"=="3" (
    echo ☕ Starting Starbucks scenario...
    npm run demo:starbucks
) else if "%choice%"=="4" (
    echo 📦 Starting Amazon scenario...
    npm run demo:amazon
) else if "%choice%"=="5" (
    echo 🚗 Starting Uber scenario...
    npm run demo:uber
) else (
    echo ❌ Invalid choice. Running default demo...
    npm run demo:auto
)

echo.
echo Demo completed! Press any key to exit...
pause >nul