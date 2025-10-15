#!/bin/bash
set -e

echo "🔧 Fixing failed migration..."

# Step 1: Mark the failed migration as rolled back
echo "Step 1: Resolving failed migration..."
npx prisma migrate resolve --rolled-back 20251015_rebrand_sim_to_vsol || true

# Step 2: Apply the migration steps manually via SQL
echo "Step 2: Applying migration steps..."

# Connect to database and run migration in separate transactions
psql $DATABASE_URL <<'EOSQL'
-- Transaction 1: Add new enum value (must be in its own transaction)
BEGIN;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VSOL_HOLDER' AND enumtypid = 'UserTier'::regtype) THEN
        ALTER TYPE "UserTier" ADD VALUE 'VSOL_HOLDER';
    END IF;
END $$;
COMMIT;

-- Transaction 2: Rename columns
BEGIN;
ALTER TABLE "User" RENAME COLUMN "simTokenBalance" TO "vsolTokenBalance";
ALTER TABLE "User" RENAME COLUMN "simBalanceUpdated" TO "vsolBalanceUpdated";
ALTER TABLE "ConversionHistory" RENAME COLUMN "simTokensReceived" TO "vsolTokensReceived";
COMMIT;

-- Transaction 3: Update enum values
BEGIN;
UPDATE "User" SET "userTier" = 'VSOL_HOLDER' WHERE "userTier" = 'SIM_HOLDER';
COMMIT;

-- Transaction 4: Remove old enum value by recreating the enum
BEGIN;
CREATE TYPE "UserTier_new" AS ENUM ('EMAIL_USER', 'WALLET_USER', 'VSOL_HOLDER', 'ADMINISTRATOR');
ALTER TABLE "User" ALTER COLUMN "userTier" TYPE "UserTier_new" USING ("userTier"::text::"UserTier_new");
DROP TYPE "UserTier";
ALTER TYPE "UserTier_new" RENAME TO "UserTier";
COMMIT;
EOSQL

# Step 3: Mark migration as applied
echo "Step 3: Marking migration as applied..."
npx prisma migrate resolve --applied 20251015_rebrand_sim_to_vsol

echo "✅ Migration fixed successfully!"
