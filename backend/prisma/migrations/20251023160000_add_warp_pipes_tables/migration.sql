-- Warp Pipes Hub: Token Discovery & Watch Tables
-- Add TokenDiscovery table for tracking bonded/graduating/new tokens
-- Add TokenWatch table for user watch preferences and notifications

-- CreateTable
CREATE TABLE "TokenDiscovery" (
    "id" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT,
    "logoURI" TEXT,
    "state" TEXT NOT NULL,
    "previousState" TEXT,
    "bondingCurveProgress" DECIMAL(65,30),
    "bondingCurveKey" TEXT,
    "poolAddress" TEXT,
    "poolType" TEXT,
    "poolCreatedAt" TIMESTAMP(3),
    "liquidityUsd" DECIMAL(65,30),
    "freezeRevoked" BOOLEAN NOT NULL DEFAULT false,
    "mintRenounced" BOOLEAN NOT NULL DEFAULT false,
    "priceImpact1Pct" DECIMAL(65,30),
    "creatorVerified" BOOLEAN NOT NULL DEFAULT false,
    "hotScore" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "watcherCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "stateChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "notifyOnGraduation" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnMigration" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnPriceChange" BOOLEAN NOT NULL DEFAULT false,
    "currentState" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TokenDiscovery_mint_key" ON "TokenDiscovery"("mint");

-- CreateIndex
CREATE INDEX "token_discovery_state_hot" ON "TokenDiscovery"("state", "hotScore" DESC);

-- CreateIndex
CREATE INDEX "token_discovery_mint" ON "TokenDiscovery"("mint");

-- CreateIndex
CREATE INDEX "token_discovery_state_updated" ON "TokenDiscovery"("state", "lastUpdatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "userId_mint" ON "TokenWatch"("userId", "mint");

-- CreateIndex
CREATE INDEX "token_watch_user" ON "TokenWatch"("userId");

-- CreateIndex
CREATE INDEX "token_watch_mint" ON "TokenWatch"("mint");

-- CreateIndex
CREATE INDEX "token_watch_user_recent" ON "TokenWatch"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "TokenWatch" ADD CONSTRAINT "TokenWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
