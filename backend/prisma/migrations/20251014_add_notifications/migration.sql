-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRADE_EXECUTED', 'TRADE_MILESTONE', 'POSITION_GAIN', 'POSITION_MOON', 'POSITION_LOSS', 'DAILY_PNL', 'PORTFOLIO_ATH', 'PORTFOLIO_RECOVERY', 'LEADERBOARD_RANK', 'LEADERBOARD_MOVE', 'REWARD_AVAILABLE', 'REWARD_CLAIMED', 'WALLET_TRACKER_TRADE', 'WALLET_TRACKER_GAIN', 'ACHIEVEMENT', 'PRICE_ALERT', 'TRENDING_TOKEN', 'SYSTEM', 'WELCOME');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('TRADE', 'PORTFOLIO', 'LEADERBOARD', 'REWARDS', 'WALLET_TRACKER', 'ACHIEVEMENT', 'SYSTEM', 'GENERAL');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT DEFAULT '{}',
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt" DESC);
