-- Debug NEW tokens query - see what might be filtered out
-- Run this to see why NEW tokens aren't showing

-- Check NEW tokens that should be visible (matching our code)
SELECT 
  mint,
  symbol,
  name,
  state,
  "firstSeenAt",
  "freezeRevoked",
  "mintRenounced",
  volume24hSol,
  holderCount
FROM "TokenDiscovery"
WHERE state = 'new'
  AND "firstSeenAt" >= NOW() - INTERVAL '72 hours'
ORDER BY "firstSeenAt" DESC
LIMIT 20;

-- Check if NEW tokens have security flags set
SELECT 
  COUNT(*) as total_new,
  COUNT(*) FILTER (WHERE "freezeRevoked" = true) as freeze_revoked,
  COUNT(*) FILTER (WHERE "mintRenounced" = true) as mint_renounced,
  COUNT(*) FILTER (WHERE "freezeRevoked" = true AND "mintRenounced" = true) as both_security
FROM "TokenDiscovery"
WHERE state = 'new';

-- Show distribution of states
SELECT 
  state,
  COUNT(*) as count,
  MIN("firstSeenAt") as oldest,
  MAX("firstSeenAt") as newest
FROM "TokenDiscovery"
GROUP BY state
ORDER BY count DESC;
