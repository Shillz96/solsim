-- ============================================================================
-- Wallet Activities Cleanup Script
-- ============================================================================
-- Purpose: Remove wallet activities without images from the database
-- This fixes the issue where old activities display without token logos
--
-- IMPORTANT: This will PERMANENTLY DELETE data. Run at your own risk.
-- Recommended: Take a database backup before running this script.
-- ============================================================================

-- Step 1: Count activities that will be deleted (preview)
-- Run this first to see what will be affected
SELECT
  type,
  COUNT(*) as count,
  MIN(timestamp) as oldest,
  MAX(timestamp) as newest
FROM "WalletActivity"
WHERE
  -- BUY trades without tokenOut logo
  (type = 'BUY' AND "tokenOutLogoURI" IS NULL)
  OR
  -- SELL trades without tokenIn logo
  (type = 'SELL' AND "tokenInLogoURI" IS NULL)
  OR
  -- SWAP trades without either logo
  (type = 'SWAP' AND "tokenInLogoURI" IS NULL AND "tokenOutLogoURI" IS NULL)
GROUP BY type;

-- Total count of activities to be deleted
SELECT COUNT(*) as total_activities_to_delete
FROM "WalletActivity"
WHERE
  (type = 'BUY' AND "tokenOutLogoURI" IS NULL)
  OR
  (type = 'SELL' AND "tokenInLogoURI" IS NULL)
  OR
  (type = 'SWAP' AND "tokenInLogoURI" IS NULL AND "tokenOutLogoURI" IS NULL);

-- ============================================================================
-- Step 2: Preview sample of activities that will be deleted
-- ============================================================================
SELECT
  id,
  type,
  signature,
  "walletAddress",
  "tokenInSymbol",
  "tokenOutSymbol",
  timestamp,
  "createdAt"
FROM "WalletActivity"
WHERE
  (type = 'BUY' AND "tokenOutLogoURI" IS NULL)
  OR
  (type = 'SELL' AND "tokenInLogoURI" IS NULL)
  OR
  (type = 'SWAP' AND "tokenInLogoURI" IS NULL AND "tokenOutLogoURI" IS NULL)
ORDER BY timestamp DESC
LIMIT 10;

-- ============================================================================
-- Step 3: DELETE activities without images (IRREVERSIBLE!)
-- ============================================================================
-- UNCOMMENT THE FOLLOWING LINE TO EXECUTE THE DELETE
-- WARNING: This cannot be undone without a database backup!

-- DELETE FROM "WalletActivity"
-- WHERE
--   (type = 'BUY' AND "tokenOutLogoURI" IS NULL)
--   OR
--   (type = 'SELL' AND "tokenInLogoURI" IS NULL)
--   OR
--   (type = 'SWAP' AND "tokenInLogoURI" IS NULL AND "tokenOutLogoURI" IS NULL);

-- ============================================================================
-- Step 4: Verify deletion (run after Step 3)
-- ============================================================================
-- Count remaining activities
-- SELECT COUNT(*) as total_activities_remaining FROM "WalletActivity";

-- Verify no activities without images remain
-- SELECT COUNT(*) as activities_without_images
-- FROM "WalletActivity"
-- WHERE
--   (type = 'BUY' AND "tokenOutLogoURI" IS NULL)
--   OR
--   (type = 'SELL' AND "tokenInLogoURI" IS NULL)
--   OR
--   (type = 'SWAP' AND "tokenInLogoURI" IS NULL AND "tokenOutLogoURI" IS NULL);

-- ============================================================================
-- Alternative: UPDATE activities to mark as hidden (soft delete)
-- ============================================================================
-- If you prefer to keep the data but hide it, you could add a flag:
-- First, add a column if it doesn't exist:
-- ALTER TABLE "WalletActivity" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT false;

-- Then update instead of delete:
-- UPDATE "WalletActivity"
-- SET "isHidden" = true
-- WHERE
--   (type = 'BUY' AND "tokenOutLogoURI" IS NULL)
--   OR
--   (type = 'SELL' AND "tokenInLogoURI" IS NULL)
--   OR
--   (type = 'SWAP' AND "tokenInLogoURI" IS NULL AND "tokenOutLogoURI" IS NULL);

-- ============================================================================
-- Quick Stats Query (useful for monitoring)
-- ============================================================================
SELECT
  COUNT(*) FILTER (WHERE "tokenInLogoURI" IS NOT NULL OR "tokenOutLogoURI" IS NOT NULL) as activities_with_images,
  COUNT(*) FILTER (WHERE "tokenInLogoURI" IS NULL AND "tokenOutLogoURI" IS NULL) as activities_without_images,
  COUNT(*) as total_activities,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE "tokenInLogoURI" IS NOT NULL OR "tokenOutLogoURI" IS NOT NULL) / COUNT(*),
    2
  ) as percentage_with_images
FROM "WalletActivity";
