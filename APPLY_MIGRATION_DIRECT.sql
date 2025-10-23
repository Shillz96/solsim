-- =====================================================
-- Apply Warp Pipes Migration Directly to Railway DB
-- Copy and paste this into your Railway psql session
-- =====================================================

-- Add the new columns
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "holderCount" INTEGER;
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "creatorWallet" TEXT;

-- Create the index
CREATE INDEX IF NOT EXISTS "token_discovery_holder_count" ON "TokenDiscovery"("holderCount" DESC);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'TokenDiscovery' 
    AND column_name IN ('holderCount', 'creatorWallet')
ORDER BY column_name;

-- Verify index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'TokenDiscovery'
    AND indexname = 'token_discovery_holder_count';

-- Record this migration in Prisma's migration table
INSERT INTO "_prisma_migrations" (
    id,
    checksum,
    finished_at,
    migration_name,
    logs,
    rolled_back_at,
    started_at,
    applied_steps_count
)
VALUES (
    gen_random_uuid(),
    'manual_migration_holder_creator_fields',
    NOW(),
    '20250123_add_holder_creator_fields',
    'Manually applied: Added holderCount and creatorWallet columns',
    NULL,
    NOW(),
    1
)
ON CONFLICT DO NOTHING;

-- Show success message
SELECT 'Migration applied successfully!' as status,
       COUNT(*) FILTER (WHERE column_name = 'holderCount') as holderCount_added,
       COUNT(*) FILTER (WHERE column_name = 'creatorWallet') as creatorWallet_added
FROM information_schema.columns 
WHERE table_name = 'TokenDiscovery' 
    AND column_name IN ('holderCount', 'creatorWallet');

