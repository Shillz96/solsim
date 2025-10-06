# 🚀 COPY & PASTE READY - Production Deployment

## ✅ Your JWT Secret Generated
```
en5RfVWTC8UD+KqnJd4oWF+p4KohGapIKkKDmXS8gsHuQynTGPct/vdvkrY8xvoH
```

## 🔧 Railway Backend Variables (Copy All)

Go to Railway Dashboard → Your Project → Backend Service → Variables → Add Variable

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
HELIUS_BASE_URL=https://mainnet.helius-rpc.com
```

## 🎨 Vercel Frontend Variables (Copy All)

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

```
NEXT_PUBLIC_API_URL=https://solsim-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://solsim.fun
NEXT_PUBLIC_ENV=production
```

**Note**: Replace `your-railway-backend-url` with your actual Railway URL after backend deploys.

## 📋 Quick Deployment Steps

### 1. Railway Backend (5 min)
1. Go to https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `Shillz96/solsim`
4. Set **Root Directory** to: `backend`
5. Add **PostgreSQL** service
6. Add **Redis** service
7. Copy all Railway variables above
8. Deploy!

### 2. Vercel Frontend (3 min)
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import `Shillz96/solsim` from GitHub
4. Set **Root Directory** to: `frontend`
5. Copy all Vercel variables above
6. Deploy!

### 3. Connect Frontend & Backend (1 min)
1. Get your Vercel URL from deployment
2. Go back to Railway → Backend → Variables
3. Update `FRONTEND_ORIGIN` with your actual Vercel URL
4. Redeploy backend

### 4. Initialize Database (1 min)
```bash
cd backend
railway run npm run db:migrate:prod
```

## 🎯 Test Your Deployment

### Backend Health Check
```bash
curl https://your-backend.up.railway.app/health
```
Should return: `{"status":"healthy",...}`

### Frontend
Open your Vercel URL in browser and test:
- Register a new account
- Search for a token
- Execute a test trade

## 🔗 Your API Keys Summary

- ✅ **BIRDEYE_API_KEY**: `673c073ddd2d4da19ee1748e24796e20`
- ✅ **COINGECKO_API_KEY**: `CG-9Y1EpBG7HSPUtR7tGPMyP7cq`
- ✅ **HELIUS_API_KEY**: `8dc08491-9c29-440a-8616-bd3143a2af87`
- ✅ **JWT_SECRET**: `en5RfVWTC8UD+KqnJd4oWF+p4KohGapIKkKDmXS8gsHuQynTGPct/vdvkrY8xvoH`

## 🚀 Ready to Deploy!

Everything is configured and ready. Just copy the variables above into the respective dashboards and deploy!

**Total time: ~10 minutes**
