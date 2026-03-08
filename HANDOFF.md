# Wazzup - AI Handoff Document

## Project Overview
**Wazzup** is a multi-tenant WhatsApp automation SaaS platform built with:
- Next.js 16.1.6 (App Router)
- Evolution API v2.3.7 (custom build from develop branch - fixes QR code issues)
- PostgreSQL (app data + Evolution API data)
- Better Auth 1.5.4
- Prisma 7.4.2 ORM

## Current Status: ✅ WORKING

### What's Implemented & Working
1. ✅ **Authentication** - Login/logout with Better Auth
2. ✅ **WhatsApp Connection** - QR code generation and scanning
3. ✅ **Automatic Contact Sync** - Webhooks successfully syncing contacts from WhatsApp
4. ✅ **Contact Management** - View, search, import CSV, add manually, delete, opt-out
5. ✅ **Disconnect Functionality** - Can disconnect WhatsApp to test reconnection
6. ✅ **Dashboard** - Shows real-time connection status and contact counts
7. ✅ **Multi-tenant Architecture** - Each user gets unique Evolution API instance

### Current Stats
- **1,332 contacts** successfully synced from WhatsApp
- All contacts have `createdAt` timestamp (when they were synced to database)
- Contacts page shows all contacts with search functionality

## Architecture

### Tech Stack
- **Frontend**: Next.js 16.1.6 App Router, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Auth**: Better Auth 1.5.4
- **Database**: PostgreSQL (2 databases - app + Evolution)
- **ORM**: Prisma 7.4.2
- **WhatsApp API**: Evolution API v2.3.7 (custom Docker image)
- **Containerization**: Docker Compose

### Key Files
- `/docker-compose.yml` - Evolution API, PostgreSQL, MongoDB, Redis
- `/middleware.ts` - Auth + webhook bypass (LINE 16-20: allows webhooks without auth)
- `/app/api/webhooks/evolution/handler.ts` - Shared webhook logic
- `/app/api/webhooks/evolution/route.ts` - Base webhook endpoint
- `/app/api/webhooks/evolution/*/route.ts` - Event-specific webhook endpoints
- `/app/(dashboard)/dashboard/contacts/page.tsx` - Contact management UI
- `/lib/evolution.ts` - Evolution API client
- `/prisma/schema.prisma` - Database schema

### Database Schema (Key Models)
```prisma
model User {
  id        String    @id
  email     String    @unique
  contacts  Contact[]
  campaigns Campaign[]
  instance  Instance?
}

model Instance {
  id            String   @id @default(cuid())
  userId        String   @unique
  evolutionName String   @unique  // Format: user_{userId}
  status        String   @default("DISCONNECTED")  // DISCONNECTED | CONNECTING | CONNECTED
  phone         String?
}

model Contact {
  id        String   @id @default(cuid())
  userId    String
  name      String
  phone     String
  tags      String[] @default([])
  optedOut  Boolean  @default(false)
  createdAt DateTime @default(now())

  @@unique([userId, phone])
}
```

### Evolution API Configuration
- **Port**: 8080
- **Database**: PostgreSQL (saves instances, messages, contacts, chats)
- **Webhook URL**: `http://host.docker.internal:3004/api/webhooks/evolution`
- **Custom Image**: Built from develop branch to fix QR code loop issue
- **Events Enabled**:
  - connection.update
  - qrcode.updated
  - contacts.set, contacts.upsert, contacts.update
  - messages.upsert, messages.update

## Recent Fixes

### Issue: Webhooks Returning 404
**Problem**: Evolution API was sending webhooks but they were all returning 404, preventing contact sync.

**Root Cause**: The Next.js middleware at `/middleware.ts` was requiring authentication for ALL `/api/*` routes except `/api/auth`. Webhook requests from Evolution API don't have session cookies, so they were redirected to `/login`.

**Solution** (LINE 16-20 in middleware.ts):
```typescript
// Webhook routes should bypass auth (they come from external services)
const isWebhookRoute = pathname.startsWith("/api/webhooks")

// Skip auth check for public routes, auth API, and webhooks
if (isPublicRoute || isAuthApiRoute || isWebhookRoute) {
  return NextResponse.next()
}
```

### Issue: Contact Field Mismatch
**Problem**: Contact sync handler was looking for `contact.id` field, but Evolution API v2 sends `contact.remoteJid`.

**Solution**: Updated handler to check multiple fields in priority order:
```typescript
const rawPhone = contact.remoteJid || contact.id || contact.phone || contact.number
```

## User's Request for Next Session

### PRIMARY GOAL: Contact Ordering
**Request**: "It would be nice to have them in an order of when they first contacted"

**Current Situation**:
- Contacts are synced with `createdAt` timestamp (when synced to our DB)
- Contacts page currently shows NO specific ordering
- 1,332 contacts total

**What Needs to Be Done**:
1. **Determine if WhatsApp provides "first contact" timestamp**
   - Check Evolution API webhook data for message history timestamps
   - Check if Evolution API stores message history with timestamps
   - May need to query Evolution API's database or use REST endpoints

2. **Options for Implementation**:
   - **Option A**: Add `firstContactedAt` field to Contact model, populate from WhatsApp message history
   - **Option B**: Use existing `createdAt` as-is (timestamp when synced)
   - **Option C**: Query message history on-demand when displaying contacts

3. **Update Contacts Page**:
   - Add sorting controls (newest first, oldest first, alphabetical, etc.)
   - Default to "first contacted" order
   - File: `/app/(dashboard)/dashboard/contacts/page.tsx`

4. **Database Migration** (if adding new field):
   - Update Prisma schema
   - Create migration
   - Backfill existing contacts

### Investigation Needed
- Check what data Evolution API provides in `contacts.set`, `contacts.upsert`, `contacts.update` events
- Check Evolution API PostgreSQL database schema for message timestamps
- Review Evolution API v2 documentation for message history endpoints

## Testing Instructions

### How to Test Contact Sync
1. Go to http://localhost:3004/dashboard
2. Click "Disconnect WhatsApp" button
3. Go to http://localhost:3004/dashboard/connect
4. Scan QR code with WhatsApp mobile app
5. Watch Next.js logs for webhook events:
   ```
   Evolution API webhook received: {...}
   Processing X contacts for user...
   Contact sync complete: X synced, Y skipped
   ```
6. Go to http://localhost:3004/dashboard/contacts
7. Verify contacts appear

### How to Check Database
```bash
# Check contact count
docker exec pers-whatsapp-postgres-1 psql -U wazzup -d wazzup -c 'SELECT COUNT(*) FROM "Contact";'

# View recent contacts
docker exec pers-whatsapp-postgres-1 psql -U wazzup -d wazzup -c 'SELECT name, phone, "createdAt" FROM "Contact" ORDER BY "createdAt" DESC LIMIT 10;'

# Check instance status
docker exec pers-whatsapp-postgres-1 psql -U wazzup -d wazzup -c 'SELECT "evolutionName", status, phone FROM "Instance";'
```

### How to View Evolution API Logs
```bash
docker logs pers-whatsapp-evolution-api-1 --tail 50 -f
```

## Environment Setup

### Required Containers
- `pers-whatsapp-postgres-1` - PostgreSQL (app + Evolution)
- `pers-whatsapp-mongodb-1` - MongoDB (Evolution API)
- `pers-whatsapp-redis-1` - Redis (Evolution API cache)
- `pers-whatsapp-evolution-api-1` - Evolution API v2.3.7

### Start Everything
```bash
cd /Users/safiul.alam/Documents/personal/pers-whatsapp
docker compose up -d
npm run dev  # Starts Next.js on port 3004
```

### Database Connection
- **App DB**: `postgresql://wazzup:change_me_strong_password@localhost:5432/wazzup`
- **Evolution DB**: `postgresql://wazzup:change_me_strong_password@localhost:5432/evolution`

## What's NOT Done Yet

### Missing Features
1. ❌ **Campaign Management** - UI exists but no backend implementation
2. ❌ **Message Sending** - No implementation yet
3. ❌ **Bulk Messaging** - No implementation yet
4. ❌ **Message Templates** - No implementation yet
5. ❌ **Analytics/Reporting** - No implementation yet
6. ❌ **Contact Ordering** - Contacts not ordered by first contact time (USER'S NEXT REQUEST)

### Known Issues
- None currently blocking

## Important Notes

### Evolution API Custom Build
The project uses a custom Docker image built from Evolution API's develop branch because the stable release had a QR code restart loop bug. The custom image is tagged as `evolution-api-v2-fixed:latest`.

**How it was built** (for reference):
```bash
cd /tmp
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
git checkout develop
docker build -t evolution-api-v2-fixed:latest .
```

### Webhook Event Flow
1. User scans QR code → WhatsApp connects
2. Evolution API fires webhooks to Next.js
3. Webhooks bypass auth middleware (LINE 17 in middleware.ts)
4. Handler processes events and syncs data to PostgreSQL
5. Dashboard/Contacts page shows updated data

### Contact Data Flow
```
WhatsApp → Evolution API → Webhook → Next.js Handler → PostgreSQL → UI
```

## Next Steps for AI

1. **Investigate contact ordering options** (see PRIMARY GOAL above)
2. **Check Evolution API data** for message timestamps
3. **Implement sorting** on contacts page
4. **Consider adding pagination** (1,332 contacts is a lot)
5. **Maybe add filters** (by tags, opted-out status, etc.)

## Quick Reference

### User Credentials (for testing)
Check database for existing users or create new via /register page

### Key URLs
- Dashboard: http://localhost:3004/dashboard
- Contacts: http://localhost:3004/dashboard/contacts
- Connect WhatsApp: http://localhost:3004/dashboard/connect
- Evolution API: http://localhost:8080

### Current Working Directory
`/Users/safiul.alam/Documents/personal/pers-whatsapp`
