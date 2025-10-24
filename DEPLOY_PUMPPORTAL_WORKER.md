# Deploy PumpPortal Worker to Railway

This guide explains how to deploy the Token Discovery Worker to Railway as a separate service. This worker populates live trade data from PumpPortal into Redis, which powers the market data panels on /room pages.

## What This Worker Does

The Token Discovery Worker:
- ✅ Connects to PumpPortal WebSocket for **live trades from ALL platforms**
- ✅ Subscribes to top 200 active tokens automatically
- ✅ Stores real-time trades in Redis (`market:trades:*`)
- ✅ Calculates trader P&L stats in Redis (`market:traders:*`)
- ✅ Enriches token data with health metrics
- ✅ Manages token state transitions (bonded → graduating → new)

## Prerequisites

- Railway account with backend service already deployed
- Backend database and Redis URLs

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Log in to Railway** at https://railway.app

2. **Go to your project** (1UP SOL / VirtualSol)

3. **Click "New Service"** → **"Empty Service"**

4. **Configure the service**:
   - **Service Name**: `virtualsol-discovery-worker`
   - **Root Directory**: `backend`
   - **Start Command**: `npm run railway:discovery`

5. **Add Environment Variables** (copy from main backend service):
   ```
   DATABASE_URL=<same as backend>
   REDIS_URL=<same as backend>
   HELIUS_RPC_URL=<same as backend>
   HELIUS_WS=<same as backend>
   HELIUS_API=<same as backend>
   SOLANA_RPC_URL=<same as backend>
   NODE_ENV=production
   ```

   Optional (for enhanced PumpPortal features):
   ```
   PUMPPORTAL_API_KEY=<your key if you have one>
   ```

6. **Connect to GitHub**:
   - Link the same repository as your backend
   - Branch: `main` (or your production branch)
   - Railway will auto-deploy on push

7. **Deploy**:
   - Click "Deploy"
   - Worker will build and start automatically

### Option 2: Deploy via Railway CLI

```bash
cd backend

# Login to Railway
railway login

# Link to your existing project
railway link

# Create new service
railway service create virtualsol-discovery-worker

# Set environment variables (copy from main backend)
railway variables set DATABASE_URL="<value>"
railway variables set REDIS_URL="<value>"
railway variables set HELIUS_RPC_URL="<value>"
railway variables set HELIUS_WS="<value>"
# ... add all other variables

# Deploy
railway up
```

## Verify Deployment

### 1. Check Logs

```bash
railway logs -s virtualsol-discovery-worker
```

You should see:
```
🚀 Token Discovery Worker Starting...
✅ Database connected
✅ Redis connected
✅ Price service client started
📡 Starting streaming services...
✅ PumpPortal stream service started
✅ Raydium stream service started
🔌 Registering event handlers...
✅ Event handlers registered

🎮 Token Discovery Worker is running!
   - Listening to PumpPortal (bonded, migration)
   - Listening to Raydium (new pools)
   - Market data updates: every 30 seconds
   - Token trade subscriptions: every 5 minutes
```

### 2. Verify Redis Data

Connect to Redis and check for trade data:

```bash
# Check for trade keys (should have data within 5 minutes)
redis-cli KEYS "market:trades:*"

# Check trader stats keys
redis-cli KEYS "market:traders:*"

# View trades for a specific token
redis-cli ZREVRANGE "market:trades:<TOKEN_MINT>" 0 10 WITHSCORES
```

### 3. Test Frontend

Visit any `/room/[token]` page on https://oneupsol.fun

You should now see:
- ✅ **Recent Trades** panel populated with live PumpPortal trades
- ✅ **Top Traders** panel showing 24h trader P&L
- ✅ Real market activity from ALL platforms (not just your site)

## Worker Configuration

The worker automatically:
- Subscribes to top 200 most active tokens (by volume/market cap)
- Re-evaluates subscriptions every 5 minutes
- Stores last 50 trades per token in Redis
- Caches trader stats for 24 hours

You can monitor subscription count in logs:
```
[TokenDiscovery] Subscribing to trades for 156 active tokens
[TokenDiscovery] Total subscribed tokens: 156
```

## Troubleshooting

### Worker Not Starting

**Check logs for errors**:
```bash
railway logs -s virtualsol-discovery-worker
```

**Common issues**:
- Missing environment variables → Add all required vars
- Database connection failed → Verify `DATABASE_URL`
- Redis connection failed → Verify `REDIS_URL`
- Helius endpoints not configured → Add `HELIUS_RPC_URL` and `HELIUS_WS`

### No Trades Appearing

**Verify PumpPortal connection in logs**:
```
[PumpPortal] WebSocket connected successfully
[PumpPortal] Subscribing to events...
```

**Check if tokens are being subscribed**:
```
[TokenDiscovery] Subscribing to trades for X active tokens
```

**Verify Redis has data**:
```bash
redis-cli KEYS "market:trades:*" | wc -l
# Should return > 0 after 5-10 minutes
```

### Holder Data Not Showing

Holders panel currently shows "coming soon" - requires additional implementation:
- Use Helius `getTokenAccounts` API
- Calculate holder distribution
- Cache results in Redis

This is optional and can be implemented later.

## Cost Considerations

**Railway Pricing**:
- Worker uses ~200-500 MB RAM
- Minimal CPU usage (mostly idle, event-driven)
- Estimated cost: ~$2-5/month on Hobby plan
- Can run on same plan as backend (shared resources)

**API Rate Limits**:
- PumpPortal WebSocket: Free tier available
- Helius RPC: Depends on your plan
- DexScreener API: Free tier sufficient
- Jupiter API: Free

## Monitoring

### Health Checks

1. **Worker Uptime**: Check Railway dashboard
2. **Redis Keys**: Should grow to 100+ tokens within 1 hour
3. **Trade Volume**: Monitor log frequency of swap events
4. **Frontend**: Market data panels should populate

### Performance Metrics

Expected within 30 minutes of deployment:
- 50-200 tokens subscribed
- 500+ trades cached in Redis
- 100+ traders in stats cache
- Market data panels fully functional

## Next Steps

After deploying the worker:

1. ✅ **Test /room pages** - Verify market data panels work
2. ✅ **Monitor logs** - Check for errors or issues
3. ✅ **Scale if needed** - Increase subscriptions or resources
4. 🔄 **Optional**: Implement holder distribution feature
5. 🔄 **Optional**: Add more DEX integrations (Orca, Meteora, etc.)

## Related Documentation

- Worker Architecture: `backend/src/workers/README.md`
- PumpPortal Service: `backend/src/services/pumpPortalStreamService.ts`
- Market Routes: `backend/src/routes/market.ts`
- Frontend Market Panels: `frontend/components/trading/market-data-panels.tsx`

## Support

If you encounter issues:
1. Check Railway logs first
2. Verify environment variables match backend
3. Test Redis connection manually
4. Review worker README in `backend/src/workers/README.md`
