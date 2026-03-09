# 🚀 Quick Deployment Guide

## One-Command Deployment

On a fresh Ubuntu/Debian server with 4GB+ RAM:

```bash
curl -fsSL https://raw.githubusercontent.com/safiulalam99/wassup/main/deploy-production.sh | sudo bash
```

Or clone first:

```bash
git clone https://github.com/safiulalam99/wassup.git
cd wassup
chmod +x deploy-production.sh
sudo ./deploy-production.sh
```

## What Gets Installed

✅ Docker & Docker Compose
✅ Node.js 20 & PM2
✅ PostgreSQL, Redis, MongoDB
✅ Custom Evolution API (with QR fixes)
✅ Next.js application
✅ Firewall configuration

## After Deployment

Your app will be running at: **http://YOUR_SERVER_IP:3000**

1. Open in browser
2. Register account
3. Connect WhatsApp
4. Start sending campaigns!

## Management Commands

```bash
# View logs
pm2 logs wazzup

# Restart app
pm2 restart wazzup

# Update app
cd /root/wassup
git pull
npm install
npm run build
cp .env .next/standalone/.env
pm2 restart wazzup

# Docker services
docker compose ps         # Status
docker compose logs -f    # Logs
docker compose restart    # Restart all
```

## Need Help?

See full documentation: [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)

---

**Server Requirements:**
- Ubuntu 20.04+ or Debian 11+
- 4GB RAM minimum
- 20GB storage
- Root access
