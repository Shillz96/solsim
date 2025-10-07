# GitHub Copilot Instructions - SolSim Trading Simulator

## Project Overview
SolSim is a full-stack Solana trading simulator with **FIFO accounting** for accurate profit/loss calculations. Node.js/Express backend with Prisma ORM, Next.js/React frontend, real-time WebSocket data.

## Critical Patterns

### FIFO Trading System (NEVER BYPASS)
```typescript
// 1. Always use unified PnL calculator
import { calculatePnL } from '../shared/utils/pnlCalculator.js';
const pnl = calculatePnL({
  quantity: holding.quantity,
  entryPriceSol: holding.entryPrice,   // Price paid per token (SOL)
  currentPriceUsd: marketPrice,        // Current price per token (USD)
  solPriceUsd: currentSolPrice
});

// 2. ALL trades must use atomic transactions with FIFO tracking
await prisma.$transaction(async (tx) => {
  await transactionService.recordBuyTransaction({ ...tradeData }, tx);
  if (action === 'SELL') {
    const fifoResult = await transactionService.calculateFIFOPnL(userId, tokenAddress, sellQuantity, tx);
  }
  // Update holdings + user balance
}, { isolationLevel: 'Serializable' });

// 3. Use TradeService.executeTrade() - never bypass service layer
await tradeService.executeTrade(tradeRequest, userId, currentPrice);
```

### Authentication & Middleware
```typescript
// Always use this route pattern
router.get('/endpoint', authMiddleware, apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);  // Extract authenticated user
    const result = await monitoringService.trackExternalAPICall(
      'ServiceName', 'Operation',
      async () => await someExternalAPI()
    );
    res.json({ success: true, data: serializeDecimals(result) });
  } catch (error) {
    handleRouteError(error, res, 'Context description');
  }
});
```

### External API Monitoring (REQUIRED)
```typescript
// ALL external API calls must be wrapped
const response = await this.monitoringService.trackExternalAPICall(
  'DexScreener',     // Provider name
  'Token Metadata',  // Operation
  async () => await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`)
);
```

## Essential Services

### Core Trading Operations
- **TradeService**: `executeTrade(tradeRequest, userId, currentPrice)` - unified execution
- **TransactionService**: `calculateFIFOPnL(userId, tokenAddress, quantity, tx)` - cost basis
- **PortfolioService**: `getPortfolioWithPnL(userId)` - optimized portfolio queries

### Database Patterns
```typescript
// Simple operations
const result = await prisma.user.update({ where: { id }, data: { ... } });

// Multi-table operations (always use transactions)
await prisma.$transaction(async (tx) => {
  await tx.trade.create({ data: tradeData });
  await tx.holding.upsert({ where: { ... }, create: { ... }, update: { ... } });
}, { isolationLevel: 'Serializable' });
```

### Key Data Types
- **Decimal Precision**: All financial values use `Decimal(65,30)` - serialize with `serializeDecimals()`
- **Core Models**: `User`, `Trade`, `Holding`, `Token`, `TransactionHistory` (FIFO tracking)
- **API Responses**: `{ success: boolean, data?: T, error?: string, meta?: {} }`

## Development Commands

### Backend (from /backend)
```bash
npm run dev           # Development server
npm run build         # TypeScript compilation + Prisma generate
npm test              # Run tests with FIFO validation

# Database operations
npm run db:migrate    # Apply schema changes
npm run db:reset      # Reset dev database
node scripts/dev-tools/reset-dev-user.mjs  # Reset test user to 100 SOL
```

### Frontend (from /frontend) 
```bash
npm run dev           # Next.js dev server (port 3000)
npm run build         # Production build with Radix UI
```

### Deployment
```bash
# Backend to Railway
railway up
railway run npx prisma migrate deploy

# Frontend to Vercel  
vercel --prod
```

## Frontend Patterns

### Radix UI + Tailwind
```typescript
// Hydration-safe components
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
{mounted && <ThemeToggleButton />}

// API hooks with React Query
const { data, loading, error } = useTrendingTokens()
const { data: portfolio } = usePortfolio()

// Responsive design (mobile-first)
<Card className="p-4 md:p-6 lg:p-8">
```

### Authentication Integration
- **Protected Routes**: `AuthWrapper` component with automatic redirects
- **User Context**: `useAuth()` hook for global state
- **Real-time Balance**: `useBalance()` hook with WebSocket updates

### Wallet Integration
```typescript
// Don't include PhantomWalletAdapter - uses Standard Wallet API
const wallets = [
  new SolflareWalletAdapter({ network }),
  new TorusWalletAdapter(),
  // Phantom auto-registered via Standard Wallet
];
```

## Critical Pitfalls
- **FIFO**: All trades MUST record in `TransactionHistory` for cost basis tracking
- **Monitoring**: Wrap ALL external API calls with `monitoringService.trackExternalAPICall()`
- **Decimals**: Always `serializeDecimals()` before API responses to avoid precision loss
- **Transactions**: Use `prisma.$transaction()` for multi-table operations (trades + holdings)
- **Rate Limiting**: Apply `apiLimiter` (100/min) or `tradeLimiter` (30/min) to routes
- **Wallet Adapters**: Don't include PhantomWalletAdapter (conflicts with Standard Wallet API)
- **PnL Calculations**: Only use `calculatePnL()` function - never implement custom logic
- **Auth**: Always apply `authMiddleware` and use `getUserId(req)` for user extraction

## Development Workflows

### Database Operations
```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Reset dev database completely
npm run db:reset

# Seed with sample data
npx prisma db seed
```

### Dev User Management
```bash
# Reset dev-user-1 to clean state (100 SOL, no trades/holdings)
node scripts/dev-tools/reset-dev-user.mjs

# Check all database data
node scripts/dev-tools/check-all-data.mjs
```

### Testing & Building
```bash
# Backend: Run with ESM + Prisma setup
npm test                # All tests
npm run test:watch     # Watch mode

# Frontend: Next.js with Radix UI components
npm run dev            # Development server (port 3000)
npm run build          # Production build
```

## Production Deployment (Railway + Vercel)

### Railway Backend Deployment
**CRITICAL**: SolSim backend is deployed on Railway with PostgreSQL and Redis plugins

```bash
# Deploy to Railway (from backend directory)
railway up

# Database setup after PostgreSQL plugin is connected
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

**Required Railway Environment Variables**:
```bash
# Core (set in Railway dashboard)
NODE_ENV=production
PORT=4002
DATABASE_URL=${{Postgres-ServiceName.DATABASE_URL}}  # Auto-set by PostgreSQL plugin
REDIS_URL=${{Redis.REDIS_URL}}                       # Auto-set by Redis plugin
JWT_SECRET=secure-32-character-minimum-production-secret
FRONTEND_ORIGIN=https://solsim.fun,https://*.vercel.app,https://solsim.vercel.app

# API Keys (existing values)
BIRDEYE_API_KEY=673c073ddd2d4da19ee1748e24796e20
COINGECKO_API_KEY=CG-9Y1EpBG7HSPUtR7tGPMyP7cq
HELIUS_API_KEY=8dc08491-9c29-440a-8616-bd3143a2af87
SOLANA_TRACKER_API_KEY=2eb1ecf9-5430-4a4c-b7cc-297e5f52427f
```

### Vercel Frontend Deployment
```bash
# Deploy frontend (from frontend directory)
vercel --prod

# Required Vercel environment variables:
NEXT_PUBLIC_API_URL=https://lovely-nature-production.up.railway.app
NEXT_PUBLIC_WS_URL=https://lovely-nature-production.up.railway.app
```

### Deployment Files
- **railway.toml**: Main Railway configuration (project root)
- **nixpacks.toml**: Build configuration (backend directory)
- **RAILWAY_DEPLOYMENT_GUIDE.md**: Complete deployment documentation

## Hybrid Trending Token System

### Multi-Source Architecture (`src/routes/solana-tracker.ts`)
**CRITICAL**: Primary trending system combining Birdeye API (70%) with Pump.fun API (30%) for maximum token diversity

```typescript
// Enhanced trending endpoint with Pump.fun integration
router.get('/trending', async (req, res) => {
  // 1. Fetch from Solana Tracker (established tokens)
  // 2. Fetch from Pump.fun (fresh meme coins)
  // 3. Apply quality filters (min $5K market cap, $1K volume)
  // 4. Deduplicate and merge with trend scoring
  // 5. Cache for 5 minutes with NodeCache
});
```

### Frontend Integration (`lib/market-service.ts`)
```typescript
// Always use enhanced Solana Tracker API for trending tokens
const response = await apiClient.get<{ tokens: TrendingToken[] }>(`/api/solana-tracker/trending?${params.toString()}`)
```

## Project-Specific Conventions

### Type Safety & Serialization
- **Shared Types**: Import from `src/shared/types/types.ts` for backend, `lib/types/api-types.ts` for frontend
- **Decimal Handling**: Always serialize `Decimal` fields with `serializeDecimals()` before sending to frontend
- **API Responses**: Use consistent `{ success: boolean, data?: T, error?: string, meta?: {} }` structure

### Service Layer Architecture
- **Portfolio Service**: Use `PortfolioService` class for complex portfolio calculations and optimized queries
- **Business Logic**: Keep route handlers thin - extract complex logic to services in `src/services/`
- **Database Queries**: Prefer batched queries with `include` to avoid N+1 problems

### Environment & Configuration
- **Config Management**: Import from `src/config/environment.ts` - validates required env vars on startup
- **Development**: Set `NODE_ENV=development` for auth bypass and enhanced logging
- **Security**: Production requires secure `JWT_SECRET` (32+ chars), validates against default dev secret

