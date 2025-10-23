# Warp Pipes Token Discovery Worker Deployment Guide

## 🔍 Issue
The Warp Pipes feed shows **"No tokens in this column"** because the Token Discovery Worker is not running.

## 📊 Current Status
- ✅ API endpoint `/api/warp-pipes/feed` is deployed and working
- ✅ Database table `TokenDiscovery` exists with proper schema
- ✅ Frontend UI is complete and functional
- ❌ **Token Discovery Worker is NOT running** (this populates the tokens)

## 🎯 Solution: Deploy Token Discovery Worker to Railway

The Token Discovery Worker listens to PumpPortal and Raydium WebSocket streams to discover new tokens in real-time.

### Step 1: Create New Railway Service

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Empty Service"**
3. Name it: `virtualsol-discovery-worker`

### Step 2: Configure Service

**Root Directory:**
```
backend
```

**Build Command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
npm run railway:discovery
```

### Step 3: Environment Variables

Copy ALL environment variables from your main backend service to this new service:

**Required:**
- `DATABASE_URL` - PostgreSQL connection (same as main backend)
- `REDIS_URL` - Redis connection (same as main backend)
- `HELIUS_RPC_URL` - Helius RPC endpoint
- `HELIUS_WS` - Helius WebSocket endpoint
- `HELIUS_API` - Helius API key

**Optional:**
- `PUMPPORTAL_API_KEY` - For PumpSwap stream access (if you have it)

### Step 4: Deploy

1. Connect to your GitHub repository
2. Select the `main` branch
3. Railway will automatically build and deploy

### Step 5: Verify Deployment

**Check Logs:**
You should see output like:
```
🚀 Token Discovery Worker Starting...
✅ Database connected
✅ Redis connected
📡 Starting streaming services...
✅ PumpPortal stream service started
✅ Raydium stream service started
🔌 Registering event handlers...
✅ Event handlers registered
⏰ Scheduling background jobs...
✅ Background jobs scheduled

🎮 Token Discovery Worker is running!
   - Listening to PumpPortal (bonded, migration)
   - Listening to Raydium (new pools)
   - Hot score updates: every 5 minutes
   - Watcher sync: every 1 minute
   - Cleanup: every 1 hour
```

**Watch for New Tokens:**
```
[TokenDiscovery] New bonded token: $MARIO
[TokenDiscovery] Health data enriched for 7xKXt...
[TokenDiscovery] Migration event for 7xKXt...: completed
```

### Step 6: Verify Tokens Appear

1. Wait a few minutes for tokens to be discovered
2. Refresh your Warp Pipes feed page
3. Tokens should now appear in the Bonded/Graduating/New columns

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│         Railway Services                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────┐      ┌──────────────────┐   │
│  │  Main Backend    │      │  Discovery Worker│   │
│  │  (virtualsol-    │      │  (NEW SERVICE)   │   │
│  │   backend)       │      │                  │   │
│  │                  │      │  • PumpPortal WS │   │
│  │  • API Routes    │      │  • Raydium Stream│   │
│  │  • WebSocket     │◄─────┤  • Health Data   │   │
│  │  • Price Service │      │  • Token DB      │   │
│  └────────┬─────────┘      └────────┬─────────┘   │
│           │                         │             │
│           └──────────┬──────────────┘             │
│                      ▼                            │
│           ┌──────────────────────┐                │
│           │   PostgreSQL DB      │                │
│           │  • TokenDiscovery    │                │
│           │  • TokenWatch        │                │
│           └──────────────────────┘                │
│                      │                            │
│                      ▼                            │
│           ┌──────────────────────┐                │
│           │      Redis Cache     │                │
│           │  • token:*           │                │
│           │  • tokens:bonded     │                │
│           │  • tokens:graduating │                │
│           │  • tokens:new        │                │
│           └──────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

## 📝 Data Flow

### 1. New Pump.fun Token (Bonded State)
```
PumpPortal WS → handleNewToken() 
  → Create TokenDiscovery (state: 'bonded')
  → Cache in Redis
  → Async health enrichment
  → Frontend polls /api/warp-pipes/feed
  → Token appears in "Bonded" column
```

### 2. Token Migration (Bonded → Graduating → New)
```
PumpPortal migration event
  → handleMigration()
  → Update state: bonded → graduating
  → PumpPortal completion event
  → Update state: graduating → new
  → Notify watchers
  → Frontend shows in "New Pool" column
```

### 3. Direct Raydium Listing
```
Raydium newPool event
  → handleNewPool()
  → Create TokenDiscovery (state: 'new')
  → Cache in Redis
  → Frontend shows in "New Pool" column
```

## 🧪 Testing

### Local Testing
```bash
cd backend
npm run dev:discovery
```

Watch the console for incoming token events.

### Database Check
```sql
-- Check if tokens are being discovered
SELECT 
  state, 
  COUNT(*) as count,
  MAX("firstSeenAt") as latest
FROM "TokenDiscovery"
GROUP BY state;
```

### Redis Check
```bash
# Count cached tokens
redis-cli KEYS "token:*" | wc -l

# Check sorted sets
redis-cli ZCARD tokens:bonded
redis-cli ZCARD tokens:graduating
redis-cli ZCARD tokens:new
```

## 🚨 Troubleshooting

### No Tokens Appearing After 5 Minutes

**Check Worker Logs:**
1. Go to Railway dashboard
2. Click on `virtualsol-discovery-worker` service
3. Check "Deployments" → Latest deployment → "View Logs"

**Common Issues:**

1. **Database Connection Error**
   - Verify `DATABASE_URL` is correct
   - Check if database is accessible

2. **Redis Connection Error**
   - Verify `REDIS_URL` is correct
   - Check if Redis is running

3. **PumpPortal Connection Error**
   - Check Helius API key is valid
   - Verify `HELIUS_WS` endpoint is correct
   - Check Helius API rate limits

4. **Raydium Stream Error**
   - Verify `HELIUS_RPC_URL` is correct
   - Check Helius RPC rate limits

### Worker Keeps Restarting

Check logs for:
- Missing environment variables
- Invalid API keys
- Database connection issues
- Out of memory errors (increase memory limit)

## 📊 Monitoring

### Key Metrics to Watch

1. **Token Discovery Rate**
   - Should see ~10-50 new tokens per hour during active hours
   - Check logs for `[TokenDiscovery] New bonded token:` messages

2. **Health Enrichment**
   - Should see `[TokenDiscovery] Health data enriched` messages
   - Indicates freeze/mint/liquidity data is being fetched

3. **State Transitions**
   - Should see `[TokenDiscovery] Migration event` messages
   - Indicates tokens moving between states

4. **Memory Usage**
   - Worker should use ~200-500 MB
   - If higher, check for memory leaks

## ✅ Success Criteria

After deployment, you should see:
1. ✅ Worker logs showing successful startup
2. ✅ New tokens appearing in worker logs every few minutes
3. ✅ Tokens appearing in `/api/warp-pipes/feed` API response
4. ✅ Tokens visible in frontend Warp Pipes columns
5. ✅ Health data enrichment happening
6. ✅ State transitions working (bonded → graduating → new)

## 🔄 Next Steps After Deployment

1. Monitor logs for first hour
2. Verify tokens are appearing in all three columns
3. Test watch functionality (add/remove watches)
4. Test notification system (if implemented)
5. Monitor health data accuracy
6. Check hot score calculations

## 📚 Related Files

- Worker implementation: `backend/src/workers/tokenDiscoveryWorker.ts`
- Worker README: `backend/src/workers/README.md`
- API routes: `backend/src/routes/warpPipes.ts`
- Database schema: `backend/prisma/schema.prisma`
- Frontend types: `frontend/lib/types/warp-pipes.ts`
- Frontend hooks: `frontend/hooks/use-warp-pipes.ts`

## 🆘 Need Help?

If tokens still don't appear after following this guide:
1. Check Railway logs for specific errors
2. Verify all environment variables are set correctly
3. Test database connection manually
4. Check Helius API rate limits and quotas
5. Verify PumpPortal and Raydium streams are active

