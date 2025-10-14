-- CreateTable
CREATE TABLE "WalletActivity" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenInMint" TEXT,
    "tokenInSymbol" TEXT,
    "tokenInAmount" DECIMAL(65,30),
    "tokenOutMint" TEXT,
    "tokenOutSymbol" TEXT,
    "tokenOutAmount" DECIMAL(65,30),
    "priceUsd" DECIMAL(65,30),
    "solAmount" DECIMAL(65,30),
    "program" TEXT,
    "fee" DECIMAL(65,30),
    "profitLoss" DECIMAL(65,30),
    "marketCap" DECIMAL(65,30),
    "volume24h" DECIMAL(65,30),
    "priceChange24h" DECIMAL(65,30),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "blockTime" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletActivity_signature_key" ON "WalletActivity"("signature");

-- CreateIndex
CREATE INDEX "WalletActivity_walletAddress_timestamp_idx" ON "WalletActivity"("walletAddress", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "WalletActivity_signature_idx" ON "WalletActivity"("signature");

-- CreateIndex
CREATE INDEX "WalletActivity_tokenInMint_timestamp_idx" ON "WalletActivity"("tokenInMint", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "WalletActivity_tokenOutMint_timestamp_idx" ON "WalletActivity"("tokenOutMint", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "WalletActivity_type_timestamp_idx" ON "WalletActivity"("type", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "WalletActivity_timestamp_idx" ON "WalletActivity"("timestamp" DESC);
