# Market Lighthouse - Quick Setup Guide

## 🚀 Get It Running in 5 Minutes

### Prerequisites
- ✅ Redis running on localhost:6379
- ✅ CoinMarketCap API key
- ✅ Node.js installed

### Step 1: Configure Backend (2 min)

1. **Add CMC API Key to backend `.env`:**
```bash
cd backend
```

Create/edit `.env` file:
```env
# Required
CMC_API_KEY=your_coinmarketcap_api_key_here
REDIS_URL=redis://localhost:6379

# Optional (for better rate limits)
PUMPPORTAL_API_KEY=your_pumpportal_key_here
```

2. **Get a FREE CMC API Key:**
   - Go to https://coinmarketcap.com/api/
   - Click "Get Your Free API Key Now"
   - Sign up (takes 30 seconds)
   - Copy your API key

### Step 2: Start Redis (30 seconds)

**Option A - Local Redis:**
```bash
redis-server
```

**Option B - Docker Redis:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Verify it's running:**
```bash
redis-cli ping
# Should return: PONG
```

### Step 3: Start Backend (1 min)

```bash
cd backend
npm install  # if first time
npm run dev
```

**Look for these logs:**
```
📊 CoinMarketCap service started
[CMC] Starting auto-refresh (60s interval)
[CMC] Warming up cache...
✅ [CMC] Cache warmed
[CMC] Altcoin Season: 68/100 (68/100 coins beat BTC)
✅ [MarketLighthouse] Worker started
🚀 Server listening on http://localhost:4000
```

### Step 4: Test Backend API (30 seconds)

```bash
# Test the endpoint
curl http://localhost:4000/api/market/lighthouse
```

**Expected response:**
```json
{
  "pumpVolume24h": 123456.78,
  "totalMarketCapUsd": 2500000000000,
  "fearGreedIndex": 65,
  "fearGreedLabel": "Greed",
  "altcoinSeasonIndex": 82,
  "ts": 1729785600000
}
```

### Step 5: Start Frontend (1 min)

```bash
cd frontend
npm install  # if first time
npm run dev
```

**Configure frontend `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Step 6: Test UI (30 seconds)

1. Open http://localhost:3000
2. Find the Market Lighthouse trigger (wherever MarketHover is used)
3. Hover over it
4. You should see a popover with 4 metrics, color-coded!

---

## ✅ Verify Everything Works

### Check 1: Redis Has Data
```bash
redis-cli

# Check each key
GET market:cmc:global
GET market:cmc:fear-greed
GET market:cmc:altcoin-season
GET market:lighthouse:pump

# All should return JSON data
```

### Check 2: Backend Logs Are Clean
Look for:
- ✅ No error messages
- ✅ `[CMC] Altcoin Season: X/100` every 60 seconds
- ✅ `[PumpPortal] WebSocket connected successfully`
- ✅ `[MarketLighthouse] Worker started`

### Check 3: Frontend Displays Data
Hover over Market Lighthouse trigger:
- ✅ All 4 metrics show numbers (not "—")
- ✅ Fear & Greed has color (red/orange/yellow/lime/green)
- ✅ Altcoin Season has color (blue/yellow/green)
- ✅ "Updated X ago" shows recent time
- ✅ Emojis display: 🔥💰😱🪙

---

## 🐛 Troubleshooting

### Problem: "All metrics show —"

**Solution:**
```bash
# Check Redis connection
redis-cli ping

# Check backend logs for errors
# Look for: "[CMC] Error fetching..."

# Verify CMC API key is set
echo $CMC_API_KEY  # or check .env file
```

### Problem: "429 Too Many Requests"

**Solution:**
You're hitting CMC rate limits. Increase cache time:

Edit `backend/src/services/cmcService.ts`:
```typescript
const CACHE_TTL = 300; // Change from 60 to 300 (5 minutes)
```

### Problem: "No Pump.fun volume"

**Solution:**
```bash
# Check PumpPortal WebSocket logs
# Look for: "[PumpPortal] WebSocket connected successfully"

# If disconnected, check internet connection
# Try adding PUMPPORTAL_API_KEY to .env
```

### Problem: "Frontend shows old data"

**Solution:**
```bash
# Frontend caches for 15 seconds
# Wait 15 seconds and hover again

# Or clear browser cache:
# Chrome: Ctrl+Shift+R (hard refresh)
```

---

## 🎯 Quick Tests

### Test 1: Color Changes (1 min)
```bash
# Manually set Fear & Greed to different values
redis-cli

SET market:cmc:fear-greed '{"value":15,"classification":"Extreme Fear","timestamp":"2024-01-01"}'
# Wait 15s, hover → Should be RED

SET market:cmc:fear-greed '{"value":85,"classification":"Extreme Greed","timestamp":"2024-01-01"}'
# Wait 15s, hover → Should be GREEN
```

### Test 2: Altcoin Season Colors (1 min)
```bash
redis-cli

SET market:cmc:altcoin-season '{"value":30,"timestamp":"2024-01-01"}'
# Wait 15s, hover → Should be BLUE (Bitcoin Season)

SET market:cmc:altcoin-season '{"value":80,"timestamp":"2024-01-01"}'
# Wait 15s, hover → Should be GREEN (Altseason)
```

### Test 3: Update Frequency (1 min)
```bash
# Watch backend logs
# Look for CMC logs every 60 seconds:
# [CMC] Altcoin Season: 68/100 (68/100 coins beat BTC)

# Frontend updates every 15 seconds
# Hover and watch "Updated X ago" countdown
```

---

## 📊 Expected Values

### Typical Ranges:
- **Pump Volume**: 50K - 500K SOL/day
- **Market Cap**: $2T - $3T
- **Fear & Greed**: 20 (bear) to 80 (bull)
- **Altcoin Season**: 30 (BTC dominance) to 70 (mixed)

### Extreme Values:
- **Fear & Greed**: <15 = Extreme Fear, >85 = Extreme Greed
- **Altcoin Season**: >75 = True Altseason (rare!)

---

## 🎉 Success Checklist

- ✅ Backend starts without errors
- ✅ Redis has 4 keys populated
- ✅ API returns valid JSON
- ✅ Frontend popover displays on hover
- ✅ All 4 metrics show data (not "—")
- ✅ Colors change based on values
- ✅ Emojis display correctly
- ✅ "Updated X ago" changes over time
- ✅ No console errors in browser

**If all checked, you're done! 🎊**

---

## 🚀 Production Deployment

### Environment Variables for Production:
```env
# Backend
CMC_API_KEY=your_production_cmc_key
REDIS_URL=redis://your-redis-host:6379
PUMPPORTAL_API_KEY=your_pumpportal_key

# Frontend
NEXT_PUBLIC_API_URL=https://your-backend.com
```

### Rate Limit Recommendations:

**CMC Free Tier (333 calls/day):**
```typescript
const CACHE_TTL = 300; // 5 min = 288 calls/day ✅
```

**CMC Basic Plan ($29/mo, 10K calls/day):**
```typescript
const CACHE_TTL = 60; // 1 min = 1,440 calls/day ✅
```

**CMC Startup Plan ($79/mo, 100K calls/day):**
```typescript
const CACHE_TTL = 30; // 30 sec = 2,880 calls/day ✅
```

---

## 📞 Need Help?

Check these files:
- `docs/features/MARKET_LIGHTHOUSE.md` - Full documentation
- `docs/features/MARKET_LIGHTHOUSE_IMPLEMENTATION.md` - Implementation details
- `docs/features/MARKET_LIGHTHOUSE_COMPARISON.md` - Before/after comparison

**Still stuck?** Check backend logs for specific error messages and consult the troubleshooting section above.
