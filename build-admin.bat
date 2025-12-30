@echo off
setlocal
cd /d "%~dp0"

echo [INFO] Building Backend Admin UI...
cd backend\admin-ui
call npm run build:h5

if errorlevel 1 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo [INFO] Build successful!
echo [INFO] Please restart the backend to serve the new files.
pause
