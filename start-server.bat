@echo off
cd /d "c:\Users\dpipp\freedom\freedom"
echo Starting StyleLink Fashion Development Server...
echo.
echo Server will run at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
echo Checking if Node.js is available...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found. Starting server...
node server.js
pause
