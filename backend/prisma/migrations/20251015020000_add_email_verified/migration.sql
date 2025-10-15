-- Add email verification and password reset fields to User table
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerificationExpiry" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiry" TIMESTAMP(3);

-- Add unique constraints for tokens
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- Create SolPurchase table
CREATE TABLE "SolPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "realSolAmount" DECIMAL(65,30) NOT NULL,
    "simulatedSolAmount" DECIMAL(65,30) NOT NULL,
    "transactionSignature" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tierLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SolPurchase_pkey" PRIMARY KEY ("id")
);

-- Create indexes for SolPurchase
CREATE UNIQUE INDEX "SolPurchase_transactionSignature_key" ON "SolPurchase"("transactionSignature");
CREATE INDEX "SolPurchase_userId_createdAt_idx" ON "SolPurchase"("userId", "createdAt" DESC);
CREATE INDEX "SolPurchase_status_createdAt_idx" ON "SolPurchase"("status", "createdAt" DESC);

-- Add foreign key for SolPurchase
ALTER TABLE "SolPurchase" ADD CONSTRAINT "SolPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
