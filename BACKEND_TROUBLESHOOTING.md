# Backend Troubleshooting Guide

## 502 Error - Application Failed to Respond

If you're seeing a 502 error when accessing your backend URL, here are the steps to troubleshoot:

### 1. Check Railway Logs

Go to your Railway dashboard:
1. Click on the `solsim` backend service
2. Click on the "Deployments" tab
3. Click on the latest deployment
4. Check the logs for any error messages

Common issues to look for:
- Missing environment variables
- Port binding issues
- Database connection errors
- Redis connection errors

### 2. Verify Environment Variables

Make sure ALL these variables are set in Railway:

```
JWT_SECRET=en5RfVWTC8UD+KqnJd4oWF+p4KohGapIKkKDmXS8gsHuQynTGPct/vdvkrY8xvoH
NODE_ENV=production
PORT=4002
FRONTEND_ORIGIN=https://solsim.fun
DEV_AUTH_BYPASS=false
DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest
BIRDEYE_API_KEY=673c073ddd2d4da19ee1748e24796e20
COINGECKO_API_KEY=CG-9Y1EpBG7HSPUtR7tGPMyP7cq
HELIUS_API_KEY=8dc08491-9c29-440a-8616-bd3143a2af87
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=8dc08491-9c29-440a-8616-bd3143a2af87
```

### 3. Check Service Health

The backend service should automatically get:
- `DATABASE_URL` from the PostgreSQL service
- `REDIS_URL` from the Redis service

Verify these are connected properly in Railway.

### 4. Restart the Service

Sometimes a simple restart helps:
1. Go to your Railway dashboard
2. Click on the backend service
3. Click the three dots menu
4. Select "Restart"

### 5. Check Build Logs

If the build failed:
1. Check the build logs in Railway
2. Look for TypeScript compilation errors
3. Ensure all dependencies are installed

### 6. Manual Commands

If needed, you can run commands directly:

```bash
# Check the service status
railway logs

# Restart the service
railway restart

# Redeploy
railway up
```

### 7. Port Configuration

Ensure the app is listening on the correct port:
- Railway expects the app to listen on the PORT environment variable
- The app should bind to `0.0.0.0:${PORT}` not `localhost:${PORT}`

### 8. Health Check Endpoint

The health check endpoint should be accessible at:
```
https://solsim-production.up.railway.app/health
```

If this returns a 502, the app isn't running properly.

## Quick Fix Checklist

- [ ] All environment variables are set
- [ ] DATABASE_URL is available (from PostgreSQL service)
- [ ] REDIS_URL is available (from Redis service)
- [ ] Latest deployment shows as "Active" in Railway
- [ ] No TypeScript compilation errors in build logs
- [ ] App is binding to `0.0.0.0:${PORT}`

## Still Having Issues?

1. Check the Railway community forum
2. Review the deployment logs carefully
3. Ensure your GitHub repo is up to date
4. Try redeploying from scratch
