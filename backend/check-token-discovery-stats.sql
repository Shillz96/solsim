-- Token Discovery Cleanup Script
-- Removes 80% of tokens, keeping the most valuable/recent ones for launch

-- First, let's see what we're working with
SELECT 
    COUNT(*) as total_tokens,
    COUNT(CASE WHEN "marketCapUsd" > 100000 THEN 1 END) as high_mcap_tokens,
    COUNT(CASE WHEN "volume24h" > 10000 THEN 1 END) as high_volume_tokens,
    COUNT(CASE WHEN "holderCount" > 100 THEN 1 END) as well_distributed_tokens,
    COUNT(CASE WHEN "lastTradeTs" > NOW() - INTERVAL '7 days' THEN 1 END) as recently_traded_tokens,
    MIN("firstSeenAt") as oldest_token,
    MAX("firstSeenAt") as newest_token
FROM "TokenDiscovery";