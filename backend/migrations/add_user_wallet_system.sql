-- Multi-Wallet Management System Migration
-- Adds UserWallet table and WalletType enum for managing multiple wallets per user

-- Step 1: Create WalletType enum
CREATE TYPE "WalletType" AS ENUM ('PLATFORM_GENERATED', 'IMPORTED');

-- Step 2: Create UserWallet table
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "walletType" "WalletType" NOT NULL,
    "address" TEXT NOT NULL,
    "encryptedKey" TEXT,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create unique constraint on address
CREATE UNIQUE INDEX "UserWallet_address_key" ON "UserWallet"("address");

-- Step 4: Create indexes for performance
CREATE INDEX "UserWallet_userId_isActive_idx" ON "UserWallet"("userId", "isActive");
CREATE INDEX "UserWallet_userId_walletType_idx" ON "UserWallet"("userId", "walletType");

-- Step 5: Add foreign key constraint
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Migrate existing deposit addresses to UserWallet entries
-- This creates a PLATFORM_GENERATED wallet for each user with a realSolDepositAddress
INSERT INTO "UserWallet" (
    "id",
    "userId",
    "name",
    "walletType",
    "address",
    "encryptedKey",
    "balance",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid(),
    "id" as "userId",
    'Main Deposit Wallet' as "name",
    'PLATFORM_GENERATED'::"WalletType" as "walletType",
    "realSolDepositAddress" as "address",
    NULL as "encryptedKey",
    "realSolBalance" as "balance",
    true as "isActive",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "User"
WHERE "realSolDepositAddress" IS NOT NULL;

-- Step 7: Add comment explaining the migration
COMMENT ON TABLE "UserWallet" IS 'Multi-wallet system: Users can have multiple wallets (platform-generated or imported)';
COMMENT ON COLUMN "UserWallet"."walletType" IS 'PLATFORM_GENERATED: Created by platform, IMPORTED: User imported their own wallet';
COMMENT ON COLUMN "UserWallet"."encryptedKey" IS 'Encrypted private key (only for IMPORTED wallets, NULL for PLATFORM_GENERATED)';
COMMENT ON COLUMN "UserWallet"."isActive" IS 'Currently selected wallet for trading (only one active per user)';

-- Migration complete!
-- Next steps:
-- 1. Run: npx prisma db push (if using db push)
-- OR
-- 2. Run: npx prisma migrate dev --name add_user_wallet_system (if using migrations)
-- 3. Run: npx prisma generate

