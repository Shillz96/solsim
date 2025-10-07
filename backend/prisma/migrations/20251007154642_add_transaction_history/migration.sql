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

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
