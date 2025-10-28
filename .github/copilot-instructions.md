# 1UP SOL - AI Coding Agent Instructions

## Project Overview
**1UP SOL** is a Solana paper trading game with real-time price tracking, FIFO accounting, and Mario-themed UI. This is a **monorepo** with separate frontend (Next.js) and backend (Fastify) that share types via `packages/types/`.

**Critical Context**: All trades use **virtual SOL** (paper trading) - no real money involved. The platform is for practice, competition, and learning.

## Quick Start Commands

```bash
# Development (run in separate terminals)
npm run dev:backend     # Starts backend on :8000
npm run dev:frontend    # Starts frontend on :3000

# Database
npm run db:migrate      # Apply Prisma migrations
npm run db:generate     # Generate Prisma client
npm run db:studio       # Open Prisma Studio

# Testing
npm run test:backend    # Jest tests
npm run test:frontend   # Vitest tests

# Building
npm run build:backend   # Build backend to dist/
npm run build:frontend  # Build frontend to .next/
```

**Before running**: Ensure `.env` files exist in both `backend/` and `frontend/` (see `.env.example` files).

## Architecture Critical Paths

### 1. Data Flow: Real-time Price Updates (PumpPortal-First)

**CRITICAL**: As of Oct 27, 2025, we use **PumpPortal-only** for real-time data (supports ALL Solana tokens):

```
Frontend WebSocket (/ws/prices)
  ↓ subscribes to token
backend/src/plugins/ws.ts
  ↓ calls subscribeToPumpPortalToken()
backend/src/plugins/priceService-optimized.ts
  ↓ uses singleton pumpPortalStreamService
backend/src/services/pumpPortalStreamService.ts
  ↓ WebSocket listens to PumpPortal swap events
  ↓ emits 'swap' event
priceService calculates USD price
  ↓ emits 'price' event
ws.ts broadcasts to frontend clients
```

**Why PumpPortal-only?**
- Supports ALL Solana tokens (not just Pump.fun): "pump", "raydium", "bonk", "launchlab", "pump-amm", "raydium-cpmm", "auto"
- Lower cost (free WebSocket vs metered Helius RPC)
- Simpler (~200 fewer lines than dual-source)
- No race conditions

**Helius is ONLY for blockchain RPC**: holder counts, token accounts, transaction confirmations. NOT for real-time prices.

### 2. Trade Execution: FIFO Position Tracking

**CRITICAL**: We use strict FIFO (First-In-First-Out) accounting. DO NOT consume lots out of order.

```typescript
// ✅ CORRECT - Always consume oldest lots first
const lots = await prisma.positionLot.findMany({
  where: { userId, mint },
  orderBy: { createdAt: 'asc' }  // CRITICAL: oldest first
});

// Consume lots in chronological order
for (const lot of lots) {
  const qtyToConsume = Math.min(remainingQty, lot.qtyRemaining);
  const realizedPnL = qtyToConsume * (sellPrice - lot.unitCostUsd);
  // Update lot.qtyRemaining or delete if fully consumed
}
```

**Models**: `Position` (aggregate), `PositionLot` (individual purchases), `RealizedPnL` (trade outcomes)

**Files**: `backend/src/utils/pnl.ts`, `backend/src/services/pnl.ts`, `backend/src/services/tradeService.ts`

### 3. WebSocket Registration Order

**CRITICAL**: WebSocket routes MUST register BEFORE rate limiting:

```typescript
// backend/src/index.ts - ORDER MATTERS!
app.register(websocket)        // 1. WebSocket support
app.register(wsTestPlugin)     // 2. WS routes
app.register(wsPlugin)
app.register(rateLimiting)     // 3. Rate limit AFTER WS
```

If rate limiting comes first, WebSocket upgrades fail.

### 4. Warp Pipes Data Source (PumpPortal Memecoin Scanner)

**CRITICAL**: The `/trending` page (Warp Pipes) uses **TokenDiscovery table** (PumpPortal data), NOT generic trending APIs.

```typescript
// ✅ CORRECT - Warp Pipes page
import { useWarpPipesFeed } from "@/hooks/use-react-query-hooks"
const { data } = useWarpPipesFeed({ sortBy: 'volume', limit: 50 })
// Returns: { bonded: [], graduating: [], new: [] }
// Source: TokenDiscovery table (PumpPortal WebSocket streams)

// ❌ WRONG - Don't confuse with generic trending
import { useTrendingTokens } from "@/hooks/use-react-query-hooks"
const { data } = useTrendingTokens(50, 'rank')
// Returns: TrendingToken[] from Birdeye/DexScreener
// Used by other pages, NOT Warp Pipes
```

**Backend**: `backend/src/routes/warpPipes.ts` → `/api/warp-pipes/feed` endpoint
**Frontend**: `frontend/app/trending/page.tsx` uses `useWarpPipesFeed()` hook

## Key File Locations

### Backend Service Pattern
```
backend/src/
├── routes/          # API endpoints (register with Fastify)
│   ├── trade.ts     # Trade execution
│   ├── portfolio.ts # Position queries
│   ├── warpPipes.ts # PumpPortal token discovery
│   └── trending.ts  # Generic trending (Birdeye/DexScreener)
├── services/        # Business logic
│   ├── tradeService.ts
│   ├── portfolioService.ts
│   ├── pumpPortalStreamService.ts  # PumpPortal WebSocket (singleton)
│   └── pnl.ts                      # FIFO lot calculations
├── plugins/         # Shared functionality
│   ├── ws.ts                       # WebSocket server
│   ├── priceService-optimized.ts   # Price calculation & caching
│   └── rateLimiting.ts
└── utils/
    └── pnl.ts       # FIFO helper functions
```

### Frontend Patterns
```
frontend/
├── app/             # Next.js App Router pages
│   ├── trending/    # Warp Pipes (PumpPortal scanner)
│   └── room/[ca]/   # Token details pages
├── hooks/           # React Query hooks
│   ├── use-react-query-hooks.ts  # useWarpPipesFeed, useTrendingTokens
│   └── use-portfolio.ts
├── lib/
│   ├── api.ts       # Backend API client
│   └── types/backend.ts  # Shared types
└── components/ui/
    └── cartridge-pill.tsx  # Standard Mario button component
```

## Code Quality Rules

### TypeScript
- **No `any` types** - Use strict typing everywhere
- **Zod validation** - All API inputs/outputs
- **Decimal precision** - Use `Decimal` from Prisma for financial calculations

```typescript
import { Decimal } from '@prisma/client/runtime/library';

// ✅ CORRECT
const totalCost = new Decimal(price).mul(quantity);

// ❌ WRONG - floating point errors
const totalCost = price * quantity;
```

### React Components
- **≤ 150 lines per component** - Split if exceeded
- **React.memo** for table rows, chart components
- **React Query patterns**:
  ```typescript
  {
    staleTime: 30000,        // 30 seconds
    cacheTime: 300000,       // 5 minutes
    refetchOnWindowFocus: false
  }
  ```

### Mario Theme (Frontend Only)

**Always use CSS custom properties** for colors:

```tsx
// ✅ CORRECT
<div className="bg-[var(--mario-red)] border-4 border-[var(--outline-black)]">

// ❌ WRONG
<div className="bg-red-500 border-gray-900">
```

**Button Pattern**: Use `CartridgePill` component
```tsx
import { CartridgePill } from "@/components/ui/cartridge-pill"

<CartridgePill
  value="Trade Now"
  bgColor="var(--mario-red)"
  size="sm"
  onClick={() => handleTrade()}
/>
```

**Card Pattern**: Bold borders (4px) + block shadows
```tsx
<div className="bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-[16px] p-6">
  {/* Card content */}
</div>
```

**Available Mario Colors** (from `frontend/app/globals.css`):
- `--mario-red` (#E52521) - Primary actions
- `--luigi-green` (#43B047) - Success states
- `--star-yellow` (#FFD800) - Highlights
- `--sky-blue` (#A6D8FF) - Info elements
- `--pipe-green` (#00994C) - Neutral elements
- `--outline-black` (#1C1C1C) - Borders/shadows

**Typography**:
- Headers: `.font-mario` (Press Start 2P pixel font)
- Body text: System fonts (default)
- Numbers: `.font-mono` for alignment

## Testing Strategy

**Backend** (`npm test` in `backend/`):
- Jest for unit + integration tests
- Test database transactions (FIFO lot logic)
- Mock Prisma for service tests

**Frontend** (`npm test` in `frontend/`):
- Vitest + React Testing Library
- MSW (Mock Service Worker) for API mocking
- Test hooks with `@testing-library/react-hooks`

## Database Schema Highlights

**Critical Tables**:
- `User` - Auth, virtual SOL balance, tier management
- `Trade` - Complete trade history (paper + real modes)
- `Position` - Current holdings (aggregate view)
- `PositionLot` - Individual purchase lots for FIFO accounting
- `Token` - General token metadata (used by Room pages)
- **`TokenDiscovery`** - PumpPortal memecoin launches (used by Warp Pipes)
- `RewardSnapshot` / `RewardClaim` - Epoch-based rewards

**Important Indexes**:
- `trades`: `userId + timestamp DESC` for recent trade queries
- `positions`: `userId + mint` for position lookups
- `positionLots`: `userId + mint + createdAt ASC` for FIFO consumption
- `tokenDiscovery`: `state`, `stateChangedAt`, `hotScore DESC` for Warp Pipes queries

**Run migrations**: `npm run db:migrate` (applies all pending migrations)

## Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis cache/pub-sub
- `HELIUS_API` - Helius API key (RPC only)
- `SOLANA_RPC_URL` - Fallback Solana RPC
- `JWT_SECRET` - JWT signing secret
- `VSOL_TOKEN_MINT` - Reward token mint (legacy name)
- `REWARDS_WALLET_SECRET` - Reward distribution key

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NEXT_PUBLIC_WS_URL` - Backend WebSocket endpoint

**See**: `backend/.env.example`, `frontend/.env.example`, `ENVIRONMENT_SETUP.md`

## Common Pitfalls

### 1. FIFO Lot Consumption Order
❌ **WRONG**: Consuming lots out of order breaks PnL accuracy
✅ **CORRECT**: Always `orderBy: { createdAt: 'asc' }`

### 2. WebSocket Registration
❌ **WRONG**: Rate limiting before WebSocket routes
✅ **CORRECT**: WebSocket routes first, rate limiting after

### 3. Price Service Initialization
❌ **WRONG**: Starting server before price service
✅ **CORRECT**: `await priceService.start()` before `app.listen()`

### 4. Warp Pipes Data Source
❌ **WRONG**: Using `useTrendingTokens()` for Warp Pipes page
✅ **CORRECT**: Using `useWarpPipesFeed()` for Warp Pipes page

### 5. Floating Point Math
❌ **WRONG**: `const total = price * quantity;`
✅ **CORRECT**: `const total = new Decimal(price).mul(quantity);`

### 6. Mario Theme Colors
❌ **WRONG**: Using Tailwind scales (`bg-red-500`, `text-gray-700`)
✅ **CORRECT**: Using CSS custom properties (`bg-[var(--mario-red)]`)

## Additional Documentation

- **CLAUDE.md** - Comprehensive guide for Claude AI (current file context)
- **ARCHITECTURE.md** - Detailed system architecture
- **WORKFLOW.md** - Development workflow and deployment
- **frontend/MARIO_THEME_DESIGN_SYSTEM.md** - Complete Mario theme guide
- **backend/prisma/schema.prisma** - Full database schema with comments

## Deployment

**Production**: GitHub auto-deploy (recommended)
- **Backend**: Railway (auto-deploy from `main` branch)
- **Frontend**: Vercel (auto-deploy from `main` branch)

**Critical Monorepo Config**:
- Railway Root Directory: `backend`
- Vercel Root Directory: `frontend`

**Manual Deploy** (if needed):
```bash
cd backend && railway up           # Backend to Railway
cd frontend && npx vercel --prod   # Frontend to Vercel
```

**See**: `GITHUB_DEPLOYMENT_SETUP.md` for auto-deploy setup

---

**Remember**: This is a paper trading platform with Mario-themed retro aesthetic. Keep it bright, vibrant, and nostalgic!
