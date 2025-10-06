-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT,
    "tokenName" TEXT,
    "tokenImageUrl" TEXT,
    "entryPrice" DECIMAL NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "avgBuyMarketCap" DECIMAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Holding" ("avgBuyMarketCap", "entryPrice", "id", "quantity", "tokenAddress", "tokenImageUrl", "tokenName", "tokenSymbol", "updatedAt", "userId") SELECT "avgBuyMarketCap", "entryPrice", "id", "quantity", "tokenAddress", "tokenImageUrl", "tokenName", "tokenSymbol", "updatedAt", "userId" FROM "Holding";
DROP TABLE "Holding";
ALTER TABLE "new_Holding" RENAME TO "Holding";
CREATE INDEX "user_holdings_by_size" ON "Holding"("userId", "quantity" DESC);
CREATE INDEX "token_holders_by_size" ON "Holding"("tokenAddress", "quantity" DESC);
CREATE INDEX "user_recent_holdings" ON "Holding"("userId", "updatedAt" DESC);
CREATE UNIQUE INDEX "Holding_userId_tokenAddress_key" ON "Holding"("userId", "tokenAddress");
CREATE TABLE "new_Trade" (
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
    "marketCapUsd" DECIMAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("action", "id", "marketCapUsd", "price", "quantity", "realizedPnL", "timestamp", "tokenAddress", "tokenName", "tokenSymbol", "totalCost", "userId") SELECT "action", "id", "marketCapUsd", "price", "quantity", "realizedPnL", "timestamp", "tokenAddress", "tokenName", "tokenSymbol", "totalCost", "userId" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE INDEX "user_trades_recent" ON "Trade"("userId", "timestamp" DESC);
CREATE INDEX "token_trades_recent" ON "Trade"("tokenAddress", "timestamp" DESC);
CREATE INDEX "user_token_history" ON "Trade"("userId", "tokenAddress", "timestamp" DESC);
CREATE INDEX "user_trade_type" ON "Trade"("userId", "action", "timestamp" DESC);
CREATE INDEX "trades_chronological" ON "Trade"("timestamp" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
