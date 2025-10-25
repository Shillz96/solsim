# VirtualSol Backend

Backend API for [VirtualSol](https://virtualsol.fun), a Solana paper trading simulator that allows users to practice trading tokens with virtual SOL without risking real money.

## 🚀 Features

- **Paper Trading System** - Simulate buy/sell orders on Solana tokens
- **Real-time Price Feeds** - Live price updates via Helius WebSocket integration
- **Portfolio Management** - Track positions, PnL, and trading performance
- **FIFO Cost Basis** - Accurate profit/loss calculations using first-in-first-out accounting
- **Leaderboards** - Competitive rankings based on trading performance
- **Trending Tokens** - Discover popular tokens based on trading activity
- **Reward System** - Earn VSOL tokens based on trading activity and performance
- **Authentication** - Support for email/password and Solana wallet sign-in
- **User Tiers** - Different balance limits based on VSOL token holdings

## 🛠 Technology Stack

- **Framework**: [Fastify](https://fastify.io/) - Fast and low overhead web framework
- **Database**: PostgreSQL with [Prisma](https://www.prisma.io/) ORM
- **Cache**: Redis for caching and pub/sub messaging
- **Real-time**: WebSocket connections for live price updates
- **Blockchain**: Solana integration via [Helius](https://helius.dev/) RPC
- **APIs**: DexScreener, Jupiter for token data fallbacks
- **Testing**: Jest for unit and integration tests

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis instance
- Helius API key (for Solana RPC access)

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp env.example .env
```

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/virtualsol

# Redis (for caching and pub/sub)
REDIS_URL=redis://localhost:6379

# Solana RPC (Helius recommended)
SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
HELIUS_WS=wss://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
HELIUS_API=YOUR_HELIUS_API_KEY

# External APIs
DEXSCREENER_BASE=https://api.dexscreener.com
JUPITER_BASE=https://lite-api.jup.ag

# Token Configuration
VSOL_TOKEN_MINT=YourVsolTokenMintAddress
REWARDS_WALLET_SECRET=base58-encoded-secret-key

# Optional
FRONTEND_URL=http://localhost:3000
ADMIN_KEY=your-admin-key-for-protected-endpoints
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Optional: Seed database with test data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:4000`

## 🚀 Deployment

### Railway Deployment (Current Working Setup)

This project deploys successfully on [Railway](https://railway.app) using **Railpack 0.9.0**:

**Build Process:**
```
╭────────────────╮
│ Railpack 0.9.0 │
╰────────────────╯

↳ Detected Node
↳ Using npm package manager  
↳ Found web command in Procfile

Packages: node 20.19.5
Steps:
▸ install: npm ci
▸ build: npm run build
Deploy: npm run railway:start
```

**Build Timeline:**
- Install packages: ~7s
- Build (Prisma + TypeScript): ~5s  
- Docker import: ~6s
- **Total build time: ~52s**

**Deployment Configuration:**

The deployment uses these key files:
- `Procfile` - Defines the web process: `web: npm run railway:start`
- `package.json` - Node.js 20+ engine requirement
- `nixpacks.toml` - Optional Nixpacks configuration (fallback)

**Current Railway Environment Variables:**

```bash
# Core Application
DATABASE_URL=postgresql://...           # PostgreSQL connection
REDIS_URL=redis://...                  # Redis connection
JWT_SECRET=your-jwt-secret             # Authentication
NODE_ENV=production                    # Environment
FRONTEND_URL=https://virtualsol.fun    # CORS configuration

# Solana/Helius Integration  
SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=...
HELIUS_WS=wss://mainnet.helius-rpc.com/?api-key=...
HELIUS_API=your-helius-api-key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...

# External APIs
DEXSCREENER_BASE=https://api.dexscreener.com
JUPITER_BASE=https://lite-api.jup.ag
```

**Deployment Steps:**

1. **Create Railway Service**: Connect GitHub repository
2. **Add Environment Variables**: Set all required variables above  
3. **Deploy**: Railway auto-builds and deploys on push
4. **Monitor**: Check build logs and deploy logs

**Troubleshooting:**

If you encounter deployment issues:
- **Docker Export Hanging**: Create a new Railway service (don't reuse old services)
- **Build Failures**: Ensure all environment variables are properly set
- **WebSocket 401 Errors**: Verify Helius API key and URL formats
- **Database Connection**: Check DATABASE_URL format and database service status

**Known Working Configuration:**
- Railway automatically detects and uses Railpack 0.9.0
- No custom railpack.json or railway.json needed
- Procfile defines the web process: `web: npm run railway:start`
- Build time averages 52 seconds
- Service URL: `https://[service-name].up.railway.app`

The current deployment is stable and builds consistently.

### Environment Variables for Production

Ensure these are set in your Railway dashboard:

```bash
DATABASE_URL=postgresql://...  # PostgreSQL connection string
REDIS_URL=redis://...          # Redis connection string
SOLANA_RPC=https://...         # Helius RPC endpoint
HELIUS_WS=wss://...           # Helius WebSocket endpoint
HELIUS_API=your-api-key       # Helius API key
JWT_SECRET=secure-secret      # JWT signing secret
NODE_ENV=production           # Environment setting
```

## �📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/signup-email` - Email registration
- `POST /api/auth/login-email` - Email login
- `POST /api/auth/wallet/nonce` - Get wallet signing nonce
- `POST /api/auth/wallet/verify` - Verify wallet signature
- `POST /api/auth/profile` - Update user profile

### Trading
- `POST /api/trade` - Execute simulated trade
- `GET /api/trades` - Get recent trades (global feed)
- `GET /api/trades/user/{userId}` - Get user's trade history
- `GET /api/trades/token/{mint}` - Get trades for specific token
- `GET /api/trades/stats` - Get global trade statistics

### Portfolio
- `GET /api/portfolio?userId={userId}` - Get user portfolio

### Market Data
- `GET /api/trending` - Get trending tokens
- `GET /api/search/tokens?q={query}` - Search tokens
- `GET /api/search/token/{mint}` - Get token details
- `GET /api/candles/{mint}` - Get OHLCV candle data

### Leaderboard
- `GET /api/leaderboard?limit={limit}` - Get trading leaderboard

### Rewards
- `POST /api/rewards/claim` - Claim VSOL token rewards
- `GET /api/rewards/claims/{userId}` - Get user's reward claims
- `GET /api/rewards/stats` - Get reward statistics

### Wallet
- `GET /api/wallet/balance/{userId}` - Get virtual SOL balance
- `GET /api/wallet/transactions/{userId}` - Get wallet transactions
- `GET /api/wallet/stats/{userId}` - Get wallet statistics

### WebSocket
- `WS /ws/prices` - Real-time price updates

For complete API documentation, see `openapi.yaml`.

## 🗄 Database Schema

The database uses Prisma with PostgreSQL. Key models:

- **User** - User accounts with tiers and virtual balances
- **Trade** - Individual trade records
- **Position** - Current token holdings
- **TransactionHistory** - FIFO lot tracking for cost basis
- **Token** - Token metadata and metrics
- **RewardClaim** - VSOL token reward claims

See `prisma/schema.prisma` for the complete schema.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- leaderboard.test.ts
```

## 🚀 Production Deployment

### Build

```bash
npm run build
```

### Environment Variables

Ensure all production environment variables are set, particularly:

- `DATABASE_URL` - Production PostgreSQL connection
- `REDIS_URL` - Production Redis connection
- `SOLANA_RPC` - Production Solana RPC endpoint
- `REWARDS_WALLET_SECRET` - Secure wallet for token distribution

### Database Migrations

```bash
npm run prisma:migrate
```

## 📊 Monitoring

The API includes built-in logging with Pino. Key metrics to monitor:

- Trade execution latency
- WebSocket connection count
- Database query performance
- Redis cache hit rates
- Price update frequency

## 🔧 Architecture

### Real-time Price Updates

1. **Helius WebSocket** - Subscribes to Solana program updates
2. **Price Service** - Parses swap events and calculates prices
3. **Redis Pub/Sub** - Distributes price updates
4. **WebSocket API** - Streams prices to frontend clients

### Trading Engine

1. **Trade Validation** - Check user balance and position limits
2. **Price Fetching** - Get current market price from multiple sources
3. **Position Management** - Update holdings using VWAP calculations
4. **FIFO Accounting** - Track cost basis for accurate PnL
5. **Reward Points** - Award points based on trading volume

### User Tiers

- **EMAIL_USER**: 10 SOL virtual balance, basic features
- **WALLET_USER**: Same as email user if no VSOL tokens
- **VSOL_HOLDER**: 100 SOL balance, premium features
- **ADMINISTRATOR**: Platform management access

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

See LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check existing GitHub issues
- Create a new issue with detailed reproduction steps
- Join our Discord community for real-time help