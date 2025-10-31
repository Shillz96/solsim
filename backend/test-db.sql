-- Test if TokenDiscovery table exists and check its data
-- Run this in Railway Postgres console

-- 1. Check if table exists (case-sensitive!)
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'TokenDiscovery'
);

-- 2. If exists, count tokens by state
SELECT state, COUNT(*) as count 
FROM "TokenDiscovery" 
GROUP BY state
ORDER BY count DESC;

-- 3. Check recent tokens (last 24 hours)
SELECT 
  mint, 
  symbol, 
  name, 
  state, 
  "firstSeenAt", 
  "lastUpdatedAt"
FROM "TokenDiscovery"
WHERE "firstSeenAt" >= NOW() - INTERVAL '24 hours'
ORDER BY "firstSeenAt" DESC
LIMIT 10;

-- 4. Check if any tokens exist at all
SELECT COUNT(*) as total_tokens FROM "TokenDiscovery";

-- 5. Show table schema to verify columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'TokenDiscovery'
ORDER BY ordinal_position;
