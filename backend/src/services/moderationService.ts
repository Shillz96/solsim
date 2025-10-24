/**
 * Chat Moderation Service
 *
 * Handles all chat moderation actions:
 * - Muting users (temporary chat ban)
 * - Banning users (permanent chat ban)
 * - Strike system (auto-escalation)
 * - Moderation status checks
 */

import prisma from '../plugins/prisma.js';

/**
 * Moderation status for a user
 */
export interface ModerationStatus {
  canChat: boolean;
  isMuted: boolean;
  isBanned: boolean;
  strikes: number;
  mutedUntil: Date | null;
  reason?: string;
}

/**
 * Check if user can send chat messages
 * @param userId - User ID to check
 * @returns Moderation status
 */
export async function checkModerationStatus(userId: string): Promise<ModerationStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      chatStrikes: true,
      chatMutedUntil: true,
      bannedFromChat: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  const isMuted = user.chatMutedUntil ? user.chatMutedUntil > now : false;
  const canChat = !user.bannedFromChat && !isMuted;

  return {
    canChat,
    isMuted,
    isBanned: user.bannedFromChat,
    strikes: user.chatStrikes,
    mutedUntil: isMuted ? user.chatMutedUntil : null,
  };
}

/**
 * Mute user for specified duration
 * @param userId - User to mute
 * @param durationMinutes - Mute duration in minutes
 * @param reason - Optional reason for mute
 * @param moderatorId - Optional moderator ID (null for automated)
 * @returns Updated moderation status
 */
export async function muteUser(
  userId: string,
  durationMinutes: number,
  reason?: string,
  moderatorId?: string
): Promise<ModerationStatus> {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      chatMutedUntil: expiresAt,
    },
  });

  // Log moderation action
  await prisma.chatModerationAction.create({
    data: {
      userId,
      moderatorId,
      action: 'MUTE',
      reason,
      duration: durationMinutes,
      expiresAt,
    },
  });

  return checkModerationStatus(userId);
}

/**
 * Unmute user (remove mute early)
 * @param userId - User to unmute
 * @param moderatorId - Moderator performing action
 * @returns Updated moderation status
 */
export async function unmuteUser(
  userId: string,
  moderatorId: string
): Promise<ModerationStatus> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      chatMutedUntil: null,
    },
  });

  await prisma.chatModerationAction.create({
    data: {
      userId,
      moderatorId,
      action: 'UNMUTE',
    },
  });

  return checkModerationStatus(userId);
}

/**
 * Ban user from chat permanently
 * @param userId - User to ban
 * @param reason - Reason for ban
 * @param moderatorId - Optional moderator ID
 * @returns Updated moderation status
 */
export async function banUser(
  userId: string,
  reason?: string,
  moderatorId?: string
): Promise<ModerationStatus> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      bannedFromChat: true,
      chatMutedUntil: null, // Clear mute if banned
    },
  });

  await prisma.chatModerationAction.create({
    data: {
      userId,
      moderatorId,
      action: 'BAN',
      reason,
    },
  });

  return checkModerationStatus(userId);
}

/**
 * Unban user from chat
 * @param userId - User to unban
 * @param moderatorId - Moderator performing action
 * @returns Updated moderation status
 */
export async function unbanUser(
  userId: string,
  moderatorId: string
): Promise<ModerationStatus> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      bannedFromChat: false,
    },
  });

  await prisma.chatModerationAction.create({
    data: {
      userId,
      moderatorId,
      action: 'UNBAN',
    },
  });

  return checkModerationStatus(userId);
}

/**
 * Add strike to user (auto-escalation)
 * Strike levels:
 * - 1 strike: 10-minute mute
 * - 2 strikes: 24-hour mute
 * - 3 strikes: Permanent ban
 *
 * @param userId - User to add strike to
 * @param reason - Reason for strike
 * @returns Updated moderation status
 */
export async function addStrike(
  userId: string,
  reason?: string
): Promise<ModerationStatus> {
  // Increment strikes
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      chatStrikes: {
        increment: 1,
      },
    },
    select: {
      chatStrikes: true,
    },
  });

  const strikes = user.chatStrikes;

  // Log strike
  await prisma.chatModerationAction.create({
    data: {
      userId,
      moderatorId: null, // Automated
      action: 'STRIKE',
      reason,
    },
  });

  // Auto-escalation based on strikes
  if (strikes === 1) {
    // First strike: 10-minute mute
    await muteUser(userId, 10, `Automated: Strike ${strikes} - ${reason || 'Spam detected'}`, undefined);
  } else if (strikes === 2) {
    // Second strike: 24-hour mute
    await muteUser(userId, 24 * 60, `Automated: Strike ${strikes} - ${reason || 'Repeated violations'}`, undefined);
  } else if (strikes >= 3) {
    // Third strike: Permanent ban
    await banUser(userId, `Automated: Strike ${strikes} - ${reason || 'Too many violations'}`, undefined);
  }

  return checkModerationStatus(userId);
}

/**
 * Clear all strikes for user (admin action)
 * @param userId - User to clear strikes for
 * @param moderatorId - Moderator performing action
 * @returns Updated moderation status
 */
export async function clearStrikes(
  userId: string,
  moderatorId: string
): Promise<ModerationStatus> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      chatStrikes: 0,
    },
  });

  await prisma.chatModerationAction.create({
    data: {
      userId,
      moderatorId,
      action: 'CLEAR_STRIKES',
    },
  });

  return checkModerationStatus(userId);
}

/**
 * Get moderation history for user
 * @param userId - User ID
 * @param limit - Number of actions to return
 * @returns Array of moderation actions
 */
export async function getModerationHistory(userId: string, limit: number = 20) {
  return prisma.chatModerationAction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
