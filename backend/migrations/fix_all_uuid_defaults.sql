-- Fix UUID defaults for all tables with uuid() in Prisma schema
-- This ensures all ID fields have proper default values

-- Already fixed User table, but adding here for completeness
ALTER TABLE "User" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Fix other tables that use @default(uuid())
ALTER TABLE "Trade" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "TransactionHistory" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "ConversionHistory" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Position" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "PositionLot" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "RealizedPnL" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "CopyTrade" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "RewardClaim" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "WalletTrack" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "WalletTrackerSettings" ALTER COLUMN "userId" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "SolPurchase" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "PerpPosition" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "PerpTrade" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Liquidation" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "TokenWatch" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Deposit" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Withdrawal" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "UserWallet" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "ChatMessage" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "ChatModerationAction" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "UserBadge" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Badge" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "UserModerationStatus" ALTER COLUMN "userId" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "Notification" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "WalletActivity" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "LotClosure" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "RewardSnapshot" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
