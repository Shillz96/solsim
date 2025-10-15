-- AlterTable: Rename SIM columns to VSOL
DO $$
BEGIN
    -- Check and rename simTokenBalance to vsolTokenBalance
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'simTokenBalance'
    ) THEN
        ALTER TABLE "User" RENAME COLUMN "simTokenBalance" TO "vsolTokenBalance";
    END IF;

    -- Check and rename simBalanceUpdated to vsolBalanceUpdated
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'User' AND column_name = 'simBalanceUpdated'
    ) THEN
        ALTER TABLE "User" RENAME COLUMN "simBalanceUpdated" TO "vsolBalanceUpdated";
    END IF;

    -- Check and rename simTokensReceived to vsolTokensReceived in ConversionHistory
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ConversionHistory' AND column_name = 'simTokensReceived'
    ) THEN
        ALTER TABLE "ConversionHistory" RENAME COLUMN "simTokensReceived" TO "vsolTokensReceived";
    END IF;
END $$;

-- Update UserTier enum: SIM_HOLDER to VSOL_HOLDER
DO $$
BEGIN
    -- Check if SIM_HOLDER exists in the enum
    IF EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'SIM_HOLDER'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserTier')
    ) THEN
        -- Create temporary enum with VSOL_HOLDER
        CREATE TYPE "UserTier_new" AS ENUM ('EMAIL_USER', 'WALLET_USER', 'VSOL_HOLDER', 'ADMINISTRATOR');

        -- Update all users with SIM_HOLDER to VSOL_HOLDER
        ALTER TABLE "User" ALTER COLUMN "userTier" TYPE "UserTier_new" USING (
            CASE
                WHEN "userTier"::text = 'SIM_HOLDER' THEN 'VSOL_HOLDER'::text::"UserTier_new"
                ELSE "userTier"::text::"UserTier_new"
            END
        );

        -- Drop old enum and rename new one
        DROP TYPE "UserTier";
        ALTER TYPE "UserTier_new" RENAME TO "UserTier";
    END IF;
END $$;
