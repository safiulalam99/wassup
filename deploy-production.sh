#!/bin/bash

################################################################################
# Wazzup Production Deployment Script
#
# This script handles the complete deployment of Wazzup to a production server.
# Run this on your Hetzner server (or any VPS with 4GB+ RAM).
#
# Prerequisites:
# - Fresh Ubuntu/Debian server
# - Root access
# - Domain pointed to server IP (optional)
#
# Usage:
#   chmod +x deploy-production.sh
#   ./deploy-production.sh
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

step_header() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
    echo ""
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (use sudo)"
    exit 1
fi

step_header "1/10 - System Information"
log_info "Server IP: $(hostname -I | awk '{print $1}')"
log_info "Hostname: $(hostname)"
log_info "OS: $(lsb_release -d | cut -f2-)"
log_info "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo ""

read -p "Continue with deployment? (y/n): " CONTINUE
if [ "$CONTINUE" != "y" ]; then
    log_warning "Deployment cancelled"
    exit 0
fi

step_header "2/10 - Installing System Dependencies"
log_info "Updating package list..."
apt-get update -qq

log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    log_success "Docker installed"
else
    log_success "Docker already installed"
fi

log_info "Installing Docker Compose..."
apt-get install -y docker-compose-plugin

log_info "Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    log_success "Node.js $(node --version) installed"
else
    log_success "Node.js $(node --version) already installed"
fi

log_info "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
    log_success "PM2 installed"
else
    log_success "PM2 already installed"
fi

log_info "Installing git..."
apt-get install -y git
log_success "All system dependencies installed"

step_header "3/10 - Configuring Firewall"
log_info "Opening required ports..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp   # SSH
    ufw allow 3000/tcp # Next.js app
    ufw allow 8080/tcp # Evolution API (optional - for debugging)
    log_success "Firewall configured"
else
    log_warning "UFW not found, skipping firewall configuration"
fi

step_header "4/10 - Cloning Application"
APP_DIR="/root/wazzup"

if [ -d "$APP_DIR" ]; then
    log_warning "Application directory already exists at $APP_DIR"
    read -p "Pull latest changes? (y/n): " PULL_CHANGES
    if [ "$PULL_CHANGES" = "y" ]; then
        cd "$APP_DIR"
        git pull
        log_success "Pulled latest changes"
    fi
else
    log_info "Cloning repository..."
    cd /root
    git clone https://github.com/safiulalam99/wassup.git wazzup
    cd wazzup
    log_success "Repository cloned to $APP_DIR"
fi

cd "$APP_DIR"

step_header "5/10 - Environment Configuration"
if [ ! -f ".env" ]; then
    log_info "Creating .env file..."

    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')

    # Generate secrets
    BETTER_AUTH_SECRET=$(openssl rand -base64 32)

    cat > .env << EOF
# Database
DATABASE_URL="postgresql://wazzup:change_me_strong_password@localhost:5432/wazzup?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change_me_redis_password

# App
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
BETTER_AUTH_URL=http://$SERVER_IP:3000
NEXT_PUBLIC_APP_URL=http://$SERVER_IP:3000

# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=change_me_evolution_key
EOF

    log_success ".env file created"
    log_info "Server URL: http://$SERVER_IP:3000"
else
    log_success ".env file already exists"
fi

# Copy .env to standalone directory (will be created after build)
log_info "Environment configuration ready"

step_header "6/10 - Building Custom Evolution API Image"
log_info "This step builds Evolution API with QR code fixes"
log_info "Build time: 5-15 minutes (requires 4GB+ RAM)"
echo ""

# Check if swap is needed
TOTAL_MEM=$(free -m | awk '/^Mem:/ {print $2}')
if [ "$TOTAL_MEM" -lt 6000 ]; then
    log_warning "System has less than 6GB RAM, creating swap space..."

    if [ ! -f /swapfile ]; then
        dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        log_success "4GB swap created"
    else
        log_success "Swap already exists"
    fi
fi

# Build Evolution API image
./build-evolution-image.sh

# Clean up swap if we created it
if [ -f /swapfile ] && [ "$TOTAL_MEM" -lt 6000 ]; then
    log_info "Cleaning up swap..."
    swapoff /swapfile
    rm -f /swapfile
fi

log_success "Custom Evolution API image built"

step_header "7/10 - Starting Docker Services"
log_info "Starting PostgreSQL, Redis, MongoDB, Evolution API..."
docker compose up -d

log_info "Waiting for services to be healthy (30 seconds)..."
sleep 30

log_success "Docker services started"

step_header "8/10 - Setting Up Database"
log_info "Installing dependencies..."
npm install --production=false

log_info "Generating Prisma client..."
npm run db:generate

log_info "Creating database schema..."
npm run db:push

log_success "Database ready"

step_header "9/10 - Building Next.js Application"
log_info "Building production bundle..."
npm run build

# Copy environment to standalone directory
cp .env .next/standalone/.env

log_success "Application built"

step_header "10/10 - Starting Application with PM2"
log_info "Stopping any existing PM2 processes..."
pm2 delete wazzup || true

log_info "Starting application..."
pm2 start .next/standalone/server.js --name "wazzup"
pm2 save

log_success "Application started"

# Final status check
sleep 5
echo ""
step_header "🎉 Deployment Complete!"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "Your Wazzup application is now running!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📱 Application URL: http://$SERVER_IP:3000"
echo ""
echo "  Next steps:"
echo "    1. Open the URL in your browser"
echo "    2. Register a new account"
echo "    3. Go to /dashboard/connect"
echo "    4. Scan QR code with WhatsApp"
echo "    5. Contacts will auto-sync!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Useful commands:"
echo "  • View logs:        pm2 logs wazzup"
echo "  • Restart app:      pm2 restart wazzup"
echo "  • App status:       pm2 status"
echo "  • Docker logs:      docker compose logs -f"
echo ""
echo "Documentation: $APP_DIR/DEPLOYMENT.md"
echo ""
