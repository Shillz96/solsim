-- Simple Token Discovery Cleanup - Keep only last 2 days
-- Much simpler approach: delete anything older than 2 days

BEGIN;

-- Show what we're starting with
SELECT 
    COUNT(*) as total_tokens_before,
    COUNT(CASE WHEN "firstSeenAt" > NOW() - INTERVAL '2 days' THEN 1 END) as tokens_last_2_days,
    COUNT(CASE WHEN "firstSeenAt" <= NOW() - INTERVAL '2 days' THEN 1 END) as tokens_to_delete,
    MIN("firstSeenAt") as oldest_token,
    MAX("firstSeenAt") as newest_token
FROM "TokenDiscovery";

-- Delete all tokens older than 2 days
DELETE FROM "TokenDiscovery" 
WHERE "firstSeenAt" <= NOW() - INTERVAL '2 days';

-- Show final results
SELECT 
    COUNT(*) as remaining_tokens,
    MIN("firstSeenAt") as oldest_remaining,
    MAX("firstSeenAt") as newest_remaining,
    COUNT(CASE WHEN "state" = 'bonded' THEN 1 END) as bonded_remaining,
    COUNT(CASE WHEN "state" = 'graduating' THEN 1 END) as graduating_remaining,
    COUNT(CASE WHEN "state" = 'new' THEN 1 END) as new_remaining
FROM "TokenDiscovery";

COMMIT;

-- Clean up and optimize
VACUUM ANALYZE "TokenDiscovery";