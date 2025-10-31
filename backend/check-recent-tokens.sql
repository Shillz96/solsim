-- Check current token distribution by state
SELECT 
  state, 
  COUNT(*) as count,
  MIN("bondingCurveProgress") as min_progress,
  MAX("bondingCurveProgress") as max_progress
FROM "TokenDiscovery" 
GROUP BY state
ORDER BY state;

-- Check recent tokens with their states
SELECT 
  mint,
  symbol,
  name,
  state,
  "bondingCurveProgress",
  "firstSeenAt"
FROM "TokenDiscovery"
WHERE "firstSeenAt" > NOW() - INTERVAL '2 hours'
ORDER BY "firstSeenAt" DESC
LIMIT 20;
