-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('EMAIL_USER', 'WALLET_USER', 'VSOL_HOLDER', 'ADMINISTRATOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "avatar" TEXT,
    "avatarUrl" TEXT,
    "handle" TEXT,
    "profileImage" TEXT,
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "website" TEXT,
    "virtualSolBalance" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT true,
    "solanaWallet" TEXT,
    "userTier" "UserTier" NOT NULL DEFAULT 'EMAIL_USER',
    "walletAddress" TEXT,
    "walletNonce" TEXT,
    "walletVerified" BOOLEAN NOT NULL DEFAULT false,
    "vsolTokenBalance" DECIMAL(65,30),
    "vsolBalanceUpdated" TIMESTAMP(3),
    "monthlyConversions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "conversionResetAt" TIMESTAMP(3),
    "premiumFeatures" TEXT DEFAULT '[]',
    "rewardPoints" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "action" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "costUsd" DECIMAL(65,30),
    "realizedPnL" DECIMAL(65,30),
    "marketCapUsd" DECIMAL(65,30),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "tokenImageUrl" TEXT,
    "entryPrice" DECIMAL(65,30) NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "avgBuyMarketCap" DECIMAL(65,30),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "action" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "pricePerTokenSol" DECIMAL(65,30) NOT NULL,
    "totalCostSol" DECIMAL(65,30) NOT NULL,
    "feesSol" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "remainingQuantity" DECIMAL(65,30) NOT NULL,
    "costBasisSol" DECIMAL(65,30) NOT NULL,
    "realizedPnLSol" DECIMAL(65,30),
    "tradeId" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "address" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT,
    "imageUrl" TEXT,
    "logoURI" TEXT,
    "lastPrice" DECIMAL(65,30),
    "lastTs" TIMESTAMP(3),
    "volume5m" DECIMAL(65,30) DEFAULT 0,
    "volume1h" DECIMAL(65,30) DEFAULT 0,
    "volume24h" DECIMAL(65,30) DEFAULT 0,
    "priceChange5m" DECIMAL(65,30) DEFAULT 0,
    "priceChange1h" DECIMAL(65,30) DEFAULT 0,
    "priceChange24h" DECIMAL(65,30) DEFAULT 0,
    "liquidityUsd" DECIMAL(65,30) DEFAULT 0,
    "marketCapUsd" DECIMAL(65,30) DEFAULT 0,
    "holderCount" BIGINT DEFAULT 0,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "momentumScore" DECIMAL(65,30) DEFAULT 0,
    "websites" TEXT DEFAULT '[]',
    "website" TEXT,
    "twitter" TEXT,
    "telegram" TEXT,
    "socials" TEXT DEFAULT '[]',
    "firstSeenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3),

    CONSTRAINT "Token_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "ConversionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "virtualSolAmount" DECIMAL(65,30) NOT NULL,
    "vsolTokensReceived" DECIMAL(65,30) NOT NULL,
    "conversionRate" DECIMAL(65,30) NOT NULL,
    "transactionHash" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardSnapshot" (
    "id" TEXT NOT NULL,
    "epoch" INTEGER NOT NULL,
    "totalPoints" DECIMAL(38,18) NOT NULL,
    "poolAmount" DECIMAL(38,18) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "epoch" INTEGER NOT NULL,
    "wallet" TEXT NOT NULL,
    "amount" DECIMAL(38,18) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claimedAt" TIMESTAMP(3),
    "txSig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costBasis" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionLot" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "qtyRemaining" DECIMAL(65,30) NOT NULL,
    "unitCostUsd" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealizedPnL" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "pnl" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealizedPnL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTick" (
    "id" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "priceUsd" DECIMAL(65,30) NOT NULL,
    "volume" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceTick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTrack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "alias" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyTrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "priceUsd" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "CopyTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "user_trades_recent" ON "Trade"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "user_trades_created" ON "Trade"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "token_trades_recent" ON "Trade"("tokenAddress", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "mint_trades_recent" ON "Trade"("mint", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_token_history" ON "Trade"("userId", "tokenAddress", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "user_trade_type" ON "Trade"("userId", "action", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "trades_chronological" ON "Trade"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "user_holdings_by_size" ON "Holding"("userId", "quantity" DESC);

-- CreateIndex
CREATE INDEX "token_holders_by_size" ON "Holding"("tokenAddress", "quantity" DESC);

-- CreateIndex
CREATE INDEX "user_recent_holdings" ON "Holding"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_tokenAddress_key" ON "Holding"("userId", "tokenAddress");

-- CreateIndex
CREATE INDEX "user_token_fifo" ON "TransactionHistory"("userId", "tokenAddress", "executedAt");

-- CreateIndex
CREATE INDEX "user_transactions_recent" ON "TransactionHistory"("userId", "executedAt" DESC);

-- CreateIndex
CREATE INDEX "token_transactions" ON "TransactionHistory"("tokenAddress", "executedAt" DESC);

-- CreateIndex
CREATE INDEX "transaction_type" ON "TransactionHistory"("action", "executedAt" DESC);

-- CreateIndex
CREATE INDEX "available_lots" ON "TransactionHistory"("remainingQuantity");

-- CreateIndex
CREATE INDEX "Token_lastTs_idx" ON "Token"("lastTs");

-- CreateIndex
CREATE INDEX "Token_isTrending_momentumScore_idx" ON "Token"("isTrending", "momentumScore");

-- CreateIndex
CREATE INDEX "Token_symbol_idx" ON "Token"("symbol");

-- CreateIndex
CREATE INDEX "Token_isNew_idx" ON "Token"("isNew");

-- CreateIndex
CREATE INDEX "user_conversions_recent" ON "ConversionHistory"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "conversions_by_status" ON "ConversionHistory"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RewardSnapshot_epoch_key" ON "RewardSnapshot"("epoch");

-- CreateIndex
CREATE INDEX "RewardSnapshot_epoch_idx" ON "RewardSnapshot"("epoch");

-- CreateIndex
CREATE INDEX "RewardClaim_userId_epoch_idx" ON "RewardClaim"("userId", "epoch");

-- CreateIndex
CREATE INDEX "RewardClaim_epoch_claimedAt_idx" ON "RewardClaim"("epoch", "claimedAt");

-- CreateIndex
CREATE INDEX "RewardClaim_status_idx" ON "RewardClaim"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_userId_epoch_key" ON "RewardClaim"("userId", "epoch");

-- CreateIndex
CREATE INDEX "Position_userId_mint_idx" ON "Position"("userId", "mint");

-- CreateIndex
CREATE UNIQUE INDEX "Position_userId_mint_key" ON "Position"("userId", "mint");

-- CreateIndex
CREATE INDEX "PositionLot_positionId_createdAt_idx" ON "PositionLot"("positionId", "createdAt");

-- CreateIndex
CREATE INDEX "PositionLot_userId_mint_createdAt_idx" ON "PositionLot"("userId", "mint", "createdAt");

-- CreateIndex
CREATE INDEX "RealizedPnL_userId_createdAt_idx" ON "RealizedPnL"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RealizedPnL_mint_idx" ON "RealizedPnL"("mint");

-- CreateIndex
CREATE INDEX "PriceTick_mint_timestamp_idx" ON "PriceTick"("mint", "timestamp");

-- CreateIndex
CREATE INDEX "WalletTrack_userId_idx" ON "WalletTrack"("userId");

-- CreateIndex
CREATE INDEX "WalletTrack_address_idx" ON "WalletTrack"("address");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTrack_userId_address_key" ON "WalletTrack"("userId", "address");

-- CreateIndex
CREATE INDEX "CopyTrade_userId_createdAt_idx" ON "CopyTrade"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CopyTrade_walletAddress_createdAt_idx" ON "CopyTrade"("walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "CopyTrade_status_idx" ON "CopyTrade"("status");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionHistory" ADD CONSTRAINT "ConversionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionLot" ADD CONSTRAINT "PositionLot_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealizedPnL" ADD CONSTRAINT "RealizedPnL_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTrack" ADD CONSTRAINT "WalletTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyTrade" ADD CONSTRAINT "CopyTrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
