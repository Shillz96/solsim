-- =====================================================
-- Warp Pipes Database Verification SQL
-- =====================================================

-- 1. VERIFY NEW COLUMNS EXIST
-- Should return 2 rows showing holderCount and creatorWallet columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'TokenDiscovery' 
    AND column_name IN ('holderCount', 'creatorWallet')
ORDER BY column_name;

-- Expected output:
-- column_name     | data_type | is_nullable | column_default
-- ----------------+-----------+-------------+---------------
-- creatorWallet   | text      | YES         | NULL
-- holderCount     | integer   | YES         | NULL


-- 2. VERIFY INDEX EXISTS
-- Should return 1 row showing the holder count index
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE tablename = 'TokenDiscovery'
    AND indexname = 'token_discovery_holder_count';

-- Expected output:
-- indexname                      | indexdef
-- -------------------------------+--------------------------------------------------
-- token_discovery_holder_count   | CREATE INDEX token_discovery_holder_count ON ...


-- 3. CHECK ALL TokenDiscovery COLUMNS
-- Shows complete schema of TokenDiscovery table
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'TokenDiscovery'
ORDER BY ordinal_position;


-- 4. VERIFY 12-HOUR FILTER WORKS
-- Check bonded tokens older than 12 hours (should be removed by cleanup)
SELECT 
    COUNT(*) as old_bonded_count,
    MIN("stateChangedAt") as oldest_bonded_token,
    MAX("stateChangedAt") as newest_bonded_token
FROM "TokenDiscovery"
WHERE state = 'bonded'
    AND "stateChangedAt" < NOW() - INTERVAL '12 hours';

-- Expected output:
-- old_bonded_count | oldest_bonded_token | newest_bonded_token
-- -----------------+--------------------+--------------------
-- 0                | NULL               | NULL
-- (After cleanup runs, should be 0)


-- 5. CHECK RECENT BONDED TOKENS WITH NEW FIELDS
-- View most recent bonded tokens with new metadata
SELECT 
    symbol,
    name,
    "holderCount",
    "creatorWallet",
    "txCount24h",
    description,
    twitter,
    telegram,
    website,
    "stateChangedAt",
    EXTRACT(EPOCH FROM (NOW() - "stateChangedAt"))/3600 as hours_since_bonded
FROM "TokenDiscovery"
WHERE state = 'bonded'
ORDER BY "stateChangedAt" DESC
LIMIT 10;


-- 6. CHECK METADATA POPULATION RATE
-- See how many tokens have each field populated
SELECT 
    COUNT(*) as total_tokens,
    COUNT("holderCount") as has_holder_count,
    COUNT("creatorWallet") as has_creator_wallet,
    COUNT("txCount24h") as has_tx_count,
    COUNT(description) as has_description,
    COUNT(twitter) as has_twitter,
    COUNT(telegram) as has_telegram,
    COUNT(website) as has_website,
    ROUND(COUNT("holderCount")::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_with_holders,
    ROUND(COUNT("creatorWallet")::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_with_creator
FROM "TokenDiscovery"
WHERE state IN ('bonded', 'graduating', 'new')
    AND "firstSeenAt" > NOW() - INTERVAL '24 hours';


-- 7. SAMPLE TOKEN WITH FULL METADATA
-- View a complete token record with all fields
SELECT *
FROM "TokenDiscovery"
WHERE state = 'bonded'
    AND "holderCount" IS NOT NULL
ORDER BY "stateChangedAt" DESC
LIMIT 1;


-- 8. CHECK TOKEN STATES DISTRIBUTION
-- See distribution of tokens across states
SELECT 
    state,
    COUNT(*) as count,
    MIN("stateChangedAt") as oldest,
    MAX("stateChangedAt") as newest,
    ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - "stateChangedAt"))/3600), 2) as avg_age_hours
FROM "TokenDiscovery"
GROUP BY state
ORDER BY state;


-- 9. VERIFY CLEANUP IS WORKING
-- Check for any stale bonded tokens that should have been cleaned up
SELECT 
    symbol,
    name,
    state,
    "stateChangedAt",
    EXTRACT(EPOCH FROM (NOW() - "stateChangedAt"))/3600 as hours_old,
    "lastUpdatedAt"
FROM "TokenDiscovery"
WHERE state = 'bonded'
    AND "stateChangedAt" < NOW() - INTERVAL '12 hours'
ORDER BY "stateChangedAt" ASC
LIMIT 10;

-- Expected: 0 rows (cleanup should have removed them)


-- 10. CHECK RECENT ACTIVITY
-- See most recently updated tokens with new fields
SELECT 
    symbol,
    state,
    "holderCount",
    "txCount24h",
    LEFT("creatorWallet", 10) as creator_short,
    CASE 
        WHEN twitter IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_twitter,
    CASE 
        WHEN telegram IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_telegram,
    CASE 
        WHEN website IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_website,
    "lastUpdatedAt"
FROM "TokenDiscovery"
ORDER BY "lastUpdatedAt" DESC
LIMIT 20;


-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

-- If columns don't exist, run migration manually:
/*
ALTER TABLE "TokenDiscovery" ADD COLUMN "holderCount" INTEGER;
ALTER TABLE "TokenDiscovery" ADD COLUMN "creatorWallet" TEXT;
CREATE INDEX "token_discovery_holder_count" ON "TokenDiscovery"("holderCount" DESC);
*/

-- If old bonded tokens exist, clean them up manually:
/*
DELETE FROM "TokenDiscovery"
WHERE state = 'bonded'
    AND "stateChangedAt" < NOW() - INTERVAL '12 hours';
*/

-- Check migration status:
/*
SELECT * FROM "_prisma_migrations" 
ORDER BY finished_at DESC 
LIMIT 5;
*/

