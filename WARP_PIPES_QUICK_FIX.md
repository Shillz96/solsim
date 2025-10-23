# 🔧 Warp Pipes - Why No Tokens Are Showing

## The Problem

Your Warp Pipes feed shows empty columns because **the Token Discovery Worker is not running**.

```
Your Current Setup:
✅ Frontend UI - Working
✅ API Endpoint - Working  
✅ Database Table - Exists
❌ Token Discovery Worker - NOT RUNNING ← This is the issue!
```

## What the Worker Does

The Token Discovery Worker:
1. Listens to PumpPortal WebSocket for new Pump.fun tokens
2. Listens to Raydium program logs for new AMM pools
3. Saves discovered tokens to the `TokenDiscovery` database table
4. Enriches tokens with health data (freeze/mint status, liquidity)
5. Manages state transitions (bonded → graduating → new)

**Without the worker running = No tokens in database = Empty feed**

## Quick Fix: Deploy to Railway

### 1. Create New Railway Service

In your Railway dashboard:
- Click **"+ New"** → **"Empty Service"**
- Name: `virtualsol-discovery-worker`

### 2. Configure Service

**Root Directory:** `backend`

**Build Command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
npm run railway:discovery
```

### 3. Copy Environment Variables

Copy ALL these variables from your main backend service:
- `DATABASE_URL`
- `REDIS_URL`
- `HELIUS_RPC_URL`
- `HELIUS_WS`
- `HELIUS_API`

### 4. Deploy

- Connect to GitHub
- Select `main` branch
- Deploy

### 5. Verify It's Working

Check logs for:
```
🎮 Token Discovery Worker is running!
[TokenDiscovery] New bonded token: $MARIO
```

Wait 5-10 minutes, then refresh your Warp Pipes page. Tokens should appear!

## Architecture

```
┌─────────────────────────────────────────────┐
│  PumpPortal WS → Discovery Worker → DB     │
│  Raydium Logs → Discovery Worker → DB      │
│                                             │
│  DB → API Endpoint → Frontend (You See!)   │
└─────────────────────────────────────────────┘
```

## Full Guide

See `WARP_PIPES_DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

## Test Locally (Optional)

```bash
cd backend
npm run dev:discovery
```

Watch console for incoming tokens.

