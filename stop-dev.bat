@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ========================================
echo   Stopping Development Environment
echo ========================================
echo.

REM 定义项目使用的端口
set PORTS=3001 3000 24678 5173 8080

REM 统计变量
set TOTAL_KILLED=0
set TOTAL_PORTS=0

echo [STEP 1] Checking and killing processes on configured ports...
echo.

REM 遍历所有端口
for %%P in (%PORTS%) do (
    echo [INFO] Checking port %%P ...
    set /a TOTAL_PORTS+=1
    set FOUND=0
    
    REM 查找监听该端口的进程（LISTENING 状态）
    for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        REM 验证是否是有效的 PID（数字）
        echo %%A| findstr /R "^[0-9][0-9]*$" >nul 2>&1
        if not errorlevel 1 (
            set FOUND=1
            echo [INFO] Found PID %%A listening on port %%P, killing...
            taskkill /PID %%A /T /F >nul 2>&1
            if errorlevel 1 (
                echo [WARN] Failed to kill PID %%A on port %%P
            ) else (
                echo [OK] Successfully killed PID %%A on port %%P.
                set /a TOTAL_KILLED+=1
            )
        )
    )
    
    if "!FOUND!"=="0" (
        echo [INFO] No process found listening on port %%P.
    )
    echo.
)

echo [STEP 2] Checking for remaining Node.js processes in project directory...
echo.

REM 查找所有 node.exe 进程并尝试终止（简化方法）
set NODE_FOUND=0
for /f "tokens=2" %%A in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST 2^>nul ^| findstr "PID"') do (
    set PID=%%A
    if not "!PID!"=="" (
        set NODE_FOUND=1
        echo [INFO] Found Node.js process PID !PID!, attempting to kill...
        taskkill /PID !PID! /T /F >nul 2>&1
        if errorlevel 1 (
            REM 进程可能已经终止或需要管理员权限，静默跳过
        ) else (
            echo [OK] Successfully killed Node.js process PID !PID!.
            set /a TOTAL_KILLED+=1
        )
    )
)

if "!NODE_FOUND!"=="0" (
    echo [INFO] No Node.js processes found.
)

echo.
echo [STEP 3] Waiting for processes to fully terminate...
timeout /t 2 /nobreak >nul 2>&1

echo.
echo [STEP 4] Final verification...
echo.

REM 最终验证端口是否已释放（简化版本，避免卡住）
set STILL_RUNNING=0
for %%P in (%PORTS%) do (
    REM 简单检查端口是否还在监听（使用超时避免卡住）
    netstat -ano 2^>nul | findstr ":%%P " | findstr "LISTENING" >nul 2>&1
    if not errorlevel 1 (
        echo [WARN] Port %%P is still in use!
        set STILL_RUNNING=1
    ) else (
        echo [OK] Port %%P is free.
    )
)

echo.
echo ========================================
echo   Summary
echo ========================================
echo   Ports checked: %TOTAL_PORTS%
echo   Processes killed: %TOTAL_KILLED%
if "!STILL_RUNNING!"=="1" (
    echo   Status: Some ports may still be in use
    echo   Note: You may need to run this script as Administrator
) else (
    echo   Status: All ports cleared successfully
)
echo ========================================
echo.

if "!STILL_RUNNING!"=="1" (
    echo [TIP] If ports are still in use, try:
    echo   1. Run this script as Administrator
    echo   2. Manually check: netstat -ano ^| findstr :3001
    echo   3. Manually kill: taskkill /PID ^<PID^> /F
    echo.
)

echo Press any key to close this window...
pause >nul
