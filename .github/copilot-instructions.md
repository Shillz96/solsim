# GitHub Copilot Instructions - SolSim Trading Simulator

## Project Overview
SolSim is a full-stack Solana trading simulator with real-time market data, built on Node.js/Express backend with Prisma ORM and Next.js/React frontend. The app simulates cryptocurrency trading with virtual SOL balances.

## Architecture & Key Patterns

### Authentication System
- **Unified Auth**: Use `authMiddleware` from `src/lib/unifiedAuth.ts` - supports both JWT production auth and development bypass
- **Development Mode**: Auth bypass enabled via `DEV_AUTH_BYPASS=true` - creates test users with headers `x-dev-user-id` and `x-dev-email`
- **User Extraction**: Always use `getUserId(req)` helper to extract authenticated user ID from requests
- **Error Classes**: Import from `src/lib/errors.ts` (unified) - `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`

### Database Schema & Relationships
- **Core Models**: `User`, `Trade`, `Holding`, `Token` with CASCADE deletions
- **Decimal Precision**: All financial values use `Decimal(65,30)` for precision - serialize with `serializeDecimals()` utility
- **Key Constraints**: `Holding` has unique constraint on `(userId, tokenAddress)`
- **Optimized Indexes**: Use existing composite indexes like `user_trades_recent`, `user_holdings_by_size`

### Error Handling Pattern
```typescript
// Always wrap route handlers with this pattern:
router.get('/endpoint', authMiddleware, apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    // ... business logic
    res.json({ success: true, data: serializeDecimals(result) });
  } catch (error) {
    handleRouteError(error, res, 'Context description');
  }
});
```

### Validation & Rate Limiting
- **Input Validation**: Use `validateQueryParams()` with type schema from `utils/errorHandler.ts`
- **Rate Limiting**: Apply `apiLimiter` (100/min) or `tradeLimiter` (30/min) to routes
- **Constants**: Reference limits and patterns from `config/constants.ts` - `LIMITS.PROFILE_BIO_MAX`, `VALIDATION_PATTERNS.SOLANA_ADDRESS`

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

### Pump.fun Bonding Curve Integration
- **Price Calculation**: `(virtual_sol_reserves / virtual_token_reserves) * SOL_USD_PRICE`
- **Quality Filtering**: Active bonding curves only (`!token.complete`)
- **Trend Scoring**: Fresh tokens get higher base scores (7.5-8.0)
- **API Endpoint**: `https://frontend-api-v3.pump.fun/coins?limit=20&offset=0`

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

### File Upload & Avatar Handling
- **Avatar Upload**: Use `avatarUpload.single('avatar')` middleware with `processAvatar()` utility
- **File Validation**: Apply `validateAvatarFile()` and handle cleanup with `deleteAvatarFile()`
- **Storage**: Files stored in `uploads/avatars/` with UUID naming

### Environment & Configuration
- **Config Management**: Import from `src/config/environment.ts` - validates required env vars on startup
- **Development**: Set `NODE_ENV=development` for auth bypass and enhanced logging
- **Security**: Production requires secure `JWT_SECRET` (32+ chars), validates against default dev secret

### Frontend Integration Points
- **API Client**: Use typed API client from `lib/api-client.ts` with automatic error handling (default: port 4002)
- **Real-time**: WebSocket connection on port 4001 for live price updates
- **Components**: Radix UI primitives with Tailwind styling, custom components in `components/ui/`

## Real-Time WebSocket Architecture

### Price Streaming Service (`src/price-stream.ts`)
- **Enterprise-grade WebSocket server**: Built for hundreds of concurrent users with zero memory leaks
- **Connection Management**: Max 500 connections, 50 subscriptions per client, heartbeat monitoring
- **Rate Limiting**: 100 actions per minute per client with token bucket algorithm
- **Caching Strategy**: Redis-backed with 30s TTL + 10s in-memory cache for optimal performance
- **Message Types**: `subscribe`, `unsubscribe`, `ping/pong`, `price_update`, `price_batch`

### WebSocket Message Flow
```typescript
// Client subscription
{ type: 'subscribe', tokenAddress: 'So11111111111111111111111111111111111111112' }

// Server response - immediate current price
{ type: 'price_update', tokenAddress: '...', price: 142.56, change24h: 5.23, timestamp: Date.now() }

// Batch updates every 2 seconds
{ type: 'price_batch', updates: [...], timestamp: Date.now() }
```

### Configuration Constants
- **Update Interval**: 2s price updates, 30s heartbeat, 60s cleanup cycles
- **Batch Processing**: 20 tokens per batch to respect API limits
- **Compression**: Enabled with deflate (level 6) for messages >1KB
- **Graceful Shutdown**: Closes all connections with 1001 code during server restart

## Trading Simulation & PnL Algorithms

### Master PnL Calculator (`src/shared/utils/pnlCalculator.ts`)
**CRITICAL**: Single source of truth for all PnL calculations - use `calculatePnL()` function everywhere

```typescript
// Standardized PnL calculation
const pnl = calculatePnL({
  quantity: holding.quantity,           // tokens held
  entryPriceSol: holding.entryPrice,   // price paid per token (in SOL)
  currentPriceUsd: marketPrice,        // current price per token (in USD)
  solPriceUsd: currentSolPrice         // current SOL/USD rate
});
```

### Key Financial Formulas
- **Investment Value**: `quantity × entryPriceSol = investedSol`
- **Current Value**: `quantity × currentPriceUsd ÷ solPriceUsd = currentValueSol`
- **PnL Calculation**: `currentValueSol - investedSol = pnlSol`
- **PnL Percentage**: `(pnlSol ÷ investedSol) × 100`

### Trade Execution Pattern
```typescript
// Always use transaction blocks for trade execution
await prisma.$transaction(async (tx) => {
  // 1. Validate user balance/holdings
  // 2. Execute trade record
  // 3. Update holdings (upsert pattern)
  // 4. Update user balance
  // 5. Calculate realized PnL for sells
});
```

### Portfolio Service Architecture
- **Optimized Queries**: Single query with `include` to fetch user + holdings
- **Batch Price Fetching**: Get all token prices in one service call
- **Shared PnL Calculator**: Consistent calculations across all position types
- **Decimal Precision**: Financial values use `Decimal(65,30)` with 8 decimal places for SOL

## Radix UI Frontend Architecture

### Component System Structure
```
components/
├── ui/                 # Radix UI primitives (shadcn/ui)
│   ├── button.tsx     # @radix-ui/react-slot + class-variance-authority
│   ├── dialog.tsx     # @radix-ui/react-dialog + animations
│   ├── card.tsx       # Custom styled containers
│   └── ...            # All Radix primitives
├── navigation/        # App navigation components
├── trading/           # Trading-specific components  
├── portfolio/         # Portfolio display components
├── leaderboard/       # Leaderboard components
└── modals/           # Modal dialogs
```

### Design System Conventions
- **Styling**: Tailwind CSS with CSS variables for theme consistency
- **Theme Provider**: `next-themes` with dark/light mode support + system detection
- **Typography**: Inter (sans), IBM Plex Sans (headings), JetBrains Mono (code/numbers)
- **Animations**: Framer Motion for complex animations, CSS transitions for simple hover states
- **Icons**: Lucide React with consistent sizing (h-4 w-4, h-5 w-5, h-6 w-6)

### Key Frontend Patterns
```typescript
// Hydration-safe theme toggle
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
{mounted && <ThemeToggleButton />}

// API hooks with automatic error handling
const { data, loading, error } = useTrendingTokens()

// Responsive components with mobile-first design
<Card className="p-6 md:p-8 lg:p-12">
```

### Authentication Integration
- **Auth Wrapper**: `AuthWrapper` component provides authentication context
- **Protected Routes**: Automatic redirect to login for unauthenticated users
- **Real-time Balance**: `useBalance()` hook with automatic updates
- **User Context**: Available throughout app via `useAuth()` hook

### State Management Philosophy
- **Server State**: React Query via custom hooks (`usePortfolio`, `useTrades`, etc.)
- **Client State**: React useState for UI state, useContext for global auth
- **Real-time Updates**: WebSocket integration with automatic reconnection
- **Optimistic Updates**: Immediate UI updates with server reconciliation

### Mobile-First Responsive Design
- **Breakpoints**: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- **Navigation**: Desktop navbar + mobile bottom navigation bar
- **Touch Targets**: Minimum 44px touch targets for mobile usability
- **Progressive Enhancement**: Core functionality works without JavaScript

### Next.js Image Configuration (`next.config.mjs`)
**CRITICAL**: Comprehensive external image domain support for token images from diverse sources
- **IPFS Support**: `*.ipfs.nftstorage.link`, `*.ipfs.dweb.link`, wildcard patterns for dynamic IPFS hashes
- **Social Media**: `*.twimg.com` (Twitter), `*.githubusercontent.com` (GitHub), `*.imgur.com`
- **Token Sources**: `thumbnails.padre.gg`, `static.four.meme`, `*.coingecko.com`
- **Remote Patterns**: Wildcard support for dynamic subdomains and paths

## Common Pitfalls
- Don't forget to apply `authMiddleware` to protected routes
- Always serialize Decimal fields before API responses
- Use transaction blocks for multi-table operations (trades + holdings updates)
- Check for existing holdings before creating new ones (use upsert pattern)
- Apply proper rate limiting based on endpoint sensitivity
- **WebSocket**: Always handle connection cleanup to prevent memory leaks
- **PnL Calculations**: Never implement custom PnL logic - use `calculatePnL()` function
- **Hydration**: Use `mounted` state for theme-dependent rendering to prevent SSR mismatches
- **Real-time Data**: Implement proper error boundaries for WebSocket connection failures
- **Trending Tokens**: Use `/api/solana-tracker/trending` for diverse token discovery (not older endpoints)
- **Image Domains**: Add new external domains to `next.config.mjs` when encountering "Invalid src prop" errors