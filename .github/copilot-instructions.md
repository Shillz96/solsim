# SolSim Copilot Instructions

## 🎯 Project Overview
SolSim is a **Solana paper trading simulator** with real-time market data. Users practice trading without financial risk while competing on leaderboards and earnings rewards.

**Tech Stack:** Fastify + Prisma + Redis (backend) | Next.js + shadcn/ui + React Query (frontend)

## 🚨 CRITICAL UX REQUIREMENT: SOL Equivalents

**MANDATORY PATTERN**: ALL components displaying USD financial values MUST also show SOL equivalents.

**Why**: Like any trading platform, users need to understand values in terms they recognize. In Solana ecosystem, SOL is the reference currency.

### Required Implementation for ALL Financial Displays:

```typescript
// 1. MANDATORY: Import price stream
import { usePriceStreamContext } from "@/lib/price-stream-provider"

// 2. MANDATORY: Helper function (copy to every component)
const formatSolEquivalent = (usdValue: number, solPrice: number): string => {
  if (!solPrice || solPrice === 0) return ''
  const solValue = usdValue / solPrice
  if (solValue >= 1) return `${solValue.toFixed(2)} SOL`
  else if (solValue >= 0.01) return `${solValue.toFixed(4)} SOL`
  else if (solValue >= 0.0001) return `${solValue.toFixed(6)} SOL`
  else return `${solValue.toFixed(8)} SOL`
}

// 3. MANDATORY: Get SOL price
const { prices: livePrices } = usePriceStreamContext()
const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

// 4. MANDATORY: Display pattern
<div>{formatCurrency(usdValue)}</div>
{solPrice > 0 && (
  <div className="text-xs text-muted-foreground">
    {formatSolEquivalent(usdValue, solPrice)}
  </div>
)}
```

**ANY component showing USD values without SOL equivalents is incomplete and must be updated.**

## 🏗 Architecture Patterns

### Backend Structure (Fastify + Prisma)
- **Entry Point:** `backend/src/index.ts` registers all routes with `/api` prefix
- **Routes:** Each route file in `backend/src/routes/` handles specific domain (trade, portfolio, auth, etc.)
- **Services:** Business logic in `backend/src/services/` with clear separation from routes
- **Plugins:** Core functionality in `backend/src/plugins/` (WebSocket, Redis, price streaming)
- **Database:** Prisma schema with `UserTier` enum and virtual SOL balance tracking
- **ES Modules:** Backend uses `.js` extensions in imports despite TypeScript (`import prisma from "../plugins/prisma.js"`)

### Frontend Structure (Next.js 14 App Router)
- **API Layer:** `frontend/lib/api.ts` centralizes all backend calls with TypeScript contracts
- **Types:** Shared backend types in `frontend/lib/types/backend.ts` mirror Prisma schema exactly
- **Components:** Domain-specific components in `frontend/components/[domain]/`
- **Hooks:** Custom hooks in `frontend/hooks/` for auth, trading, monitoring
- **Providers:** Context stack in `frontend/components/providers.tsx` (Error → Query → Wallet → PriceStream → Theme)

### Real-time Architecture
- **Price Service:** `backend/src/plugins/priceService.ts` manages Helius WebSocket subscriptions
- **WebSocket Plugin:** `backend/src/plugins/ws.ts` handles client price subscriptions with filtering
- **Frontend Stream:** `frontend/lib/price-stream-provider.tsx` manages WebSocket connections with auto-reconnect

### Data Modeling Patterns
- **FIFO Trading:** `PositionLot` model tracks cost basis for accurate P&L calculations
- **Virtual Balances:** All SOL amounts stored as `Decimal` type for precision
- **User Tiers:** `EMAIL_USER` (10 vSOL) → `WALLET_USER` → `SIM_HOLDER` (100 vSOL) → `ADMINISTRATOR`
- **Position Tracking:** Separate `Position` and `PositionLot` tables for FIFO lot management

## 🔧 Development Workflows

### Database Changes
```bash
# Backend: Always run in backend/ directory
cd backend
npx prisma migrate dev --name "descriptive-change-name"
npx prisma generate  # Update client types
```

### Running Development
```bash
# Backend (Terminal 1)
cd backend && npm run dev

# Frontend (Terminal 2) 
cd frontend && npm run dev
```

### Testing & Type Checking
```bash
# Backend unit tests
cd backend && npm test

# Frontend tests (Vitest)
cd frontend && npm test

# Type checking (essential before commits)
cd frontend && npm run type-check
```

## 🎨 Code Conventions

### Critical Type Safety Rule
**ALWAYS verify frontend types match backend exactly.** Check `backend/src/services/` interfaces against `frontend/lib/types/backend.ts`. Current alignment:
- `PortfolioPosition`: `mint`, `qty`, `avgCostUsd`, `valueUsd`, `unrealizedUsd`, `unrealizedPercent`
- `TrendingToken`: Backend service interface matches frontend `TrendingToken` type
- `LeaderboardEntry`: Perfect backend/frontend type alignment

### Backend Import Convention
- **ES Modules:** Use `.js` extensions in TypeScript imports: `import prisma from "../plugins/prisma.js"`
- **Module Resolution:** Backend configured for ES2022 modules with Node resolution
- **Route Pattern:** Default export function accepting `FastifyInstance` parameter

### API Integration Pattern
- All API calls go through `frontend/lib/api.ts` with typed contracts
- Backend types imported from `frontend/lib/types/backend.ts`
- Use React Query hooks in `frontend/hooks/use-react-query-hooks.ts` for caching
- Error responses follow consistent `{ error: string }` format

### Database Patterns
- **Decimal Precision:** All financial amounts use Prisma `Decimal` type
- **FIFO Cost Basis:** `PositionLot` table tracks individual purchase lots for accurate P&L
- **Indexing Strategy:** Composite indexes on `[userId, field]` patterns for query optimization
- **Soft Relations:** Some foreign keys use string IDs for flexibility

### Component Structure
- Use shadcn/ui components consistently
- Domain components: `components/trading/`, `components/portfolio/`, etc.
- Shared components: `components/shared/` and `components/ui/`

## 🔍 Key Integration Points

### Price Data Flow
1. **Helius WebSocket** → `priceService.ts` → Redis cache
2. **Backend WebSocket** → Price filtering → Frontend price stream  
3. **Frontend** → Auto-subscribe to viewed tokens → UI updates

### Authentication Flow
- Email/password OR Solana wallet signature verification
- No JWT tokens - simple userId-based authentication
- Wallet verification updates user tier and SOL balance limits via `checkAndUpgradeSIMHolder()`

### Trading Engine
- All trades are virtual - no actual blockchain transactions
- Real-time P&L calculation using current market prices from `priceService`
- FIFO position tracking with `PositionLot` model for cost basis accuracy

## 📁 Critical Files to Understand

### Backend Core
- `src/index.ts` - App setup and route registration
- `src/plugins/priceService.ts` - Real-time price management via Helius
- `src/plugins/ws.ts` - WebSocket price subscriptions with client filtering
- `src/services/portfolioService.ts` - P&L calculations using FIFO methodology
- `prisma/schema.prisma` - Database schema with user tiers and FIFO trading models

### Frontend Core  
- `lib/api.ts` - Centralized API client with complete type safety
- `lib/types/backend.ts` - Shared TypeScript types mirroring backend exactly
- `components/providers.tsx` - Provider hierarchy with error boundaries
- `lib/price-stream-provider.tsx` - Real-time price streaming with auto-reconnect

### Configuration
- `backend/.env.example` - Backend environment variables (DB, Redis, Helius endpoints)
- `frontend/.env.local.example` - Frontend environment variables (API URL)

## 🚨 Important Notes

### Development Tips
- Always run Prisma commands in `backend/` directory
- Backend TypeScript uses ES modules with `.js` import extensions
- WebSocket connections auto-manage subscriptions - avoid manual subscribe/unsubscribe
- Virtual SOL balances are in actual SOL units, not USD equivalent
- **Run `npm run type-check` before commits** - prevents runtime type errors

### Performance Considerations
- Price updates filtered by client subscriptions to reduce WebSocket traffic
- Redis caching for price data and token metadata
- React Query for frontend API response caching with real-time invalidation
- Database indexes optimized for `[userId, field]` query patterns

### Deployment
- Railway deployment via `railway.json` - builds from `backend/` directory
- Frontend deploys separately (Vercel/Netlify pattern)
- Database migrations run automatically in production via `prisma:migrate` script