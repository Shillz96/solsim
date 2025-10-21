# API Usage Documentation - VirtualSol Backend

## Overview

VirtualSol uses multiple APIs for price discovery, token metadata, and blockchain interaction. This document details each API, its purpose, costs, and optimization strategies.

---

## 🔴 CRITICAL APIs (Required for Operation)

### 1. **Helius RPC/WebSocket**
**Purpose**: Primary Solana RPC and real-time DEX monitoring
**Endpoints**:
- RPC: `https://mainnet.helius-rpc.com/?api-key={API_KEY}`
- WebSocket: `wss://mainnet.helius-rpc.com/?api-key={API_KEY}`

**Usage**:
- Transaction submission (trades)
- Account queries (wallet balances)
- Real-time swap monitoring via `logsSubscribe`
- Token metadata fetching

**Cost**:
- Developer Plan: FREE (10M credits/month, 50 req/s)
- WebSocket `logsSubscribe`: NO CREDIT COST (standard API)

**Why We Need It**:
- Most reliable Solana RPC provider
- WebSocket monitoring triggers price refreshes
- Free tier sufficient for our needs

---

### 2. **PostgreSQL Database** (Supabase/Railway)
**Purpose**: Core application data storage
**Connection**: `DATABASE_URL` environment variable

**Stores**:
- User accounts and authentication
- Trade history and positions
- FIFO lot tracking
- Leaderboard data
- Token metadata cache

**Cost**:
- Railway: ~$5-10/month for starter
- Supabase: Free tier available

**Why We Need It**: Essential for application state

---

### 3. **Redis Cache** (Railway/Upstash)
**Purpose**: High-performance caching and pub/sub
**Connection**: `REDIS_URL` environment variable

**Usage**:
- Price caching (60-second TTL)
- Session storage
- Pub/sub for real-time updates
- Rate limiting counters

**Cost**:
- Railway: ~$5/month
- Upstash: Free tier (10k commands/day)

**Why We Need It**: Critical for performance and real-time features

---

## 💰 PRICE DISCOVERY APIs (Multiple Sources for Redundancy)

### 4. **PumpFun API** ✅ PRIMARY for Pump.fun Tokens
**Purpose**: Direct access to pump.fun bonding curve prices
**Endpoint**: `https://frontend-api.pump.fun/coins/{mint}`

**Usage Pattern**:
```
If token ends with "pump" → Try PumpFun FIRST
Otherwise → Try as last resort
```

**Response Time**: 2-3 seconds
**Rate Limit**: NONE (unlimited)
**Cost**: **FREE**

**Data Provided**:
- Bonding curve reserves (virtual_sol_reserves, virtual_token_reserves)
- Market cap
- Token metadata
- Graduation status

**Why We Need It**:
- ONLY source for brand new pump.fun tokens
- 77% faster than trying other APIs first
- No rate limits

---

### 5. **PumpPortal WebSocket** ✅ Real-time Pump.fun Prices
**Purpose**: Real-time trade streaming for pump.fun tokens
**Endpoint**: `wss://pumpportal.fun/api/data`

**Subscriptions**:
```javascript
// New token creation
{ method: "subscribeNewToken" }

// Specific token trades
{ method: "subscribeTokenTrade", keys: ["TOKEN_MINT"] }
```

**Cost**: **FREE**
**Rate Limit**: NONE

**Why We Need It**:
- Instant price updates (sub-second)
- No polling required
- Catches new token launches immediately

---

### 6. **DexScreener API** ⭐ PRIMARY for Established Tokens
**Purpose**: Aggregated DEX prices from all Solana DEXes
**Endpoints**:
- Single: `https://api.dexscreener.com/latest/dex/tokens/{mint}`
- Batch: `https://api.dexscreener.com/tokens/v1/solana/{mints}` (up to 30)

**Usage Pattern**:
```
For non-pump tokens → Try DexScreener FIRST
For portfolio queries → Use batch endpoint
```

**Response Time**: 3-5 seconds
**Rate Limit**: 300 req/min
**Cost**: **FREE**

**Data Provided**:
- Price from highest liquidity pair
- 24h change percentage
- Trading volume
- Market cap

**Why We Need It**:
- Best aggregator for tokens on Raydium/Orca
- Batch endpoint reduces API calls by 30x
- Most reliable for established tokens

---

### 7. **Jupiter Price API v6** 🔄 FALLBACK
**Purpose**: Backup price source when DexScreener fails
**Endpoint**: `https://price.jup.ag/v6/price?ids={mint}`

**Response Time**: 3-5 seconds
**Rate Limit**: 600 req/min
**Cost**: **FREE**

**Special Behavior**:
- Returns 204 No Content for non-existent tokens (immediate negative cache)

**Why We Need It**:
- Fallback when DexScreener is down
- Different data sources might have prices others don't
- 204 response instantly identifies non-existent tokens

---

### 8. **CoinGecko API** 📊 SOL Price Reference
**Purpose**: Authoritative SOL/USD price
**Endpoint**: `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`

**Update Frequency**: Every 30 seconds
**Rate Limit**: Generous free tier
**Cost**: **FREE**

**Why We Need It**:
- Most accurate SOL price across exchanges
- Includes 24h change data
- Industry standard reference

---

## 🎮 ADDITIONAL FEATURES

### 9. **DexScreener Token Profiles** (Optional)
**Purpose**: Enhanced token metadata and trending data
**Endpoint**: `https://api.dexscreener.com/token-profiles/v1/latest/solana/{mint}`

**Provides**:
- Token description
- Social links
- Icon/image URLs

**Cost**: **FREE**
**Usage**: On-demand when displaying token details

---

### 10. **Wallet Tracker APIs** (KOL Following)
**Purpose**: Track professional trader wallets

**Current Implementation**:
- Manual wallet addition
- Trade monitoring via Helius WebSocket

**Potential Enhancements**:
- Birdeye API for top traders
- Step Finance for wallet analytics
- Nansen Connect for labeled wallets

---

## 📉 API CALL FLOW

### For Pump.fun Tokens (ending in "pump"):
```
1. PumpFun API (2-3s) ✅
   ↓ (if not found - graduated?)
2. DexScreener API (3-5s)
   ↓ (if not found)
3. Jupiter API (3-5s)
   ↓ (if not found)
4. Negative Cache (2 min TTL)
```

### For Regular Tokens:
```
1. DexScreener API (3-5s) ✅
   ↓ (if not found)
2. Jupiter API (3-5s)
   ↓ (if not found)
3. PumpFun API (2-3s) - last resort
   ↓ (if not found)
4. Negative Cache (10 min TTL)
```

---

## 🛡️ OPTIMIZATION STRATEGIES

### 1. **Multi-Layer Caching**
```
Memory (LRU) → Redis → External API
   ↓              ↓           ↓
  <1ms          <5ms      2-8 sec
```

### 2. **Request Coalescing**
- Multiple requests for same token share single API call
- Reduces duplicate requests by 50-90%

### 3. **Batch Fetching**
- Portfolio queries use DexScreener batch endpoint
- 30 tokens in 1 call vs 30 individual calls

### 4. **Circuit Breakers**
- Prevent cascade failures
- Stop wasting credits on down APIs
- Auto-recovery after timeout

### 5. **Negative Caching**
- Tokens that don't exist cached for 2-10 minutes
- Prevents repeated lookups
- Dynamic TTL based on token type

### 6. **Stale-While-Revalidate**
- Return cached price immediately
- Refresh in background
- Zero perceived latency

---

## 💵 COST ANALYSIS

| Service | Monthly Cost | Usage | Notes |
|---------|--------------|-------|-------|
| **Helius RPC** | $0 | 10M credits | Developer plan sufficient |
| **PumpFun API** | $0 | Unlimited | No rate limits |
| **PumpPortal WS** | $0 | Unlimited | Real-time streaming |
| **DexScreener** | $0 | 300 req/min | Free tier |
| **Jupiter** | $0 | 600 req/min | Free tier |
| **CoinGecko** | $0 | ~3k req/day | Well within limits |
| **PostgreSQL** | $5-10 | Production DB | Railway/Supabase |
| **Redis** | $0-5 | Caching | Free tier usually enough |

**Total: $5-15/month** (just for database/Redis hosting)

---

## 🚫 APIS TO REMOVE/AVOID

### Not Needed:
1. **Birdeye API** - Expensive, DexScreener provides similar data
2. **Helius DAS API** - Enhanced API not needed, standard works
3. **Pyth Network** - For derivatives, not spot trading
4. **Chainlink Oracles** - For DeFi protocols, overkill for us
5. **QuickNode** - Helius is sufficient and cheaper

### Deprecated:
1. **Jupiter Price API v4** - Use v6 instead
2. **Serum DEX** - Defunct after FTX collapse

---

## 🔍 ERROR HANDLING

### Expected Errors (Don't Log):
- 404 Not Found - Token doesn't exist
- 204 No Content - Jupiter saying token doesn't exist
- AbortError - Timeout (normal for low liquidity)
- Circuit breaker OPEN - Protecting against failures

### Unexpected Errors (Log for Debugging):
- 500 Internal Server Error
- 429 Rate Limit (shouldn't happen with our limits)
- Network failures (DNS, connection refused)
- Invalid responses (malformed JSON)

---

## 📊 MONITORING & METRICS

### Key Metrics to Track:
1. **Cache Hit Rate** - Should be >90%
2. **API Response Times** - Pump.fun <3s, others <5s
3. **Circuit Breaker Trips** - Should be rare
4. **Negative Cache Size** - Should stabilize <2000 entries
5. **WebSocket Disconnections** - Should auto-reconnect

### Log Aggregation:
- Use Railway logs for production monitoring
- Filter by: "PumpPortal", "DexScreener", "Jupiter"
- Watch for patterns in failures

---

## 🚀 FUTURE ENHANCEMENTS

### Potential Additions:
1. **Helius Webhooks** - For transaction notifications
2. **Magic Eden API** - For NFT rewards integration
3. **Tensor API** - Advanced NFT analytics
4. **Solscan API** - Enhanced transaction history

### Not Recommended:
1. **Running own RPC node** - Expensive, Helius is better
2. **Direct blockchain parsing** - Complex, use APIs instead
3. **Custom indexers** - Maintenance burden

---

## 📝 ENVIRONMENT VARIABLES

### Required:
```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Helius (CRITICAL)
HELIUS_API=your-api-key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
HELIUS_WS=wss://mainnet.helius-rpc.com/?api-key=...

# Auth
JWT_SECRET=random-secret-key
```

### Optional:
```env
# Solana (fallback)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Analytics (future)
POSTHOG_API_KEY=...
MIXPANEL_TOKEN=...
```

---

## 🎯 CONCLUSION

VirtualSol's API strategy prioritizes:
1. **Cost Efficiency** - Everything is FREE
2. **Redundancy** - Multiple price sources
3. **Performance** - Aggressive caching, smart routing
4. **Reliability** - Circuit breakers, fallbacks

The PumpFun + PumpPortal integration specifically solves the "new memecoin problem" by providing instant access to pump.fun prices without waiting for DEX aggregators to index them.

Total external API cost: **$0/month** (only pay for hosting)