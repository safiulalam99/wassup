# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Wazzup** is a WhatsApp automation SaaS platform that enables bulk messaging campaigns with intelligent throttling and contact management. Built with Next.js 16, TypeScript, Prisma, BullMQ, and Evolution API.

### Key Features
- WhatsApp Web integration via Evolution API with QR code authentication
- Contact management with CSV import and auto-sync from WhatsApp
- Bulk message campaigns with customizable throttling and daily limits
- Real-time campaign progress tracking
- Dark-themed UI with electric green accent (#00ff88)
- Role-based access control (ADMIN/CLIENT)

## Architecture

### Tech Stack
- **Framework**: Next.js 16.1.6 with App Router and TypeScript
- **Authentication**: Better Auth 1.5.4 with Prisma adapter
- **Database**: PostgreSQL 16 with Prisma ORM 7.4.2
- **Queue System**: BullMQ 5.70.4 + Redis 7
- **WhatsApp API**: Evolution API (atendai/evolution-api:latest)
- **Styling**: Tailwind CSS 4
- **Deployment**: Docker + Docker Compose (Hetzner VPS ready)

### Project Structure
```
pers-whatsapp/
├── app/
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (dashboard)/         # Dashboard pages with sidebar layout
│   │   ├── dashboard/       # Main dashboard + feature pages
│   │   │   ├── connect/     # WhatsApp QR connection
│   │   │   ├── contacts/    # Contact management
│   │   │   └── campaigns/   # Campaign management
│   │   └── layout.tsx       # Dashboard layout wrapper
│   └── api/
│       ├── auth/[...all]/   # Better Auth endpoints
│       ├── contacts/        # Contact CRUD + import
│       ├── campaigns/       # Campaign CRUD + start
│       ├── whatsapp/        # QR, status, sync-contacts
│       └── webhooks/        # Evolution API webhooks
├── components/
│   ├── ui/                  # Reusable UI components
│   └── dashboard-layout.tsx # Sidebar navigation layout
├── lib/
│   ├── auth.ts              # Better Auth config
│   ├── prisma.ts            # Prisma client with PG adapter
│   ├── evolution.ts         # Evolution API client wrapper
│   ├── queue.ts             # BullMQ queue instance
│   └── workers/
│       └── campaign.worker.ts # BullMQ worker for message sending
├── prisma/
│   └── schema.prisma        # Database schema
├── docker-compose.yml       # PostgreSQL + Redis + Evolution API
├── instrumentation.ts       # Auto-starts BullMQ worker
└── middleware.ts            # Route protection (Node.js runtime)
```

### Database Schema

**Key Models:**
- `User` - Auth users with role (ADMIN/CLIENT)
- `Instance` - WhatsApp instances (one per user)
- `Contact` - User contacts with tags and opt-out status
- `Campaign` - Message campaigns with throttling settings
- `MessageLog` - Individual message send status tracking

### API Routes

**Authentication:**
- `POST /api/auth/sign-up/email` - Create account
- `POST /api/auth/sign-in/email` - Sign in
- `POST /api/auth/sign-out` - Sign out

**WhatsApp:**
- `POST /api/whatsapp/instance` - Create/get instance
- `GET /api/whatsapp/qr` - Get QR code for scanning
- `GET /api/whatsapp/status` - Check connection status
- `POST /api/whatsapp/sync-contacts` - Sync contacts from WhatsApp

**Contacts:**
- `GET /api/contacts?search=...&tag=...` - List contacts
- `POST /api/contacts` - Create contact
- `PATCH /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact
- `POST /api/contacts/import` - Bulk import from CSV

**Campaigns:**
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/[id]` - Get campaign with stats
- `PATCH /api/campaigns/[id]` - Update status (pause/resume)
- `POST /api/campaigns/[id]/start` - Start campaign (queues messages)
- `DELETE /api/campaigns/[id]` - Delete campaign

**Webhooks:**
- `POST /api/webhooks/evolution` - Evolution API events

### Queue System

**Campaign Worker** ([lib/workers/campaign.worker.ts](lib/workers/campaign.worker.ts)):
- Processes messages one at a time (concurrency: 1)
- Checks opt-out status before sending
- Enforces daily send limits per instance
- Random throttling between min/max delays
- Updates MessageLog status (SENT/FAILED/SKIPPED)
- Retry logic: 3 attempts with exponential backoff

**Job Data:**
```typescript
{
  campaignId: string
  contactId: string
  messageLogId: string
  instanceName: string
  messageText: string
  mediaPath?: string | null
  mediaType?: string | null
  contactPhone: string
}
```

## Commands

### Development
```bash
npm run dev              # Start Next.js on port 3001 (0.0.0.0)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Docker Management
```bash
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:restart   # Restart all services
npm run docker:logs      # Follow logs
npm run docker:clean     # Stop and remove volumes
npm run docker:db        # Start only PostgreSQL + Redis
npm run docker:full      # Start services + run migrations
```

### Database
```bash
npm run db:migrate       # Create migration (dev)
npm run db:migrate:deploy # Run migrations (prod)
npm run db:migrate:reset # Reset database
npm run db:push          # Push schema changes (no migration)
npm run db:pull          # Pull schema from database
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Run seed script
```

### Quick Setup
```bash
npm run setup            # Setup database from scratch
npm run reset            # Clean reset (removes all data)
```

## Environment Variables

Required in `.env`:
```env
# Better Auth
BETTER_AUTH_SECRET="32+ character random string"
BETTER_AUTH_URL="http://your-ip:3001"  # Use network IP, not localhost
NEXT_PUBLIC_APP_URL="http://your-ip:3001"

# Database
DATABASE_URL="postgresql://wazzup:password@localhost:5432/wazzup?schema=public"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Evolution API
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="your-api-key"
```

## Important Notes

### Runtime Configuration
- **Middleware** uses Node.js runtime (not Edge) due to Better Auth's crypto module requirements
- Add `export const runtime = "nodejs"` to middleware.ts

### Prisma 7 Requirements
- Must use `@prisma/adapter-pg` with connection pooling
- Better Auth requires `createdAt` and `updatedAt` on Account model

### CORS Configuration
- Access app via network IP (not localhost) to avoid CORS issues
- Set BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL to same network IP

### WhatsApp Connection Flow
1. User navigates to [/dashboard/connect](app/(dashboard)/dashboard/connect/page.tsx)
2. System creates Evolution API instance via POST /api/whatsapp/instance
3. Fetches QR code from Evolution API via GET /api/whatsapp/qr
4. Polls connection status every 3 seconds via GET /api/whatsapp/status
5. On CONNECTED status, auto-syncs contacts via POST /api/whatsapp/sync-contacts
6. Redirects to dashboard after sync completes

### Campaign Sending Flow
1. User creates campaign, selects contacts, configures throttling
2. Campaign saved with status DRAFT
3. User clicks "Start" → POST /api/campaigns/[id]/start
4. System queues all pending messages to BullMQ with random delays
5. Worker processes messages one by one, respecting throttle and daily limits
6. Real-time progress tracked in MessageLog table
7. Dashboard polls GET /api/campaigns/[id] every 5 seconds for live updates

## Design System

- **Background**: `#0a0a0f`
- **Card Background**: `#111118`
- **Border**: `white/8` (rgba(255,255,255,0.08))
- **Primary Accent**: `#00ff88` (electric green)
- **Text**: `white`, `white/70`, `white/50`
- **Font**: System sans-serif stack
- **Inspiration**: https://21st.dev

## Future Enhancements

- Media attachment support (images, PDFs, videos)
- Message templates with variables
- Campaign scheduling (cron-based)
- Analytics dashboard with charts
- Multi-user workspace support
- Webhook for incoming messages
- Contact segmentation and advanced filtering
- A/B testing for campaign messages
