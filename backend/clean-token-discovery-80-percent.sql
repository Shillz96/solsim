-- Token Discovery Cleanup Script for Launch
-- Removes 80% of tokens (~16,144), keeping ~4,036 of the most valuable ones
-- Total tokens: ~20,180 → Target: ~4,000

/*
Strategy: Keep tokens that are:
1. High market cap (>$50k)
2. High volume (>$5k in 24h)
3. Well distributed (>50 holders)
4. Recently active (traded in last 7 days)
5. Graduated/bonded tokens (more established)
6. Newest tokens (last 30 days for discovery)
*/

BEGIN;

-- First, let's see what we're working with (informational)
SELECT 
    COUNT(*) as total_tokens,
    COUNT(CASE WHEN marketCapUsd > 50000 THEN 1 END) as high_mcap_tokens,
    COUNT(CASE WHEN volume24h > 5000 THEN 1 END) as high_volume_tokens,
    COUNT(CASE WHEN holderCount > 50 THEN 1 END) as well_distributed_tokens,
    COUNT(CASE WHEN lastTradeTs > NOW() - INTERVAL '7 days' THEN 1 END) as recently_traded_tokens,
    COUNT(CASE WHEN state IN ('bonded', 'graduating') THEN 1 END) as established_tokens,
    COUNT(CASE WHEN firstSeenAt > NOW() - INTERVAL '30 days' THEN 1 END) as new_tokens
FROM "TokenDiscovery";

-- Create a temporary table with tokens to KEEP
CREATE TEMP TABLE tokens_to_keep AS
WITH priority_tokens AS (
  SELECT 
    id,
    mint,
    -- Priority scoring system
    CASE 
      WHEN "marketCapUsd" > 1000000 THEN 100 -- Mega caps
      WHEN "marketCapUsd" > 500000 THEN 90   -- Large caps
      WHEN "marketCapUsd" > 100000 THEN 80   -- Mid caps
      WHEN "marketCapUsd" > 50000 THEN 70    -- Small caps
      ELSE 0
    END +
    CASE 
      WHEN "volume24h" > 100000 THEN 50      -- High volume
      WHEN "volume24h" > 50000 THEN 40       -- Good volume
      WHEN "volume24h" > 10000 THEN 30       -- Decent volume
      WHEN "volume24h" > 5000 THEN 20        -- Some volume
      ELSE 0
    END +
    CASE 
      WHEN "holderCount" > 1000 THEN 30      -- Well distributed
      WHEN "holderCount" > 500 THEN 25       -- Good distribution
      WHEN "holderCount" > 100 THEN 20       -- Decent distribution
      WHEN "holderCount" > 50 THEN 15        -- Some distribution
      ELSE 0
    END +
    CASE 
      WHEN "state" = 'bonded' THEN 25        -- Graduated tokens
      WHEN "state" = 'graduating' THEN 20    -- About to graduate
      WHEN "state" = 'new' THEN 10           -- New but unproven
      ELSE 5
    END +
    CASE 
      WHEN "lastTradeTs" > NOW() - INTERVAL '1 day' THEN 20     -- Very recent
      WHEN "lastTradeTs" > NOW() - INTERVAL '3 days' THEN 15    -- Recent
      WHEN "lastTradeTs" > NOW() - INTERVAL '7 days' THEN 10    -- Somewhat recent
      ELSE 0
    END +
    CASE 
      WHEN "firstSeenAt" > NOW() - INTERVAL '7 days' THEN 15    -- Brand new discovery
      WHEN "firstSeenAt" > NOW() - INTERVAL '30 days' THEN 10   -- Recent discovery
      ELSE 0
    END as priority_score
  FROM "TokenDiscovery"
)
-- Keep top tokens by priority score
SELECT id, mint, priority_score
FROM priority_tokens
WHERE priority_score > 0
ORDER BY priority_score DESC, "marketCapUsd" DESC NULLS LAST
LIMIT 4000;

-- Show what we're keeping (informational)
SELECT 
  'KEEPING' as action,
  COUNT(*) as count,
  MIN(priority_score) as min_score,
  MAX(priority_score) as max_score,
  AVG(priority_score) as avg_score
FROM tokens_to_keep;

-- Delete tokens that are NOT in our keep list
DELETE FROM "TokenDiscovery" 
WHERE id NOT IN (SELECT id FROM tokens_to_keep);

-- Show final results
SELECT 
  'FINAL RESULT' as status,
  COUNT(*) as remaining_tokens,
  COUNT(CASE WHEN "marketCapUsd" > 50000 THEN 1 END) as high_mcap_remaining,
  COUNT(CASE WHEN "volume24h" > 5000 THEN 1 END) as high_volume_remaining,
  COUNT(CASE WHEN "holderCount" > 50 THEN 1 END) as well_distributed_remaining,
  COUNT(CASE WHEN "state" IN ('bonded', 'graduating') THEN 1 END) as established_remaining
FROM "TokenDiscovery";

COMMIT;

-- Clean up any orphaned records and optimize
VACUUM ANALYZE "TokenDiscovery";