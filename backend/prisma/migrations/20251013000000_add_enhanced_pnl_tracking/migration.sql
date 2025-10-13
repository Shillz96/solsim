-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "feesSol" DECIMAL,
ADD COLUMN     "grossSol" DECIMAL,
ADD COLUMN     "netSol" DECIMAL,
ADD COLUMN     "priceSOLPerToken" DECIMAL,
ADD COLUMN     "route" TEXT,
ADD COLUMN     "solUsdAtFill" DECIMAL;

-- AlterTable
ALTER TABLE "PositionLot" ADD COLUMN     "solUsdAtBuy" DECIMAL,
ADD COLUMN     "unitCostSol" DECIMAL;

-- AlterTable
ALTER TABLE "RealizedPnL" ADD COLUMN     "pnlSol" DECIMAL,
ADD COLUMN     "pnlUsd" DECIMAL,
ADD COLUMN     "tradeId" TEXT;

-- CreateTable
CREATE TABLE "LotClosure" (
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

-- CreateIndex
CREATE INDEX "RealizedPnL_tradeId_idx" ON "RealizedPnL"("tradeId");

-- CreateIndex
CREATE INDEX "LotClosure_lotId_idx" ON "LotClosure"("lotId");

-- CreateIndex
CREATE INDEX "LotClosure_sellTradeId_idx" ON "LotClosure"("sellTradeId");

-- CreateIndex
CREATE INDEX "LotClosure_userId_mint_createdAt_idx" ON "LotClosure"("userId", "mint", "createdAt");
