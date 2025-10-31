-- Test GRADUATING query filters to see why column is empty
-- This mimics the backend query logic

-- Check GRADUATING tokens with our filters
SELECT 
  mint,
  symbol,
  name,
  state,
  bondingCurveProgress,
  volume24hSol,
  lastTradeTs,
  holderCount,
  "firstSeenAt"
FROM "TokenDiscovery"
WHERE state = 'graduating'
  AND bondingCurveProgress >= 25  -- GRADUATING_MIN_PROGRESS
  AND bondingCurveProgress < 100   -- GRADUATING_MAX_PROGRESS
  AND volume24hSol >= 0.1          -- GRADUATING_MIN_VOLUME_SOL
  AND lastTradeTs >= NOW() - INTERVAL '12 hours'  -- GRADUATING_LAST_TRADE_MINUTES (720 min)
  AND holderCount >= 3             -- GRADUATING_MIN_HOLDERS
ORDER BY bondingCurveProgress DESC
LIMIT 20;

-- Check how many GRADUATING tokens exist WITHOUT filters
SELECT COUNT(*) as total_graduating FROM "TokenDiscovery" WHERE state = 'graduating';

-- Check how many pass each filter individually
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE bondingCurveProgress >= 25) as has_progress,
  COUNT(*) FILTER (WHERE volume24hSol >= 0.1) as has_volume,
  COUNT(*) FILTER (WHERE lastTradeTs >= NOW() - INTERVAL '12 hours') as has_recent_trade,
  COUNT(*) FILTER (WHERE holderCount >= 3) as has_holders
FROM "TokenDiscovery"
WHERE state = 'graduating';

-- Test BONDED query filters
SELECT 
  mint,
  symbol,
  name,
  state,
  stateChangedAt,
  lastTradeTs,
  volume24hSol,
  status
FROM "TokenDiscovery"
WHERE state = 'bonded'
  AND stateChangedAt >= NOW() - INTERVAL '72 hours'  -- BONDED_MAX_AGE_HOURS
  AND lastTradeTs >= NOW() - INTERVAL '48 hours'     -- BONDED_LAST_TRADE_HOURS
  AND volume24hSol >= 0.05                           -- BONDED_MIN_VOLUME_SOL
  AND status NOT IN ('DEAD', 'LAUNCHING')
ORDER BY stateChangedAt DESC
LIMIT 20;

-- Check BONDED filter breakdown
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE stateChangedAt >= NOW() - INTERVAL '72 hours') as recent_bonding,
  COUNT(*) FILTER (WHERE lastTradeTs >= NOW() - INTERVAL '48 hours') as recent_trade,
  COUNT(*) FILTER (WHERE volume24hSol >= 0.05) as has_volume,
  COUNT(*) FILTER (WHERE status NOT IN ('DEAD', 'LAUNCHING')) as good_status
FROM "TokenDiscovery"
WHERE state = 'bonded';
