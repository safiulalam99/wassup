# Production Deployment Guide

Complete guide for deploying Wazzup to a production server.

## 🚀 Quick Start (Recommended)

For a fresh server, use the automated deployment script:

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Clone the repository
git clone https://github.com/safiulalam99/wassup.git
cd wassup

# 3. Run the deployment script
chmod +x deploy-production.sh
./deploy-production.sh
```

**That's it!** The script handles everything:
- System dependencies (Docker, Node.js, PM2)
- Firewall configuration
- Custom Evolution API build
- Database setup
- Application build and start

---

## 📋 Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 20GB minimum
- **Access**: Root or sudo access

### What You Need
1. A VPS server (Hetzner, DigitalOcean, AWS, etc.)
2. Server IP address
3. (Optional) Domain name pointed to server IP

---

## 🔧 Manual Deployment

If you prefer step-by-step manual deployment:

### Step 1: Install Dependencies

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2
pm2 startup systemd
```

### Step 2: Clone Repository

```bash
cd /root
git clone https://github.com/safiulalam99/wassup.git
cd wassup
```

### Step 3: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your server details
nano .env
```

**Update these variables:**
```env
# Use your server IP (not localhost!)
BETTER_AUTH_URL=http://YOUR_SERVER_IP:3000
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000

# Generate a random 32+ character secret
BETTER_AUTH_SECRET=your_random_secret_here

# Database password (matches docker-compose.yml)
DATABASE_URL=postgresql://wazzup:change_me_strong_password@localhost:5432/wazzup?schema=public

# Redis password (matches docker-compose.yml)
REDIS_PASSWORD=change_me_redis_password

# Evolution API key (matches docker-compose.yml)
EVOLUTION_API_KEY=change_me_evolution_key
```

### Step 4: Build Custom Evolution API

This is required to fix QR code issues:

```bash
# The script handles swap creation if needed
./build-evolution-with-swap.sh
```

### Step 5: Start Docker Services

```bash
docker compose up -d
sleep 30  # Wait for services to start
```

### Step 6: Setup Database

```bash
npm install
npm run db:generate
npm run db:push
```

### Step 7: Build Application

```bash
npm run build

# Copy .env to standalone directory
cp .env .next/standalone/.env
```

### Step 8: Start with PM2

```bash
pm2 start .next/standalone/server.js --name "wazzup"
pm2 save
```

### Step 9: Open Firewall

```bash
ufw allow 22/tcp   # SSH
ufw allow 3000/tcp # Application
ufw enable
```

---

## 🔄 Updates & Maintenance

### Updating the Application

```bash
cd /root/wassup

# Pull latest changes
git pull

# Rebuild and restart
npm install
npm run build
cp .env .next/standalone/.env
pm2 restart wazzup
```

### Viewing Logs

```bash
# Next.js application logs
pm2 logs wazzup

# Docker service logs
docker compose logs -f

# Evolution API logs
docker logs wassup-evolution-api-1 -f
```

### Restarting Services

```bash
# Restart Next.js app
pm2 restart wazzup

# Restart Docker services
docker compose restart

# Restart specific service
docker compose restart evolution-api
```

### Database Management

```bash
# Access PostgreSQL
docker exec -it wassup-postgres-1 psql -U wazzup -d wazzup

# View tables
docker exec -it wassup-postgres-1 psql -U wazzup -d wazzup -c "\dt"

# Count contacts
docker exec -it wassup-postgres-1 psql -U wazzup -d wazzup -c "SELECT COUNT(*) FROM \"Contact\";"
```

---

## 🐛 Troubleshooting

### App Not Loading

```bash
# Check PM2 status
pm2 status

# Check if port 3000 is listening
netstat -tulpn | grep 3000

# Restart application
pm2 restart wazzup
```

### Cannot Create Account

```bash
# Check database is running
docker ps | grep postgres

# Run migrations
npm run db:push

# Restart app
pm2 restart wazzup
```

### QR Code Not Appearing

```bash
# Check Evolution API logs
docker logs wassup-evolution-api-1 --tail 50

# Verify custom image is being used
docker ps --format '{{.Names}}\t{{.Image}}' | grep evolution

# Should show: wassup-evolution-api-1    evolution-api-v2-fixed:latest
```

### Contacts Not Syncing

```bash
# Check webhook URL in docker-compose.yml
grep WEBHOOK_GLOBAL_URL docker-compose.yml

# Should be: http://host.docker.internal:3000/api/webhooks/evolution

# If wrong, fix and restart:
docker compose down
docker compose up -d
```

### Redis Connection Errors

```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
docker exec -it wassup-redis-1 redis-cli -a change_me_redis_password ping

# Rebuild app (Redis password is baked into build)
rm -rf .next
npm run build
cp .env .next/standalone/.env
pm2 restart wazzup
```

---

## 🔒 Security Hardening

### Change Default Passwords

Edit `docker-compose.yml` and `.env` to change:
- PostgreSQL password
- Redis password
- Evolution API key

Then rebuild:
```bash
docker compose down
docker compose up -d
npm run build
cp .env .next/standalone/.env
pm2 restart wazzup
```

### Enable HTTPS (with Nginx)

```bash
# Install Nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
nano /etc/nginx/sites-available/wazzup
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and get SSL:
```bash
ln -s /etc/nginx/sites-available/wazzup /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
certbot --nginx -d your-domain.com
```

Update `.env`:
```env
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Rebuild and restart:
```bash
npm run build
cp .env .next/standalone/.env
pm2 restart wazzup
```

---

## 📦 What Each Script Does

### `deploy-production.sh`
**Purpose**: Complete automated deployment
**When to use**: Fresh server setup
**What it does**: Installs everything, builds app, starts services

### `build-evolution-image.sh`
**Purpose**: Builds custom Evolution API with QR fixes
**When to use**: Included in main deployment, or when Evolution API needs rebuilding
**What it does**: Clones Evolution API, applies maxRetries fix, builds Docker image

### `build-evolution-with-swap.sh`
**Purpose**: Same as above but creates temporary swap space
**When to use**: Servers with less than 6GB RAM
**What it does**: Creates 4GB swap, builds image, removes swap

### ~~Other Scripts~~ (Can be deleted)
- `fix-redis-and-restart.sh` - No longer needed (integrated into main deployment)
- `fix-redis-password.sh` - No longer needed
- `fix-pm2-env.sh` - No longer needed
- `deploy-to-hetzner.sh` - Replaced by `deploy-production.sh`

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  User Browser (http://SERVER_IP:3000)         │
│                                                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│                                                 │
│  Next.js App (Port 3000)                       │
│  - Authentication (Better Auth)                 │
│  - Dashboard UI                                 │
│  - Campaign Management                          │
│  - API Routes                                   │
│                                                 │
└─┬───────────┬───────────┬───────────┬───────────┘
  │           │           │           │
  │           │           │           │
  ▼           ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────────┐
│         │ │         │ │         │ │                  │
│ Postgres│ │  Redis  │ │ MongoDB │ │  Evolution API   │
│ (5432)  │ │ (6379)  │ │ (27017) │ │  (8080)          │
│         │ │         │ │         │ │                  │
│ - Users │ │ - BullMQ│ │ - Evo   │ │  - WhatsApp API  │
│ - Contacts│ │ - Queue│ │ - Data  │ │  - QR Codes      │
│ - Campaigns│ │       │ │         │ │  - Webhooks      │
│         │ │         │ │         │ │                  │
└─────────┘ └─────────┘ └─────────┘ └──────────────────┘
```

### Data Flow:
1. User scans QR code → Evolution API connects WhatsApp
2. Evolution API sends webhooks → Next.js saves contacts
3. User creates campaign → BullMQ queues messages
4. Campaign worker → Sends via Evolution API → WhatsApp

---

## ✅ Post-Deployment Checklist

- [ ] Application accessible at `http://YOUR_IP:3000`
- [ ] Can register new account
- [ ] Can login successfully
- [ ] Can connect WhatsApp and see QR code
- [ ] QR code scans successfully
- [ ] Contacts sync automatically
- [ ] Can create and send test campaign
- [ ] PM2 shows app as `online`
- [ ] All Docker containers are `healthy`

---

## 📞 Support

If you encounter issues:

1. Check logs: `pm2 logs wazzup`
2. Check Docker: `docker compose ps`
3. Review troubleshooting section above
4. Check GitHub issues: https://github.com/safiulalam99/wassup/issues

---

**Generated by Claude Code** 🤖
