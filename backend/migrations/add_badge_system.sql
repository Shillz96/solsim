-- Badge System Migration
-- Adds comprehensive badge system with Mario theme integration
-- Run this migration to add badge tables to your database

-- Create Badge Rarity Enum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- Create Badge Category Enum  
CREATE TYPE "BadgeCategory" AS ENUM ('FOUNDER', 'TRADING', 'COMMUNITY', 'SPECIAL', 'MODERATION');

-- Create Moderation Action Enum (extend existing if needed)
CREATE TYPE "ModerationAction" AS ENUM (
  'MUTE', 'BAN', 'STRIKE', 'UNMUTE', 'UNBAN', 'CLEAR_STRIKES', 'WARNING', 'KICK'
);

-- Badge Definitions Table
CREATE TABLE "Badge" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
  "category" "BadgeCategory" NOT NULL,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "requirements" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- User Badges - Track earned badges
CREATE TABLE "UserBadge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "badgeId" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id"),
  CONSTRAINT "UserBadge_userId_badgeId_key" UNIQUE ("userId", "badgeId")
);

-- User Moderation Status - Track trust scores and moderation state
CREATE TABLE "UserModerationStatus" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL UNIQUE,
  "trustScore" INTEGER NOT NULL DEFAULT 100,
  "strikes" INTEGER NOT NULL DEFAULT 0,
  "isMuted" BOOLEAN NOT NULL DEFAULT false,
  "mutedUntil" TIMESTAMP(3),
  "isBanned" BOOLEAN NOT NULL DEFAULT false,
  "bannedUntil" TIMESTAMP(3),
  "lastViolation" TIMESTAMP(3),
  "violationCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "UserModerationStatus_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserModerationStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Extend existing ChatModerationAction table (if it doesn't exist, create it)
CREATE TABLE IF NOT EXISTS "ChatModerationAction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moderatorId" TEXT,
  "action" "ModerationAction" NOT NULL,
  "reason" TEXT,
  "duration" INTEGER,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "ChatModerationAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChatModerationAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX "Badge_category_rarity_idx" ON "Badge"("category", "rarity");
CREATE INDEX "UserBadge_userId_isActive_idx" ON "UserBadge"("userId", "isActive");
CREATE INDEX "UserBadge_earnedAt_idx" ON "UserBadge"("earnedAt" DESC);
CREATE INDEX "UserModerationStatus_trustScore_idx" ON "UserModerationStatus"("trustScore");
CREATE INDEX "UserModerationStatus_isMuted_mutedUntil_idx" ON "UserModerationStatus"("isMuted", "mutedUntil");
CREATE INDEX "UserModerationStatus_isBanned_bannedUntil_idx" ON "UserModerationStatus"("isBanned", "bannedUntil");
CREATE INDEX "ChatModerationAction_userId_createdAt_idx" ON "ChatModerationAction"("userId", "createdAt" DESC);
CREATE INDEX "ChatModerationAction_action_createdAt_idx" ON "ChatModerationAction"("action", "createdAt" DESC);
CREATE INDEX "ChatModerationAction_expiresAt_idx" ON "ChatModerationAction"("expiresAt");

-- Insert Default Badges
INSERT INTO "Badge" ("id", "name", "description", "icon", "color", "rarity", "category", "requirements") VALUES
-- Founder Badges
('badge_founder', 'Founder', 'One of the first 100 users to join 1UP SOL', '👑', 'bg-mario-red-500', 'LEGENDARY', 'FOUNDER', '{"type": "user_count", "maxUsers": 100, "field": "createdAt"}'),
('badge_early_adopter', 'Early Adopter', 'One of the first 1000 users to join', '⭐', 'bg-star-yellow-500', 'EPIC', 'FOUNDER', '{"type": "user_count", "maxUsers": 1000, "field": "createdAt"}'),
('badge_beta_tester', 'Beta Tester', 'Joined during the beta phase', '🚀', 'bg-sky-blue-500', 'RARE', 'FOUNDER', '{"type": "beta_user"}'),
('badge_diamond_hands', 'Diamond Hands', 'Held VSOL tokens for 30+ days', '💎', 'bg-coin-yellow-500', 'RARE', 'FOUNDER', '{"type": "vsol_holder", "minDays": 30}'),

-- Trading Badges
('badge_profit_master', 'Profit Master', 'Made 1000%+ profit on a single trade', '📈', 'bg-mario-red-500', 'EPIC', 'TRADING', '{"type": "trading_profit", "minProfitPercent": 1000}'),
('badge_speed_demon', 'Speed Demon', 'First to trade a new token within 1 minute', '⚡', 'bg-star-yellow-500', 'RARE', 'TRADING', '{"type": "first_trader", "maxMinutes": 1}'),
('badge_ape_king', 'Ape King', 'Made the largest single trade volume', '🦍', 'bg-mario-red-500', 'LEGENDARY', 'TRADING', '{"type": "largest_trade"}'),
('badge_diamond_collector', 'Diamond Collector', 'Top 10% portfolio value', '💎', 'bg-coin-yellow-500', 'EPIC', 'TRADING', '{"type": "portfolio_value", "percentile": 90}'),
('badge_hot_streak', 'Hot Streak', '5+ profitable trades in a row', '🔥', 'bg-mario-red-500', 'RARE', 'TRADING', '{"type": "consecutive_trades", "minTrades": 5, "allProfitable": true}'),
('badge_data_analyst', 'Data Analyst', 'Most accurate price predictions', '📊', 'bg-sky-blue-500', 'RARE', 'TRADING', '{"type": "prediction_accuracy", "minAccuracy": 80}'),

-- Community Badges
('badge_chat_champion', 'Chat Champion', 'Most helpful messages (community upvoted)', '💬', 'bg-luigi-green-500', 'RARE', 'COMMUNITY', '{"type": "upvoted_messages", "minUpvotes": 10}'),
('badge_mario_master', 'Mario Master', 'Completed all game achievements', '🎮', 'bg-mario-red-500', 'LEGENDARY', 'COMMUNITY', '{"type": "all_achievements"}'),
('badge_community_star', 'Community Star', 'Most active in community events', '🌟', 'bg-star-yellow-500', 'RARE', 'COMMUNITY', '{"type": "community_activity"}'),
('badge_party_host', 'Party Host', 'Started most popular chat discussions', '🎉', 'bg-coin-yellow-500', 'UNCOMMON', 'COMMUNITY', '{"type": "popular_discussions", "minParticipants": 20}'),
('badge_helper', 'Helper', 'Helped 10+ new users', '🤝', 'bg-luigi-green-500', 'UNCOMMON', 'COMMUNITY', '{"type": "helped_users", "minUsers": 10}'),
('badge_influencer', 'Influencer', 'High engagement on shared content', '📢', 'bg-mario-red-500', 'RARE', 'COMMUNITY', '{"type": "content_engagement", "minEngagement": 100}'),

-- Special Event Badges
('badge_event_winner', 'Event Winner', 'Won trading competitions', '🎊', 'bg-star-yellow-500', 'RARE', 'SPECIAL', '{"type": "competition_winner"}'),
('badge_tournament_champion', 'Tournament Champion', 'Won monthly tournaments', '🏆', 'bg-coin-yellow-500', 'LEGENDARY', 'SPECIAL', '{"type": "tournament_winner"}'),
('badge_gift_giver', 'Gift Giver', 'Shared tokens with community', '🎁', 'bg-luigi-green-500', 'UNCOMMON', 'SPECIAL', '{"type": "token_sharing"}'),
('badge_show_host', 'Show Host', 'Hosted community events', '🎪', 'bg-mario-red-500', 'RARE', 'SPECIAL', '{"type": "event_host"}'),
('badge_creator', 'Creator', 'Created popular content/guides', '🎨', 'bg-sky-blue-500', 'RARE', 'SPECIAL', '{"type": "content_creation", "minViews": 1000}'),

-- Moderation Badges
('badge_moderator', 'Moderator', 'Community moderator', '🛡️', 'bg-sky-blue-500', 'EPIC', 'MODERATION', '{"type": "moderator_role"}'),
('badge_admin', 'Admin', 'Platform administrator', '👑', 'bg-mario-red-500', 'LEGENDARY', 'MODERATION', '{"type": "admin_role"}'),
('badge_trusted', 'Trusted', 'High community trust score', '⭐', 'bg-star-yellow-500', 'RARE', 'MODERATION', '{"type": "trust_score", "minScore": 90}'),
('badge_verified', 'Verified', 'Identity verified', '🔒', 'bg-luigi-green-500', 'UNCOMMON', 'MODERATION', '{"type": "identity_verified"}'),
('badge_vip', 'VIP', 'Premium community member', '💎', 'bg-coin-yellow-500', 'EPIC', 'MODERATION', '{"type": "premium_member"}'),

-- Developer Badge (Ultra Rare 1/1)
('badge_developer', 'Developer', 'Core developer of 1UP SOL - The rarest badge in existence', '👨‍💻', 'bg-gradient-to-r from-purple-500 to-pink-500', 'DEVELOPER', 'DEVELOPER', '{"type": "developer_role", "maxCount": 1}');

-- Create function to automatically create UserModerationStatus for new users
CREATE OR REPLACE FUNCTION create_user_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "UserModerationStatus" ("userId", "trustScore", "strikes", "isMuted", "isBanned", "violationCount")
  VALUES (NEW."id", 100, 0, false, false, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create moderation status for new users
DROP TRIGGER IF EXISTS create_user_moderation_status_trigger ON "User";
CREATE TRIGGER create_user_moderation_status_trigger
  AFTER INSERT ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION create_user_moderation_status();

-- Create function to check and award founder badges
CREATE OR REPLACE FUNCTION check_founder_badges()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  badge_id TEXT;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO user_count FROM "User";
  
  -- Check for founder badge (first 100 users)
  IF user_count <= 100 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'Founder';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "UserBadge" ("userId", "badgeId")
      VALUES (NEW."id", badge_id)
      ON CONFLICT ("userId", "badgeId") DO NOTHING;
    END IF;
  END IF;
  
  -- Check for early adopter badge (first 1000 users)
  IF user_count <= 1000 THEN
    SELECT "id" INTO badge_id FROM "Badge" WHERE "name" = 'Early Adopter';
    IF badge_id IS NOT NULL THEN
      INSERT INTO "UserBadge" ("userId", "badgeId")
      VALUES (NEW."id", badge_id)
      ON CONFLICT ("userId", "badgeId") DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-award founder badges
DROP TRIGGER IF EXISTS check_founder_badges_trigger ON "User";
CREATE TRIGGER check_founder_badges_trigger
  AFTER INSERT ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION check_founder_badges();

-- Create function to clean up expired mutes/bans
CREATE OR REPLACE FUNCTION cleanup_expired_moderation()
RETURNS void AS $$
BEGIN
  -- Unmute users whose mute has expired
  UPDATE "UserModerationStatus"
  SET "isMuted" = false, "mutedUntil" = NULL
  WHERE "isMuted" = true AND "mutedUntil" IS NOT NULL AND "mutedUntil" < NOW();
  
  -- Unban users whose ban has expired
  UPDATE "UserModerationStatus"
  SET "isBanned" = false, "bannedUntil" = NULL
  WHERE "isBanned" = true AND "bannedUntil" IS NOT NULL AND "bannedUntil" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (you'll need to set this up in your application)
-- This function can be called periodically to clean up expired moderation actions

-- Add comments for documentation
COMMENT ON TABLE "Badge" IS 'Badge definitions with Mario theme integration';
COMMENT ON TABLE "UserBadge" IS 'User earned badges with activation status';
COMMENT ON TABLE "UserModerationStatus" IS 'User trust scores and moderation status';
COMMENT ON TABLE "ChatModerationAction" IS 'Moderation actions taken against users';

COMMENT ON COLUMN "Badge"."requirements" IS 'JSON criteria for earning the badge';
COMMENT ON COLUMN "UserBadge"."isActive" IS 'Whether the badge is currently displayed';
COMMENT ON COLUMN "UserModerationStatus"."trustScore" IS 'Community trust score 0-100';
COMMENT ON COLUMN "UserModerationStatus"."strikes" IS 'Number of moderation strikes';
COMMENT ON COLUMN "UserModerationStatus"."violationCount" IS 'Total number of violations';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON "Badge" TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON "UserBadge" TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON "UserModerationStatus" TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON "ChatModerationAction" TO your_app_user;
