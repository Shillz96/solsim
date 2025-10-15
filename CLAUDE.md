# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

VirtualSol is a full-stack Solana paper trading platform with real-time price tracking, PnL calculations, leaderboards, and rewards. It uses a monorepo structure with a Next.js frontend and Fastify backend.

## Project Structure

```
VirtualSol/
├── frontend/          # Next.js 14+ (App Router)
├── backend/           # Fastify + Prisma
├── packages/types/    # Shared TypeScript types
└── ARCHITECTURE.md    # Detailed system architecture
```

## Common Commands

### Backend

```bash
# Development
cd backend
npm run dev                # Start dev server with tsx
npm run build             # Build TypeScript to dist/
npm start                 # Run production build

# Database
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Apply migrations (dev)
npm run db:migrate        # Apply migrations (alias)
npm run db:reset          # Reset database
npm run db:seed          # Seed database

# Testing
npm test                  # Run tests with jest
```

### Frontend

```bash
# Development
cd frontend
npm run dev              # Start Next.js dev server
npm run build           # Build for production
npm start               # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run type-check      # TypeScript check (no emit)
npm run format          # Format with Prettier
npm run format:check    # Check Prettier formatting

# Testing
npm test                # Run Vitest
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report
```

### Monorepo Root

```bash
# Install everything
npm run install-workspaces  # Install all workspace dependencies

# Quick commands (from root)
npm install                 # Backend install
npm run build              # Backend build
npm start                  # Backend start
```

## Architecture Patterns

### Backend Service Pattern

**Location**: `backend/src/`

The backend follows a clear routing → service → database pattern:

1. **Routes** (`routes/`) - Define API endpoints, register with Fastify
2. **Services** (`services/`) - Business logic, async/await patterns
3. **Plugins** (`plugins/`) - Shared functionality (auth, redis, websocket, price service)
4. **Utils** (`utils/`) - Helper functions and utilities

Key services:
- `tradeService.ts` - Trade execution and validation
- `portfolioService.ts` - Position management and PnL calculations
- `priceService.ts` / `priceService-v2.ts` - Real-time price streaming via Helius WebSocket
- `rewardService.ts` - VSOL token reward distribution
- `walletTrackerService.ts` - KOL wallet tracking for copy trading

### FIFO Position Tracking

The platform uses strict FIFO (First-In-First-Out) accounting for trade lots:

**Models**: `Position`, `PositionLot`, `RealizedPnL` (see `backend/prisma/schema.prisma`)

**Buy trades** create new `PositionLot` entries with:
- `qtyRemaining` - Amount available to sell
- `unitCostUsd` - Purchase price per token
- `createdAt` - Timestamp for FIFO ordering

**Sell trades** consume lots in chronological order:
1. Query lots ordered by `createdAt ASC`
2. Consume from oldest lots first
3. Calculate realized PnL: `qty * (sellPrice - lot.unitCost)`
4. Update `qtyRemaining` or delete if fully consumed

**See**: `backend/src/utils/pnl.ts`, `backend/src/services/pnl.ts` for implementation

### Real-time Price Service

**Location**: `backend/src/plugins/priceService-v2.ts`

The price service streams real-time swap events from Solana DEXes (Raydium, Pump.fun) via Helius WebSocket:

1. **WebSocket connection** to Helius using `logsSubscribe` method
2. **Program monitoring** - Subscribes to DEX program logs (Raydium V4, CLMM, Pump.fun)
3. **Log parsing** - Extracts swap events from transaction logs
4. **Price calculation** - Converts swap ratios to USD prices using SOL/USDC/USDT pairs
5. **Caching** - Multi-layer cache (memory → Redis → fallback APIs)
6. **Broadcasting** - Publishes to Redis pub/sub and local subscribers

**Fallback price sources** (when WebSocket data unavailable):
- DexScreener API
- Jupiter Price API
- CoinGecko (for SOL price)

### Frontend Data Flow

**Location**: `frontend/`

- **State Management**: TanStack Query (React Query) for server state
- **Real-time Updates**: WebSocket connection to backend price stream
- **Optimistic Updates**: UI updates before server confirmation for better UX
- **Context Providers**: Auth, PriceStream, Theme, Query (see `frontend/lib/`)

**Query Configuration**:
```typescript
{
  staleTime: 30000,        // 30 seconds
  cacheTime: 300000,       // 5 minutes
  refetchOnWindowFocus: false
}
```

**Key Queries**: `usePortfolioQuery`, `useRewardsQuery`, `useLeaderboardQuery`

### Database Schema Highlights

**Core Tables**:
- `User` - Authentication, wallet connection, tier management, virtual SOL balance
- `Trade` - Complete trade history with PnL tracking
- `Position` - Current holdings with FIFO lot tracking
- `PositionLot` - Individual purchase lots for FIFO accounting
- `TransactionHistory` - FIFO transaction ledger
- `Token` - Token metadata with trending metrics (volume, price changes, momentum)
- `RewardSnapshot` / `RewardClaim` - Epoch-based reward distribution

**Important Indexes**:
- `trades`: `userId + timestamp DESC` for recent trade queries
- `positions`: `userId + mint` for position lookups
- `positionLots`: `userId + mint + createdAt ASC` for FIFO lot consumption

### WebSocket Architecture

**Backend** (`backend/src/plugins/ws.ts`, `backend/src/ws/server.ts`):
- Registered BEFORE rate limiting middleware
- Uses `@fastify/websocket` plugin
- Broadcasts price updates to connected clients
- Subscription management for per-token price streams

**Frontend** (`frontend/hooks/usePriceStream.tsx` or similar):
- Establishes WebSocket connection on mount
- Subscribes to tokens in active portfolio
- Updates UI reactively on price changes

## Development Guidelines

### Type Safety

- **End-to-end TypeScript** - Frontend and backend both use strict TS
- **Shared types** - `@virtualsol/types` package or `frontend/lib/types/backend.ts`
- **Runtime validation** - Zod schemas for all API inputs/outputs
- **Never use `any`** - Strong typing required

### Code Quality Rules

- **Components ≤ 150 lines** - Split into smaller files if exceeded
- **One concern per file** - Clear separation of responsibilities
- **React.memo for performance** - Use for table rows, chart components
- **JSDoc for utilities** - All helper functions need documentation

### Validation & Security

- All API routes validate input with Zod schemas
- Prisma ORM prevents SQL injection via parameterized queries
- JWT authentication with `@fastify/jwt`
- Rate limiting via `@fastify/rate-limit`
- CORS configured for specific origins (localhost:3000, virtualsol.fun, Vercel deployments)

### External Service Integration

**Required Environment Variables**:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis cache and pub/sub
- `HELIUS_API` - Helius API key for RPC and WebSocket
- `HELIUS_RPC_URL` / `HELIUS_WS` - Helius endpoints
- `SOLANA_RPC_URL` - Fallback Solana RPC
- `VSOL_TOKEN_MINT` - VSOL token mint address for rewards
- `REWARDS_WALLET_SECRET` - Secret key for reward distribution
- `JWT_SECRET` - JWT signing secret

**External APIs**:
- Helius - Solana RPC + WebSocket for real-time swaps
- DexScreener - Token metadata and price data
- Jupiter - Price quotes and aggregation
- CoinGecko - SOL/USD price reference

## Critical Implementation Notes

### WebSocket Registration Order

WebSocket routes MUST be registered BEFORE rate limiting middleware in `backend/src/index.ts`:

```typescript
// ✅ Correct order
app.register(websocket)
app.register(wsTestPlugin)  // Register WS routes
app.register(wsPlugin)
app.register(rateLimiting)  // Rate limit comes AFTER
```

This prevents rate limiting from interfering with WebSocket upgrade requests.

### FIFO Lot Consumption

When implementing sell trades, ALWAYS consume lots in `createdAt ASC` order:

```typescript
const lots = await prisma.positionLot.findMany({
  where: { userId, mint },
  orderBy: { createdAt: 'asc' }  // CRITICAL: oldest first
});
```

Incorrect ordering breaks PnL accuracy and violates FIFO accounting.

### Price Service Initialization

The price service MUST be started before the Fastify server listens:

```typescript
await priceService.start();  // Start WebSocket connections
app.listen({ port, host: "0.0.0.0" });
```

This ensures prices are available when the first API requests arrive.

### Decimal Precision

Use `Decimal` from Prisma for all financial calculations:

```typescript
import { Decimal } from '@prisma/client/runtime/library';

// ✅ Correct
const totalCost = new Decimal(price).mul(quantity);

// ❌ Wrong - floating point errors
const totalCost = price * quantity;
```

## Testing Strategy

**Backend**: Jest test suite (run with `npm test` in `backend/`)
- Service unit tests
- API integration tests
- Database transaction tests

**Frontend**: Vitest with React Testing Library (run with `npm test` in `frontend/`)
- Component unit tests
- Hook tests
- Integration tests with MSW for API mocking

## Additional Resources

- **ARCHITECTURE.md** - Comprehensive system architecture documentation
- **Cursor Rules** (`.cursor/rules/`) - AI assistant guidelines for architecture, services, code quality
- **README.md** - General project overview and setup instructions
- **Prisma Schema** (`backend/prisma/schema.prisma`) - Complete database schema with comments
