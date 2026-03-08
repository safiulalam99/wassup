#!/bin/bash

# Wazzup Deployment Script for Hetzner
# This script helps you deploy the app step-by-step

set -e

echo "========================================="
echo "Wazzup - Hetzner Deployment Guide"
echo "========================================="
echo ""

# Function to check if we're on the server
check_location() {
    if [ -f "/etc/hostname" ]; then
        HOSTNAME=$(cat /etc/hostname)
        echo "📍 Current host: $HOSTNAME"
    fi
    echo ""
}

# Function to wait for user
wait_for_user() {
    read -p "Press Enter to continue..."
    echo ""
}

check_location

echo "This script will guide you through deploying Wazzup to Hetzner."
echo ""
wait_for_user

# Step 1: Build Evolution API image
echo "========================================="
echo "Step 1: Build Custom Evolution API Image"
echo "========================================="
echo ""
echo "The Evolution API needs a custom build to fix QR code issues."
echo ""
read -p "Do you want to build the Evolution API image now? (y/n): " BUILD_IMAGE
echo ""

if [ "$BUILD_IMAGE" = "y" ] || [ "$BUILD_IMAGE" = "Y" ]; then
    if [ -f "./build-evolution-image.sh" ]; then
        echo "🚀 Running build script..."
        echo ""
        bash ./build-evolution-image.sh
    else
        echo "❌ build-evolution-image.sh not found in current directory!"
        echo "Please make sure you're in the app directory."
        exit 1
    fi
else
    echo "⚠️  Skipping image build. Make sure the image exists!"
    echo "You can build it later by running: ./build-evolution-image.sh"
fi

echo ""
wait_for_user

# Step 2: Check environment variables
echo "========================================="
echo "Step 2: Environment Variables"
echo "========================================="
echo ""

if [ -f ".env" ]; then
    echo "✅ .env file found"
    echo ""
    echo "Please verify these critical variables are set:"
    echo "  - BETTER_AUTH_SECRET (32+ characters)"
    echo "  - BETTER_AUTH_URL (http://YOUR_SERVER_IP:3004)"
    echo "  - NEXT_PUBLIC_APP_URL (http://YOUR_SERVER_IP:3004)"
    echo "  - DATABASE_URL"
    echo "  - EVOLUTION_API_KEY"
    echo ""
    read -p "Have you updated .env with your server IP and secrets? (y/n): " ENV_CHECK
    if [ "$ENV_CHECK" != "y" ] && [ "$ENV_CHECK" != "Y" ]; then
        echo ""
        echo "⚠️  Please update .env before continuing!"
        echo "Example .env is in .env.example"
        exit 1
    fi
else
    echo "❌ .env file not found!"
    echo "Please create .env from .env.example"
    exit 1
fi

echo ""
wait_for_user

# Step 3: Start services
echo "========================================="
echo "Step 3: Start Docker Services"
echo "========================================="
echo ""
echo "This will start:"
echo "  - PostgreSQL"
echo "  - MongoDB"
echo "  - Redis"
echo "  - Evolution API"
echo ""
read -p "Start Docker services? (y/n): " START_DOCKER
echo ""

if [ "$START_DOCKER" = "y" ] || [ "$START_DOCKER" = "Y" ]; then
    if [ -f "docker-compose.yml" ]; then
        echo "🚀 Starting Docker services..."
        docker compose up -d
        echo ""
        echo "✅ Docker services started!"
        echo ""
        echo "Waiting for services to be healthy (30 seconds)..."
        sleep 30
    else
        echo "❌ docker-compose.yml not found!"
        exit 1
    fi
else
    echo "⚠️  Skipping Docker startup"
fi

echo ""
wait_for_user

# Step 4: Database setup
echo "========================================="
echo "Step 4: Database Setup"
echo "========================================="
echo ""
echo "Running Prisma migrations to set up the database..."
echo ""

if command -v npm &> /dev/null; then
    npm run db:migrate:deploy
    echo ""
    echo "✅ Database migrations complete!"
else
    echo "❌ npm not found! Install Node.js first."
    exit 1
fi

echo ""
wait_for_user

# Step 5: Build and start Next.js
echo "========================================="
echo "Step 5: Build and Start Next.js App"
echo "========================================="
echo ""
read -p "Build and start the Next.js app? (y/n): " BUILD_APP
echo ""

if [ "$BUILD_APP" = "y" ] || [ "$BUILD_APP" = "Y" ]; then
    echo "📦 Installing dependencies..."
    npm install

    echo ""
    echo "🔨 Building Next.js app..."
    npm run build

    echo ""
    echo "🚀 Starting Next.js in production mode..."
    echo ""
    echo "To run in background, use PM2 or systemd"
    echo "For now, we'll show you the command to run:"
    echo ""
    echo "  npm run start"
    echo ""
    echo "Or use PM2:"
    echo "  npm install -g pm2"
    echo "  pm2 start npm --name wazzup -- start"
    echo "  pm2 save"
    echo "  pm2 startup"
    echo ""
else
    echo "⚠️  Skipping app build"
fi

echo ""
echo "========================================="
echo "✨ Deployment Complete!"
echo "========================================="
echo ""
echo "Your app should be running at: http://YOUR_SERVER_IP:3004"
echo ""
echo "Next steps:"
echo "1. Open the URL in your browser"
echo "2. Register a new account at /register"
echo "3. Go to /dashboard/connect to connect WhatsApp"
echo "4. Scan the QR code with your phone"
echo "5. Contacts will sync automatically!"
echo ""
echo "To check logs:"
echo "  - Docker services: docker compose logs -f"
echo "  - Evolution API: docker logs pers-whatsapp-evolution-api-1 -f"
echo "  - Next.js: check your terminal or PM2 logs"
echo ""
echo "Need help? Check DEPLOYMENT.md for detailed instructions"
echo ""
