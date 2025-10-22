# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

1UP SOL (formerly VirtualSol) is a full-stack Solana paper trading platform with real-time price tracking, PnL calculations, leaderboards, and rewards. It features a **Mario-themed retro game aesthetic** with vibrant colors, bold borders, and nostalgic design patterns. The platform uses a monorepo structure with a Next.js frontend and Fastify backend.

## Project Structure

```
SolSim/ (1UP SOL)
├── frontend/          # Next.js 14+ (App Router) - Mario-themed UI
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
# Development (run in separate terminals)
npm run dev:backend         # Start backend dev server
npm run dev:frontend        # Start frontend dev server

# Building
npm run build:backend       # Build backend
npm run build:frontend      # Build frontend
npm run build              # Build both

# Testing
npm run test:backend        # Run backend tests
npm run test:frontend       # Run frontend tests
npm test                   # Run all tests

# Database (shortcuts)
npm run db:migrate          # Apply migrations
npm run db:generate         # Generate Prisma client
npm run db:studio          # Open Prisma Studio

# Deployment (GitHub auto-deploy recommended, see GITHUB_DEPLOYMENT_SETUP.md)
npm run deploy:backend      # Manual: Deploy backend to Railway
npm run deploy:frontend     # Manual: Deploy frontend to Vercel (production)

# Cleaning
npm run clean              # Remove all node_modules and build artifacts
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
- **Context Providers**: Auth, PriceStream, Theme (light mode only), Query (see `frontend/lib/`)
- **Design System**: Mario-themed retro aesthetic with OKLCH colors and Display-P3 support

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

## Git Workflow & Deployment

### Branch Strategy

The project uses a three-branch workflow for safe development:

- **`dev`** - Active development branch (daily work happens here)
- **`staging`** - Pre-production testing (merge from dev before production)
- **`main`** - Production only (deploy only after staging verification)

**Development Flow**:
```bash
# Daily work on dev
git checkout dev
git add .
git commit -m "feat: your feature"
git push origin dev  # No deployment

# Test on staging
git checkout staging
git merge dev
git push origin staging  # Auto-deploys to staging (if GitHub linked)

# Deploy to production
git checkout main
git merge staging
git push origin main  # Auto-deploys to production (if GitHub linked)
```

### Deployment

**Recommended:** Link GitHub to Railway and Vercel for automatic deployments.

**Critical Configuration for Monorepo**:
- Railway Root Directory: `backend`
- Vercel Root Directory: `frontend`

**Manual Deployment** (if not using GitHub auto-deploy):
```bash
# Backend to Railway
cd backend && railway up

# Frontend to Vercel
cd frontend && npx vercel --prod
```

See **GITHUB_DEPLOYMENT_SETUP.md** for complete auto-deployment configuration.

### Environment Setup

All environment variables are documented in **ENVIRONMENT_SETUP.md**.

**Backend** (`.env`):
- Database, Redis, Solana RPC, JWT secrets, API keys

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL` - Backend API endpoint
- `NEXT_PUBLIC_WS_URL` - Backend WebSocket endpoint

**Important**: Never commit `.env` files. Only `.env.example` templates are tracked.

## 2025 Modernization & Mario Theme

1UP SOL has been modernized with cutting-edge web platform features and a complete Mario-themed redesign:

### Mario Theme Design System
- **Branding**: 1UP SOL with Mario retro game aesthetic
- **Light Mode Only**: No dark mode support - bright, vibrant colors on white backgrounds
- **Color Palette**: Mario Red, Luigi Green, Star Yellow, Coin Yellow, Sky Blue, Pipe Green
- **OKLCH Colors**: Perceptually uniform color system with Display-P3 wide gamut support
- **Typography**: Press Start 2P pixel font for headers, system fonts for body text
- **Components**: Bold 3-4px borders, 3D block shadows, flat design aesthetic
- **Design System**: See `frontend/MARIO_THEME_DESIGN_SYSTEM.md` for complete documentation

### View Transitions API
- **Enabled in** `frontend/next.config.mjs` (`experimental.viewTransition: true`)
- **Customized in** `frontend/app/globals.css` (smooth fade transitions)
- **Browser support**: Chrome 111+, Safari 18+, Firefox 129+
- **Fallback**: Instant navigation (no animation)

### Display-P3 Wide-Gamut Colors
- **OKLCH base colors** - Perceptually uniform on all displays
- **P3 enhancements** - Vivid Mario colors on modern displays (MacBooks, iPhones, iPads)
- **Defined in** `frontend/app/globals.css` (`@media (color-gamut: p3)`)
- **Automatic fallback** - Works on sRGB displays seamlessly
- **Chroma boost**: 20-30% more vibrant on P3-capable displays

### Tailwind v4 CSS Theme
- **Theme tokens** - Defined in `frontend/app/theme.css` using `@theme` syntax
- **CSS-first** - No JavaScript build step for tokens
- **Works everywhere** - Both Tailwind utilities AND raw CSS custom properties
- **P3 enhancement** - Automatically upgrades on capable displays
- **Mario colors** - All theme colors defined in `tailwind.config.js`

### Theme Consistency
- **100% Mario theme** - All components use consistent Mario-themed styling
- **Zero dark mode** - All dark mode references removed for simplicity
- **No old colors** - All gray/slate/zinc colors migrated to Mario pipe-* colors
- **Archived themes** - Old theme files archived in `frontend/_archive/`

### Rollback Safety
- **Backup branch**: `pre-modernization-2025-backup` (remote + local)
- **Rollback guide**: See `ROLLBACK_GUIDE.md` for detailed recovery procedures
- **Easy revert**: `git checkout pre-modernization-2025-backup` restores everything

### Theme Documentation
- **MARIO_THEME_DESIGN_SYSTEM.md** - Complete Mario theme design system and guidelines
- **THEME_CLEANUP_SUMMARY.md** - Theme migration and cleanup documentation
- **MODERNIZATION_2025.md** - Comprehensive modernization plan and implementation guide
- **ROLLBACK_GUIDE.md** - Emergency recovery procedures
- **_archive/MIGRATION_NOTES.md** - Migration history and archived files

## Additional Resources

### Design & Theme
- **frontend/MARIO_THEME_DESIGN_SYSTEM.md** - Complete Mario theme design system and component patterns
- **frontend/THEME_CLEANUP_SUMMARY.md** - Theme migration and cleanup documentation
- **frontend/_archive/MIGRATION_NOTES.md** - Theme migration history and archived files

### Development & Architecture
- **MODERNIZATION_2025.md** - 2025 modernization plan and implementation guide
- **ROLLBACK_GUIDE.md** - Emergency rollback and recovery procedures
- **WORKFLOW.md** - Complete development workflow and deployment guide
- **QUICK_START.md** - Quick reference for common commands
- **ARCHITECTURE.md** - Comprehensive system architecture documentation
- **README.md** - General project overview and setup instructions

### Configuration & Deployment
- **ENVIRONMENT_SETUP.md** - Environment variable configuration guide
- **GITHUB_DEPLOYMENT_SETUP.md** - GitHub auto-deployment setup with Railway/Vercel
- **Prisma Schema** (`backend/prisma/schema.prisma`) - Complete database schema with comments

### AI Assistant Guidelines
- **Cursor Rules** (`.cursor/rules/`) - AI assistant guidelines for architecture, services, code quality

## Mario Theme Development Guidelines

When working on frontend components, follow these Mario theme guidelines:

### Color Usage
- **Primary Actions**: Use `bg-mario-red-500` for Buy buttons and CTAs
- **Success States**: Use `bg-luigi-green-500` or profit green `#00ff85`
- **Highlights**: Use `bg-star-yellow-500` or `bg-coin-yellow-500`
- **Backgrounds**: Use `bg-white`, `bg-sky-50`, or `bg-sky-100`
- **Neutral Elements**: Use `bg-pipe-*`, `text-pipe-*`, `border-pipe-*`

### Typography
- **Headers**: Use `.font-mario` (Press Start 2P pixel font) with text shadows
- **Body Text**: Use system fonts (default)
- **Numbers/Prices**: Use `.font-mono` for alignment

### Components
- **Cards**: Use `.mario-card` with bold borders (3-4px)
- **Buttons**: Use `.mario-btn` with 3D block shadows
- **Borders**: Use `border-3` or `border-4` for Mario aesthetic
- **Shadows**: Use `shadow-mario` for 3D block effect
- **Rounded Corners**: Use `rounded-lg` or `rounded-xl` (not too soft)

### What NOT to Do
- ❌ Don't use dark mode classes (`dark:*`)
- ❌ Don't use old color scales (`gray-*`, `slate-*`, `zinc-*`)
- ❌ Don't use thin borders (< 2px)
- ❌ Don't use soft shadows (use 3D block shadows)
- ❌ Don't use pixel font for body text (hard to read)
- ❌ Don't create new color variants outside Mario palette

### Testing Your Changes
- Test on both sRGB and Display-P3 capable displays if possible
- Ensure WCAG AA contrast ratios (4.5:1 for text, 3:1 for large text)
- Check that components look good on white backgrounds
- Verify bold borders render correctly
- Test hover and active states

For complete design system documentation, see `frontend/MARIO_THEME_DESIGN_SYSTEM.md`.
