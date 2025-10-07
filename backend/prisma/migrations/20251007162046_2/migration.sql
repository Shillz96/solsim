-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('EMAIL_USER', 'WALLET_USER', 'SIM_HOLDER', 'ADMINISTRATOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "conversionResetAt" TIMESTAMP(3),
ADD COLUMN     "monthlyConversions" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "premiumFeatures" TEXT DEFAULT '[]',
ADD COLUMN     "simBalanceUpdated" TIMESTAMP(3),
ADD COLUMN     "simTokenBalance" DECIMAL(65,30),
ADD COLUMN     "userTier" "UserTier" NOT NULL DEFAULT 'EMAIL_USER',
ADD COLUMN     "walletAddress" TEXT,
ADD COLUMN     "walletVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConversionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "virtualSolAmount" DECIMAL(65,30) NOT NULL,
    "simTokensReceived" DECIMAL(65,30) NOT NULL,
    "conversionRate" DECIMAL(65,30) NOT NULL,
    "transactionHash" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_conversions_recent" ON "ConversionHistory"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "conversions_by_status" ON "ConversionHistory"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ConversionHistory" ADD CONSTRAINT "ConversionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
