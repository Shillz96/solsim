-- CreateEnum (only if not exists)
DO $$ BEGIN
    CREATE TYPE "TradeMode" AS ENUM ('PAPER', 'REAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FundingSource" AS ENUM ('DEPOSITED', 'WALLET');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable User - Add real trading fields (if not exists)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "realSolBalance" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tradingMode" "TradeMode" NOT NULL DEFAULT 'PAPER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "realSolDepositAddress" TEXT;

-- AlterTable Trade - Add real trading fields (if not exists)
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "tradeMode" "TradeMode" NOT NULL DEFAULT 'PAPER';
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "realTxSignature" TEXT;
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "realTxStatus" "TransactionStatus";
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "fundingSource" "FundingSource";
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "pumpPortalFee" DECIMAL(65,30);

-- AlterTable Position - Add trade mode and modify unique constraint
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "tradeMode" "TradeMode" NOT NULL DEFAULT 'PAPER';

-- Drop old unique constraint if it exists and create new one with tradeMode
DO $$
BEGIN
    -- Try to drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Position_userId_mint_key'
        AND conrelid = 'Position'::regclass
    ) THEN
        ALTER TABLE "Position" DROP CONSTRAINT "Position_userId_mint_key";
    END IF;

    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Position_userId_mint_tradeMode_key'
        AND conrelid = 'Position'::regclass
    ) THEN
        ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_mint_tradeMode_key" UNIQUE ("userId", "mint", "tradeMode");
    END IF;
END $$;

-- AlterTable PositionLot - Add trade mode (if not exists)
ALTER TABLE "PositionLot" ADD COLUMN IF NOT EXISTS "tradeMode" "TradeMode" NOT NULL DEFAULT 'PAPER';

-- AlterTable RealizedPnL - Add trade mode (if not exists)
ALTER TABLE "RealizedPnL" ADD COLUMN IF NOT EXISTS "tradeMode" "TradeMode" NOT NULL DEFAULT 'PAPER';

-- CreateIndex for Trade - Filter by trading mode (if not exists)
CREATE INDEX IF NOT EXISTS "user_trade_mode" ON "Trade"("userId", "tradeMode", "timestamp" DESC);

-- CreateIndex for Trade - Lookup by transaction signature (if not exists)
CREATE INDEX IF NOT EXISTS "real_tx_signature" ON "Trade"("realTxSignature");

-- CreateIndex for Position - Filter by trading mode (if not exists)
CREATE INDEX IF NOT EXISTS "user_positions_by_mode" ON "Position"("userId", "tradeMode", "qty" DESC);

-- CreateIndex for PositionLot - FIFO queries by trade mode (if not exists)
CREATE INDEX IF NOT EXISTS "PositionLot_userId_mint_tradeMode_createdAt_idx" ON "PositionLot"("userId", "mint", "tradeMode", "createdAt");

-- CreateIndex for RealizedPnL - Filter by trading mode (if not exists)
CREATE INDEX IF NOT EXISTS "RealizedPnL_userId_tradeMode_createdAt_idx" ON "RealizedPnL"("userId", "tradeMode", "createdAt");
