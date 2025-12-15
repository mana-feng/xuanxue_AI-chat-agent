@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo   Starting Development Environment
echo ========================================
echo.

REM 检查后端环境变量
if not exist "backend\.env" (
    echo [INFO] Backend .env file not found.
    if exist "backend\env.example" (
        echo [INFO] Creating backend\.env from env.example...
        echo [WARN] Please edit backend\.env file and configure your database and JWT secret!
        copy /Y backend\env.example backend\.env >nul 2>&1
        if errorlevel 1 (
            echo [WARN] Failed to create backend\.env file.
        ) else (
            echo [OK] Backend .env file created from env.example.
        )
    )
    echo.
)

REM 检查前端环境变量
if not exist "frontend\.env.development" (
    echo [INFO] Frontend .env.development file not found.
    if exist "frontend\env.example" (
        echo [INFO] Creating frontend\.env.development from env.example...
        copy /Y frontend\env.example frontend\.env.development >nul 2>&1
        if errorlevel 1 (
            echo [WARN] Failed to create frontend\.env.development file.
        ) else (
            echo [OK] Frontend .env.development file created from env.example.
        )
    )
    echo.
)

echo [INFO] Starting backend...
start "Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 2 /nobreak >nul 2>&1

echo [INFO] Starting frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev:h5"
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
