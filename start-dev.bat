@echo off
setlocal
cd /d "%~dp0"

echo [INFO] Starting backend...
start "Backend" cmd /k "cd /d %~dp0backend && npm start"

echo [INFO] Starting frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev:h5"

echo [INFO] Done. Backend and frontend are starting in separate windows.

REM 打开前端页面
start "" "http://localhost:3000" 2>nul
