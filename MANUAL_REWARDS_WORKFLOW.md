# Manual Rewards System - Complete Workflow Guide

This guide shows you how to safely control hourly reward distributions using manual funding.

## 🎯 How Manual Funding Works

**Two Separate Steps:**
1. **Fund the Wallet** - You send SOL to the reward wallet whenever you want
2. **Record Fees** - You tell the system how much to distribute (automatically does 10%/90% split)

**Key Concept:**
- The wallet can have any amount of SOL (your choice)
- You control distributions via the `inject` command
- The 10%/90% split happens in the inject command, not the wallet

---

## 📋 Setup (One-Time)

### 1. Fund Your Reward Wallet

**Wallet Address:**
```
9EkB3KaPykjcZbhk8tr88cenaqiCPz6bGiMxyp4x2t5h
```

**How much to send:**
- **Conservative**: 1-2 SOL (20-40 hours at 0.05 SOL/hour)
- **Moderate**: 5-10 SOL (100-200 hours)
- **Aggressive**: 20+ SOL (400+ hours)

**Send via:**
- Phantom wallet
- Solflare wallet
- `solana transfer` CLI
- Any Solana wallet app

**Check balance anytime:**
https://solscan.io/account/9EkB3KaPykjcZbhk8tr88cenaqiCPz6bGiMxyp4x2t5h

---

## 🔧 Daily Operations

### Option A: Using the Helper Script (Recommended)

Navigate to backend directory:
```bash
cd backend/scripts
```

#### Check System Status
```bash
node manageRewards.cjs status
```

Shows:
- ✅ Wallet address
- ✅ Current balance
- ✅ System configuration

#### Check Current Pool
```bash
node manageRewards.cjs pool
```

Shows:
- 💰 How much will be distributed this hour
- 📊 Platform fees tracked
- 🎯 Total fees recorded

#### Record Creator Fees (10%/90% Split)
```bash
# Example: You earned 1 SOL in creator fees
node manageRewards.cjs inject 1.0

# This will:
# - Add 0.10 SOL to the reward pool (distributed to top 10)
# - Track 0.90 SOL as platform fees (just accounting)
```

**Common Amounts:**
```bash
node manageRewards.cjs inject 0.5   # 0.05 SOL to pool, 0.45 SOL platform
node manageRewards.cjs inject 1.0   # 0.10 SOL to pool, 0.90 SOL platform
node manageRewards.cjs inject 5.0   # 0.50 SOL to pool, 4.50 SOL platform
```

#### Test Distribution (Before Launch)
```bash
node manageRewards.cjs distribute
```

Manually triggers distribution for testing. Use this to verify everything works before going live.

#### View Last Distribution
```bash
node manageRewards.cjs last
```

Shows:
- 🏆 Top 10 winners
- 💰 Reward amounts
- ✅ Transaction signatures
- 📊 Status (COMPLETED or FAILED)

---

### Option B: Using Direct API Calls

If you prefer curl or want to integrate with other tools:

#### Check Status
```bash
curl https://solsim-production.up.railway.app/api/rewards/admin/system-status
```

#### Check Current Pool
```bash
curl https://solsim-production.up.railway.app/api/rewards/hourly/current-pool
```

#### Inject Fees
```bash
curl -X POST https://solsim-production.up.railway.app/api/rewards/admin/inject-fees \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "f6886eebce5b82094c7dc49c83f678f1c21accfc921b13af67bb0d89649299c3",
    "amountSOL": 0.5
  }'
```

#### Trigger Test Distribution
```bash
curl -X POST https://solsim-production.up.railway.app/api/rewards/admin/test-distribution \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "f6886eebce5b82094c7dc49c83f678f1c21accfc921b13af67bb0d89649299c3"
  }'
```

#### View Last Distribution
```bash
curl https://solsim-production.up.railway.app/api/rewards/hourly/last-distribution
```

---

## 💡 Example Workflows

### Workflow 1: Weekly Rewards
```bash
# Monday: Fund wallet with 5 SOL
# Transfer 5 SOL to 9EkB3KaPykjcZbhk8tr88cenaqiCPz6bGiMxyp4x2t5h

# Each day, record your creator fees:
node manageRewards.cjs inject 0.8    # Day 1
node manageRewards.cjs inject 1.2    # Day 2
node manageRewards.cjs inject 0.6    # Day 3
# etc...

# Check status anytime:
node manageRewards.cjs status
node manageRewards.cjs pool

# Refill wallet when low (check Solscan)
```

### Workflow 2: Per-Trade Recording
```bash
# After each pump.fun trade that generates creator fees:
# Calculate: creator_fee = trade_volume * 0.01  (1% fee)

# Record the fee:
node manageRewards.cjs inject 0.05   # If fee was 0.05 SOL
```

### Workflow 3: End-of-Day Batch
```bash
# At end of day, calculate total creator fees earned
# Let's say you earned 2.5 SOL total

# Record it all at once:
node manageRewards.cjs inject 2.5

# This adds 0.25 SOL to the pool for next distribution
```

---

## 🔒 Safety Guidelines

### 1. Wallet Balance vs Pool Amount

**Always ensure:**
```
Wallet Balance >= Pool Amount
```

**Check before injecting:**
```bash
node manageRewards.cjs status   # Check wallet balance
node manageRewards.cjs pool     # Check current pool
```

**Example (SAFE):**
```
Wallet: 5 SOL
Current Pool: 0.2 SOL
Inject: 0.5 SOL → New Pool: 0.25 SOL
✅ Safe! 5 SOL > 0.25 SOL
```

**Example (UNSAFE):**
```
Wallet: 0.1 SOL
Current Pool: 0.5 SOL
Inject: 10 SOL → New Pool: 1.5 SOL
❌ FAIL! 0.1 SOL < 1.5 SOL
Distribution will fail with "Insufficient balance"
```

### 2. The 10%/90% Split Explained

When you inject fees:
```bash
node manageRewards.cjs inject 1.0
```

**What happens:**
- 0.10 SOL → `poolAmount` (will be distributed from wallet)
- 0.90 SOL → `platformAmount` (just tracking, no transfer)
- You keep the 0.90 SOL in your creator wallet

**The 90% is YOURS** - it never leaves your creator wallet. The `platformAmount` field is just for accounting/reporting.

### 3. When Distribution Happens

**Automatic (Production):**
- Every hour at :00 (1:00, 2:00, 3:00, etc.)
- Worker checks the `poolAmount` for that hour
- Distributes to top 10 traders
- If wallet doesn't have enough SOL → marks as FAILED

**Manual (Testing):**
```bash
node manageRewards.cjs distribute
```

### 4. Monitoring

**Check wallet balance regularly:**
```bash
node manageRewards.cjs status
```

**Or visit Solscan:**
https://solscan.io/account/9EkB3KaPykjcZbhk8tr88cenaqiCPz6bGiMxyp4x2t5h

**Set up alerts** (optional):
- Helius webhook on wallet balance changes
- Simple cron job to check balance daily

---

## 🚨 Troubleshooting

### "Insufficient balance in reward wallet"

**Cause:** Pool amount > wallet balance

**Fix:**
1. Check wallet balance on Solscan
2. Send more SOL to reward wallet
3. Next distribution will work automatically

### Pool is empty every hour

**Cause:** Not injecting fees

**Fix:**
```bash
node manageRewards.cjs inject <amount>
```

You need to actively record fees for distributions to happen.

### Distribution happened but winners got 0 SOL

**Cause:** No eligible traders (need at least 1 trade in past hour)

**Fix:** This is normal if no one traded. Pool rolls over to next hour.

---

## 📊 Monitoring Dashboard (Coming Soon)

Consider building a simple dashboard:
```
Current Hour Pool:    0.15 SOL
Wallet Balance:       4.85 SOL
Platform Fees Today:  2.40 SOL
Distributions Today:  12
Total Distributed:    3.20 SOL
```

**For now, use:**
```bash
node manageRewards.cjs status
node manageRewards.cjs pool
node manageRewards.cjs last
```

---

## 🎯 Launch Checklist

Before going live:

- [ ] Funded reward wallet with SOL (recommended: 5-10 SOL)
- [ ] Verified system status shows "✅ READY"
- [ ] Tested inject command: `node manageRewards.cjs inject 0.1`
- [ ] Tested distribution: `node manageRewards.cjs distribute`
- [ ] Verified transaction on Solscan
- [ ] Understand wallet balance vs pool amount
- [ ] Know how to check balance regularly
- [ ] Have refill plan when wallet runs low

---

## 💰 Cost Estimation

**Transaction Fees:**
- ~0.000005 SOL per transfer
- 10 winners × 0.000005 = 0.00005 SOL per hour
- Negligible cost (0.0012 SOL/day)

**Reward Costs:**
- Depends entirely on how much you inject
- Example: Inject 1 SOL/day → 0.1 SOL/day to pool
- 0.1 SOL × 30 days = 3 SOL/month to winners

**You control everything** - inject more = bigger rewards, inject less = smaller rewards

---

## 🎉 You're Ready!

The system is fully configured and ready to use. Here's your quick start:

```bash
cd backend/scripts

# 1. Fund wallet (via Phantom/Solflare)
# Send SOL to: 9EkB3KaPykjcZbhk8tr88cenaqiCPz6bGiMxyp4x2t5h

# 2. Verify system
node manageRewards.cjs status

# 3. Record your first fees
node manageRewards.cjs inject 0.5

# 4. Check the pool
node manageRewards.cjs pool

# 5. Test distribution (optional)
node manageRewards.cjs distribute

# 6. Wait for automatic hourly distribution at :00
# Or let it run automatically in production!
```

**Questions?** Check Railway logs:
```bash
railway logs | grep -i "hourly rewards"
```

---

**🚀 Enjoy your automated hourly rewards system!**
