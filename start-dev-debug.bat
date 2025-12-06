@echo off
cd /d "%~dp0"

echo Debug: Script started
echo Debug: Current directory: %CD%
echo Debug: Script path: %~dp0
echo.

echo [INFO] Starting frontend...
start "Frontend" cmd /k "cd /d %~dp0 && npm run dev"
echo Debug: Frontend start command executed
timeout /t 2 /nobreak

echo [INFO] Starting backend...
start "Backend" cmd /k "cd /d %~dp0 && npm run dev:server"
echo Debug: Backend start command executed
timeout /t 2 /nobreak

echo [INFO] Opening browser...
start "" "http://localhost:3000"
echo Debug: Browser command executed

echo.
echo Debug: All commands executed. Press any key to exit...
pause

