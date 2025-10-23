# Migration Resolution Guide

## Problem
The migration `20251023000000_add_real_trading_support` failed during its first attempt and Prisma has marked it as failed. Prisma won't apply any new migrations until this is resolved.

## Error Message
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251023000000_add_real_trading_support` migration started at 2025-10-23 15:02:31.847977 UTC failed
```

## Solution Options

### Option 1: Using Railway Dashboard (Easiest)

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project → PostgreSQL database
3. Click the **"Query"** tab
4. Run this SQL:
   ```sql
   DELETE FROM "_prisma_migrations"
   WHERE migration_name = '20251023000000_add_real_trading_support'
   AND finished_at IS NULL;
   ```
5. Click **"Run Query"**
6. Go back to your backend service and click **"Deploy"** → **"Redeploy"**

### Option 2: Using Railway CLI + Prisma (Recommended)

From your backend directory, run:

```bash
cd backend
railway run npx prisma migrate resolve --applied 20251023000000_add_real_trading_support
```

If you get a connection error, it means you need to run this from within Railway's environment. Try:

```bash
# Navigate to backend directory
cd backend

# Connect to Railway shell and resolve migration
railway shell

# Once inside Railway shell, run:
npx prisma migrate resolve --applied 20251023000000_add_real_trading_support
exit
```

### Option 3: Using the Provided Script

We've created scripts to automate this. From your backend directory:

**On Windows:**
```bash
cd backend
railway run cmd /c scripts\resolve-failed-migration.bat
```

**On Linux/Mac:**
```bash
cd backend
railway run bash scripts/resolve-failed-migration.sh
```

### Option 4: Manual SQL Approach

If you have direct database access:

```sql
-- Check the current migration status
SELECT * FROM "_prisma_migrations"
WHERE migration_name = '20251023000000_add_real_trading_support';

-- Delete the failed migration record
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20251023000000_add_real_trading_support'
AND finished_at IS NULL;

-- Or mark it as successfully applied with current timestamp
UPDATE "_prisma_migrations"
SET finished_at = NOW(),
    logs = 'Manually resolved - migration was idempotent'
WHERE migration_name = '20251023000000_add_real_trading_support'
AND finished_at IS NULL;
```

## After Resolution

Once the failed migration is resolved, Railway will automatically redeploy. The migration will now succeed because we've updated it to be idempotent (safe to re-run).

## Verification

After the migration succeeds, you can verify it worked:

1. Check Railway deployment logs - should see "10 migrations found in prisma/migrations" with no errors
2. Verify in database that the new columns exist:
   ```sql
   -- Check User table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'User'
   AND column_name IN ('realSolBalance', 'tradingMode', 'realSolDepositAddress');

   -- Check Trade table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'Trade'
   AND column_name IN ('tradeMode', 'realTxSignature', 'realTxStatus', 'fundingSource', 'pumpPortalFee');

   -- Check Position table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'Position'
   AND column_name = 'tradeMode';
   ```

3. Check that the new enum types exist:
   ```sql
   SELECT typname FROM pg_type WHERE typname IN ('TradeMode', 'FundingSource', 'TransactionStatus');
   ```

## Why This Happened

The original migration tried to drop a constraint `Position_userId_mint_key` that didn't exist in your production database. This caused the migration to fail partway through.

We've since updated the migration to be **idempotent** - it checks if things exist before trying to modify them, making it safe to re-run multiple times.

## Need Help?

If you're still stuck:
1. Check Railway logs for specific error messages
2. Verify your DATABASE_URL is correctly set
3. Make sure you're in the correct Railway project/environment
4. Try the Railway Dashboard SQL approach - it's the most reliable

---

**Last Updated:** 2025-10-23
