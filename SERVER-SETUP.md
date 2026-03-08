# 🖥️ New VPS Server Setup Guide

Complete guide for setting up a fresh VPS (Ubuntu 22.04+) before deploying Wazzup.

## Prerequisites
- Fresh VPS (Hetzner, DigitalOcean, AWS EC2, etc.)
- Root SSH access
- Domain name (optional but recommended)

---

## Step 1: Initial Server Access

```bash
# SSH into your server as root
ssh root@your-server-ip

# Update system packages
apt update && apt upgrade -y

# Set timezone (optional)
timedatectl set-timezone America/New_York  # Change to your timezone
```

---

## Step 2: Create Non-Root User

```bash
# Create new user (replace 'wazzup' with your preferred username)
adduser wazzup

# Add to sudo group
usermod -aG sudo wazzup

# Add to docker group (we'll install Docker next)
usermod -aG docker wazzup
```

---

## Step 3: Setup SSH Key Authentication (Recommended)

### On Your Local Machine:

```bash
# If you don't have SSH keys, generate them
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy your public key to server
ssh-copy-id wazzup@your-server-ip
```

### On the Server (as root):

```bash
# Test SSH login with new user (open a new terminal)
# ssh wazzup@your-server-ip

# Once confirmed working, disable password authentication
nano /etc/ssh/sshd_config

# Find and change these lines:
# PasswordAuthentication no
# PermitRootLogin no
# PubkeyAuthentication yes

# Restart SSH service
systemctl restart sshd
```

⚠️ **IMPORTANT**: Test SSH with new user in another terminal BEFORE disabling password auth!

---

## Step 4: Setup Firewall

```bash
# Install UFW (Uncomplicated Firewall)
apt install ufw -y

# Allow SSH (critical - do this first!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## Step 5: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Start Docker service
systemctl enable docker
systemctl start docker
```

---

## Step 6: Setup Swap Space (Optional but Recommended)

If your VPS has less than 4GB RAM:

```bash
# Create 2GB swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make it permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verify
free -h
```

---

## Step 7: Configure Domain DNS

Before deploying, point your domain to the server:

### At Your Domain Registrar (Namecheap, GoDaddy, Cloudflare, etc.):

Add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | your-server-ip | 300 |
| A | www | your-server-ip | 300 |

Wait 5-10 minutes for DNS propagation, then verify:

```bash
# From your local machine
ping your-domain.com
nslookup your-domain.com
```

---

## Step 8: Install Git

```bash
apt install git -y
git --version
```

---

## Step 9: Clone Your Repository

```bash
# Switch to your user account
su - wazzup

# Clone repository
cd ~
git clone https://github.com/your-username/wazzup.git
cd wazzup

# Or if private repo, use SSH:
# ssh-keygen -t ed25519 -C "your-email@example.com"
# cat ~/.ssh/id_ed25519.pub
# Add to GitHub: Settings → SSH and GPG keys
# git clone git@github.com:your-username/wazzup.git
```

---

## Step 10: Configure Environment Variables

```bash
# Create production environment file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

### Required Values:

```env
# Generate strong passwords (use this command):
# openssl rand -base64 32

POSTGRES_PASSWORD=<strong-password-here>
REDIS_PASSWORD=<strong-password-here>
EVOLUTION_API_KEY=<strong-key-here>

# Generate 32+ character secret:
BETTER_AUTH_SECRET=<openssl rand -base64 48>

# Your domain
BETTER_AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Keep these as-is (internal Docker networking)
DATABASE_URL=postgresql://wazzup:POSTGRES_PASSWORD_HERE@postgres:5432/wazzup?schema=public
REDIS_HOST=redis
EVOLUTION_API_URL=http://evolution-api:8080
```

---

## Step 11: Update Nginx Configuration

```bash
# Edit nginx.conf
nano nginx.conf

# Replace 'your-domain.com' with your actual domain
# Find and replace both occurrences
```

---

## Step 12: Initial Deployment

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run initial deployment
./deploy.sh
```

This will:
- Build Docker images
- Start all services (PostgreSQL, Redis, Evolution API, App, Nginx)
- Run database migrations
- Show service status

---

## Step 13: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot -y

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Restart nginx
docker compose -f docker-compose.prod.yml start nginx

# Or if you prefer webroot method:
docker compose -f docker-compose.prod.yml exec nginx mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /path/to/certbot/www -d your-domain.com
```

### Enable HTTPS in Nginx:

```bash
# Edit nginx.conf
nano nginx.conf

# Uncomment the HTTPS server block (lines with # in front)
# Update server_name with your domain

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Auto-Renewal:

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renews via systemd timer, verify:
systemctl status certbot.timer
```

---

## Step 14: Verify Deployment

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f app

# Test from browser
# https://your-domain.com
```

---

## Step 15: Setup Automatic Backups (Recommended)

### Database Backup Script:

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
nano ~/backup.sh
```

Add this content:

```bash
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="wazzup-postgres-1"

# Create backup
docker exec $CONTAINER_NAME pg_dump -U wazzup wazzup | gzip > "$BACKUP_DIR/wazzup_$DATE.sql.gz"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "wazzup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: wazzup_$DATE.sql.gz"
```

Make it executable and schedule:

```bash
chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/wazzup/backup.sh >> /home/wazzup/backup.log 2>&1
```

---

## Step 16: Monitoring & Maintenance

### View Logs:

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Monitor Resources:

```bash
# Docker stats
docker stats

# System resources
htop  # install with: sudo apt install htop
```

### Update Application:

```bash
cd ~/wazzup
git pull
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

---

## Security Checklist

- [x] Non-root user created
- [x] SSH key authentication enabled
- [x] Password authentication disabled
- [x] Root login disabled
- [x] Firewall configured (UFW)
- [x] Strong passwords for all services
- [x] SSL certificate installed
- [x] Domain DNS configured
- [ ] Fail2ban installed (optional)
- [ ] Automatic security updates (optional)
- [ ] Monitoring setup (optional)

### Optional: Install Fail2ban (Protection Against Brute Force)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Optional: Enable Automatic Security Updates

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Troubleshooting

### Can't connect via SSH after changing settings
- Connect via VPS console (Hetzner panel, DigitalOcean console)
- Revert changes in `/etc/ssh/sshd_config`
- Restart SSH: `systemctl restart sshd`

### Docker permission denied
- Add user to docker group: `sudo usermod -aG docker $USER`
- Log out and back in
- Or use: `newgrp docker`

### Services not starting
- Check logs: `docker compose logs -f`
- Check disk space: `df -h`
- Check memory: `free -h`

### Domain not resolving
- Wait 10-30 minutes for DNS propagation
- Check DNS: `nslookup your-domain.com`
- Verify A record points to correct IP

### SSL certificate failed
- Ensure ports 80 and 443 are open in firewall
- Verify domain DNS is correct
- Check nginx is stopped during standalone mode
- Try webroot method instead

---

## Quick Reference Commands

```bash
# View running services
docker compose -f docker-compose.prod.yml ps

# Restart a service
docker compose -f docker-compose.prod.yml restart app

# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Database backup
docker exec wazzup-postgres-1 pg_dump -U wazzup wazzup | gzip > backup.sql.gz

# Database restore
gunzip < backup.sql.gz | docker exec -i wazzup-postgres-1 psql -U wazzup wazzup

# Check disk usage
df -h

# Check memory usage
free -h

# Check system load
uptime
```

---

## Next Steps

After setup is complete:

1. Visit your domain: `https://your-domain.com`
2. Create your admin account
3. Connect WhatsApp via QR code
4. Import contacts
5. Create your first campaign!

For ongoing deployment and updates, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Support

If you run into issues:
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment-specific issues
- Review [CLAUDE.md](CLAUDE.md) for architecture details
- Check service logs with `docker compose logs`
