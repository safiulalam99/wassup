#!/bin/bash

# Fix PM2 Environment and Use Standalone Server
# Run this on your Hetzner server

set -e

echo "========================================="
echo "Fixing PM2 Configuration"
echo "========================================="
echo ""

# Stop current PM2 process
echo "🛑 Stopping PM2..."
pm2 delete wazzup || echo "Process not running"
echo ""

# Start with standalone server and proper environment loading
echo "🚀 Starting with standalone server..."
pm2 start .next/standalone/server.js --name "wazzup" --update-env
pm2 save
echo ""

echo "✅ Application started with standalone server!"
echo ""
echo "Checking logs for errors..."
echo ""
sleep 3
pm2 logs wazzup --lines 20
