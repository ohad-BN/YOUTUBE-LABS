@echo off
echo =========================================
echo    Starting YouTube Labs Frontend
echo =========================================

cd frontend

:: Install npm dependencies if node_modules is missing
call npm install

:: Start the Vite development server
echo Starting Vite Dev Server...
npm run dev
