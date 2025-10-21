-- Migration: Add missing tables and fix User schema
-- Created: 2025-10-21
-- Description: Adds WalletTrackerSettings, PerpPosition, PerpTrade, Liquidation tables
--              Consolidates User table fields (removes username, avatar, profileImage)
--              Adds missing performance indexes

-- Create WalletTrackerSettings table
CREATE TABLE IF NOT EXISTS "WalletTrackerSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showBuys" BOOLEAN NOT NULL DEFAULT true,
    "showSells" BOOLEAN NOT NULL DEFAULT true,
    "showFirstBuyOnly" BOOLEAN NOT NULL DEFAULT false,
    "minMarketCap" DECIMAL(65,30),
    "maxMarketCap" DECIMAL(65,30),
    "minTransactionUsd" DECIMAL(65,30),
    "maxTransactionUsd" DECIMAL(65,30),
    "requireImages" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WalletTrackerSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WalletTrackerSettings_userId_key" ON "WalletTrackerSettings"("userId");
CREATE INDEX IF NOT EXISTS "WalletTrackerSettings_userId_idx" ON "WalletTrackerSettings"("userId");
ALTER TABLE "WalletTrackerSettings" ADD CONSTRAINT "WalletTrackerSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PerpPosition table
CREATE TABLE IF NOT EXISTS "PerpPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "leverage" DECIMAL(65,30) NOT NULL,
    "entryPrice" DECIMAL(65,30) NOT NULL,
    "currentPrice" DECIMAL(65,30) NOT NULL,
    "positionSize" DECIMAL(65,30) NOT NULL,
    "marginAmount" DECIMAL(65,30) NOT NULL,
    "unrealizedPnL" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "marginRatio" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "liquidationPrice" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PerpPosition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PerpPosition_userId_idx" ON "PerpPosition"("userId");
CREATE INDEX IF NOT EXISTS "PerpPosition_status_idx" ON "PerpPosition"("status");
CREATE INDEX IF NOT EXISTS "PerpPosition_status_marginRatio_idx" ON "PerpPosition"("status", "marginRatio");
CREATE INDEX IF NOT EXISTS "PerpPosition_userId_mint_status_idx" ON "PerpPosition"("userId", "mint", "status");
ALTER TABLE "PerpPosition" ADD CONSTRAINT "PerpPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PerpTrade table
CREATE TABLE IF NOT EXISTS "PerpTrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT,
    "mint" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "leverage" DECIMAL(65,30) NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "entryPrice" DECIMAL(65,30) NOT NULL,
    "exitPrice" DECIMAL(65,30),
    "marginUsed" DECIMAL(65,30) NOT NULL,
    "pnl" DECIMAL(65,30),
    "fees" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerpTrade_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PerpTrade_userId_timestamp_idx" ON "PerpTrade"("userId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "PerpTrade_mint_timestamp_idx" ON "PerpTrade"("mint", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "PerpTrade_positionId_idx" ON "PerpTrade"("positionId");
ALTER TABLE "PerpTrade" ADD CONSTRAINT "PerpTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerpTrade" ADD CONSTRAINT "PerpTrade_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "PerpPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Liquidation table
CREATE TABLE IF NOT EXISTS "Liquidation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "liquidationPrice" DECIMAL(65,30) NOT NULL,
    "positionSize" DECIMAL(65,30) NOT NULL,
    "marginLost" DECIMAL(65,30) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Liquidation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Liquidation_userId_timestamp_idx" ON "Liquidation"("userId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "Liquidation_positionId_idx" ON "Liquidation"("positionId");
ALTER TABLE "Liquidation" ADD CONSTRAINT "Liquidation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix User table: Consolidate fields and make handle required
-- First update any NULL handles with username or email as fallback
DO $$
BEGIN
    -- Update NULL handles with username or email prefix
    UPDATE "User" 
    SET "handle" = COALESCE("username", SPLIT_PART(email, '@', 1))
    WHERE "handle" IS NULL OR "handle" = '';
END $$;

-- Make handle NOT NULL
ALTER TABLE "User" ALTER COLUMN "handle" SET NOT NULL;

-- Drop old redundant columns (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'username') THEN
        ALTER TABLE "User" DROP COLUMN "username";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'avatar') THEN
        ALTER TABLE "User" DROP COLUMN "avatar";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'profileImage') THEN
        ALTER TABLE "User" DROP COLUMN "profileImage";
    END IF;
END $$;

-- Add missing performance indexes
CREATE INDEX IF NOT EXISTS "user_trade_side" ON "Trade"("userId", "side", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "user_positions_by_qty" ON "Position"("userId", "qty" DESC);
CREATE INDEX IF NOT EXISTS "mint_pnl_chronological" ON "RealizedPnL"("mint", "createdAt" DESC);

-- Mark Holding table as deprecated (keep data but will be migrated to Position)
COMMENT ON TABLE "Holding" IS 'DEPRECATED: Use Position table instead. This table is kept for backwards compatibility but should not be used for new features.';
