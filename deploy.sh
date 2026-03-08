#!/bin/bash
set -e

echo "🚀 Wazzup Deployment Script"
echo "=============================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production not found!"
    echo "📝 Please create .env.production from .env.production.example"
    echo ""
    echo "Run: cp .env.production.example .env.production"
    echo "Then edit .env.production with your values"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✅ Pre-flight checks passed"
echo ""

# Build and start services
echo "📦 Building and starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🗄️  Running database migrations..."
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T app npx prisma migrate deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Access your app:"
echo "   - Local: http://localhost"
echo "   - Production: https://your-domain.com"
echo ""
echo "📝 View logs: docker compose -f docker-compose.prod.yml logs -f"
echo "🛑 Stop: docker compose -f docker-compose.prod.yml down"
echo ""
