#!/bin/bash

# Evolution API Custom Image Builder
# This script builds the custom Evolution API image from the develop branch
# Run this on your Hetzner server before deploying the app

set -e  # Exit on any error

echo "========================================="
echo "Evolution API Custom Image Builder"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Install Docker first: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "📦 Installing git..."
    apt-get update -qq
    apt-get install -y git
fi

echo "✅ Git is installed"
echo ""

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "📂 Working directory: $TEMP_DIR"
cd "$TEMP_DIR"

# Clone Evolution API repository
echo "📥 Cloning Evolution API repository..."
git clone --quiet https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Checkout develop branch
echo "🔀 Switching to develop branch..."
git checkout develop --quiet

# Apply the maxRetries fix
echo "🔧 Applying maxRetries fix..."
# Fix the undefined maxRetries reference in whatsapp.baileys.service.ts
FILE="src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts"
if [ -f "$FILE" ]; then
    # Replace the problematic log line that references undefined maxRetries
    sed -i 's/Original message not found for update after \${maxRetries} retries/Original message not found for update/g' "$FILE"
    echo "✅ maxRetries fix applied to $FILE"
else
    echo "⚠️  Warning: $FILE not found, skipping patch"
fi
echo ""

# Build the Docker image
echo "🔨 Building Docker image (this may take 5-10 minutes)..."
echo ""
docker build -t evolution-api-v2-fixed:latest .

echo ""
echo "✅ Image built successfully!"
echo ""

# Verify the image
echo "🔍 Verifying image..."
if docker images | grep -q "evolution-api-v2-fixed"; then
    echo "✅ Image verification successful!"
    docker images | grep "evolution-api-v2-fixed"
else
    echo "❌ Image verification failed!"
    exit 1
fi

# Clean up
echo ""
echo "🧹 Cleaning up temporary files..."
cd /tmp
rm -rf "$TEMP_DIR"

echo ""
echo "========================================="
echo "✨ SUCCESS! Custom image is ready"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Navigate to your app directory: cd /path/to/wazzup"
echo "2. Start your services: docker compose up -d"
echo ""
echo "The custom Evolution API image 'evolution-api-v2-fixed:latest'"
echo "is now available and will be used by docker-compose.yml"
echo ""
