# VirtualSol.fun Architecture

This document outlines the system architecture, design decisions, and technical implementation of VirtualSol.fun, a Solana paper trading simulator.

## 🏗 System Overview

VirtualSol.fun is a full-stack web application that simulates cryptocurrency trading on the Solana blockchain without real financial risk. Users can practice trading strategies, compete on leaderboards, and earn rewards based on their trading performance.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend     │    │   External      │
│   (Next.js)     │◄──►│   (Fastify)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React/TS      │    │ • REST API      │    │ • Helius RPC    │
│ • Real-time UI  │    │ • WebSocket     │    │ • DexScreener   │
│ • Wallet        │    │ • Trading       │    │ • Jupiter       │
│   Integration   │    │   Engine        │    │ • CoinGecko     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Infrastructure │
                    │                 │
                    │ • PostgreSQL    │
                    │ • Redis Cache   │
                    │ • File Storage  │
                    └─────────────────┘
```

## 🎯 Core Architecture Principles

### 1. **Separation of Concerns**
- Frontend focuses purely on user experience and real-time updates
- Backend handles business logic, data persistence, and external integrations
- Clear API contracts between services

### 2. **Real-time First**
- WebSocket connections for instant price updates
- Optimistic UI updates for better user experience
- Event-driven architecture for responsive interactions

### 3. **Type Safety**
- End-to-end TypeScript implementation
- Shared type definitions between frontend and backend
- Runtime validation with Zod schemas

### 4. **Scalability**
- Stateless backend services for horizontal scaling
- Redis caching for performance optimization
- Efficient database indexing strategies

## 🛠 Technology Stack

### Frontend Stack
```
Next.js 14 (App Router)
├── React 18 + TypeScript
├── Tailwind CSS + shadcn/ui
├── TanStack Query (React Query)
├── React Hook Form + Zod
├── WebSocket Integration
└── Solana Wallet Adapter
```

### Backend Stack
```
Fastify Framework
├── TypeScript + Node.js
├── Prisma ORM + PostgreSQL
├── Redis (Cache + Pub/Sub)
├── WebSocket Support
├── JWT Authentication
└── External API Integration
```

### Infrastructure
```
Database: PostgreSQL 15+
Cache: Redis 7+
External APIs:
├── Helius (Solana RPC + WebSocket)
├── DexScreener (Token Data)
├── Jupiter (Price Quotes)
└── CoinGecko (SOL Price)
```

## 📊 Data Architecture

### Database Schema Overview

```sql
-- Core user and authentication
Users (id, email, walletAddress, tier, virtualSol, ...)
  ├── Trades (id, userId, mint, side, qty, price, ...)
  ├── Positions (id, userId, mint, qty, costBasis, ...)
  ├── TransactionHistory (FIFO lot tracking)
  └── RewardClaims (VSOL token rewards)

-- Token and market data
Tokens (address, symbol, name, metrics, ...)
  └── PriceTicks (real-time price history)

-- Reward system
RewardSnapshots (epoch, totalPoints, poolAmount)
RewardClaims (userId, epoch, amount, status)
```

### Data Flow Patterns

#### 1. **Trade Execution Flow**
```
User Input → Frontend Validation → API Request → Trade Service
     ↓
Position Update ← Database Transaction ← Price Fetch ← External APIs
     ↓
Portfolio Refresh ← WebSocket Broadcast ← Real-time Updates
```

#### 2. **Real-time Price Flow**
```
Helius WebSocket → Price Service → Redis Pub/Sub → Frontend WebSocket
                        ↓
                 Price Cache ← Database Storage
```

## 🔄 System Components

### 1. Frontend Architecture

#### Component Hierarchy
```
App (Layout)
├── Navigation (Header + Bottom Nav)
├── Pages (Next.js App Router)
│   ├── Trading Page
│   │   ├── TradingPanel
│   │   ├── TokenSearch  
│   │   └── TradeHistory
│   ├── Portfolio Page  
│   │   ├── ActivePositions
│   │   ├── PortfolioChart
│   │   └── PnLCard
│   └── Leaderboard Page
├── Modals (Auth, Share, etc.)
└── Providers (Auth, Query, WebSocket)
```

#### State Management Strategy
```typescript
// Server State (React Query)
- API data caching
- Background refetching  
- Optimistic updates
- Error handling

// Client State (React Context)
- Authentication state
- WebSocket connections
- UI preferences
- Modal states
```

### 2. Backend Architecture

#### Service Layer Pattern
```
Routes (API Endpoints)
  ├── Controllers (Request/Response handling)
  ├── Services (Business Logic)
  │   ├── TradeService (Trade execution)
  │   ├── PortfolioService (Position management)
  │   ├── PriceService (Real-time prices)
  │   └── RewardService (VSOL token rewards)
  ├── Utils (Shared utilities)
  └── Plugins (Database, Redis, WebSocket)
```

#### Trading Engine Design
```typescript
interface TradeExecution {
  // 1. Validation Phase
  validateUser(userId: string): Promise<User>
  validateBalance(user: User, cost: Decimal): Promise<void>
  
  // 2. Price Discovery
  getCurrentPrice(mint: string): Promise<PriceTick>
  
  // 3. Trade Processing  
  createTrade(request: TradeRequest): Promise<Trade>
  updatePosition(userId: string, mint: string): Promise<Position>
  
  // 4. FIFO Accounting (for sells)
  processPositionLots(userId: string, mint: string): Promise<PnL>
  
  // 5. Reward Points
  awardTradePoints(userId: string, volume: Decimal): Promise<void>
}
```

## 🔐 Authentication & Security

### Authentication Flow

#### Email/Password Authentication
```
1. User Registration → Password Hashing (bcrypt)
2. Login Request → JWT Token Generation  
3. Token Storage → Frontend localStorage
4. API Requests → JWT Validation Middleware
```

#### Solana Wallet Authentication
```
1. Wallet Connection → Generate Nonce
2. Message Signing → Verify Signature (nacl)
3. Wallet Verification → User Session Creation
4. Tier Upgrade → VSOL Token Balance Check
```

### Security Measures
- **Input Validation**: Zod schemas for all API inputs
- **SQL Injection**: Prisma ORM parameterized queries
- **Rate Limiting**: Fastify rate limiting middleware
- **CORS**: Configured for frontend domain only
- **Environment Variables**: Sensitive data in env files

## 💰 Trading System Architecture

### Position Management (FIFO)

```typescript
// Buy Trade Processing
interface BuyTrade {
  // Create new position lot
  lot = {
    qtyRemaining: tradeQty,
    unitCostUsd: fillPrice,
    createdAt: now()
  }
  
  // Update position VWAP
  newAvgCost = (oldQty * oldAvg + newQty * newPrice) / totalQty
}

// Sell Trade Processing  
interface SellTrade {
  // Consume lots in FIFO order
  lots = getLots(userId, mint).orderBy('createdAt ASC')
  
  for (lot of lots) {
    consumeQty = min(lot.qtyRemaining, remainingToSell)
    realizedPnL += consumeQty * (sellPrice - lot.unitCost)
    lot.qtyRemaining -= consumeQty
    remainingToSell -= consumeQty
  }
}
```

### Portfolio Calculations

```typescript
interface PortfolioMetrics {
  // Real-time position values
  currentValue = position.qty * currentPrice
  
  // Unrealized PnL
  unrealizedPnL = currentValue - costBasis
  
  // Total portfolio value
  totalValue = sum(allPositions.currentValue)
  
  // Combined PnL (realized + unrealized)
  totalPnL = realizedPnL + unrealizedPnL
}
```

## 🏆 Reward System Architecture

### Point Accumulation
```typescript
// Trade-based points
tradePoints = tradeVolumeUsd * pointMultiplier

// Performance bonuses
winRateBonus = (winRate > threshold) ? bonus : 0
volumeBonus = log10(totalVolume) * volumeMultiplier

totalPoints = tradePoints + winRateBonus + volumeBonus
```

### Token Distribution
```typescript
// Weekly reward snapshots
interface RewardEpoch {
  epoch: number                    // Week identifier
  totalPoints: Decimal            // Sum of all user points
  poolAmount: Decimal             // Available VSOL tokens
  
  // Individual allocations
  userShare = userPoints / totalPoints
  userReward = poolAmount * userShare
}

// Claim process
claimReward(userId, epoch, walletAddress) {
  // Validate claim eligibility
  // Create Solana transaction
  // Transfer VSOL tokens to user wallet
  // Update claim status
}
```

## 🌐 Real-time Features

### WebSocket Architecture

#### Price Stream Service
```typescript
class PriceStreamService {
  // Helius WebSocket connection
  private heliusWS: WebSocket
  
  // Price cache for fast lookups
  private priceCache: Map<string, PriceTick>
  
  // Subscriber management
  private subscribers: Set<WebSocket>
  
  // Price update pipeline
  onHeliusMessage(data) → parseSwapEvent() → updateCache() → broadcastToSubscribers()
}
```

#### Frontend WebSocket Integration
```typescript
// WebSocket hook
function usePriceStream() {
  const [connected, setConnected] = useState(false)
  const [prices, setPrices] = useState(new Map())
  
  // Connection management
  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    
    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data)
      if (type === 'price_update') {
        setPrices(prev => new Map(prev.set(data.mint, data)))
      }
    }
    
    return () => ws.close()
  }, [])
  
  // Subscription management
  const subscribe = (mint: string) => {
    ws.send(JSON.stringify({ type: 'subscribe_token', mint }))
  }
}
```

## 🚀 Performance Optimizations

### Database Optimizations
```sql
-- Critical indexes for trading queries
CREATE INDEX trades_user_recent ON trades(userId, createdAt DESC);
CREATE INDEX positions_user_token ON positions(userId, tokenAddress);
CREATE INDEX lots_fifo_order ON position_lots(userId, mint, createdAt ASC);

-- Composite indexes for leaderboard
CREATE INDEX leaderboard_pnl ON users(totalPnlUsd DESC, createdAt);
```

### Caching Strategy
```typescript
// Redis caching layers
interface CacheStrategy {
  // L1: In-memory cache (1-5 seconds)
  priceCache: Map<string, PriceTick>
  
  // L2: Redis cache (30 seconds - 5 minutes)  
  tokenMetadata: RedisCache<TokenMeta>
  userPortfolio: RedisCache<Portfolio>
  leaderboard: RedisCache<LeaderboardEntry[]>
  
  // L3: Database (source of truth)
  postgres: PrismaClient
}
```

### Frontend Optimizations
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // 30 seconds
      cacheTime: 300_000,     // 5 minutes  
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => failureCount < 2
    }
  }
})

// Component optimizations
const MemoizedComponent = React.memo(Component)
const deferredValue = React.useDeferredValue(expensiveValue)
```

## 📱 Deployment Architecture

### Development Environment
```
Local Development:
├── Frontend: localhost:3000 (Next.js dev)
├── Backend: localhost:4000 (Fastify dev)  
├── Database: localhost:5432 (PostgreSQL)
├── Cache: localhost:6379 (Redis)
└── WebSocket: ws://localhost:4000/ws/prices
```

### Production Environment
```
Production Stack:
├── Frontend: Vercel/Netlify (Static deployment)
├── Backend: Railway/Render (Container deployment)
├── Database: Railway PostgreSQL (Managed)
├── Cache: Railway Redis (Managed)  
└── CDN: Cloudflare (Static assets)
```

### CI/CD Pipeline
```yaml
# GitHub Actions workflow
Build & Test:
  - Install dependencies
  - Run TypeScript checks
  - Execute test suites
  - Build production bundles

Deploy:
  - Frontend → Vercel automatic deployment
  - Backend → Railway automatic deployment  
  - Database → Prisma migrations
  - Environment variables → Secure injection
```

## 🔍 Monitoring & Observability

### Application Metrics
```typescript
// Key performance indicators
interface Metrics {
  // Trading metrics
  tradesPerSecond: number
  avgTradeLatency: Duration
  portfolioCalculationTime: Duration
  
  // WebSocket metrics  
  activeConnections: number
  messagesThroughput: number
  reconnectionRate: number
  
  // System metrics
  apiResponseTime: Duration
  databaseQueryTime: Duration
  cacheHitRate: Percentage
}
```

### Error Handling Strategy
```typescript
// Centralized error handling
class ErrorHandler {
  // API errors
  handleApiError(error: Error, context: RequestContext)
  
  // WebSocket errors  
  handleWebSocketError(error: Error, connection: WebSocket)
  
  // Database errors
  handleDatabaseError(error: PrismaError, query: string)
  
  // External service errors
  handleExternalError(error: Error, service: string)
}
```

## 🔮 Future Architecture Considerations

### Scalability Improvements
- **Microservices**: Split monolithic backend into focused services
- **Event Sourcing**: Implement event-driven architecture for trades
- **CQRS**: Separate read/write models for better performance
- **Sharding**: Database partitioning by user or token

### Feature Enhancements
- **Mobile App**: React Native or native mobile applications
- **Advanced Analytics**: Machine learning for trading insights
- **Social Features**: Following traders, copying strategies
- **Multi-chain**: Expand beyond Solana to other blockchains

### Technical Debt & Improvements
- **Testing Coverage**: Increase automated test coverage
- **Documentation**: API documentation with OpenAPI
- **Observability**: Advanced monitoring and alerting
- **Security Audits**: Regular security assessments

---

This architecture supports VirtualSol.fun's current feature set while providing a foundation for future growth and scalability. The modular design enables independent development and deployment of frontend and backend services, while the real-time infrastructure ensures responsive user experiences.
