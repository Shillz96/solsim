-- AlterTable
-- Add proceedsUsd column to Trade table for tracking sell proceeds in USD
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "proceedsUsd" DECIMAL;

-- Add comment for clarity
COMMENT ON COLUMN "Trade"."proceedsUsd" IS 'SELL: netSOL * solUsdAtFill - proceeds from selling tokens in USD';
