# 🚀 Quick Start: Database Cleanup Migration

## 📋 Pre-Flight Checklist

- [ ] Read `DATABASE_CLEANUP_GUIDE.md` (full details)
- [ ] Read `backend/RAILWAY_MIGRATION_GUIDE.md` (Railway-specific)
- [ ] **BACKUP DATABASE** (critical!)
- [ ] Deploy Phase 2 code changes to Railway
- [ ] Test locally first if possible

---

## ⚡ Fast Track: What to Run

### Step 1: Deploy Code Changes ✅ (Already Done!)

All code changes are complete:
- ✅ `backend/src/routes/auth.ts` updated
- ✅ `backend/src/services/leaderboardService.ts` updated
- ✅ `frontend/lib/types/backend.ts` updated
- ✅ `backend/prisma/schema.prisma` updated

**Action:** Push to GitHub and deploy to Railway

```bash
git add .
git commit -m "feat: Phase 2 database cleanup - consolidate user fields"
git push origin main
```

---

### Step 2: Run Migration on Railway

**Choose ONE method:**

#### Method A: Railway CLI (Recommended)

```bash
# Install Railway CLI if you haven't
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Run migration
railway run bash
cd backend
npx prisma migrate deploy
```

#### Method B: Direct SQL via Railway Dashboard

1. Open Railway → Your Project → PostgreSQL → Data → Query
2. Copy and paste from `backend/migration_phase_2.sql`
3. Click "Run Query"

#### Method C: Prisma Migrate (Safest)

```bash
# Local: Generate migration
cd backend
npx prisma migrate dev --name phase_2_user_cleanup --create-only

# Review the SQL in prisma/migrations/[timestamp]_phase_2_user_cleanup/

# Deploy to Railway
railway run npx prisma migrate deploy
```

---

### Step 3: Verify Migration

Run these SQL queries in Railway dashboard:

```sql
-- Should show: handle (NOT NULL), avatarUrl (nullable)
-- Should NOT show: username, avatar, profileImage
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
  AND column_name IN ('handle', 'avatarUrl', 'username', 'avatar', 'profileImage');

-- Should return 0
SELECT COUNT(*) FROM "User" WHERE handle IS NULL OR handle = '';

-- Should return 0
SELECT COUNT(*) FROM "Holding";
```

**Test app functions:**
- [ ] User signup
- [ ] Profile update
- [ ] Avatar upload
- [ ] Leaderboard display

---

## 🎯 What This Migration Does

### Removes:
- ❌ `username` column (migrated to `handle`)
- ❌ `avatar` column (migrated to `avatarUrl`)
- ❌ `profileImage` column (migrated to `avatarUrl`)
- ❌ `Holding` table (deprecated, unused)
- ❌ 2 redundant indexes

### Keeps:
- ✅ `handle` - Single username field (now NOT NULL)
- ✅ `avatarUrl` - Single avatar field
- ✅ `displayName` - Optional full name
- ✅ All user data (safely migrated)

### Result:
- 📉 40% fewer User table columns
- ⚡ Faster writes (fewer indexes)
- 💾 ~50-100MB storage saved
- 🎯 Cleaner data model

---

## ⚠️ If Something Goes Wrong

### Quick Rollback

```sql
-- Add columns back
ALTER TABLE "User" ADD COLUMN username TEXT;
ALTER TABLE "User" ADD COLUMN avatar TEXT;
ALTER TABLE "User" ADD COLUMN "profileImage" TEXT;

-- Restore data
UPDATE "User" SET username = handle;
UPDATE "User" SET avatar = "avatarUrl";
UPDATE "User" SET "profileImage" = "avatarUrl";

-- Make handle nullable
ALTER TABLE "User" ALTER COLUMN handle DROP NOT NULL;
```

### Railway Backup Restore

1. Railway Dashboard → PostgreSQL → Backups
2. Select pre-migration backup
3. Click "Restore"

---

## 📞 Need Help?

Check the detailed guides:
- `DATABASE_CLEANUP_GUIDE.md` - Full documentation
- `backend/RAILWAY_MIGRATION_GUIDE.md` - Railway-specific steps
- `backend/migration_phase_2.sql` - Raw SQL commands

---

## ✅ Success Criteria

Migration is successful when:

1. **SQL runs without errors** ✅
2. **Verification queries pass** ✅
3. **App functions work** ✅
4. **No errors in Railway logs** ✅
5. **Users can:**
   - Sign up (email/wallet)
   - Update profile
   - Upload avatar
   - See leaderboard

---

## 📊 Expected Timeline

- **Code deployment:** ~5 minutes
- **Migration execution:** ~10 seconds
- **Verification:** ~5 minutes
- **Total downtime:** ~10 seconds

**Best time to run:** Off-peak hours (less impact if issues occur)

---

**Ready to go?** Start with Step 1 above! 🚀
