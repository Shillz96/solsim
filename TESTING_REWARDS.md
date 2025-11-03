# Testing Hourly Rewards System - Complete Guide

This guide will help you test the entire hourly rewards system **before going live** to ensure 100% functionality.

## 🎯 Testing Overview

We'll test in this order:
1. ✅ Generate and configure test reward wallet
2. ✅ Fund wallet with devnet/testnet SOL
3. ✅ Create test trades and users
4. ✅ Inject test fees into pool
5. ✅ Trigger manual distribution
6. ✅ Verify transactions on-chain
7. ✅ Check frontend displays correctly

## 📋 Prerequisites

- Backend running locally (`npm run dev:backend`)
- Access to Solana devnet or small amount of mainnet SOL for testing
- PostgreSQL database accessible
- Postman, curl, or similar for API testing

---

## Step 1: Generate Test Reward Wallet

```bash
cd backend
node scripts/generateRewardWallet.js
```

**Expected Output:**
```
================================================================================
🎰 HOURLY REWARDS WALLET GENERATOR
================================================================================

✅ New reward wallet generated successfully!

📋 ADD TO YOUR .ENV FILE:
--------------------------------------------------------------------------------
HOURLY_REWARD_WALLET_SECRET=[1,2,3,4,...,64]
--------------------------------------------------------------------------------

💰 WALLET DETAILS:
--------------------------------------------------------------------------------
Public Address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Secret Key Length: 64 bytes
--------------------------------------------------------------------------------
```

**Action:**
1. Copy the `HOURLY_REWARD_WALLET_SECRET` value
2. Add to `backend/.env`:
   ```bash
   HOURLY_REWARD_WALLET_SECRET=[1,2,3,...]
   HOURLY_REWARDS_ENABLED=true
   MIN_TRADES_FOR_REWARD=1
   ADMIN_KEY=test-admin-key-12345
   ```
3. Save the public address for Step 2

---

## Step 2: Fund Reward Wallet

### Option A: Mainnet Testing (Small Amount)
```bash
# Send 0.1-0.5 SOL to the wallet address for testing
# This is real SOL - use only what you're comfortable testing with
```

### Option B: Devnet Testing (Free)
```bash
# Request devnet SOL (free for testing)
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

**Note:** For devnet, update your backend `.env`:
```bash
SOLANA_RPC=https://api.devnet.solana.com
```

---

## Step 3: Check System Status

Restart your backend to load new env vars:
```bash
# Ctrl+C to stop, then:
cd backend
npm run dev
```

Check if the system is configured correctly:
```bash
curl http://localhost:8000/api/rewards/admin/system-status
```

**Expected Output:**
```json
{
  "configured": true,
  "enabled": true,
  "configuration": {
    "rewardWallet": "✅ Configured",
    "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "walletBalance": "0.500000 SOL",
    "canSignTransactions": true,
    "pumpFunWallet": "⚠️ Optional",
    "platformWallet": "⚠️ Optional",
    "minTradesRequired": 1
  },
  "status": "✅ READY"
}
```

**✅ Verification Checklist:**
- [ ] `configured`: true
- [ ] `walletBalance`: > 0 SOL
- [ ] `canSignTransactions`: true
- [ ] `status`: "✅ READY"

---

## Step 4: Create Test Trading Activity

### Method 1: Use Your App (Recommended)
1. Log in to your app with 2-3 different test accounts
2. Make some trades (buy/sell tokens)
3. Ensure different profit levels for testing ranking

### Method 2: Direct Database Insert (Quick Testing)
```sql
-- Connect to database
psql YOUR_DATABASE_URL

-- Create test users with wallets (if not exist)
INSERT INTO "User" (id, email, handle, "passwordHash", "walletAddress", "emailVerified")
VALUES
  ('test-user-1', 'trader1@test.com', 'TopTrader', 'hash', 'WALLET_ADDRESS_1', true),
  ('test-user-2', 'trader2@test.com', 'MidTrader', 'hash', 'WALLET_ADDRESS_2', true),
  ('test-user-3', 'trader3@test.com', 'LowTrader', 'hash', 'WALLET_ADDRESS_3', true)
ON CONFLICT (id) DO NOTHING;

-- Create test trades from the past hour
INSERT INTO "Trade" ("id", "userId", "tokenAddress", "mint", "tokenSymbol", "action", "side", "quantity", "price", "totalCost", "realizedPnL", "tradeMode", "timestamp")
VALUES
  (gen_random_uuid(), 'test-user-1', 'token1', 'mint1', 'TEST', 'BUY', 'BUY', 1000, 0.001, 1, NULL, 'PAPER', NOW() - INTERVAL '30 minutes'),
  (gen_random_uuid(), 'test-user-1', 'token1', 'mint1', 'TEST', 'SELL', 'SELL', 1000, 0.0015, 1.5, 0.5, 'PAPER', NOW() - INTERVAL '15 minutes'),
  (gen_random_uuid(), 'test-user-2', 'token2', 'mint2', 'TEST2', 'BUY', 'BUY', 500, 0.002, 1, NULL, 'PAPER', NOW() - INTERVAL '25 minutes'),
  (gen_random_uuid(), 'test-user-2', 'token2', 'mint2', 'TEST2', 'SELL', 'SELL', 500, 0.0025, 1.25, 0.25, 'PAPER', NOW() - INTERVAL '10 minutes'),
  (gen_random_uuid(), 'test-user-3', 'token3', 'mint3', 'TEST3', 'BUY', 'BUY', 2000, 0.0005, 1, NULL, 'PAPER', NOW() - INTERVAL '20 minutes'),
  (gen_random_uuid(), 'test-user-3', 'token3', 'mint3', 'TEST3', 'SELL', 'SELL', 2000, 0.00045, 0.9, -0.1, 'PAPER', NOW() - INTERVAL '5 minutes');

-- Verify trades were created
SELECT u.handle, t.side, t."realizedPnL", t.timestamp
FROM "Trade" t
JOIN "User" u ON t."userId" = u.id
WHERE t.timestamp > NOW() - INTERVAL '1 hour'
ORDER BY t.timestamp DESC;
```

**Expected Profit Rankings:**
1. TopTrader: +50% (0.5 profit on 1 cost)
2. MidTrader: +25% (0.25 profit on 1 cost)
3. LowTrader: -10% (0.1 loss on 1 cost)

---

## Step 5: Inject Test Fees into Pool

This simulates creator fees being collected:

```bash
curl -X POST http://localhost:8000/api/rewards/admin/inject-fees \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "test-admin-key-12345",
    "amountSOL": 0.1
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Fees injected successfully",
  "totalFees": 0.1,
  "poolAmount": 0.01,
  "platformAmount": 0.09,
  "timestamp": "2025-01-23T..."
}
```

**✅ Verification:**
- `poolAmount`: 0.01 SOL (10% of 0.1)
- `platformAmount`: 0.09 SOL (90% of 0.1)

**Check Database:**
```sql
SELECT * FROM "HourlyRewardPool"
WHERE "distributed" = false
ORDER BY "createdAt" DESC
LIMIT 1;
```

You should see a pool with `poolAmount = 0.01`.

---

## Step 6: Trigger Test Distribution

Now manually trigger the hourly distribution:

```bash
curl -X POST http://localhost:8000/api/rewards/admin/test-distribution \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "test-admin-key-12345"
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Test distribution completed successfully",
  "timestamp": "2025-01-23T..."
}
```

**Watch Backend Logs:**
You should see:
```
============================================================
🎰 HOURLY REWARDS DISTRIBUTION STARTED
============================================================
💰 Pool amount for 2025-01-23T14:00:00.000Z: 0.01 SOL
📊 Calculating profits for trades since 2025-01-23T13:00:00.000Z
👥 Found 3 active traders in the past hour

🏆 TOP 10 WINNERS:
   1. TopTrader: 50.00% (2 trades)
   2. MidTrader: 25.00% (2 trades)
   3. LowTrader: -10.00% (2 trades)

💰 Distributing 0.01 SOL to 3 winners
   1. TopTrader: 0.003500 SOL (50.00% profit)
      ✅ Sent! Tx: 5j7s8K9mN3pQ...
   2. MidTrader: 0.002000 SOL (25.00% profit)
      ✅ Sent! Tx: 6k8t9L0nO4pR...
   3. LowTrader: 0.001000 SOL (-10.00% profit)
      ✅ Sent! Tx: 7l9u0M1oP5qS...

✅ Hourly distribution completed successfully!
============================================================
```

---

## Step 7: Verify On-Chain Transactions

### Check Solscan

1. Get transaction signatures from backend logs or database:
   ```sql
   SELECT
     u.handle,
     p.rank,
     p."rewardAmount",
     p."txSignature",
     p.status
   FROM "HourlyRewardPayout" p
   JOIN "User" u ON p."userId" = u.id
   ORDER BY p."createdAt" DESC
   LIMIT 10;
   ```

2. Visit Solscan for each transaction:
   - Mainnet: `https://solscan.io/tx/YOUR_TX_SIGNATURE`
   - Devnet: `https://solscan.io/tx/YOUR_TX_SIGNATURE?cluster=devnet`

3. **Verify Transaction Details:**
   - ✅ From Address: Your reward wallet
   - ✅ To Address: Test user's wallet
   - ✅ Amount: Matches `rewardAmount`
   - ✅ Status: Success

### Check Wallet Balances

```bash
# Check reward wallet balance (should be less after distribution)
curl http://localhost:8000/api/rewards/admin/system-status | jq '.configuration.walletBalance'

# Expected: Original balance minus distributed amount minus fees
# Example: 0.5 - 0.01 - 0.00005 ≈ 0.48995 SOL
```

---

## Step 8: Test Frontend Display

### Check Last Distribution Endpoint

```bash
curl http://localhost:8000/api/rewards/hourly/last-distribution | jq
```

**Expected Output:**
```json
{
  "poolId": "uuid-here",
  "distributedAt": "2025-01-23T14:05:23.456Z",
  "totalPoolAmount": "0.01",
  "winnersCount": 3,
  "winners": [
    {
      "rank": 1,
      "userId": "test-user-1",
      "handle": "TopTrader",
      "avatarUrl": null,
      "profitPercent": "50.00",
      "rewardAmount": "0.003500",
      "walletAddress": "WALLET_ADDRESS_1",
      "txSignature": "5j7s8K9mN3pQ...",
      "status": "COMPLETED"
    },
    ...
  ]
}
```

### Test Frontend Modal

1. Open your app frontend in browser
2. Wait for the hourly timer to show "Rewards Sent! 🎉" OR open the modal manually
3. **Verify Modal Displays:**
   - [ ] Shows 3 winners (TopTrader, MidTrader, LowTrader)
   - [ ] Correct ranking (1, 2, 3)
   - [ ] Trophies for top 3 (🥇 🥈 🥉)
   - [ ] Profit percentages match (50%, 25%, -10%)
   - [ ] Reward amounts match (0.0035, 0.002, 0.001)
   - [ ] "View Tx" buttons link to Solscan
   - [ ] Total pool amount shows 0.01 SOL

---

## Step 9: Test Error Scenarios

### Test with Insufficient Balance

1. Create a new pool with large amount:
   ```bash
   curl -X POST http://localhost:8000/api/rewards/admin/inject-fees \
     -H "Content-Type: application/json" \
     -d '{"adminKey": "test-admin-key-12345", "amountSOL": 10}'
   ```

2. Trigger distribution (should fail gracefully):
   ```bash
   curl -X POST http://localhost:8000/api/rewards/admin/test-distribution \
     -H "Content-Type: application/json" \
     -d '{"adminKey": "test-admin-key-12345"}'
   ```

3. **Expected Behavior:**
   - Backend logs: "❌ Insufficient balance in reward wallet!"
   - Payouts created with `status: "FAILED"`
   - Error message: "Insufficient balance in reward wallet"

### Test with No Eligible Winners

1. Delete recent trades:
   ```sql
   DELETE FROM "Trade" WHERE timestamp > NOW() - INTERVAL '1 hour';
   ```

2. Trigger distribution:
   ```bash
   curl -X POST http://localhost:8000/api/rewards/admin/test-distribution \
     -H "Content-Type: application/json" \
     -d '{"adminKey": "test-admin-key-12345"}'
   ```

3. **Expected Behavior:**
   - Backend logs: "ℹ️ No eligible winners this hour"
   - Pool marked as distributed
   - No payouts created

### Test with User Without Wallet

1. Create user without wallet address:
   ```sql
   UPDATE "User"
   SET "walletAddress" = NULL
   WHERE handle = 'TopTrader';
   ```

2. Trigger distribution

3. **Expected Behavior:**
   - Backend logs: "ℹ️ Skipping TopTrader - no wallet connected"
   - User excluded from distribution
   - Only other eligible users receive rewards

---

## Step 10: Database Verification Queries

```sql
-- Check all pools created
SELECT
  "hourStart",
  "hourEnd",
  "totalCreatorRewards",
  "poolAmount",
  "distributed",
  "distributedAt"
FROM "HourlyRewardPool"
ORDER BY "createdAt" DESC
LIMIT 5;

-- Check all payouts
SELECT
  u.handle,
  p.rank,
  p."profitPercentage",
  p."rewardAmount",
  p.status,
  p."txSignature",
  p."createdAt"
FROM "HourlyRewardPayout" p
JOIN "User" u ON p."userId" = u.id
ORDER BY p."createdAt" DESC
LIMIT 10;

-- Check payout success rate
SELECT
  status,
  COUNT(*) as count,
  SUM("rewardAmount") as total_amount
FROM "HourlyRewardPayout"
GROUP BY status;

-- Find failed payouts
SELECT
  u.handle,
  p."rewardAmount",
  p."errorMessage",
  p."createdAt"
FROM "HourlyRewardPayout" p
JOIN "User" u ON p."userId" = u.id
WHERE p.status = 'FAILED'
ORDER BY p."createdAt" DESC;
```

---

## ✅ Final Checklist

Before going live to production, verify:

### Configuration
- [ ] Reward wallet generated and secret saved securely
- [ ] `HOURLY_REWARDS_ENABLED=true` in .env
- [ ] `ADMIN_KEY` set and secure
- [ ] Wallet funded with adequate SOL

### Functionality
- [ ] System status shows "✅ READY"
- [ ] Can inject fees into pool successfully
- [ ] Can trigger manual distribution
- [ ] Transactions appear on Solscan with correct amounts
- [ ] Payouts recorded in database with status "COMPLETED"
- [ ] Frontend modal displays winners correctly
- [ ] Solscan links work and show real transactions

### Error Handling
- [ ] Insufficient balance handled gracefully
- [ ] Users without wallets excluded properly
- [ ] No eligible winners handled correctly
- [ ] Failed transactions recorded with error messages

### Performance
- [ ] Distribution completes in < 30 seconds
- [ ] Database queries performant (< 1 second)
- [ ] Frontend loads winners quickly

---

## 🚀 Ready for Production?

If all tests pass, you're ready to deploy! Follow these steps:

1. **Generate production wallet:**
   ```bash
   node scripts/generateRewardWallet.js
   ```
   Save the output securely (password manager, Railway secrets, etc.)

2. **Add Railway environment variables:**
   ```bash
   railway variables set HOURLY_REWARDS_ENABLED=true
   railway variables set HOURLY_REWARD_WALLET_SECRET="[1,2,3,...]"
   railway variables set MIN_TRADES_FOR_REWARD=1
   railway variables set ADMIN_KEY="secure-random-key-here"
   ```

3. **Fund production wallet:**
   Send 5-10 SOL to the wallet address

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Launch production hourly rewards system"
   git push
   ```

5. **Monitor first distribution:**
   ```bash
   railway logs --service backend | grep "HOURLY REWARDS"
   ```

6. **Verify on Solscan:**
   Check the first real distribution transactions

---

## 🆘 Troubleshooting

### "Worker not enabled" in logs
- Check: `HOURLY_REWARDS_ENABLED=true` in env vars
- Restart backend after adding

### "Cannot load reward wallet"
- Check: `HOURLY_REWARD_WALLET_SECRET` format is correct JSON array
- Verify: Array has exactly 64 numbers

### Transactions fail
- Check: Wallet has sufficient SOL balance
- Check: RPC endpoint is working (Helius recommended)
- Verify: Network (mainnet vs devnet) matches wallet

### No winners found
- Check: Users have made trades in past hour
- Check: Users have `walletAddress` set
- Check: `MIN_TRADES_FOR_REWARD` threshold

### Frontend shows no data
- Check: `/api/rewards/hourly/last-distribution` returns data
- Check: At least one distribution has completed
- Verify: Frontend API_URL points to correct backend

---

**🎉 Testing Complete!**

You now have a fully tested, production-ready hourly rewards system!
