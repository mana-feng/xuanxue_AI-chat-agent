@echo off
setlocal

echo ==========================================
echo       Cleaning Project Dependencies
echo ==========================================

echo.
echo [1/3] Cleaning Frontend...
cd frontend
if exist dist (
    echo   - Removing dist folder...
    rmdir /s /q dist
)
if exist node_modules (
    echo   - Removing node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo   - Removing package-lock.json...
    del package-lock.json
)
echo   - Installing dependencies...
call npm install
cd ..

echo.
echo [2/3] Cleaning Backend Admin UI...
cd backend/admin-ui
if exist dist (
    echo   - Removing dist folder...
    rmdir /s /q dist
)
if exist node_modules (
    echo   - Removing node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo   - Removing package-lock.json...
    del package-lock.json
)
echo   - Installing dependencies...
call npm install
cd ../..

echo.
echo [3/3] Cleaning Backend...
cd backend
if exist node_modules (
    echo   - Removing node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo   - Removing package-lock.json...
    del package-lock.json
)
echo   - Installing dependencies...
call npm install
cd ..

echo.
echo ==========================================
echo       Clean Start Preparation Complete
echo ==========================================
echo.
echo You can now run 'start-dev.bat' to start the development environment.
pause
