# Market Lighthouse Feature

## Overview
The Market Lighthouse is a real-time market data dashboard that provides key metrics about the cryptocurrency market and Pump.fun ecosystem. It appears as a hover popover and displays 4 critical metrics.

## Features

### 1. Pump.fun 24h Volume 🔥
- **Source**: PumpPortal WebSocket Stream
- **Update Frequency**: Real-time (aggregated every 5 seconds)
- **Storage**: Redis (`market:lighthouse:pump`)
- **Description**: Total SOL volume traded on Pump.fun bonding curves in the last 24 hours

### 2. Total Crypto Market Cap 💰
- **Source**: CoinMarketCap `/v1/global-metrics/quotes/latest`
- **Update Frequency**: 60 seconds
- **Storage**: Redis (`market:cmc:global`)
- **Description**: Total market capitalization of all cryptocurrencies in USD

### 3. Fear & Greed Index 😱
- **Source**: CoinMarketCap `/v3/fear-and-greed/historical?limit=1`
- **Update Frequency**: 60 seconds
- **Storage**: Redis (`market:cmc:fear-greed`)
- **Scale**: 0-100
  - 0-24: **Extreme Fear** (Red)
  - 25-44: **Fear** (Orange)
  - 45-54: **Neutral** (Amber)
  - 55-74: **Greed** (Lime)
  - 75-100: **Extreme Greed** (Green)

### 4. Altcoin Season Index 🪙
- **Source**: CoinMarketCap `/v1/cryptocurrency/listings/latest` (calculated)
- **Update Frequency**: 60 seconds
- **Storage**: Redis (`market:cmc:altcoin-season`)
- **Calculation**: Percentage of top 100 coins (excluding stablecoins & wrapped tokens) that outperformed BTC over 90 days
- **Scale**: 0-100
  - 0-49: **Bitcoin Season** (Blue)
  - 50-74: **Mixed Market** (Amber)
  - 75-100: **Altseason** (Green)

## Architecture

### Backend Services

#### 1. PumpPortal Stream Service
**File**: `backend/src/services/pumpPortalStreamService.ts`
- Maintains WebSocket connection to PumpPortal
- Listens for `swap` events (trades)
- Emits events for other services to consume

#### 2. Market Lighthouse Worker
**File**: `backend/src/workers/marketLighthouseWorker.ts`
- Subscribes to PumpPortal swap events
- Maintains rolling 24h window of trades
- Aggregates volume by time window (5m, 1h, 6h, 24h)
- Snapshots data to Redis every 5 seconds
- Prunes old data every minute

#### 3. CMC Service
**File**: `backend/src/services/cmcService.ts`
- Fetches global market metrics from CoinMarketCap
- Implements Fear & Greed Index endpoint
- Calculates Altcoin Season Index using CMC methodology
- Caches all data in Redis with 60s TTL
- Auto-refreshes every 60 seconds

#### 4. Market Sentiment Service (Legacy Facade)
**File**: `backend/src/services/marketSentimentService.ts`
- Now delegates to CMC Service for consistency
- Maintains backwards compatibility
- Previously used Alternative.me and BlockchainCenter APIs

### API Endpoints

#### GET `/api/market/lighthouse`
Returns all 4 metrics in a single response:

```json
{
  "pumpVolume24h": 123456.78,
  "totalMarketCapUsd": 2500000000000,
  "fearGreedIndex": 65,
  "fearGreedLabel": "Greed",
  "altcoinSeasonIndex": 82,
  "ts": 1729785600000
}
```

### Frontend Component

#### MarketHover Component
**File**: `frontend/components/market/MarketHover.tsx`

Features:
- Hover-triggered popover positioned above trigger
- Auto-updates every 15 seconds
- Color-coded values based on sentiment
- Emoji icons for visual clarity
- "Updated X ago" timestamp
- Gradient hover effects on cards
- Live indicator animation

Usage:
```tsx
<MarketHover trigger={<div>🎯 Market</div>} />
```

### Frontend API Route
**File**: `frontend/app/api/market-hover/route.ts`
- Proxies requests to backend `/api/market/lighthouse`
- Handles errors gracefully
- Returns fallback nulls on failure

## Data Flow

```
PumpPortal WS → pumpPortalStreamService → marketLighthouseWorker → Redis
                                                                      ↓
CoinMarketCap API → cmcService → Redis                               ↓
                                                                      ↓
Frontend → /api/market-hover → Backend /api/market/lighthouse → Redis → Response
```

## Configuration

### Environment Variables

Required for backend:
```env
# CoinMarketCap API Key (required)
CMC_API_KEY=your_cmc_api_key_here

# PumpPortal API Key (optional, improves rate limits)
PUMPPORTAL_API_KEY=your_pumpportal_key_here

# Redis URL (required)
REDIS_URL=redis://localhost:6379
```

Required for frontend:
```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Redis Keys

- `market:lighthouse:pump` - PumpPortal aggregated data (15s TTL)
- `market:cmc:global` - Global market metrics (60s TTL)
- `market:cmc:fear-greed` - Fear & Greed Index (60s TTL)
- `market:cmc:altcoin-season` - Altcoin Season Index (60s TTL)

## Startup Sequence

The Market Lighthouse is initialized in `backend/src/index.ts`:

```typescript
// 1. Start CMC auto-refresh (global metrics, fear/greed, altcoin season)
startCMCRefresh();

// 2. Start sentiment refresh (now delegates to CMC)
startSentimentRefresh();

// 3. Start Market Lighthouse worker (PumpPortal aggregation)
await marketLighthouseWorker.start();
```

## Performance Considerations

1. **WebSocket Connection**: Single persistent connection to PumpPortal
2. **Redis Caching**: All metrics cached to minimize API calls
3. **Rate Limits**:
   - CMC: 333 calls/day on free tier (60s refresh = ~1440 calls/day per endpoint)
   - PumpPortal: Unlimited with API key
4. **Memory**: In-memory trade window limited to 24h of data, pruned every minute

## Error Handling

- All API calls wrapped in try-catch
- Returns null values on failure (UI shows "—")
- Logs errors to console with service prefix
- Frontend continues working with stale/null data

## Future Enhancements

- [ ] Historical data charts
- [ ] Custom time windows (1h, 4h, 12h)
- [ ] Mobile-optimized layout
- [ ] Notification triggers (e.g., extreme fear/greed)
- [ ] More granular Pump.fun metrics (top tokens, migration rate)
- [ ] WebSocket streaming to frontend (remove polling)
- [ ] Altcoin Season breakdown by category (DeFi, L1, Meme)

## Troubleshooting

### No data showing
1. Check Redis is running: `redis-cli ping`
2. Verify CMC_API_KEY is set and valid
3. Check backend logs for API errors
4. Verify workers started: Look for "✅ [MarketLighthouse] Worker started"

### Stale data
1. Check Redis TTLs: `redis-cli TTL market:cmc:global`
2. Verify CMC refresh is running: Look for "[CMC] Starting auto-refresh"
3. Check for API rate limiting in logs

### WebSocket issues
1. Check PumpPortal connection: Look for "[PumpPortal] WebSocket connected"
2. Verify firewall allows WSS connections
3. Check for reconnection loops in logs

## API Reference

### CoinMarketCap Endpoints

1. **Global Metrics**
   - Endpoint: `GET /v1/global-metrics/quotes/latest`
   - Rate Limit: 333 calls/day (free tier)

2. **Fear & Greed Index**
   - Endpoint: `GET /v3/fear-and-greed/historical?limit=1`
   - Rate Limit: 333 calls/day (free tier)

3. **Altcoin Season Calculation**
   - Endpoint: `GET /v1/cryptocurrency/listings/latest?limit=120&convert=USD&aux=tags`
   - Rate Limit: 333 calls/day (free tier)
   - Methodology: % of top 100 coins (excl. stablecoins) beating BTC over 90d

### PumpPortal WebSocket

- URL: `wss://pumpportal.fun/api/data?api-key=YOUR_KEY`
- Events: `newToken`, `migration`, `swap`, `accountTrade`
- Authentication: Optional API key for higher rate limits

## Credits

- Market data provided by [CoinMarketCap](https://coinmarketcap.com)
- Real-time Pump.fun data from [PumpPortal](https://pumpportal.fun)
- Design inspired by Super Mario Bros aesthetic
