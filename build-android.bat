@echo off
REM Dividela Android Build Script for Windows
REM This script helps you build the Android version of Dividela

echo.
echo 🚀 Dividela Android Build Helper
echo ================================
echo.

REM Check if EAS CLI is installed
where eas >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  EAS CLI not found. Installing...
    call npm install -g eas-cli
)

REM Main menu
echo Choose build type:
echo 1) Preview APK (for testing on devices)
echo 2) Production APK (for release)
echo 3) Development build (with dev tools)
echo 4) Check build status
echo 5) Install dependencies only
echo.

set /p choice="Enter choice [1-5]: "

if "%choice%"=="1" (
    echo.
    echo 📦 Building Preview APK...
    echo This will take about 15-20 minutes.
    echo.
    call eas build --platform android --profile preview
    echo.
    echo ✅ Build complete! Download link above.
    echo 📱 Install the APK on your Android device to test.
)

if "%choice%"=="2" (
    echo.
    echo 📦 Building Production APK...
    echo This will take about 15-20 minutes.
    echo.
    call eas build --platform android --profile production
    echo.
    echo ✅ Production build complete!
)

if "%choice%"=="3" (
    echo.
    echo 📦 Building Development version...
    call eas build --platform android --profile development
)

if "%choice%"=="4" (
    echo.
    echo 📊 Recent builds:
    call eas build:list --platform android --limit 5
)

if "%choice%"=="5" (
    echo.
    echo 📥 Installing dependencies...
    call npm install
    echo.
    echo ✅ Dependencies installed!
)

echo.
echo Done! 🎉
pause
