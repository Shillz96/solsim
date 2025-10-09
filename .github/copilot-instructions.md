# SolSim Copilot Instructions

## 🎯 Project Overview
SolSim is a **Solana paper trading simulator** with real-time market data. Users practice trading without financial risk while competing on leaderboards and earning rewards.

**Tech Stack:** Fastify + Prisma + Redis (backend) | Next.js + shadcn/ui + React Query (frontend)

## 🏗 Architecture Patterns

### Backend Structure (Fastify + Prisma)
- **Entry Point:** `backend/src/index.ts` registers all routes with `/api` prefix
- **Routes:** Each route file in `backend/src/routes/` handles specific domain (trade, portfolio, auth, etc.)
- **Services:** Business logic in `backend/src/services/` with clear separation from routes
- **Plugins:** Core functionality in `backend/src/plugins/` (WebSocket, Redis, price streaming)
- **Database:** Prisma schema with `UserTier` enum and virtual SOL balance tracking

### Frontend Structure (Next.js 14 App Router)
- **API Layer:** `frontend/lib/api.ts` centralizes all backend calls with TypeScript contracts
- **Types:** Shared backend types in `frontend/lib/types/backend.ts` mirror Prisma schema
- **Components:** Domain-specific components in `frontend/components/[domain]/`
- **Hooks:** Custom hooks in `frontend/hooks/` for auth, trading, monitoring
- **Providers:** Context stack in `frontend/components/providers.tsx` (Error → Query → Wallet → PriceStream → Theme)

### Real-time Architecture
- **Price Service:** `backend/src/plugins/priceService.ts` manages Helius WebSocket subscriptions
- **WebSocket Plugin:** `backend/src/plugins/ws.ts` handles client price subscriptions with filtering
- **Frontend Stream:** `frontend/lib/price-stream-provider.tsx` manages WebSocket connections with auto-reconnect

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

### Testing
```bash
# Backend unit tests
cd backend && npm test

# Frontend tests (Vitest)
cd frontend && npm test
```

## 🎨 Code Conventions

### API Integration Pattern
- All API calls go through `frontend/lib/api.ts` with typed contracts
- Backend types are imported from `frontend/lib/types/backend.ts`
- Use React Query hooks in `frontend/hooks/use-react-query-hooks.ts` for caching

### Error Handling
- Frontend: `GlobalErrorBoundary` in providers catches React errors
- API errors: Always include meaningful error messages in backend responses
- WebSocket: Auto-reconnection logic with exponential backoff

### Database Patterns
- **Virtual Trading:** All balances stored as `Decimal` type for precision
- **User Tiers:** `EMAIL_USER` (10 SOL) → `WALLET_USER` → `SIM_HOLDER` (100 SOL)
- **Trades:** Store both SOL and USD amounts for accurate P&L calculations

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
- JWT tokens with user tier information
- Wallet verification updates user tier and SOL balance limits

### Trading Engine
- All trades are virtual - no actual blockchain transactions
- Real-time P&L calculation using current market prices
- Position tracking with average buy price and total quantities

## 📁 Critical Files to Understand

### Backend Core
- `src/index.ts` - App setup and route registration
- `src/plugins/priceService.ts` - Real-time price management
- `src/plugins/ws.ts` - WebSocket price subscriptions
- `prisma/schema.prisma` - Database schema with user tiers and trading models

### Frontend Core  
- `lib/api.ts` - Centralized API client with type safety
- `lib/types/backend.ts` - Shared TypeScript types
- `components/providers.tsx` - Provider hierarchy setup
- `lib/price-stream-provider.tsx` - Real-time price streaming

### Configuration
- `backend/.env.example` - Backend environment variables (DB, Redis, RPC endpoints)
- `frontend/.env.local.example` - Frontend environment variables (API URL)

## 🚨 Important Notes

### Environment Setup
- Backend requires PostgreSQL, Redis, and Solana RPC/WebSocket endpoints
- Use Helius for WebSocket price feeds (`HELIUS_RPC_URL`, `HELIUS_WS`)
- Frontend needs `NEXT_PUBLIC_API_URL` pointing to backend

### Development Tips
- Always run Prisma migrations in `backend/` directory
- Use TypeScript strict mode - types are enforced end-to-end
- WebSocket connections auto-manage subscriptions - don't manually subscribe/unsubscribe
- Virtual SOL balances are in actual SOL units, not USD equivalent

### Performance Considerations
- Price updates are filtered by client subscriptions to reduce WebSocket traffic
- Redis caching for price data and token metadata
- React Query for frontend API response caching with real-time invalidation