-- Performance Optimization Indexes
-- Created: 2025-10-31
-- Purpose: Fix database checkpoint storm and slow queries

-- 1. State filter index (used in every worker query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_state 
  ON "TokenDiscovery"(state) 
  WHERE state IN ('new', 'graduating', 'bonded');

-- 2. Last updated sorting index (used in ORDER BY clauses)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_last_updated 
  ON "TokenDiscovery"("lastUpdatedAt" DESC);

-- 3. Bonding curve progress filter index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_bonding_progress 
  ON "TokenDiscovery"("bondingCurveProgress") 
  WHERE "bondingCurveProgress" IS NOT NULL;

-- 4. Composite index for common query pattern (state + lastUpdated)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_state_updated 
  ON "TokenDiscovery"(state, "lastUpdatedAt" DESC);

-- 5. First seen index for NEW token cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_first_seen 
  ON "TokenDiscovery"("firstSeenAt") 
  WHERE state = 'new';

-- 6. State changed index for BONDED token cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_state_changed 
  ON "TokenDiscovery"("stateChangedAt") 
  WHERE state = 'bonded';

-- 7. Holder count sorting index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_holder_count 
  ON "TokenDiscovery"("holderCount" ASC) 
  WHERE "holderCount" IS NULL OR "holderCount" = 0;

-- 8. Volume sorting index for active token subscriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_discovery_volume 
  ON "TokenDiscovery"("volume24hSol" DESC NULLS LAST);

-- Show index creation progress
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'TokenDiscovery'
ORDER BY indexname;
