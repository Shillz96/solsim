# Database Migration: SIM to VSOL Rebranding

This migration updates all database schema and data from SIM token references to VSOL token.

## What This Migration Does

1. **Renames User table columns:**
   - `simTokenBalance` → `vsolTokenBalance`
   - `simBalanceUpdated` → `vsolBalanceUpdated`

2. **Renames ConversionHistory table column:**
   - `simTokensReceived` → `vsolTokensReceived`

3. **Updates UserTier enum:**
   - Changes enum value from `SIM_HOLDER` to `VSOL_HOLDER`
   - Updates all existing users with tier `SIM_HOLDER` to `VSOL_HOLDER`

## How to Run This Migration

### Option 1: Using Prisma Migrate (Recommended for Development)

```bash
cd backend

# Generate a new migration based on schema changes
npx prisma migrate dev --name rebrand_sim_to_vsol

# This will automatically apply the migration
```

### Option 2: Manual SQL Execution (Production)

If you have a production database, you may want to run the SQL manually to have more control:

```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration script
\i backend/prisma/migrations/rebrand_sim_to_vsol.sql

# Verify the changes
SELECT column_name FROM information_schema.columns
WHERE table_name = 'User'
AND column_name LIKE '%vsol%';

# Check updated user tiers
SELECT "userTier", COUNT(*) as count
FROM "User"
GROUP BY "userTier";
```

### Option 3: Using Prisma Migrate Deploy (Production)

```bash
cd backend

# Apply all pending migrations
npx prisma migrate deploy
```

## Pre-Migration Checklist

- [ ] **Backup your database** before running this migration
- [ ] Verify you have the latest schema changes pulled from git
- [ ] Update environment variables: `SIM_TOKEN_MINT` → `VSOL_TOKEN_MINT`
- [ ] Stop your application servers to prevent concurrent access during migration
- [ ] Test the migration on a staging database first

## Post-Migration Checklist

- [ ] Verify all columns were renamed successfully
- [ ] Confirm UserTier enum only contains: EMAIL_USER, WALLET_USER, VSOL_HOLDER, ADMINISTRATOR
- [ ] Check that all users with VSOL tokens have the correct tier
- [ ] Regenerate Prisma client: `npx prisma generate`
- [ ] Restart your application servers
- [ ] Test user tier functionality
- [ ] Test conversion history display

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Rollback: Rename columns back to SIM
ALTER TABLE "User" RENAME COLUMN "vsolTokenBalance" TO "simTokenBalance";
ALTER TABLE "User" RENAME COLUMN "vsolBalanceUpdated" TO "simBalanceUpdated";
ALTER TABLE "ConversionHistory" RENAME COLUMN "vsolTokensReceived" TO "simTokensReceived";

-- Rollback: Recreate enum with SIM_HOLDER
CREATE TYPE "UserTier_rollback" AS ENUM ('EMAIL_USER', 'WALLET_USER', 'SIM_HOLDER', 'ADMINISTRATOR');
ALTER TABLE "User" ALTER COLUMN "userTier" TYPE "UserTier_rollback" USING ("userTier"::text::"UserTier_rollback");
UPDATE "User" SET "userTier" = 'SIM_HOLDER' WHERE "userTier" = 'VSOL_HOLDER';
DROP TYPE "UserTier";
ALTER TYPE "UserTier_rollback" RENAME TO "UserTier";
```

## Testing

After migration, test these scenarios:

1. **User Tier Display**: Check that VSOL holders see correct tier badge
2. **Token Balance**: Verify `vsolTokenBalance` displays correctly
3. **Conversion History**: Ensure historical conversions show `vsolTokensReceived`
4. **New Conversions**: Test creating a new conversion record
5. **Tier Upgrades**: Test the VSOL holder tier upgrade functionality

## Impact Assessment

- **Downtime Required**: ~30 seconds for small databases, ~5 minutes for large databases
- **Affected Tables**: User, ConversionHistory
- **Affected Records**: All users with SIM_HOLDER tier
- **Breaking Changes**: Code must be updated to use new field/enum names (already done in codebase)

## Support

If you encounter issues during migration:
1. Check PostgreSQL logs for detailed error messages
2. Ensure no active connections are using the old enum values
3. Verify your PostgreSQL version supports enum operations (9.1+)
4. Contact the development team with error details
