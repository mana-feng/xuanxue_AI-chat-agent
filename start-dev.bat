@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo   Starting Development Environment
echo ========================================
echo.

if not exist ".env" (
    echo [INFO] .env file not found.
    if exist "env.example" (
        echo [INFO] Creating .env from env.example...
        copy /Y env.example .env >nul 2>&1
        if errorlevel 1 (
            echo [WARN] Failed to create .env file.
        ) else (
            echo [OK] .env file created.
        )
    )
    echo.
)

if exist ".env" (
    echo [INFO] Using MySQL database.
    echo.
)

echo [INFO] Starting frontend...
start "Frontend" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 2 /nobreak >nul 2>&1

echo [INFO] Starting backend...
start "Backend" cmd /k "cd /d %~dp0 && npm run dev:server"
timeout /t 2 /nobreak >nul 2>&1

echo [INFO] Waiting for services to start...
timeout /t 3 /nobreak >nul 2>&1

echo [INFO] Opening browser...
start "" "http://localhost:3000" 2>nul

echo.
echo ========================================
echo   Services started!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo ========================================
echo.
echo Press any key to close this window...
pause
