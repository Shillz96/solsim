-- AlterTable
ALTER TABLE "Holding" ADD COLUMN "avgBuyMarketCap" DECIMAL;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "marketCapUsd" DECIMAL;
