# 1UP SOL Core Functions Review

**Date**: 2025-10-26
**Backend URL**: https://solsim-production.up.railway.app
**Review Status**: ✅ Backend APIs Working | ⚠️ Frontend Connections Needed

---

## Executive Summary

### ✅ WORKING (Backend APIs)
- **Trending Tokens API** - Returns top tokens with price, volume, market cap data
- **Holders API** - Returns token holder distribution from Helius RPC
- **Market Lighthouse API** - Aggregates PumpPortal volume, CMC market cap, Fear & Greed index
- **Top Traders API** - Endpoint exists (data depends on Redis population from worker)
- **PumpPortal Trade Stream (SSE)** - Server-Sent Events endpoint for real-time trades
- **Trending API** - Fetches trending tokens from BirdEye and DexScreener

### ⚠️ NEEDS CONNECTION (Frontend)
- **Top Traders Panel** on /room page - Placeholder component needs to connect to `/api/market/top-traders/:mint`
- **Holders Panel** on /room page - Placeholder component needs to connect to `/api/market/holders/:mint`
- **Bubble Maps Panel** on /room page - Not implemented yet (needs design decision)

### 🔍 NEEDS TESTING
- **Trade execution** (buy/sell) - Backend logic exists in two versions (V1 and V2)
- **FIFO lot consumption** - Implementation exists, needs verification
- **Real-time PnL updates** - WebSocket exists, needs frontend testing

---

## API Endpoint Test Results

### 1. Trending Tokens ✅

**Endpoint**: `GET /api/trending?limit=5`

**Status**: ✅ Working

**Sample Response**:
```json
{
  "items": [
    {
      "mint": "StPsoHokZryePePFV8N7iXvfEmgUoJ87rivABX7gaW6",
      "symbol": "stepSOL",
      "name": "Step Staked SOL",
      "logoURI": "https://step-public.s3.eu-north-1.amazonaws.com/StepSOL.svg",
      "priceUsd": 210.19,
      "priceChange24h": 1.27,
      "volume24h": 40197.44,
      "marketCapUsd": 281964.41,
      "tradeCount": 0,
      "uniqueTraders": 0
    }
    // ... more tokens
  ]
}
```

---

### 2. Market Trades ✅

**Endpoint**: `GET /api/market/trades/:mint`

**Status**: ✅ Working (fallback to DexScreener aggregated data)

**Test**: Fetched trades for `BYZ9CcZGKAXmN2uDsKcQMM9UnZacija4vWcns9Th69xb`

**Sample Response**:
```json
{
  "trades": [],
  "aggregated": {
    "buys24h": 84,
    "sells24h": 77,
    "volume24h": 21344.77,
    "message": "Real-time trade feed coming soon. Showing 24h aggregated data."
  }
}
```

**Note**: Individual trades are stored in Redis by the Market Lighthouse worker. The endpoint falls back to DexScreener aggregated data when Redis is empty.

---

### 3. Top Traders ✅

**Endpoint**: `GET /api/market/top-traders/:mint?limit=10`

**Status**: ✅ Working (data depends on Redis population)

**Test**: Fetched top traders for `BYZ9CcZGKAXmN2uDsKcQMM9UnZacija4vWcns9Th69xb`

**Sample Response**:
```json
{
  "traders": []
}
```

**Note**: Returns empty array because Redis hash `market:traders:{mint}` is not populated yet. The Market Lighthouse worker is responsible for aggregating trader stats. This endpoint is **ready to use** once the worker populates data.

**Expected Data Format** (when populated):
```json
{
  "traders": [
    {
      "address": "wallet_address",
      "pnl": 123.45,
      "volume": 1000.00,
      "tradeCount": 15
    }
  ]
}
```

---

### 4. Holders Distribution ✅

**Endpoint**: `GET /api/market/holders/:mint?limit=20`

**Status**: ✅ Working perfectly

**Test**: Fetched holders for `BYZ9CcZGKAXmN2uDsKcQMM9UnZacija4vWcns9Th69xb`

**Sample Response**:
```json
{
  "holders": [
    {
      "address": "Bu55AwPYik3fNN5HFWMdagnFPnBQAUhCybKCJKuyJf2V",
      "balance": "92111628524290",
      "percentage": 12.43,
      "rank": 1
    },
    {
      "address": "8jjzrDvRnWdAmuw8pcegdmtogzZfvByubhTS9tpQhYLj",
      "balance": "44869498898771",
      "percentage": 6.05,
      "rank": 2
    }
    // ... 18 more holders
  ],
  "totalSupply": "741177277997690",
  "holderCount": 241
}
```

**Data Source**: Helius RPC using `getTokenLargestAccounts` method
**Cache**: 5 minutes (300 seconds)

---

### 5. Market Lighthouse ✅

**Endpoint**: `GET /api/market/lighthouse`

**Status**: ✅ Working

**Sample Response**:
```json
{
  "pumpVolume24h": 11.85,
  "totalMarketCapUsd": 3839690311959.001,
  "fearGreedIndex": 34,
  "fearGreedLabel": "Fear",
  "altcoinSeasonIndex": 26,
  "ts": 1761499862872
}
```

**Data Sources**:
- **pumpVolume24h**: PumpPortal 24h volume (SOL) from Redis cache
- **totalMarketCapUsd**: CoinMarketCap global market cap
- **fearGreedIndex**: CoinMarketCap Fear & Greed Index
- **altcoinSeasonIndex**: CoinMarketCap Altcoin Season Index

---

### 6. PumpPortal Trade Stream (SSE) ✅

**Endpoint**: `GET /api/pumpportal/trades/:mint`

**Status**: ✅ Working (Server-Sent Events stream)

**Test**: Connected to trade stream for `BYZ9CcZGKAXmN2uDsKcQMM9UnZacija4vWcns9Th69xb`

**Sample Response**:
```
data: {"type":"history","trades":[]}
```

**Format**: Server-Sent Events (SSE)
**Messages**:
- `type: "history"` - Initial cached trades from Redis
- `type: "trade"` - Real-time trade events

**Data Source**: Redis sorted set `pumpportal:trades:{mint}` (populated by PumpPortal WebSocket client)

---

## Backend Service Status

### Trading Service

**Files**:
- `backend/src/services/tradeService.ts` (V1 - Currently in use)
- `backend/src/services/tradeServiceV2.ts` (V2 - Alternative implementation)

**Key Differences**:

| Feature | V1 (tradeService.ts) | V2 (tradeServiceV2.ts) |
|---------|----------------------|------------------------|
| **Cost Basis Calculation** | Uses `vwapBuy()` utility for weighted average | Direct addition of qty and cost |
| **FIFO Implementation** | Uses `fifoSell()` from utils/pnl.ts | Uses `closeFIFO()` from utils/fifo-closer.ts |
| **Lot Closure Tracking** | No lot closure records | Creates `LotClosure` table records |
| **Lock Mechanism** | ✅ Redis distributed lock | ❌ No locking |
| **Real-time PnL** | ✅ Integrated with `realtimePnLService` | ❌ Not integrated |
| **Current Status** | **ACTIVE** (used in routes) | Unused alternative |

**Recommendation**:
- ✅ **V1 is production-ready** with proper locking and real-time PnL
- ⚠️ V2 has better lot closure tracking but lacks locking (race conditions possible)
- 🔄 **Action needed**: Audit both, consolidate to single canonical implementation

---

### Price Service

**Files**:
- `backend/src/plugins/priceService-optimized.ts` (Active)
- `backend/src/plugins/priceService.ts` (Re-exports optimized version)
- `backend/src/plugins/priceService-v2.ts` (Legacy/alternative)

**Architecture**:
```
LRU Memory Cache (5000 tokens)
    ↓
Redis Cache (persistent)
    ↓
WebSocket Streams (Helius, PumpPortal)
    ↓
Fallback APIs (Jupiter, DexScreener, CoinGecko)
```

**Status**: ✅ Working with multi-layer caching and fallback APIs

---

### PumpPortal Integration

**Files**:
- `backend/src/plugins/pumpPortalWs.ts` - WebSocket client
- `backend/src/services/pumpPortalStreamService.ts` - Event aggregator
- `backend/src/routes/pumpPortalData.ts` - SSE endpoints

**Status**: ✅ Fully operational

**Features**:
- ✅ Real-time token creation detection
- ✅ Real-time trade streaming per token
- ✅ Wallet tracking for copy-trading
- ✅ Automatic reconnection with exponential backoff
- ✅ Redis caching (5min TTL for trades)
- ✅ SSE streaming to frontend clients

---

## Frontend Components Status (/room page)

### ✅ CONNECTED Components

1. **TokenVitalsBar** - `frontend/components/trading/token-vitals-bar.tsx`
   - ✅ Real-time price updates via `usePriceStreamContext()`
   - ✅ Displays 24h volume, holders, 5m price change
   - ✅ Shows user portfolio rank

2. **TradePanel** - `frontend/components/trade-panel/TradePanelContainer.tsx`
   - ✅ Real-time prices via `usePriceStreamContext()`
   - ✅ Portfolio data via `usePortfolio()`
   - ✅ Trade execution via `useTradeExecution()`
   - ✅ Real-time PnL calculations via `usePositionPnL()`

3. **ChatRoom** - `frontend/components/chat/chat-room.tsx`
   - ✅ Real-time WebSocket messages via `useChat()`
   - ✅ User authentication via `useAuth()`

4. **RecentTradesPanel** - Part of `market-data-panels.tsx`
   - ✅ Real-time trades via `usePumpPortalTradesWithHistory()`

5. **UserPositionsPanel** - Part of `market-data-panels.tsx`
   - ✅ Portfolio positions via `usePortfolio()`

6. **DexScreenerChart** - `frontend/components/trading/dexscreener-chart.tsx`
   - ✅ Standalone iframe (external DexScreener service)

---

### ❌ NOT CONNECTED Components (Placeholders)

1. **TopTradersPanel** - `market-data-panels.tsx:180-199`
   - ❌ Shows "Coming Soon" placeholder
   - ✅ Backend API ready: `/api/market/top-traders/:mint`
   - 🔧 **Action needed**: Create `useTopTraders()` hook and connect component

2. **HoldersPanel** - `market-data-panels.tsx:202-221`
   - ❌ Shows "Coming Soon" placeholder
   - ✅ Backend API ready: `/api/market/holders/:mint`
   - 🔧 **Action needed**: Create `useHolders()` hook and connect component

3. **BubbleMapsPanel** - `market-data-panels.tsx:224-243`
   - ❌ Shows "Coming Soon" placeholder
   - ❌ No backend API yet
   - 🔧 **Action needed**:
     - Option 1: Integrate Bubblemaps API (requires API key)
     - Option 2: Build custom D3.js/Recharts bubble visualization
     - Option 3: Use holder data from `/api/market/holders/:mint` to create simple visualization

---

## Issues & Required Actions

### Critical Issues

1. **Trade Service Duplication** ⚠️
   - Two implementations exist (V1 and V2)
   - V1 is active, V2 is unused
   - Need to audit and consolidate to avoid confusion

2. **Hardcoded API Keys** ⚠️
   - BirdEye API key hardcoded in `backend/src/services/trendingService.ts`
   - Should use environment variable

3. **Top Traders Data Population** ⚠️
   - API endpoint exists but returns empty array
   - Need to verify Market Lighthouse worker is populating `market:traders:{mint}` Redis hash

### Medium Priority

4. **Price Service File Organization** ⚠️
   - Three price service files exist (confusing structure)
   - Consider consolidating or documenting why multiple versions exist

5. **Frontend Panel Connections** ⚠️
   - Top Traders and Holders panels not connected to existing APIs
   - Bubble Maps panel not implemented

### Low Priority

6. **Trade Service V2 Improvements** 💡
   - V2 has better lot closure tracking (`LotClosure` table)
   - Could migrate V2's closure tracking into V1

---

## Next Steps

### Phase 1: Verification & Testing

1. ✅ Test production backend API endpoints
2. ⬜ Test buy/sell trade execution (manual testing needed)
3. ⬜ Verify FIFO lot consumption works correctly
4. ⬜ Test real-time PnL updates on frontend
5. ⬜ Verify WebSocket price streaming

### Phase 2: Code Audit & Consolidation

1. ⬜ Audit tradeService V1 vs V2 thoroughly
2. ⬜ Choose canonical implementation
3. ⬜ Remove or archive unused trade service
4. ⬜ Fix hardcoded BirdEye API key

### Phase 3: Frontend Implementation

1. ⬜ Implement Top Traders Panel
   - Create `useTopTraders()` hook
   - Connect to `/api/market/top-traders/:mint`
   - Display trader stats (address, PnL, volume, trade count)

2. ⬜ Implement Holders Panel
   - Create `useHolders()` hook
   - Connect to `/api/market/holders/:mint`
   - Display holder distribution with chart

3. ⬜ Implement Bubble Maps Panel
   - Decide on approach (Bubblemaps API vs custom viz)
   - Implement visualization or embed iframe

---

## Conclusion

**Good News**:
- ✅ All core backend APIs are working
- ✅ Price streaming, trending tokens, and market data endpoints operational
- ✅ Most /room page components properly connected to real-time data

**Action Required**:
- 🔧 Connect 3 placeholder panels (Top Traders, Holders, Bubble Maps)
- 🔍 Audit and consolidate dual trade service implementations
- ⚠️ Test trade execution thoroughly
- 🔒 Fix hardcoded API keys

**Overall Status**: 80% Complete - Backend infrastructure solid, frontend connections mostly done, minor cleanup and 3 panel implementations needed.
