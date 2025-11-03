-- Hourly Rewards System Migration
-- This migration adds the new hourly rewards tables and removes legacy reward tables

-- ============================================================
-- STEP 1: Remove old reward system tables
-- ============================================================

-- Drop legacy reward tables (if they exist)
DROP TABLE IF EXISTS "RewardClaim" CASCADE;
DROP TABLE IF EXISTS "RewardSnapshot" CASCADE;
DROP TABLE IF EXISTS "SolReward" CASCADE;

-- Remove rewardWalletAddress column from User table (if it exists)
ALTER TABLE "User" DROP COLUMN IF EXISTS "rewardWalletAddress";

-- ============================================================
-- STEP 2: Create new hourly rewards tables
-- ============================================================

-- HourlyRewardPool: Tracks hourly fee collection and distribution
CREATE TABLE IF NOT EXISTS "HourlyRewardPool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hourStart" TIMESTAMP(3) NOT NULL,
    "hourEnd" TIMESTAMP(3) NOT NULL,
    "totalCreatorRewards" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "poolAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "platformAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "distributed" BOOLEAN NOT NULL DEFAULT false,
    "distributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HourlyRewardPayout: Tracks individual winner payouts
CREATE TABLE IF NOT EXISTS "HourlyRewardPayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "profitPercentage" DECIMAL(65,30) NOT NULL,
    "rewardAmount" DECIMAL(65,30) NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "txSignature" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "HourlyRewardPayout_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "HourlyRewardPool"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HourlyRewardPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================
-- STEP 3: Create indexes for performance
-- ============================================================

-- HourlyRewardPool indexes
CREATE INDEX IF NOT EXISTS "HourlyRewardPool_hourStart_idx" ON "HourlyRewardPool"("hourStart");
CREATE INDEX IF NOT EXISTS "HourlyRewardPool_distributed_createdAt_idx" ON "HourlyRewardPool"("distributed", "createdAt" DESC);

-- HourlyRewardPayout indexes
CREATE INDEX IF NOT EXISTS "HourlyRewardPayout_poolId_rank_idx" ON "HourlyRewardPayout"("poolId", "rank");
CREATE INDEX IF NOT EXISTS "HourlyRewardPayout_userId_createdAt_idx" ON "HourlyRewardPayout"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "HourlyRewardPayout_status_idx" ON "HourlyRewardPayout"("status");

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('HourlyRewardPool', 'HourlyRewardPayout')
ORDER BY table_name;

-- Verify old tables were removed
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('RewardClaim', 'RewardSnapshot', 'SolReward')
ORDER BY table_name;

-- Check User table structure (should not have rewardWalletAddress)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'User'
  AND column_name = 'rewardWalletAddress';
