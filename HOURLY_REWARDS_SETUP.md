# Hourly Rewards System - Production Setup Guide

This guide will help you launch the production-ready hourly SOL rewards system.

## 🎯 Overview

The hourly rewards system distributes native SOL to the top 10 traders every hour based on profit percentage.

**Key Features:**
- ✅ Fully automated distributions at :00 every hour
- ✅ Real database integration (no mock data)
- ✅ Native SOL rewards sent directly to user wallets
- ✅ Transaction signatures recorded on Solana blockchain
- ✅ Automatic fee collection from pump.fun creator rewards

## 📋 Prerequisites

Before launching, ensure you have:

1. **Railway Account** (or your deployment platform)
2. **Solana Wallet** with SOL for rewards
3. **Pump.fun Creator Wallet** (if collecting fees)
4. **Database** (PostgreSQL via Railway)

## 🚀 Quick Start (3 Steps)

### Step 1: Generate Reward Wallet

```bash
cd backend
node scripts/generateRewardWallet.js
```

This will output:
- Your reward wallet public address
- Secret key JSON array for .env
- Solscan link to view the wallet

**Save both the public address and secret key!**

### Step 2: Configure Environment Variables

Add these to your Railway environment variables (or `.env` for local):

```bash
# ============================================================
# HOURLY REWARDS SYSTEM
# ============================================================

# Enable hourly rewards
HOURLY_REWARDS_ENABLED=true

# Minimum trades required to qualify for rewards (1 = very inclusive)
MIN_TRADES_FOR_REWARD=1

# Reward distribution wallet (from generateRewardWallet.js)
HOURLY_REWARD_WALLET_SECRET=[1,2,3,...,64]  # JSON array from script

# ============================================================
# PUMP.FUN FEE COLLECTION (Optional)
# ============================================================

# Your pump.fun creator wallet address (receives creator fees)
PUMPFUN_CREATOR_WALLET=YourCreatorWalletAddressHere

# Platform owner wallet (receives 90% of creator fees)
PLATFORM_OWNER_WALLET=YourPlatformWalletAddressHere

# ============================================================
# SOLANA RPC (Required)
# ============================================================

# Helius RPC endpoint (recommended for reliability)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Fallback RPC
SOLANA_RPC=https://api.mainnet-beta.solana.com
```

### Step 3: Fund the Reward Wallet & Deploy

1. **Fund the wallet:**
   ```bash
   # Send SOL to your reward wallet address
   # Recommended: 5-10 SOL for ~100-200 hours of rewards
   ```

2. **Run database migration:**
   ```bash
   cd backend
   npm run db:migrate
   ```

3. **Deploy to Railway:**
   ```bash
   git add .
   git commit -m "Production-ready hourly rewards system"
   git push
   ```

   Railway will automatically deploy and start the worker!

## 📊 How It Works

### Reward Distribution Schedule

**Every hour at :00 (e.g., 1:00, 2:00, 3:00):**

1. Worker calculates profit % for all traders in the past hour
2. Selects top 10 traders by profit percentage
3. Distributes SOL from the hourly pool:
   - 🥇 Rank 1: 35% of pool
   - 🥈 Rank 2: 20% of pool
   - 🥉 Rank 3: 10% of pool
   - 📍 Ranks 4-10: 5% each

4. Records transactions on Solana blockchain
5. Updates database with payout records

### Fee Collection (Auto-Pilot)

When `PUMPFUN_CREATOR_WALLET` is configured:

- Creator fees from your pump.fun tokens are automatically tracked
- 10% goes to hourly reward pool
- 90% goes to platform wallet
- Pool accumulates throughout the hour
- Distributed at :00 to top traders

### User Eligibility

To receive hourly rewards, users must:
- ✅ Have a connected Solana wallet
- ✅ Complete at least 1 trade in the past hour (configurable via `MIN_TRADES_FOR_REWARD`)
- ✅ Rank in top 10 by profit percentage

## 🔧 Configuration Options

### Adjust Minimum Trade Requirement

```bash
# Allow anyone with 1 trade to qualify (very inclusive)
MIN_TRADES_FOR_REWARD=1

# Require 5 trades to qualify (more competitive)
MIN_TRADES_FOR_REWARD=5

# Require 10 trades (high activity)
MIN_TRADES_FOR_REWARD=10
```

### Adjust Reward Distribution Splits

Edit `backend/src/workers/hourlyRewardWorker.ts`:

```typescript
const REWARD_SPLITS = [
  0.35, // Rank 1: 35%
  0.20, // Rank 2: 20%
  0.10, // Rank 3: 10%
  0.05, // Rank 4-10: 5% each
  // ...
];
```

**Note:** Must sum to 1.00 (100%)

### Disable Hourly Rewards

```bash
HOURLY_REWARDS_ENABLED=false
```

## 📈 Monitoring & Maintenance

### Check Reward Wallet Balance

```bash
# View on Solscan
https://solscan.io/account/YOUR_REWARD_WALLET_ADDRESS

# Or via Railway CLI
railway run node -e "
const {Connection,PublicKey,LAMPORTS_PER_SOL}=require('@solana/web3.js');
const c=new Connection('YOUR_RPC_URL');
c.getBalance(new PublicKey('YOUR_WALLET')).then(b=>console.log(b/LAMPORTS_PER_SOL,'SOL'));
"
```

### View Recent Distributions

**API Endpoint:**
```bash
curl https://your-api.railway.app/api/rewards/hourly/last-distribution
```

**Database Query (Railway CLI):**
```sql
-- View last 10 distributions
SELECT
  "hourStart",
  "poolAmount",
  "distributed",
  "distributedAt"
FROM "HourlyRewardPool"
WHERE "distributed" = true
ORDER BY "distributedAt" DESC
LIMIT 10;

-- View recent payouts
SELECT
  u.handle,
  p.rank,
  p."profitPercentage",
  p."rewardAmount",
  p.status,
  p."txSignature"
FROM "HourlyRewardPayout" p
JOIN "User" u ON p."userId" = u.id
ORDER BY p."createdAt" DESC
LIMIT 20;
```

### Monitor Worker Logs

```bash
railway logs --service backend | grep "HOURLY REWARDS"
```

Look for:
- `🎰 HOURLY REWARDS DISTRIBUTION STARTED`
- `💰 Distributing X SOL to Y winners`
- `✅ Hourly distribution completed successfully!`

### Refund Wallet

When balance drops below desired threshold:

1. Send more SOL to the reward wallet address
2. No restart needed - worker will automatically use new balance
3. Recommended: Keep at least 1-2 SOL for 20-40 hours of distributions

## 🧪 Testing Before Launch

### Test Manual Distribution (Development)

```bash
# In backend directory
npm run dev

# In another terminal
curl -X POST http://localhost:8000/api/rewards/admin/test-distribution \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-admin-key"}'
```

### Test Fee Recording (Development)

```bash
curl -X POST http://localhost:8000/api/rewards/admin/record-fees \
  -H "Content-Type: application/json" \
  -d '{"amountSOL": 0.1, "adminKey": "your-admin-key"}'
```

### Verify Database Migration

```bash
cd backend
npm run db:studio

# Check that these tables exist:
# - HourlyRewardPool
# - HourlyRewardPayout
```

## ⚠️ Troubleshooting

### "Worker not enabled"

**Cause:** `HOURLY_REWARDS_ENABLED` not set to `true`

**Fix:**
```bash
railway variables set HOURLY_REWARDS_ENABLED=true
```

### "Insufficient balance in reward wallet"

**Cause:** Reward wallet ran out of SOL

**Fix:**
1. Check balance on Solscan
2. Send more SOL to the wallet address
3. Next hourly distribution will work automatically

### "No wallet connected" for users

**Cause:** User hasn't connected a Solana wallet

**Fix:**
- Users must connect wallet in app settings
- Only users with connected wallets can receive rewards
- This is by design for security (rewards go to user-controlled wallets)

### Migration fails

**Cause:** Legacy reward tables conflict

**Fix:**
```bash
# Drop old tables manually if needed
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"RewardClaim\" CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"RewardSnapshot\" CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"SolReward\" CASCADE;"

# Then run migration
npm run db:migrate
```

## 🔐 Security Best Practices

1. **Never commit secrets to git**
   - Reward wallet secret key
   - Admin keys
   - RPC URLs with API keys

2. **Use Railway secrets for production**
   ```bash
   railway variables set HOURLY_REWARD_WALLET_SECRET='[...]'
   ```

3. **Limit reward wallet funds**
   - Only keep enough SOL for short-term distributions
   - Refill regularly instead of storing large amounts
   - Recommended: 5-10 SOL at a time

4. **Monitor transactions**
   - Check Solscan regularly for unexpected transfers
   - Set up alerts for low balance
   - Review payout records in database

5. **Secure RPC endpoint**
   - Use Helius with API key authentication
   - Don't expose RPC URL publicly
   - Rate limit your endpoints

## 📊 Expected Costs

### SOL Requirements

**Per Hour:**
- Depends on pool amount (from creator fees)
- Example: 0.1 SOL pool = 0.1 SOL distributed
- Transaction fees: ~0.000005 SOL per payout × 10 = 0.00005 SOL

**Per Day:**
- 24 hours × pool amount
- Example: If collecting 0.05 SOL/hour = 1.2 SOL/day

**Recommendation:**
- Start with 5 SOL funded
- Monitor for 24 hours
- Adjust funding frequency based on usage

## 🎉 Launch Checklist

- [ ] Generated reward wallet with `generateRewardWallet.js`
- [ ] Added `HOURLY_REWARD_WALLET_SECRET` to Railway
- [ ] Set `HOURLY_REWARDS_ENABLED=true`
- [ ] Funded reward wallet with SOL (5-10 SOL recommended)
- [ ] Ran database migration (`npm run db:migrate`)
- [ ] Deployed to Railway (`git push`)
- [ ] Verified worker started in logs
- [ ] Tested frontend timer countdown
- [ ] Waited for first hourly distribution
- [ ] Checked transaction on Solscan
- [ ] Verified winners displayed in modal

## 📞 Support

If you encounter issues:

1. **Check logs first:**
   ```bash
   railway logs --service backend | grep -i "reward\|error"
   ```

2. **Verify configuration:**
   ```bash
   railway variables
   ```

3. **Test endpoints:**
   ```bash
   curl https://your-api.railway.app/api/rewards/hourly/next-distribution
   curl https://your-api.railway.app/api/rewards/hourly/last-distribution
   ```

4. **Review database:**
   ```bash
   railway connect
   \dt *Reward*
   ```

---

**🚀 You're ready to launch! The system is fully automated once configured.**

After deployment, rewards will be distributed every hour at :00 automatically. Monitor for the first few hours to ensure everything works smoothly, then sit back and let the system run on auto-pilot! 🎰
