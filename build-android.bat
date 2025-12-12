@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo    Android 应用打包脚本
echo ========================================
echo.

rem 检查是否在项目根目录
if not exist "package.json" (
    echo [错误] 请在项目根目录运行此脚本！
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
if not exist "node_modules" (
    echo [INFO] 未找到 node_modules，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败！
        pause
        exit /b 1
    )
) else (
    echo [OK] 依赖已存在
)
echo.

echo [2/3] 构建项目...
call npm run build:app
if errorlevel 1 (
    echo [错误] 项目构建失败！
    pause
    exit /b 1
)
echo.

echo [3/3] 构建完成！
echo.
echo ========================================
echo    构建结果
echo ========================================
echo.
echo 构建产物位置: dist\build\app
echo.
echo 注意: 构建过程中有 nvue CSS 兼容性警告，但不影响打包
echo 详细问题请查看: docs\构建问题说明.md
echo.
echo 下一步操作:
echo 1. 使用 HBuilderX 打开项目
echo 2. 发行 → 原生 App-云打包 → Android
echo 3. 或使用 Android Studio 打开 dist\build\app 目录进行本地打包
echo.
echo 详细说明请查看: docs\Android打包指南.md
echo.
pause

