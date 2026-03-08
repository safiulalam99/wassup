# Evolution API Custom Image - Deployment Guide

## Why We Need a Custom Image

The official Evolution API v2 stable release has a **QR code restart loop bug**. We built a custom image from the `develop` branch which includes fixes for this issue.

## Previous Fix Applied

In the previous session, a TypeScript compilation error was fixed:
- **Issue**: `maxRetries` reference error during compilation
- **Solution**: Fixed the TypeScript error in the Evolution API source code
- **Branch Used**: `develop` branch from https://github.com/EvolutionAPI/evolution-api

**Note**: The exact file/line of the fix was not documented. The develop branch may have already included this fix.

## Deploying to Hetzner Server

### Option 1: Build on Hetzner Server (RECOMMENDED)

This is the simplest approach - build the image directly on your Hetzner server:

```bash
# 1. SSH into your Hetzner server
ssh root@your-hetzner-ip

# 2. Install Docker and Docker Compose if not already installed
# (Skip if already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt-get install -y docker-compose-plugin

# 3. Navigate to a temporary directory
cd /tmp

# 4. Clone Evolution API repository
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# 5. Checkout develop branch (has QR code fixes)
git checkout develop

# 6. Build the custom Docker image
# This will take 5-10 minutes
docker build -t evolution-api-v2-fixed:latest .

# 7. Verify the image was built
docker images | grep evolution-api-v2-fixed

# 8. Clean up the source code
cd /tmp
rm -rf evolution-api

# 9. Now you can deploy your application
cd /path/to/wazzup
docker compose up -d
```

### Option 2: Push to Docker Hub (For Multiple Servers)

If you plan to deploy to multiple servers or want version control:

```bash
# On your LOCAL machine:

# 1. Create a Docker Hub account at https://hub.docker.com
# 2. Login to Docker Hub
docker login

# 3. Tag your local image for Docker Hub
docker tag evolution-api-v2-fixed:latest YOUR_DOCKERHUB_USERNAME/evolution-api-v2-fixed:latest

# 4. Push to Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/evolution-api-v2-fixed:latest

# 5. Update docker-compose.yml
# Change the image line to:
#   image: YOUR_DOCKERHUB_USERNAME/evolution-api-v2-fixed:latest

# On HETZNER server:

# 1. SSH into server
ssh root@your-hetzner-ip

# 2. Deploy your app
cd /path/to/wazzup
docker compose pull  # This will pull from Docker Hub
docker compose up -d
```

### Option 3: Export/Import Image (Single Server Transfer)

Transfer the built image from your local machine to Hetzner:

```bash
# On your LOCAL machine:

# 1. Save the Docker image to a compressed file
docker save evolution-api-v2-fixed:latest | gzip > evolution-api-v2-fixed.tar.gz

# 2. Copy to Hetzner server (replace with your server IP)
scp evolution-api-v2-fixed.tar.gz root@your-hetzner-ip:/tmp/

# On HETZNER server:

# 1. SSH into server
ssh root@your-hetzner-ip

# 2. Load the Docker image
cd /tmp
docker load < evolution-api-v2-fixed.tar.gz

# 3. Verify the image
docker images | grep evolution-api-v2-fixed

# 4. Clean up the tar file
rm /tmp/evolution-api-v2-fixed.tar.gz

# 5. Deploy your app
cd /path/to/wazzup
docker compose up -d
```

## Recommended Approach

**Use Option 1** (build on server) because:
- ✅ Simple and straightforward
- ✅ No Docker Hub account needed
- ✅ No large file transfers
- ✅ Reproducible - can rebuild anytime
- ✅ Always gets the latest develop branch fixes

## Verifying the Custom Image

After building/loading the image on Hetzner, verify it exists:

```bash
# Check that the image exists with the correct tag
docker images | grep evolution-api-v2-fixed

# Expected output:
# evolution-api-v2-fixed   latest   abc123def456   X minutes ago   XXX MB
```

## Docker Compose Configuration

Your `docker-compose.yml` should have:

```yaml
evolution-api:
  image: evolution-api-v2-fixed:latest  # <-- Uses local custom image
  environment:
    # ... your environment variables
```

When you run `docker compose up -d`, Docker will:
1. Look for `evolution-api-v2-fixed:latest` locally first
2. Only try to pull from Docker Hub if not found locally
3. Since we built it locally with that exact tag, it will use our custom image

## Important Notes

### Image Tag Consistency
Make sure the image name in `docker-compose.yml` **exactly matches** the built image tag:
- `evolution-api-v2-fixed:latest` (not `evolution-api:latest` or `evolution-api-v2:latest`)

### Rebuilding After Updates
If Evolution API releases new fixes, rebuild the image:

```bash
cd /tmp
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
git checkout develop
git pull  # Get latest changes
docker build -t evolution-api-v2-fixed:latest .
cd /tmp && rm -rf evolution-api

# Restart your app to use the new image
cd /path/to/wazzup
docker compose down
docker compose up -d
```

### Disk Space
The Evolution API image is fairly large (~500MB-1GB). Make sure your Hetzner server has enough disk space:

```bash
# Check available disk space
df -h

# Clean up old Docker images if needed
docker system prune -a
```

## Troubleshooting

### "Image not found" error
If you get "image not found" when running `docker compose up`:
- The image tag in `docker-compose.yml` doesn't match the built image
- Run `docker images` to see what images exist
- Make sure the tag exactly matches: `evolution-api-v2-fixed:latest`

### Build fails on server
If the build fails due to memory constraints:
- Hetzner servers usually have enough RAM (2GB minimum)
- If using a very small instance, consider Option 3 (build locally and transfer)

### QR code loop still happening
If you still see QR code restart loops after deploying:
- Verify you're using the custom image: `docker compose ps` and check the IMAGE column
- Check Evolution API logs: `docker logs pers-whatsapp-evolution-api-1`
- The develop branch should have the fix, but if not, we may need to apply manual patches

## Next Steps After Deployment

1. Build/transfer the custom Evolution API image using one of the options above
2. Upload your Wazzup application code to Hetzner
3. Configure environment variables (see DEPLOYMENT.md)
4. Run `docker compose up -d`
5. Test the QR code connection flow
6. Verify contacts sync via webhooks
