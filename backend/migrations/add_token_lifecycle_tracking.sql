-- Migration: Add Token Lifecycle Tracking Fields
-- Date: 2025-01-23
-- Description: Add enhanced trading metrics, status classification, and safety fields for token lifecycle tracking

-- Add enhanced trading metrics
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "lastTradeTs" TIMESTAMP(3);
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "volume24hSol" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "buys24h" INTEGER DEFAULT 0;
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "sells24h" INTEGER DEFAULT 0;
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "uniqueTraders24h" INTEGER DEFAULT 0;
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "ath" DECIMAL(65,30);

-- Add bonding curve specifics
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "solRaised" DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "solToGraduate" DECIMAL(65,30) DEFAULT 0;

-- Add holder concentration & safety fields
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "top1HolderPct" DECIMAL(65,30);
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "top5HolderPct" DECIMAL(65,30);
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "mintAuthorityRevoked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "sellable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "tradeFailRate" DECIMAL(65,30) DEFAULT 0;

-- Add status classification (lifecycle state)
ALTER TABLE "TokenDiscovery" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'LAUNCHING';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "token_discovery_status_updated" ON "TokenDiscovery"("status", "lastUpdatedAt" DESC);
CREATE INDEX IF NOT EXISTS "token_discovery_last_trade" ON "TokenDiscovery"("lastTradeTs" DESC);

-- Add comment for status field
COMMENT ON COLUMN "TokenDiscovery"."status" IS 'Lifecycle status: LAUNCHING | ACTIVE | ABOUT_TO_BOND | BONDED | DEAD';

