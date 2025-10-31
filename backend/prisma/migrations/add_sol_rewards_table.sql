-- Add SolReward table for social sharing rewards feature
-- Migration: add_sol_rewards_table
-- Date: 2025-10-31

-- Create SolReward table
CREATE TABLE "SolReward" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "lastRewardClaim" TIMESTAMP(3),
    "totalRewarded" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "weeklyShares" INTEGER NOT NULL DEFAULT 0,
    "weekResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "SolReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint on userId (one reward record per user)
CREATE UNIQUE INDEX "SolReward_userId_key" ON "SolReward"("userId");

-- Create indexes for performance
CREATE INDEX "sol_reward_user" ON "SolReward"("userId");
CREATE INDEX "sol_reward_claim_date" ON "SolReward"("lastRewardClaim");

-- Migration complete
-- Users can now earn SOL rewards by sharing PnL cards on social media
