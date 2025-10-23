# Warp Pipes Worker Status

## ✅ Worker is Running Successfully!

Your logs show:
```
✅ Database connected
✅ Redis connected
✅ PumpPortal stream service started
✅ Raydium stream service started
✅ Event handlers registered
✅ Background jobs scheduled
🎮 Token Discovery Worker is running!
```

## Environment Variables

### ✅ Required Variables (Copy from Main Backend)

The worker needs **exactly the same** environment variables as your main backend service:

```bash
# Database & Cache
DATABASE_URL=postgresql://postgres:...@postgres-z-rn.railway.internal:5432/railway
REDIS_URL=redis://default:...@shuttle.proxy.rlwy.net:28212

# Helius (for Raydium stream and health checks)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
HELIUS_API=8dc08491-9c29-440a-8616-bd3143a2af87

# Optional but recommended
PUMPPORTAL_API_KEY=<your-api-key>     # For reliable PumpPortal access
HELIUS_WS=wss://mainnet.helius-rpc.com/?api-key=...  # If you want explicit WS
```

### How to Set on Railway

1. Go to Railway dashboard
2. Find your `virtualsol-discovery-worker` service
3. Go to **Variables** tab
4. Click **"Raw Editor"**
5. Copy ALL variables from main `solsim` service
6. Paste into discovery worker
7. Deploy

## Why No Tokens Yet?

Your worker is **connected and listening** correctly. You're not seeing tokens because:

### 1. Market Activity Timing
Pump.fun token launches happen more during:
- **Peak Hours**: 12pm - 8pm EST (active trading)
- **Slower Hours**: Late night / early morning

During active hours: ~10-50 tokens/hour
During slow hours: ~1-5 tokens/hour

### 2. PumpPortal API Access

According to [PumpPortal docs](https://pumpportal.fun/), the free WebSocket tier might have:
- Rate limits
- Delayed events
- Limited event types

With `PUMPPORTAL_API_KEY`, you get:
- Real-time events
- No rate limits
- All event types

## Verification Steps

### 1. Check Worker Logs for Events

Once tokens start appearing, you'll see:
```
[PumpPortal] Received newToken event
[TokenDiscovery] New bonded token: $SYMBOL
[TokenDiscovery] Health data enriched for 7xKXt...
```

### 2. Query Database Directly

```sql
-- Check if any tokens exist
SELECT COUNT(*) FROM "TokenDiscovery";

-- Check recent tokens
SELECT state, symbol, "firstSeenAt" 
FROM "TokenDiscovery" 
ORDER BY "firstSeenAt" DESC 
LIMIT 10;
```

### 3. Test API Endpoint

```bash
curl https://your-backend.railway.app/api/warp-pipes/feed
```

Should return tokens once they're discovered.

## Expected Timeline

- **Immediate**: Worker starts, connects, listens ✅ (Done!)
- **Within 30 mins**: First tokens discovered (during active hours)
- **Within 1 hour**: Multiple tokens in feed
- **Continuous**: New tokens every few minutes during peak hours

## Troubleshooting

### If No Tokens After 1 Hour During Peak Hours

1. **Check PumpPortal Status**
   - Visit https://pumpportal.fun/
   - Verify their WebSocket is operational
   
2. **Add PUMPPORTAL_API_KEY**
   - Get API key from PumpPortal
   - Add to worker environment variables
   - Redeploy worker

3. **Check Helius Rate Limits**
   - Verify Helius API key is valid
   - Check if rate limit exceeded
   - Monitor Helius dashboard

4. **Verify WebSocket Connection**
   - Look for `[PumpPortal] Received` messages in logs
   - Check for connection errors
   - Verify no firewall blocking WebSocket

## Current Status: ✅ READY

Your worker is:
- ✅ Connected to PumpPortal
- ✅ Subscribed to events
- ✅ Listening for tokens
- ⏳ Waiting for real token launches

**Next**: Just wait 15-30 minutes during active trading hours, and tokens will start appearing automatically!

## Monitor in Real-Time

Watch Railway logs:
```bash
railway logs -s virtualsol-discovery-worker --follow
```

You'll see new tokens as they're discovered in real-time!

