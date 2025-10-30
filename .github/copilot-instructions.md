# 1UP SOL - AI Coding Agent Instructions

## Project Overview
Solana paper trading game with real-time prices, FIFO accounting, Mario-themed UI. Monorepo: Next.js frontend + Fastify backend.

## Quick Commands
```bash
npm run dev:backend     # :8000
npm run dev:frontend    # :3000
npm run db:migrate      # Prisma migrations
```

## Critical Architecture

### Price Updates (PumpPortal WebSocket)
Frontend → `/ws/prices` → `priceService-optimized.ts` → `pumpPortalStreamService.ts` → broadcasts to clients

**Why PumpPortal-only**: Supports ALL tokens, free WebSocket, no race conditions vs dual-source

### Trade Execution (FIFO)
**CRITICAL**: Always consume oldest lots first with `orderBy: { createdAt: 'asc' }`

### WebSocket Registration Order
```typescript
app.register(websocket)    // 1. WS support
app.register(wsPlugin)     // 2. WS routes
app.register(rateLimiting) // 3. Rate limit AFTER
```

### Warp Pipes Data (TokenDiscovery table)
`/trending` page uses `TokenDiscovery` (PumpPortal data), NOT generic trending APIs

## Key Files
- `backend/src/services/tradeService.ts` - Trade execution
- `backend/src/utils/pnl.ts` - FIFO lot calculations
- `backend/src/plugins/priceService-optimized.ts` - Price caching
- `frontend/hooks/use-react-query-hooks.ts` - Data fetching

## Code Quality

**TypeScript**: No `any`, Zod validation, `Decimal` for money
**React**: ≤150 lines/component, React.memo for lists, Query staleTime: 30s
**Mario Theme**: Always use CSS variables: `bg-[var(--mario-red)]`, never Tailwind scales

**Why PumpPortal-only?**
- Supports ALL Solana tokens (not just Pump.fun): "pump", "raydium", "bonk", "launchlab", "pump-amm", "raydium-cpmm", "auto"
- Lower cost (free WebSocket vs metered Helius RPC)
- Simpler (~200 fewer lines than dual-source)
- No race conditions

## Code Quality

**TypeScript**: No `any`, Zod validation, `Decimal` for money
**React**: ≤150 lines/component, React.memo for lists, Query staleTime: 30s
**Mario Theme**: Always use CSS variables: `bg-[var(--mario-red)]`, never Tailwind scales

**Why PumpPortal-only?**
- Supports ALL Solana tokens (not just Pump.fun): "pump", "raydium", "bonk", "launchlab", "pump-amm", "raydium-cpmm", "auto"
- Lower cost (free WebSocket vs metered Helius RPC)
- Simpler (~200 fewer lines than dual-source)
- No race conditions

**Helius is ONLY for blockchain RPC**: holder counts, token accounts, transaction confirmations. NOT for real-time prices.

## Common Pitfalls

1. **FIFO Lot Order**: Always `orderBy: { createdAt: 'asc' }`
2. **WebSocket Registration**: WebSocket routes BEFORE rate limiting
3. **Warp Pipes Data**: Use `useWarpPipesFeed()` not `useTrendingTokens()`
4. **Floating Point**: Use `new Decimal(price).mul(quantity)`
5. **Mario Colors**: Use `var(--mario-red)` not `bg-red-500`

## Deployment
- **Backend**: Railway (auto-deploy from `main`)
- **Frontend**: Vercel (auto-deploy from `main`)
- Monorepo: Railway root=`backend`, Vercel root=`frontend`
