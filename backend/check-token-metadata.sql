-- Check token metadata quality
-- Run this in Railway console: railway connect -> Select Postgres

-- 1. Check NEW tokens metadata
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE symbol IS NOT NULL AND symbol != '') as has_symbol,
  COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as has_name,
  COUNT(*) FILTER (WHERE "imageUrl" IS NOT NULL) as has_image,
  COUNT(*) FILTER (WHERE "logoURI" IS NOT NULL) as has_logo
FROM "TokenDiscovery"
WHERE state = 'new'
  AND "firstSeenAt" >= NOW() - INTERVAL '72 hours';

-- 2. Show sample NEW tokens with their metadata
SELECT 
  mint,
  symbol,
  name,
  "imageUrl",
  "logoURI",
  "firstSeenAt"
FROM "TokenDiscovery"
WHERE state = 'new'
  AND "firstSeenAt" >= NOW() - INTERVAL '72 hours'
ORDER BY "firstSeenAt" DESC
LIMIT 10;

-- 3. Check GRADUATING tokens metadata
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE symbol IS NOT NULL AND symbol != '') as has_symbol,
  COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as has_name,
  COUNT(*) FILTER (WHERE "imageUrl" IS NOT NULL) as has_image
FROM "TokenDiscovery"
WHERE state = 'graduating';

-- 4. Show sample GRADUATING tokens
SELECT 
  mint,
  symbol,
  name,
  "imageUrl",
  "bondingCurveProgress"
FROM "TokenDiscovery"
WHERE state = 'graduating'
  AND "bondingCurveProgress" >= 25
ORDER BY "firstSeenAt" DESC
LIMIT 10;
