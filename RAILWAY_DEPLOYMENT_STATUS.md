# Railway Deployment Status & Testing Guide

## 🚀 Current Deployment
- **Backend URL**: `https://lovely-nature-production.up.railway.app`
- **Frontend URL**: `https://solsim.vercel.app` (or your Vercel domain)
- **Latest Commit**: `2017974` - Add Prisma migration to Railway build process

## 📊 Check Deployment Status

### Option 1: Railway Dashboard
1. Go to https://railway.app
2. Login and select your project
3. Check the "Deployments" tab to see build progress
4. Look for "Building" → "Deploying" → "Active" status

### Option 2: Check Health Endpoint
```bash
curl https://lovely-nature-production.up.railway.app/health
```

Look for:
- `"status": "healthy"` (should change from "degraded")
- Database connection pool status
- Uptime

## 🧪 Test Token Search in Production

### Test 1: Search by Address (Auto-Fetch)
```bash
curl "https://lovely-nature-production.up.railway.app/api/v1/market/search?q=DMsQLYy313XXQhZSwtigKVWoUbEWqfsANTpXD5WBbonk"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [{
      "address": "DMsQLYy313XXQhZSwtigKVWoUbEWqfsANTpXD5WBbonk",
      "symbol": "$250",
      "name": "$250",
      "imageUrl": "https://pbs.twimg.com/media/G2xGz-XW0AAKOsL.jpg",
      "price": "0.0000943",
      "priceChange24h": 0,
      "marketCap": 94306,
      "trending": false
    }]
  },
  "meta": {
    "count": 1,
    "query": "DMsQLYy313XXQhZSwtigKVWoUbEWqfsANTpXD5WBbonk",
    "limit": 10
  }
}
```

### Test 2: Search by Symbol
```bash
curl "https://lovely-nature-production.up.railway.app/api/v1/market/search?q=250"
```

Should return the $250 token if it's been saved.

### Test 3: Get Token Details Directly
```bash
curl "https://lovely-nature-production.up.railway.app/api/v1/market/token/DMsQLYy313XXQhZSwtigKVWoUbEWqfsANTpXD5WBbonk"
```

## 📝 Deployment Timeline

### Initial Push (Commit: 289ea8d)
- ✅ Fixed metadata service (5 API sources)
- ✅ Added auto-fetch and save to search endpoint
- ✅ Fixed field mapping issues
- ✅ Added decimals field to Token model
- ❌ Migration not applied (nixpacks didn't run it)

### Migration Fix (Commit: 2017974)
- ✅ Updated nixpacks.toml to run `prisma migrate deploy`
- ⏳ Railway is rebuilding now (wait 3-5 minutes)
- ⏳ Migration will be applied automatically during build

## 🔍 Troubleshooting

### If Search Still Returns Empty After Deploy:
1. **Check Railway Logs**: Look for migration errors
2. **Verify Migration Applied**: Check database schema has `decimals` field
3. **Test Metadata Service**: Check logs for "[MetadataService] ✅ Success from Helius"
4. **Check Error Logs**: Look for "[Search] Failed to fetch/save token"

### Manual Migration (If Needed):
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Run migration manually
railway run npx prisma migrate deploy
```

## 🎯 What Changed

### Files Modified:
1. **backend/src/services/metadataService.ts** (172 lines)
   - Added 5 API sources with priority: Helius → Jupiter → DexScreener → Birdeye → CoinGecko
   - Fixed Jupiter URL and validation logic

2. **backend/src/routes/v1/market.ts**
   - Added auto-fetch logic for unknown token addresses
   - Added response transformation (database fields → frontend fields)
   - Fixed field names: `lastPrice` → `price`, `marketCapUsd` → `marketCap`

3. **backend/prisma/schema.prisma**
   - Added `decimals Int? @default(9)` to Token model

4. **backend/nixpacks.toml**
   - Added `npx prisma migrate deploy` to build phase

5. **backend/prisma/migrations/20251008235123_add_decimals_to_token/**
   - Migration SQL to add decimals column

## ✅ Success Indicators

Once deployed successfully, you should see:
- ✅ Token search returns results with transformed field names
- ✅ Auto-fetch works for new token addresses
- ✅ Metadata fetched from Helius API
- ✅ Token saved to Railway PostgreSQL database
- ✅ All API responses match frontend TypeScript types

## 🚦 Next Steps After Deployment

1. **Wait 3-5 minutes** for Railway to rebuild
2. **Test production endpoint** with curl commands above
3. **Check Railway logs** for migration success message
4. **Test frontend** at your Vercel URL
5. **Search for token** in production UI
6. **Verify navigation** to trade page works

## 📞 Support Commands

```bash
# Check Railway deployment status
railway status

# View Railway logs in real-time
railway logs

# Connect to Railway database
railway connect postgres

# List all migrations
railway run npx prisma migrate status
```
