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
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "website" TEXT,
    "virtualSolBalance" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT true,
    "solanaWallet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "action" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "realizedPnL" DECIMAL(65,30),
    "marketCapUsd" DECIMAL(65,30),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
CREATE TABLE "Token" (
    "address" TEXT NOT NULL,
    "symbol" TEXT,
    "name" TEXT,
    "imageUrl" TEXT,
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
    "socials" TEXT DEFAULT '[]',
    "firstSeenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "user_trades_recent" ON "Trade"("userId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "token_trades_recent" ON "Trade"("tokenAddress", "timestamp" DESC);

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
CREATE INDEX "Token_lastTs_idx" ON "Token"("lastTs");

-- CreateIndex
CREATE INDEX "Token_isTrending_momentumScore_idx" ON "Token"("isTrending", "momentumScore");

-- CreateIndex
CREATE INDEX "Token_symbol_idx" ON "Token"("symbol");

-- CreateIndex
CREATE INDEX "Token_isNew_idx" ON "Token"("isNew");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
