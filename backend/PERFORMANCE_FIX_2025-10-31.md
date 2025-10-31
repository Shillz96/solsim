# Performance Fix - October 31, 2025

## Problem
Site lagging heavily with only 1 user due to database write storm and N+1 query patterns.

## Root Causes

### 1. Database Checkpoint Storm 🔥 CRITICAL
```
checkpoint complete: wrote 5338 buffers (32.6%); write=269.688s
```
- Checkpoints every 5 minutes taking 4.5 minutes each
- Database constantly thrashing
- WAL files growing to 93MB+

### 2. N+1 Query Pattern in Workers
```typescript
// BEFORE: Updates tokens ONE BY ONE
for (const token of activeTokens) {
  await prisma.tokenDiscovery.update({
    where: { mint: token.mint },
    data: updateData
  });
}
```

### 3. Timestamp Spam
Every operation updates `lastUpdatedAt`:
- Market data updates every 30s
- Hot score recalcs every 2min
- Holder count updates every 3min
- State transitions constantly

### 4. Missing Database Indexes
Queries scanning full table on:
- `state` (used in WHERE clauses everywhere)
- `lastUpdatedAt` (used in ORDER BY)
- `bondingCurveProgress` (used in WHERE filters)

## Solutions

### Quick Wins (Deploy Immediately)

#### 1. Batch Database Updates
```typescript
// AFTER: Batch update in single transaction
await prisma.$transaction(
  activeTokens.map(token => 
    prisma.tokenDiscovery.update({
      where: { mint: token.mint },
      data: updateData
    })
  )
);
```

#### 2. Reduce Update Frequency
```typescript
// BEFORE
static readonly MARKET_DATA_UPDATE_INTERVAL = 30_000; // 30s
static readonly HOT_SCORE_UPDATE_INTERVAL = 120_000;  // 2min
static readonly HOLDER_COUNT_UPDATE_INTERVAL = 180_000; // 3min

// AFTER
static readonly MARKET_DATA_UPDATE_INTERVAL = 60_000;  // 1min (2x slower)
static readonly HOT_SCORE_UPDATE_INTERVAL = 300_000;   // 5min (2.5x slower)
static readonly HOLDER_COUNT_UPDATE_INTERVAL = 600_000; // 10min (3.3x slower)
```

#### 3. Add Database Indexes
```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_state 
  ON "TokenDiscovery"(state) WHERE state IN ('new', 'graduating', 'bonded');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_last_updated 
  ON "TokenDiscovery"("lastUpdatedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_bonding_progress 
  ON "TokenDiscovery"("bondingCurveProgress") 
  WHERE "bondingCurveProgress" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_state_updated 
  ON "TokenDiscovery"(state, "lastUpdatedAt" DESC);
```

#### 4. Smart Timestamp Updates
```typescript
// Only update timestamp if data actually changed
const hasChanges = Object.keys(updateData).length > 1; // More than just lastUpdatedAt
if (hasChanges) {
  updateData.lastUpdatedAt = new Date();
}
```

### Medium-Term Improvements

#### 5. Use `updateMany` Instead of Individual Updates
```typescript
// Group tokens by update type, batch update
const tokensByState = new Map();
for (const token of activeTokens) {
  if (!tokensByState.has(token.state)) {
    tokensByState.set(token.state, []);
  }
  tokensByState.get(token.state).push(token.mint);
}

// Batch update per state
for (const [state, mints] of tokensByState) {
  await prisma.tokenDiscovery.updateMany({
    where: { mint: { in: mints } },
    data: { status: newStatus }
  });
}
```

#### 6. Reduce Cleanup Frequency
```typescript
// BEFORE
static readonly CLEANUP_INTERVAL = 600_000; // 10min

// AFTER  
static readonly CLEANUP_INTERVAL = 3600_000; // 60min (6x slower)
```

#### 7. Add Debouncing to State Transitions
```typescript
// Don't update state if it hasn't changed
if (currentToken.state === newState) {
  return; // Skip update
}
```

### Long-Term Optimizations

#### 8. Implement Write Batching Queue
```typescript
class BatchUpdateQueue {
  private queue: Map<string, any> = new Map();
  private flushInterval = 5000; // Flush every 5s
  
  add(mint: string, data: any) {
    this.queue.set(mint, data);
  }
  
  async flush() {
    if (this.queue.size === 0) return;
    
    await prisma.$transaction(
      Array.from(this.queue.entries()).map(([mint, data]) =>
        prisma.tokenDiscovery.update({ where: { mint }, data })
      )
    );
    
    this.queue.clear();
  }
}
```

#### 9. Move Heavy Processing to Background Jobs
- Token metadata enrichment (async, don't block)
- Holder count updates (use queue)
- Market data polling (spread across longer intervals)

#### 10. Database Connection Pooling
```typescript
// In database.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn'],
  // Add connection pooling
  connectionLimit: 20, // Railway Hobby plan supports 20 connections
});
```

## Implementation Priority

### Phase 1 (Deploy Today) ⚡
1. ✅ Add database indexes (run SQL immediately)
2. ✅ Increase update intervals (2-3x slower)
3. ✅ Add smart timestamp logic (skip if no changes)
4. ✅ Add debouncing to state transitions

### Phase 2 (Deploy Tomorrow) 🚀
5. ⏳ Implement batch updates with `$transaction`
6. ⏳ Reduce cleanup frequency
7. ⏳ Add connection pooling configuration

### Phase 3 (Next Week) 🎯
8. ⏳ Build write batching queue system
9. ⏳ Move heavy processing to separate worker
10. ⏳ Implement PostgreSQL VACUUM strategy

## Expected Impact

### Database Load
- **Before**: 5000 writes/checkpoint every 5min = ~16 writes/sec
- **After**: ~4 writes/sec (75% reduction)

### Response Times
- **Before**: 2-5 second lag during checkpoints
- **After**: <500ms consistent response times

### Database Size Growth
- **Before**: Growing 90MB+ per hour (WAL files)
- **After**: <20MB per hour (normal growth)

## Monitoring

Check these metrics after deployment:
```bash
# Check checkpoint frequency
railway logs | grep "checkpoint complete"

# Check query performance  
railway logs | grep "slow query"

# Check connection pool usage
railway logs | grep "connection"
```

## Rollback Plan

If performance degrades:
1. Revert interval changes to original values
2. Disable batch transactions (single updates)
3. Database will self-heal after 30 minutes

## Notes

- Database checkpoints are NORMAL but should not overlap
- Target: 1 checkpoint every 10-15 minutes (not every 5 minutes)
- Railway Hobby plan has 512MB RAM - avoid memory bloat
- PostgreSQL shared_buffers likely set too high for workload
