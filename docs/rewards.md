# Hourly Trading Rewards System Implementation

## Overview
**Replace the old points/epoch system** with a new hourly profit-based reward system. Distribute **10% of platform pump.fun creator rewards** hourly to the top 10 traders based on highest profit percentage. The remaining **90% stays with the platform**. Rewards are paid in native SOL to wallet addresses that users must provide at signup.

**Frontend Messaging**: Do NOT mention pump.fun, creator fees, or percentage splits. Simply present it as "Hourly SOL Rewards for Top Traders."

## Backend Implementation

### 1. Database Schema Updates
**File: `backend/prisma/schema.prisma`**

**Replace old system:**
- Remove `rewardPoints` field from User model (no longer needed)
- Remove `RewardSnapshot` model (epoch-based, no longer used)
- Update `RewardClaim` model to work with hourly rewards instead of epochs
- Remove VSOL token references from reward system

**Add new fields:**
- Add `rewardWalletAddress` field to User model (String, required, unique)
- Create `HourlyRewardPool` model to track hourly reward pools from pump.fun
- Create `HourlyRewardPayout` model to track individual hourly payouts
- Add indexes for efficient hourly queries

**Migration strategy:**
- Preserve historical `RewardClaim` data for reference
- Require existing users to add `rewardWalletAddress` on next login

### 2. Refactor Reward Service
**File: `backend/src/services/rewardService.ts`**

**Remove old functionality:**
- Remove `addTradePoints()` function (volume-based points accumulation)
- Remove `snapshotRewards()` function (epoch-based distribution)
- Remove epoch/points logic entirely
- Keep only the SOL transfer functionality for reuse

**Add new functionality:**
- `calculateHourlyProfits(startTime, endTime)` - Calculate profit % for all traders in time window
- `getTopTradersHourly(limit)` - Get top N traders by profit %
- `distributeHourlyRewards(poolAmount, winners)` - Distribute to top 10 with fixed percentages
- Reuse existing SOL transfer logic (already supports native SOL)

### 3. Pump.fun Reward Collector
**File: `backend/src/services/pumpfunRewardCollector.ts`** (NEW)

- Track total creator rewards from platform's pump.fun token launches
- **Split allocation:**
  - 10% → hourly reward pool (distributed to traders)
  - 90% → platform owner wallet (automatic transfer)
- Store hourly pool amounts in `HourlyRewardPool` table
- Log all allocations for accounting/auditing
- Integrate with existing pump.fun tracking

### 4. Hourly Reward Worker
**File: `backend/src/workers/hourlyRewardWorker.ts`** (NEW)

- Run every hour at :00 minutes (cron job)
- Query all trades from past hour (UTC time window)
- Calculate profit % for each user using FIFO from `portfolioService.ts`
- Select top 10 traders by profit %
- Get current hour's pool amount from `pumpfunRewardCollector`
- Distribute rewards with fixed percentages: 35%, 20%, 10%, 5%×7
- Transfer SOL to winner wallet addresses
- Log all distributions and update `HourlyRewardPayout` table
- Handle edge cases (ties, insufficient funds, invalid wallets, minimum trades)

### 5. Remove Old Trade Points Logic
**Files: `backend/src/services/tradeService.ts`, `backend/src/services/tradeServiceV2.ts`, `backend/src/services/realTradeService.ts`**

- Remove all calls to `addTradePoints()`
- Remove volume-based point accumulation
- Clean up imports of old reward functions

### 6. Auth Route Updates
**File: `backend/src/routes/auth.ts`**

- Add `rewardWalletAddress` to signup-email schema (required, validated)
- Add Solana wallet address validation (Base58, 32-44 chars)
- Helper text: "This wallet will receive SOL from hourly trading competitions"
- **DO NOT mention pump.fun or creator fees**
- Create migration endpoint for existing users: `POST /auth/add-reward-wallet`

### 7. API Routes - Refactor Rewards Endpoints
**File: `backend/src/routes/rewards.ts`**

**Remove old endpoints:**
- Remove epoch-based reward claim endpoints
- Remove VSOL token reward endpoints
- Remove points-based queries

**Add new endpoints:**
- `GET /rewards/hourly/history` - User's hourly reward history
- `GET /rewards/hourly/current-pool` - Current hour's reward pool (10% only)
- `GET /rewards/hourly/leaderboard` - Current hour's top traders with positions
- `GET /rewards/hourly/stats` - Overall stats (total distributed, user totals)
- `GET /rewards/hourly/next-distribution` - Countdown to next payout
- **DO NOT expose 90% platform allocation in public APIs**

## Frontend Implementation

### 8. Signup Flow Updates
**File: `frontend/components/auth/signup-form.tsx`**

- Add "Reward Wallet Address" field (required, validated)
- Validate Solana address format client-side
- Helper text: "Enter your Solana wallet address to receive hourly trading rewards"
- Tooltip: "Top 10 traders by profit % earn SOL rewards every hour"
- Optional: Connect wallet button (Phantom/Solflare) to auto-fill
- **DO NOT mention pump.fun, creator fees, or percentage splits**

### 9. Home Page Updates
**File: `frontend/app/page.tsx`**
**Component: `frontend/components/landing/features-section.tsx`**

**Replace old reward messaging:**
- Remove references to "XP & Rewards" with epoch/points system
- Remove VSOL token mentions
- Remove "claim rewards" messaging

**Add new messaging:**
- New feature card: "Hourly Trading Rewards"
- Headline: "Top 10 traders by profit % earn SOL every hour!"
- Show distribution percentages (1st: 35%, 2nd: 20%, 3rd: 10%, 4th-10th: 5%)
- Add visuals: trophy icons, countdown timer, coin animations
- **DO NOT mention source of rewards or platform allocation**

### 10. Docs Page Updates
**File: `frontend/app/docs/page.tsx`**

**Replace "XP & Rewards System" section with "Hourly Trading Rewards":**

**New messaging:**
- Explain how hourly rewards work (top 10 by profit %)
- Show distribution table with clear percentages
- Clarify profit % calculation (FIFO-based)
- Explain wallet requirement at signup
- Add FAQ section (common questions about eligibility, payouts, etc.)
- **Remove all mentions of:**
  - Points/XP accumulation
  - Epoch-based rewards
  - VSOL tokens
  - Volume-based rewards
  - Claiming mechanisms
- **DO NOT mention pump.fun, creator fees, or 90% platform allocation**
- Simply state: "SOL rewards are distributed automatically to the top performers every hour"

### 11. Leaderboard Complete Overhaul
**File: `frontend/components/leaderboard/Leaderboard.tsx`**

**Replace all-time rankings with hourly focus:**
- **Primary view: "Hourly Leaders"** - Current hour's top 10 by profit %
- Show real-time profit % for each trader
- Display estimated reward amounts for each position (based on current pool)
- Show countdown timer to next distribution (updates every second)
- Add "Recent Payouts" section - Last 24 hours of winners
- Highlight current user's position if in top 10
- Add historical tab: "Past Winners" (previous hours/days)
- **Show only user-facing reward amounts (the 10% pool)**
- Remove volume/PnL-based all-time rankings

### 12. Rewards Page Complete Redesign
**File: `frontend/app/rewards/page.tsx`**

**Remove old content:**
- Remove points balance display
- Remove epoch claim buttons
- Remove VSOL reward claiming
- Remove "claimable rewards" logic

**Add new content:**
- **Hero Section:** Total SOL earned from hourly rewards
- **Current Hour Status:** Show user's current ranking and potential reward
- **Reward History Table:** All past hourly payouts with dates, positions, amounts
- **Transaction Links:** Link each payout to Solscan transaction
- **Countdown Widget:** Time until next distribution
- **Performance Stats:** Win count (top 10 finishes), best position, avg reward
- **Wallet Display:** Current reward wallet address (editable link)

### 13. Profile Settings Updates
**File: `frontend/app/profile/settings/page.tsx`**

- Add "Reward Wallet" section
- Display current reward wallet address
- Add "Update Wallet" button with validation
- Show warning modal when changing (security measure)
- Display total SOL rewards sent to this wallet (lifetime)
- Show recent transactions to this wallet

### 14. Remove Old Reward UI Components
**Files to update/remove:**
- Remove or refactor any components showing XP/points
- Remove VSOL token balance displays
- Remove "Claim Rewards" buttons and modals
- Update navigation to reflect new hourly system only

## Testing & Validation

### 15. Backend Tests
- Test hourly profit % calculation accuracy (FIFO-based)
- Test top 10 selection logic (including ties)
- Test reward distribution with fixed percentages
- Test 90/10 split allocation
- Test SOL transfer functionality to user wallets
- Test platform allocation (90% to owner wallet)
- Test edge cases (no trades, insufficient pool, invalid wallets)
- Test minimum trade requirement (at least 2 trades/hour)

### 16. Frontend Tests
- Test wallet address validation (signup and profile)
- Test signup flow with mandatory wallet field
- Test leaderboard real-time updates
- Test countdown timer accuracy
- Test reward history display
- **Verify no platform allocation info exposed**
- Test migration flow for existing users

## Database Migration

### 17. Migration SQL
**File: `backend/prisma/migrations/replace-rewards-system.sql`**

```sql
-- Add rewardWalletAddress to User table
ALTER TABLE "User" ADD COLUMN "rewardWalletAddress" TEXT;
-- Will be made required after migration period

-- Remove rewardPoints (keep in DB for now, but deprecated)
-- ALTER TABLE "User" DROP COLUMN "rewardPoints";

-- Create new hourly reward tables
CREATE TABLE "HourlyRewardPool" (
  id UUID PRIMARY KEY,
  hourStart TIMESTAMP NOT NULL,
  hourEnd TIMESTAMP NOT NULL,
  totalCreatorRewards DECIMAL NOT NULL,
  poolAmount DECIMAL NOT NULL, -- 10% of total
  platformAmount DECIMAL NOT NULL, -- 90% of total
  distributed BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "HourlyRewardPayout" (
  id UUID PRIMARY KEY,
  poolId UUID REFERENCES "HourlyRewardPool"(id),
  userId UUID REFERENCES "User"(id),
  rank INT NOT NULL,
  profitPercentage DECIMAL NOT NULL,
  rewardAmount DECIMAL NOT NULL,
  walletAddress TEXT NOT NULL,
  txSignature TEXT,
  status TEXT DEFAULT 'PENDING',
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### 18. Existing Users Migration
- Create migration endpoint: `POST /auth/add-reward-wallet`
- Show modal on login if `rewardWalletAddress` is NULL
- Allow 7-day grace period for users to add wallet
- After grace period, require wallet before trading
- Send email notification to existing users about new system
- Provide clear migration guide in docs

## Documentation Updates

### 19. API Documentation
**File: `backend/routes/README.md`**

- Remove old points/epoch endpoint documentation
- Document new hourly reward endpoints with examples
- Document WebSocket events for real-time leaderboard updates
- **Add internal dev notes about 90/10 split** (separate section, not public)

### 20. Environment Variables
**File: `ENVIRONMENT_SETUP.md`**

**Remove:**
- `VSOL_TOKEN_MINT` (no longer needed)
- Old epoch-based reward variables

**Add:**
- `PUMPFUN_CREATOR_WALLET` - Platform's pump.fun creator wallet
- `PLATFORM_OWNER_WALLET` - Wallet receiving 90% of creator rewards
- `HOURLY_REWARDS_ENABLED` - Feature flag (default: true)
- `HOURLY_REWARD_WALLET` - Wallet for distributing the 10% pool
- `MIN_TRADES_FOR_REWARD` - Minimum trades to qualify (default: 2)

## Key Implementation Notes

- **Profit Calculation**: Use existing FIFO position tracking from `portfolioService.ts`
- **Hourly Window**: UTC time, :00 to :59 of each hour
- **Ranking Ties**: If same profit %, rank by total trade volume
- **Minimum Trades**: Require at least 2 trades in the hour to qualify
- **Reward Payout**: Reuse existing SOL transfer logic from `rewardService.ts`
- **Pool Allocation**: 10% split as: 35%, 20%, 10%, 5%, 5%, 5%, 5%, 5%, 5%, 5%
- **Platform Allocation**: Automatically transfer 90% to `PLATFORM_OWNER_WALLET` each hour
- **Security**: Validate all wallet addresses before transfers, log every transaction
- **Scalability**: Use Redis caching for current hour leaderboard (refresh every 5 min)
- **Frontend Privacy**: NEVER expose pump.fun source, creator fees, or 90/10 split
- **Backward Compatibility**: Keep old RewardClaim table for historical reference only

## Removal Checklist

**Code to remove/refactor:**
- [ ] `addTradePoints()` calls in trade services
- [ ] `snapshotRewards()` and epoch logic
- [ ] Volume-based point accumulation
- [ ] VSOL token reward claiming UI
- [ ] Points/XP display components
- [ ] Epoch-based API endpoints
- [ ] Old reward documentation sections

**Code to preserve:**
- [x] SOL transfer functionality (reused for hourly payouts)
- [x] `RewardClaim` historical data (read-only reference)
- [x] User authentication and wallet connection logic
