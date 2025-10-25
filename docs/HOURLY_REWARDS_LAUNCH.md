# Hourly Rewards System - Launch Checklist

## Overview
This document contains all environment variables and configuration needed to launch the **Hourly Trading Rewards System** when your pump.fun token is ready.

**Current Status:** ✅ UI/Frontend complete with mock data
**Next Step:** Wire up real pump.fun creator fees when token launches

---

## 🔧 Environment Variables (Backend)

### Required Variables for Production Launch

Add these to your `.env` file (backend) and Railway environment:

```env
# ============================================
# HOURLY REWARDS CONFIGURATION
# ============================================

# Enable/disable the hourly rewards system
HOURLY_REWARDS_ENABLED=true

# Minimum trades required to qualify for hourly rewards
MIN_TRADES_FOR_REWARD=1

# Your pump.fun creator wallet address (receives creator fees)
PUMPFUN_CREATOR_WALLET=YourPumpFunCreatorWalletAddressHere

# Platform owner wallet (receives 90% of creator fees)
PLATFORM_OWNER_WALLET=YourPlatformOwnerWalletAddressHere

# Hourly reward distribution wallet (distributes 10% pool to winners)
# This should be a JSON array of the secret key bytes
# Generate with: node -e "console.log(JSON.stringify(Array.from(require('@solana/web3.js').Keypair.generate().secretKey)))"
HOURLY_REWARD_WALLET_SECRET=[1,2,3,4,5,...]

# IMPORTANT: Keep HOURLY_REWARD_WALLET_SECRET secure!
# This wallet will hold the reward pool and distribute to winners
```

---

## 📝 How to Generate Reward Wallet

Run this command to generate a new Solana keypair for the reward distribution wallet:

```bash
node -e "const {Keypair} = require('@solana/web3.js'); const kp = Keypair.generate(); console.log('Public Key:', kp.publicKey.toBase58()); console.log('Secret Key Array:', JSON.stringify(Array.from(kp.secretKey)));"
```

This will output:
- **Public Key**: Fund this wallet with SOL for reward distributions
- **Secret Key Array**: Add this to `HOURLY_REWARD_WALLET_SECRET` env var

---

## 🚀 Deployment Steps (When Ready to Launch)

### Phase 1: Backend Setup

1. **Update Environment Variables**
   - Add all variables listed above to Railway
   - Verify `HOURLY_REWARD_WALLET_SECRET` is properly formatted as JSON array
   - Fund the reward wallet with initial SOL balance

2. **Install Dependencies**
   ```bash
   cd backend
   npm install node-cron @types/node-cron
   ```

3. **Run Database Migration** (if not already done)
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

4. **Verify Tables Exist**
   - `HourlyRewardPool` - Stores hourly pool amounts (10% of creator fees)
   - `HourlyRewardPayout` - Stores individual payouts to winners
   - `User.rewardWalletAddress` - User's wallet for receiving rewards

### Phase 2: Create Missing Services

These files need to be created when you're ready to go live:

#### 1. Pump.fun Reward Collector
**File:** `backend/src/services/pumpfunRewardCollector.ts`

**Purpose:** Track creator fees from your pump.fun tokens and split 10/90

**Key Functions:**
- Monitor pump.fun creator wallet balance
- Calculate fees earned per hour (UTC windows)
- Create `HourlyRewardPool` records with split amounts
- Transfer 90% to `PLATFORM_OWNER_WALLET` immediately
- Leave 10% in pool for hourly distribution
- Log all transactions for auditing

#### 2. Hourly Reward Worker
**File:** `backend/src/workers/hourlyRewardWorker.ts`

**Purpose:** Run every hour and distribute rewards to top 10 traders

**Key Functions:**
- Uses `node-cron` with schedule `'0 * * * *'` (every hour at :00)
- Query all trades from past hour (UTC time window)
- Calculate profit % for each user using FIFO from `portfolioService.ts`
- Filter users with < `MIN_TRADES_FOR_REWARD` trades
- Select top 10 by profit %
- Distribute rewards: 35%, 20%, 10%, 5%×7
- Transfer SOL using existing `rewardService.ts` logic
- Update `HourlyRewardPayout` table with tx signatures
- Handle edge cases (ties, insufficient funds, invalid wallets)

#### 3. Update Reward Service
**File:** `backend/src/services/rewardService.ts`

**Add New Functions:**
- `calculateHourlyProfits(startTime, endTime, tradeMode)` - Calculate profit % using FIFO
- `getTopTradersHourly(limit, minTrades)` - Get top N traders
- `distributeHourlyRewards(poolAmount, winners)` - Distribute with fixed percentages
- `transferSolReward(walletAddress, amount)` - Wrapper for native SOL transfer

**Remove Old Functions:**
- `addTradePoints()` - No longer needed (epoch system removed)
- `snapshotRewards()` - No longer needed (epoch system removed)

#### 4. Replace Mock API Endpoint
**File:** `backend/src/routes/rewards.ts` (line ~375)

Replace the mock data in `GET /rewards/hourly/last-distribution` with real database query:

```typescript
// Get last completed hourly distribution from database
const lastPool = await prisma.hourlyRewardPool.findFirst({
  where: { distributed: true },
  orderBy: { hourStart: 'desc' },
  include: {
    HourlyRewardPayout: {
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { rank: 'asc' }
    }
  }
});

// Transform to frontend format...
```

#### 5. Integrate Worker into Main Server
**File:** `backend/src/index.ts`

Add after `priceService.start()`:

```typescript
import { hourlyRewardWorker } from './workers/hourlyRewardWorker.js';

// Start hourly reward worker
await hourlyRewardWorker.start();
console.log('✅ Hourly reward worker started');
```

### Phase 3: Auth Route Updates (Optional for Existing Users)

**File:** `backend/src/routes/auth.ts`

1. **Add `rewardWalletAddress` to signup** (already in schema, make required)
2. **Create migration endpoint** for existing users without reward wallet:
   ```typescript
   app.post("/add-reward-wallet", async (req, reply) => {
     // Validate Solana address
     // Update user record
     // Return success
   });
   ```

### Phase 4: Frontend Updates (Optional - New Users Only)

**File:** `frontend/components/auth/signup-form.tsx`

Add required field:
```tsx
<input
  type="text"
  name="rewardWalletAddress"
  placeholder="Your Solana Wallet Address"
  required
  pattern="[1-9A-HJ-NP-Za-km-z]{32,44}"
/>
<p className="text-xs">This wallet will receive SOL rewards from hourly trading competitions</p>
```

**File:** `frontend/components/modals/AddRewardWalletModal.tsx` (NEW)

Create modal for existing users without reward wallet:
- Show on login if `rewardWalletAddress` is NULL
- 7-day grace period
- Input field with validation
- Connect wallet button (Phantom/Solflare)
- "Remind me later" option

---

## 🧪 Testing Before Launch

### 1. Test Reward Wallet
```bash
# Check wallet balance
solana balance <REWARD_WALLET_PUBLIC_KEY>

# Fund wallet for testing
solana transfer <REWARD_WALLET_PUBLIC_KEY> 1 --allow-unfunded-recipient
```

### 2. Test Worker (Manual Trigger)
```typescript
// In hourlyRewardWorker.ts, add a test endpoint:
app.post("/admin/test-hourly-rewards", async (req, reply) => {
  const { adminKey } = req.body;
  if (adminKey !== process.env.ADMIN_KEY) {
    return reply.code(403).send({ error: "Unauthorized" });
  }

  await hourlyRewardWorker.processHourlyRewards();
  return { success: true };
});
```

### 3. Verify Cron Schedule
```bash
# Check logs for cron job registration
# Should see: "✅ Hourly reward worker started"
# Should see: "⏰ Next distribution at: [timestamp]"
```

---

## 📊 Monitoring & Alerts

### Key Metrics to Track

1. **Reward Pool Balance**
   - Monitor `HOURLY_REWARD_WALLET` balance
   - Alert if balance < 0.1 SOL

2. **Distribution Success Rate**
   - Track `HourlyRewardPayout.status = 'COMPLETED'` vs `FAILED`
   - Alert if failure rate > 5%

3. **Transaction Signatures**
   - All payouts should have `txSignature` populated
   - Log missing signatures for investigation

4. **Platform Fee Transfer**
   - Verify 90% transfers to `PLATFORM_OWNER_WALLET`
   - Track total fees collected vs distributed

### Logging
Add comprehensive logging in worker:

```typescript
console.log(`[HourlyRewards] Distribution starting for hour: ${hourStart}`);
console.log(`[HourlyRewards] Pool amount: ${poolAmount} SOL`);
console.log(`[HourlyRewards] Winners: ${winners.length}`);
console.log(`[HourlyRewards] Distribution complete: ${successCount}/${totalCount} successful`);
```

---

## 🔒 Security Checklist

- [ ] `HOURLY_REWARD_WALLET_SECRET` stored securely (Railway secrets, not in code)
- [ ] Reward wallet has multi-sig or time-lock for large balances (optional)
- [ ] Validate all wallet addresses before transfers (Base58, 32-44 chars)
- [ ] Rate limit admin endpoints (test trigger, manual distribution)
- [ ] Log all transfers with timestamps and tx signatures
- [ ] Monitor for unusual activity (large withdrawals, failed transfers)

---

## 📈 Expected Behavior

### Hourly Cycle
1. **:00 - :59** - Countdown timer shows "Next Rewards: MM:SS"
2. **:00** - Worker runs, calculates winners, distributes SOL
3. **:00 - :01** - Timer shows "Rewards Sent! 🎉" (green, pulsing)
4. **:01** - Timer reverts to countdown mode

### Distribution Flow
1. Worker queries trades from past hour (UTC)
2. Calculate profit % for each user (FIFO-based)
3. Filter users with < `MIN_TRADES_FOR_REWARD` trades
4. Rank by profit % (ties broken by volume)
5. Select top 10
6. Transfer SOL: 35%, 20%, 10%, 5%×7
7. Update database with tx signatures
8. Broadcast WebSocket event to frontend

---

## 🎯 Success Criteria

Before going live, verify:
- [ ] Mock endpoints replaced with real database queries
- [ ] Pump.fun reward collector tracking creator fees
- [ ] Hourly worker running on cron schedule
- [ ] SOL transfers executing successfully
- [ ] Transaction signatures recorded in database
- [ ] Frontend displays real winners and tx links
- [ ] WebSocket events triggering UI updates
- [ ] All environment variables configured in Railway
- [ ] Monitoring and alerts set up

---

## 🆘 Troubleshooting

### Worker Not Running
- Check Railway logs for cron registration message
- Verify `node-cron` installed: `npm ls node-cron`
- Test manual trigger: `POST /admin/test-hourly-rewards`

### Transactions Failing
- Check reward wallet balance: `solana balance <PUBLIC_KEY>`
- Verify RPC endpoint is responsive (Helius quota)
- Check transaction signatures in logs
- Verify wallet addresses are valid Base58

### No Winners
- Check if users have `>= MIN_TRADES_FOR_REWARD` trades
- Verify profit calculation logic (FIFO)
- Check time window (UTC, not local time)
- Review trade filtering (paper vs real mode)

---

## 📞 Support Resources

- **Solana Transaction Explorer**: https://solscan.io/
- **Helius RPC Status**: https://status.helius.dev/
- **Node-cron Documentation**: https://www.npmjs.com/package/node-cron
- **Solana Web3.js Docs**: https://solana.com/docs/clients/javascript

---

## 🎮 Frontend Features (Already Complete)

✅ **Navbar countdown timer** - Shows time until next distribution
✅ **"Rewards Sent!" animation** - Appears for 60 seconds after distribution
✅ **Winners modal** - Shows top 10 with Solscan links
✅ **Mock data working** - Ready to swap with real data
✅ **Mario-themed UI** - CartridgePill components with bold borders
✅ **Responsive design** - Works on mobile and desktop
✅ **Auto-refresh** - Modal updates every minute

---

## 📝 Notes

- **Timezone**: All times are UTC (important for hourly windows)
- **Minimum Trades**: Set to 1 (can be increased later)
- **Distribution**: 35%, 20%, 10%, 5%×7 (fixed percentages)
- **Privacy**: Never expose 90% platform allocation in public APIs
- **Messaging**: Never mention pump.fun, creator fees, or splits in frontend

---

**Last Updated**: 2025-01-25
**Status**: Ready for launch when pump.fun token is live
