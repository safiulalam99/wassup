# Setting Up control.wizzbill.com on Hostinger

Complete guide to deploy Wazzup on your Hostinger domain.

---

## Part 1: DNS Configuration in Hostinger

### Step 1: Access Hostinger DNS Management

1. Log in to **Hostinger Control Panel** (hpanel.hostinger.com)
2. Navigate to **Domains** section
3. Click on **wizzbill.com**
4. Click on **DNS / Name Servers**

### Step 2: Add DNS Records

Add the following DNS records:

| Type | Name | Points to | TTL |
|------|------|-----------|-----|
| A | control | YOUR_VPS_IP | 14400 |

**Example:**
- Type: `A`
- Name: `control` (this creates control.wizzbill.com)
- Points to: `123.45.67.89` (replace with your actual VPS IP)
- TTL: `14400` (or Auto)

### Step 3: Verify DNS Propagation

After adding the record, wait 5-15 minutes, then verify:

```bash
# From your local machine
ping control.wizzbill.com
nslookup control.wizzbill.com

# Should return your VPS IP address
```

---

## Part 2: VPS Server Setup

### Prerequisites
- Fresh VPS (Hetzner, DigitalOcean, etc.)
- Root SSH access
- Domain DNS configured (from Part 1)

### Follow the Complete Server Setup

Refer to [SERVER-SETUP.md](SERVER-SETUP.md) for detailed steps:

1. **Security Setup** - SSH keys, firewall, non-root user
2. **Install Docker** - Docker + Docker Compose
3. **Clone Repository** - Get your code on the server
4. **Environment Configuration** - Set up `.env.production`
5. **SSL Certificate** - Let's Encrypt for HTTPS
6. **Deploy Application** - Run `./deploy.sh`

---

## Part 3: Quick Deploy Commands

Once your server is configured (follow SERVER-SETUP.md):

```bash
# SSH into your VPS
ssh wazzup@YOUR_VPS_IP

# Clone repository
git clone <your-repo-url> wazzup
cd wazzup

# Create production environment file
cp .env.production.example .env.production

# Edit environment variables
nano .env.production
```

### Important Environment Variables

Make sure to set these in `.env.production`:

```env
# Your specific domain
BETTER_AUTH_URL=https://control.wizzbill.com
NEXT_PUBLIC_APP_URL=https://control.wizzbill.com

# Generate strong passwords
POSTGRES_PASSWORD=<run: openssl rand -base64 32>
REDIS_PASSWORD=<run: openssl rand -base64 32>
EVOLUTION_API_KEY=<run: openssl rand -base64 32>
BETTER_AUTH_SECRET=<run: openssl rand -base64 48>

# Keep these as-is (internal Docker networking)
DATABASE_URL=postgresql://wazzup:POSTGRES_PASSWORD@postgres:5432/wazzup?schema=public
REDIS_HOST=redis
EVOLUTION_API_URL=http://evolution-api:8080
```

### Deploy the Application

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

---

## Part 4: SSL Certificate Setup

### Option A: Certbot Standalone (Easier)

```bash
# Install Certbot
sudo apt install certbot -y

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get SSL certificate
sudo certbot certonly --standalone -d control.wizzbill.com

# Restart nginx
docker compose -f docker-compose.prod.yml start nginx
```

### Option B: Certbot Webroot

```bash
# Install Certbot
sudo apt install certbot -y

# Create webroot directory
docker compose -f docker-compose.prod.yml exec nginx mkdir -p /var/www/certbot

# Get certificate
sudo certbot certonly --webroot \
  -w /path/to/certbot/www \
  -d control.wizzbill.com \
  --email your-email@example.com \
  --agree-tos
```

### Enable HTTPS in Nginx

```bash
# Edit nginx.conf
nano nginx.conf

# Find the HTTPS server block (lines starting with #)
# Uncomment all lines in that block (remove # at start)
# The domain is already set to control.wizzbill.com

# Also uncomment the HTTP to HTTPS redirect line:
# return 301 https://$server_name$request_uri;

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Part 5: Verify Deployment

### Check Services Status

```bash
# View all running services
docker compose -f docker-compose.prod.yml ps

# All should show "running" or "healthy"
```

### Check Logs

```bash
# View app logs
docker compose -f docker-compose.prod.yml logs -f app

# Should see "Server listening on http://0.0.0.0:3000"
```

### Access Your Application

Open your browser and visit:
- **HTTP** (initial): `http://control.wizzbill.com`
- **HTTPS** (after SSL): `https://control.wizzbill.com`

---

## Troubleshooting

### DNS Not Resolving

**Problem:** `ping control.wizzbill.com` doesn't work

**Solution:**
1. Check DNS record in Hostinger is correct (Type: A, Name: control)
2. Wait 10-30 minutes for DNS propagation
3. Clear your local DNS cache:
   ```bash
   # Mac
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```
4. Test with online tool: https://dnschecker.org

### SSL Certificate Failed

**Problem:** Certbot fails to issue certificate

**Solutions:**
1. **Firewall:** Ensure ports 80 and 443 are open
   ```bash
   sudo ufw status
   # Should show 80/tcp and 443/tcp ALLOW
   ```

2. **DNS not propagated:** Wait until DNS fully propagates
   ```bash
   nslookup control.wizzbill.com
   # Should return your VPS IP
   ```

3. **Port already in use:** Stop nginx first
   ```bash
   docker compose -f docker-compose.prod.yml stop nginx
   sudo certbot certonly --standalone -d control.wizzbill.com
   docker compose -f docker-compose.prod.yml start nginx
   ```

### Cannot Access Website

**Problem:** Browser shows "Connection refused" or "Site can't be reached"

**Checklist:**
1. ✅ DNS resolves to correct IP: `ping control.wizzbill.com`
2. ✅ Services are running: `docker compose -f docker-compose.prod.yml ps`
3. ✅ Firewall allows ports: `sudo ufw status`
4. ✅ Nginx is running: `docker compose logs nginx`
5. ✅ App is running: `docker compose logs app`

### 502 Bad Gateway

**Problem:** Nginx shows 502 error

**Solution:**
```bash
# Check if app container is running
docker compose -f docker-compose.prod.yml ps app

# Check app logs for errors
docker compose -f docker-compose.prod.yml logs app

# Restart app
docker compose -f docker-compose.prod.yml restart app
```

---

## Security Checklist

After deployment, ensure:

- [x] DNS pointed to correct server IP
- [x] SSL certificate installed and working
- [x] HTTP redirects to HTTPS
- [x] Firewall configured (ports 22, 80, 443 only)
- [x] Strong passwords in .env.production
- [x] SSH key authentication enabled
- [x] Password authentication disabled
- [x] Root login disabled
- [x] Regular backups configured

---

## Next Steps

1. **Create Account:** Visit `https://control.wizzbill.com` and register
2. **Connect WhatsApp:** Scan QR code on Connect page
3. **Import Contacts:** Upload CSV or sync from WhatsApp
4. **Create Campaign:** Start your first bulk message campaign!

---

## Maintenance

### Update Application

```bash
cd ~/wazzup
git pull
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f app
```

### Backup Database

```bash
# Manual backup
docker exec wazzup-postgres-1 pg_dump -U wazzup wazzup | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated backups (see SERVER-SETUP.md Step 15)
```

---

## Support

- New server setup: [SERVER-SETUP.md](SERVER-SETUP.md)
- General deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
- Architecture details: [CLAUDE.md](CLAUDE.md)

---

## Summary: Quick Steps

1. **Hostinger DNS**: Add A record `control` → Your VPS IP
2. **Wait**: 5-15 minutes for DNS propagation
3. **VPS Setup**: Follow [SERVER-SETUP.md](SERVER-SETUP.md)
4. **Deploy**: Run `./deploy.sh`
5. **SSL**: Install Let's Encrypt certificate
6. **Access**: Visit `https://control.wizzbill.com`

Done! 🚀
