@echo off
echo ===================================================
echo   WORDLE CHAOS: LOCAL STARTUP PROTOCOL
echo ===================================================
echo.

:: Check for node_modules
if not exist "node_modules\" (
    echo [SYSTEM] node_modules not found. Initiating dependency sync...
    call npm install
) else (
    echo [SYSTEM] Dependencies verified.
)

echo.
echo [SYSTEM] Starting Neural Interface (Vite Dev Server)...
echo [SYSTEM] URL: http://localhost:5173
echo.

call npm run dev

pause
