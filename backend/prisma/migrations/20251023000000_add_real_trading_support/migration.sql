-- CreateEnum
CREATE TYPE "TradeMode" AS ENUM ('PAPER', 'REAL');

-- CreateEnum
CREATE TYPE "FundingSource" AS ENUM ('DEPOSITED', 'WALLET');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- AlterTable User - Add real trading fields
ALTER TABLE "User" ADD COLUMN "realSolBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
                   ADD COLUMN "tradingMode" "TradeMode" NOT NULL DEFAULT 'PAPER',
                   ADD COLUMN "realSolDepositAddress" TEXT;

-- AlterTable Trade - Add real trading fields
ALTER TABLE "Trade" ADD COLUMN "tradeMode" "TradeMode" NOT NULL DEFAULT 'PAPER',
                    ADD COLUMN "realTxSignature" TEXT,
                    ADD COLUMN "realTxStatus" "TransactionStatus",
                    ADD COLUMN "fundingSource" "FundingSource",
                    ADD COLUMN "pumpPortalFee" DECIMAL(65,30);

-- AlterTable Position - Add trade mode and modify unique constraint
ALTER TABLE "Position" ADD COLUMN "tradeMode" "TradeMode" NOT NULL DEFAULT 'PAPER';

-- Drop old unique constraint and create new one with tradeMode
ALTER TABLE "Position" DROP CONSTRAINT "Position_userId_mint_key";
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_mint_tradeMode_key" UNIQUE ("userId", "mint", "tradeMode");

-- AlterTable PositionLot - Add trade mode
ALTER TABLE "PositionLot" ADD COLUMN "tradeMode" "TradeMode" NOT NULL DEFAULT 'PAPER';

-- AlterTable RealizedPnL - Add trade mode
ALTER TABLE "RealizedPnL" ADD COLUMN "tradeMode" "TradeMode" NOT NULL DEFAULT 'PAPER';

-- CreateIndex for Trade - Filter by trading mode
CREATE INDEX "user_trade_mode" ON "Trade"("userId", "tradeMode", "timestamp" DESC);

-- CreateIndex for Trade - Lookup by transaction signature
CREATE INDEX "real_tx_signature" ON "Trade"("realTxSignature");

-- CreateIndex for Position - Filter by trading mode
CREATE INDEX "user_positions_by_mode" ON "Position"("userId", "tradeMode", "qty" DESC);

-- CreateIndex for PositionLot - FIFO queries by trade mode
CREATE INDEX "PositionLot_userId_mint_tradeMode_createdAt_idx" ON "PositionLot"("userId", "mint", "tradeMode", "createdAt");

-- CreateIndex for RealizedPnL - Filter by trading mode
CREATE INDEX "RealizedPnL_userId_tradeMode_createdAt_idx" ON "RealizedPnL"("userId", "tradeMode", "createdAt");
