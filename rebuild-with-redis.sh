#!/bin/bash

# Complete Rebuild with Redis Password
# Run this on your Hetzner server

set -e

echo "========================================="
echo "Rebuilding with Redis Password"
echo "========================================="
echo ""

# Verify Redis password is in .env
if ! grep -q "REDIS_PASSWORD=change_me_redis_password" .env; then
    echo "❌ REDIS_PASSWORD not found in .env!"
    echo "Adding it now..."
    echo "REDIS_PASSWORD=change_me_redis_password" >> .env
fi

echo "✅ REDIS_PASSWORD is configured"
echo ""

# Stop PM2
echo "🛑 Stopping PM2..."
pm2 delete wazzup || echo "Process not running"
echo ""

# Clear build cache
echo "🗑️  Clearing build cache..."
rm -rf .next
echo "✅ Build cache cleared"
echo ""

# Rebuild with Redis password in environment
echo "🔨 Rebuilding application with Redis authentication..."
npm run build
echo ""

# Start with standalone server
echo "🚀 Starting with standalone server..."
pm2 start .next/standalone/server.js --name "wazzup"
pm2 save
echo ""

echo "✅ Application rebuilt and started!"
echo ""
echo "Checking logs (waiting 5 seconds for worker to start)..."
sleep 5
echo ""
pm2 logs wazzup --lines 15 --nostream
echo ""
echo "========================================="
echo "If you see '[Worker] Campaign worker started'"
echo "and NO Redis errors, then it's working! ✨"
echo "========================================="
