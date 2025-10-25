/**
 * Chat Service Integration
 * 
 * Enhanced chat service with badge system and moderation integration
 */

import prisma from '../plugins/prisma.js';
import redis from '../plugins/redis.js';
import { ModerationBot } from './moderationBot.js';
import { BadgeService } from './badgeService.js';
import crypto from 'crypto';

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

// Dynamic rate limits based on user tier
const getRateLimitForUser = (userTier: string): number => {
  switch (userTier) {
    case 'ADMINISTRATOR':
      return 1000; // Admins: 1000 messages per 15 seconds (effectively unlimited)
    case 'VIP':
      return 200; // VIP: 200 messages per 15 seconds
    case 'PREMIUM':
      return 150; // Premium: 150 messages per 15 seconds
    default:
      return 100; // Regular: 100 messages per 15 seconds
  }
};

/**
 * Send a chat message with enhanced moderation and badge checking
 */
export async function sendMessage(
  userId: string,
  roomId: string,
  content: string
): Promise<SendMessageResult> {
  try {
    // 1. Get user info for tier-based rate limiting
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userTier: true }
    });

    const isAdmin = user?.userTier === 'ADMINISTRATOR';
    const userTier = user?.userTier || 'REGULAR';

    // 2. Check moderation status (skip for admins)
    if (!isAdmin) {
      const modStatus = await ModerationBot.getUserModerationStatus(userId);
      if (!modStatus.canChat) {
        if (modStatus.isBanned) {
          return {
            success: false,
            error: 'You are banned from chat',
          };
        }
        if (modStatus.isMuted) {
          const mutedUntil = modStatus.mutedUntil?.toISOString();
          return {
            success: false,
            error: `You are muted until ${mutedUntil}`,
          };
        }
      }
    }

    // 2. Sanitize content
    let sanitized: string;
    try {
      sanitized = sanitizeChatMessage(content);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Invalid message content',
      };
    }

    // 3. Rate limit check (tier-based limits)
    const userRateLimit = getRateLimitForUser(userTier);
    const rateLimitKey = `chat:ratelimit:${userId}`;
    const rateLimit = await checkRateLimit(rateLimitKey, userRateLimit);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${rateLimit.resetAt - Math.floor(Date.now() / 1000)}s`,
        rateLimited: true,
        remaining: rateLimit.remaining,
      };
    }

    // 4. Duplicate detection (skip for admins) - More lenient now
    if (!isAdmin) {
      const messageHash = getMessageHash(userId, sanitized);
      const isDuplicate = await isDuplicateMessage(messageHash, 60); // 60 second window instead of 30
      if (isDuplicate) {
        return {
          success: false,
          error: 'Duplicate message detected. Please wait before sending the same message again.',
        };
      }
    }

    // 5. Automated moderation check (skip for admins)
    if (!isAdmin) {
      const moderationResult = await ModerationBot.analyzeMessage(userId, sanitized);
      if (moderationResult.violations.length > 0) {
        // Execute moderation action
        await ModerationBot.executeAction(userId, moderationResult.action);
        
        return {
          success: false,
          error: `Message blocked: ${moderationResult.reason}`,
        };
      }
    }

    // 6. Save message to database
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        userId,
        content: sanitized,
      },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            userTier: true,
            userBadges: {
              include: {
                badge: true,
              },
              orderBy: {
                earnedAt: 'desc',
              },
              take: 3, // Show top 3 badges
            },
          },
        },
      },
    });

    // 7. Check for badge awards
    const newBadges = await BadgeService.checkCommunityBadges(userId, message);

    // 8. Broadcast message to WebSocket subscribers
    await broadcastMessage(message);

    return {
      success: true,
      message,
      newBadges,
    };
  } catch (error: any) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: 'Failed to send message',
    };
  }
}

/**
 * Sanitize chat message content
 */
function sanitizeChatMessage(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new Error('Message content is required');
  }

  // Trim whitespace
  let sanitized = content.trim();

  // Check length
  if (sanitized.length === 0) {
    throw new Error('Message cannot be empty');
  }

  if (sanitized.length > MESSAGE_LENGTH_LIMIT) {
    throw new Error(`Message too long. Maximum ${MESSAGE_LENGTH_LIMIT} characters.`);
  }

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Check rate limit
 */
async function checkRateLimit(key: string, limit: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const current = await redis.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 15 * 1000 // 15 seconds
    };
  }

  await redis.incr(key);
  await redis.expire(key, 15);
  
  return {
    allowed: true,
    remaining: limit - count - 1,
    resetAt: Date.now() + 15 * 1000
  };
}

/**
 * Get message hash for duplicate detection
 */
function getMessageHash(userId: string, content: string): string {
  return crypto.createHash('md5').update(`${userId}:${content.toLowerCase()}`).digest('hex');
}

/**
 * Check if message is duplicate
 */
async function isDuplicateMessage(hash: string, windowSeconds: number = 30): Promise<boolean> {
  const key = `chat:duplicate:${hash}`;
  const exists = await redis.exists(key);
  
  if (exists) {
    return true;
  }

  await redis.setex(key, windowSeconds, '1'); // Use configurable window
  return false;
}

/**
 * Broadcast message to WebSocket subscribers
 */
async function broadcastMessage(message: any): Promise<void> {
  try {
    // Publish to Redis pub/sub for WebSocket broadcasting
    await redis.publish('chat:message', JSON.stringify({
      type: 'chat:message',
      roomId: message.roomId,
      message: {
        id: message.id,
        userId: message.userId,
        content: message.content,
        createdAt: message.createdAt,
        user: message.user
      }
    }));
  } catch (error) {
    console.error('Error broadcasting message:', error);
  }
}

/**
 * Get recent messages for a room
 */
export async function getRecentMessages(roomId: string, limit: number = 50): Promise<any[]> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            userTier: true,
            userBadges: {
              include: {
                badge: true,
              },
              orderBy: {
                earnedAt: 'desc',
              },
              take: 3, // Show top 3 badges
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    return [];
  }
}

/**
 * Get user's chat history
 */
export async function getUserChatHistory(userId: string, limit: number = 100): Promise<any[]> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            userTier: true,
            userBadges: {
              include: {
                badge: true,
              },
              orderBy: {
                earnedAt: 'desc',
              },
              take: 3,
            },
          },
        },
      },
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
    const [messageCount, activeUsers, lastMessage] = await Promise.all([
      prisma.chatMessage.count({ where: { roomId } }),
      prisma.chatMessage.groupBy({
        by: ['userId'],
        where: { 
          roomId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }).then(result => result.length),
      prisma.chatMessage.findFirst({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    return {
      messageCount,
      activeUsers,
      lastActivity: lastMessage?.createdAt || null
    };
  } catch (error) {
    console.error('Error fetching room stats:', error);
    return {
      messageCount: 0,
      activeUsers: 0,
      lastActivity: null
    };
  }
}

/**
 * Get room metadata
 */
export async function getRoomMetadata(roomId: string): Promise<{
  roomId: string;
  messageCount: number;
  activeUsers: number;
  lastActivity: Date | null;
}> {
  try {
    const stats = await getRoomStats(roomId);
    return {
      roomId,
      ...stats
    };
  } catch (error) {
    console.error('Error fetching room metadata:', error);
    return {
      roomId,
      messageCount: 0,
      activeUsers: 0,
      lastActivity: null
    };
  }
}

/**
 * Delete a message (admin only)
 */
export async function deleteMessage(messageId: string, moderatorId: string): Promise<boolean> {
  try {
    // Check if message exists
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, userId: true }
    });

    if (!message) {
      return false;
    }

    // Delete the message
    await prisma.chatMessage.delete({
      where: { id: messageId }
    });

    // Log the moderation action
    await prisma.chatModerationAction.create({
      data: {
        userId: message.userId,
        moderatorId,
        action: 'DELETE_MESSAGE',
        reason: 'Message deleted by moderator'
      }
    });

    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
}

/**
 * Clean up old chat messages to prevent database growth
 * @param daysToKeep Number of days to keep messages (default: 30)
 */
export async function cleanupOldMessages(daysToKeep: number = 30): Promise<{
  deletedCount: number;
  error?: string;
}> {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    console.log(`🧹 Cleaning up chat messages older than ${daysToKeep} days (before ${cutoffDate.toISOString()})`);
    
    // Count messages to be deleted
    const countToDelete = await prisma.chatMessage.count({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    if (countToDelete === 0) {
      console.log('✅ No old messages to clean up');
      return { deletedCount: 0 };
    }

    // Delete old messages
    const result = await prisma.chatMessage.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`✅ Cleaned up ${result.count} old chat messages`);
    
    return { deletedCount: result.count };
  } catch (error) {
    console.error('❌ Error cleaning up old messages:', error);
    return { 
      deletedCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get chat statistics for monitoring
 */
export async function getChatStatistics(): Promise<{
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7d: number;
  activeRooms: number;
  oldestMessage?: Date;
}> {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalMessages, messagesLast24h, messagesLast7d, oldestMessage] = await Promise.all([
      prisma.chatMessage.count(),
      prisma.chatMessage.count({
        where: { createdAt: { gte: last24h } }
      }),
      prisma.chatMessage.count({
        where: { createdAt: { gte: last7d } }
      }),
      prisma.chatMessage.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      })
    ]);

    // Count active rooms (rooms with messages in last 24h)
    const activeRooms = await prisma.chatMessage.groupBy({
      by: ['roomId'],
      where: { createdAt: { gte: last24h } },
      _count: { roomId: true }
    });

    return {
      totalMessages,
      messagesLast24h,
      messagesLast7d,
      activeRooms: activeRooms.length,
      oldestMessage: oldestMessage?.createdAt
    };
  } catch (error) {
    console.error('Error getting chat statistics:', error);
    return {
      totalMessages: 0,
      messagesLast24h: 0,
      messagesLast7d: 0,
      activeRooms: 0
    };
  }
}