# WebSocket Connection Debugging Guide

## Current Configuration
- Frontend: `wss://solsim-production.up.railway.app/ws/prices`
- Backend: Listening on `/ws/prices` (via Fastify WebSocket plugin)
- Railway: Should support WebSocket upgrades automatically

## Debug Checklist

1. **Verify Backend is Running**
   - Test: `curl https://solsim-production.up.railway.app/api/health`
   - Expected: 200 OK response

2. **Test WebSocket Endpoint Directly**
   - Use a WebSocket client (e.g., wscat)
   - `wscat -c wss://solsim-production.up.railway.app/ws/prices`
   - Expected: "hello" message with connection confirmation

3. **Check Railway Logs**
   - Go to Railway dashboard
   - Check if WebSocket connections are being logged
   - Look for "Client connected to price WebSocket" messages

4. **Verify CORS and Headers**
   - Check browser Network tab
   - Look for 101 Switching Protocols response
   - If 403/426, check CORS allowedOrigins includes your Vercel domain

## Common Issues

### Issue: Immediate Connection Failure
**Symptom**: Connection closes in < 3 seconds
**Causes**:
- Railway not configured for WebSocket (needs custom start command)
- Backend not listening on correct port
- CORS blocking the upgrade request
- Backend crashed or not running

### Issue: Connection Hangs
**Symptom**: Connection stays in CONNECTING state
**Causes**:
- Firewall blocking WebSocket
- Railway proxy timeout (should be > 30s)
- Network issues

### Issue: 426 Upgrade Required
**Symptom**: HTTP 426 response instead of 101
**Causes**:
- WebSocket not properly registered in Fastify
- Upgrade headers not being sent

## Railway WebSocket Configuration

If WebSocket connections continue to fail, check Railway configuration:

1. **Verify Railway supports WebSocket**
   - Railway automatically supports WebSocket upgrades
   - No special configuration needed in `railway.json`

2. **Check Railway deployment logs**
   - Look for WebSocket server startup messages
   - Verify Fastify WebSocket plugin is registered

3. **Test with Railway CLI**
   ```bash
   railway connect
   # Then test WebSocket locally
   ```

## Frontend Debugging

1. **Check Browser Console**
   - Look for WebSocket connection logs
   - Verify the exact URL being used
   - Check for CORS or security errors

2. **Network Tab Analysis**
   - Look for WebSocket upgrade request
   - Check response status (should be 101)
   - Verify headers are correct

3. **Environment Variable Verification**
   - Confirm `NEXT_PUBLIC_WS_URL` is set correctly
   - Check if build includes the latest env values
   - Trigger fresh deployment if env vars were recently updated

## Backend Debugging

1. **Check WebSocket Registration**
   - Verify `app.register(wsPlugin)` is called
   - Confirm `/ws/prices` route is registered
   - Check Fastify WebSocket plugin is loaded

2. **Monitor Connection Logs**
   - Look for "Client connected to price WebSocket" messages
   - Check for connection errors or timeouts
   - Verify heartbeat/ping-pong is working

3. **Test Backend Health**
   - Verify all services are running (Redis, Database)
   - Check if price service is initialized
   - Confirm WebSocket server is listening

## Quick Fixes

### If WebSocket Still Fails After Implementation

1. **Force Fresh Deployment**
   ```bash
   # Trigger Railway redeploy
   git commit --allow-empty -m "Force Railway redeploy for WebSocket fix"
   git push origin main
   
   # Trigger Vercel redeploy
   # Go to Vercel dashboard > Deployments > Redeploy
   ```

2. **Check Railway WebSocket Support**
   - Railway should automatically handle WebSocket upgrades
   - If not working, may need to check Railway service configuration

3. **Verify CORS Configuration**
   - Ensure Vercel domain is in `allowedOrigins` array
   - Check if `credentials: true` is causing issues
   - Verify WebSocket headers are allowed

## Success Indicators

When WebSocket is working correctly, you should see:

1. **Frontend Console**
   ```
   🔗 Attempting WebSocket connection to: wss://solsim-production.up.railway.app/ws/prices
   🔌 Client connected to price WebSocket from [IP]
   💓 Heartbeat sent
   ```

2. **Backend Logs**
   ```
   🔌 Client connected to price WebSocket from [IP]
   📊 Broadcasted price update for [mint] to [count] clients
   ```

3. **Browser Network Tab**
   - WebSocket connection shows "101 Switching Protocols"
   - Connection stays open and shows data frames
   - No CORS or security errors

## Troubleshooting Commands

```bash
# Test backend health
curl https://solsim-production.up.railway.app/api/health

# Test WebSocket with wscat (install: npm install -g wscat)
wscat -c wss://solsim-production.up.railway.app/ws/prices

# Check Railway logs
railway logs

# Test CORS
curl -H "Origin: https://your-vercel-domain.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://solsim-production.up.railway.app/ws/prices
```

---

Last Updated: January 2025
