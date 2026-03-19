@echo off
echo =========================================
echo    Starting YouTube Labs (ALL)
echo =========================================

:: Start the backend in a new command window
echo Launching Backend server...
start "YouTube Labs Backend" cmd /k "call start_backend.bat"

:: Start the frontend in a new command window
echo Launching Frontend server...
start "YouTube Labs Frontend" cmd /k "call start_frontend.bat"

echo Services are launching. You can close this window.
