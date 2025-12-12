@echo off
setlocal EnableDelayedExpansion

rem Ports to check/kill
set "PORTS=3001 3000 24678"

echo.
echo [INFO] Trying to kill processes listening on ports: %PORTS%
echo.

for %%P in (%PORTS%) do (
    echo [INFO] Checking port %%P ...

    set "FOUND="
    for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%%P"') do (
        set "FOUND=1"
        echo [INFO] Found PID %%A on port %%P, killing...
        taskkill /PID %%A /T /F >nul 2>&1
        if errorlevel 1 (
            echo [WARN] Failed to kill PID %%A on port %%P ^(maybe already closed^).
        ) else (
            echo [OK] Killed PID %%A on port %%P.
        )
    )

    if not defined FOUND (
        echo [INFO] No process found listening on port %%P.
    )
    echo.
)

echo [INFO] Done. All configured ports have been processed.
echo.
echo Press any key to close this window...
pause
