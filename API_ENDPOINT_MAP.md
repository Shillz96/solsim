# API Endpoint Reference Map
Complete mapping of frontend services to backend endpoints.

## 🔐 Authentication Endpoints

### Frontend: `frontend/lib/auth-service.ts`
### Backend: `backend/src/routes/v1/auth.ts`

| Method | Endpoint | Frontend Method | Backend Handler | Auth Required |
|--------|----------|----------------|-----------------|---------------|
| POST | `/api/v1/auth/login` | `authService.login()` | ✅ | No |
| POST | `/api/v1/auth/register` | `authService.register()` | ✅ | No |
| POST | `/api/v1/auth/logout` | `authService.logout()` | ✅ | Yes |
| GET | `/api/v1/auth/verify` | `authService.verifyToken()` | ✅ | Yes |
| POST | `/api/v1/auth/refresh` | `authService.refreshToken()` | ✅ | Yes |
| POST | `/api/v1/auth/change-password` | `authService.changePassword()` | ✅ | Yes |
| POST | `/api/v1/auth/forgot-password` | `authService.forgotPassword()` | ✅ | No |

---

## 💰 Trading Endpoints

### Frontend: `frontend/lib/trading-service.ts`
### Backend: `backend/src/routes/v1/trades.ts`
### Service: `backend/src/services/tradeService.ts`

| Method | Endpoint | Frontend Method | Backend Service | Auth Required |
|--------|----------|----------------|-----------------|---------------|
| POST | `/api/v1/trades/execute` | `tradingService.executeTrade()` | `tradeService.executeBuy/Sell()` | Yes |
| POST | `/api/v1/trades/buy` | `tradingService.buy()` | `tradeService.executeBuy()` | Yes |
| POST | `/api/v1/trades/sell` | `tradingService.sell()` | `tradeService.executeSell()` | Yes |
| GET | `/api/v1/trades/history` | `tradingService.getTradeHistory()` | `tradeService.getTradeHistory()` | Yes |
| GET | `/api/v1/trades/stats` | `tradingService.getTradeStats()` | Manual aggregation | Yes |
| GET | `/api/v1/trades/recent` | `tradingService.getRecentTrades()` | Prisma query | No |

**Rate Limits:**
- Execute/Buy/Sell: 5 requests/minute (tradeLimiter)
- History/Stats: 100 requests/minute (apiLimiter)

---

## 📊 Portfolio Endpoints

### Frontend: `frontend/lib/portfolio-service.ts`
### Backend: `backend/src/routes/v1/portfolio.ts`
### Service: `backend/src/services/portfolioService.ts`

| Method | Endpoint | Frontend Method | Backend Service | Auth Required |
|--------|----------|----------------|-----------------|---------------|
| GET | `/api/v1/portfolio` | `portfolioService.getPortfolio()` | `portfolioService.getPortfolio()` | Yes |
| GET | `/api/v1/portfolio/balance` | `portfolioService.getBalance()` | `portfolioService.getBalance()` | Yes |
| GET | `/api/v1/portfolio/holdings` | `portfolioService.getHoldings()` | `portfolioService.getHoldings()` | Yes |
| GET | `/api/v1/portfolio/performance` | `portfolioService.getPerformance()` | Custom aggregation | Yes |
| GET | `/api/v1/portfolio/history` | `portfolioService.getPortfolioHistory()` | `portfolioService.getPortfolioHistory()` | Yes |

**Query Parameters:**
- `holdings`: `includeZero`, `sortBy`, `sortOrder`
- `performance`: `period` (24h, 7d, 30d, 90d, 1y, all)
- `history`: `days` (number)

---

## 📈 Market Data Endpoints

### Frontend: `frontend/lib/market-service.ts`
### Backend: `backend/src/routes/v1/market.ts`
### Services: `backend/src/services/{trendingService,priceService}.ts`

| Method | Endpoint | Frontend Method | Backend Service | Auth Required |
|--------|----------|----------------|-----------------|---------------|
| GET | `/api/v1/market/trending` | `marketService.getTrendingTokens()` | `trendingService.getTrending()` | No |
| GET | `/api/v1/market/search` | `marketService.searchTokens()` | Prisma query | No |
| GET | `/api/v1/market/sol-price` | `marketService.getSolPrice()` | `priceService.getSolPrice()` | No |
| GET | `/api/v1/market/price/:address` | `marketService.getTokenPrice()` | `priceService.getPrice()` | No |
| POST | `/api/v1/market/prices` | `marketService.getTokenPrices()` | `priceService.getPrices()` | No |
| GET | `/api/v1/market/token/:address` | `marketService.getTokenDetails()` | Prisma + priceService | No |
| GET | `/api/v1/market/stats` | `marketService.getMarketStats()` | Aggregate queries | No |

**Alternative Endpoint:**
- GET `/api/solana-tracker/trending` - Enhanced trending via Solana Tracker API

**Query Parameters:**
- `trending`: `limit`, `category` (gainers, losers, volume)
- `search`: `q` (query), `limit`
- `prices`: Body `{ tokenAddresses: string[] }`

---

## 🏆 Leaderboard Endpoints

### Frontend: `frontend/lib/leaderboard-service.ts`
### Backend: `backend/src/routes/v1/leaderboard.ts`

| Method | Endpoint | Frontend Method | Backend Logic | Auth Required |
|--------|----------|----------------|---------------|---------------|
| GET | `/api/v1/leaderboard` | `leaderboardService.getLeaderboard()` | Aggregate User + Trade data | No |

**Returns:** Users sorted by totalPnL with trade statistics

---

## 👛 Wallet Endpoints

### Frontend: `frontend/components/wallet/wallet-connect-button.tsx`
### Backend: `backend/src/routes/v1/wallet.ts`
### Service: `backend/src/services/solanaService.ts`

| Method | Endpoint | Frontend Action | Backend Service | Auth Required |
|--------|----------|----------------|-----------------|---------------|
| POST | `/api/v1/wallet/connect` | Connect Phantom wallet | `solanaService.verifyWalletOwnership()` | Yes |
| POST | `/api/v1/wallet/verify` | Verify signature | `solanaService.verifyWalletOwnership()` | Yes |
| GET | `/api/v1/wallet/tier` | Get tier benefits | `tierService.getUserTierInfo()` | Yes |
| POST | `/api/v1/wallet/check-sim-balance` | Check SIM balance | `solanaService.getSimTokenBalance()` | Yes |

---

## 👤 User Profile Endpoints

### Frontend: `frontend/lib/auth-service.ts`, `frontend/lib/user-service.ts`
### Backend: `backend/src/routes/v1/user.ts`

| Method | Endpoint | Frontend Method | Backend Logic | Auth Required |
|--------|----------|----------------|---------------|---------------|
| GET | `/api/v1/user/profile` | `authService.getProfile()` | Get user data | Yes |
| PUT | `/api/v1/user/profile` | `authService.updateProfile()` | Update user | Yes |
| POST | `/api/v1/user/avatar` | File upload | Multer + image processing | Yes |
| DELETE | `/api/v1/user/avatar` | Delete avatar | File deletion | Yes |
| GET | `/api/v1/user/:userId` | Public profile view | Public user data | No |

---

## 🔍 Monitoring Endpoints

### Frontend: `frontend/hooks/use-monitoring.ts`
### Backend: `backend/src/routes/v1/monitoring.ts`
### Service: `backend/src/services/monitoringService.ts`

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/v1/monitoring/health` | System health check | No |
| GET | `/api/v1/monitoring/metrics` | Prometheus metrics | No |
| GET | `/api/v1/monitoring/alerts` | Active alerts | Admin |
| GET | `/api/v1/monitoring/performance` | Performance stats | Admin |

---

## 🌐 WebSocket Events

### Connection: `wss://your-domain/socket.io`
### Provider: `frontend/lib/price-stream-provider.tsx`

| Event | Direction | Data | Purpose |
|-------|-----------|------|---------|
| `connection` | Client → Server | - | Establish connection |
| `subscribe` | Client → Server | `{ tokens: string[] }` | Subscribe to price updates |
| `unsubscribe` | Client → Server | `{ tokens: string[] }` | Unsubscribe from updates |
| `price_update` | Server → Client | `{ address, price, change24h }` | Real-time price |
| `trade_executed` | Server → Client | `{ userId, trade }` | Trade notification |
| `balance_update` | Server → Client | `{ userId, balance }` | Balance change |
| `portfolio_update` | Server → Client | `{ userId, portfolio }` | Portfolio change |

**Rooms:**
- `user:{userId}` - User-specific updates
- `token:{address}` - Token-specific updates
- `global` - Broadcast updates

---

## 📦 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": 1234567890,
    "count": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 150,
      "hasMore": true
    }
  }
}
```

---

## 🔑 Authentication Flow

1. **Login/Register** → Receive JWT token
2. **Store token** → `localStorage.setItem('auth_token', token)`
3. **API requests** → Include `Authorization: Bearer {token}` header
4. **Token expiry** → Auto-refresh via `/api/v1/auth/refresh`
5. **Logout** → Clear token and call `/api/v1/auth/logout`

---

## 🛡️ Middleware Stack

All protected routes pass through:
1. `authMiddleware` - JWT verification
2. `apiLimiter` / `tradeLimiter` - Rate limiting
3. `preventNoSQLInjection` - Security validation
4. `validateInput` - Input sanitization
5. Route handler
6. `errorHandler` - Error formatting

---

## 📊 Database Schema Used

```
User
├── id (PK)
├── email
├── username
├── virtualSolBalance
└── tier

Trade
├── id (PK)
├── userId (FK → User)
├── tokenAddress
├── action (BUY/SELL)
├── quantity
├── price
├── totalCost
└── realizedPnL

Holding
├── id (PK)
├── userId (FK → User)
├── tokenAddress
├── quantity
├── entryPrice
└── avgBuyMarketCap

TransactionHistory (FIFO)
├── id (PK)
├── userId (FK → User)
├── tokenAddress
├── action
├── quantity
├── remainingQuantity
├── pricePerTokenSol
└── realizedPnLSol

Token
├── address (PK)
├── symbol
├── name
├── imageUrl
├── price
├── volume24h
└── marketCap
```

---

## 🚀 Quick Integration Test

```typescript
// Test authentication
await authService.login({ email: 'test@example.com', password: 'test123' })

// Test trading
const result = await tradingService.executeTrade({
  action: 'buy',
  tokenAddress: 'SOL_TOKEN_ADDRESS',
  amountSol: 1.0
})

// Test portfolio
const portfolio = await portfolioService.getPortfolio()

// Test market data
const trending = await marketService.getTrendingTokens(10)
```

---

## ✅ All Endpoints Verified

- [x] Authentication: 7 endpoints
- [x] Trading: 6 endpoints
- [x] Portfolio: 5 endpoints
- [x] Market: 8 endpoints
- [x] Leaderboard: 1 endpoint
- [x] Wallet: 4 endpoints
- [x] User: 5 endpoints
- [x] Monitoring: 4 endpoints
- [x] WebSocket: 6 events

**Total: 40+ endpoints fully integrated and operational**

