# 🚀 Wazzup - WhatsApp Bulk Messaging SaaS

A powerful WhatsApp automation platform for bulk messaging campaigns with intelligent throttling, contact management, and real-time campaign tracking.

## ✨ Features

- 📱 **WhatsApp Web Integration** - Connect via QR code using Evolution API
- 👥 **Contact Management** - CSV import, auto-sync from WhatsApp, tagging, opt-out management
- 📨 **Bulk Campaigns** - Send text + media (images, PDFs, videos) to multiple contacts
- ⚡ **Smart Throttling** - Customizable delays and daily send limits to avoid bans
- 📊 **Real-time Tracking** - Live campaign progress with detailed message logs
- 🎨 **Modern UI** - Dark theme with electric green accents
- 🔐 **Authentication** - Role-based access control (ADMIN/CLIENT)

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.6 (App Router, TypeScript)
- **Authentication**: Better Auth 1.5.4
- **Database**: PostgreSQL 16 + Prisma ORM 7.4.2
- **Queue**: BullMQ 5.70.4 + Redis 7
- **WhatsApp API**: Evolution API v2
- **Styling**: Tailwind CSS 4
- **Deployment**: Docker + Docker Compose

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm/yarn/pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Services
```bash
# Start PostgreSQL, Redis, MongoDB, Evolution API
npm run docker:up

# Run database migrations
npm run db:migrate:deploy

# Start development server
npm run dev
```

Visit `http://localhost:3001` and create your account!

## 📦 Production Deployment

### 🆕 New Server Setup

**If you have a brand new VPS**, start with [SERVER-SETUP.md](SERVER-SETUP.md) which covers:
- Initial server hardening (SSH keys, firewall, non-root user)
- Docker installation
- Domain DNS configuration  
- SSL certificate setup
- Security best practices

### Quick Deploy (Configured Server)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

```bash
# 1. Clone repository
git clone <your-repo-url> wazzup && cd wazzup

# 2. Create production environment file
cp .env.production.example .env.production
# Edit .env.production with your values

# 3. Deploy with one command
./deploy.sh
```

### Deployment Options
- **VPS** (Hetzner, DigitalOcean, AWS EC2) - Full control, cost-effective
- **Railway.app** - Easiest, auto-scaling
- **Render.com** - Managed PostgreSQL + Redis
- **DigitalOcean App Platform** - Fully managed

## 📖 Documentation

- [HOSTINGER-SETUP.md](HOSTINGER-SETUP.md) - **Hostinger domain & subdomain setup guide**
- [SERVER-SETUP.md](SERVER-SETUP.md) - New VPS initial configuration guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment instructions
- [CLAUDE.md](CLAUDE.md) - Complete project architecture and API reference
- [HANDOFF.md](HANDOFF.md) - Development handoff notes

## 🗄️ Database Commands

```bash
npm run db:migrate       # Create new migration
npm run db:push          # Push schema without migration
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database
npm run setup            # Fresh database setup
npm run reset            # Complete reset (⚠️ destroys data)
```

## 🐳 Docker Commands

```bash
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:logs      # View logs
npm run docker:restart   # Restart services
npm run docker:clean     # Remove volumes (⚠️ destroys data)
```

## 🔑 Key Features Explained

### Campaign Throttling
- **Min/Max Delay**: Random delays between messages (5-15 seconds default)
- **Daily Limits**: Maximum messages per day to avoid WhatsApp bans
- **Smart Queuing**: BullMQ handles message scheduling automatically

### Contact Management
- Import from CSV with auto-validation
- Auto-sync from WhatsApp contacts
- Tags for segmentation
- Opt-out management

### Media Attachments
- Images (JPG, PNG, GIF)
- Documents (PDF)
- Videos (MP4)
- 16MB max file size
- Preview before sending

## 🏗️ Project Structure

```
pers-whatsapp/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login/Register pages
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities
│   ├── auth.ts           # Better Auth config
│   ├── evolution.ts      # Evolution API client
│   └── workers/          # BullMQ workers
├── prisma/               # Database schema
├── docker-compose.yml    # Dev services
├── docker-compose.prod.yml # Production services
└── Dockerfile            # Production build
```

## 🔒 Environment Variables

Required variables (see [.env.production.example](.env.production.example)):

```env
# Database
DATABASE_URL=postgresql://...
POSTGRES_PASSWORD=...

# Redis
REDIS_PASSWORD=...

# Evolution API
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=...

# Better Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://your-domain.com
```

## 🤝 Contributing

This is a personal project, but suggestions are welcome! Open an issue or PR.

## 📝 License

MIT License - feel free to use for your own projects

## ⚠️ Disclaimer

Use responsibly and comply with WhatsApp's Terms of Service. Excessive bulk messaging may result in account bans. This tool is for legitimate business use only.

## 🆘 Support

- New server? Check [SERVER-SETUP.md](SERVER-SETUP.md)
- Deployment issues? Review [DEPLOYMENT.md](DEPLOYMENT.md)
- Architecture questions? See [CLAUDE.md](CLAUDE.md)
- Open an issue for bugs or feature requests
