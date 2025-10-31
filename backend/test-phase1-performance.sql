-- ============================================================================
-- Phase 1 Performance Test
-- Run this query multiple times (5-10 minutes apart) to measure update rate
-- ============================================================================

-- 1. Current snapshot of TokenDiscovery updates
SELECT 
  'TokenDiscovery Updates' as metric,
  n_tup_upd as value,
  NOW() as measured_at
FROM pg_stat_user_tables
WHERE relname = 'TokenDiscovery';

-- 2. Wait 5 minutes, then run this to calculate updates per minute:
-- Expected BEFORE Phase 1: ~2,460 updates/minute (147,600/hour)
-- Expected AFTER Phase 1: ~159 updates/minute (9,544/hour)
--
-- Example calculation:
-- Second run: 28,101,500 updates
-- First run:  28,101,165 updates
-- Difference: 335 updates in 5 minutes = 67 updates/minute ✅ (94% improvement!)

-- 3. Check Redis sync job is running (look for this in logs)
-- Should see: "Completed batch sync from Redis to database" every 5 minutes

-- 4. Check backend response time improvement
SELECT 
  'Database Connections' as metric,
  COUNT(*) as value
FROM pg_stat_activity
WHERE datname = 'railway';

-- 5. Check if site is stable (no crashes)
SELECT 
  'Uptime Minutes' as metric,
  EXTRACT(EPOCH FROM (NOW() - pg_postmaster_start_time()))/60 as value
FROM pg_postmaster_start_time();

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Copy the n_tup_upd value from first query
-- 2. Wait 5 minutes
-- 3. Run query again and copy new n_tup_upd value
-- 4. Calculate: (new_value - old_value) / 5 = updates per minute
-- 5. Compare to baseline: 2,460/min (before) vs your result
-- ============================================================================
