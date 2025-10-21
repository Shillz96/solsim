-- ============================================================================
-- Add WalletTrackerSettings Table Migration
-- ============================================================================
-- Purpose: Create settings table for user-configurable wallet tracker filters
-- Run this SQL on your Railway PostgreSQL database
-- ============================================================================

-- Step 1: Create the WalletTrackerSettings table
CREATE TABLE IF NOT EXISTS "WalletTrackerSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    -- Transaction Type Filters
    "showBuys" BOOLEAN NOT NULL DEFAULT true,
    "showSells" BOOLEAN NOT NULL DEFAULT true,
    "showFirstBuyOnly" BOOLEAN NOT NULL DEFAULT false,

    -- Market Cap Filters (USD)
    "minMarketCap" DECIMAL(65,30),  -- NULL = no minimum
    "maxMarketCap" DECIMAL(65,30),  -- NULL = no maximum

    -- Transaction Amount Filters (USD)
    "minTransactionUsd" DECIMAL(65,30),  -- NULL = no minimum
    "maxTransactionUsd" DECIMAL(65,30),  -- NULL = no maximum

    -- Image Filter
    "requireImages" BOOLEAN NOT NULL DEFAULT false,  -- If true, only show trades with token images

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTrackerSettings_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create unique constraint on userId
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTrackerSettings_userId_key" ON "WalletTrackerSettings"("userId");

-- Step 3: Create index on userId for performance
CREATE INDEX IF NOT EXISTS "WalletTrackerSettings_userId_idx" ON "WalletTrackerSettings"("userId");

-- Step 4: Add foreign key constraint to User table
ALTER TABLE "WalletTrackerSettings"
ADD CONSTRAINT "WalletTrackerSettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if table was created successfully
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'WalletTrackerSettings'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'WalletTrackerSettings';

-- Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'WalletTrackerSettings'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- UNCOMMENT to rollback the migration

-- DROP TABLE IF EXISTS "WalletTrackerSettings" CASCADE;
