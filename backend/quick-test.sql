-- Quick test: Check why GRADUATING and BONDED are empty
-- Copy-paste this into: railway connect -> Select Postgres

-- 1. Test GRADUATING with NO filters (should show many)
SELECT COUNT(*) as total_graduating 
FROM "TokenDiscovery" 
WHERE state = 'graduating';

-- 2. Test GRADUATING with volume filter only
SELECT COUNT(*) as has_volume 
FROM "TokenDiscovery" 
WHERE state = 'graduating' 
  AND "volume24hSol" >= 0.1;

-- 3. Test GRADUATING with lastTradeTs filter
SELECT COUNT(*) as has_recent_trade 
FROM "TokenDiscovery" 
WHERE state = 'graduating' 
  AND "lastTradeTs" IS NOT NULL
  AND "lastTradeTs" >= NOW() - INTERVAL '12 hours';

-- 4. Show sample GRADUATING tokens with ALL values
SELECT 
  mint,
  symbol,
  "bondingCurveProgress",
  "volume24hSol",
  "lastTradeTs",
  "holderCount"
FROM "TokenDiscovery"
WHERE state = 'graduating'
ORDER BY "firstSeenAt" DESC
LIMIT 5;

-- 5. Test BONDED with NO filters
SELECT COUNT(*) as total_bonded 
FROM "TokenDiscovery" 
WHERE state = 'bonded';

-- 6. Test BONDED with recent check
SELECT COUNT(*) as recent_bonded 
FROM "TokenDiscovery" 
WHERE state = 'bonded'
  AND "stateChangedAt" >= NOW() - INTERVAL '72 hours';

-- 7. Show sample BONDED tokens with ALL values  
SELECT 
  mint,
  symbol,
  "stateChangedAt",
  "lastTradeTs",
  "volume24hSol",
  status
FROM "TokenDiscovery"
WHERE state = 'bonded'
ORDER BY "stateChangedAt" DESC
LIMIT 5;
