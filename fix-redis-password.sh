#!/bin/bash

# Fix Redis Password
# Run this on your Hetzner server to add Redis password to .env

set -e

echo "========================================="
echo "Adding Redis Password to .env"
echo "========================================="
echo ""

# Add Redis password to .env if not already present
if grep -q "REDIS_PASSWORD" .env; then
    echo "✅ REDIS_PASSWORD already exists in .env"
else
    echo "📝 Adding REDIS_PASSWORD to .env..."
    echo "REDIS_PASSWORD=change_me_redis_password" >> .env
    echo "✅ REDIS_PASSWORD added"
fi

echo ""
echo "🔄 Restarting application..."
pm2 restart wazzup
echo ""
echo "✅ Done! Checking logs..."
echo ""
sleep 3
pm2 logs wazzup --lines 10
