-- Rebrand SIM to VSOL migration
-- This migration renames columns and updates enum values

-- Step 1: Rename columns in User table
ALTER TABLE "User" RENAME COLUMN "simTokenBalance" TO "vsolTokenBalance";
ALTER TABLE "User" RENAME COLUMN "simBalanceUpdated" TO "vsolBalanceUpdated";

-- Step 2: Rename column in ConversionHistory table
ALTER TABLE "ConversionHistory" RENAME COLUMN "simTokensReceived" TO "vsolTokensReceived";

-- Step 3: Add new enum value (must commit before using)
ALTER TYPE "UserTier" ADD VALUE IF NOT EXISTS 'VSOL_HOLDER';

-- Step 4: Update existing records
-- Note: This runs after the enum value is committed
UPDATE "User"
SET "userTier" = 'VSOL_HOLDER'
WHERE "userTier" = 'SIM_HOLDER';

-- Step 5: Create new enum without SIM_HOLDER
DO $$
BEGIN
    -- Create new enum type
    CREATE TYPE "UserTier_new" AS ENUM ('EMAIL_USER', 'WALLET_USER', 'VSOL_HOLDER', 'ADMINISTRATOR');

    -- Alter column to use new type
    ALTER TABLE "User" ALTER COLUMN "userTier" TYPE "UserTier_new" USING ("userTier"::text::"UserTier_new");

    -- Drop old type
    DROP TYPE "UserTier";

    -- Rename new type to original name
    ALTER TYPE "UserTier_new" RENAME TO "UserTier";
END $$;
