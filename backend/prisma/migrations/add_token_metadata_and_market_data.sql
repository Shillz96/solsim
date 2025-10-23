-- Add social media and metadata fields to TokenDiscovery
ALTER TABLE "TokenDiscovery"
ADD COLUMN "description" TEXT,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "twitter" TEXT,
ADD COLUMN "telegram" TEXT,
ADD COLUMN "website" TEXT;

-- Add market data fields to TokenDiscovery
ALTER TABLE "TokenDiscovery"
ADD COLUMN "marketCapUsd" DECIMAL(65,30),
ADD COLUMN "volume24h" DECIMAL(65,30),
ADD COLUMN "volumeChange24h" DECIMAL(65,30),
ADD COLUMN "priceUsd" DECIMAL(65,30),
ADD COLUMN "priceChange24h" DECIMAL(65,30),
ADD COLUMN "txCount24h" INTEGER;

-- Add indexes for sorting by volume and market cap
CREATE INDEX "token_discovery_volume" ON "TokenDiscovery"("volume24h" DESC NULLS LAST);
CREATE INDEX "token_discovery_market_cap" ON "TokenDiscovery"("marketCapUsd" DESC NULLS LAST);

-- Comments for documentation
COMMENT ON COLUMN "TokenDiscovery"."description" IS 'Token description from IPFS metadata';
COMMENT ON COLUMN "TokenDiscovery"."imageUrl" IS 'Parsed image URL from metadata (IPFS gateway URL)';
COMMENT ON COLUMN "TokenDiscovery"."twitter" IS 'Twitter profile URL or handle';
COMMENT ON COLUMN "TokenDiscovery"."telegram" IS 'Telegram group or channel URL';
COMMENT ON COLUMN "TokenDiscovery"."website" IS 'Project website URL';
COMMENT ON COLUMN "TokenDiscovery"."marketCapUsd" IS 'Market capitalization in USD (FDV)';
COMMENT ON COLUMN "TokenDiscovery"."volume24h" IS '24-hour trading volume in USD';
COMMENT ON COLUMN "TokenDiscovery"."volumeChange24h" IS '24-hour volume change percentage';
COMMENT ON COLUMN "TokenDiscovery"."priceUsd" IS 'Current token price in USD';
COMMENT ON COLUMN "TokenDiscovery"."priceChange24h" IS '24-hour price change percentage';
COMMENT ON COLUMN "TokenDiscovery"."txCount24h" IS '24-hour transaction count (buys + sells)';
