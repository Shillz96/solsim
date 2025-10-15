-- Migration: Rebrand SIM to VSOL
-- This migration updates all database references from SIM token to VSOL token
-- Created: 2025-01-14

-- Step 1: Rename columns in User table
ALTER TABLE "User"
  RENAME COLUMN "simTokenBalance" TO "vsolTokenBalance";

ALTER TABLE "User"
  RENAME COLUMN "simBalanceUpdated" TO "vsolBalanceUpdated";

-- Step 2: Rename column in ConversionHistory table
ALTER TABLE "ConversionHistory"
  RENAME COLUMN "simTokensReceived" TO "vsolTokensReceived";

-- Step 3: Update UserTier enum
-- First, add the new VSOL_HOLDER value
ALTER TYPE "UserTier" ADD VALUE 'VSOL_HOLDER';

-- Step 4: Update all existing SIM_HOLDER users to VSOL_HOLDER
UPDATE "User"
SET "userTier" = 'VSOL_HOLDER'
WHERE "userTier" = 'SIM_HOLDER';

-- Step 5: Remove the old SIM_HOLDER value from enum
-- Note: PostgreSQL doesn't support dropping enum values directly
-- We need to recreate the enum without SIM_HOLDER
-- This is a two-step process:

-- Create a new enum without SIM_HOLDER
CREATE TYPE "UserTier_new" AS ENUM ('EMAIL_USER', 'WALLET_USER', 'VSOL_HOLDER', 'ADMINISTRATOR');

-- Update the User table to use the new enum
ALTER TABLE "User"
  ALTER COLUMN "userTier" TYPE "UserTier_new"
  USING ("userTier"::text::"UserTier_new");

-- Drop the old enum
DROP TYPE "UserTier";

-- Rename the new enum to the original name
ALTER TYPE "UserTier_new" RENAME TO "UserTier";

-- Verify the migration (optional - can be commented out in production)
-- SELECT COUNT(*) as vsol_holders FROM "User" WHERE "userTier" = 'VSOL_HOLDER';
