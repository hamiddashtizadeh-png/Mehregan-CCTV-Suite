#!/usr/bin/env bash
# ==============================================================================
# Mehregan Business Suite — Cross-Platform Executable Launcher
# Guaranteed binary-relative path calculation, bundled runtime & auto-browser open
# ==============================================================================

set -e

# Calculate actual directory of this script, never assuming current working directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "---------------------------------------------------------"
echo " راه‌انداز خودکار سامانه حسابداری و مدیریت کسب‌وکار مهرگان"
echo "---------------------------------------------------------"
echo "📍 مسیر نصب محاسبه‌شده: $APP_ROOT"

# Determine runtime binary (bundled runtime takes precedence)
NODE_EXEC=""
if [ -x "$APP_ROOT/runtime/node" ]; then
  NODE_EXEC="$APP_ROOT/runtime/node"
  echo "📦 استفاده از Runtime تعبیه‌شده در بسته نصبی: $NODE_EXEC"
elif command -v node >/dev/null 2>&1; then
  NODE_EXEC="$(command -v node)"
  echo "🌐 استفاده از Node.js سیستم: $NODE_EXEC"
elif command -v bun >/dev/null 2>&1; then
  NODE_EXEC="$(command -v bun)"
  echo "🌐 استفاده از Bun سیستم: $NODE_EXEC"
else
  echo "❌ خطا: Runtime اجرایی یافت نشد. لطفاً بسته نصبی کامل را مجدداً استخراج کنید."
  exit 1
fi

PORT="${PORT:-3000}"
export PORT
export MEHREGAN_INSTALL_ROOT="$APP_ROOT"

echo "🚀 در حال اجرای سرور مرکزی مهرگان روی پورت $PORT..."

# Start server in background
if [ -f "$APP_ROOT/server.cjs" ]; then
  "$NODE_EXEC" "$APP_ROOT/server.cjs" &
  SERVER_PID=$!
elif [ -f "$APP_ROOT/server.ts" ]; then
  if command -v npx >/dev/null 2>&1; then
    npx tsx "$APP_ROOT/server.ts" &
    SERVER_PID=$!
  else
    "$NODE_EXEC" "$APP_ROOT/server.ts" &
    SERVER_PID=$!
  fi
else
  echo "❌ خطا: فایل اجرایی سرور در مسیر نصب یافت نشد."
  exit 1
fi

echo "⏳ در حال بررسی آمادگی سرویس مرکزی (Health Check)..."
MAX_ATTEMPTS=30
ATTEMPT=0
READY=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s "http://127.0.0.1:$PORT/api/system/health" | grep -q '"ok":true'; then
    READY=1
    break
  fi
  sleep 1
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $READY -eq 1 ]; then
  echo "✅ سرور مرکزی آماده است. در حال باز کردن مرورگر پیش‌فرض..."
  APP_URL="http://127.0.0.1:$PORT"
  
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then
    open "$APP_URL" >/dev/null 2>&1 &
  else
    echo "💡 لطفاً آدرس زیر را در مرورگر خود باز کنید: $APP_URL"
  fi

  echo "🟢 برنامه در حال اجراست. برای توقف، کلید Ctrl+C را فشار دهید."
  wait $SERVER_PID
else
  echo "❌ خطا در راه‌اندازی سرور مرکزی در مهلت زمانی مقرر."
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi
