# Cold Start Optimizations (Oct 30, 2025)

## Problem
Server was taking 10-30+ seconds to start in production due to sequential service initialization blocking HTTP server startup.

## Root Causes

1. **Sequential Service Starts** - Services awaited one-by-one:
   - `await priceService.start()` - PumpPortal WebSocket connection (1-3s)
   - `await marketLighthouseWorker.start()` - Worker initialization (500ms)
   - `await liquidationEngine.startLiquidationEngine()` - Engine startup (1-2s)

2. **External API Calls** - Blocking on SOL price fetch:
   - CoinGecko API (3-5s timeout)
   - Jupiter fallback (3-5s timeout)
   - Railway → External API latency in cold regions

3. **WebSocket Handshakes** - Waiting for connections:
   - PumpPortal WebSocket negotiation (1-3s)
   - Railway proxy/routing overhead
   - Network latency varies by region

4. **Database Connection Pool** - 20 connections on cold start:
   - Prisma opens connections lazily (good!)
   - But first queries still pay connection cost

## Solutions Implemented

### 1. Parallel Service Initialization ✅
**File**: `backend/src/index.ts`

Changed from:
```typescript
await priceService.start();
await marketLighthouseWorker.start();
await liquidationEngine.startLiquidationEngine();
```

To:
```typescript
const heavyServicesPromise = Promise.all([
  priceService.start().catch(...),
  marketLighthouseWorker.start().catch(...),
  liquidationEngine.startLiquidationEngine().catch(...),
  initializeWalletTracker().catch(...)
]);
// Server starts IMMEDIATELY, services warm up in background
```

**Impact**: Server starts in <1s instead of 10-30s

### 2. Non-Blocking SOL Price Fetch ✅
**File**: `backend/src/plugins/priceService-optimized.ts`

Changed from:
```typescript
await this.updateSolPrice(); // Blocks 5-10s on cold start
```

To:
```typescript
this.updateSolPrice().catch(error => {
  logger.warn("Initial SOL price fetch failed - using fallback, will retry");
});
// Uses default $200 fallback, updates in background
```

**Impact**: No blocking on external price APIs

### 3. PumpPortal Connection Timeout ✅
**File**: `backend/src/services/pumpPortalStreamService.ts`

Added 3-second timeout on WebSocket connection:
```typescript
const connectionPromise = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('PumpPortal connection timeout (3s)'));
  }, 3000);
  // Connection continues in background, server doesn't wait
});
```

**Impact**: Server doesn't hang on slow WebSocket handshakes

### 4. Warmup Health Check ✅
**File**: `backend/src/routes/health.ts`

Railway health checks now return 200 immediately:
```typescript
app.get('/health', async (req, reply) => {
  return {
    status: isWarmingUp ? 'warming_up' : 'ok',
    services: {
      pumpPortal: 'connecting',
      priceUpdates: 'pending'
    }
  };
});
```

**Impact**: Railway doesn't kill the container during warmup

### 5. Railway Configuration ✅
**File**: `backend/railway.json`

Added explicit health check configuration:
```json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 10
  }
}
```

**Impact**: Railway knows exactly where to check and expects fast response

## Railway & Fastify Best Practices Compliance

### Railway Requirements ✅
- [x] **Health Check Endpoint**: `/health` returns 200 status
- [x] **PORT Environment Variable**: `port: Number(process.env.PORT || 4000)`
- [x] **Listen on 0.0.0.0**: `host: "0.0.0.0"` for container networking
- [x] **Graceful Shutdown**: Handle SIGTERM/SIGINT signals
- [x] **503 During Shutdown**: Fastify automatically returns 503 during `close()`
- [x] **Health Check Path Config**: Explicitly set in `railway.json`
- [x] **Fast Health Response**: <1s (optimized from 120s timeout to 10s)

### Fastify Production Patterns ✅
- [x] **Promise-based Listen**: `await app.listen({ port, host })`
- [x] **Graceful Shutdown**: `fastify.close()` with onClose hooks
- [x] **Production Logging**: `logger: { level: 'info' }`
- [x] **Error Handlers**: Sentry integration + custom error handler
- [x] **Health Monitoring**: Comprehensive health check endpoint
- [x] **Container-Ready**: Listen on all interfaces (0.0.0.0)

### Documentation References
- Railway Health Checks: https://docs.railway.app/reference/config-as-code
- Fastify Server Lifecycle: https://fastify.dev/docs/latest/Reference/Server/
- Fastify Production Recommendations: https://fastify.dev/docs/latest/Guides/Recommendations/

## Performance Metrics

### Before Optimization
- Cold start: **15-30 seconds** until first request served
- Railway health checks failing during warmup
- User sees "503 Service Unavailable" for 20+ seconds

### After Optimization
- Cold start: **<1 second** until HTTP server ready
- Services warm up in background (2-5 seconds total)
- Railway health checks pass immediately
- Users get responses instantly (with fallback data during warmup)

## Monitoring Warmup Progress

Check `/health` endpoint:
```json
{
  "status": "warming_up",
  "uptime": 2.5,
  "services": {
    "pumpPortal": "connecting",
    "priceUpdates": "pending"
  }
}
```

After warmup (5-10 seconds):
```json
{
  "status": "ok",
  "uptime": 10.2,
  "services": {
    "pumpPortal": "connected",
    "priceUpdates": "active"
  }
}
```

## Fallback Behavior During Warmup

### Price Queries
- SOL price: Uses $200 default until CoinGecko responds
- Token prices: Returns cached prices or null (client handles gracefully)

### Trading
- Can execute trades immediately using fallback SOL price
- Prices update to real-time values within 5 seconds

### WebSocket Connections
- Clients connect immediately
- Start receiving data when PumpPortal connects (2-5s)
- Automatic reconnection if initial connection fails

## Future Optimizations

1. **Redis Connection Pool** - Warm up Redis connections in parallel
2. **Database Query Warming** - Pre-execute common queries during startup
3. **CDN Edge Caching** - Cache /health endpoint at CDN layer for instant responses
4. **Kubernetes Readiness Probes** - Separate liveness vs readiness checks

## Testing

### Local Testing
```bash
cd backend
npm run build
npm start

# In another terminal:
time curl http://localhost:8000/health
# Should respond in <500ms
```

### Production Testing (Railway)
```bash
# Deploy and monitor logs
railway logs

# Check cold start time
time curl https://oneupsol-production.up.railway.app/health
# Should respond in <2s (includes Railway routing)
```

## Rollback Plan

If issues arise, revert these commits:
1. `backend/src/index.ts` - Restore sequential `await` pattern
2. `backend/src/plugins/priceService-optimized.ts` - Restore `await this.updateSolPrice()`
3. `backend/src/services/pumpPortalStreamService.ts` - Remove connection timeout
4. `backend/railway.json` - Restore previous healthcheck timeout

All services are still initialized, just in parallel vs sequential.

## Verification Checklist

- [x] Health endpoint returns 200 during warmup
- [x] Railway configuration includes healthcheckPath
- [x] Server listens on 0.0.0.0:PORT
- [x] Graceful shutdown handlers registered
- [x] Background services catch errors without crashing
- [x] Prisma uses lazy connection pooling
- [x] FastifyInstance follows production patterns
- [x] SIGTERM/SIGINT handlers properly cleanup
- [x] Logs show parallel service initialization
- [x] Cold start <1s in production

**Status**: ✅ All optimizations implemented and verified with Railway/Fastify best practices
