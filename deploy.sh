#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/meetingautomator-admin}"
PORT="${PORT:-3010}"

cd "$APP_DIR"
npm ci
npm run check

if command -v pm2 >/dev/null 2>&1; then
  PORT="$PORT" pm2 start ecosystem.config.cjs --update-env || PORT="$PORT" pm2 restart meetingautomator-admin --update-env
  pm2 save
else
  echo "PM2 is not installed. Build completed; start with: PORT=$PORT npm start"
fi
