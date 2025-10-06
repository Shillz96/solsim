-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "virtualSolBalance" DECIMAL NOT NULL DEFAULT 100,
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT true,
    "solanaWallet" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "action" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "price" DECIMAL NOT NULL,
    "totalCost" DECIMAL NOT NULL,
    "realizedPnL" DECIMAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "tokenImageUrl" TEXT,
    "entryPrice" DECIMAL NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Token" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT,
    "name" TEXT,
    "imageUrl" TEXT,
    "lastPrice" DECIMAL,
    "lastTs" DATETIME,
    "volume5m" DECIMAL DEFAULT 0,
    "volume1h" DECIMAL DEFAULT 0,
    "volume24h" DECIMAL DEFAULT 0,
    "priceChange5m" DECIMAL DEFAULT 0,
    "priceChange1h" DECIMAL DEFAULT 0,
    "priceChange24h" DECIMAL DEFAULT 0,
    "liquidityUsd" DECIMAL DEFAULT 0,
    "marketCapUsd" DECIMAL DEFAULT 0,
    "holderCount" BIGINT DEFAULT 0,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "momentumScore" DECIMAL DEFAULT 0,
    "websites" TEXT DEFAULT '[]',
    "socials" TEXT DEFAULT '[]',
    "firstSeenAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Trade_userId_timestamp_idx" ON "Trade"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Trade_tokenAddress_timestamp_idx" ON "Trade"("tokenAddress", "timestamp");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_tokenAddress_idx" ON "Holding"("tokenAddress");

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
