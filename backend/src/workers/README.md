# Token Discovery Worker

**Location**: `backend/src/workers/tokenDiscoveryWorker.ts`

## Overview

The Token Discovery Worker orchestrates real-time token discovery for the Warp Pipes Hub by:
- Listening to PumpPortal WebSocket (bonded tokens, migrations)
- Listening to Raydium program logs (new AMM pools)
- Enriching tokens with health capsule data
- Managing state transitions (bonded → graduating → new)
- Triggering watch notifications
- Maintaining Redis cache for fast API queries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   TOKEN DISCOVERY WORKER                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ PumpPortal   │    │   Raydium    │    │   Health     │  │
│  │ WebSocket    │    │   Stream     │    │   Capsule    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             EVENT HANDLERS & PROCESSING              │  │
│  │  • newToken → BONDED                                 │  │
│  │  • migration → GRADUATING → NEW                      │  │
│  │  • newPool → NEW (Raydium)                           │  │
│  │  • Health enrichment (async)                         │  │
│  │  • Hot score calculation                             │  │
│  │  • Watch notifications                               │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│         ┌───────────┴───────────┐                          │
│         ▼                       ▼                          │
│  ┌─────────────┐         ┌─────────────┐                  │
│  │  Postgres   │         │    Redis    │                  │
│  │  Database   │         │    Cache    │                  │
│  │             │         │   (2-4h)    │                  │
│  └─────────────┘         └─────────────┘                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             SCHEDULED JOBS                           │  │
│  │  • Hot score recalculation (5min)                    │  │
│  │  • Watcher count sync (1min)                         │  │
│  │  • Old token cleanup (1hr)                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. **New Bonded Token** (PumpPortal)
```
PumpPortal newToken event
  → Create TokenDiscovery (state: 'bonded')
  → Cache in Redis
  → Async health enrichment
```

### 2. **Migration Event** (PumpPortal)
```
PumpPortal migration event
  → Check status (initiated | completed)
  → Update state (bonded → graduating → new)
  → Update pool data (if completed)
  → Notify watchers
  → Update cache
```

### 3. **New Raydium Pool**
```
Raydium initialize2 log
  → Parse transaction (extract mints)
  → Check if token exists
  → If exists: update to NEW state
  → If new: create direct Raydium listing
  → Cache in Redis
  → Async health enrichment
```

## Hot Score Algorithm

```typescript
hotScore = (recency × 0.5) + (liquidity × 0.3) + (watchers × 0.2)

Where:
- recency: 100 at creation, decays to 0 over 24 hours
- liquidity: $50k = 100 points, linear scaling
- watchers: 10 points per watcher, capped at 100
```

## Deployment

### Option 1: Separate Railway Service (Recommended)

Similar to the existing `worker.ts` pattern:

1. **Add to `package.json`**:
```json
{
  "scripts": {
    "worker:discovery": "tsx src/workers/tokenDiscoveryWorker.ts"
  }
}
```

2. **Create Railway service**:
   - Service name: `virtualsol-discovery-worker`
   - Start command: `npm run worker:discovery`
   - Root directory: `backend`
   - Environment variables: Same as main backend

3. **Benefits**:
   - Isolated process (no impact on API performance)
   - Independent scaling
   - Separate logs and monitoring

### Option 2: Integrate into Main Backend

Add to `backend/src/index.ts` startup:

```typescript
import { startTokenDiscoveryWorker } from './workers/tokenDiscoveryWorker.js';

// After priceService.start()
await startTokenDiscoveryWorker();
```

**Note**: Requires refactoring the worker to export a `start()` function instead of running immediately.

## Environment Variables

Required (already configured):
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `HELIUS_RPC_URL` - Helius RPC endpoint
- `HELIUS_WS` - Helius WebSocket endpoint

Optional:
- `PUMPPORTAL_API_KEY` - For PumpSwap stream access (paid feature)

## Monitoring

### Health Checks

1. **Worker Running**:
```bash
# Check Railway logs
railway logs -s virtualsol-discovery-worker
```

2. **Database Activity**:
```sql
-- Check recent token discoveries
SELECT state, COUNT(*) as count
FROM "TokenDiscovery"
WHERE "firstSeenAt" > NOW() - INTERVAL '1 hour'
GROUP BY state;
```

3. **Redis Cache**:
```bash
# Check cached tokens
redis-cli KEYS "token:*" | wc -l

# Check sorted sets
redis-cli ZCARD tokens:bonded
redis-cli ZCARD tokens:graduating
redis-cli ZCARD tokens:new
```

### Logs

The worker outputs structured logs:

```
🚀 Token Discovery Worker Starting...
✅ Database connected
✅ Redis connected
📡 Starting streaming services...
✅ PumpPortal stream service started
✅ Raydium stream service started
🔌 Registering event handlers...
✅ Event handlers registered
⏰ Scheduling background jobs...
✅ Background jobs scheduled

🎮 Token Discovery Worker is running!
   - Listening to PumpPortal (bonded, migration)
   - Listening to Raydium (new pools)
   - Hot score updates: every 5 minutes
   - Watcher sync: every 1 minute
   - Cleanup: every 1 hour

[TokenDiscovery] New bonded token: $MARIO
[TokenDiscovery] Health data enriched for 7xKXt...
[TokenDiscovery] Migration event for 7xKXt...: completed
[TokenDiscovery] State transition: 7xKXt... bonded → new
[Watch] User abc-123 notified: 7xKXt... transitioned bonded → new
```

## Testing

### Manual Testing

1. **Start worker locally**:
```bash
cd backend
npx tsx src/workers/tokenDiscoveryWorker.ts
```

2. **Watch logs** for incoming tokens

3. **Check database**:
```sql
SELECT * FROM "TokenDiscovery" ORDER BY "firstSeenAt" DESC LIMIT 10;
```

4. **Verify Redis cache**:
```bash
redis-cli GET "token:7xKXt..."
```

### Integration Testing

Test the complete flow:

1. Wait for PumpPortal newToken event
2. Verify TokenDiscovery record created
3. Check health data enrichment
4. Verify Redis cache populated
5. Test migration flow
6. Verify watch notifications

## Troubleshooting

### Worker Not Starting

- Check DATABASE_URL and REDIS_URL are set
- Verify Helius endpoints are configured
- Check Railway logs for error messages

### No Tokens Appearing

- Verify PumpPortal WebSocket connection (check logs)
- Verify Raydium stream connection (check logs)
- Test with manual database insert to isolate issue

### Health Data Not Enriching

- Check Helius RPC rate limits
- Verify Jupiter API is accessible
- Check DexScreener API availability
- Review error logs for specific failures

### Redis Cache Issues

- Verify Redis connection string
- Check Redis memory usage
- Verify cache TTL settings (2-4 hours)

## Performance Considerations

### Rate Limiting

- Health enrichment is batched (10 tokens at a time, 100ms delay)
- Jupiter API: ~2 requests per second
- DexScreener API: ~5 requests per second
- Helius RPC: Plan-dependent limits

### Memory Usage

- Expected: ~200-500 MB for worker process
- Redis cache: ~100 MB for 1000 cached tokens
- Database connections: Pooled via Prisma

### Scalability

- Worker can handle ~100 tokens/minute with health enrichment
- Redis cache supports instant API queries for 10k+ tokens
- Scheduled jobs run efficiently with batch processing

## Next Steps

After deploying the worker:

1. ✅ Phase 3 complete
2. **Phase 4**: Implement API endpoints (`/api/warp-pipes/*`)
3. **Phase 5**: Build frontend Warp Pipes Hub page
4. **Phase 6**: Integrate React Query hooks
5. **Phase 7**: Create Room page (`/room/[mint]`)
6. **Phase 8**: Connect NotificationService for watch alerts

## Related Files

- Database schema: `backend/prisma/schema.prisma`
- PumpPortal service: `backend/src/services/pumpPortalStreamService.ts`
- Raydium service: `backend/src/services/raydiumStreamService.ts`
- Health service: `backend/src/services/healthCapsuleService.ts`
- Types: `frontend/lib/types/warp-pipes.ts`
