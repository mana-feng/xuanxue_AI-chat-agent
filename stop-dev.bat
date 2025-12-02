@echo off
REM 一键关闭开发服务：直接按端口杀进程
REM 在下面配置要释放的端口（用空格分隔）
REM ⚠ 根据实际情况修改：例如前端 5173、后端 3001
set PORTS=3001 5173

echo.
echo [INFO] Trying to kill processes listening on ports: %PORTS%
echo.

for %%P in (%PORTS%) do (
    echo [INFO] Checking port %%P ...
    
    REM 通过 netstat 找出对应端口的 PID
    for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr LISTENING ^| findstr ":%%P "') do (
        echo [INFO] Found PID %%A on port %%P, killing...
        taskkill /PID %%A /T /F >nul 2>&1
        if errorlevel 1 (
            echo [WARN] Failed to kill PID %%A on port %%P (maybe already closed).
        ) else (
            echo [OK] Killed PID %%A on port %%P.
        )
        goto :NEXT_PORT
    )
    
    echo [INFO] No process found listening on port %%P.
    :NEXT_PORT
    echo.
)

echo [INFO] Done. All configured ports have been processed.
echo.
echo Press any key to close this window...
pause >nul
