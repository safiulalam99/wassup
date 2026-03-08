# Deployment Guide for Wazzup

## 🆕 New Server? Start Here First!

**If you have a brand new VPS that hasn't been configured yet**, follow [SERVER-SETUP.md](SERVER-SETUP.md) first. It covers:
- Initial server hardening (SSH keys, firewall, non-root user)
- Docker installation
- Domain DNS configuration
- SSL certificate setup
- Security best practices

**Already have a configured server with Docker?** Continue with the sections below.

---

## Prerequisites
- Configured VPS with Docker & Docker Compose installed
- Non-root user with sudo and docker group access
- (Optional) Domain name with DNS pointed to server
- SSH access to the server

## VPS Deployment (Recommended)

### Step 1: Clone & Configure

```bash
# SSH into your server
ssh wazzup@your-server-ip  # Use your configured user

# Clone your repository (or pull latest if already cloned)
git clone <your-repo-url> wazzup && cd wazzup
# OR: cd wazzup && git pull

# Create production environment file
cp .env.production.example .env.production

# Edit environment variables
nano .env.production
# Set all CHANGE_ME_* values with strong passwords/secrets
# Use: openssl rand -base64 32 to generate secure passwords

# Update nginx.conf with your domain
nano nginx.conf
# Replace 'your-domain.com' with your actual domain
```

### Step 2: Deploy

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to be healthy
docker compose -f docker-compose.prod.yml ps

# Run database migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Check logs
docker compose -f docker-compose.prod.yml logs -f app
```

### Step 3: SSL Setup (Let's Encrypt)

```bash
# Install certbot
apt install certbot

# Get SSL certificate
certbot certonly --webroot -w ./certbot/www -d your-domain.com

# Update nginx.conf with your domain
nano nginx.conf
# Uncomment HTTPS server block
# Update server_name with your domain

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Step 4: Verify & Access

Visit `https://your-domain.com` and create your account!

### Step 5: Maintenance Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f app

# Restart app
docker compose -f docker-compose.prod.yml restart app

# Update app (zero-downtime)
git pull
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app

# Database backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U wazzup wazzup > backup.sql

# Database restore
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U wazzup wazzup
```

## Alternative: Managed Platforms

### Option A: Railway.app
1. Connect GitHub repo
2. Add PostgreSQL and Redis from marketplace
3. Add environment variables
4. Deploy (automatic)

**Note:** Evolution API needs custom Docker image, might need separate deployment

### Option B: Render.com
1. Create Web Service from repo
2. Add PostgreSQL and Redis
3. Set environment variables
4. Deploy

### Option C: DigitalOcean App Platform
1. Create app from GitHub
2. Add managed PostgreSQL and Redis
3. Configure environment
4. Deploy

## Production Checklist

- [ ] Strong passwords for database and Redis
- [ ] SSL certificate configured
- [ ] Domain DNS configured
- [ ] Firewall configured (UFW or cloud firewall)
- [ ] Automatic backups enabled
- [ ] Monitoring setup (optional: Sentry, LogDNA)
- [ ] Environment variables secured
- [ ] Regular updates scheduled
- [ ] Rate limiting configured (Cloudflare or nginx)

## Monitoring

### View Active Campaigns
```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} keys "bull:campaigns:*"
```

### Check Worker Health
```bash
docker compose -f docker-compose.prod.yml logs -f app | grep Worker
```

### Database Connections
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U wazzup -c "SELECT count(*) FROM pg_stat_activity;"
```

## Troubleshooting

### Logs not showing?
```bash
docker compose -f docker-compose.prod.yml logs --tail=100 -f
```

### Database connection failed?
- Check DATABASE_URL format
- Verify postgres container is healthy
- Check network connectivity

### Redis connection failed?
- Verify REDIS_PASSWORD matches in all services
- Check redis container logs

### Evolution API not connecting?
- Verify EVOLUTION_API_KEY matches
- Check webhook URL (must be accessible from evolution container)
- Review evolution-api logs

## Security Notes

1. **Never expose PostgreSQL/Redis ports** (5432, 6379) publicly
2. **Use strong passwords** for all services
3. **Enable firewall** (UFW):
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```
4. **Regular updates**: `apt update && apt upgrade -y`
5. **Backup regularly**: Automate with cron jobs

## Scaling

For high traffic:
- Increase app replicas in docker-compose
- Use managed PostgreSQL (DigitalOcean, AWS RDS)
- Use managed Redis (Redis Cloud, AWS ElastiCache)
- Add load balancer (nginx, HAProxy, Cloudflare)
- Separate worker nodes for BullMQ processing
