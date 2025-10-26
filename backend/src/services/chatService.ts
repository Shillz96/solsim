/**
 * Chat Service
 * 
 * Core chat functionality with moderation, badges, and rate limiting
 */

import prisma from '../plugins/prisma.js';
import redis from '../plugins/redis.js';
import { ModerationBot } from './moderationBot.js';
import { BadgeService } from './badgeService.js';
import { sanitizeChatMessage } from '../utils/chatSanitizer.js';
import { 
  checkRateLimit, 
  isDuplicateMessage, 
  CHAT_MESSAGE_LIMIT,
  RateLimitConfig 
} from '../utils/chatRateLimiter.js';
import crypto from 'crypto';

// Types
export interface SendMessageResult {
  success: boolean;
  message?: any;
  error?: string;
  rateLimited?: boolean;
  remaining?: number;
  newBadges?: any[];
}

// Constants
const MESSAGE_LENGTH_LIMIT = 280;
const DUPLICATE_DETECTION_WINDOW_SECONDS = 30;

const RATE_LIMITS_BY_TIER: Record<string, RateLimitConfig> = {
  ADMINISTRATOR: { capacity: 1000, refillRate: 1000 / 15, cost: 1 },
  VIP: { capacity: 200, refillRate: 200 / 15, cost: 1 },
  PREMIUM: { capacity: 150, refillRate: 150 / 15, cost: 1 },
  REGULAR: CHAT_MESSAGE_LIMIT, // 10 messages per 15 seconds
};

const USER_SELECT_FIELDS = {
  id: true,
  handle: true,
  displayName: true,
  avatarUrl: true,
  userTier: true,
  userBadges: {
    include: { badge: true },
    orderBy: { earnedAt: 'desc' as const },
    take: 3,
  },
};

// Helper Functions
const getRateLimitForUser = (userTier: string): RateLimitConfig => {
  return RATE_LIMITS_BY_TIER[userTier] || RATE_LIMITS_BY_TIER.REGULAR;
};

const createErrorResult = (error: string, rateLimited = false, remaining = 0): SendMessageResult => ({
  success: false,
  error,
  ...(rateLimited && { rateLimited, remaining }),
});

const createSuccessResult = (message: any, newBadges: any[] = []): SendMessageResult => ({
  success: true,
  message,
  ...(newBadges.length > 0 && { newBadges }),
});

/**
 * Check if user is allowed to chat
 */
async function checkUserModerationStatus(userId: string): Promise<string | null> {
  const modStatus = await ModerationBot.getUserModerationStatus(userId);
  
  if (!modStatus.canChat) {
    if (modStatus.isBanned) {
      return 'You are banned from chat';
    }
    if (modStatus.isMuted && modStatus.mutedUntil) {
      const now = new Date();
      const minutesRemaining = Math.ceil((modStatus.mutedUntil.getTime() - now.getTime()) / 60000);
      return `You are muted for ${minutesRemaining} more minute${minutesRemaining !== 1 ? 's' : ''}`;
    }
  }
  
  return null;
}

/**
 * Sanitize message content
 */
function sanitizeContent(content: string): { success: boolean; content?: string; error?: string } {
  try {
    const sanitized = sanitizeChatMessage(content);
    return { success: true, content: sanitized };
  } catch (error: any) {
    return { success: false, error: error.message || 'Invalid message content' };
  }
}

/**
 * Check rate limit for user
 */
async function checkMessageRateLimit(userId: string, userTier: string): Promise<SendMessageResult | null> {
  const userRateLimit = getRateLimitForUser(userTier);
  const rateLimitKey = `chat:ratelimit:${userId}`;
  const rateLimit = await checkRateLimit(rateLimitKey, userRateLimit);
  
  if (!rateLimit.allowed) {
    const resetSeconds = rateLimit.resetAt - Math.floor(Date.now() / 1000);
    return createErrorResult(
      `Rate limit exceeded. Try again in ${resetSeconds}s`,
      true,
      rateLimit.remaining
    );
  }
  
  return null;
}

/**
 * Check for duplicate messages
 */
async function checkDuplicateMessage(userId: string, content: string): Promise<boolean> {
  const messageHash = `${userId}:${content.toLowerCase()}`;
  return await isDuplicateMessage(messageHash, DUPLICATE_DETECTION_WINDOW_SECONDS);
}

/**
 * Create and save chat message to database
 */
async function createChatMessage(roomId: string, userId: string, content: string) {
  return await prisma.chatMessage.create({
    data: { roomId, userId, content },
    include: {
      user: { select: USER_SELECT_FIELDS },
    },
  });
}

/**
 * Send a chat message with moderation and badge checking
 */
export async function sendMessage(
  userId: string,
  roomId: string,
  content: string
): Promise<SendMessageResult> {
  try {
    // Validate inputs
    if (!userId || !roomId || !content) {
      return createErrorResult('Invalid input: userId, roomId, and content are required');
    }

    // Fetch user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userTier: true },
    });

    const isAdmin = user?.userTier === 'ADMINISTRATOR';
    const userTier = user?.userTier || 'REGULAR';

    // Check moderation status (skip for admins)
    if (!isAdmin) {
      const moderationError = await checkUserModerationStatus(userId);
      if (moderationError) {
        return createErrorResult(moderationError);
      }
    }

    // Sanitize content
    const sanitized = sanitizeContent(content);
    if (!sanitized.success) {
      return createErrorResult(sanitized.error!);
    }

    // Rate limit check (tier-based)
    if (!isAdmin) {
      const rateLimitError = await checkMessageRateLimit(userId, userTier);
      if (rateLimitError) {
        return rateLimitError;
      }
    }

    // Duplicate detection (skip for admins)
    if (!isAdmin) {
      const isDuplicate = await checkDuplicateMessage(userId, sanitized.content!);
      if (isDuplicate) {
        return createErrorResult('Duplicate message detected. Please wait before sending the same message again.');
      }
    }

    // Automated moderation check (skip for admins)
    if (!isAdmin) {
      const moderationResult = await ModerationBot.analyzeMessage(userId, sanitized.content!);
      if (moderationResult.violations.length > 0) {
        await ModerationBot.executeAction(userId, moderationResult.action);
        return createErrorResult(`Message blocked: ${moderationResult.reason}`);
      }
    }

    // Save message to database
    const message = await createChatMessage(roomId, userId, sanitized.content!);

    // Broadcast to WebSocket subscribers (before badge check to minimize latency)
    await broadcastMessage(message);

    // Check for badge awards (non-blocking)
    const newBadges = await BadgeService.checkCommunityBadges(userId, message).catch(err => {
      console.error('Error checking badges:', err);
      return [];
    });

    return createSuccessResult(message, newBadges);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return createErrorResult('Failed to send message');
  }
}

/**
 * Broadcast message to WebSocket subscribers
 */
async function broadcastMessage(message: any): Promise<void> {
  try {
    // Safely serialize the message, converting Date objects and BigInts
    const serializedMessage = {
      type: 'chat:message',
      roomId: message.roomId,
      message: {
        id: message.id,
        userId: message.userId,
        content: message.content,
        createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
        user: {
          id: message.user?.id,
          handle: message.user?.handle,
          displayName: message.user?.displayName,
          avatarUrl: message.user?.avatarUrl,
          userTier: message.user?.userTier,
          userBadges: message.user?.userBadges?.map((ub: any) => ({
            badge: {
              id: ub.badge?.id,
              name: ub.badge?.name,
              description: ub.badge?.description,
              icon: ub.badge?.icon,
              rarity: ub.badge?.rarity,
            },
            earnedAt: ub.earnedAt instanceof Date ? ub.earnedAt.toISOString() : ub.earnedAt,
          })) || [],
        },
      },
    };

    await redis.publish('chat:message', JSON.stringify(serializedMessage));
  } catch (error) {
    console.error('Error broadcasting message:', error);
  }
}

/**
 * Get recent messages for a room
 */
export async function getRecentMessages(roomId: string, limit = 50): Promise<any[]> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      include: { user: { select: USER_SELECT_FIELDS } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    return [];
  }
}

/**
 * Get user's chat history
 */
export async function getUserChatHistory(userId: string, limit = 100): Promise<any[]> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      include: { user: { select: USER_SELECT_FIELDS } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages;
  } catch (error) {
    console.error('Error fetching user chat history:', error);
    return [];
  }
}

/**
 * Get room statistics
 */
export async function getRoomStats(roomId: string): Promise<{
  messageCount: number;
  activeUsers: number;
  lastActivity: Date | null;
}> {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [messageCount, activeUsers, lastMessage] = await Promise.all([
      prisma.chatMessage.count({ where: { roomId } }),
      prisma.chatMessage.groupBy({
        by: ['userId'],
        where: { roomId, createdAt: { gte: last24Hours } },
      }).then(result => result.length),
      prisma.chatMessage.findFirst({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      messageCount,
      activeUsers,
      lastActivity: lastMessage?.createdAt || null,
    };
  } catch (error) {
    console.error('Error fetching room stats:', error);
    return { messageCount: 0, activeUsers: 0, lastActivity: null };
  }
}

/**
 * Get room metadata
 */
export async function getRoomMetadata(roomId: string) {
  try {
    const stats = await getRoomStats(roomId);
    return { roomId, ...stats };
  } catch (error) {
    console.error('Error fetching room metadata:', error);
    return { roomId, messageCount: 0, activeUsers: 0, lastActivity: null };
  }
}

/**
 * Delete a message (admin/moderator only)
 */
export async function deleteMessage(messageId: string, moderatorId: string): Promise<boolean> {
  try {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, userId: true },
    });

    if (!message) return false;

    await prisma.chatMessage.delete({ where: { id: messageId } });

    await prisma.chatModerationAction.create({
      data: {
        userId: message.userId,
        moderatorId,
        action: 'DELETE_MESSAGE',
        reason: 'Message deleted by moderator',
      },
    });

    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
}

/**
 * Clean up old chat messages to prevent database growth
 */
export async function cleanupOldMessages(daysToKeep = 30): Promise<{
  deletedCount: number;
  error?: string;
}> {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    console.log(`🧹 Cleaning up chat messages older than ${daysToKeep} days (before ${cutoffDate.toISOString()})`);
    
    const countToDelete = await prisma.chatMessage.count({
      where: { createdAt: { lt: cutoffDate } },
    });

    if (countToDelete === 0) {
      console.log('✅ No old messages to clean up');
      return { deletedCount: 0 };
    }

    const result = await prisma.chatMessage.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    console.log(`✅ Cleaned up ${result.count} old chat messages`);
    return { deletedCount: result.count };
  } catch (error) {
    console.error('❌ Error cleaning up old messages:', error);
    return {
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get chat statistics for monitoring
 */
export async function getChatStatistics() {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalMessages, messagesLast24h, messagesLast7d, oldestMessage, activeRooms] = await Promise.all([
      prisma.chatMessage.count(),
      prisma.chatMessage.count({ where: { createdAt: { gte: last24h } } }),
      prisma.chatMessage.count({ where: { createdAt: { gte: last7d } } }),
      prisma.chatMessage.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      prisma.chatMessage.groupBy({
        by: ['roomId'],
        where: { createdAt: { gte: last24h } },
      }),
    ]);

    return {
      totalMessages,
      messagesLast24h,
      messagesLast7d,
      activeRooms: activeRooms.length,
      oldestMessage: oldestMessage?.createdAt,
    };
  } catch (error) {
    console.error('Error getting chat statistics:', error);
    return {
      totalMessages: 0,
      messagesLast24h: 0,
      messagesLast7d: 0,
      activeRooms: 0,
    };
  }
}