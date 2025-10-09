# Railway Deployment Guide for Solsim

This guide will help you deploy the Solsim backend to Railway with all required services.

## 🚂 Services Required

You need to create **4 services** on Railway:

1. ✅ **PostgreSQL Database** - Main data storage
2. ✅ **Redis Cache** - Real-time caching and pub/sub
3. ✅ **Backend API** - Fastify server (this repository)
4. ⚙️ **Worker Service** (Optional) - Reward snapshots cron job

---

## 📋 Step-by-Step Setup

### Step 1: Create PostgreSQL Database

1. In Railway dashboard, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will automatically create the database
3. The `DATABASE_URL` environment variable will be auto-generated
4. ✅ **No configuration needed** - Railway handles it

### Step 2: Create Redis Cache

1. Click **"New"** → **"Database"** → **"Add Redis"**
2. Railway will automatically create Redis instance
3. The `REDIS_URL` environment variable will be auto-generated
4. ✅ **No configuration needed** - Railway handles it

### Step 3: Create Backend API Service

1. Click **"New"** → **"GitHub Repo"**
2. Select your **Solsim repository**
3. Railway will detect the `railway.toml` configuration automatically
4. Configure the service:

#### Build Settings (Auto-detected from railway.toml)
```toml
Build Command: cd backend && npm install && npm run build
Start Command: cd backend && npm run start:prod
```

#### Environment Variables to Add

Click **"Variables"** tab and add these:

```bash
# External API Keys (REQUIRED)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
HELIUS_RPC_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
HELIUS_API_KEY=YOUR_HELIUS_KEY
DEXSCREENER_BASE=https://api.dexscreener.com
JUPITER_BASE=https://quote-api.jup.ag

# Authentication (REQUIRED - Generate a random secret)
JWT_SECRET=generate-a-long-random-secret-here-min-32-chars

# Frontend URL (REQUIRED)
FRONTEND_URL=https://your-vercel-app-url.vercel.app

# Rewards System (Optional - can add later)
SIM_TOKEN_MINT=YourSimTokenMintAddress
REWARDS_WALLET_SECRET=base58-encoded-secret-key

# Environment
NODE_ENV=production

# Port (Railway auto-assigns)
PORT=${{PORT}}
```

#### Link Database Services

1. In the Backend API service, click **"Settings"**
2. Scroll to **"Service Variables"**
3. Click **"+ New Variable"** → **"Add Reference"**
4. Select **PostgreSQL** → `DATABASE_URL`
5. Select **Redis** → `REDIS_URL`

✅ Railway will automatically inject these connection strings

### Step 4: Run Database Migrations

After the first deployment completes:

1. Go to Backend API service → **"Settings"** → **"Deploy"**
2. Add a **one-time deployment command**:
   ```bash
   cd backend && npx prisma migrate deploy
   ```
3. Or use Railway CLI locally:
   ```bash
   railway link
   railway run --service=backend npx prisma migrate deploy
   ```

This creates all database tables from the schema.

### Step 5: (Optional) Create Worker Service

For weekly reward snapshots:

1. Click **"New"** → **"GitHub Repo"** (same repo)
2. Name it **"Solsim Worker"**
3. Configure:
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && node dist/worker/snapshotWorker.js`
4. Add **same environment variables** as Backend API
5. Link **same PostgreSQL and Redis** services
6. Set up **Railway Cron** (weekly schedule in dashboard)

---

## 🔧 Railway Configuration Files

The repository includes `railway.toml` with these settings:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "cd backend && npm install && npm run build"

[deploy]
startCommand = "cd backend && npm run start:prod"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[deploy.healthcheck]]
path = "/health"
port = 4002
```

✅ Railway will use this automatically when you connect the repo.

---

## 🔐 Required API Keys

### 1. Helius API (Solana RPC)

Get a free key at: https://helius.dev

```bash
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_RPC_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_API_KEY=YOUR_KEY
```

### 2. JWT Secret

Generate a secure random string (32+ characters):

```bash
# Linux/Mac
openssl rand -base64 32

# Or use any password generator
```

### 3. DexScreener & Jupiter

These are public APIs (no key needed):
```bash
DEXSCREENER_BASE=https://api.dexscreener.com
JUPITER_BASE=https://quote-api.jup.ag
```

---

## ✅ Verify Deployment

After deployment completes:

### 1. Check Health Endpoint
```bash
curl https://your-railway-app.up.railway.app/health
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Check Logs
In Railway dashboard:
- Go to Backend API service
- Click **"Deployments"** → Latest deployment
- Check logs for:
  ```
  ✅ Connected to Helius WebSocket
  🚀 API running on :XXXX
  📡 Subscribed to DEX programs
  ```

### 3. Test Database Connection
```bash
curl https://your-railway-app.up.railway.app/api/leaderboard
```

Should return leaderboard data (empty array if no users yet).

---

## 🐛 Troubleshooting

### Build Fails: "Prisma schema mismatch"

**Solution**: Push the latest schema changes
```bash
git add backend/prisma/schema.prisma
git commit -m "Update Prisma schema"
git push origin main
```

Railway will automatically redeploy on push.

### Database Connection Error

**Check**:
1. `DATABASE_URL` is properly linked in Railway
2. PostgreSQL service is running (green status)
3. Migration was run: `npx prisma migrate deploy`

### WebSocket Connection Issues

**Check**:
1. `HELIUS_RPC_URL` uses `wss://` not `https://`
2. Helius API key is valid
3. Firewall allows WebSocket connections

### Redis Connection Error

**Check**:
1. `REDIS_URL` is properly linked in Railway
2. Redis service is running (green status)
3. Format: `redis://default:password@host:port`

---

## 🔄 Continuous Deployment

Railway automatically deploys when you push to `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

**Watch deployment**: Railway dashboard → Backend API → "Deployments" tab

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────┐
│           Railway Project               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐      ┌──────────────┐ │
│  │ PostgreSQL  │◄─────┤ Backend API  │ │
│  │  Database   │      │   (Fastify)  │ │
│  │ (Managed)   │      │   Port: AUTO │ │
│  └─────────────┘      └──────────────┘ │
│         ▲                     ▲         │
│         │              ┌──────┴──────┐  │
│         │              │             │  │
│  ┌─────────────┐       │      ┌──────────┐
│  │    Redis    │◄──────┘      │  Worker  │
│  │    Cache    │              │  (Cron)  │
│  │  (Managed)  │              └──────────┘
│  └─────────────┘                         │
│                                         │
│  External APIs:                         │
│  • Helius (Solana RPC + WebSocket)     │
│  • DexScreener (Token Data)            │
│  • Jupiter (Price Quotes)              │
└─────────────────────────────────────────┘
```

---

## 💰 Cost Estimate

Railway Free Tier includes:
- $5 credit per month
- Enough for development/testing

Production (Estimated):
- PostgreSQL: ~$5/month
- Redis: ~$5/month
- Backend API: ~$5-10/month (depends on traffic)
- **Total**: ~$15-20/month

**Pro Tip**: Start with free tier, scale as needed.

---

## 📝 Next Steps After Deployment

1. ✅ Set `FRONTEND_URL` to your Vercel deployment URL
2. ✅ Update frontend `.env.local` with Railway API URL:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-railway-app.up.railway.app
   ```
3. ✅ Test full integration (frontend ↔ backend)
4. ✅ Set up custom domain (optional)
5. ✅ Configure monitoring/alerts in Railway

---

## 🆘 Support

- **Railway Docs**: https://docs.railway.app
- **Prisma Migrations**: https://www.prisma.io/docs/guides/migrate
- **Helius API**: https://docs.helius.dev

**Need help?** Check Railway logs first - they're very detailed!

