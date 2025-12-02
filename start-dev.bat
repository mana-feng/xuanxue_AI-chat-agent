@echo off
REM 简化版启动脚本：一个窗口起前端，一个窗口起后端，然后自动打开网页。
REM 为避免亂碼問題，腳本內容僅使用基礎 ASCII 字符。

REM 切到當前腳本所在目錄
cd /d "%~dp0"

REM ======================= 配置區 =======================
REM 前端啟動命令（本項目：Vite / Uni H5 開發服務）
set FRONT_CMD=npm run dev

REM 後端啟動命令：通過 npm script 啟動（保持在項目根目錄下）
REM 對應 package.json 中的 "dev:server": "node server/app.js"
set BACK_CMD=npm run dev:server

REM 開發訪問 URL：前端端口（uni-app H5 默認為 3000），如果你改了端口，這裡也要一起改
set DEV_URL=http://localhost:3000
REM =====================================================

echo.
echo [INFO] Starting frontend and backend...

REM 啟動前端（新窗口，窗口標題 Frontend）
if not "%FRONT_CMD%"=="" (
    start "Frontend" cmd /k "%FRONT_CMD%"
) else (
    echo [WARN] FRONT_CMD is empty, frontend will not be started.
)

REM 啟動後端（新窗口，窗口標題 Backend）
if not "%BACK_CMD%"=="" (
    start "Backend" cmd /k "%BACK_CMD%"
) else (
    echo [INFO] BACK_CMD is empty, backend is not configured in this script.
)

REM 打開默認瀏覽器訪問頁面
echo.
echo [INFO] Opening browser: %DEV_URL%
start "" "%DEV_URL%"

echo.
echo Done. You can close this window.
pause >nul