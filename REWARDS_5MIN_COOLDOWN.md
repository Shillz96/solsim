# 5-Minute Rewards Cooldown Implementation

## Overview
This implementation adds a 5-minute cooldown period between reward claims. Users can now claim rewards every 5 minutes instead of the previous daily/weekly system.

## Changes Made

### 1. Database Schema Changes
**File: `backend/prisma/schema.prisma`**
- Added `lastClaimTime` field to User model to track when user last claimed rewards

### 2. Database Migration
**File: `backend/prisma/migrations/add_claim_cooldown.sql`**

Run this SQL on your Railway database:

```sql
-- Add lastClaimTime field to User table for 5-minute claim cooldown
ALTER TABLE "User" ADD COLUMN "lastClaimTime" TIMESTAMP(3);

-- Create index for efficient cooldown checks
CREATE INDEX "User_lastClaimTime_idx" ON "User"("lastClaimTime");
```

### 3. Backend Changes
**File: `backend/src/routes/rewards.ts`**

Added cooldown validation:
- Checks if 5 minutes have passed since the last claim
- Returns HTTP 429 (Too Many Requests) if cooldown is active
- Includes time remaining in the error response
- Updates `lastClaimTime` when a claim is successfully created

Key features:
- 5-minute cooldown (300,000 ms)
- Returns precise time remaining in seconds
- Returns `nextClaimTime` ISO timestamp for frontend countdown
- Updates lastClaimTime atomically with reward claim creation

### 4. Frontend Changes
**File: `frontend/components/portfolio/rewards-card.tsx`**

Enhanced the RewardsCard component with:
- **Real-time countdown timer** showing MM:SS until next claim is available
- **Cooldown status indicator** with visual badges (Ready/Cooldown)
- **Alert banner** when cooldown is active showing time remaining
- **Disabled claim buttons** during cooldown period
- **Better error handling** for cooldown-specific errors
- **Auto-refresh** every second to update countdown

**File: `frontend/app/portfolio\page.tsx`**
- Added Solana wallet integration
- Pass wallet address to RewardsCard component
- Users can now claim directly from the portfolio page

## How It Works

### User Flow:
1. User navigates to Portfolio page
2. Connects their Solana wallet (if not already connected)
3. Sees their unclaimed rewards in the RewardsCard
4. If cooldown is active, sees countdown timer
5. When "Ready" badge appears, can click "Claim" button
6. After claiming, cooldown starts immediately
7. Must wait 5 minutes before claiming again

### Technical Flow:
1. User clicks "Claim" button
2. Frontend sends claim request to `/api/rewards/claim`
3. Backend checks `user.lastClaimTime`
4. If < 5 minutes since last claim, returns 429 error with time remaining
5. If ≥ 5 minutes, creates reward claim and updates `lastClaimTime`
6. Frontend receives success and starts new 5-minute countdown
7. Countdown updates every second until 5 minutes elapse

## Configuration

### Cooldown Duration
To change the cooldown period, modify this value in `backend/src/routes/rewards.ts`:

```typescript
const fiveMinutesInMs = 5 * 60 * 1000; // Change 5 to desired minutes
```

### Reward Amount
Current reward calculation in `backend/src/routes/rewards.ts`:
```typescript
rewardAmount += tradeCount * 1; // Base reward per trade
rewardAmount += Math.floor(volumeUsd / 100) * 2; // Volume bonus
rewardAmount += Math.floor(winRatePercent / 10) * 10; // Win rate bonus
rewardAmount = Math.min(rewardAmount, 200); // Cap at 200 VSOL per claim
```

## Testing

1. **Run Database Migration:**
   ```sql
   -- Connect to your Railway database and run:
   ALTER TABLE "User" ADD COLUMN "lastClaimTime" TIMESTAMP(3);
   CREATE INDEX "User_lastClaimTime_idx" ON "User"("lastClaimTime");
   ```

2. **Test Claim Flow:**
   - Go to Portfolio page
   - Connect Solana wallet
   - Claim a reward
   - Verify cooldown timer appears
   - Wait 5 minutes
   - Verify "Ready" badge appears
   - Claim again successfully

3. **Test Edge Cases:**
   - Try claiming during cooldown (should show error)
   - Disconnect wallet during cooldown (should show warning)
   - Refresh page during cooldown (countdown should resume)

## Deployment Steps

1. **Deploy Database Migration:**
   ```bash
   # Connect to Railway database via CLI or web console
   psql $DATABASE_URL
   
   # Run the migration SQL
   ALTER TABLE "User" ADD COLUMN "lastClaimTime" TIMESTAMP(3);
   CREATE INDEX "User_lastClaimTime_idx" ON "User"("lastClaimTime");
   ```

2. **Deploy Backend:**
   ```bash
   cd backend
   npm run build
   # Deploy to Railway (will auto-deploy on git push)
   ```

3. **Deploy Frontend:**
   ```bash
   cd frontend
   npm run build
   # Deploy to Vercel (will auto-deploy on git push)
   ```

4. **Verify:**
   - Check backend logs for errors
   - Test claim flow on production
   - Monitor error rates

## UI Features

### Cooldown Timer
- Displays as "MM:SS" format (e.g., "4:35")
- Updates every second
- Shown in alert banner and claim button

### Status Badges
- **Green "Ready"**: Can claim now
- **Amber "Cooldown"**: Must wait before claiming

### Claim Button States
- **"Claim"**: Ready to claim
- **"Wait MM:SS"**: Cooldown active (shows time remaining)
- **"Claiming..."**: Transaction in progress
- Disabled when: cooldown active, wallet not connected, or claiming in progress

## Error Handling

The system handles several error cases:
- **429 Too Many Requests**: Cooldown active
- **403 Forbidden**: Email not verified
- **404 Not Found**: User doesn't exist
- **409 Conflict**: Already claimed for this epoch
- **500 Internal Error**: Server error

All errors show user-friendly toast messages with appropriate actions.

## Future Enhancements

Possible improvements:
- Push notifications when cooldown expires
- Claim history with timestamps
- Weekly/monthly claim statistics
- Referral bonuses with separate cooldowns
- Premium users with reduced cooldown (e.g., 3 minutes)
- Bulk claiming with staggered cooldowns
