# Warp Pipes Hub - Implementation Tracking Document

**Project**: 1UP SOL Warp Pipes Hub
**Started**: October 23, 2024
**Status**: 🟡 In Progress

---

## Overview

Building a Mario-themed token discovery hub with real-time streaming from PumpPortal and Helius WebSockets. Features three columns (Bonded/Graduating/New) with health capsules, watch functionality, and individual token rooms.

---

## Implementation Progress

### ✅ Phase 1: Database Schema & Types (COMPLETED)

**Status**: ✅ Done

**Files Created**:
- `backend/prisma/migrations/20251023160000_add_warp_pipes_tables/migration.sql`
- `frontend/lib/types/warp-pipes.ts`

**Completed Tasks**:
- [x] TokenDiscovery Prisma model (mint, state, health data, metrics)
- [x] TokenWatch Prisma model (user preferences, notifications)
- [x] TypeScript interfaces (TokenRow, HealthStatus, WatchPreferences, etc.)
- [x] Health computation helpers (getLiquidityHealth, getPriceImpactHealth, etc.)
- [x] Sort comparators for UI

**Notes**:
- Migration created but not applied (requires database connection)
- Will be applied on Railway deployment
- Prisma client generated with new types

---

### ✅ Phase 2: Backend Streaming Infrastructure (COMPLETED)

**Status**: ✅ Done

**Files Created**:
- `backend/src/services/pumpPortalStreamService.ts` (329 lines)
- `backend/src/services/raydiumStreamService.ts` (302 lines)
- `backend/src/services/healthCapsuleService.ts` (247 lines)

**Completed Tasks**:
- [x] PumpPortal WebSocket connection with auto-reconnect
- [x] Subscribe to `subscribeNewToken` (bonded tokens)
- [x] Subscribe to `subscribeMigration` (graduating → new)
- [x] Raydium onLogs monitoring (initialize2 detection)
- [x] Health capsule enrichment (freeze/mint authority, price impact, liquidity)
- [x] Exponential backoff reconnection logic
- [x] Event emitters for downstream processing

**Key Features**:
- Single WebSocket connection (PumpPortal requirement)
- Keepalive ping/pong (30s interval)
- Transaction parsing for pool/mint extraction
- Jupiter price impact quotes
- DexScreener liquidity data
- Batch health checks (rate-limited)

---

### ✅ Phase 3: Token Discovery Worker (COMPLETED)

**Status**: ✅ Done

**Files Created**:
- `backend/src/workers/tokenDiscoveryWorker.ts` (456 lines)

**Completed Tasks**:
- [x] Listen to PumpPortal events (newToken, migration)
- [x] Listen to Raydium events (newPool)
- [x] Upsert TokenDiscovery records
- [x] Enrich with health data
- [x] Calculate hotScore (recency, volume, watchers)
- [x] Trigger state transitions (bonded → graduating → new)
- [x] Emit events for watch notifications
- [x] Redis caching layer (2-4h TTL)
- [x] Scheduled jobs (hot scores, watcher sync, cleanup)
- [x] Graceful shutdown handlers

**Key Features**:
- Event-driven architecture with async health enrichment
- Hot score formula: 50% recency + 30% liquidity + 20% watchers
- State machine: bonded → graduating → new
- Watch notification system (ready for NotificationService integration)
- Redis cache for fast API queries
- Scheduled maintenance jobs
- Comprehensive error handling

---

### ✅ Phase 4: Backend API Endpoints (COMPLETED)

**Status**: ✅ Done

**Files Created**:
- `backend/src/routes/warpPipes.ts` (570 lines)

**Completed Endpoints**:
- [x] `GET /api/warp-pipes/feed` - Return bonded/graduating/new arrays with filtering/sorting
- [x] `POST /api/warp-pipes/watch` - Add token watch with preferences
- [x] `DELETE /api/warp-pipes/watch/:mint` - Remove token watch
- [x] `PATCH /api/warp-pipes/watch/:mint` - Update watch preferences
- [x] `GET /api/warp-pipes/watches` - Get user's watches with token data
- [x] `GET /api/warp-pipes/health/:mint` - Get detailed health data (cached 5min)
- [x] `GET /api/warp-pipes/token/:mint` - Get detailed token information

**Route Registration**:
- [x] Registered in `backend/src/index.ts` at `/api/warp-pipes`

**Key Features**:
- Zod validation for all inputs
- JWT authentication for watch endpoints (optional for feed)
- Redis caching for performance (5min health cache, 2h token cache)
- Filtering & sorting (hot, new, watched, alphabetical)
- Search by symbol/name
- Minimum liquidity filter
- User-specific watch status (isWatched flag)
- Watcher count auto-increment/decrement

---

### ✅ Phase 5: Frontend - Warp Pipes Hub Page (COMPLETED)

**Status**: ✅ Done

**Files Created**:
- [x] `frontend/components/warp-pipes/health-capsule.tsx` (165 lines) - Mario-themed health indicators
- [x] `frontend/components/warp-pipes/watch-button.tsx` (145 lines) - Heart button with animations
- [x] `frontend/components/warp-pipes/token-card.tsx` (180 lines) - Mario card with bold borders
- [x] `frontend/components/warp-pipes/token-column.tsx` (95 lines) - Scrollable column container
- [x] `frontend/components/warp-pipes/filter-bar.tsx` (75 lines) - Mario-themed filter controls
- [x] `frontend/lib/api/warp-pipes.ts` (145 lines) - API client functions
- [x] `frontend/hooks/use-warp-pipes.ts` (105 lines) - React Query hooks
- [x] `frontend/components/warp-pipes/warp-pipes-hub.tsx` (175 lines) - Main hub with 3-column layout
- [x] `frontend/app/warp-pipes/page.tsx` (25 lines) - Page wrapper with metadata

**Total Frontend Code**: ~1,110 lines

**Completed Features**:
- ✅ Health capsule with Luigi Green/Star Yellow/Mario Red colors
- ✅ Watch button with filled heart animation (Framer Motion)
- ✅ Token cards with border-4, rounded-xl, shadow-md (Mario theme)
- ✅ Scrollable columns with state-specific headers
- ✅ Filter bar with Mario-themed buttons (🔥 Hot, ⏰ New, ❤️ Watched, 🔤 A-Z)
- ✅ Hot score progress bars with color transitions
- ✅ Responsive hover effects and transforms
- ✅ Empty states with Mario emojis 🍄
- ✅ Loading skeletons and overlays
- ✅ Perfect color scheme consistency with existing pages
- ✅ Desktop: 3-column layout (Bonded | Graduating | New)
- ✅ Mobile: Tabs layout with state counts
- ✅ Real-time feed updates (2s refetch interval)
- ✅ Watch toggle with optimistic updates
- ✅ Search and filtering
- ✅ API client with proper error handling
- ✅ React Query hooks with auth integration
- ✅ SEO metadata and OpenGraph tags

**Mario Theme Perfection**:
- Bold `border-4` on all cards
- State-specific border colors (Coin Yellow, Star Yellow, Luigi Green)
- Mario Red CTAs (`bg-mario-red-500`, `border-mario-red-700`)
- Pipe neutrals for secondary elements
- Sky Blue backgrounds (`bg-sky-50`)
- Smooth transitions and hover effects
- Consistent with trending, portfolio, and trading pages

---

### ⏳ Phase 6: Room Page (PENDING)

**Status**: ⏳ Pending

**Note**: Phases 6 and 7 merged - React Query integration completed in Phase 5

**Files to Create**:
- `frontend/app/room/[mint]/page.tsx`

**Layout**:
- [ ] Token header with back button
- [ ] Pinned health capsule
- [ ] Chart (reuse TradingChart component)
- [ ] Trade panel (reuse TradingPanel component)
- [ ] Chat placeholder (future implementation)

**Mario Styling**:
- All sections use `.mario-card`
- Grid layout: 2/3 chart + 1/3 trade panel on desktop

---

### ⏳ Phase 8: Watch Notifications (PENDING)

**Status**: ⏳ Pending

**Files to Create**:
- `backend/src/services/watchNotificationService.ts`

**Tasks**:
- [ ] Listen for TokenDiscovery state changes
- [ ] Query TokenWatch table for affected users
- [ ] Send notifications via NotificationService
- [ ] Batch notifications to avoid spam
- [ ] Link notifications to `/room/[mint]`

---

## Environment Variables

**Required**:
```env
# PumpPortal (optional - enables PumpSwap stream)
PUMPPORTAL_API_KEY=your-api-key

# Helius (already configured)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
HELIUS_WS=wss://mainnet.helius-rpc.com/?api-key=...
```

---

## Database Migration

**When to Apply**:
The migration will be applied when you push to Railway or run manually:

```bash
# On Railway (auto-applied)
git push origin main

# Or manually on Railway
railway run npx prisma migrate deploy

# Or locally (if you have local DB)
cd backend && npx prisma migrate dev
```

**Migration File**:
`backend/prisma/migrations/20251023160000_add_warp_pipes_tables/migration.sql`

---

## Testing Plan

### Backend Testing
- [ ] Test PumpPortal connection and event parsing
- [ ] Test Raydium pool detection
- [ ] Test health capsule enrichment
- [ ] Test API endpoints (Postman/curl)
- [ ] Test watch CRUD operations

### Frontend Testing
- [ ] Test 3-column layout (desktop)
- [ ] Test tabs layout (mobile)
- [ ] Test token card interactions
- [ ] Test watch button functionality
- [ ] Test navigation to room page
- [ ] Test Mario theme styling consistency

### Integration Testing
- [ ] Test real-time token updates
- [ ] Test state transitions (bonded → graduating → new)
- [ ] Test watch notifications
- [ ] Test health capsule updates

---

## Performance Considerations

**Backend**:
- Single WebSocket connections (PumpPortal requirement)
- Batch health checks (10 tokens at a time, 100ms delay)
- Redis caching for token data (TTL: 2-4 hours)
- Rate limiting on API endpoints

**Frontend**:
- React Query with 2s refetch interval
- Virtual scrolling if >100 tokens per column (use react-window)
- Debounced search input (300ms)
- Lazy-loaded token logos with placeholders

---

## Known Issues / TODOs

- [ ] Migration not applied (waiting for Railway deployment)
- [ ] Chat functionality deferred to future phase
- [ ] "Creator Verified" badge logic TBD
- [ ] Bonding curve progress API integration TBD
- [ ] PumpSwap stream requires paid API key (optional)

---

## Deployment Checklist

**Before Deploying**:
- [ ] Add PUMPPORTAL_API_KEY to Railway (if using PumpSwap stream)
- [ ] Test migration on Railway staging DB
- [ ] Verify Helius WebSocket limits (100 connections on Developer plan)
- [ ] Set up error monitoring (Sentry) for stream services
- [ ] Test on mobile devices

**After Deploying**:
- [ ] Monitor backend logs for stream connections
- [ ] Verify tokens appearing in database
- [ ] Check API endpoints responding correctly
- [ ] Test frontend loading tokens
- [ ] Monitor WebSocket reconnections

---

## File Structure

```
SolSim/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   │   └── 20251023160000_add_warp_pipes_tables/
│   │   │       └── migration.sql ✅
│   │   └── schema.prisma ✅ (updated)
│   └── src/
│       ├── services/
│       │   ├── pumpPortalStreamService.ts ✅
│       │   ├── raydiumStreamService.ts ✅
│       │   ├── healthCapsuleService.ts ✅
│       │   └── watchNotificationService.ts ⏳
│       ├── workers/
│       │   └── tokenDiscoveryWorker.ts 🟡
│       └── routes/
│           └── warpPipes.ts ⏳
└── frontend/
    ├── app/
    │   ├── warp-pipes/
    │   │   └── page.tsx ⏳
    │   └── room/
    │       └── [mint]/
    │           └── page.tsx ⏳
    ├── components/
    │   └── warp-pipes/
    │       ├── warp-pipes-hub.tsx ⏳
    │       ├── token-card.tsx ⏳
    │       ├── token-column.tsx ⏳
    │       ├── health-capsule.tsx ⏳
    │       ├── watch-button.tsx ⏳
    │       └── filter-bar.tsx ⏳
    ├── hooks/
    │   └── use-warp-pipes.ts ⏳
    └── lib/
        ├── types/
        │   └── warp-pipes.ts ✅
        └── api/
            └── warp-pipes.ts ⏳
```

**Legend**:
- ✅ = Completed
- 🟡 = In Progress
- ⏳ = Pending

---

## Code Statistics

**Lines of Code Created**:
- Backend Services: ~900 lines
- TypeScript Types: ~250 lines
- Total so far: ~1,150 lines

**Estimated Remaining**:
- Worker: ~400 lines
- API Routes: ~300 lines
- Frontend Components: ~1,200 lines
- Hooks & API Client: ~200 lines
- **Total Remaining**: ~2,100 lines

**Grand Total Estimate**: ~3,250 lines for complete Warp Pipes Hub

---

## Timeline

**Completed**: Phase 1 & 2 (Database + Streaming) - ~2 hours
**In Progress**: Phase 3 (Worker)
**Remaining**: Phases 4-8

**Estimated Completion**: 6-8 hours total development time

---

## Questions / Decisions Made

1. **Q**: Should we use Redis for caching?
   **A**: Yes, Redis for hot cache with 2-4h TTL, Postgres for persistence

2. **Q**: How often should we poll bonding curve progress?
   **A**: 15-30s for top N bonded tokens only (not all tokens)

3. **Q**: Should chat be implemented now?
   **A**: No, deferred to future phase. Room page will show placeholder.

4. **Q**: Should we use PumpSwap stream?
   **A**: Optional - requires paid API key (0.01 SOL per 10k messages)

---

**Last Updated**: October 23, 2024
**Next Update**: After completing Worker & API Routes
