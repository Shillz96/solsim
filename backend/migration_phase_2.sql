-- Phase 2 Database Cleanup Migration
-- WARNING: Run this ONLY after deploying Phase 2 code changes!
-- This migration consolidates User identity fields and removes deprecated tables

-- ==========================================
-- PHASE 1: Safe Cleanup (Can run immediately)
-- ==========================================

-- Drop deprecated Holding table (verify it's empty first!)
-- Run this query first: SELECT COUNT(*) FROM "Holding";
-- Only proceed if count = 0
DROP TABLE IF EXISTS "Holding" CASCADE;

-- Remove redundant indexes (duplicates of unique constraints)
DROP INDEX IF EXISTS "Position_userId_mint_idx";
DROP INDEX IF EXISTS "RewardClaim_userId_epoch_idx";

-- ==========================================
-- PHASE 2: User Table Cleanup
-- ==========================================

-- STEP 1: Migrate username to handle for users without handle
UPDATE "User"
SET handle = username
WHERE handle IS NULL OR handle = '';

-- STEP 2: Make handle NOT NULL (now the primary username field)
ALTER TABLE "User" ALTER COLUMN handle SET NOT NULL;

-- STEP 3: Drop the redundant username column
ALTER TABLE "User" DROP COLUMN username;

-- STEP 4: Consolidate avatar fields to avatarUrl
UPDATE "User"
SET "avatarUrl" = COALESCE("avatarUrl", avatar, "profileImage")
WHERE "avatarUrl" IS NULL;

-- STEP 5: Drop redundant avatar columns
ALTER TABLE "User" DROP COLUMN avatar;
ALTER TABLE "User" DROP COLUMN "profileImage";

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Verify all users have handle
DO $$
DECLARE
  users_without_handle INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_without_handle
  FROM "User"
  WHERE handle IS NULL OR handle = '';

  IF users_without_handle > 0 THEN
    RAISE EXCEPTION '% users still have empty handle!', users_without_handle;
  ELSE
    RAISE NOTICE 'SUCCESS: All users have valid handle';
  END IF;
END $$;

-- Verify columns are removed
DO $$
DECLARE
  username_exists BOOLEAN;
  avatar_exists BOOLEAN;
  profileImage_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'username'
  ) INTO username_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'avatar'
  ) INTO avatar_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'profileImage'
  ) INTO profileImage_exists;

  IF username_exists OR avatar_exists OR profileImage_exists THEN
    RAISE EXCEPTION 'Old columns still exist!';
  ELSE
    RAISE NOTICE 'SUCCESS: All redundant columns removed';
  END IF;
END $$;

-- Final verification summary
SELECT
  'Migration Complete!' as status,
  COUNT(*) as total_users,
  COUNT(handle) as users_with_handle,
  COUNT("avatarUrl") as users_with_avatar
FROM "User";
