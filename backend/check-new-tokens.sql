-- Check NEW tokens status
SELECT 
  COUNT(*) as total_new,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active,
  COUNT(*) FILTER (WHERE status = 'DEAD') as dead,
  COUNT(*) FILTER (WHERE status = 'LAUNCHING') as launching,
  COUNT(*) FILTER (WHERE status IS NULL) as null_status
FROM "TokenDiscovery"
WHERE state = 'new'
  AND "firstSeenAt" >= NOW() - INTERVAL '72 hours';

-- Show sample NEW tokens with status
SELECT 
  mint,
  symbol,
  status,
  "firstSeenAt",
  "bondingCurveProgress"
FROM "TokenDiscovery"
WHERE state = 'new'
  AND "firstSeenAt" >= NOW() - INTERVAL '72 hours'
ORDER BY "firstSeenAt" DESC
LIMIT 10;
