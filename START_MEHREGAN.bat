@echo off
REM ==============================================================================
REM  Mehregan ERP - Windows Startup Script
REM ==============================================================================

cd /d "%~dp0"
chcp 65001 >nul 2>&1
title Mehregan ERP - سامانه یکپارچه مهرگان
color 0B

echo ==============================================================================
echo    سامانه یکپارچه مدیریت کسب و کار و حسابداری مهرگان
echo ==============================================================================
echo.

REM 1. Identify Node.js
set "NODE_CMD="
where node >nul 2>&1
if %errorlevel% equ 0 (
    set "NODE_CMD=node"
) else (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files\nodejs\node.exe"
        set "PATH=%PATH%;C:\Program Files\nodejs"
    ) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "NODE_CMD=%LOCALAPPDATA%\Programs\node\node.exe"
        set "PATH=%PATH%;%LOCALAPPDATA%\Programs\node"
    )
)

if "%NODE_CMD%"=="" (
    echo [خطا] نرم‌افزار Node.js روی ویندوز شما نصب نیست یا در مسیر سیستم قرار ندارد!
    echo.
    echo لطفا Node.js را دانلود و نصب نمایید:
    echo 1. مراجعه به سایت رسمی: https://nodejs.org
    echo 2. دانلود نسخه پیشنهادی LTS و نصب با تنظیمات پیش‌فرض
    echo.
    echo در حال باز کردن صفحه دانلود...
    start https://nodejs.org
    echo.
    echo پس از اتمام نصب، این فایل را مجددا اجرا کنید.
    echo.
    pause
    exit /b 1
)

echo [1/4] موتور اجرایی Node.js تایید شد:
call %NODE_CMD% -v
echo.

REM 2. Check dependencies
if not exist "%~dp0node_modules\" (
    echo [2/4] در حال نصب خودکار بسته‌های پیش‌نیاز... لطفا شکیبا باشید.
    call npm install
    if %errorlevel% neq 0 (
        echo [خطا] نصب بسته‌های پروژه با خطا مواجه شد. لطفا اتصال اینترنت را چک کنید.
        echo.
        pause
        exit /b 1
    )
    echo [2/4] بسته‌ها با موفقیت نصب شدند.
) else (
    echo [2/4] بسته‌های پیش‌نیاز آماده هستند.
)
echo.

REM 3. Check frontend build
if not exist "%~dp0dist\index.html" (
    echo [3/4] در حال آماده‌سازی فایل‌های رابط کاربری...
    call npm run build
) else (
    echo [3/4] رابط کاربری آماده است.
)
echo.

REM 4. Server launch and browser open
echo [4/4] در حال راه‌اندازی سرور روی پورت 3000...
echo.
echo ==============================================================================
echo  مشخصات ورود به سامانه:
echo  ----------------------------------------------------------------------------
echo  * آدرس مرورگر:          http://localhost:3000
echo  * نام کاربری مدیر:      admin        ^| رمز عبور: admin
echo  * نام کاربری نصاب:      installer_ali ^| رمز عبور: ali@123
echo.
echo  برای متوقف کردن برنامه، پنجره را ببندید یا دکمه‌های Ctrl+C را بفشارید.
echo ==============================================================================
echo.

REM Open browser after short delay
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

REM Run server using npx tsx server.ts or npm run dev
call npx tsx server.ts
if %errorlevel% neq 0 (
    echo.
    echo [تلاش مجدد] اجرای سرور با موتور ثانویه...
    call npm run dev
)

if %errorlevel% neq 0 (
    echo.
    echo [خطا] اجرای سرور متوقف شد یا با خطا مواجه گردید.
    echo اطلاعات فوق را برای بررسی خطا مشاهده فرمایید.
)

echo.
echo سرور مهرگان خاتمه یافت. برای بستن پنجره کلیدی را فشار دهید...
pause
