#!/bin/bash

# Fix Redis Connection and Restart App
# Run this on your Hetzner server to fix the Redis connection issue

set -e

echo "========================================="
echo "Fixing Redis Connection"
echo "========================================="
echo ""

# Stop PM2
echo "🛑 Stopping PM2 process..."
pm2 delete wazzup || echo "Process not running"
echo ""

# Remove build cache
echo "🗑️  Removing build cache..."
rm -rf .next
echo "✅ Build cache cleared"
echo ""

# Rebuild with fresh environment
echo "🔨 Rebuilding application..."
npm run build
echo ""

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start npm --name "wazzup" -- start
pm2 save
echo ""

echo "✅ Application restarted!"
echo ""
echo "Checking logs for Redis connection..."
echo ""
sleep 3
pm2 logs wazzup --lines 20
