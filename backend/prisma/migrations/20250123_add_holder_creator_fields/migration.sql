-- Add holderCount and creatorWallet to TokenDiscovery table
ALTER TABLE "TokenDiscovery" ADD COLUMN "holderCount" INTEGER;
ALTER TABLE "TokenDiscovery" ADD COLUMN "creatorWallet" TEXT;

-- Add index for efficient querying by holder count
CREATE INDEX "token_discovery_holder_count" ON "TokenDiscovery"("holderCount" DESC);

