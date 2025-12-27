@echo off
setlocal
cd /d "%~dp0"

echo [INFO] Starting backend UI (admin)...
start "Backend UI" cmd /k "cd /d %~dp0backend && start /B npm start && cd /d %~dp0backend\admin-ui && npm run dev:h5"

echo [INFO] Starting frontend (H5)...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev:h5"

echo [INFO] Done. Backend UI and frontend are starting in separate windows.
echo [INFO] Frontend H5: http://localhost:3000
echo [INFO] Backend UI: http://localhost:3002
echo [INFO] Backend API: http://localhost:3001
