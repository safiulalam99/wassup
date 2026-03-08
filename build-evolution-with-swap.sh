#!/bin/bash

# Build Evolution API with Swap Memory
# This script creates temporary swap space to help with the memory-intensive build

set -e

echo "========================================="
echo "Evolution API Builder with Swap Memory"
echo "========================================="
echo ""

# Check if swap already exists
CURRENT_SWAP=$(swapon --show | tail -n +2 | wc -l)

if [ "$CURRENT_SWAP" -eq 0 ]; then
    echo "📦 Creating 4GB swap file for build process..."
    echo "   This will help prevent out-of-memory errors"
    echo ""

    # Create 4GB swap file
    dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    echo ""
    echo "✅ Swap enabled:"
    free -h
    echo ""
else
    echo "✅ Swap already exists:"
    swapon --show
    echo ""
fi

# Now run the evolution build
echo "🚀 Starting Evolution API build..."
echo "   This will take 5-15 minutes..."
echo ""

./build-evolution-image.sh

# Disable and remove swap after build
echo ""
echo "🧹 Cleaning up swap file..."
swapoff /swapfile || true
rm -f /swapfile

echo ""
echo "========================================="
echo "✨ Build complete and swap cleaned up!"
echo "========================================="
