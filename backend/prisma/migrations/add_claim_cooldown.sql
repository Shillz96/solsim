-- Add lastClaimTime field to User table for 5-minute claim cooldown
-- Migration: add_claim_cooldown
-- Date: 2025-01-21

ALTER TABLE "User" ADD COLUMN "lastClaimTime" TIMESTAMP(3);

-- Create index for efficient cooldown checks
CREATE INDEX "User_lastClaimTime_idx" ON "User"("lastClaimTime");
