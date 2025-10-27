# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

1UP SOL is a full-stack Solana paper trading game with real-time price tracking, PnL calculations, leaderboards, and XP-based progression. It features a **Mario-themed retro game aesthetic** with vibrant colors, bold borders, and nostalgic design patterns inspired by classic Nintendo games. The platform uses a monorepo structure with a Next.js frontend and Fastify backend.

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
Production oneupsol.fun

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
- `rewardService.ts` - XP and points-based reward distribution
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
- `VSOL_TOKEN_MINT` - Reward token mint address (legacy variable name)
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
- **[docs/theme/MARIO_THEME_DESIGN_SYSTEM.md](docs/theme/MARIO_THEME_DESIGN_SYSTEM.md)** - Complete Mario theme design system and guidelines
- **[docs/theme/THEME_CLEANUP_SUMMARY.md](docs/theme/THEME_CLEANUP_SUMMARY.md)** - Theme migration and cleanup documentation
- **[docs/theme/MODERNIZATION_2025.md](docs/theme/MODERNIZATION_2025.md)** - Comprehensive modernization plan and implementation guide
- **frontend/_archive/MIGRATION_NOTES.md** - Migration history and archived files

## Additional Resources

### Design & Theme
- **[docs/theme/MARIO_THEME_DESIGN_SYSTEM.md](docs/theme/MARIO_THEME_DESIGN_SYSTEM.md)** - Complete Mario theme design system and component patterns
- **[docs/theme/MODERNIZATION_2025.md](docs/theme/MODERNIZATION_2025.md)** - 2025 modernization plan and implementation guide
- **[docs/theme/THEME_CLEANUP_SUMMARY.md](docs/theme/THEME_CLEANUP_SUMMARY.md)** - Theme migration and cleanup documentation
- **frontend/_archive/MIGRATION_NOTES.md** - Theme migration history and archived files

### Development & Architecture
- **[docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)** - Comprehensive system architecture documentation
- **[docs/architecture/API_USAGE_DOCUMENTATION.md](docs/architecture/API_USAGE_DOCUMENTATION.md)** - API endpoints and usage
- **[docs/architecture/TOKEN_PRICE_DISCOVERY_ARCHITECTURE.md](docs/architecture/TOKEN_PRICE_DISCOVERY_ARCHITECTURE.md)** - Price discovery system
- **[docs/guides/WORKFLOW.md](docs/guides/WORKFLOW.md)** - Complete development workflow and deployment guide
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Product roadmap and planned features
- **README.md** - General project overview and setup instructions

### Configuration & Deployment
- **[docs/deployment/ENVIRONMENT_SETUP.md](docs/deployment/ENVIRONMENT_SETUP.md)** - Environment variable configuration guide
- **[docs/deployment/GITHUB_DEPLOYMENT_SETUP.md](docs/deployment/GITHUB_DEPLOYMENT_SETUP.md)** - GitHub auto-deployment setup with Railway/Vercel
- **[docs/deployment/RAILWAY_MIGRATION_GUIDE.md](docs/deployment/RAILWAY_MIGRATION_GUIDE.md)** - Railway deployment guide
- **Prisma Schema** (`backend/prisma/schema.prisma`) - Complete database schema with comments

### Testing & Guides
- **[docs/guides/REAL_TRADING_TESTING_GUIDE.md](docs/guides/REAL_TRADING_TESTING_GUIDE.md)** - Testing real trading features
- **[docs/guides/DATABASE_CLEANUP_GUIDE.md](docs/guides/DATABASE_CLEANUP_GUIDE.md)** - Database maintenance guide

### AI Assistant Guidelines
- **Cursor Rules** (`.cursor/rules/`) - AI assistant guidelines for architecture, services, code quality

For a complete overview of all documentation, see **[docs/README.md](docs/README.md)**

## Mario Theme Development Guidelines

When working on frontend components, follow these Mario theme guidelines to maintain visual consistency across the entire platform.

### CSS Custom Properties (Theme Tokens)

**Always use CSS custom properties for colors** to ensure consistency and maintainability:

```typescript
// ✅ CORRECT - Use CSS custom properties
<div className="bg-[var(--star-yellow)]">
<div className="border-4 border-[var(--outline-black)]">
<div className="text-[var(--mario-red)]">

// ❌ WRONG - Don't use Tailwind color scales
<div className="bg-yellow-400">
<div className="border-gray-900">
<div className="text-red-500">
```

**Available Mario Theme Tokens** (defined in `frontend/app/globals.css`):

```css
--mario-red: #E52521;        /* Mario Red - Primary actions, danger */
--luigi-green: #43B047;      /* Luigi Green - Success, safe states */
--star-yellow: #FFD800;      /* Star Yellow - Highlights, CTAs */
--coin-yellow: #FFD700;      /* Coin Yellow - Gold elements */
--sky-blue: #A6D8FF;         /* Sky Blue - Info, water elements */
--pipe-green: #00994C;       /* Pipe Green - Neutral elements */
--outline-black: #1C1C1C;    /* Outline Black - Borders, shadows */
```

**Common Backgrounds**:
```css
--background: #FFFAE9;       /* Warm Paper Cream - Main background */
--card: #FFFAE9;             /* Card background */
```

### Button Patterns

**CartridgePill Component** - The standard button pattern for 1UP SOL:

```tsx
import { CartridgePill } from "@/components/ui/cartridge-pill"

// Small button (h-9, 14px text)
<CartridgePill
  value="Button Text"
  size="sm"
/>

// Medium button (h-11, 16px text)
<CartridgePill
  value="Button Text"
  size="md"
/>

// Custom colors
<CartridgePill
  value="Wallet Tracker"
  bgColor="var(--sky-blue)"
  size="sm"
/>

// With badge
<CartridgePill
  value="97.18 SOL"
  badgeText="P"
  badgeColor="var(--mario-red)"
/>

// As link
<CartridgePill
  value="Leaderboard"
  href="/leaderboard"
  bgColor="var(--luigi-green)"
/>

// With click handler
<CartridgePill
  value="Trade Now"
  onClick={() => handleTrade()}
/>
```

**CartridgePill Features**:
- **Automatic styling**: Bold 4px black borders, block shadows, rounded corners
- **Hover effects**: Lifts up slightly (-1px translateY) on hover
- **Sizes**: `sm` (h-9) or `md` (h-11)
- **Layouts**: `row` (default) or `col` (stacked label/value)
- **Optional badge**: Red square with white text (customizable)
- **Props**: `value`, `label`, `badgeText`, `href`, `onClick`, `size`, `bgColor`, `badgeColor`, `layout`

**When to use CartridgePill**:
- Navigation buttons (Wallet Tracker, Leaderboard, Trading Mode)
- Primary CTAs
- Mode toggles
- Status indicators
- Quick actions

### Card Patterns

**Standard Mario Card**:
```tsx
<div className="bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-[16px] p-6 hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-[2px] transition-all">
  {/* Card content */}
</div>
```

**Card Anatomy**:
- **Background**: `bg-white` or `bg-[var(--background)]`
- **Border**: `border-4 border-[var(--outline-black)]` (chunky 4px black border)
- **Shadow**: `shadow-[6px_6px_0_var(--outline-black)]` (offset block shadow)
- **Corners**: `rounded-[16px]` or `rounded-[14px]`
- **Hover**: Increase shadow and lift card (`-translate-y-[2px]`)
- **Padding**: `p-6` (1.5rem) or `p-4` (1rem) for compact cards

**Card Variants**:

```tsx
// Compact card
<div className="bg-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-[12px] p-4">

// Interactive card (clickable)
<Link href="/details">
  <div className="bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-[16px] p-6 cursor-pointer hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-[2px] transition-all">
    {/* Card content */}
  </div>
</Link>

// Colored card (for special states)
<div className="bg-[var(--luigi-green)] border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-[16px] p-6 text-white">
  {/* Success card */}
</div>
```

### Typography

**Headers**:
```tsx
// Large hero text
<h1 className="font-mario text-[32px] text-[var(--mario-red)] drop-shadow-[3px_3px_0_var(--outline-black)]">
  1UP SOL
</h1>

// Section headers
<h2 className="font-mario text-[18px] text-[var(--outline-black)]">
  Your Portfolio
</h2>

// Small headers
<h3 className="font-mario text-[14px] text-[var(--outline-black)] uppercase">
  Recent Trades
</h3>
```

**Body Text**:
```tsx
// Regular text (default system font)
<p className="text-[14px] text-[var(--outline-black)]">
  Trade tokens on Solana with virtual SOL
</p>

// Muted text
<span className="text-[12px] text-[var(--outline-black)] opacity-70">
  Updated 5 minutes ago
</span>
```

**Numbers/Prices** (use monospace for alignment):
```tsx
<span className="font-mono text-[16px] font-bold text-[var(--outline-black)]">
  $1,234.56
</span>

// Profit/loss colors
<span className="font-mono text-[16px] font-bold text-[var(--luigi-green)]">
  +$123.45
</span>
<span className="font-mono text-[16px] font-bold text-[var(--mario-red)]">
  -$123.45
</span>
```

### Borders and Shadows

**Border Thickness**:
- **Thin**: `border-2` (2px) - Subtle dividers, list items
- **Medium**: `border-3` (3px) - Standard elements, badges
- **Thick**: `border-4` (4px) - Primary cards, buttons, CTAs

**Block Shadows** (Mario 3D effect):
```tsx
// Small shadow (for compact elements)
shadow-[3px_3px_0_var(--outline-black)]

// Medium shadow (standard cards/buttons)
shadow-[4px_4px_0_var(--outline-black)]

// Large shadow (prominent cards)
shadow-[6px_6px_0_var(--outline-black)]

// Hover shadow (larger than resting state)
hover:shadow-[8px_8px_0_var(--outline-black)]
```

**Always pair shadows with hover lift effect**:
```tsx
className="shadow-[6px_6px_0_var(--outline-black)] hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-[2px] transition-all"
```

### Color Usage Guidelines

**Primary Actions** (Buy, Confirm, Submit):
```tsx
bg-[var(--mario-red)]      // Background
text-white                  // Text color
border-[var(--outline-black)]
```

**Success States** (Profit, Complete, Safe):
```tsx
bg-[var(--luigi-green)]    // Background
text-white                  // Text color
border-[var(--outline-black)]
```

**Highlights** (Important info, CTAs):
```tsx
bg-[var(--star-yellow)]    // Background
text-[var(--outline-black)] // Text color
border-[var(--outline-black)]
```

**Neutral/Info** (Wallet Tracker, Info panels):
```tsx
bg-[var(--sky-blue)]       // Background
text-[var(--outline-black)] // Text color
border-[var(--outline-black)]
```

**Backgrounds**:
```tsx
bg-white                    // Primary surface color
bg-[var(--background)]     // Warm cream (#FFFAE9)
bg-[var(--card)]           // Card surface
```

### Rounded Corners

**Standard Radii**:
- **Small**: `rounded-[10px]` - Small badges, avatars
- **Medium**: `rounded-[12px]` - Compact cards, sm buttons
- **Large**: `rounded-[14px]` - Standard buttons
- **Extra Large**: `rounded-[16px]` - Large cards, containers

**DO NOT use**:
- ❌ `rounded-sm`, `rounded-md`, `rounded-lg` (Tailwind defaults - too generic)
- ❌ `rounded-full` (unless for circular badges/avatars)
- ✅ Use explicit pixel values for consistency

### What NOT to Do

**Color Anti-Patterns**:
- ❌ Don't use Tailwind color scales (`red-500`, `green-600`, `blue-400`)
- ❌ Don't use old neutral colors (`gray-*`, `slate-*`, `zinc-*`)
- ❌ Don't use dark mode classes (`dark:*`)
- ❌ Don't create new colors outside the Mario palette

**Border/Shadow Anti-Patterns**:
- ❌ Don't use thin borders (`border` or `border-1`)
- ❌ Don't use soft shadows (`shadow-sm`, `shadow-md`, `shadow-lg`)
- ❌ Don't use blur shadows (no blur in Mario theme)

**Typography Anti-Patterns**:
- ❌ Don't use pixel font (`.font-mario`) for body text (hard to read)
- ❌ Don't use pixel font for long paragraphs
- ❌ Don't mix font families within the same component

### Quick Reference

**Button**: Use `<CartridgePill>` component
**Card**: `border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-[16px]`
**Hover**: Add shadow + lift (`hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-[2px]`)
**Colors**: Always use `var(--mario-red)`, `var(--luigi-green)`, etc.
**Borders**: Use `border-3` or `border-4` (never `border-1`)

For complete design system documentation, see `frontend/MARIO_THEME_DESIGN_SYSTEM.md`.
