# 🚀 Deployment Checklist for control.wizzbill.com

Server IP: **89.167.7.229**

---

## Step-by-Step Deployment

### ✅ 1. Configure DNS in Hostinger

- [ ] Log in to Hostinger hPanel
- [ ] Go to Domains → wizzbill.com → DNS/Name Servers
- [ ] Add A record:
  - Type: `A`
  - Name: `control`
  - Points to: `89.167.7.229`
  - TTL: `14400`
- [ ] Wait 15 minutes for DNS propagation
- [ ] Verify: `ping control.wizzbill.com` returns 89.167.7.229

### ✅ 2. Initial Server Setup

SSH into your server:
```bash
ssh root@89.167.7.229
```

Follow [SERVER-SETUP.md](SERVER-SETUP.md) steps 1-9:
- [ ] Update system packages
- [ ] Create non-root user (wazzup)
- [ ] Setup SSH keys
- [ ] Configure firewall (UFW)
- [ ] Install Docker + Docker Compose
- [ ] Setup swap space (if needed)
- [ ] Install Git
- [ ] Switch to wazzup user

### ✅ 3. Deploy Application

```bash
# Switch to wazzup user (if not already)
su - wazzup

# Clone repository
git clone <your-github-repo-url> wazzup
cd wazzup

# The .env.production file is already created!
# Just copy it to the server
```

**Upload .env.production to server:**

From your local machine:
```bash
# Copy .env.production to server
scp .env.production wazzup@89.167.7.229:~/wazzup/

# Or if you prefer, recreate it on server:
# ssh wazzup@89.167.7.229
# cd wazzup
# nano .env.production
# (paste the contents)
```

**Deploy:**
```bash
# On the server
cd ~/wazzup
chmod +x deploy.sh
./deploy.sh
```

- [ ] All services started successfully
- [ ] No errors in logs

### ✅ 4. Setup SSL Certificate

```bash
# Install Certbot
sudo apt install certbot -y

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d control.wizzbill.com

# Start nginx
docker compose -f docker-compose.prod.yml start nginx
```

**Enable HTTPS:**
```bash
# Edit nginx.conf
nano nginx.conf

# Uncomment these sections:
# 1. Line with: return 301 https://$server_name$request_uri;
# 2. The entire HTTPS server block (starts with "server {")

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

- [ ] SSL certificate obtained
- [ ] HTTPS enabled in nginx.conf
- [ ] HTTP redirects to HTTPS

### ✅ 5. Verify Deployment

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f app
```

**Test in browser:**
- [ ] Visit https://control.wizzbill.com
- [ ] No SSL warnings
- [ ] Can create account
- [ ] Can login

### ✅ 6. Security Check

- [ ] Firewall enabled (ports 22, 80, 443 only)
- [ ] SSH key authentication working
- [ ] Password authentication disabled
- [ ] Root login disabled
- [ ] Strong passwords in .env.production
- [ ] .env.production not committed to Git

### ✅ 7. Setup Backups (Optional but Recommended)

Follow [SERVER-SETUP.md](SERVER-SETUP.md) Step 15:
- [ ] Create backup script
- [ ] Test manual backup
- [ ] Setup cron job for daily backups

---

## Quick Commands Reference

### View Service Status
```bash
docker compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# App only
docker compose -f docker-compose.prod.yml logs -f app
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart app only
docker compose -f docker-compose.prod.yml restart app
```

### Stop Everything
```bash
docker compose -f docker-compose.prod.yml down
```

### Start Everything
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Can't SSH to server
```bash
# Test connection
ssh -v root@89.167.7.229

# If using key
ssh -i ~/.ssh/id_ed25519 root@89.167.7.229
```

### DNS not working
```bash
# Check DNS
nslookup control.wizzbill.com
dig control.wizzbill.com

# Should show 89.167.7.229
```

### Services won't start
```bash
# Check Docker status
sudo systemctl status docker

# Check logs for errors
docker compose -f docker-compose.prod.yml logs
```

---

## After Deployment

1. Visit: **https://control.wizzbill.com**
2. Create your admin account
3. Go to Connect page
4. Scan WhatsApp QR code
5. Import contacts
6. Create your first campaign!

---

## Need Help?

- New server setup: [SERVER-SETUP.md](SERVER-SETUP.md)
- Hostinger DNS: [HOSTINGER-SETUP.md](HOSTINGER-SETUP.md)
- General deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
