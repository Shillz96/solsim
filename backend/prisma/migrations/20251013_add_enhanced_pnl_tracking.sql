-- Migration: Add enhanced PnL tracking
-- Created: 2025-10-13

-- Add new fields to Trade table
ALTER TABLE "Trade" 
ADD COLUMN IF NOT EXISTS "solUsdAtFill" DECIMAL,
ADD COLUMN IF NOT EXISTS "grossSol" DECIMAL,
ADD COLUMN IF NOT EXISTS "feesSol" DECIMAL,
ADD COLUMN IF NOT EXISTS "netSol" DECIMAL,
ADD COLUMN IF NOT EXISTS "route" TEXT,
ADD COLUMN IF NOT EXISTS "priceSOLPerToken" DECIMAL;

-- Add new fields to PositionLot table
ALTER TABLE "PositionLot"
ADD COLUMN IF NOT EXISTS "unitCostSol" DECIMAL,
ADD COLUMN IF NOT EXISTS "solUsdAtBuy" DECIMAL;

-- Add new fields to RealizedPnL table
ALTER TABLE "RealizedPnL"
ADD COLUMN IF NOT EXISTS "pnlUsd" DECIMAL,
ADD COLUMN IF NOT EXISTS "pnlSol" DECIMAL,
ADD COLUMN IF NOT EXISTS "tradeId" TEXT;

-- Create index on RealizedPnL.tradeId
CREATE INDEX IF NOT EXISTS "RealizedPnL_tradeId_idx" ON "RealizedPnL"("tradeId");

-- Create LotClosure table
CREATE TABLE IF NOT EXISTS "LotClosure" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "sellTradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "qtyClosedUnits" DECIMAL NOT NULL,
    "costSOL" DECIMAL NOT NULL,
    "costUSD" DECIMAL NOT NULL,
    "proceedsSOL" DECIMAL NOT NULL,
    "proceedsUSD" DECIMAL NOT NULL,
    "realizedPnlSOL" DECIMAL NOT NULL,
    "realizedPnlUSD" DECIMAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotClosure_pkey" PRIMARY KEY ("id")
);

-- Create indexes for LotClosure
CREATE INDEX IF NOT EXISTS "LotClosure_lotId_idx" ON "LotClosure"("lotId");
CREATE INDEX IF NOT EXISTS "LotClosure_sellTradeId_idx" ON "LotClosure"("sellTradeId");
CREATE INDEX IF NOT EXISTS "LotClosure_userId_mint_createdAt_idx" ON "LotClosure"("userId", "mint", "createdAt");

-- Backfill existing data where possible
-- Set solUsdAtFill to a default value (current SOL price ~$150) for existing trades
UPDATE "Trade" 
SET "solUsdAtFill" = 150.0
WHERE "solUsdAtFill" IS NULL;

-- Set netSol equal to totalCost for existing trades (best approximation)
UPDATE "Trade"
SET "netSol" = "totalCost",
    "grossSol" = "totalCost",
    "feesSol" = 0
WHERE "netSol" IS NULL;

-- Set priceSOLPerToken from price and assumed SOL/USD rate
UPDATE "Trade"
SET "priceSOLPerToken" = "price" / 150.0
WHERE "priceSOLPerToken" IS NULL AND "price" IS NOT NULL;

-- Backfill PositionLot with estimated SOL values
UPDATE "PositionLot"
SET "unitCostSol" = "unitCostUsd" / 150.0,
    "solUsdAtBuy" = 150.0
WHERE "unitCostSol" IS NULL;

-- Backfill RealizedPnL USD values from pnl field
UPDATE "RealizedPnL"
SET "pnlUsd" = "pnl",
    "pnlSol" = "pnl" / 150.0
WHERE "pnlUsd" IS NULL;
