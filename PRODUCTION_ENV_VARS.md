# 🔐 Production Environment Variables - Ready to Copy

## Railway Backend Variables

Copy and paste these into your Railway dashboard (Project → Backend Service → Variables):

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

## Vercel Frontend Variables

Copy and paste these into your Vercel dashboard (Project → Settings → Environment Variables):

```
NEXT_PUBLIC_API_URL=https://solsim-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://solsim.fun
NEXT_PUBLIC_ENV=production
```

## 🔑 Your Generated JWT Secret

**IMPORTANT**: Replace `YOUR_GENERATED_SECRET_WILL_APPEAR_BELOW` in the Railway variables above with this generated secret:

```
en5RfVWTC8UD+KqnJd4oWF+p4KohGapIKkKDmXS8gsHuQynTGPct/vdvkrY8xvoH
```

## 📋 Quick Setup Checklist

### Railway Backend Setup
1. ✅ Go to https://railway.app/dashboard
2. ✅ Create new project from GitHub: `Shillz96/solsim`
3. ✅ Set Root Directory to: `backend`
4. ✅ Add PostgreSQL service
5. ✅ Add Redis service
6. ✅ Copy variables above (with generated JWT secret)
7. ✅ Deploy

### Vercel Frontend Setup
1. ✅ Go to https://vercel.com/dashboard
2. ✅ Import project from GitHub: `Shillz96/solsim`
3. ✅ Set Root Directory to: `frontend`
4. ✅ Copy frontend variables above
5. ✅ Deploy

### After Both Deploy
1. ✅ Update `FRONTEND_ORIGIN` in Railway with your actual Vercel URL
2. ✅ Run database migrations: `railway run npm run db:migrate:prod`
3. ✅ Test: `curl https://your-backend.up.railway.app/health`

## 🚀 Ready to Deploy!

All your API keys are configured and ready. Just copy the variables above into the respective dashboards and deploy!

**Estimated deployment time: 10 minutes**
