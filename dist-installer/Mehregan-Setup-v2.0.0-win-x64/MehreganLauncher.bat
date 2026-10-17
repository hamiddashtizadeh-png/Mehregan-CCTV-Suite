@echo off
REM ==============================================================================
REM Mehregan Business Suite — Windows Launcher
REM Starts local server with bundled runtime & opens default browser
REM ==============================================================================

chcp 65001 >nul
title Mehregan ERP Launcher

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "APP_ROOT=%CD%"
popd

echo -------------------------------------------------------------
echo  راه‌انداز خودکار سامانه حسابداری و مدیریت کسب‌وکار مهرگان
echo -------------------------------------------------------------
echo مسیر نصب: %APP_ROOT%

set "NODE_EXEC="
if exist "%APP_ROOT%\runtime\node.exe" (
    set "NODE_EXEC=%APP_ROOT%\runtime\node.exe"
    echo استفاده از Runtime تعبیه‌شده در بسته نصبی: %NODE_EXEC%
) else (
    where node >nul 2>&1
    if %errorlevel% equ 0 (
        set "NODE_EXEC=node"
        echo استفاده از Node.js سیستم
    ) else (
        echo خطا: Runtime اجرایی یافت نشد. لطفاً بسته نصبی کامل را مجدداً استخراج کنید.
        pause
        exit /b 1
    )
)

set "PORT=3000"
echo در حال راه‌اندازی سرور مرکزی روی پورت %PORT%...

if not exist "%APP_ROOT%\node_modules\" (
    echo در حال نصب پیش‌نیازها...
    call npm install
)

if exist "%APP_ROOT%\server.cjs" (
    start "Mehregan Server" /b "%NODE_EXEC%" "%APP_ROOT%\server.cjs"
) else (
    start "Mehregan Server" /b npm start
)

echo در حال بررسی سلامت سرور و باز کردن مرورگر...
timeout /t 3 /nobreak >nul
start http://localhost:%PORT%

echo برنامه در حال اجراست.
