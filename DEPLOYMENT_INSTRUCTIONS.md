# Warp Pipes Deployment Instructions

## Quick Deployment Guide

### Prerequisites
- PostgreSQL database access
- Backend and frontend environments configured
- Node.js and npm installed

### Step 1: Apply Database Migration

```bash
cd backend

# Apply the migration
npx prisma migrate deploy

# Generate updated Prisma client
npx prisma generate

# Build backend
npm run build
```

**Expected Output:**
```
Applying migration `20250123_add_holder_creator_fields`
✔ Migration applied successfully
```

### Step 2: Restart Backend Services

#### Option A: Using PM2
```bash
pm2 restart tokenDiscoveryWorker
pm2 restart backend
pm2 logs tokenDiscoveryWorker --lines 50
```

#### Option B: Using Docker
```bash
docker-compose restart backend
docker-compose restart worker
docker-compose logs -f worker
```

#### Option C: Using Railway/Heroku
Push to your deployment branch:
```bash
git add .
git commit -m "feat: Add Warp Pipes improvements - 12h filter, holder count, tx count, social links"
git push origin main
```

Railway will auto-deploy. Monitor logs in Railway dashboard.

### Step 3: Deploy Frontend

#### Option A: Vercel (Recommended)
```bash
cd frontend

# Build locally to test
npm run build

# Deploy (Vercel will auto-deploy from git)
git push origin main
```

#### Option B: Manual Build
```bash
cd frontend
npm run build
npm start
```

### Step 4: Verify Deployment

#### Check Backend Health
```bash
# Check if worker is processing events
curl http://your-backend-url/api/health

# Check Warp Pipes feed (should include new fields)
curl http://your-backend-url/api/warp-pipes/feed | jq '.bonded[0]'
```

**Look for these fields in response:**
- `holderCount`
- `creatorWallet`
- `txCount24h`
- `description`
- `twitter`, `telegram`, `website`

#### Check Frontend
1. Navigate to `https://your-app-url/warp-pipes`
2. Open browser DevTools (F12)
3. Check Network tab for `/api/warp-pipes/feed` request
4. Verify response includes new fields
5. Verify UI displays:
   - Holder count (👥)
   - Transaction count (📝)
   - Social links (𝕏, ✈️, 🌐)
   - Creator wallet (👨‍💻)
   - Token description

#### Check Worker Logs
Look for these log messages:
```
✅ PumpPortal stream service started
✅ Event handlers registered
🔌 Registering event handlers...
[PumpPortal] New token: SYMBOL
[TokenDiscovery] New bonded token: SYMBOL
```

### Step 5: Monitor for Issues

#### Check Database
```sql
-- Verify new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'TokenDiscovery' 
  AND column_name IN ('holderCount', 'creatorWallet');

-- Check recent bonded tokens (should be < 12 hours old)
SELECT symbol, name, "holderCount", "creatorWallet", "txCount24h", "stateChangedAt"
FROM "TokenDiscovery"
WHERE state = 'bonded'
ORDER BY "stateChangedAt" DESC
LIMIT 10;

-- Verify cleanup is working (no bonded tokens > 12 hours)
SELECT COUNT(*) as old_bonded_count
FROM "TokenDiscovery"
WHERE state = 'bonded'
  AND "stateChangedAt" < NOW() - INTERVAL '12 hours';
-- Should return 0
```

#### Monitor Logs
```bash
# Backend logs
tail -f backend/logs/app.log

# Worker logs
tail -f backend/logs/worker.log

# Or with PM2
pm2 logs tokenDiscoveryWorker --lines 100
```

Look for:
- PumpPortal connection success
- New token events
- Swap events
- Metadata fetching
- Cleanup operations

### Troubleshooting

#### Issue: Migration Fails
```bash
# Check migration status
npx prisma migrate status

# If migration is marked as failed, reset and reapply
npx prisma migrate resolve --rolled-back 20250123_add_holder_creator_fields
npx prisma migrate deploy
```

#### Issue: Worker Not Receiving Events
1. Check PumpPortal WebSocket connection in logs
2. Verify environment variable: `PUMPPORTAL_API_KEY`
3. Check network connectivity to `wss://pumpportal.fun/api/data`
4. Restart worker: `pm2 restart tokenDiscoveryWorker`

#### Issue: No Holder Count or Transaction Count
- These fields come from PumpPortal events
- May take time to populate for new tokens
- Check if swap events are being received: `grep "swap" worker.log`

#### Issue: Social Links Not Showing
- Social links come from IPFS metadata
- Check if metadata fetching is working: `grep "metadata" worker.log`
- Some tokens may not have social links in metadata

#### Issue: Bonded Column Empty
- Bonded tokens only show if < 12 hours old
- Check if any tokens have reached 100% bonding progress recently
- Query database: `SELECT * FROM "TokenDiscovery" WHERE state = 'bonded' LIMIT 10;`

### Rollback Procedure

If issues occur, rollback:

```bash
cd backend

# Rollback migration
cat > rollback.sql << EOF
DROP INDEX IF EXISTS "token_discovery_holder_count";
ALTER TABLE "TokenDiscovery" DROP COLUMN IF EXISTS "holderCount";
ALTER TABLE "TokenDiscovery" DROP COLUMN IF EXISTS "creatorWallet";
EOF

# Apply rollback
psql $DATABASE_URL < rollback.sql

# Regenerate Prisma client
npx prisma generate
```

Then revert code changes:
```bash
git revert HEAD
git push origin main
```

### Success Indicators

✅ Migration applied without errors  
✅ Worker logs show PumpPortal connection  
✅ New tokens have holderCount and creatorWallet  
✅ Bonded tokens filtered to < 12 hours  
✅ UI displays all new metadata fields  
✅ Social links clickable and working  
✅ No old bonded tokens in database (> 12h)  

### Post-Deployment Checklist

- [ ] Database migration successful
- [ ] Worker restarted and connected
- [ ] Backend API returns new fields
- [ ] Frontend displays holder count
- [ ] Frontend displays transaction count
- [ ] Frontend shows social links
- [ ] Frontend shows creator wallet
- [ ] Bonded column shows only fresh tokens (< 12h)
- [ ] No errors in worker logs
- [ ] No errors in backend logs
- [ ] No errors in browser console

---

**Estimated Deployment Time**: 10-15 minutes  
**Risk Level**: Low (non-breaking changes, new fields are nullable)  
**Rollback Time**: 5 minutes  

