@echo off
echo Starting Ocean Guardian Frontend...
echo.

cd /d "%~dp0"

echo Available servers:
echo   1. Python (if installed)
echo   2. npx serve (if Node.js installed)
echo.

REM Try Python first
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo Using Python HTTP server...
    echo Visit http://localhost:8080 in your browser
    echo Press Ctrl+C to stop
    echo.
    python -m http.server 8080
    goto :end
)

REM Try npx serve
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo Using npx serve...
    echo Visit http://localhost:3000 in your browser
    echo Press Ctrl+C to stop
    echo.
    npx serve . -p 3000
    goto :end
)

echo No server found. Please install Python or Node.js.
echo Or open ocean-guardian.html directly in your browser (videos may not work).

:end
pause
