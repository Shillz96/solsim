# Database Cleanup Migration Guide

## ⚠️ CRITICAL: Backup Database First!

```bash
# PostgreSQL backup
pg_dump -h [host] -U [user] -d [database] > backup_before_cleanup_$(date +%Y%m%d).sql
```

---

## Phase 1: Safe Cleanup (No Code Changes) ✅ READY TO RUN

These changes are **safe to run immediately** - no code depends on them:

```sql
-- Step 1: Verify Holding table is unused
SELECT COUNT(*) as holding_count FROM "Holding";
-- If count = 0, proceed to drop it

-- Step 2: Drop deprecated Holding table (ONLY if count = 0)
DROP TABLE IF EXISTS "Holding" CASCADE;

-- Step 3: Remove redundant indexes
-- These are duplicates of unique constraint indexes
DROP INDEX IF EXISTS "Position_userId_mint_idx";
DROP INDEX IF EXISTS "RewardClaim_userId_epoch_idx";
```

**Estimated savings:** ~50MB (depending on data volume), improved write performance

---

## Phase 2: User Table Cleanup ⚠️ CODE CHANGES COMPLETED

### Code Changes Summary (COMPLETED):
- ✅ Updated `backend/src/routes/auth.ts` to use `handle` instead of `username`
- ✅ Updated `backend/src/routes/auth.ts` to use `avatarUrl` only (removed `avatar`, `profileImage` syncing)
- ✅ Updated `backend/src/services/leaderboardService.ts` to remove redundant fields
- ✅ Updated `frontend/lib/types/backend.ts` User interface
- ✅ Updated `frontend/lib/types/backend.ts` LeaderboardEntry interface
- ✅ Updated `frontend/lib/types/backend.ts` Trade interface
- ✅ Updated `frontend/lib/types/backend.ts` ProfileUpdateRequest interface
- ✅ Updated `frontend/lib/types/backend.ts` AuthSignupRequest interface

### Database Migration SQL:

```sql
-- ========================================
-- PHASE 2A: Consolidate Username Fields
-- ========================================

-- STEP 1: Check current data state
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN handle IS NULL OR handle = '' THEN 1 END) as users_without_handle,
  COUNT(CASE WHEN username IS NULL OR username = '' THEN 1 END) as users_without_username
FROM "User";

-- STEP 2: Migrate username to handle for users missing handle
UPDATE "User"
SET handle = username
WHERE handle IS NULL OR handle = '';

-- STEP 3: Verify migration worked (should equal total_users)
SELECT COUNT(*) as users_with_handle
FROM "User"
WHERE handle IS NOT NULL AND handle != '';

-- STEP 4: Make handle NOT NULL (since it's now the primary username field)
ALTER TABLE "User" ALTER COLUMN handle SET NOT NULL;

-- STEP 5: Drop the redundant username column
ALTER TABLE "User" DROP COLUMN username;

-- ========================================
-- PHASE 2B: Consolidate Avatar Fields
-- ========================================

-- STEP 1: Check current data state
SELECT
  COUNT(*) as total_users,
  COUNT("avatarUrl") as has_avatarUrl,
  COUNT(avatar) as has_avatar,
  COUNT("profileImage") as has_profileImage
FROM "User";

-- STEP 2: Consolidate to avatarUrl (pick first non-null value)
UPDATE "User"
SET "avatarUrl" = COALESCE("avatarUrl", avatar, "profileImage")
WHERE "avatarUrl" IS NULL;

-- STEP 3: Verify all avatar data is now in avatarUrl
SELECT COUNT(*) as users_with_avatarUrl
FROM "User"
WHERE "avatarUrl" IS NOT NULL;

-- STEP 4: Drop redundant columns
ALTER TABLE "User" DROP COLUMN avatar;
ALTER TABLE "User" DROP COLUMN "profileImage";
```

**Estimated savings:** 2 columns × N users (significant storage reduction)

---

## Phase 3: Trade Table Cleanup (⚠️ FUTURE - Not Implemented Yet)

**STATUS:** Code changes NOT yet completed. Do NOT run these migrations.

This phase requires updating all Trade-related services to use `createdAt` instead of `timestamp` and `mint` instead of `tokenAddress`.

### Required Code Changes (TODO):
- [ ] Update `backend/src/services/tradeService.ts` to use `createdAt`
- [ ] Update all trade queries to reference `createdAt` instead of `timestamp`
- [ ] Update all trade queries to reference `mint` instead of `tokenAddress`
- [ ] Update frontend components displaying trade data

### Migration SQL (DO NOT RUN YET):

```sql
-- ========================================
-- PHASE 3A: Consolidate Trade Timestamps
-- ========================================

-- STEP 1: Check if timestamp and createdAt differ
SELECT
  COUNT(*) as total_trades,
  COUNT(CASE WHEN timestamp != "createdAt" THEN 1 END) as mismatched_timestamps
FROM "Trade";

-- If mismatched_timestamps > 0, investigate before proceeding!

-- STEP 2: Drop indexes using timestamp
DROP INDEX IF EXISTS "user_trades_recent";
DROP INDEX IF EXISTS "token_trades_recent";
DROP INDEX IF EXISTS "user_token_history";
DROP INDEX IF EXISTS "user_trade_type";
DROP INDEX IF EXISTS "trades_chronological";

-- STEP 3: Recreate indexes using createdAt
CREATE INDEX "user_trades_recent" ON "Trade"("userId", "createdAt" DESC);
CREATE INDEX "token_trades_recent" ON "Trade"(mint, "createdAt" DESC);
CREATE INDEX "user_token_history" ON "Trade"("userId", mint, "createdAt" DESC);
CREATE INDEX "user_trade_type" ON "Trade"("userId", "action", "createdAt" DESC);
CREATE INDEX "trades_chronological" ON "Trade"("createdAt" DESC);

-- STEP 4: Drop the timestamp column
ALTER TABLE "Trade" DROP COLUMN timestamp;

-- ========================================
-- PHASE 3B: Consolidate mint/tokenAddress
-- ========================================

-- STEP 1: Check if they're the same
SELECT
  COUNT(*) as total_trades,
  COUNT(CASE WHEN mint != "tokenAddress" THEN 1 END) as mismatched_addresses
FROM "Trade";

-- If mismatched_addresses > 0, investigate before proceeding!

-- STEP 2: Drop indexes using tokenAddress (if not already dropped above)
DROP INDEX IF EXISTS "token_trades_recent";
DROP INDEX IF EXISTS "user_token_history";

-- STEP 3: Recreate using mint (if not already created above)
CREATE INDEX "token_trades_recent" ON "Trade"(mint, "createdAt" DESC);
CREATE INDEX "user_token_history" ON "Trade"("userId", mint, "createdAt" DESC);

-- STEP 4: Drop the tokenAddress column
ALTER TABLE "Trade" DROP COLUMN "tokenAddress";
```

---

## Phase 4: Token Table Cleanup (⚠️ FUTURE - Not Implemented Yet)

**STATUS:** Code changes NOT yet completed. Do NOT run these migrations.

### Required Code Changes (TODO):
- [ ] Update token services to use only `logoURI` (not `imageUrl`)
- [ ] Update token services to use only `lastUpdatedAt` (not `lastUpdated`)
- [ ] Update token services to parse socials from JSON arrays instead of individual fields

### Migration SQL (DO NOT RUN YET):

```sql
-- ========================================
-- PHASE 4: Token Table Field Consolidation
-- ========================================

-- STEP 1: Consolidate image fields
UPDATE "Token"
SET "logoURI" = COALESCE("logoURI", "imageUrl")
WHERE "logoURI" IS NULL;

ALTER TABLE "Token" DROP COLUMN "imageUrl";

-- STEP 2: Consolidate timestamp fields
UPDATE "Token"
SET "lastUpdatedAt" = COALESCE("lastUpdatedAt", "lastUpdated")
WHERE "lastUpdatedAt" IS NULL;

ALTER TABLE "Token" DROP COLUMN "lastUpdated";

-- STEP 3: Remove individual social fields (keep JSON arrays)
ALTER TABLE "Token" DROP COLUMN website;
ALTER TABLE "Token" DROP COLUMN twitter;
ALTER TABLE "Token" DROP COLUMN telegram;
```

---

## Prisma Schema Updates

### Updated User Model (Phase 2):

```prisma
model User {
  id                      String                 @id @default(uuid())
  email                   String                 @unique
  handle                  String                 // Removed: username, changed from nullable to NOT NULL
  passwordHash            String
  displayName             String?
  bio                     String?
  avatarUrl               String?                // Removed: avatar, profileImage
  twitter                 String?
  discord                 String?
  telegram                String?
  website                 String?
  virtualSolBalance       Decimal                @default(100)
  isProfilePublic         Boolean                @default(true)
  solanaWallet            String?
  userTier                UserTier               @default(EMAIL_USER)
  walletAddress           String?                @unique
  walletNonce             String?
  walletVerified          Boolean                @default(false)
  vsolTokenBalance        Decimal?
  vsolBalanceUpdated      DateTime?
  monthlyConversions      Decimal                @default(0)
  conversionResetAt       DateTime?
  premiumFeatures         String?                @default("[]")
  rewardPoints            Decimal                @default(0)
  emailVerified           Boolean                @default(false)
  emailVerificationToken  String?                @unique
  emailVerificationExpiry DateTime?
  passwordResetToken      String?                @unique
  passwordResetExpiry     DateTime?
  createdAt               DateTime               @default(now())
  updatedAt               DateTime               @updatedAt

  // Relations
  conversions             ConversionHistory[]
  copyTrades              CopyTrade[]
  positions               Position[]
  realizedPnls            RealizedPnL[]
  rewardClaims            RewardClaim[]
  trades                  Trade[]
  transactions            TransactionHistory[]
  trackedWallets          WalletTrack[]
  walletTrackerSettings   WalletTrackerSettings?
  solPurchases            SolPurchase[]
  perpPositions           PerpPosition[]
  perpTrades              PerpTrade[]
  liquidations            Liquidation[]
}
```

---

## Testing Checklist

### After Phase 1:
- [ ] Verify Holding table no longer exists
- [ ] Verify redundant indexes are removed
- [ ] Check database size reduction

### After Phase 2:
- [ ] Test user signup (email and wallet)
- [ ] Test profile updates (handle, displayName, avatarUrl, bio)
- [ ] Test avatar upload/remove
- [ ] Test leaderboard display (should show handle, displayName, avatarUrl)
- [ ] Verify all users have non-null handle field
- [ ] Test password reset emails (should use handle in email)
- [ ] Test welcome emails (should use handle)

### After Phase 3 (when implemented):
- [ ] Test trade creation (buy/sell)
- [ ] Test trade history display
- [ ] Test trade queries and filtering
- [ ] Verify all trade data migrated correctly

### After Phase 4 (when implemented):
- [ ] Test token search
- [ ] Test token metadata display
- [ ] Test token social links
- [ ] Test token image display

---

## Rollback Plans

### Phase 1 Rollback:
```sql
-- Cannot rollback Holding table drop without data backup
-- Recreate redundant indexes if needed:
CREATE INDEX "Position_userId_mint_idx" ON "Position"("userId", mint);
CREATE INDEX "RewardClaim_userId_epoch_idx" ON "RewardClaim"("userId", epoch);
```

### Phase 2 Rollback:
```sql
-- Add columns back
ALTER TABLE "User" ADD COLUMN username TEXT;
ALTER TABLE "User" ADD COLUMN avatar TEXT;
ALTER TABLE "User" ADD COLUMN "profileImage" TEXT;

-- Restore data from handle/avatarUrl
UPDATE "User" SET username = handle;
UPDATE "User" SET avatar = "avatarUrl";
UPDATE "User" SET "profileImage" = "avatarUrl";

-- Make handle nullable again
ALTER TABLE "User" ALTER COLUMN handle DROP NOT NULL;
```

---

## Expected Benefits

### Storage Savings:
- **User table:** ~40% column reduction (5 → 3 identity/avatar fields)
- **Holding table:** 100% removal if unused
- **Indexes:** ~5-10 redundant indexes removed

### Performance Improvements:
- **Faster writes:** Fewer indexes to update on User modifications
- **Faster queries:** Simpler data model, less field selection overhead
- **Better cache efficiency:** Smaller row sizes = more rows in memory

### Code Quality:
- **Single source of truth:** One field per purpose
- **Clearer intent:** Field names match their usage
- **Less synchronization:** No more keeping 3 avatar fields in sync

---

## Execution Order

1. ✅ **Run Phase 1 immediately** (safe, no code changes needed)
2. ⏳ **Deploy Phase 2 code changes** to staging/production
3. ⏳ **Run Phase 2 migrations** after code deployment verified
4. ⏳ **Test thoroughly** before proceeding to Phase 3
5. ❌ **DO NOT run Phase 3/4** until code changes are implemented

---

## Questions or Issues?

If you encounter any issues during migration:
1. **Stop immediately** and rollback if possible
2. **Check the verification queries** to understand data state
3. **Review the code changes** to ensure they're deployed
4. **Test in a staging environment first** if possible

Generated: 2025-10-21
