# Token Price Discovery Architecture

## Overview

VirtualSol uses a **multi-source, priority-based price discovery system** optimized for **brand new pump.fun tokens** (memecoins) while maintaining accuracy for established tokens.

---

## Price Sources (in Priority Order)

### 1. **Pump.fun API** (Priority for new memecoins)
- **URL**: `https://frontend-api.pump.fun/coins/{mint}`
- **When Used**: FIRST for tokens ending in "pump" or suspected pump.fun tokens
- **Why**: Brand new memecoins ONLY exist on pump.fun initially
- **Response Time**: 2-3 seconds
- **Rate Limit**: No rate limit on data API (free)
- **Coverage**: ~95% of new tokens on platform

**Detection Logic**:
```typescript
// Tokens ending in "pump" are pump.fun tokens
mint.endsWith('pump') → Try pump.fun FIRST

// Examples:
// - "9JtmxsqG8AhLeuQZNQ76V17dDEMpp5BNrpTWCBfWpump" ✅
// - "JBASmuEyG2YfXAEj1AptpnMuDivn1DtDZ7caZmtipump" ✅
```

**Price Calculation**:
```typescript
// From bonding curve reserves
const virtualSolReserves = data.virtual_sol_reserves / 1e9;
const virtualTokenReserves = data.virtual_token_reserves / 1e6;
const tokenPriceInSol = virtualSolReserves / virtualTokenReserves;
const tokenPriceInUsd = tokenPriceInSol * solPriceUsd;
```

### 2. **DexScreener API** (Primary for established tokens)
- **URL**: `https://api.dexscreener.com/latest/dex/tokens/{mint}`
- **Batch URL**: `https://api.dexscreener.com/tokens/v1/solana/{addresses}` (up to 30 tokens)
- **When Used**: FIRST for non-pump.fun tokens, SECOND for pump.fun tokens that graduated to Raydium
- **Why**: Best aggregator for DEX liquidity (Raydium, Orca, etc.)
- **Response Time**: 3-5 seconds (8s timeout)
- **Rate Limit**: 300 req/min
- **Coverage**: ~80% of tokens with liquidity

**Use Cases**:
- Tokens that graduated from pump.fun to Raydium
- Established tokens with DEX liquidity
- Tokens with multiple trading pairs

**Batch Optimization**:
- Portfolio service uses batch endpoint for 3+ tokens
- Reduces API calls by 30x (1 call for 30 tokens vs 30 individual calls)

### 3. **Jupiter Price API v6** (Fallback aggregator)
- **URL**: `https://price.jup.ag/v6/price?ids={mint}`
- **When Used**: THIRD if DexScreener fails
- **Why**: Jupiter aggregates prices from multiple DEXes
- **Response Time**: 3-5 seconds (8s timeout)
- **Rate Limit**: 600 req/min
- **Coverage**: ~70% of tokens with liquidity
- **Special Behavior**: Returns 204 No Content for non-existent tokens (immediate negative cache)

**Negative Cache Trigger**:
```typescript
if (response.status === 204) {
  // Token definitely doesn't exist
  negativeCache.set(mint, { timestamp, reason: '204-no-content' });
  return null;
}
```

### 4. **PumpPortal WebSocket** (Real-time streaming)
- **URL**: `wss://pumpportal.fun/api/data`
- **When Used**: Real-time price updates for pump.fun tokens
- **Why**: Instant price updates on every trade
- **Latency**: Sub-second
- **Rate Limit**: None (free WebSocket)
- **Coverage**: All pump.fun tokens in real-time

**Subscription Types**:
```typescript
// New token creation
{ method: "subscribeNewToken" }

// Token-specific trades
{ method: "subscribeTokenTrade", keys: ["MINT_ADDRESS"] }

// Account trades (user wallet)
{ method: "subscribeAccountTrade", keys: ["WALLET_ADDRESS"] }
```

**Event Format**:
```json
{
  "signature": "...",
  "mint": "...",
  "traderPublicKey": "...",
  "txType": "buy",  // or "sell"
  "tokenAmount": 1000000,
  "solAmount": 0.05,
  "timestamp": 1234567890,
  "virtualSolReserves": 30000000000,
  "virtualTokenReserves": 1073000000000000
}
```

### 5. **Helius WebSocket** (DEX monitoring)
- **URL**: `wss://mainnet.helius-rpc.com/?api-key={API_KEY}`
- **When Used**: Monitor ALL DEX swaps for price refresh signals
- **Why**: Free on Developer plan, monitors Raydium + pump.fun + others
- **Method**: `logsSubscribe` (Standard API)
- **Coverage**: All Solana DEXes

**Monitored Programs**:
```typescript
[
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium V4
  "CAMMCzo5YL8w4VFF8KVHrK22GGUQpMpTFb6xRmpLFGNnSm", // Raydium CLMM
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"  // pump.fun
]
```

**Use Case**: Trigger background price refresh when swap detected

### 6. **CoinGecko API** (SOL price reference)
- **URL**: `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd`
- **When Used**: Every 30 seconds for SOL/USD price
- **Why**: Authoritative SOL price for all calculations
- **Rate Limit**: Generous free tier

---

## Price Discovery Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      getPrice(mint)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Check Memory Cache    │
              │ (LRU 5000 entries)    │
              └───────────┬───────────┘
                          │
                  ┌───────┴────────┐
                  │                │
              Fresh (< 10s)    Stale (> 10s)
                  │                │
                  │                ▼
                  │    ┌─────────────────────┐
                  │    │ Stale-While-        │
                  │    │ Revalidate:         │
                  │    │ Return cached,      │
                  │    │ refresh background  │
                  │    └─────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Return cached  │
         │ price          │
         └────────────────┘

If cache miss or too old (> 60s):
                          │
                          ▼
              ┌───────────────────────┐
              │ Check Negative Cache  │
              │ (tokens that failed)  │
              └───────────┬───────────┘
                          │
                  ┌───────┴────────┐
                  │                │
              Hit (< TTL)      Miss / Expired
                  │                │
                  ▼                ▼
         ┌────────────┐   ┌──────────────────┐
         │ Return null│   │ isPumpFunToken() │
         │ (no price) │   │ detection        │
         └────────────┘   └────────┬─────────┘
                                   │
                          ┌────────┴─────────┐
                          │                  │
                    YES (ends in "pump")   NO
                          │                  │
                          ▼                  ▼
            ┌──────────────────────┐  ┌──────────────────┐
            │ 1. Try pump.fun FIRST│  │ 1. Try DexScreener│
            │    ├─ Hit? Return    │  │    ├─ Hit? Return│
            │    └─ Miss? Continue │  │    └─ Miss? Next │
            │                      │  │                  │
            │ 2. Try DexScreener   │  │ 2. Try Jupiter   │
            │    (graduated?)      │  │    ├─ Hit? Return│
            │                      │  │    └─ 204? Cache │
            │ 3. Try Jupiter       │  │                  │
            │                      │  │ 3. Try pump.fun  │
            │ 4. Add to negative   │  │    (last resort) │
            │    cache (2 min TTL) │  │                  │
            └──────────────────────┘  │ 4. Add to negative
                                      │    cache (10 min)│
                                      └──────────────────┘
```

---

## Negative Caching Strategy

**Purpose**: Prevent repeated API calls for tokens that don't exist or have no liquidity

### Dynamic TTL (Time-to-Live)

| Token Type | TTL | Reasoning |
|-----------|-----|-----------|
| **Pump.fun tokens** (`*.pump`) | **2 minutes** | Tokens can gain liquidity quickly; users want to trade new tokens |
| **Other tokens** | **10 minutes** | Established tokens won't appear suddenly; longer cache reduces API spam |

### Cache Entry Structure
```typescript
interface NegativeCacheEntry {
  timestamp: number;
  reason: string; // '404', '204-no-content', 'not-found', etc.
}
```

### When Tokens Are Cached
1. **Jupiter 204 Response** → Immediate cache (token definitely doesn't exist)
2. **All APIs fail** → Cache after trying all sources
3. **DexScreener timeout** → Not cached (could be temporary network issue)

### Cache Bypass
- SELL orders force fresh fetch (bypass negative cache) to handle tokens that gained liquidity
- User-initiated "Refresh Price" button (future enhancement)

---

## Caching Layers (Fastest to Slowest)

### Layer 1: Memory (LRU Cache) - **Instant**
```typescript
priceCache = new LRUCache<string, PriceTick>(5000);
// TTL: Stale after 10s, expired after 60s
```

### Layer 2: Redis Cache - **< 5ms**
```typescript
await redis.setex(`price:${mint}`, 60, JSON.stringify(tick));
// TTL: 60 seconds
```

### Layer 3: External API Fetch - **2-8 seconds**
- Pump.fun: 2-3s
- DexScreener: 3-5s (8s timeout)
- Jupiter: 3-5s (8s timeout)

### Layer 4: Negative Cache - **Instant (null)**
```typescript
negativeCache = new LRUCache<string, NegativeCacheEntry>(2000);
// TTL: 2min (pump.fun) or 10min (others)
```

---

## Real-Time Price Updates

### Trigger: Swap Detection
When Helius WebSocket detects a swap:
1. Parse transaction logs for swap signals
2. Extract involved token mints
3. Add to refresh queue (rate-limited: 1 token/second)
4. Fetch fresh price from appropriate API
5. Update all cache layers
6. Broadcast to connected clients

### Refresh Queue Logic
```typescript
// Rate limiting: 5 seconds minimum between refreshes per token
if (timeSinceLastRefresh < 5000) {
  skip; // Too recent, ignore
}

// Process queue: 1 token per second
refreshQueue.add(mint);
processQueue(1 token/sec);
```

**Why rate-limited?**
- Prevents 429 errors from DexScreener/Jupiter
- A single popular token can trigger 100s of swaps/minute
- We only need 1 price update per 5 seconds max

---

## Circuit Breakers

**Purpose**: Prevent credit waste and cascading failures when external APIs are down

### DexScreener Circuit Breaker
```typescript
Threshold: 5 consecutive unexpected failures
Timeout: 60 seconds OPEN state
States: CLOSED → OPEN → HALF_OPEN → CLOSED
```

### Jupiter Circuit Breaker
```typescript
Threshold: 5 consecutive unexpected failures
Timeout: 60 seconds OPEN state
States: CLOSED → OPEN → HALF_OPEN → CLOSED
```

### Expected vs Unexpected Failures

**Expected (NOT counted)**:
- 404 Not Found
- 204 No Content
- AbortError (timeout)
- "fetch failed" (network timeout)

**Unexpected (counted toward threshold)**:
- 500 Internal Server Error
- 429 Rate Limit (shouldn't happen with our rate limiting)
- Network errors (DNS, connection refused)

---

## Request Coalescing

**Purpose**: Prevent duplicate concurrent requests for the same token

```typescript
// Scenario: 100 users viewing the same portfolio
portfolioService.getPortfolio(userId1); // Fetches price for TOKEN_X
portfolioService.getPortfolio(userId2); // Fetches price for TOKEN_X (duplicate!)

// With coalescing:
pendingRequests.set(mint, fetchPromise);

// Second request returns the SAME promise
if (pendingRequests.has(mint)) {
  return pendingRequests.get(mint); // No duplicate API call!
}
```

**Impact**: Reduces API calls by 50-90% during high traffic

---

## Batch Fetching Optimization

### DexScreener Batch API
**Endpoint**: `/tokens/v1/solana/{address1},{address2},...`
**Max Tokens**: 30 per request

**When Used**:
- Portfolio service (3+ tokens)
- Leaderboard calculations
- Bulk price refresh

**Performance**:
```
Individual: 30 tokens × 5s = 150 seconds
Batch:      30 tokens ÷ 1 call = 5 seconds

Speedup: 30x faster
API calls: 30 → 1 (97% reduction)
```

---

## Stale-While-Revalidate Pattern

**Goal**: Instant response + background freshness

```typescript
if (cachedPrice.age > 10s && cachedPrice.age < 60s) {
  // Return stale cached price immediately (instant UX)
  returnCachedPrice();

  // Refresh in background (no blocking)
  fetchFreshPrice().then(updateCache);
}
```

**Benefits**:
- User sees instant price (no loading spinner)
- Price is refreshed for next request
- Reduces perceived latency to near-zero

---

## Token Type Detection & Routing

### Pump.fun Token Detection
```typescript
function isPumpFunToken(mint: string): boolean {
  // Simple heuristic: pump.fun tokens end with "pump"
  return mint.endsWith('pump');
}
```

**Why This Works**:
- Pump.fun uses vanity address generator
- ~95% of pump.fun tokens end with "pump"
- False positives are rare and harmless (just tries pump.fun API first)

**Examples**:
- `9JtmxsqG8AhLeuQZNQ76V17dDEMpp5BNrpTWCBfWpump` ✅
- `JBASmuEyG2YfXAEj1AptpnMuDivn1DtDZ7caZmtipump` ✅
- `So11111111111111111111111111111111111111112` ❌ (SOL)

### Routing Decision Tree

```
Token Detected
    │
    ├─ Ends with "pump" → Pump.fun Priority
    │     1. Pump.fun API (2-3s)
    │     2. DexScreener (graduated?)
    │     3. Jupiter (fallback)
    │     Negative Cache TTL: 2 minutes
    │
    └─ Other token → DEX Priority
          1. DexScreener (3-5s)
          2. Jupiter (fallback)
          3. Pump.fun (last resort)
          Negative Cache TTL: 10 minutes
```

---

## Performance Metrics

### Before Optimization
| Metric | Value |
|--------|-------|
| Time to price (pump.fun token) | 13+ seconds (timeout chain) |
| API calls per token | 3-5 calls |
| Success rate (new tokens) | ~20% (timeouts) |
| Negative cache hit rate | ~50% |
| Log volume | 500/sec (Railway rate limit) |

### After Optimization (Phase 1 + 2)
| Metric | Value | Improvement |
|--------|-------|-------------|
| Time to price (pump.fun token) | **3 seconds** | **77% faster** |
| API calls per token | **1 call** | **80% reduction** |
| Success rate (new tokens) | **~95%** | **4.75x better** |
| Negative cache hit rate | **~95%** | **+45%** |
| Log volume | **< 50/sec** | **90% reduction** |

---

## Error Handling & Logging

### Logging Philosophy
**"Expected failures are not errors"**

```typescript
// ❌ Before: Logged EVERYTHING
logger.warn("Jupiter fetch failed", error); // 500 logs/sec

// ✅ After: Only log UNEXPECTED errors
if (!error.message?.includes('aborted') && !error.message?.includes('404')) {
  logger.warn("Jupiter unexpected error", error); // < 10 logs/sec
}
```

### What We Log
✅ **DO LOG**:
- Unexpected API errors (500s, network failures)
- Circuit breaker state changes
- WebSocket connection issues
- Price updates (info level)

❌ **DON'T LOG**:
- 404 Not Found (expected for new tokens)
- 204 No Content (expected from Jupiter)
- AbortError / timeout (expected for low-liquidity)
- Negative cache hits (silent by design)

---

## Future Enhancements

### 1. Helius transactionSubscribe Validation (Optional)
- Subscribe to pump.fun program transactions
- Parse swap events for price validation
- Cross-check against PumpPortal data

### 2. Machine Learning Token Classification
```typescript
// Instead of simple "ends with pump" heuristic
const tokenType = await classifyToken(mint);
// → "pump.fun" | "raydium" | "orca" | "unknown"
```

### 3. User-Initiated Price Refresh
```typescript
// Frontend button: "Refresh Price"
await priceService.forceRefresh(mint, { bypassNegativeCache: true });
```

### 4. Price Change Alerts
```typescript
// Alert users when price moves > 10%
priceService.on('price', (tick) => {
  const oldPrice = previousPrices.get(tick.mint);
  const changePercent = ((tick.priceUsd - oldPrice) / oldPrice) * 100;

  if (Math.abs(changePercent) > 10) {
    notifyUser(tick.mint, changePercent);
  }
});
```

---

## Summary: Why This Architecture?

### ✅ Optimized for Brand New Tokens
- Pump.fun tokens are detected and prioritized
- 3-second response time (vs 13+ seconds before)
- 95% success rate for new tokens

### ✅ Minimal API Usage
- Request coalescing prevents duplicates
- Batch fetching reduces calls by 97%
- Negative caching prevents repeated failures

### ✅ Real-Time Accuracy
- Helius WebSocket monitors ALL DEX swaps
- PumpPortal WebSocket for pump.fun trades
- Stale-while-revalidate for instant UX

### ✅ Fault Tolerant
- Circuit breakers prevent cascading failures
- Multiple fallback sources (pump.fun → DexScreener → Jupiter)
- Graceful degradation (stale prices better than no prices)

### ✅ Cost Effective
- All APIs are **FREE**
- Helius Developer plan includes WebSocket
- PumpPortal data API and WebSocket are free
- DexScreener/Jupiter free tiers are sufficient

---

## Related Documentation

- `PUMP_FUN_OPTIMIZATION_STRATEGY.md` - Implementation roadmap for pump.fun integration
- `LOW_LIQUIDITY_TOKEN_STRATEGY.md` - Negative caching strategy for garbage tokens
- `OPTIMIZATION_REPORT.md` - Performance benchmarks and rate limit analysis
- `priceService-optimized.ts` - Implementation of this architecture
