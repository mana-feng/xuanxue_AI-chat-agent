@echo off
setlocal
cd /d "%~dp0"

echo [INFO] Building Admin UI first (Development Mode)...
cd backend/admin-ui && call npm run build:h5 -- --mode development && cd ../..

echo [INFO] Starting Development Server (One-Click Script)...
echo [INFO] This will start:
echo [INFO] 1. Backend API on HTTPS port 3001
echo [INFO] 2. Frontend H5 on internal HTTP port 24678
echo [INFO] 3. Secure Proxy on HTTPS port 3000 (Forwarding to Frontend and API)
echo.
call npm run dev
