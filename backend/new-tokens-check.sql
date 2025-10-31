-- Quick check: Are there NEW tokens at all?
SELECT COUNT(*) as new_tokens_72h
FROM "TokenDiscovery"
WHERE state = 'new'
  AND "firstSeenAt" >= NOW() - INTERVAL '72 hours';

-- Show the most recent NEW tokens
SELECT 
  "firstSeenAt",
  symbol,
  mint,
  status
FROM "TokenDiscovery"
WHERE state = 'new'
ORDER BY "firstSeenAt" DESC
LIMIT 5;

-- Check if tokens are being created at all (any state, last hour)
SELECT 
  COUNT(*) as tokens_last_hour,
  COUNT(*) FILTER (WHERE state = 'new') as new_tokens,
  COUNT(*) FILTER (WHERE state = 'graduating') as graduating_tokens
FROM "TokenDiscovery"
WHERE "firstSeenAt" >= NOW() - INTERVAL '1 hour';
