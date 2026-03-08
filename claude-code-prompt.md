# Claude Code Prompt — WhatsApp SaaS Platform (Djanbee)

## Project Overview

Build a full-stack multi-tenant WhatsApp automation SaaS called **"Wazzup"** (or use a placeholder name `WA_PLATFORM` throughout — the client will rename it). It allows business owners to connect their WhatsApp number via QR scan and send bulk/scheduled messages (text, images, PDFs) to their contacts with smart throttling to avoid bans.

The stack is:
- **Frontend + Backend**: Next.js 14 (App Router, TypeScript)
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: BullMQ + Redis
- **WhatsApp Layer**: Evolution API (self-hosted, runs as a separate Docker container)
- **Auth**: NextAuth.js v5 with credentials provider (email + password, bcrypt hashed)
- **File Storage**: Local disk (Hetzner VPS) via multer/formidable — no S3 for now
- **Deployment**: Docker Compose on a Hetzner VPS (4GB RAM, 2 CPU)

---

## UI & Design Direction

This is the most important part. **Do not build a boring dashboard.** Study the component library at https://21st.dev for inspiration on modern, premium UI patterns.

### Aesthetic Direction
- **Theme**: Dark-first. Deep charcoal/slate backgrounds (`#0a0a0f`, `#111118`), not pure black
- **Accent**: A vivid electric green (`#00ff88`) as the primary brand color — evokes WhatsApp but premium/modern
- **Secondary accent**: Soft cyan (`#00d4ff`) for data/stats
- **Typography**: Use `Geist` (Vercel's font, available via `next/font`) for UI text. Use `Cal Sans` or `Instrument Serif` for headings/display text. Never use Inter or Arial.
- **Feel**: Think Linear.app meets a modern messaging tool. Clean, fast, intentional. Every interaction should feel instant.
- **Motion**: Subtle entrance animations on page load (staggered cards), smooth transitions between states, skeleton loaders (never spinners alone), optimistic UI updates
- **Components**: Glassmorphism cards with subtle borders (`border: 1px solid rgba(255,255,255,0.08)`), soft glow effects on active states, pill badges for statuses

### Layout
- Left sidebar navigation (collapsible), top bar with user info + instance status indicator
- Dashboard is the home — shows key stats at a glance
- Every list view (contacts, campaigns) uses a data table with row actions, search, and filters built in
- Empty states must be beautiful — illustrated or typographic, never just "No data found"

---

## Application Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← sidebar + topbar shell
│   │   ├── dashboard/page.tsx      ← stats overview
│   │   ├── connect/page.tsx        ← QR code scanner / instance status
│   │   ├── contacts/
│   │   │   ├── page.tsx            ← contact list + upload CSV
│   │   │   └── [id]/page.tsx
│   │   ├── campaigns/
│   │   │   ├── page.tsx            ← campaign list
│   │   │   ├── new/page.tsx        ← campaign creator
│   │   │   └── [id]/page.tsx       ← campaign detail + progress
│   │   └── settings/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── whatsapp/
│       │   ├── instance/route.ts   ← create/get instance
│       │   ├── qr/route.ts         ← fetch QR code
│       │   └── status/route.ts     ← connection status
│       ├── contacts/
│       │   ├── route.ts            ← GET list, POST create
│       │   ├── [id]/route.ts       ← GET, PATCH, DELETE
│       │   └── import/route.ts     ← CSV upload + parse
│       ├── campaigns/
│       │   ├── route.ts            ← GET list, POST create
│       │   ├── [id]/route.ts       ← GET detail
│       │   ├── [id]/start/route.ts ← enqueue campaign
│       │   └── [id]/pause/route.ts ← pause/resume
│       └── webhooks/
│           └── evolution/route.ts  ← incoming message events
├── components/
│   ├── ui/                         ← base components (shadcn-style but custom)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── connect/
│   │   └── QRCodePanel.tsx
│   ├── contacts/
│   │   ├── ContactsTable.tsx
│   │   └── CSVImporter.tsx
│   └── campaigns/
│       ├── CampaignCard.tsx
│       ├── CampaignCreator.tsx
│       └── CampaignProgress.tsx
├── lib/
│   ├── auth.ts                     ← NextAuth config
│   ├── prisma.ts                   ← Prisma client singleton
│   ├── evolution.ts                ← Evolution API client wrapper
│   ├── queue.ts                    ← BullMQ setup
│   └── workers/
│       └── campaign.worker.ts      ← BullMQ worker that processes sends
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Database Schema (Prisma)

```prisma
model User {
  id            String     @id @default(cuid())
  email         String     @unique
  name          String
  passwordHash  String
  role          Role       @default(CLIENT)
  createdAt     DateTime   @default(now())
  
  instance      Instance?
  contacts      Contact[]
  campaigns     Campaign[]
}

enum Role {
  ADMIN
  CLIENT
}

model Instance {
  id            String         @id @default(cuid())
  userId        String         @unique
  user          User           @relation(fields: [userId], references: [id])
  evolutionName String         @unique  // e.g. "user_abc123" — the instance name in Evolution API
  status        InstanceStatus @default(DISCONNECTED)
  phone         String?        // populated once connected
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

enum InstanceStatus {
  DISCONNECTED
  CONNECTING
  CONNECTED
}

model Contact {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  name          String
  phone         String    // E.164 format, e.g. +358401234567
  optedOut      Boolean   @default(false)
  tags          String[]  @default([])
  createdAt     DateTime  @default(now())
  
  messagesSent  MessageLog[]
  
  @@unique([userId, phone])
}

model Campaign {
  id              String         @id @default(cuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id])
  name            String
  messageText     String
  mediaPath       String?        // local file path for PDF/image if attached
  mediaType       String?        // "pdf", "image", "video"
  status          CampaignStatus @default(DRAFT)
  scheduledAt     DateTime?      // null = send now when started
  throttleMin     Int            @default(8)   // seconds min delay between messages
  throttleMax     Int            @default(25)  // seconds max delay
  dailyLimit      Int            @default(200) // max sends per day per instance
  createdAt       DateTime       @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  
  logs            MessageLog[]
}

enum CampaignStatus {
  DRAFT
  QUEUED
  RUNNING
  PAUSED
  COMPLETED
  FAILED
}

model MessageLog {
  id          String        @id @default(cuid())
  campaignId  String
  campaign    Campaign      @relation(fields: [campaignId], references: [id])
  contactId   String
  contact     Contact       @relation(fields: [contactId], references: [id])
  status      MessageStatus @default(PENDING)
  error       String?
  sentAt      DateTime?
  createdAt   DateTime      @default(now())
}

enum MessageStatus {
  PENDING
  SENT
  FAILED
  SKIPPED  // opted out
}
```

---

## Evolution API Integration (`lib/evolution.ts`)

Evolution API runs as a Docker container on the same host. All calls are internal HTTP to `http://evolution-api:8080`.

```typescript
// lib/evolution.ts
const EVOLUTION_BASE = process.env.EVOLUTION_API_URL // http://evolution-api:8080
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY

export const evolutionClient = {
  async createInstance(instanceName: string) {
    // POST /instance/create
  },
  
  async getQR(instanceName: string) {
    // GET /instance/connect/{instanceName}
    // Returns { base64: "data:image/png;base64,..." }
  },
  
  async getStatus(instanceName: string) {
    // GET /instance/connectionState/{instanceName}
    // Returns { state: "open" | "close" | "connecting" }
  },
  
  async sendText(instanceName: string, phone: string, text: string) {
    // POST /message/sendText/{instanceName}
    // Body: { number: phone, text }
  },
  
  async sendMedia(instanceName: string, phone: string, mediaPath: string, caption: string, mediaType: string) {
    // POST /message/sendMedia/{instanceName}
    // Send as base64 encoded file
  },
  
  async deleteInstance(instanceName: string) {
    // DELETE /instance/delete/{instanceName}
  }
}
```

---

## Queue System (`lib/queue.ts` + `lib/workers/campaign.worker.ts`)

```typescript
// lib/queue.ts
import { Queue, Worker } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
}

export const campaignQueue = new Queue('campaigns', { connection })

// Each job = one message send
// Job data: { campaignId, contactId, instanceName, phone, message, mediaPath? }
```

The worker (`lib/workers/campaign.worker.ts`) must:
1. Pick up jobs from the queue
2. Check if contact has opted out — if yes, mark SKIPPED and continue
3. Check daily send count for this instance — if at limit, delay job to tomorrow 9am
4. Call `evolutionClient.sendText` or `evolutionClient.sendMedia`
5. Update `MessageLog` status to SENT or FAILED
6. On failure: retry up to 3 times with exponential backoff, then mark FAILED
7. The throttle delay is handled by BullMQ job `delay` property — when enqueuing a campaign, calculate each job's delay as: `jobIndex * randomBetween(throttleMin, throttleMax) * 1000`

The worker must start automatically when the Next.js server starts. Do this in a custom `instrumentation.ts` file (Next.js 14 supports this for server-side init).

---

## Authentication & Security

Use **NextAuth.js v5** with a credentials provider.

### Requirements:
- Email + password login. Passwords hashed with `bcryptjs` (never store plaintext)
- JWT session strategy (stateless, no DB session table needed)
- All `/dashboard/*` routes and `/api/*` routes (except `/api/auth`) protected via middleware
- Rate limiting on `/api/auth/login`: max 5 attempts per IP per 15 minutes — implement with a simple in-memory Map (no Redis needed for this, it resets on restart which is acceptable)
- CSRF protection: NextAuth handles this automatically with credentials provider
- All API routes must validate the session and check that the requested resource belongs to the authenticated user (no IDOR vulnerabilities — e.g. user A must never be able to access user B's campaigns)
- Webhook endpoint (`/api/webhooks/evolution`) must validate a shared secret header (`x-evolution-token`) against `process.env.WEBHOOK_SECRET`
- Environment variables must never be exposed to the client — all sensitive calls server-side only
- Passwords must be minimum 8 characters, validated on both client and server
- HTTP-only, secure, sameSite cookies for session tokens
- Input sanitization on all user-provided fields before DB writes

### Middleware (`middleware.ts`):
```typescript
// Protect all routes under /dashboard and /api except /api/auth
export const config = {
  matcher: ['/dashboard/:path*', '/api/((?!auth).*)']
}
```

---

## Key UX Rules

- **QR Connect flow**: Poll `/api/whatsapp/status` every 3 seconds after QR is shown. As soon as status becomes `CONNECTED`, show a success animation and redirect to dashboard. Never make the user click "check status".
- **CSV Import**: Drag-and-drop zone. Parse client-side first to show a preview (first 5 rows) before confirming import. Show a count of valid/invalid rows. Phone numbers must be validated (must be numeric, correct length).
- **Campaign Creator**: Step-by-step wizard (not one long form). Step 1: Name + message. Step 2: Attach media (optional, drag-drop). Step 3: Select contacts or tags. Step 4: Schedule (now or pick datetime). Step 5: Review + launch. Show estimated send duration based on throttle settings.
- **Campaign Progress**: Real-time progress bar (poll `/api/campaigns/[id]` every 5s while RUNNING). Show sent/total count, estimated time remaining, failed count.
- **Optimistic UI**: When user creates a contact or starts a campaign, update the UI immediately before the server confirms.
- **Toasts**: All actions get feedback toasts (success/error). Use a custom toast system, not a third-party one.
- **Mobile**: Dashboard must be usable on tablet. Sidebar collapses to icon-only below 1024px.

---

## Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: wazzup
      POSTGRES_USER: wazzup
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  evolution-api:
    image: atendai/evolution-api:v2-latest
    environment:
      SERVER_URL: ${EVOLUTION_SERVER_URL}
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}
      DATABASE_ENABLED: true
      DATABASE_CONNECTION_URI: postgresql://wazzup:${POSTGRES_PASSWORD}@postgres:5432/evolution
      DATABASE_CONNECTION_CLIENT_NAME: evolution
      REDIS_ENABLED: true
      REDIS_URI: redis://:${REDIS_PASSWORD}@redis:6379
      WEBHOOK_GLOBAL_URL: ${NEXT_PUBLIC_APP_URL}/api/webhooks/evolution
      WEBHOOK_GLOBAL_ENABLED: true
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    ports:
      - "8080:8080"

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://wazzup:${POSTGRES_PASSWORD}@postgres:5432/wazzup
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      EVOLUTION_API_URL: http://evolution-api:8080
      EVOLUTION_API_KEY: ${EVOLUTION_API_KEY}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXT_PUBLIC_APP_URL}
      WEBHOOK_SECRET: ${WEBHOOK_SECRET}
    depends_on:
      - postgres
      - redis
      - evolution-api
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:
  evolution_instances:
  uploads:
```

---

## `.env.example`

```env
# Database
POSTGRES_PASSWORD=change_me_strong_password

# Redis
REDIS_PASSWORD=change_me_redis_password

# App
NEXTAUTH_SECRET=change_me_32_char_random_string
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Evolution API
EVOLUTION_API_KEY=change_me_evolution_key
EVOLUTION_SERVER_URL=https://yourdomain.com:8080

# Webhook security
WEBHOOK_SECRET=change_me_webhook_secret
```

---

## Dockerfile

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

RUN mkdir -p /app/uploads

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

---

## Deliverables Claude Code Must Produce

1. Complete Next.js project scaffolded and working
2. All Prisma migrations created and runnable
3. All API routes implemented with proper auth guards and ownership checks
4. BullMQ worker wired up via `instrumentation.ts`
5. Full Evolution API client with error handling
6. All dashboard pages built with the design system described above
7. `docker-compose.yml` ready to `docker compose up -d`
8. `.env.example` with all required variables documented
9. `README.md` with:
   - Local dev setup instructions
   - Production deployment steps (Hetzner)
   - How to create the first admin user
   - How to update Evolution API webhook URL

---

## What NOT to Build (Out of Scope for Now)

- No Stripe/payments
- No email notifications
- No AI/incoming message processing (Phase 2)
- No admin panel for managing multiple clients (manage via DB directly for now)
- No S3/cloud storage (local disk only)
- No 2FA

"After the WhatsApp instance status changes to CONNECTED, automatically call Evolution API's GET /chat/findContacts/{instanceName} endpoint and bulk upsert the results into the Contact table for that user. Deduplicate by phone number. Show a 'Syncing contacts...' indicator in the UI during this process. This should happen as a background API call triggered client-side when the QR polling detects the CONNECTED state. CSV import remains available for adding contacts not in WhatsApp history."